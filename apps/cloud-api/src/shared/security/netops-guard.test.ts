import { describe, expect, it } from 'vitest'
import {
    enforceChangeControls,
    enforceReason,
    normalizeRiskLevel,
    requirePermission
} from './netops-guard.js'

describe('netops-guard', () => {
    it('normalizes valid risk levels', () => {
        expect(normalizeRiskLevel('R2_CHANGE')).toBe('R2_CHANGE')
    })

    it('requires a reason for write actions', () => {
        expect(() => enforceReason('R1_SAFE_WRITE', '')).toThrowError()
        expect(() => enforceReason('R0_READ', '')).not.toThrowError()
    })

    it('enforces change controls for R2/R3', () => {
        expect(() => enforceChangeControls({
            level: 'R2_CHANGE',
            changeRequestId: 'cr-1',
            approvalGranted: false,
            dryRun: false,
            rollbackPlan: 'rollback',
            precheck: ['ping'],
            postcheck: ['show']
        })).toThrowError()
    })

    it('checks role-based permissions', () => {
        expect(() => requirePermission({ role: 'viewer', permissions: [] }, 'netops.change.execute')).toThrowError()
        expect(() => requirePermission({ role: 'admin', permissions: [] }, 'netops.change.execute')).not.toThrowError()
    })
})
