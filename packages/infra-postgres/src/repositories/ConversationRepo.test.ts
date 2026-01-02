import { describe, it, expect, beforeEach } from 'vitest'
import { Conversation, UserId, createMessage } from '@domain/core'
import { InMemoryConversationRepo } from '@testing/mocks'

describe('ConversationRepo', () => {
    let repo: InMemoryConversationRepo

    beforeEach(() => {
        repo = new InMemoryConversationRepo()
    })

    it('saves and retrieves conversation', async () => {
        const conversation = Conversation.create(
            UserId.create('user-1'),
            'Test Chat'
        )

        await repo.save(conversation)
        const found = await repo.findById(conversation.id)

        expect(found).toBeDefined()
        expect(found?.title).toBe('Test Chat')
    })

    it('finds conversations by user', async () => {
        const userId = UserId.create('user-1')
        const conv1 = Conversation.create(userId, 'Chat 1')
        const conv2 = Conversation.create(userId, 'Chat 2')

        await repo.save(conv1)
        await repo.save(conv2)

        const conversations = await repo.findByUserId(userId)
        expect(conversations).toHaveLength(2)
    })

    it('adds message to conversation', async () => {
        const conversation = Conversation.create(UserId.create('user-1'), 'Test')
        await repo.save(conversation)

        const message = createMessage({ role: 'user', content: 'Hello' })
        await repo.addMessage(conversation.id, message)

        const found = await repo.findById(conversation.id)
        expect(found?.getMessages()).toHaveLength(1)
    })

    it('deletes conversation', async () => {
        const conversation = Conversation.create(UserId.create('user-1'), 'Test')
        await repo.save(conversation)

        await repo.delete(conversation.id)

        const found = await repo.findById(conversation.id)
        expect(found).toBeNull()
    })
})
