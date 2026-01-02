export interface MCPRequest {
    jsonrpc: '2.0'
    id: number | string
    method: string
    params?: any
}

export interface MCPResponse {
    jsonrpc: '2.0'
    id: number | string
    result?: any
    error?: {
        code: number
        message: string
        data?: any
    }
}

export interface ToolDefinition {
    name: string
    description: string
    inputSchema: {
        type: 'object'
        properties: Record<string, any>
        required?: string[]
    }
}
