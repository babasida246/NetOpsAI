import { API_BASE, apiJsonData } from '$lib/api/httpClient'
import type { SshCommandPolicy, SshCommandResult, SshLogEvent, SshSession } from './types'
import * as mock from './mock'

const SSH_BASE = `${API_BASE}/netops/ssh`

type ApiSession = SshSession

export async function listSessions(): Promise<SshSession[]> {
    try {
        return await apiJsonData<ApiSession[]>(`${SSH_BASE}/sessions`)
    } catch {
        return mock.listSessions()
    }
}

export async function openSession(input: {
    deviceId: string
    deviceName: string
    host: string
    port: number
    user: string
    authType: 'password' | 'key'
    secret?: string
    jumpHosts?: Array<{ host: string; port: number; user: string }>
    idleTimeoutSec?: number
}): Promise<SshSession> {
    try {
        return await apiJsonData<ApiSession>(`${SSH_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        })
    } catch {
        return mock.openSession({
            deviceId: input.deviceId,
            deviceName: input.deviceName,
            host: input.host,
            port: input.port,
            user: input.user,
            authType: input.authType,
            idleTimeoutSec: input.idleTimeoutSec
        })
    }
}

export async function closeSession(sessionId: string): Promise<void> {
    try {
        await apiJsonData(`${SSH_BASE}/sessions/${sessionId}`, { method: 'DELETE' })
    } catch {
        mock.closeSession(sessionId)
    }
}

export async function sendCommand(
    sessionId: string,
    command: string,
    policy?: SshCommandPolicy,
    meta?: { ticketId?: string; deviceId?: string }
): Promise<SshCommandResult> {
    try {
        return await apiJsonData<SshCommandResult>(`${SSH_BASE}/sessions/${sessionId}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, policy, ...meta })
        })
    } catch {
        return mock.sendCommand(sessionId, command, policy)
    }
}

export async function getSessionLog(sessionId: string): Promise<SshLogEvent[]> {
    try {
        return await apiJsonData<SshLogEvent[]>(`${SSH_BASE}/sessions/${sessionId}/log`)
    } catch {
        return mock.getSessionLog(sessionId)
    }
}

export async function exportSessionText(sessionId: string): Promise<string> {
    try {
        const response = await fetch(`${SSH_BASE}/sessions/${sessionId}/log?format=text`, {
            credentials: 'include'
        })
        if (!response.ok) throw new Error('Failed to export log')
        return response.text()
    } catch {
        return mock.exportSessionText(sessionId)
    }
}

export function purgeIdleSessions(): void {
    mock.purgeIdleSessions()
}
