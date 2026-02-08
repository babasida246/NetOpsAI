import { describe, it, expect } from 'vitest'
import type { InboundEvent } from '../contracts.js'
import { MessagingHubService } from '../services/messaging-hub.service.js'

class FakeAdapter {
    verifyInbound() { return true }
    parseInbound() {
        return {
            channelType: 'telegram',
            externalEventId: 'evt-1',
            externalUserId: 'user-1',
            externalChatId: 'chat-1',
            text: 'ping',
            timestamp: new Date().toISOString(),
            raw: {}
        } as InboundEvent
    }
    send() { return Promise.resolve({ externalMessageId: 'm1' }) }
}

class FakeDedupRepo {
    private seen = new Set<string>()
    async recordIfNew(_channelId: string, eventId: string) {
        if (this.seen.has(eventId)) return false
        this.seen.add(eventId)
        return true
    }
}

class FakeRepo {
    async ensureDefault() { return { id: 'chan-1', type: 'telegram' } }
}

class FakeBindingRepo {
    async findActive() { return null }
    async createPending() { return null }
}

class FakePendingRepo { }
class FakeChatBridge {
    async ensureConversation() { return { conversationId: 'conv-1', channelId: 'chan-1' } }
    async appendMessage() { return { internalMessageId: 'msg-1' } }
}
class FakeOrchestrator {
    async handleInbound() { return [] }
}
class FakeActionService {
    async handleActionClick() { return [] }
}

const fakeAdapter = new FakeAdapter()

const hub = new MessagingHubService(
    fakeAdapter as any,
    fakeAdapter as any,
    fakeAdapter as any,
    new FakeRepo() as any,
    new FakeBindingRepo() as any,
    new FakeDedupRepo() as any,
    new FakePendingRepo() as any,
    new FakeChatBridge() as any,
    new FakeOrchestrator() as any,
    new FakeActionService() as any
)

describe('MessagingHub dedup', () => {
    it('drops duplicate inbound events', async () => {
        const req = { body: {}, headers: {} }
        const first = await hub.ingestInbound('telegram', req)
        const second = await hub.ingestInbound('telegram', req)

        expect(first).not.toBeNull()
        expect(second).toBeNull()
    })
})
