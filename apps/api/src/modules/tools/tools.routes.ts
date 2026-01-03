import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { generateConfigCommand, type Vendor } from '@tools/registry'
import { UnauthorizedError } from '../../shared/errors/http-errors.js'
import type { AuthService } from '../auth/auth.service.js'

const generateSchema = z.object({
    vendor: z.enum(['cisco', 'fortigate', 'mikrotik'] satisfies Vendor[]),
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

export async function toolsRoutes(fastify: FastifyInstance, authService: AuthService) {
    const authenticate = async (request: any) => {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header')
        }
        const token = authHeader.substring(7)
        request.user = authService.verifyAccessToken(token)
    }

    fastify.post('/tools/generate-config', {
        schema: {
            tags: ['Tools'],
            summary: 'Generate network config commands',
            security: [{ bearerAuth: [] }],
            body: zodToJsonSchema(generateSchema)
        },
        preHandler: authenticate
    }, async (request, reply) => {
        const body = generateSchema.parse(request.body)
        const command = generateConfigCommand({
            vendor: body.vendor,
            action: body.action,
            params: body.params
        })
        return reply.status(200).send({ command })
    })
}
