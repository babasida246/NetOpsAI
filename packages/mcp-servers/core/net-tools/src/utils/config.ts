import path from 'path'
import { fileURLToPath } from 'url'

const defaultAllowlist = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']

function parseNumber(value: string | undefined, fallback: number): number {
    const parsed = value ? Number(value) : NaN
    return Number.isFinite(parsed) ? parsed : fallback
}

function parseList(value: string | undefined): string[] {
    if (!value) return []
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
}

function parseJson<T>(value: string | undefined, fallback: T): T {
    if (!value) return fallback
    try {
        return JSON.parse(value) as T
    } catch {
        return fallback
    }
}

const nodeEnv = process.env.NODE_ENV || 'development'
const isDev = nodeEnv === 'development'
const mockNettools = process.env.DEV_MOCK_NETTOOLS === 'true' || nodeEnv === 'test'
const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const nettoolsConfig = {
    allowlistCidrs: parseList(process.env.NETTOOLS_ALLOWLIST_CIDRS).length
        ? parseList(process.env.NETTOOLS_ALLOWLIST_CIDRS)
        : defaultAllowlist,
    allowHostnames: process.env.NETTOOLS_ALLOW_HOSTNAMES
        ? process.env.NETTOOLS_ALLOW_HOSTNAMES === 'true'
        : isDev,
    maxHosts: parseNumber(process.env.NETTOOLS_MAX_HOSTS, 256),
    maxPorts: parseNumber(process.env.NETTOOLS_MAX_PORTS, 100),
    nmapTimeoutSec: parseNumber(process.env.NETTOOLS_NMAP_TIMEOUT_SEC, 20),
    snmpTimeoutSec: parseNumber(process.env.NETTOOLS_SNMP_TIMEOUT_SEC, 2),
    snmpRetries: parseNumber(process.env.NETTOOLS_SNMP_RETRIES, 1),
    defaultSnmpCredentialRef: process.env.NETTOOLS_DEFAULT_SNMP_CREDENTIAL || 'default',
    rateLimitPerMinute: parseNumber(process.env.NETTOOLS_RATE_LIMIT_PER_MINUTE, 10),
    execMode: process.env.NETTOOLS_EXEC_MODE || (mockNettools ? 'mock' : 'docker'),
    nettoolsContainerName: process.env.NETTOOLS_CONTAINER_NAME || 'netopsai-nettools',
    fixtureDir: process.env.NETTOOLS_FIXTURE_DIR || path.resolve(currentDir, '..', '..', 'fixtures'),
    snmpCredentials: parseJson<Record<string, any>>(process.env.NETTOOLS_SNMP_CREDENTIALS_JSON, {}),
    deviceCredentials: parseJson<Record<string, any>>(process.env.NETTOOLS_DEVICE_CREDENTIALS_JSON, {})
}

export type NettoolsConfig = typeof nettoolsConfig
