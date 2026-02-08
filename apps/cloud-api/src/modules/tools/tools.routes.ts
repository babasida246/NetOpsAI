import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
    ToolRegistry,
    diffMikrotikRunningConfigTool,
    generateConfigCommand,
    generateFirewallMermaidTool,
    generateMikrotikFullConfigTool,
    generateMikrotikRollbackTool,
    pushMikrotikConfigSshTool,
    type Vendor,
    validateMikrotikConfigTool
} from '@tools/registry'
import type { Pool } from 'pg'
import { AdminRepository } from '../admin/admin.repository.js'
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'
import type { EntitlementService } from '../entitlements/entitlement.service.js'
import { createFeatureGate } from '../../shared/middleware/feature-gate.js'
import {
    enforceReason,
    enforceChangeControls,
    isWriteRisk,
    normalizeRiskLevel,
    redactSensitive,
    requirePermission,
    sanitizeRecord
} from '../../shared/security/netops-guard.js'
import { hasApproved, resolvePolicyForEnvironment } from '../netops/governance.store.js'

const vendorValues = ['cisco', 'fortigate', 'mikrotik'] as const satisfies Vendor[]

const generateSchema = z.object({
    vendor: z.enum(vendorValues),
    action: z.enum([
        'baseline',
        'wan_uplink',
        'lan_vlan',
        'dhcp_server',
        'static_route',
        'ospf',
        'nat_overload',
        'firewall_basic',
        'load_balancing',
        'bridge',
        'secure_baseline'
    ]),
    params: z.record(z.any())
})

export async function toolsRoutes(
    fastify: FastifyInstance,
    authService: AuthService,
    db: Pool,
    entitlementService: EntitlementService
) {
    const registry = new ToolRegistry()
    registry.register(generateMikrotikFullConfigTool)
    registry.register(validateMikrotikConfigTool)
    registry.register(generateMikrotikRollbackTool)
    registry.register(diffMikrotikRunningConfigTool)
    registry.register(pushMikrotikConfigSshTool)
    registry.register(generateFirewallMermaidTool)

    const adminRepo = new AdminRepository(db)

    const authenticate = async (request: any) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }
        const token = authHeader.substring(7)
        request.user = authService.verifyAccessToken(token)
    }

    const audit = async (request: any, action: string, resourceId: string | undefined, details: Record<string, any>) => {
        try {
            await adminRepo.createAuditLog({
                userId: request.user?.sub,
                action,
                resource: 'tools',
                resourceId,
                details,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            })
        } catch (error) {
            request.log.error({ error }, 'Failed to write tools audit log')
        }
    }

    const toolContext = (request: any) => ({
        userId: request.user?.sub,
        role: request.user?.role,
        correlationId: typeof request.id === 'string' ? request.id : String(request.id),
        logger: request.log
    })

    const requireAiTools = createFeatureGate(entitlementService, 'ai.tools')

    fastify.post('/tools/generate-config', {
        schema: {
            tags: ['Tools'],
            summary: 'Generate network config commands',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(generateSchema)
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const body = generateSchema.parse(request.body)
        const command = generateConfigCommand({
            vendor: body.vendor,
            action: body.action,
            params: body.params
        })
        return reply.status(200).send({ command })
    })

    fastify.post('/tools/generate_mikrotik_full_config', {
        schema: {
            tags: ['Tools'],
            summary: 'Generate full MikroTik RouterOS configuration (apply + rollback)',
            security: [{ bearerAuth: [] }],
            body: generateMikrotikFullConfigTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const result = await registry.invoke(generateMikrotikFullConfigTool.name, request.body, toolContext(request))
        const body = request.body as any
        await audit(request, 'generate_mikrotik_full_config', body?.hostname, {
            role: body?.role,
            environment: body?.environment,
            routerOsVersion: body?.device?.routerOsVersion
        })
        return reply.send(result.output)
    })

    fastify.post('/tools/generate_firewall_mermaid', {
        schema: {
            tags: ['Tools'],
            summary: 'Generate Mermaid diagrams from MikroTik/FortiGate firewall outputs',
            security: [{ bearerAuth: [] }],
            body: generateFirewallMermaidTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const result = await registry.invoke(generateFirewallMermaidTool.name, request.body, toolContext(request))
        const body = request.body as any
        await audit(request, 'generate_firewall_mermaid', undefined, {
            vendor: body?.vendor,
            sourceType: body?.source?.type,
            views: body?.views,
            fileLength: typeof body?.source?.file?.text === 'string' ? body.source.file.text.length : undefined,
            host: typeof body?.source?.ssh?.host === 'string' ? body.source.ssh.host : undefined
        })
        return reply.send(result.output)
    })

    fastify.post('/tools/validate_mikrotik_config', {
        schema: {
            tags: ['Tools'],
            summary: 'Validate MikroTik RouterOS configuration script',
            security: [{ bearerAuth: [] }],
            body: validateMikrotikConfigTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const result = await registry.invoke(validateMikrotikConfigTool.name, request.body, toolContext(request))
        const body = request.body as any
        await audit(request, 'validate_mikrotik_config', undefined, {
            routerOsVersion: body?.routerOsVersion,
            configLength: typeof body?.config === 'string' ? body.config.length : 0
        })
        return reply.send(result.output)
    })

    fastify.post('/tools/generate_mikrotik_rollback', {
        schema: {
            tags: ['Tools'],
            summary: 'Generate rollback script for a MikroTik intent',
            security: [{ bearerAuth: [] }],
            body: generateMikrotikRollbackTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const result = await registry.invoke(generateMikrotikRollbackTool.name, request.body, toolContext(request))
        const body = request.body as any
        await audit(request, 'generate_mikrotik_rollback', body?.intent?.hostname, {
            role: body?.intent?.role,
            environment: body?.intent?.environment,
            routerOsVersion: body?.intent?.device?.routerOsVersion
        })
        return reply.send(result.output)
    })

    fastify.post('/tools/diff_mikrotik_running_config', {
        schema: {
            tags: ['Tools'],
            summary: 'Diff desired RouterOS config vs running config',
            security: [{ bearerAuth: [] }],
            body: diffMikrotikRunningConfigTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const result = await registry.invoke(diffMikrotikRunningConfigTool.name, request.body, toolContext(request))
        const body = request.body as any
        await audit(request, 'diff_mikrotik_running_config', undefined, {
            runningLength: typeof body?.runningConfig === 'string' ? body.runningConfig.length : 0,
            desiredLength: typeof body?.desiredConfig === 'string' ? body.desiredConfig.length : 0
        })
        return reply.send(result.output)
    })

    fastify.post('/tools/push_mikrotik_config_ssh', {
        schema: {
            tags: ['Tools'],
            summary: 'Push MikroTik config via SSH (guardrailed; default dry-run)',
            security: [{ bearerAuth: [] }],
            body: pushMikrotikConfigSshTool.inputSchema
        },
        preHandler: [authenticate, requireAiTools]
    }, async (request, reply) => {
        const body = request.body as {
            target: { host: string }
            environment?: 'dev' | 'staging' | 'prod'
            dryRun?: boolean
            ticketId?: string
            riskLevel?: string
            reason?: string
            changeRequestId?: string
            rollbackPlan?: string
            precheck?: string[]
            postcheck?: string[]
            maintenanceWindowId?: string
            breakGlass?: boolean
        }
        const env = body.environment ?? 'dev'
        const policy = resolvePolicyForEnvironment(env as any)
        const riskLevel = normalizeRiskLevel(body.riskLevel)
        if (riskLevel === 'R0_READ') {
            throw new ForbiddenError('SSH push requires a write risk level')
        }
        enforceReason(riskLevel, body.reason)

        if (isWriteRisk(riskLevel)) {
            requirePermission(request.user ?? {}, 'netops.change.execute')
        } else {
            requirePermission(request.user ?? {}, 'netops.read')
        }

        const ticketId = body.ticketId?.trim() || 'UNASSIGNED'
        const approvalRequired = env === 'prod' || policy.requireApproval || riskLevel === 'R2_CHANGE' || riskLevel === 'R3_DANGEROUS'
        const approvalGranted = approvalRequired ? hasApproved(body.target.host, ticketId) : true

        enforceChangeControls({
            level: riskLevel,
            changeRequestId: body.changeRequestId,
            approvalGranted,
            dryRun: body.dryRun,
            rollbackPlan: body.rollbackPlan,
            precheck: body.precheck,
            postcheck: body.postcheck,
            maintenanceWindowId: body.maintenanceWindowId,
            breakGlass: body.breakGlass,
            requireMaintenanceWindow: env === 'prod',
            breakGlassAllowed: body.breakGlass === true && request.user?.role === 'super_admin'
        })

        if (body.dryRun !== true && approvalRequired && !approvalGranted) {
            throw new ForbiddenError('Approval required before executing write actions')
        }

        const result = await registry.invoke(pushMikrotikConfigSshTool.name, request.body, toolContext(request))
        await audit(request, 'push_mikrotik_config_ssh', body?.target?.host, sanitizeRecord({
            environment: env,
            dryRun: body?.dryRun !== false,
            ticketId,
            riskLevel,
            target: body?.target?.host,
            configSample: redactSensitive(String((request.body as any)?.config ?? '')).slice(0, 200)
        }))
        return reply.send(result.output)
    })
}
