import { Counter, Histogram, Gauge, register } from 'prom-client'

// SSE Streaming Metrics
export const sseConnectionsActive = new Gauge({
    name: 'sse_connections_active',
    help: 'Number of active SSE connections',
    registers: [register],
})

export const sseFirstTokenLatency = new Histogram({
    name: 'sse_first_token_latency',
    help: 'Time to first token in SSE streaming (seconds)',
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register],
})

export const sseStreamDuration = new Histogram({
    name: 'sse_stream_duration',
    help: 'Total duration of SSE streaming (seconds)',
    buckets: [1, 2, 5, 10, 30, 60, 120],
    registers: [register],
})

export const sseErrors = new Counter({
    name: 'sse_errors_total',
    help: 'Total number of SSE streaming errors',
    labelNames: ['error_code'],
    registers: [register],
})

// Summarization Metrics
export const summarizationRequests = new Counter({
    name: 'summarization_requests_total',
    help: 'Total number of summarization requests',
    labelNames: ['status'],
    registers: [register],
})

export const summarizationDuration = new Histogram({
    name: 'summarization_duration',
    help: 'Time to generate summary (seconds)',
    buckets: [0.5, 1, 2, 5, 10, 30],
    registers: [register],
})

export const summarizationQueueSize = new Gauge({
    name: 'summarization_queue_size',
    help: 'Number of summaries pending',
    registers: [register],
})

export const summarizationCacheHits = new Counter({
    name: 'summarization_cache_hits_total',
    help: 'Number of summary cache hits',
    registers: [register],
})

export const summarizationCacheMisses = new Counter({
    name: 'summarization_cache_misses_total',
    help: 'Number of summary cache misses',
    registers: [register],
})

// Token Usage Metrics
export const tokensUsed = new Counter({
    name: 'tokens_used_total',
    help: 'Total tokens consumed',
    labelNames: ['tier', 'type'], // type: prompt, completion
    registers: [register],
})

export const tokenCost = new Counter({
    name: 'token_cost_total',
    help: 'Total cost in USD',
    labelNames: ['tier'],
    registers: [register],
})

// Chat Request Metrics
export const chatRequests = new Counter({
    name: 'chat_requests_total',
    help: 'Total chat requests',
    labelNames: ['tier', 'importance', 'status'],
    registers: [register],
})

export const chatDuration = new Histogram({
    name: 'chat_duration',
    help: 'Chat request duration (seconds)',
    labelNames: ['tier'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [register],
})

// Conversation Metrics
export const conversationCreated = new Counter({
    name: 'conversation_created_total',
    help: 'Total conversations created',
    registers: [register],
})

export const conversationMessageCount = new Histogram({
    name: 'conversation_message_count',
    help: 'Number of messages per conversation',
    buckets: [1, 5, 10, 20, 50, 100, 200],
    registers: [register],
})

// MCP Tool Metrics
export const mcpToolCalls = new Counter({
    name: 'mcp_tool_calls_total',
    help: 'Total MCP tool calls',
    labelNames: ['tool', 'status'],
    registers: [register],
})

export const mcpToolDuration = new Histogram({
    name: 'mcp_tool_duration',
    help: 'MCP tool execution duration (seconds)',
    labelNames: ['tool'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
})

// Database Metrics
export const dbQueryDuration = new Histogram({
    name: 'db_query_duration',
    help: 'Database query duration (seconds)',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
})

export const dbConnectionPool = new Gauge({
    name: 'db_connection_pool',
    help: 'Database connection pool size',
    labelNames: ['state'], // idle, active
    registers: [register],
})

// Redis Cache Metrics
export const cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['cache_type'],
    registers: [register],
})

export const cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['cache_type'],
    registers: [register],
})

export const cacheOperationDuration = new Histogram({
    name: 'cache_operation_duration',
    help: 'Cache operation duration (seconds)',
    labelNames: ['operation'], // get, set, delete
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    registers: [register],
})

// HTTP Metrics
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register],
})

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration',
    help: 'HTTP request duration (seconds)',
    labelNames: ['method', 'path'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
})

// Rate Limiting Metrics
export const rateLimitExceeded = new Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total rate limit violations',
    labelNames: ['user_id', 'limit_type'],
    registers: [register],
})

// Helper functions
export function recordSseConnection(increment: 1 | -1) {
    sseConnectionsActive.inc(increment)
}

export function recordSseFirstToken(durationSeconds: number) {
    sseFirstTokenLatency.observe(durationSeconds)
}

export function recordSseStream(durationSeconds: number) {
    sseStreamDuration.observe(durationSeconds)
}

export function recordSseError(errorCode: string) {
    sseErrors.inc({ error_code: errorCode })
}

export function recordSummarization(status: 'success' | 'error', durationSeconds: number) {
    summarizationRequests.inc({ status })
    summarizationDuration.observe(durationSeconds)
}

export function recordTokenUsage(tier: string, promptTokens: number, completionTokens: number) {
    tokensUsed.inc({ tier, type: 'prompt' }, promptTokens)
    tokensUsed.inc({ tier, type: 'completion' }, completionTokens)
}

export function recordChatRequest(
    tier: string,
    importance: string,
    status: string,
    durationSeconds: number
) {
    chatRequests.inc({ tier, importance, status })
    chatDuration.observe({ tier }, durationSeconds)
}

export function recordMcpToolCall(tool: string, status: string, durationSeconds: number) {
    mcpToolCalls.inc({ tool, status })
    mcpToolDuration.observe({ tool }, durationSeconds)
}

export function recordDbQuery(operation: string, durationSeconds: number) {
    dbQueryDuration.observe({ operation }, durationSeconds)
}

export function recordCacheOperation(
    cacheType: string,
    operation: 'hit' | 'miss',
    durationSeconds?: number
) {
    if (operation === 'hit') {
        cacheHits.inc({ cache_type: cacheType })
    } else {
        cacheMisses.inc({ cache_type: cacheType })
    }

    if (durationSeconds !== undefined) {
        cacheOperationDuration.observe({ operation }, durationSeconds)
    }
}

export function getMetrics(): Promise<string> {
    return register.metrics()
}

export function clearMetrics() {
    register.clear()
}
