import { env } from '../../../config/env.js'
import type { InboundEvent, OutboundEnvelope, ActionSpec } from '../contracts.js'

interface TelegramMessage {
    message_id: number
    date: number
    text?: string
    chat: { id: number; type: string }
    from?: { id: number; username?: string; first_name?: string; last_name?: string }
    reply_to_message?: { message_id: number }
}

interface TelegramCallbackQuery {
    id: string
    data?: string
    message?: TelegramMessage
    from: { id: number; username?: string }
}

interface TelegramUpdate {
    update_id: number
    message?: TelegramMessage
    callback_query?: TelegramCallbackQuery
}

export class TelegramAdapter {
    verifyInbound(request: any, _rawBody?: string): boolean {
        if (!env.TELEGRAM_WEBHOOK_SECRET) return true
        const token = request.headers['x-telegram-bot-api-secret-token']
        return token === env.TELEGRAM_WEBHOOK_SECRET
    }

    parseInbound(body: TelegramUpdate): InboundEvent | null {
        if (body.callback_query) {
            const callback = body.callback_query
            const msg = callback.message
            if (!msg) return null
            return {
                channelType: 'telegram',
                externalEventId: callback.id,
                externalUserId: String(callback.from.id),
                externalChatId: String(msg.chat.id),
                text: msg.text,
                replyToExternalMessageId: String(msg.message_id),
                actionClick: callback.data
                    ? { actionId: callback.data }
                    : undefined,
                timestamp: new Date((msg.date || Date.now() / 1000) * 1000).toISOString(),
                raw: body as unknown as Record<string, unknown>
            }
        }

        if (body.message) {
            const msg = body.message
            return {
                channelType: 'telegram',
                externalEventId: String(msg.message_id),
                externalUserId: String(msg.from?.id || msg.chat.id),
                externalChatId: String(msg.chat.id),
                text: msg.text,
                replyToExternalMessageId: msg.reply_to_message
                    ? String(msg.reply_to_message.message_id)
                    : undefined,
                timestamp: new Date((msg.date || Date.now() / 1000) * 1000).toISOString(),
                raw: body as unknown as Record<string, unknown>
            }
        }

        return null
    }

    async send(envelope: OutboundEnvelope): Promise<{ externalMessageId?: string }> {
        if (!env.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN not configured')
        }
        if (!envelope.target.chatId) {
            throw new Error('Missing telegram chatId')
        }

        const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`
        const payload: Record<string, unknown> = {
            chat_id: envelope.target.chatId,
            text: envelope.text,
            disable_web_page_preview: true
        }

        if (envelope.target.replyToExternalMessageId) {
            payload.reply_to_message_id = Number(envelope.target.replyToExternalMessageId)
        }

        if (envelope.target.threadId) {
            payload.message_thread_id = Number(envelope.target.threadId)
        }

        if (envelope.actions && envelope.actions.length > 0) {
            payload.reply_markup = {
                inline_keyboard: this.buildInlineKeyboard(envelope.actions)
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Telegram send failed: ${errorText}`)
        }

        const result = await response.json()
        return { externalMessageId: String(result?.result?.message_id || '') }
    }

    private buildInlineKeyboard(actions: ActionSpec[]) {
        return actions.map(action => ([{
            text: action.label,
            callback_data: action.actionId
        }]))
    }
}
