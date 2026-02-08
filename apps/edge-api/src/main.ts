import { buildApp } from './app.js'
import { env } from './config/env.js'

async function start(): Promise<void> {
    const app = await buildApp()
    await app.listen({ port: env.EDGE_PORT, host: env.EDGE_BIND_HOST })
    app.log.info(`Edge API listening on ${env.EDGE_BIND_HOST}:${env.EDGE_PORT}`)
}

start().catch((error) => {
    console.error('Edge API failed to start:', error)
    process.exit(1)
})
