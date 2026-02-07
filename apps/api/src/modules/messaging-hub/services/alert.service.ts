import { v4 as uuidv4 } from 'uuid'
import type { AlertEvent, OutboundEnvelope, ActionSpec } from '../contracts.js'
import type { AlertSubscriptionRepository } from '../repositories/alert-subscription.repository.js'
import type { AlertDedupRepository } from '../repositories/alert-dedup.repository.js'
import type { ChannelRepository } from '../repositories/channel.repository.js'
import type { ChatBridge } from './chat-bridge.js'

export class AlertService {
    private muteUntil = new Map<string, number>()

    constructor(
        private subscriptionsRepo: AlertSubscriptionRepository,
        private dedupRepo: AlertDedupRepository,
        private channelRepo: ChannelRepository,
        private chatBridge: ChatBridge
    ) { }

    async pushAlert(event: AlertEvent): Promise<OutboundEnvelope[]> {
        if (event.dedupKey) {
            const allowed = await this.dedupRepo.shouldSend(event.dedupKey, 5 * 60 * 1000)
            if (!allowed) return []
        }

        const subscriptions = await this.subscriptionsRepo.listForAlert(event.type, event.severity)
        const envelopes: OutboundEnvelope[] = []

        for (const sub of subscriptions) {
            const muteKey = `${sub.channelId}:${sub.targetChatId}`
            const mutedUntil = this.muteUntil.get(muteKey)
            if (mutedUntil && mutedUntil > Date.now()) continue

            const channel = await this.channelRepo.findById(sub.channelId)
            if (!channel) {
                continue
            }
            const conversation = await this.chatBridge.ensureConversation(
                { channelType: channel.type, externalChatId: sub.targetChatId },
                sub.userId
            )

            const actions = this.defaultAlertActions(event.actions)

            envelopes.push({
                type: 'ALERT',
                severity: event.severity,
                conversationId: conversation.conversationId,
                correlationId: uuidv4(),
                dedupKey: event.dedupKey,
                target: {
                    channelType: channel.type,
                    chatId: sub.targetChatId
                },
                text: event.text,
                actions,
                meta: {
                    tags: event.tags
                }
            })
        }

        return envelopes
    }

    mute(targetKey: string, minutes: number): void {
        this.muteUntil.set(targetKey, Date.now() + minutes * 60 * 1000)
    }

    private defaultAlertActions(actions?: ActionSpec[]): ActionSpec[] {
        if (actions && actions.length > 0) return actions
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        return [
            {
                actionId: uuidv4(),
                label: 'Ack',
                kind: 'ACK',
                style: 'secondary',
                expiresAt
            },
            {
                actionId: uuidv4(),
                label: 'Mute 30m',
                kind: 'MUTE',
                style: 'secondary',
                expiresAt,
                payload: { muteMinutes: 30 }
            },
            {
                actionId: uuidv4(),
                label: 'Run Quick Check',
                kind: 'RUN',
                style: 'primary',
                expiresAt,
                payload: {
                    toolName: 'time_now',
                    params: {},
                    requiresConfirm: true,
                    summary: 'Run quick health check',
                    plan: 'Execute quick health check tool',
                    risk: 'Low',
                    blastRadius: 1,
                    rollbackPlan: 'No rollback needed'
                }
            }
        ]
    }
}
