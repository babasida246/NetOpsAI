import { describe, it, expect } from 'vitest'
import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })

const normalizedConfigSchema = {
    type: 'object',
    required: ['schemaVersion', 'device', 'interfaces', 'vlans', 'routing', 'security', 'mgmt', 'metadata'],
    properties: {
        schemaVersion: { const: '1.0.0' },
        device: {
            type: 'object',
            required: ['vendor', 'hostname'],
            properties: {
                vendor: { type: 'string' },
                hostname: { type: 'string' },
                mgmtIp: { type: 'string' }
            },
            additionalProperties: true
        },
        interfaces: { type: 'array' },
        vlans: { type: 'array' },
        routing: { type: 'object' },
        security: { type: 'object' },
        mgmt: { type: 'object' },
        metadata: { type: 'object' }
    },
    additionalProperties: true
} as const

describe('contracts schema validation', () => {
    it('accepts a minimal normalized config payload', () => {
        const validate = ajv.compile(normalizedConfigSchema)
        const sample = {
            schemaVersion: '1.0.0',
            device: { vendor: 'mikrotik', hostname: 'edge-1' },
            interfaces: [],
            vlans: [],
            routing: {},
            security: {},
            mgmt: {},
            metadata: {}
        }

        const ok = validate(sample)
        expect(ok).toBe(true)
    })

    it('rejects missing required fields', () => {
        const validate = ajv.compile(normalizedConfigSchema)
        const sample = {
            schemaVersion: '1.0.0',
            interfaces: [],
            vlans: []
        }

        const ok = validate(sample)
        expect(ok).toBe(false)
        expect(validate.errors?.length).toBeGreaterThan(0)
    })
})
