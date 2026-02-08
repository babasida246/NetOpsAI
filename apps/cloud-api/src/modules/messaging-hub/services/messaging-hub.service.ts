import { v4 as uuidv4 } from 'uuid'
import type { InboundEvent, OutboundEnvelope, ActionSpec } from '../contracts.js'
import type { TelegramAdapter } from '../adapters/telegram.adapter.js'
import type { DiscordAdapter } from '../adapters/discord.adapter.js'
import type { EmailAdapter } from '../adapters/email.adapter.js'
import type { ChannelRepository } from '../repositories/channel.repository.js'
import type { ChannelBindingRepository } from '../repositories/channel-binding.repository.js'
import type { InboundDedupRepository } from '../repositories/inbound-dedup.repository.js'
import type { PendingActionRepository } from '../repositories/pending-action.repository.js'
import type { OrchestratorGateway } from './orchestrator-gateway.js'
import type { ChatBridge } from './chat-bridge.js'
import type { ActionService } from './action.service.js'
import { env } from '../../../config/env.js'

export class MessagingHubService {
    constructor(
        private telegramAdapter: TelegramAdapter,
        private discordAdapter: DiscordAdapter,
        private emailAdapter: EmailAdapter,
        public channelRepo: ChannelRepository,
        public bindingRepo: ChannelBindingRepository,
        private inboundDedupRepo: InboundDedupRepository,
        private pendingRepo: PendingActionRepository,
        private chatBridge: ChatBridge,
        private orchestrator: OrchestratorGateway,
        public actionService: ActionService
    ) { }

    async ingestInbound(channelType: 'telegram' | 'discord', request: any, rawBody?: string): Promise<InboundEvent | null> {
        const adapter = channelType === 'telegram' ? this.telegramAdapter : this.discordAdapter
        if (!adapter.verifyInbound(request, rawBody)) {
            throw new Error('Invalid webhook signature')
        }

        const event = adapter.parseInbound(request.body)
        if (!event) return null

        const channel = await this.channelRepo.ensureDefault(channelType)
        const isNew = await this.inboundDedupRepo.recordIfNew(channel.id, event.externalEventId)
        if (!isNew) return null

        return this.normalizeInbound(event)
    }

    async routeToOrchestrator(event: InboundEvent): Promise<OutboundEnvelope[]> {
        const channel = await this.channelRepo.ensureDefault(event.channelType)
        const binding = await this.bindingRepo.findActive(
            channel.id,
            event.externalUserId,
            event.externalChatId
        )

        const userId = binding?.userId || env.CHATOPS_DEFAULT_USER_ID || ''
        if (!userId) {
            await this.bindingRepo.createPending({
                channelId: channel.id,
                externalUserId: event.externalUserId,
                externalChatId: event.externalChatId
            })
            return [
                {
                    type: 'FYI',
                    severity: 'warning',
                    conversationId: 'unbound',
                    correlationId: uuidv4(),
                    target: {
                        channelType: event.channelType,
                        chatId: event.externalChatId
                    },
                    text: 'This chat is not linked yet. Please ask an admin to approve the binding.'
                }
            ]
        }

        const conversation = await this.chatBridge.ensureConversation(
            { channelType: event.channelType, externalChatId: event.externalChatId, threadId: undefined },
            userId
        )

        const inboundCorrelationId = uuidv4()

        if (event.text) {
            const appended = await this.chatBridge.appendMessage(conversation.conversationId, userId, {
                role: 'user',
                text: event.text,
                source: event.channelType,
                correlationId: inboundCorrelationId,
                metadata: { externalUserId: event.externalUserId }
            })

            const externalMessageId = event.replyToExternalMessageId || event.externalEventId
            if (externalMessageId) {
                await this.chatBridge.linkExternalMessage(
                    conversation.conversationId,
                    appended.internalMessageId,
                    conversation.channelId,
                    externalMessageId
                )
            }
        }

        if (event.actionClick) {
            return this.actionService.handleActionClick({
                actionId: event.actionClick.actionId,
                externalUserId: event.externalUserId,
                externalChatId: event.externalChatId,
                userText: event.actionClick.userText
            })
        }

        return this.orchestrator.handleInbound(event, {
            userId,
            conversationId: conversation.conversationId
        })
    }

    async dispatchOutbound(envelope: OutboundEnvelope, context: {
        channelType: 'telegram' | 'discord' | 'email'
        chatId: string
        channelId: string
        userId: string
        externalUserId: string
    }): Promise<void> {
        const target = envelope.target.channelType === 'internal'
            ? { ...envelope.target, channelType: context.channelType, chatId: context.chatId }
            : envelope.target

        const resolvedUserId = context.userId || env.CHATOPS_DEFAULT_USER_ID || ''
        if (!resolvedUserId) {
            throw new Error('CHATOPS_DEFAULT_USER_ID not configured')
        }

        const conversation = await this.chatBridge.ensureConversation(
            { channelType: context.channelType, externalChatId: context.chatId, threadId: target.threadId },
            resolvedUserId
        )

        const internal = await this.chatBridge.appendMessage(conversation.conversationId, resolvedUserId, {
            role: 'assistant',
            text: envelope.text,
            source: 'chatops',
            correlationId: envelope.correlationId,
            metadata: { type: envelope.type, severity: envelope.severity }
        })

        if (envelope.actions && envelope.actions.length > 0) {
            await this.persistActions(envelope.actions, envelope, { ...context, userId: resolvedUserId })
        }

        if (target.channelType === 'internal') return

        const outbound = { ...envelope, target }
        let externalMessageId: string | undefined

        if (target.channelType === 'telegram') {
            externalMessageId = (await this.telegramAdapter.send(outbound)).externalMessageId
        } else if (target.channelType === 'discord') {
            externalMessageId = (await this.discordAdapter.send(outbound)).externalMessageId
        } else if (target.channelType === 'email') {
            externalMessageId = (await this.emailAdapter.send(outbound)).externalMessageId
        }

        if (externalMessageId) {
            await this.chatBridge.linkExternalMessage(
                conversation.conversationId,
                internal.internalMessageId,
                context.channelId,
                externalMessageId,
                target.threadId
            )
        }
    }

    private normalizeInbound(event: InboundEvent): InboundEvent {
        if (!event.text) return event

        const trimmed = event.text.trim()
        if (trimmed.startsWith('/confirm')) {
            const [, actionId, ...reasonParts] = trimmed.split(' ')
            if (actionId) {
                return { ...event, actionClick: { actionId, userText: reasonParts.join(' ') || undefined } }
            }
        }

        if (trimmed.startsWith('/cancel')) {
            const [, actionId] = trimmed.split(' ')
            if (actionId) {
                return { ...event, actionClick: { actionId } }
            }
        }

        if (trimmed.startsWith('/dryrun')) {
            const [, actionId] = trimmed.split(' ')
            if (actionId) {
                return { ...event, actionClick: { actionId } }
            }
        }

        return event
    }

    private async persistActions(
        actions: ActionSpec[],
        envelope: OutboundEnvelope,
        context: { channelType: 'telegram' | 'discord' | 'email'; chatId: string; channelId: string; userId: string; externalUserId: string }
    ): Promise<void> {
        for (const action of actions) {
            await this.pendingRepo.create({
                actionId: action.actionId,
                conversationId: envelope.conversationId,
                correlationId: envelope.correlationId,
                channelId: context.channelId,
                externalChatId: context.chatId,
                externalUserId: context.externalUserId,
                actionKind: action.kind,
                payload: { ...(action.payload || {}), userId: context.userId },
                requiresReason: action.requiresReason,
                status: 'pending',
                expiresAt: action.expiresAt
            })
        }
    }
}
