import type { ToolDefinition } from '../ToolRegistry.js'

export const echoTool: ToolDefinition = {
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'Message to echo'
            }
        },
        required: ['message']
    },
    async execute(args: { message: string }) {
        return {
            echoed: args.message,
            timestamp: new Date().toISOString()
        }
    },
    strategy: 'retry',
    timeout: 1000
}
