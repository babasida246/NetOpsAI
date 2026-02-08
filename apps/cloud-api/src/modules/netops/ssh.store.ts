export type SshAuthType = 'password' | 'key'
export type SshSessionStatus = 'connected' | 'closed'

export type SshSession = {
    id: string
    deviceId: string
    deviceName: string
    host: string
    port: number
    user: string
    authType: SshAuthType
    createdAt: string
    lastActiveAt: string
    status: SshSessionStatus
    idleTimeoutSec: number
}

export type SshLogEvent = {
    timestamp: string
    type: 'input' | 'output' | 'system' | 'error'
    message: string
}

export type SshCommandPolicy = {
    environment: 'dev' | 'staging' | 'prod'
    allowList: string[]
    denyList: string[]
    dangerousList: string[]
}

export type SshCommandResult = {
    output: string[]
    warning?: string
}

const sessions = new Map<string, { session: SshSession; log: SshLogEvent[] }>()
const DEFAULT_IDLE = 600

const DEFAULT_POLICY: SshCommandPolicy = {
    environment: 'dev',
    allowList: [
        'show interface',
        'show ip route',
        '/interface print',
        '/ip route print',
        'display interface',
        'display ip routing'
    ],
    denyList: ['reload', 'erase', 'reset-configuration', 'format', 'delete'],
    dangerousList: ['reload', 'erase', 'reset-configuration', 'write erase']
}

function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`
    }
    return `${prefix}_${Math.random().toString(36).slice(2)}`
}

function nowIso(): string {
    return new Date().toISOString()
}

function matchRule(command: string, rule: string): boolean {
    if (!rule) return false
    if (rule.startsWith('/') && rule.endsWith('/')) {
        try {
            const regex = new RegExp(rule.slice(1, -1), 'i')
            return regex.test(command)
        } catch {
            return false
        }
    }
    return command.toLowerCase().includes(rule.toLowerCase())
}

function isDenied(command: string, policy: SshCommandPolicy): boolean {
    return policy.denyList.some((rule) => matchRule(command, rule))
}

function isAllowed(command: string, policy: SshCommandPolicy): boolean {
    if (policy.allowList.length === 0) return false
    return policy.allowList.some((rule) => matchRule(command, rule))
}

function redactSensitive(input: string): string {
    const patterns = [
        /password\s+\S+/gi,
        /secret\s+\S+/gi,
        /community\s+\S+/gi,
        /token\s+\S+/gi,
        /key\s+\S+/gi
    ]
    return patterns.reduce((value, pattern) => value.replace(pattern, (match) => {
        const parts = match.split(/\s+/)
        return `${parts[0]} [REDACTED]`
    }), input)
}

function isDangerous(command: string, policy: SshCommandPolicy): boolean {
    return policy.dangerousList.some((rule) => matchRule(command, rule))
}

export function listSessions(): SshSession[] {
    return Array.from(sessions.values()).map((item) => item.session)
}

export function openSession(input: {
    deviceId: string
    deviceName: string
    host: string
    port: number
    user: string
    authType: SshAuthType
    idleTimeoutSec?: number
}): SshSession {
    const existing = Array.from(sessions.values()).find(
        (item) => item.session.deviceId === input.deviceId && item.session.user === input.user && item.session.status === 'connected'
    )
    if (existing) {
        existing.session.lastActiveAt = nowIso()
        return existing.session
    }

    const session: SshSession = {
        id: createId('ssh'),
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        host: input.host,
        port: input.port,
        user: input.user,
        authType: input.authType,
        createdAt: nowIso(),
        lastActiveAt: nowIso(),
        status: 'connected',
        idleTimeoutSec: input.idleTimeoutSec ?? DEFAULT_IDLE
    }

    sessions.set(session.id, {
        session,
        log: [
            {
                timestamp: nowIso(),
                type: 'system',
                message: `SSH session opened to ${session.user}@${session.host}:${session.port}`
            }
        ]
    })

    return session
}

export function closeSession(sessionId: string, reason = 'Closed by user'): void {
    const entry = sessions.get(sessionId)
    if (!entry) return
    entry.session.status = 'closed'
    entry.session.lastActiveAt = nowIso()
    entry.log.push({ timestamp: nowIso(), type: 'system', message: reason })
}

export function sendCommand(
    sessionId: string,
    command: string,
    policy?: SshCommandPolicy
): { result: SshCommandResult; blocked?: boolean } {
    const entry = sessions.get(sessionId)
    if (!entry) {
        return { result: { output: ['Session not found.'] }, blocked: true }
    }

    const effectivePolicy = policy ?? DEFAULT_POLICY

    entry.session.lastActiveAt = nowIso()

    if (entry.session.status !== 'connected') {
        return { result: { output: ['Session closed.'] }, blocked: true }
    }

    if (!isAllowed(command, effectivePolicy)) {
        entry.log.push({ timestamp: nowIso(), type: 'error', message: `Command blocked by allowlist: ${command}` })
        return { result: { output: ['Command blocked by allowlist.'] }, blocked: true }
    }

    if (isDenied(command, effectivePolicy)) {
        entry.log.push({ timestamp: nowIso(), type: 'error', message: `Command blocked by denylist: ${command}` })
        return { result: { output: ['Command blocked by denylist.'] }, blocked: true }
    }

    const warning = isDangerous(command, effectivePolicy) ? 'Dangerous command flagged.' : undefined

    const safeCommand = redactSensitive(command)
    entry.log.push({ timestamp: nowIso(), type: 'input', message: safeCommand })
    entry.log.push({ timestamp: nowIso(), type: 'output', message: `executed: ${safeCommand}` })

    return { result: { output: [`executed: ${safeCommand}`], warning } }
}

export function getSessionLog(sessionId: string): SshLogEvent[] {
    const entry = sessions.get(sessionId)
    return entry ? entry.log : []
}

export function exportSessionText(sessionId: string): string {
    const log = getSessionLog(sessionId)
    return log.map((event) => `[${event.timestamp}] ${event.type.toUpperCase()}: ${event.message}`).join('\n')
}

export function purgeIdleSessions(): void {
    const now = Date.now()
    for (const entry of sessions.values()) {
        if (entry.session.status !== 'connected') continue
        const last = new Date(entry.session.lastActiveAt).getTime()
        if (now - last > entry.session.idleTimeoutSec * 1000) {
            closeSession(entry.session.id, 'Closed due to idle timeout')
        }
    }
}
