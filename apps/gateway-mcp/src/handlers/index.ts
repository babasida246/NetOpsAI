import type { MCPRequest, MCPResponse, ToolDefinition } from './types.js'
import { createMessage } from '@domain/core'
import type { ChatOrchestrator } from '@application/core'

export class MCPHandler {
    constructor(private orchestrator: ChatOrchestrator) { }

    async handle(request: MCPRequest): Promise<MCPResponse> {
        try {
            switch (request.method) {
                case 'tools/list':
                    return this.listTools(request)

                case 'tools/call':
                    return await this.callTool(request)

                case 'chat':
                    return await this.chat(request)

                default:
                    return {
                        jsonrpc: '2.0',
                        id: request.id,
                        error: {
                            code: -32601,
                            message: `Method not found: ${request.method}`
                        }
                    }
            }
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: -32603,
                    message: error.message || 'Internal error',
                    data: error.stack
                }
            }
        }
    }

    private listTools(request: MCPRequest): MCPResponse {
        const tools: ToolDefinition[] = [
            {
                name: 'chat',
                description: 'Send a chat message and get AI response',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'The message to send'
                        },
                        importance: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                            description: 'Importance level'
                        }
                    },
                    required: ['message']
                }
            }
        ]

        return {
            jsonrpc: '2.0',
            id: request.id,
            result: { tools }
        }
    }

    private async callTool(request: MCPRequest): Promise<MCPResponse> {
        const { name, arguments: args } = request.params

        if (name !== 'chat') {
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: -32602,
                    message: `Unknown tool: ${name}`
                }
            }
        }

        return await this.chat({
            ...request,
            params: args
        })
    }

    private async chat(request: MCPRequest): Promise<MCPResponse> {
        const { message, importance = 'medium' } = request.params

        const chatRequest = {
            messages: [
                createMessage({
                    role: 'user' as const,
                    content: message
                })
            ],
            metadata: {
                userId: 'mcp-user',
                correlationId: `mcp-${request.id}`,
                importance: importance as any,
                timestamp: new Date()
            }
        }

        const response = await this.orchestrator.execute(chatRequest)

        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                content: response.content,
                usage: response.usage,
                metadata: response.metadata
            }
        }
    }
}
