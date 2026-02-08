import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { MessagingHubService } from './services/messaging-hub.service.js'
import type { AlertService } from './services/alert.service.js'
import type { DiscordAdapter } from './adapters/discord.adapter.js'

const actionSchema = z.object({
    actionId: z.string().uuid(),
    reason: z.string().optional(),
    userText: z.string().optional()
})

const alertSchema = z.object({
    type: z.string().min(1),
    severity: z.enum(['info', 'warning', 'critical']),
    text: z.string().min(1),
    dedupKey: z.string().optional(),
    actions: z.array(z.any()).optional()
})

export async function messagingHubRoutes(
    fastify: FastifyInstance,
    messagingHub: MessagingHubService,
    alertService: AlertService,
    discordAdapter: DiscordAdapter
): Promise<void> {
    fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
        try {
            const rawBody = typeof body === 'string' ? body : body.toString('utf8')
                ; (req as any).rawBody = rawBody
            done(null, JSON.parse(rawBody))
        } catch (error) {
            done(error as Error, undefined)
        }
    })

    fastify.post('/integrations/telegram/webhook', async (request, reply) => {
        const event = await messagingHub.ingestInbound('telegram', request)
        if (!event) return reply.status(200).send({ ok: true })

        const envelopes = await messagingHub.routeToOrchestrator(event)
        const channel = await messagingHub.channelRepo.ensureDefault('telegram')
        const binding = await messagingHub.bindingRepo.findActive(
            channel.id,
            event.externalUserId,
            event.externalChatId
        )
        const userId = binding?.userId || ''

        for (const envelope of envelopes) {
            await messagingHub.dispatchOutbound(envelope, {
                channelType: 'telegram',
                chatId: event.externalChatId,
                channelId: channel.id,
                userId,
                externalUserId: event.externalUserId
            })
        }

        return reply.status(200).send({ ok: true })
    })

    fastify.post('/integrations/discord/webhook', async (request, reply) => {
        if (discordAdapter.isPing(request.body)) {
            return reply.status(200).send({ type: 1 })
        }

        const rawBody = (request as any).rawBody
        const event = await messagingHub.ingestInbound('discord', request, rawBody)
        if (!event) return reply.status(200).send({ ok: true })

        const envelopes = await messagingHub.routeToOrchestrator(event)
        const channel = await messagingHub.channelRepo.ensureDefault('discord')
        const binding = await messagingHub.bindingRepo.findActive(
            channel.id,
            event.externalUserId,
            event.externalChatId
        )
        const userId = binding?.userId || ''

        for (const envelope of envelopes) {
            await messagingHub.dispatchOutbound(envelope, {
                channelType: 'discord',
                chatId: event.externalChatId,
                channelId: channel.id,
                userId,
                externalUserId: event.externalUserId
            })
        }

        return reply.status(200).send({ ok: true })
    })

    fastify.post('/integrations/actions/confirm', {
        schema: { body: zodToJsonSchema(actionSchema) }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const body = actionSchema.parse(request.body)
        const envelopes = await messagingHub.actionService.handleActionClick({
            actionId: body.actionId,
            externalUserId: 'internal',
            externalChatId: 'internal',
            userText: body.reason || body.userText
        })

        for (const envelope of envelopes) {
            await messagingHub.dispatchOutbound(envelope, {
                channelType: 'telegram',
                chatId: envelope.target.chatId || 'internal',
                channelId: (await messagingHub.channelRepo.ensureDefault('telegram')).id,
                userId: '',
                externalUserId: 'internal'
            })
        }

        return reply.status(200).send({ ok: true })
    })

    fastify.post('/integrations/actions/cancel', {
        schema: { body: zodToJsonSchema(actionSchema.pick({ actionId: true })) }
    }, async (request, reply) => {
        const body = actionSchema.pick({ actionId: true }).parse(request.body)
        const envelopes = await messagingHub.actionService.handleActionClick({
            actionId: body.actionId,
            externalUserId: 'internal',
            externalChatId: 'internal'
        })

        for (const envelope of envelopes) {
            await messagingHub.dispatchOutbound(envelope, {
                channelType: 'telegram',
                chatId: envelope.target.chatId || 'internal',
                channelId: (await messagingHub.channelRepo.ensureDefault('telegram')).id,
                userId: '',
                externalUserId: 'internal'
            })
        }

        return reply.status(200).send({ ok: true })
    })

    fastify.post('/integrations/actions/mute', {
        schema: { body: zodToJsonSchema(actionSchema) }
    }, async (request, reply) => {
        const body = actionSchema.parse(request.body)
        const envelopes = await messagingHub.actionService.handleActionClick({
            actionId: body.actionId,
            externalUserId: 'internal',
            externalChatId: 'internal',
            userText: body.reason || body.userText
        })

        for (const envelope of envelopes) {
            await messagingHub.dispatchOutbound(envelope, {
                channelType: 'telegram',
                chatId: envelope.target.chatId || 'internal',
                channelId: (await messagingHub.channelRepo.ensureDefault('telegram')).id,
                userId: '',
                externalUserId: 'internal'
            })
        }

        return reply.status(200).send({ ok: true })
    })

    fastify.post('/alerts/push', {
        schema: { body: zodToJsonSchema(alertSchema) }
    }, async (request, reply) => {
        const body = alertSchema.parse(request.body)
        const envelopes = await alertService.pushAlert(body)

        for (const envelope of envelopes) {
            const channelType = envelope.target.channelType === 'internal'
                ? 'email'
                : envelope.target.channelType
            const channel = await messagingHub.channelRepo.ensureDefault(channelType)
            await messagingHub.dispatchOutbound(envelope, {
                channelType: channel.type,
                chatId: envelope.target.chatId || envelope.target.channelId || '',
                channelId: channel.id,
                userId: '',
                externalUserId: 'any'
            })
        }

        return reply.status(200).send({ ok: true })
    })
}
