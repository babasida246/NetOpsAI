/**
 * CMDB Module
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'

export function cmdbModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        // TODO: Migrate from routes/v1/cmdb.* to this module

        fastify.get('/cmdb', {
            schema: {
                tags: ['CMDB'],
                description: 'Placeholder - to be migrated'
            }
        }, async (request, reply) => {
            reply.send({
                message: 'CMDB module - under migration',
                timestamp: new Date().toISOString()
            })
        })

        fastify.log.info('CMDB module placeholder registered')
    }
}