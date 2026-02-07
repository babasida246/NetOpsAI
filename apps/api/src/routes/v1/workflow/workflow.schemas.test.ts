import { describe, it, expect } from 'vitest'
import { workflowCreateSchema } from './workflow.schemas.js'

describe('workflow schemas', () => {
    it('parses workflow create payloads', () => {
        const result = workflowCreateSchema.parse({
            requestType: 'assign',
            assetId: '123e4567-e89b-12d3-a456-426614174000',
            payload: { assigneeId: 'user-1' }
        })
        expect(result.requestType).toBe('assign')
    })
})
