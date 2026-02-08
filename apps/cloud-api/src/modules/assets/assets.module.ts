/**
 * Assets Module
 * 
 * Placeholder for assets functionality migration
 */
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../../core/app.js'

export function assetsModule(deps: AppDependencies) {
    return async function (fastify: FastifyInstance): Promise<void> {
        // TODO: Migrate from routes/v1/assets.* to this module
        // For now, register a placeholder

        fastify.get('/assets', {
            schema: {
                tags: ['Assets'],
                description: 'Placeholder - to be migrated'
            }
        }, async (request, reply) => {
            reply.send({
                message: 'Assets module - under migration',
                timestamp: new Date().toISOString()
            })
        })

        fastify.log.info('Assets module placeholder registered')
    }
}