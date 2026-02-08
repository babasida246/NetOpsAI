import { describe, it, expect } from 'vitest'
import { AlertService } from '../services/alert.service.js'

class FakeAlertSubRepo {
    async listForAlert() {
        return [{
            id: 'sub-1',
            userId: 'user-1',
            channelId: 'chan-1',
            targetChatId: 'chat-1',
            alertTypes: ['provider.health'],
            severityMin: 'info',
            enabled: true,
            createdAt: new Date().toISOString()
        }]
    }
}

class FakeAlertDedupRepo {
    private count = 0
    async shouldSend() {
        this.count += 1
        return this.count === 1
    }
}

class FakeChannelRepo {
    async findById() {
        return { id: 'chan-1', type: 'telegram', name: 'telegram', config: {}, enabled: true, createdAt: new Date().toISOString() }
    }
}

class FakeChatBridge {
    async ensureConversation() { return { conversationId: 'conv-1', channelId: 'chan-1' } }
    async appendMessage() { return { internalMessageId: 'msg-1' } }
}

describe('AlertService', () => {
    it('throttles duplicate alerts via dedup', async () => {
        const service = new AlertService(
            new FakeAlertSubRepo() as any,
            new FakeAlertDedupRepo() as any,
            new FakeChannelRepo() as any,
            new FakeChatBridge() as any
        )

        const first = await service.pushAlert({
            type: 'provider.health',
            severity: 'warning',
            text: 'Provider degraded',
            dedupKey: 'provider.health'
        })

        const second = await service.pushAlert({
            type: 'provider.health',
            severity: 'warning',
            text: 'Provider degraded',
            dedupKey: 'provider.health'
        })

        expect(first.length).toBeGreaterThan(0)
        expect(second.length).toBe(0)
    })
})
