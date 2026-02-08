import { describe, it, expect } from 'vitest'
import { redactConfig, containsForbiddenDefaults, redactLogDetails } from '../src/netops/redaction.js'

describe('security redaction', () => {
    it('redacts passwords and tokens from config', () => {
        const input = 'username admin\npassword 0 SuperSecret\napi_key=ABC123TOKEN'
        const result = redactConfig(input)

        expect(result.hasRedactions).toBe(true)
        expect(result.redactedConfig).not.toContain('SuperSecret')
        expect(result.redactedConfig).not.toContain('ABC123TOKEN')
    })

    it('detects forbidden defaults', () => {
        const input = 'snmp-server community public\npassword admin'
        const result = containsForbiddenDefaults(input)

        expect(result.hasForbidden).toBe(true)
        expect(result.findings.length).toBeGreaterThan(0)
    })

    it('redacts sensitive log details', () => {
        const details = {
            password: 'Secret123',
            token: 'TokenValue',
            nested: { apiKey: 'KeyValue' }
        }

        const redacted = redactLogDetails(details)
        expect(redacted.password).toBe('***REDACTED***')
        expect(redacted.token).toBe('***REDACTED***')
        expect((redacted.nested as Record<string, unknown>).apiKey).toBe('***REDACTED***')
    })
})
