import type { IConversationRepo } from '@contracts/shared'
import type { Conversation, ConversationId, UserId, Message } from '@domain/core'

export class InMemoryConversationRepo implements IConversationRepo {
    private conversations = new Map<string, Conversation>()

    async save(conversation: Conversation): Promise<void> {
        this.conversations.set(conversation.id.value, conversation)
    }

    async findById(id: ConversationId): Promise<Conversation | null> {
        return this.conversations.get(id.value) || null
    }

    async findByUserId(userId: UserId, limit = 10): Promise<Conversation[]> {
        return Array.from(this.conversations.values())
            .filter(c => c.userId.equals(userId))
            .slice(0, limit)
    }

    async delete(id: ConversationId): Promise<void> {
        this.conversations.delete(id.value)
    }

    async addMessage(conversationId: ConversationId, message: Message): Promise<void> {
        const conversation = await this.findById(conversationId)
        if (conversation) {
            conversation.addMessage(message)
        }
    }

    // Helper for tests
    clear(): void {
        this.conversations.clear()
    }

    size(): number {
        return this.conversations.size
    }
}
