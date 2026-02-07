import type { ConversationRepository } from '../../conversations/conversations.repository.js'
import type { ChannelRepository } from '../repositories/channel.repository.js'
import type { ChannelConversationRepository } from '../repositories/channel-conversation.repository.js'
import type { MessageLinkRepository } from '../repositories/message-link.repository.js'

export interface ChatBridgeExternalKey {
    channelType: 'telegram' | 'discord' | 'email'
    externalChatId: string
    threadId?: string
}

export interface ChatBridgeMessage {
    role: 'user' | 'assistant' | 'system'
    text: string
    source: string
    correlationId: string
    metadata?: Record<string, unknown>
}

export interface ChatBridge {
    ensureConversation(
        external: ChatBridgeExternalKey,
        userId: string
    ): Promise<{ conversationId: string; channelId: string }>

    appendMessage(
        conversationId: string,
        userId: string,
        message: ChatBridgeMessage
    ): Promise<{ internalMessageId: string }>

    linkExternalMessage(
        conversationId: string,
        internalMessageId: string,
        channelId: string,
        externalMessageId: string,
        threadId?: string
    ): Promise<void>
}

export class PgChatBridge implements ChatBridge {
    constructor(
        private conversationRepo: ConversationRepository,
        private channelRepo: ChannelRepository,
        private channelConversationRepo: ChannelConversationRepository,
        private messageLinkRepo: MessageLinkRepository
    ) { }

    async ensureConversation(
        external: ChatBridgeExternalKey,
        userId: string
    ): Promise<{ conversationId: string; channelId: string }> {
        const channel = await this.channelRepo.ensureDefault(external.channelType)
        const existing = await this.channelConversationRepo.find(
            channel.id,
            external.externalChatId,
            external.threadId
        )

        if (existing) {
            return { conversationId: existing.conversationId, channelId: channel.id }
        }

        const conversation = await this.conversationRepo.create(userId, {
            title: `ChatOps ${external.channelType} ${external.externalChatId}`,
            model: 'openai/gpt-4o-mini',
            metadata: { channelType: external.channelType, externalChatId: external.externalChatId }
        })

        await this.channelConversationRepo.upsert({
            channelId: channel.id,
            externalChatId: external.externalChatId,
            threadId: external.threadId,
            conversationId: conversation.id
        })

        return { conversationId: conversation.id, channelId: channel.id }
    }

    async appendMessage(
        conversationId: string,
        userId: string,
        message: ChatBridgeMessage
    ): Promise<{ internalMessageId: string }> {
        const created = await this.conversationRepo.createMessage(conversationId, userId, {
            role: message.role,
            content: message.text,
            metadata: {
                source: message.source,
                correlationId: message.correlationId,
                ...message.metadata
            }
        })

        if (!created) {
            throw new Error('Failed to append message to conversation')
        }

        return { internalMessageId: created.id }
    }

    async linkExternalMessage(
        conversationId: string,
        internalMessageId: string,
        channelId: string,
        externalMessageId: string,
        threadId?: string
    ): Promise<void> {
        await this.messageLinkRepo.create({
            conversationId,
            internalMessageId,
            channelId,
            externalMessageId,
            threadId
        })
    }
}
