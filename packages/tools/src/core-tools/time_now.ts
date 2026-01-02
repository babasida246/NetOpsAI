import type { ToolDefinition } from '../ToolRegistry.js'

export const timeNowTool: ToolDefinition = {
    name: 'time_now',
    description: 'Get current server time',
    inputSchema: {
        type: 'object',
        properties: {
            timezone: {
                type: 'string',
                description: 'Timezone (e.g., Asia/Ho_Chi_Minh)',
                default: 'UTC'
            }
        }
    },
    async execute(args: { timezone?: string }) {
        const now = new Date()

        return {
            utc: now.toISOString(),
            unix: Math.floor(now.getTime() / 1000),
            timezone: args.timezone || 'UTC',
            formatted: now.toLocaleString('en-US', {
                timeZone: args.timezone || 'UTC'
            })
        }
    },
    strategy: 'retry',
    timeout: 1000
}
