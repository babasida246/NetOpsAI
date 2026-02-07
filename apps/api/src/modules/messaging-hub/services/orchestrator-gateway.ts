import { IntegratedChatService } from '../../chat/integrated-chat.service.js'
import type { InboundEvent, OutboundEnvelope } from '../contracts.js'
import type { ChatBridge } from './chat-bridge.js'
import { v4 as uuidv4 } from 'uuid'

export interface OrchestratorContext {
    userId: string
    conversationId: string
}

export class OrchestratorGateway {
    constructor(
        private chatService: IntegratedChatService,
        private chatBridge: ChatBridge
    ) { }

    async handleInbound(
        event: InboundEvent,
        context: OrchestratorContext
    ): Promise<OutboundEnvelope[]> {
        if (!event.text) {
            return []
        }

        const messages = [{ role: 'user' as const, content: event.text }]
        const correlationId = uuidv4()

        const result = await this.chatService.chat(
            {
                model: 'openai/gpt-4o-mini',
                messages,
                temperature: 0.7,
                stream: false
            },
            {
                userId: context.userId,
                conversationId: context.conversationId,
                saveToDb: false,
                trackUsage: false
            }
        )

        const responseText = result.response.choices[0]?.message?.content || ''

        await this.chatBridge.appendMessage(context.conversationId, context.userId, {
            role: 'assistant',
            text: responseText,
            source: 'chat-bridge',
            correlationId,
            metadata: {
                model: result.model,
                provider: result.provider,
                latencyMs: result.latencyMs
            }
        })

        return [
            {
                type: 'RESULT',
                severity: 'info',
                conversationId: context.conversationId,
                correlationId,
                target: {
                    channelType: event.channelType,
                    chatId: event.externalChatId,
                    threadId: undefined,
                    replyToExternalMessageId: event.replyToExternalMessageId
                },
                text: responseText,
                meta: {
                    provider: result.provider,
                    model: result.model,
                    cost: result.usage.estimatedCost,
                    latencyMs: result.latencyMs
                }
            }
        ]
    }
}
