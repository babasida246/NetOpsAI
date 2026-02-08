/**
 * Orchestrator Tests
 * Tests for multi-layer NetOps orchestration pipeline
 */
import { describe, it, expect } from 'vitest';
import { OrchestrationStateMachine, canTransitionTo, getValidNextStatuses, isTerminalStatus, getNextLayer, getPreviousLayer, calculateRequiredApprovals, assessRiskLevel, canProceedToNextLayer } from '../../src/modules/netops/orchestrator/state-machine.js';
describe('State Machine', () => {
    describe('Status Transitions', () => {
        it('should allow valid status transitions', () => {
            expect(canTransitionTo('pending', 'running')).toBe(true);
            expect(canTransitionTo('pending', 'cancelled')).toBe(true);
            expect(canTransitionTo('running', 'awaiting_approval')).toBe(true);
            expect(canTransitionTo('awaiting_approval', 'approved')).toBe(true);
            expect(canTransitionTo('awaiting_approval', 'rejected')).toBe(true);
            expect(canTransitionTo('approved', 'deploying')).toBe(true);
            expect(canTransitionTo('deploying', 'deployed')).toBe(true);
            expect(canTransitionTo('deploying', 'rolled_back')).toBe(true);
        });
        it('should reject invalid status transitions', () => {
            expect(canTransitionTo('pending', 'deployed')).toBe(false);
            expect(canTransitionTo('running', 'deployed')).toBe(false);
            expect(canTransitionTo('rejected', 'approved')).toBe(false);
            expect(canTransitionTo('deployed', 'pending')).toBe(false);
        });
        it('should identify terminal statuses', () => {
            expect(isTerminalStatus('rejected')).toBe(true);
            expect(isTerminalStatus('failed')).toBe(true);
            expect(isTerminalStatus('rolled_back')).toBe(true);
            expect(isTerminalStatus('cancelled')).toBe(true);
            expect(isTerminalStatus('pending')).toBe(false);
            expect(isTerminalStatus('running')).toBe(false);
        });
        it('should return valid next statuses', () => {
            const pendingNext = getValidNextStatuses('pending');
            expect(pendingNext).toContain('running');
            expect(pendingNext).toContain('cancelled');
            expect(pendingNext).toContain('failed');
            const awaitingNext = getValidNextStatuses('awaiting_approval');
            expect(awaitingNext).toContain('approved');
            expect(awaitingNext).toContain('rejected');
        });
    });
    describe('Layer Transitions', () => {
        it('should get next layer correctly', () => {
            expect(getNextLayer('L0_intake')).toBe('L1_context');
            expect(getNextLayer('L1_context')).toBe('L2_deterministic');
            expect(getNextLayer('L3_planner')).toBe('L4_expert');
            expect(getNextLayer('L6_judge')).toBe('L7_deploy');
            expect(getNextLayer('L7_deploy')).toBeNull();
        });
        it('should get previous layer correctly', () => {
            expect(getPreviousLayer('L1_context')).toBe('L0_intake');
            expect(getPreviousLayer('L7_deploy')).toBe('L6_judge');
            expect(getPreviousLayer('L0_intake')).toBeNull();
        });
    });
    describe('Risk Assessment', () => {
        it('should calculate low risk correctly', () => {
            const level = assessRiskLevel({
                deviceCount: 1,
                hasRoutingChanges: false,
                hasSecurityChanges: false,
                hasVlanChanges: false,
                affectedSites: 1,
                isProduction: false
            });
            expect(level).toBe('low');
        });
        it('should calculate medium risk correctly', () => {
            const level = assessRiskLevel({
                deviceCount: 5,
                hasRoutingChanges: false,
                hasSecurityChanges: false,
                hasVlanChanges: true,
                affectedSites: 1,
                isProduction: false
            });
            expect(level).toBe('medium');
        });
        it('should calculate high risk correctly', () => {
            const level = assessRiskLevel({
                deviceCount: 15,
                hasRoutingChanges: true,
                hasSecurityChanges: false,
                hasVlanChanges: false,
                affectedSites: 2,
                isProduction: true
            });
            expect(level).toBe('high');
        });
        it('should calculate critical risk correctly', () => {
            const level = assessRiskLevel({
                deviceCount: 60,
                hasRoutingChanges: true,
                hasSecurityChanges: true,
                hasVlanChanges: true,
                affectedSites: 10,
                isProduction: true
            });
            expect(level).toBe('critical');
        });
    });
    describe('Approval Requirements', () => {
        it('should require 1 approval for low risk', () => {
            expect(calculateRequiredApprovals('low')).toBe(1);
        });
        it('should require 1 approval for medium risk', () => {
            expect(calculateRequiredApprovals('medium')).toBe(1);
        });
        it('should require configured approvals for high risk', () => {
            expect(calculateRequiredApprovals('high', 2)).toBe(2);
            expect(calculateRequiredApprovals('high', 3)).toBe(3);
        });
        it('should require at least 2 approvals for critical risk', () => {
            expect(calculateRequiredApprovals('critical', 2)).toBe(2);
            expect(calculateRequiredApprovals('critical', 1)).toBe(2); // Minimum 2
        });
    });
    describe('Deploy Guards', () => {
        const baseRun = {
            id: 'run-001',
            changeRequestId: null,
            intent: 'Update interface descriptions',
            intentParams: {},
            scope: { deviceIds: ['dev-1'], sites: [], roles: [], vendors: [], tags: [] },
            contextPack: { version: 'v1' },
            contextPackHash: 'abc123',
            contextPackTokens: 1000,
            status: 'approved',
            currentLayer: 'L7_deploy',
            riskLevel: 'low',
            requiredApprovals: 1,
            receivedApprovals: 1,
            hasVerifyPlan: true,
            hasRollbackPlan: true,
            hasCriticalFindings: false,
            criticalFindingsWaived: false,
            deployEnabled: true,
            plannerOutput: {},
            expertOutput: {},
            judgeOutput: { verdict: 'approve' },
            startedAt: new Date(),
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user-001',
            errorMessage: null,
            errorDetails: null
        };
        it('should allow deploy when all guards pass', () => {
            const result = canProceedToNextLayer(baseRun);
            expect(result.allowed).toBe(true);
        });
        it('should block deploy when feature flag is disabled', () => {
            const run = { ...baseRun, deployEnabled: false };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('disabled');
        });
        it('should block deploy without verify plan', () => {
            const run = { ...baseRun, hasVerifyPlan: false };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Verification plan');
        });
        it('should block deploy without rollback plan', () => {
            const run = { ...baseRun, hasRollbackPlan: false };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Rollback plan');
        });
        it('should block deploy with unwaived critical findings', () => {
            const run = { ...baseRun, hasCriticalFindings: true, criticalFindingsWaived: false };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Critical findings');
        });
        it('should allow deploy with waived critical findings', () => {
            const run = { ...baseRun, hasCriticalFindings: true, criticalFindingsWaived: true };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(true);
        });
        it('should block deploy with insufficient approvals', () => {
            const run = { ...baseRun, requiredApprovals: 2, receivedApprovals: 1 };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Insufficient approvals');
        });
        it('should block deploy when judge rejected', () => {
            const run = { ...baseRun, judgeOutput: { verdict: 'reject' } };
            const result = canProceedToNextLayer(run);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('rejected');
        });
    });
    describe('OrchestrationStateMachine', () => {
        it('should provide progress percentage', () => {
            const runL0 = {
                id: 'run-001',
                changeRequestId: null,
                intent: 'test',
                intentParams: {},
                scope: { deviceIds: [], sites: [], roles: [], vendors: [], tags: [] },
                contextPack: null,
                contextPackHash: null,
                contextPackTokens: null,
                status: 'running',
                currentLayer: 'L0_intake',
                riskLevel: null,
                requiredApprovals: 1,
                receivedApprovals: 0,
                hasVerifyPlan: false,
                hasRollbackPlan: false,
                hasCriticalFindings: false,
                criticalFindingsWaived: false,
                deployEnabled: true,
                plannerOutput: null,
                expertOutput: null,
                judgeOutput: null,
                startedAt: new Date(),
                completedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-001',
                errorMessage: null,
                errorDetails: null
            };
            const sm = new OrchestrationStateMachine(runL0);
            expect(sm.getProgress()).toBe(0);
            const runL4 = { ...runL0, currentLayer: 'L4_expert' };
            const sm4 = new OrchestrationStateMachine(runL4);
            expect(sm4.getProgress()).toBe(50);
            const runDeployed = { ...runL0, status: 'deployed', currentLayer: 'L7_deploy' };
            const smDeployed = new OrchestrationStateMachine(runDeployed);
            expect(smDeployed.getProgress()).toBe(100);
        });
        it('should provide status description', () => {
            const run = {
                id: 'run-001',
                changeRequestId: null,
                intent: 'test',
                intentParams: {},
                scope: { deviceIds: [], sites: [], roles: [], vendors: [], tags: [] },
                contextPack: null,
                contextPackHash: null,
                contextPackTokens: null,
                status: 'awaiting_approval',
                currentLayer: 'L7_deploy',
                riskLevel: null,
                requiredApprovals: 2,
                receivedApprovals: 1,
                hasVerifyPlan: false,
                hasRollbackPlan: false,
                hasCriticalFindings: false,
                criticalFindingsWaived: false,
                deployEnabled: true,
                plannerOutput: null,
                expertOutput: null,
                judgeOutput: null,
                startedAt: new Date(),
                completedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-001',
                errorMessage: null,
                errorDetails: null
            };
            const sm = new OrchestrationStateMachine(run);
            expect(sm.getStatusDescription()).toContain('1/2');
        });
    });
});
//# sourceMappingURL=orchestrator.test.js.map