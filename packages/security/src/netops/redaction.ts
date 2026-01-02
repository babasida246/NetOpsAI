/**
 * Security Utilities for NetOps
 * 
 * Provides credential redaction and sensitive data handling.
 * CRITICAL: Never log, store, or send unredacted secrets to LLM.
 */

// Patterns for sensitive data that MUST be redacted
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string; name: string }> = [
    // Passwords in config files
    { pattern: /password\s+\d?\s*['""]?([^'""!\s]+)['""]?/gi, replacement: 'password ***REDACTED***', name: 'password' },
    { pattern: /secret\s+\d?\s*['""]?([^'""!\s]+)['""]?/gi, replacement: 'secret ***REDACTED***', name: 'secret' },
    { pattern: /enable\s+secret\s+\d?\s+([^\s]+)/gi, replacement: 'enable secret ***REDACTED***', name: 'enable_secret' },
    { pattern: /enable\s+password\s+\d?\s+([^\s]+)/gi, replacement: 'enable password ***REDACTED***', name: 'enable_password' },

    // SNMP communities
    { pattern: /community\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'community ***REDACTED***', name: 'snmp_community' },
    { pattern: /snmp-server\s+community\s+([^\s]+)/gi, replacement: 'snmp-server community ***REDACTED***', name: 'snmp_community' },

    // SSH/API keys
    { pattern: /ssh-rsa\s+[A-Za-z0-9+\/=]+/gi, replacement: 'ssh-rsa ***REDACTED***', name: 'ssh_key' },
    { pattern: /ssh-ed25519\s+[A-Za-z0-9+\/=]+/gi, replacement: 'ssh-ed25519 ***REDACTED***', name: 'ssh_key' },
    { pattern: /api[_-]?key\s*[=:]\s*['""]?([^'""!\s]+)['""]?/gi, replacement: 'api_key=***REDACTED***', name: 'api_key' },
    { pattern: /token\s*[=:]\s*['""]?([^'""!\s]+)['""]?/gi, replacement: 'token=***REDACTED***', name: 'token' },

    // Pre-shared keys (IPsec/VPN)
    { pattern: /pre-shared-key\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'pre-shared-key ***REDACTED***', name: 'psk' },
    { pattern: /psk\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'psk ***REDACTED***', name: 'psk' },
    { pattern: /set\s+psksecret\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'set psksecret ***REDACTED***', name: 'fortigate_psk' },

    // TACACS/RADIUS secrets
    { pattern: /tacacs-server\s+key\s+\d?\s*([^\s]+)/gi, replacement: 'tacacs-server key ***REDACTED***', name: 'tacacs_key' },
    { pattern: /radius-server\s+key\s+\d?\s*([^\s]+)/gi, replacement: 'radius-server key ***REDACTED***', name: 'radius_key' },

    // MikroTik specific
    { pattern: /\/user\s+add\s+.*password=([^\s]+)/gi, replacement: '/user add ... password=***REDACTED***', name: 'mikrotik_user' },
    { pattern: /\/ppp\s+secret\s+add\s+.*password=([^\s]+)/gi, replacement: '/ppp secret add ... password=***REDACTED***', name: 'mikrotik_ppp' },

    // FortiGate specific
    { pattern: /set\s+password\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'set password ***REDACTED***', name: 'fortigate_password' },
    { pattern: /set\s+private-key\s+['""]([^""]+)['""]?/gi, replacement: 'set private-key ***REDACTED***', name: 'fortigate_privkey' },
    { pattern: /set\s+passwd\s+['""]?([^'""!\s]+)['""]?/gi, replacement: 'set passwd ***REDACTED***', name: 'fortigate_passwd' },

    // Certificates and private keys (multi-line blocks)
    { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, replacement: '-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----', name: 'private_key_block' },
    { pattern: /-----BEGIN\s+ENCRYPTED\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+ENCRYPTED\s+PRIVATE\s+KEY-----/gi, replacement: '-----BEGIN ENCRYPTED PRIVATE KEY-----\n***REDACTED***\n-----END ENCRYPTED PRIVATE KEY-----', name: 'encrypted_private_key_block' },

    // Generic hex secrets (32+ chars typically)
    { pattern: /md5\s+([a-fA-F0-9]{32,})/gi, replacement: 'md5 ***REDACTED***', name: 'md5_hash' },
    { pattern: /sha\d*\s+([a-fA-F0-9]{40,})/gi, replacement: 'sha ***REDACTED***', name: 'sha_hash' },

    // BGP/OSPF auth keys
    { pattern: /neighbor\s+[\d.]+\s+password\s+\d?\s*([^\s]+)/gi, replacement: 'neighbor ... password ***REDACTED***', name: 'bgp_password' },
    { pattern: /authentication-key\s+([^\s]+)/gi, replacement: 'authentication-key ***REDACTED***', name: 'auth_key' },
    { pattern: /message-digest-key\s+\d+\s+md5\s+\d?\s*([^\s]+)/gi, replacement: 'message-digest-key ... md5 ***REDACTED***', name: 'ospf_md5' },
]

// Simple string matches that should be flagged
const FORBIDDEN_PLAIN_VALUES = [
    'public',    // SNMP default
    'private',   // SNMP default
    'cisco',     // Common default password
    'admin',     // When used as password
    'password',  // Literal password
    'changeme',  // Common default
]

/**
 * Redact sensitive information from configuration text
 */
export function redactConfig(rawConfig: string): RedactedConfig {
    let redacted = rawConfig
    const redactions: RedactionRecord[] = []

    for (const { pattern, replacement, name } of SENSITIVE_PATTERNS) {
        const matches = rawConfig.match(pattern)
        if (matches) {
            redacted = redacted.replace(pattern, replacement)
            redactions.push({
                type: name,
                count: matches.length,
                pattern: pattern.source
            })
        }
    }

    return {
        redactedConfig: redacted,
        redactions,
        hasRedactions: redactions.length > 0,
        originalLength: rawConfig.length,
        redactedLength: redacted.length
    }
}

/**
 * Check if a string contains obvious default/weak credentials
 */
export function containsForbiddenDefaults(text: string): ForbiddenCheck {
    const findings: string[] = []
    const lower = text.toLowerCase()

    for (const forbidden of FORBIDDEN_PLAIN_VALUES) {
        // Check for common patterns like "community public" or "password admin"
        const patterns = [
            new RegExp(`community\\s+${forbidden}\\b`, 'i'),
            new RegExp(`password\\s+${forbidden}\\b`, 'i'),
            new RegExp(`secret\\s+${forbidden}\\b`, 'i'),
        ]

        for (const pattern of patterns) {
            if (pattern.test(text)) {
                findings.push(`Found forbidden default: "${forbidden}"`)
            }
        }
    }

    return {
        hasForbidden: findings.length > 0,
        findings
    }
}

/**
 * Redact sensitive data from log/audit event details
 */
export function redactLogDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
        'password', 'secret', 'token', 'key', 'credential',
        'apiKey', 'api_key', 'privateKey', 'private_key',
        'psk', 'community', 'auth', 'authorization'
    ]

    const redacted: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(details)) {
        const keyLower = key.toLowerCase()

        // Check if key name suggests sensitive data
        if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
            redacted[key] = '***REDACTED***'
        } else if (typeof value === 'string' && value.length > 0) {
            // Redact string values that look like secrets
            if (looksLikeSecret(value)) {
                redacted[key] = '***REDACTED***'
            } else {
                redacted[key] = value
            }
        } else if (typeof value === 'object' && value !== null) {
            // Recursively redact nested objects
            redacted[key] = redactLogDetails(value as Record<string, unknown>)
        } else {
            redacted[key] = value
        }
    }

    return redacted
}

/**
 * Heuristic to detect if a string looks like a secret
 */
function looksLikeSecret(value: string): boolean {
    // Skip short strings and obvious non-secrets
    if (value.length < 8 || value.length > 500) return false
    if (/^(true|false|null|\d+|[\d.]+|[a-z]+)$/i.test(value)) return false

    // High entropy strings (mix of cases, numbers, special chars)
    const hasUpper = /[A-Z]/.test(value)
    const hasLower = /[a-z]/.test(value)
    const hasDigit = /\d/.test(value)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value)

    const complexity = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length

    // If high complexity and no spaces, likely a secret
    if (complexity >= 3 && !value.includes(' ') && value.length >= 16) {
        return true
    }

    // Base64-like strings
    if (/^[A-Za-z0-9+/=]{20,}$/.test(value)) {
        return true
    }

    // Hex strings (32+ chars)
    if (/^[a-fA-F0-9]{32,}$/.test(value)) {
        return true
    }

    return false
}

/**
 * Validate that a vault reference is properly formatted
 */
export function isValidVaultRef(ref: string): boolean {
    // Expected formats:
    // vault:secret/path/to/secret
    // aws-ssm:/path/to/param
    // azure-kv:vault-name/secret-name
    // hashicorp:mount/path

    const validPrefixes = ['vault:', 'aws-ssm:', 'azure-kv:', 'hashicorp:', 'gcp-sm:']
    return validPrefixes.some(prefix => ref.startsWith(prefix)) && ref.length > 10
}

/**
 * Generate a safe credential reference
 */
export function generateVaultRef(deviceId: string, credType: string): string {
    return `vault:secret/netops/devices/${deviceId}/${credType}`
}

// Types
export interface RedactedConfig {
    redactedConfig: string
    redactions: RedactionRecord[]
    hasRedactions: boolean
    originalLength: number
    redactedLength: number
}

export interface RedactionRecord {
    type: string
    count: number
    pattern: string
}

export interface ForbiddenCheck {
    hasForbidden: boolean
    findings: string[]
}

/**
 * Create a safe summary for logging (no sensitive data)
 */
export function createSafeConfigSummary(rawConfig: string): ConfigSummary {
    const lines = rawConfig.split('\n')
    const { redactions } = redactConfig(rawConfig)

    return {
        lineCount: lines.length,
        charCount: rawConfig.length,
        hasRedactions: redactions.length > 0,
        redactionTypes: redactions.map(r => r.type),
        // Basic structure detection
        hasInterfaces: /^interface\s/mi.test(rawConfig) || /\/interface/i.test(rawConfig),
        hasRouting: /^router\s|^ip route|\/ip route/mi.test(rawConfig),
        hasAcl: /^access-list|^ip access-list|\/ip firewall/mi.test(rawConfig),
        hasNat: /^ip nat|\/ip firewall nat|config firewall/mi.test(rawConfig),
        hasVpn: /crypto|ipsec|vpn|tunnel/mi.test(rawConfig),
        hasSsh: /ssh|crypto key/mi.test(rawConfig),
        hasSnmp: /snmp-server|snmp community/mi.test(rawConfig)
    }
}

export interface ConfigSummary {
    lineCount: number
    charCount: number
    hasRedactions: boolean
    redactionTypes: string[]
    hasInterfaces: boolean
    hasRouting: boolean
    hasAcl: boolean
    hasNat: boolean
    hasVpn: boolean
    hasSsh: boolean
    hasSnmp: boolean
}
