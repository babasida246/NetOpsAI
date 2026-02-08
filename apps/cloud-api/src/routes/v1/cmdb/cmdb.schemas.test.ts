import { describe, it, expect } from 'vitest'
import {
    cmdbCiCreateSchema,
    cmdbRelationshipCreateSchema,
    cmdbServiceCreateSchema,
    cmdbTypeCreateSchema
} from './cmdb.schemas.js'

describe('cmdb schemas', () => {
    it('validates cmdb type create', () => {
        const parsed = cmdbTypeCreateSchema.parse({ code: 'APP', name: 'Application' })
        expect(parsed.code).toBe('APP')
    })

    it('validates cmdb ci create with attributes', () => {
        const parsed = cmdbCiCreateSchema.parse({
            typeId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'App',
            ciCode: 'APP-1',
            attributes: { owner: 'team' }
        })
        expect(parsed.attributes?.owner).toBe('team')
    })

    it('validates relationship create payload', () => {
        const parsed = cmdbRelationshipCreateSchema.parse({
            relTypeId: '123e4567-e89b-12d3-a456-426614174001',
            fromCiId: '123e4567-e89b-12d3-a456-426614174002',
            toCiId: '123e4567-e89b-12d3-a456-426614174003'
        })
        expect(parsed.fromCiId).toBeDefined()
    })

    it('validates service create payload', () => {
        const parsed = cmdbServiceCreateSchema.parse({ code: 'SVC', name: 'Service' })
        expect(parsed.name).toBe('Service')
    })
})
