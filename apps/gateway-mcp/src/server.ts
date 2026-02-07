import { createInterface } from 'readline'
import { createMCPContainer, closeMCPContainer } from './container.js'
import { MCPHandler } from './handlers/index.js'
import type { MCPRequest } from './types.js'

async function main() {
    const container = await createMCPContainer()
    const handler = new MCPHandler(container.chatOrchestrator)

    container.logger.info('MCP server started (stdio)')

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    })

    rl.on('line', async (line) => {
        try {
            const request: MCPRequest = JSON.parse(line)
            const response = await handler.handle(request)
            console.log(JSON.stringify(response))
        } catch (error) {
            console.error(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: 'Parse error'
                }
            }))
        }
    })

    const shutdown = async () => {
        rl.close()
        await closeMCPContainer(container)
        process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
})
