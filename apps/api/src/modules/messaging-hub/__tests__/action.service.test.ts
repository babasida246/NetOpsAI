import { describe, it, expect } from 'vitest'
import { ToolRegistry, echoTool } from '@tools/registry'
import { ActionService } from '../services/action.service.js'

class FakePendingRepo {
    private action: any
    constructor(action: any) { this.action = action }
    async findById() { return this.action }
    async updateStatus() { return }
}

class FakeUserRepo {
    async findById() { return { id: 'user-1', email: 'user@example.com', role: 'operator' } }
}

class FakeAdminRepo {
    async createAuditLog() { return }
}

describe('ActionService', () => {
    it('expires actions past TTL', async () => {
        const action = {
            actionId: '00000000-0000-0000-0000-000000000001',
            conversationId: 'conv-1',
            correlationId: 'corr-1',
            channelId: 'chan-1',
            externalChatId: 'chat-1',
            externalUserId: 'user-1',
            actionKind: 'RUN',
            payload: { toolName: 'echo', params: {}, userId: 'user-1' },
            requiresReason: false,
            status: 'pending',
            expiresAt: new Date(Date.now() - 1000).toISOString(),
            createdAt: new Date().toISOString()
        }

        const registry = new ToolRegistry()
        registry.register(echoTool)

        const service = new ActionService(
            new FakePendingRepo(action) as any,
            new FakeUserRepo() as any,
            new FakeAdminRepo() as any,
            registry
        )

        const result = await service.handleActionClick({
            actionId: action.actionId,
            externalUserId: 'user-1',
            externalChatId: 'chat-1'
        })

        expect(result[0].type).toBe('ERROR')
        expect(result[0].text).toContain('expired')
    })

    it('creates confirm request when required', async () => {
        const action = {
            actionId: '00000000-0000-0000-0000-000000000002',
            conversationId: 'conv-1',
            correlationId: 'corr-2',
            channelId: 'chan-1',
            externalChatId: 'chat-1',
            externalUserId: 'user-1',
            actionKind: 'RUN',
            payload: { toolName: 'push_mikrotik_config_ssh', params: {}, userId: 'user-1' },
            requiresReason: false,
            status: 'pending',
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            createdAt: new Date().toISOString()
        }

        const registry = new ToolRegistry()
        registry.register(echoTool)

        const service = new ActionService(
            new FakePendingRepo(action) as any,
            new FakeUserRepo() as any,
            new FakeAdminRepo() as any,
            registry
        )

        const result = await service.handleActionClick({
            actionId: action.actionId,
            externalUserId: 'user-1',
            externalChatId: 'chat-1'
        })

        expect(result[0].type).toBe('CONFIRM_REQUEST')
        expect(result[0].actions?.length).toBeGreaterThan(0)
    })
})
