// Temporary types for MCP handlers
export interface MCPRequest {
    id: string | number
    method: string
    params?: any
    jsonrpc?: string
}

export interface MCPResponse {
    id: string | number
    jsonrpc?: string
    result?: any
    error?: any
}

export interface ToolDefinition {
    name: string
    description: string
    inputSchema: any
}