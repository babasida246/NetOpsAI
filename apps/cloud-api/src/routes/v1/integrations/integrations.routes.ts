/**
 * Integration Hub Routes
 * Connectors, sync rules, webhooks
 */
import type { FastifyInstance } from 'fastify'
import type { IntegrationService } from '@application/core'
import { z } from 'zod'
import { getUserContext, requireRole } from '../assets/assets.helpers.js'

interface IntegrationRoutesOptions {
    integrationService: IntegrationService
}

export async function integrationRoutes(
    fastify: FastifyInstance,
    opts: IntegrationRoutesOptions
): Promise<void> {
    const svc = opts.integrationService

    // --- Connectors ---
    fastify.post('/integrations/connectors', async (request, reply) => {
        const ctx = requireRole(request, ['admin', 'super_admin'])
        const body = z.object({
            name: z.string().min(1),
            provider: z.enum(['servicenow', 'jira', 'slack', 'teams', 'aws', 'azure', 'email', 'webhook', 'csv_import', 'api_generic']),
            config: z.record(z.unknown()).optional().default({}),
            credentialsRef: z.string().optional(),
            isActive: z.boolean().optional().default(false)
        }).parse(request.body)
        const connector = await svc.createConnector({ ...body, credentialsRef: body.credentialsRef ?? null, createdBy: ctx.userId })
        return reply.status(201).send({ data: connector })
    })

    fastify.get('/integrations/connectors', async (request, reply) => {
        requireRole(request, ['it_asset_manager', 'admin', 'super_admin'])
        const connectors = await svc.listConnectors()
        return reply.send({ data: connectors })
    })

    fastify.get('/integrations/connectors/:id', async (request, reply) => {
        requireRole(request, ['it_asset_manager', 'admin', 'super_admin'])
        const { id } = request.params as { id: string }
        const connector = await svc.getConnector(id)
        if (!connector) return reply.status(404).send({ error: 'Connector not found' })
        return reply.send({ data: connector })
    })

    fastify.put('/integrations/connectors/:id', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { id } = request.params as { id: string }
        const body = z.object({
            name: z.string().optional(),
            config: z.record(z.unknown()).optional(),
            isActive: z.boolean().optional()
        }).parse(request.body)
        const connector = await svc.updateConnector(id, body)
        if (!connector) return reply.status(404).send({ error: 'Connector not found' })
        return reply.send({ data: connector })
    })

    fastify.delete('/integrations/connectors/:id', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { id } = request.params as { id: string }
        await svc.deleteConnector(id)
        return reply.status(204).send()
    })

    fastify.post('/integrations/connectors/:id/test', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { id } = request.params as { id: string }
        const result = await svc.testConnection(id)
        return reply.send({ data: result })
    })

    // --- Sync Rules ---
    fastify.post('/integrations/connectors/:connectorId/sync-rules', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { connectorId } = request.params as { connectorId: string }
        const body = z.object({
            name: z.string().min(1),
            direction: z.enum(['inbound', 'outbound', 'bidirectional']).default('inbound'),
            entityType: z.string().min(1),
            fieldMappings: z.array(z.unknown()).optional().default([]),
            filterConditions: z.record(z.unknown()).optional().default({}),
            scheduleCron: z.string().optional(),
            isActive: z.boolean().optional().default(true)
        }).parse(request.body)
        const rule = await svc.createSyncRule({ ...body, connectorId, scheduleCron: body.scheduleCron ?? null })
        return reply.status(201).send({ data: rule })
    })

    fastify.get('/integrations/connectors/:connectorId/sync-rules', async (request, reply) => {
        requireRole(request, ['it_asset_manager', 'admin', 'super_admin'])
        const { connectorId } = request.params as { connectorId: string }
        const rules = await svc.listSyncRules(connectorId)
        return reply.send({ data: rules })
    })

    fastify.delete('/integrations/sync-rules/:id', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { id } = request.params as { id: string }
        await svc.deleteSyncRule(id)
        return reply.status(204).send()
    })

    // --- Webhooks ---
    fastify.post('/integrations/webhooks', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const body = z.object({
            connectorId: z.string().uuid().optional(),
            name: z.string().min(1),
            url: z.string().url(),
            secret: z.string().optional(),
            events: z.array(z.string()).default([]),
            isActive: z.boolean().optional().default(true)
        }).parse(request.body)
        const webhook = await svc.createWebhook({
            ...body,
            connectorId: body.connectorId ?? null,
            secret: body.secret ?? null
        })
        return reply.status(201).send({ data: webhook })
    })

    fastify.get('/integrations/webhooks', async (request, reply) => {
        requireRole(request, ['it_asset_manager', 'admin', 'super_admin'])
        const webhooks = await svc.listWebhooks()
        return reply.send({ data: webhooks })
    })

    fastify.delete('/integrations/webhooks/:id', async (request, reply) => {
        requireRole(request, ['admin', 'super_admin'])
        const { id } = request.params as { id: string }
        await svc.deleteWebhook(id)
        return reply.status(204).send()
    })

    // --- Provider Types (reference) ---
    fastify.get('/integrations/providers', async (request, reply) => {
        getUserContext(request)
        const providers = await svc.getProviderTypes()
        return reply.send({ data: providers })
    })
}
