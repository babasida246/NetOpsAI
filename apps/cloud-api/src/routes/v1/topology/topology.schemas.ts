import { z } from 'zod'

export const topologyDiscoverSchema = z.object({
    seedDevices: z.array(z.string().min(1)).min(1),
    includeNmap: z.boolean().optional(),
    nmapTargets: z.array(z.string().min(1)).optional(),
    snmpTargets: z.array(z.string().min(1)).optional(),
    mode: z.enum(['fast', 'full']).optional(),
    site: z.string().optional(),
    zone: z.string().optional()
})

export const topologyGraphQuerySchema = z.object({
    site: z.string().optional(),
    zone: z.string().optional(),
    since: z.string().datetime().optional()
})

export const topologyNodeParamsSchema = z.object({
    id: z.string().uuid()
})

export const topologyEdgeParamsSchema = z.object({
    id: z.string().uuid()
})

export const topologyAuditQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    actor: z.string().optional()
})

export type TopologyDiscoverInput = z.infer<typeof topologyDiscoverSchema>
export type TopologyGraphQuery = z.infer<typeof topologyGraphQuerySchema>
export type TopologyAuditQuery = z.infer<typeof topologyAuditQuerySchema>
