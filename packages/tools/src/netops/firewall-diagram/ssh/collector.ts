import { readFile } from 'node:fs/promises'
import type { ToolContext } from '../../../ToolRegistry.js'
import type { FirewallVendor, FirewallToolInput, SshCollectedBundle } from '../types.js'

type SshInput = NonNullable<FirewallToolInput['source']['ssh']>

type SshExecResult = { stdout: string; stderr: string; exitCode?: number }

function nowIso(): string {
    return new Date().toISOString()
}

function allowlistForVendor(vendor: FirewallVendor): string[] {
    if (vendor === 'mikrotik') {
        return [
            '/ip firewall filter export terse',
            '/ip firewall nat export terse',
            '/ip firewall address-list export terse'
        ]
    }
    return [
        'show firewall policy',
        'show firewall address',
        'show firewall addrgrp',
        'show firewall service custom',
        'show firewall service group'
    ]
}

async function loadPrivateKey(ssh: SshInput): Promise<string | undefined> {
    if (ssh.privateKey) return ssh.privateKey
    if (ssh.privateKeyPath) {
        return readFile(ssh.privateKeyPath, 'utf8')
    }
    return undefined
}

async function execCommand(client: any, cmd: string, timeoutMs: number, maxBytes: number): Promise<SshExecResult> {
    return new Promise<SshExecResult>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`SSH command timeout: ${cmd}`)), timeoutMs)

        client.exec(cmd, (err: Error | undefined, stream: any) => {
            if (err) {
                clearTimeout(timer)
                reject(err)
                return
            }

            let stdout = ''
            let stderr = ''
            let exitCode: number | undefined

            const clamp = (s: string) => (s.length > maxBytes ? `${s.slice(0, maxBytes)}\n…(truncated)…` : s)

            stream.on('data', (data: Buffer) => {
                stdout += data.toString('utf8')
                if (stdout.length > maxBytes) stdout = clamp(stdout)
            })

            stream.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString('utf8')
                if (stderr.length > maxBytes) stderr = clamp(stderr)
            })

            stream.on('close', (code: number | undefined) => {
                exitCode = typeof code === 'number' ? code : undefined
                clearTimeout(timer)
                resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode })
            })
        })
    })
}

/**
 * Collect firewall CLI outputs via SSH (read-only allowlist).
 *
 * This collector is intentionally conservative:
 * - Only runs allowlisted commands per vendor
 * - Has timeouts and output size caps
 * - Never returns auth secrets
 */
export async function collectFirewallViaSsh(vendor: FirewallVendor, ssh: SshInput, context?: ToolContext): Promise<SshCollectedBundle> {
    const allowed = allowlistForVendor(vendor)
    const port = ssh.port ?? 22

    // Lazy import to keep the module tree lighter for non-SSH usages.
    const ssh2Mod: any = await import('ssh2')
    const { Client } = ssh2Mod?.Client ? ssh2Mod : ssh2Mod?.default ?? ssh2Mod

    const client: any = new Client()
    const privateKey = await loadPrivateKey(ssh)

    const connectConfig: Record<string, any> = {
        host: ssh.host,
        port,
        username: ssh.username,
        readyTimeout: 12000
    }
    if (ssh.password) connectConfig.password = ssh.password
    if (privateKey) connectConfig.privateKey = privateKey
    if (ssh.passphrase) connectConfig.passphrase = ssh.passphrase

    const collectedAt = nowIso()

    const bundle: SshCollectedBundle = {
        vendor,
        collectedAt,
        commands: []
    }

    const logger = context?.logger
    logger?.info?.({ vendor, host: ssh.host, port }, 'Collecting firewall outputs via SSH (allowlist).')

    const connected = new Promise<void>((resolve, reject) => {
        client
            .on('ready', () => resolve())
            .on('error', (err: Error) => reject(err))
            .connect(connectConfig)
    })

    await connected

    try {
        for (const cmd of allowed) {
            const result = await execCommand(client, cmd, 12000, 1024 * 1024)
            bundle.commands.push({
                cmd,
                stdout: result.stdout,
                stderr: result.stderr || undefined,
                exitCode: result.exitCode
            })
        }
    } finally {
        client.end()
    }

    return bundle
}

