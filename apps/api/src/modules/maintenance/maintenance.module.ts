/**
 * Maintenance Module
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'

export function maintenanceModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        // TODO: Migrate from routes/v1/maintenance.* to this module

        fastify.get('/maintenance', {
            schema: {
                tags: ['Maintenance'],
                description: 'Placeholder - to be migrated'
            }
        }, async (request, reply) => {
            reply.send({
                message: 'Maintenance module - under migration',
                timestamp: new Date().toISOString()
            })
        })

        fastify.log.info('Maintenance module placeholder registered')
    }
}