/**
 * NetOps API Routes - /netops endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { NetOpsService, type AuditContext } from './netops.service.js'
import type { AuthService } from '../auth/index.js'
import {
    createDeviceSchema,
    updateDeviceSchema,
    deviceFiltersSchema,
    uploadConfigSchema,
    createRulepackSchema,
    runLintSchema,
    createChangeSchema,
    approvalDecisionSchema,
    deviceIdParamSchema,
    configIdParamSchema,
    rulepackIdParamSchema,
    lintRunIdParamSchema,
    changeIdParamSchema,
    createOrchestrationRunSchema,
    orchestrationRunFiltersSchema,
    orchestrationApprovalSchema,
    orchestrationWaiverSchema,
    orchestrationRunIdParamSchema,
    type CreateDeviceInput,
    type UpdateDeviceInput,
    type DeviceFiltersInput,
    type UploadConfigInput,
    type CreateRulepackInput,
    type RunLintInput,
    type CreateChangeInput,
    type ApprovalDecisionInput,
    type CreateOrchestrationRunInput,
    type OrchestrationRunFiltersInput,
    type OrchestrationApprovalInput,
    type OrchestrationWaiverInput
} from './netops.schema.js'
import { z } from 'zod'
import type { ChangeRequestStatus, ChangeFilters } from './netops.types.js'
import type { Pool } from 'pg'

// Type helper for query string
type QueryFilters = { Querystring: DeviceFiltersInput }

// Build audit context from request
function buildAuditContext(req: FastifyRequest): AuditContext {
    return {
        userId: (req as any).user?.sub || (req as any).user?.id,
        userRole: (req as any).user?.role,
        requestId: req.id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    }
}

// Common error response schema
const errorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
    statusCode: z.number()
})

export async function netopsRoutes(app: FastifyInstance, db: Pool, authService: AuthService): Promise<void> {
    const service = new NetOpsService(db)

    // ====================
    // DEVICES
    // ====================

    // GET /netops/devices - List devices
    app.get<QueryFilters>('/devices', {
        schema: {
            tags: ['NetOps'],
            summary: 'List all network devices',
            description: 'Retrieve a paginated list of network devices with optional filtering',
            querystring: zodToJsonSchema(deviceFiltersSchema),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const filters = deviceFiltersSchema.parse(req.query)
        const { devices, total } = await service.getDevices(filters)
        return reply.send({
            data: devices,
            total,
            limit: filters.limit,
            offset: filters.offset
        })
    })

    // POST /netops/devices - Create device
    app.post<{ Body: CreateDeviceInput }>('/devices', {
        schema: {
            tags: ['NetOps'],
            summary: 'Create a new network device',
            description: 'Register a new network device in the inventory',
            body: zodToJsonSchema(createDeviceSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = createDeviceSchema.parse(req.body)
        const device = await service.createDevice(input, buildAuditContext(req))
        return reply.code(201).send(device)
    })

    // POST /netops/devices/import - Bulk import devices
    app.post<{ Body: { devices: CreateDeviceInput[] } }>('/devices/import', {
        schema: {
            tags: ['NetOps'],
            summary: 'Bulk import network devices',
            description: 'Import multiple network devices in a single request',
            body: {
                type: 'object',
                required: ['devices'],
                properties: {
                    devices: { type: 'array', items: zodToJsonSchema(createDeviceSchema) }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        created: { type: 'number' },
                        errors: { type: 'array' }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const { devices } = req.body
        const validated = devices.map(d => createDeviceSchema.parse(d))
        const result = await service.importDevices(validated, buildAuditContext(req))
        return reply.send(result)
    })

    // GET /netops/devices/:id - Get device by ID
    app.get<{ Params: { id: string } }>('/devices/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get device details',
            description: 'Retrieve detailed information about a specific network device',
            params: zodToJsonSchema(deviceIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = deviceIdParamSchema.parse(req.params)
        const device = await service.getDeviceById(id)
        return reply.send(device)
    })

    // PATCH /netops/devices/:id - Update device
    app.patch<{ Params: { id: string }; Body: UpdateDeviceInput }>('/devices/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Update device',
            description: 'Update properties of an existing network device',
            params: zodToJsonSchema(deviceIdParamSchema),
            body: zodToJsonSchema(updateDeviceSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = deviceIdParamSchema.parse(req.params)
        const input = updateDeviceSchema.parse(req.body)
        const device = await service.updateDevice(id, input, buildAuditContext(req))
        return reply.send(device)
    })

    // DELETE /netops/devices/:id - Delete device
    app.delete<{ Params: { id: string } }>('/devices/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Delete device',
            description: 'Remove a network device from the inventory',
            params: zodToJsonSchema(deviceIdParamSchema),
            response: {
                204: { type: 'null' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = deviceIdParamSchema.parse(req.params)
        await service.deleteDevice(id, buildAuditContext(req))
        return reply.code(204).send()
    })

    // POST /netops/devices/:id/pull-config - Pull configuration from device
    app.post<{ Params: { id: string }; Body: { configType?: string } }>('/devices/:id/pull-config', {
        schema: {
            tags: ['NetOps'],
            summary: 'Pull configuration from device',
            description: 'Connect to device and retrieve current configuration',
            params: zodToJsonSchema(deviceIdParamSchema),
            body: {
                type: 'object',
                properties: {
                    configType: { type: 'string', default: 'running' }
                }
            },
            response: {
                201: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = deviceIdParamSchema.parse(req.params)
        const configType = req.body?.configType || 'running'
        const config = await service.pullConfig(id, configType, buildAuditContext(req))
        return reply.code(201).send(config)
    })

    // GET /netops/devices/:id/configs - Get device configs
    app.get<{ Params: { id: string }; Querystring: { limit?: number } }>('/devices/:id/configs', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get device configuration history',
            description: 'Retrieve configuration version history for a device',
            params: zodToJsonSchema(deviceIdParamSchema),
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 10 }
                }
            },
            response: {
                200: { type: 'array', items: { type: 'object' } }
            }
        }
    }, async (req, reply) => {
        const { id } = deviceIdParamSchema.parse(req.params)
        const limit = req.query.limit || 10
        const configs = await service.getDeviceConfigs(id, limit)
        return reply.send(configs)
    })

    // ====================
    // CONFIGURATIONS
    // ====================

    // POST /netops/configs - Upload configuration
    app.post<{ Body: UploadConfigInput }>('/configs', {
        schema: {
            tags: ['NetOps'],
            summary: 'Upload configuration',
            description: 'Upload a configuration file for a device',
            body: zodToJsonSchema(uploadConfigSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = uploadConfigSchema.parse(req.body)
        const config = await service.uploadConfig(input, buildAuditContext(req))
        return reply.code(201).send(config)
    })

    // GET /netops/configs/:id - Get config version
    app.get<{ Params: { id: string } }>('/configs/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get configuration version',
            description: 'Retrieve a specific configuration version',
            params: zodToJsonSchema(configIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = configIdParamSchema.parse(req.params)
        const config = await service.getConfigById(id)
        return reply.send(config)
    })

    // GET /netops/configs/:id/raw - Get raw config text
    app.get<{ Params: { id: string } }>('/configs/:id/raw', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get raw configuration',
            description: 'Retrieve the raw text content of a configuration',
            params: zodToJsonSchema(configIdParamSchema),
            response: {
                200: { type: 'string' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = configIdParamSchema.parse(req.params)
        const raw = await service.getConfigRaw(id)
        return reply.type('text/plain').send(raw)
    })

    // POST /netops/configs/:id/parse-normalize - Parse and normalize config
    app.post<{ Params: { id: string } }>('/configs/:id/parse-normalize', {
        schema: {
            tags: ['NetOps'],
            summary: 'Parse and normalize configuration',
            description: 'Parse vendor-specific config into normalized schema',
            params: zodToJsonSchema(configIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = configIdParamSchema.parse(req.params)
        const normalized = await service.parseAndNormalize(id, buildAuditContext(req))
        return reply.send(normalized)
    })

    // GET /netops/configs/:id/diff - Get diff between two configs
    app.get<{ Params: { id: string }; Querystring: { compareWith: string } }>('/configs/:id/diff', {
        schema: {
            tags: ['NetOps'],
            summary: 'Compare configurations',
            description: 'Get line-by-line diff between two configuration versions',
            params: zodToJsonSchema(configIdParamSchema),
            querystring: {
                type: 'object',
                required: ['compareWith'],
                properties: {
                    compareWith: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        from: { type: 'string' },
                        to: { type: 'string' },
                        diff: { type: 'array', items: { type: 'string' } }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const { id } = configIdParamSchema.parse(req.params)
        const { compareWith } = req.query
        const diff = await service.getConfigDiff(id, compareWith)
        return reply.send(diff)
    })

    // ====================
    // RULEPACKS
    // ====================

    // GET /netops/rulepacks - List rulepacks
    app.get('/rulepacks', {
        schema: {
            tags: ['NetOps'],
            summary: 'List rulepacks',
            description: 'Retrieve all available lint rulepacks',
            response: {
                200: { type: 'array', items: { type: 'object' } }
            }
        }
    }, async (req, reply) => {
        const rulepacks = await service.getRulepacks()
        return reply.send(rulepacks)
    })

    // POST /netops/rulepacks - Create rulepack
    app.post<{ Body: CreateRulepackInput }>('/rulepacks', {
        schema: {
            tags: ['NetOps'],
            summary: 'Create rulepack',
            description: 'Create a new lint rulepack with custom rules',
            body: zodToJsonSchema(createRulepackSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = createRulepackSchema.parse(req.body)
        const rulepack = await service.createRulepack(input, buildAuditContext(req))
        return reply.code(201).send(rulepack)
    })

    // GET /netops/rulepacks/:id - Get rulepack by ID
    app.get<{ Params: { id: string } }>('/rulepacks/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get rulepack details',
            description: 'Retrieve a specific rulepack with all rules',
            params: zodToJsonSchema(rulepackIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = rulepackIdParamSchema.parse(req.params)
        const rulepack = await service.getRulepackById(id)
        return reply.send(rulepack)
    })

    // POST /netops/rulepacks/:id/activate - Activate rulepack
    app.post<{ Params: { id: string } }>('/rulepacks/:id/activate', {
        schema: {
            tags: ['NetOps'],
            summary: 'Activate rulepack',
            description: 'Set a rulepack as active (deactivates others with same name)',
            params: zodToJsonSchema(rulepackIdParamSchema),
            response: {
                200: { type: 'object', properties: { message: { type: 'string' } } },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = rulepackIdParamSchema.parse(req.params)
        await service.activateRulepack(id, buildAuditContext(req))
        return reply.send({ message: 'Rulepack activated successfully' })
    })

    // ====================
    // LINT
    // ====================

    // POST /netops/lint/run - Run lint check
    app.post<{ Body: RunLintInput }>('/lint/run', {
        schema: {
            tags: ['NetOps'],
            summary: 'Run lint check',
            description: 'Execute lint rules against a device or configuration',
            body: zodToJsonSchema(runLintSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = runLintSchema.parse(req.body)
        const lintRun = await service.runLint(input, buildAuditContext(req))
        return reply.code(201).send(lintRun)
    })

    // GET /netops/lint/runs/:id - Get lint run by ID
    app.get<{ Params: { id: string } }>('/lint/runs/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get lint run results',
            description: 'Retrieve the results of a specific lint run',
            params: zodToJsonSchema(lintRunIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = lintRunIdParamSchema.parse(req.params)
        const lintRun = await service.getLintRun(id)
        return reply.send(lintRun)
    })

    // GET /netops/lint/history - Get lint history for target
    app.get<{ Querystring: { targetType: string; targetId: string } }>('/lint/history', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get lint history',
            description: 'Retrieve lint run history for a device or configuration',
            querystring: {
                type: 'object',
                required: ['targetType', 'targetId'],
                properties: {
                    targetType: { type: 'string', enum: ['device', 'config_version'] },
                    targetId: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: { type: 'array', items: { type: 'object' } }
            }
        }
    }, async (req, reply) => {
        const { targetType, targetId } = req.query
        const history = await service.getLintHistory(targetType, targetId)
        return reply.send(history)
    })

    // ====================
    // CHANGES
    // ====================

    // GET /netops/changes - List change requests
    app.get<{ Querystring: { status?: string; riskLevel?: string; page?: number; limit?: number } }>('/changes', {
        schema: {
            tags: ['NetOps'],
            summary: 'List change requests',
            description: 'Retrieve a list of change requests with optional filtering',
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    riskLevel: { type: 'string' },
                    page: { type: 'number', default: 1 },
                    limit: { type: 'number', default: 50 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const filters = req.query as ChangeFilters
        const { changes, total } = await service.getChanges(filters)
        return reply.send({ data: changes, total })
    })

    // POST /netops/changes - Create change request
    app.post<{ Body: CreateChangeInput }>('/changes', {
        schema: {
            tags: ['NetOps'],
            summary: 'Create change request',
            description: 'Create a new change request in draft status',
            body: zodToJsonSchema(createChangeSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = createChangeSchema.parse(req.body)
        const change = await service.createChange(input, buildAuditContext(req))
        return reply.code(201).send(change)
    })

    // GET /netops/changes/:id - Get change by ID
    app.get<{ Params: { id: string } }>('/changes/:id', {
        schema: {
            tags: ['NetOps'],
            summary: 'Get change request details',
            description: 'Retrieve detailed information about a change request',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const change = await service.getChangeById(id)
        return reply.send(change)
    })

    // POST /netops/changes/:id/plan - Transition to planned status
    app.post<{ Params: { id: string } }>('/changes/:id/plan', {
        schema: {
            tags: ['NetOps'],
            summary: 'Move change to planned',
            description: 'Transition change request from draft to planned status',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const change = await service.updateChangeStatus(id, 'planned', buildAuditContext(req))
        return reply.send(change)
    })

    // POST /netops/changes/:id/generate - Generate candidate config (placeholder)
    app.post<{ Params: { id: string } }>('/changes/:id/generate', {
        schema: {
            tags: ['NetOps'],
            summary: 'Generate candidate configuration',
            description: 'Generate candidate configuration for review (LLM assisted)',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        // Placeholder for LLM-assisted config generation
        const change = await service.updateChangeStatus(id, 'candidate_ready', buildAuditContext(req))
        return reply.send({
            change,
            message: 'Candidate configuration generated (placeholder)'
        })
    })

    // POST /netops/changes/:id/verify - Verify candidate config
    app.post<{ Params: { id: string } }>('/changes/:id/verify', {
        schema: {
            tags: ['NetOps'],
            summary: 'Verify candidate configuration',
            description: 'Run lint and validation on candidate configuration',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        // Verification logic - lint, etc.
        const change = await service.updateChangeStatus(id, 'verified', buildAuditContext(req))
        return reply.send({
            change,
            verification: { passed: true, checks: ['lint', 'syntax', 'connectivity'] }
        })
    })

    // POST /netops/changes/:id/submit-approval - Submit for approval
    app.post<{ Params: { id: string } }>('/changes/:id/submit-approval', {
        schema: {
            tags: ['NetOps'],
            summary: 'Submit for approval',
            description: 'Submit verified change request for approval workflow',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const change = await service.updateChangeStatus(id, 'waiting_approval', buildAuditContext(req))
        return reply.send(change)
    })

    // POST /netops/changes/:id/approve - Approve change
    app.post<{ Params: { id: string }; Body: ApprovalDecisionInput }>('/changes/:id/approve', {
        schema: {
            tags: ['NetOps'],
            summary: 'Approve change request',
            description: 'Approve a change request waiting for approval',
            params: zodToJsonSchema(changeIdParamSchema),
            body: zodToJsonSchema(approvalDecisionSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const decision = approvalDecisionSchema.parse(req.body)
        const change = await service.updateChangeStatus(id, 'approved', buildAuditContext(req))
        return reply.send({ change, decision })
    })

    // POST /netops/changes/:id/reject - Reject change
    app.post<{ Params: { id: string }; Body: ApprovalDecisionInput }>('/changes/:id/reject', {
        schema: {
            tags: ['NetOps'],
            summary: 'Reject change request',
            description: 'Reject a change request waiting for approval',
            params: zodToJsonSchema(changeIdParamSchema),
            body: zodToJsonSchema(approvalDecisionSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const decision = approvalDecisionSchema.parse(req.body)
        const change = await service.updateChangeStatus(id, 'rejected', buildAuditContext(req))
        return reply.send({ change, decision })
    })

    // POST /netops/changes/:id/deploy - Deploy approved change (placeholder)
    app.post<{ Params: { id: string } }>('/changes/:id/deploy', {
        schema: {
            tags: ['NetOps'],
            summary: 'Deploy change',
            description: 'Deploy approved change to target devices',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const change = await service.updateChangeStatus(id, 'deploying', buildAuditContext(req))
        // Placeholder for actual deployment
        return reply.send({
            change,
            deployment: { status: 'started', message: 'Deployment initiated (placeholder)' }
        })
    })

    // POST /netops/changes/:id/close - Close change request
    app.post<{ Params: { id: string } }>('/changes/:id/close', {
        schema: {
            tags: ['NetOps'],
            summary: 'Close change request',
            description: 'Close a completed or cancelled change request',
            params: zodToJsonSchema(changeIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { id } = changeIdParamSchema.parse(req.params)
        const change = await service.updateChangeStatus(id, 'closed', buildAuditContext(req))
        return reply.send(change)
    })

    // ====================
    // ORCHESTRATION
    // ====================

    // POST /netops/orchestration/runs - Create orchestration run
    app.post<{ Body: CreateOrchestrationRunInput }>('/orchestration/runs', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Create orchestration run',
            description: 'Create a new multi-layer orchestration run for network changes',
            body: zodToJsonSchema(createOrchestrationRunSchema),
            response: {
                201: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const input = createOrchestrationRunSchema.parse(req.body)
        const run = await service.createOrchestrationRun(input, buildAuditContext(req))
        return reply.code(201).send(run)
    })

    // GET /netops/orchestration/runs - List orchestration runs
    app.get<{ Querystring: OrchestrationRunFiltersInput }>('/orchestration/runs', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'List orchestration runs',
            description: 'Get a list of orchestration runs with optional filtering',
            querystring: zodToJsonSchema(orchestrationRunFiltersSchema),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const filters = orchestrationRunFiltersSchema.parse(req.query)
        const runs = await service.getOrchestrationRuns(filters)
        return reply.send({ data: runs, total: runs.length })
    })

    // GET /netops/orchestration/runs/:runId - Get orchestration run
    app.get<{ Params: { runId: string } }>('/orchestration/runs/:runId', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Get orchestration run',
            description: 'Get details of a specific orchestration run including all nodes',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const run = await service.getOrchestrationRunById(runId)
        if (!run) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Orchestration run not found',
                statusCode: 404
            })
        }
        return reply.send(run)
    })

    // POST /netops/orchestration/runs/:runId/execute - Execute orchestration run
    app.post<{ Params: { runId: string } }>('/orchestration/runs/:runId/execute', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Execute orchestration run',
            description: 'Execute the full orchestration pipeline (L0-L6)',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const run = await service.executeOrchestrationRun(runId, buildAuditContext(req))
        return reply.send(run)
    })

    // POST /netops/orchestration/runs/:runId/approve - Approve orchestration run
    app.post<{ Params: { runId: string }; Body: OrchestrationApprovalInput }>('/orchestration/runs/:runId/approve', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Approve orchestration run',
            description: 'Record approval for an orchestration run awaiting approval',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            body: zodToJsonSchema(orchestrationApprovalSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const input = orchestrationApprovalSchema.parse(req.body)
        const run = await service.recordOrchestrationApproval(runId, input, buildAuditContext(req))
        return reply.send(run)
    })

    // POST /netops/orchestration/runs/:runId/waive - Waive critical findings
    app.post<{ Params: { runId: string }; Body: OrchestrationWaiverInput }>('/orchestration/runs/:runId/waive', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Waive critical findings',
            description: 'Waive critical findings for an orchestration run (requires justification)',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            body: zodToJsonSchema(orchestrationWaiverSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const input = orchestrationWaiverSchema.parse(req.body)
        const run = await service.waiveOrchestrationFindings(runId, input.reason, buildAuditContext(req))
        return reply.send(run)
    })

    // POST /netops/orchestration/runs/:runId/deploy - Deploy orchestration run
    app.post<{ Params: { runId: string } }>('/orchestration/runs/:runId/deploy', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Deploy orchestration run',
            description: 'Deploy an approved orchestration run (L7)',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const run = await service.deployOrchestrationRun(runId, buildAuditContext(req))
        return reply.send(run)
    })

    // POST /netops/orchestration/runs/:runId/cancel - Cancel orchestration run
    app.post<{ Params: { runId: string }; Body: { reason?: string } }>('/orchestration/runs/:runId/cancel', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Cancel orchestration run',
            description: 'Cancel a pending or running orchestration run',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            body: {
                type: 'object',
                properties: {
                    reason: { type: 'string' }
                }
            },
            response: {
                200: { type: 'object' },
                400: zodToJsonSchema(errorResponseSchema),
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const run = await service.cancelOrchestrationRun(runId, req.body?.reason, buildAuditContext(req))
        return reply.send(run)
    })

    // GET /netops/orchestration/runs/:runId/nodes - Get orchestration nodes
    app.get<{ Params: { runId: string } }>('/orchestration/runs/:runId/nodes', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Get orchestration nodes',
            description: 'Get all nodes (steps) for an orchestration run',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } }
                    }
                }
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const nodes = await service.getOrchestrationNodes(runId)
        return reply.send({ data: nodes })
    })

    // GET /netops/orchestration/runs/:runId/context-pack - Get context pack
    app.get<{ Params: { runId: string } }>('/orchestration/runs/:runId/context-pack', {
        schema: {
            tags: ['NetOps Orchestration'],
            summary: 'Get context pack',
            description: 'Get the NetOpsContextPack for an orchestration run',
            params: zodToJsonSchema(orchestrationRunIdParamSchema),
            response: {
                200: { type: 'object' },
                404: zodToJsonSchema(errorResponseSchema)
            }
        }
    }, async (req, reply) => {
        const { runId } = orchestrationRunIdParamSchema.parse(req.params)
        const contextPack = await service.getOrchestrationContextPack(runId)
        if (!contextPack) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Context pack not found (run may not have reached L1)',
                statusCode: 404
            })
        }
        return reply.send(contextPack)
    })
}


