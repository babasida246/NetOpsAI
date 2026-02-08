import { env, isDev } from '../../../config/env.js'
import type { InboundEvent, OutboundEnvelope, ActionSpec } from '../contracts.js'
import { createPublicKey, verify } from 'crypto'

export class DiscordAdapter {
    isPing(body: any): boolean {
        return body?.type === 1
    }

    verifyInbound(request: any, rawBody?: string): boolean {
        const signature = request.headers['x-signature-ed25519']
        const timestamp = request.headers['x-signature-timestamp']

        if (env.DISCORD_PUBLIC_KEY && signature && timestamp && rawBody) {
            return this.verifySignature(String(signature), String(timestamp), rawBody, env.DISCORD_PUBLIC_KEY)
        }

        if (env.DISCORD_WEBHOOK_SECRET) {
            const secret = request.headers['x-discord-webhook-secret']
            return secret === env.DISCORD_WEBHOOK_SECRET
        }

        return isDev
    }

    parseInbound(body: any): InboundEvent | null {
        if (body?.type === 3 && body?.data?.custom_id) {
            return {
                channelType: 'discord',
                externalEventId: String(body.id || body.data.custom_id),
                externalUserId: String(body.member?.user?.id || body.user?.id || 'unknown'),
                externalChatId: String(body.channel_id || ''),
                text: body.data?.value,
                replyToExternalMessageId: body.message?.id ? String(body.message.id) : undefined,
                actionClick: { actionId: String(body.data.custom_id) },
                timestamp: new Date().toISOString(),
                raw: body as Record<string, unknown>
            }
        }

        if (typeof body?.content === 'string' && body?.author?.id) {
            return {
                channelType: 'discord',
                externalEventId: String(body.id || `${body.author.id}-${Date.now()}`),
                externalUserId: String(body.author.id),
                externalChatId: String(body.channel_id || body.channelId || ''),
                text: body.content,
                replyToExternalMessageId: body.message_reference?.message_id
                    ? String(body.message_reference.message_id)
                    : undefined,
                timestamp: body.timestamp ? new Date(body.timestamp).toISOString() : new Date().toISOString(),
                raw: body as Record<string, unknown>
            }
        }

        if (body?.type === 2 && body?.data?.name) {
            const text = body.data?.options?.map((opt: any) => opt.value).join(' ') || ''
            return {
                channelType: 'discord',
                externalEventId: String(body.id || `${body.data.name}-${Date.now()}`),
                externalUserId: String(body.member?.user?.id || body.user?.id || 'unknown'),
                externalChatId: String(body.channel_id || ''),
                text: `/${body.data.name} ${text}`.trim(),
                timestamp: new Date().toISOString(),
                raw: body as Record<string, unknown>
            }
        }

        return null
    }

    async send(envelope: OutboundEnvelope): Promise<{ externalMessageId?: string }> {
        if (!env.DISCORD_BOT_TOKEN) {
            throw new Error('DISCORD_BOT_TOKEN not configured')
        }
        if (!envelope.target.channelId && !envelope.target.chatId) {
            throw new Error('Missing discord channelId')
        }

        const channelId = envelope.target.channelId || envelope.target.chatId
        const url = `https://discord.com/api/v10/channels/${channelId}/messages`

        const payload: Record<string, unknown> = {
            content: envelope.text,
            allowed_mentions: { parse: [] }
        }

        if (envelope.actions && envelope.actions.length > 0) {
            payload.components = [
                {
                    type: 1,
                    components: this.buildButtons(envelope.actions)
                }
            ]
        }

        if (envelope.target.replyToExternalMessageId) {
            payload.message_reference = { message_id: envelope.target.replyToExternalMessageId }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Discord send failed: ${errorText}`)
        }

        const result = await response.json() as { id?: string }
        return { externalMessageId: String(result?.id || '') }
    }

    private buildButtons(actions: ActionSpec[]) {
        return actions.slice(0, 5).map(action => ({
            type: 2,
            style: this.mapStyle(action.style),
            label: action.label,
            custom_id: action.actionId
        }))
    }

    private mapStyle(style?: ActionSpec['style']): number {
        switch (style) {
            case 'primary': return 1
            case 'danger': return 4
            case 'secondary': return 2
            default: return 2
        }
    }

    private verifySignature(signatureHex: string, timestamp: string, rawBody: string, publicKeyHex: string): boolean {
        try {
            const key = createPublicKey({
                key: Buffer.from(`302a300506032b6570032100${publicKeyHex}`, 'hex'),
                format: 'der',
                type: 'spki'
            })
            const message = Buffer.from(timestamp + rawBody)
            return verify(null, message, key, Buffer.from(signatureHex, 'hex'))
        } catch (error) {
            return false
        }
    }
}
