import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { edgeRoutes } from './routes/edge.routes.js'

export async function buildApp() {
    const app = Fastify({
        logger: { level: 'info' }
    })

    await app.register(helmet, { contentSecurityPolicy: false })

    app.get('/health', async () => ({ status: 'ok' }))

    await edgeRoutes(app)

    return app
}
