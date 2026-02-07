import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import type { Redis } from 'ioredis'
import { IntegratedChatService } from '../chat/integrated-chat.service.js'
import { ConversationRepository } from '../conversations/conversations.repository.js'
import { AdminRepository } from '../admin/admin.repository.js'
import { ToolRegistry, echoTool, timeNowTool } from '@tools/registry'
import { messagingHubRoutes } from './messaging-hub.routes.js'
import { TelegramAdapter } from './adapters/telegram.adapter.js'
import { DiscordAdapter } from './adapters/discord.adapter.js'
import { EmailAdapter } from './adapters/email.adapter.js'
import { ChannelRepository } from './repositories/channel.repository.js'
import { ChannelBindingRepository } from './repositories/channel-binding.repository.js'
import { MessageLinkRepository } from './repositories/message-link.repository.js'
import { InboundDedupRepository } from './repositories/inbound-dedup.repository.js'
import { PendingActionRepository } from './repositories/pending-action.repository.js'
import { AlertSubscriptionRepository } from './repositories/alert-subscription.repository.js'
import { AlertDedupRepository } from './repositories/alert-dedup.repository.js'
import { ChannelConversationRepository } from './repositories/channel-conversation.repository.js'
import { UserRepository } from './repositories/user.repository.js'
import { PgChatBridge } from './services/chat-bridge.js'
import { OrchestratorGateway } from './services/orchestrator-gateway.js'
import { ActionService } from './services/action.service.js'
import { AlertService } from './services/alert.service.js'
import { MessagingHubService } from './services/messaging-hub.service.js'

export interface MessagingHubDeps {
    db: Pool
    redis?: Redis
}

export async function registerMessagingHubModule(
    fastify: FastifyInstance,
    deps: MessagingHubDeps
): Promise<void> {
    const telegramAdapter = new TelegramAdapter()
    const discordAdapter = new DiscordAdapter()
    const emailAdapter = new EmailAdapter()

    const channelRepo = new ChannelRepository(deps.db)
    const bindingRepo = new ChannelBindingRepository(deps.db)
    const messageLinkRepo = new MessageLinkRepository(deps.db)
    const inboundDedupRepo = new InboundDedupRepository(deps.db)
    const pendingRepo = new PendingActionRepository(deps.db)
    const alertSubRepo = new AlertSubscriptionRepository(deps.db)
    const alertDedupRepo = new AlertDedupRepository(deps.db)
    const channelConversationRepo = new ChannelConversationRepository(deps.db)
    const userRepo = new UserRepository(deps.db)
    const adminRepo = new AdminRepository(deps.db)

    const conversationRepo = new ConversationRepository(deps.db)
    const chatBridge = new PgChatBridge(conversationRepo, channelRepo, channelConversationRepo, messageLinkRepo)

    const chatService = new IntegratedChatService(deps.db, deps.redis)
    const orchestrator = new OrchestratorGateway(chatService, chatBridge)

    const toolRegistry = new ToolRegistry()
    toolRegistry.register(echoTool)
    toolRegistry.register(timeNowTool)

    const actionService = new ActionService(pendingRepo, userRepo, adminRepo, toolRegistry)
    const alertService = new AlertService(alertSubRepo, alertDedupRepo, channelRepo, chatBridge)

    const messagingHub = new MessagingHubService(
        telegramAdapter,
        discordAdapter,
        emailAdapter,
        channelRepo,
        bindingRepo,
        inboundDedupRepo,
        pendingRepo,
        chatBridge,
        orchestrator,
        actionService
    )

    await messagingHubRoutes(fastify, messagingHub, alertService, discordAdapter)
}
