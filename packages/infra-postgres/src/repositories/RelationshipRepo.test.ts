import { describe, it, expect, vi } from 'vitest'
import { RelationshipRepo } from './RelationshipRepo.js'
import type { Queryable } from './types.js'

describe('RelationshipRepo', () => {
    it('creates relationships', async () => {
        const query = vi.fn().mockResolvedValueOnce({
            rows: [{
                id: 'rel-1',
                rel_type_id: 'rt-1',
                from_ci_id: 'ci-1',
                to_ci_id: 'ci-2',
                status: 'active',
                since_date: null,
                note: null,
                created_at: new Date()
            }]
        })
        const pg = { query } as unknown as Queryable
        const repo = new RelationshipRepo(pg)

        const created = await repo.create({ relTypeId: 'rt-1', fromCiId: 'ci-1', toCiId: 'ci-2' })
        expect(created.fromCiId).toBe('ci-1')
    })
})
