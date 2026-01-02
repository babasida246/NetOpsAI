/**
 * Integrated Chat API Client
 * Provides methods for chat, stats, models, and orchestration management
 */

const API_BASE = '/api'

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatSendRequest {
    message: string
    conversationId?: string
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
}

export interface ChatSendResponse {
    message: string
    conversationId: string
    model: string
    provider: string
    usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
        estimatedCost: number
    }
    latencyMs: number
}

export interface TokenUsageStats {
    conversationId: string
    model: string
    provider: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
    messageCount: number
    date: string
}

export interface UserTokenStats {
    userId: string
    date: string
    model: string
    provider: string
    totalTokens: number
    totalCost: number
    messageCount: number
    conversationCount: number
}

export interface DailySummary {
    totalTokens: number
    totalCost: number
    totalMessages: number
    modelsUsed: number
}

export interface ModelConfig {
    id: string
    provider: string
    tier: number
    contextWindow?: number
    maxTokens?: number
    costPer1kInput?: number
    costPer1kOutput?: number
    capabilities: Record<string, any>
    enabled: boolean
    supportsStreaming: boolean
    supportsFunctions: boolean
    supportsVision: boolean
    description?: string
    priority: number
    status: 'active' | 'inactive' | 'deprecated'
    createdAt: string
}

export interface AIProvider {
    id: string
    name: string
    description?: string
    apiEndpoint?: string
    authType?: string
    capabilities: Record<string, any>
    status: 'active' | 'inactive' | 'maintenance'
    rateLimitPerMinute?: number
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
}

export interface OrchestrationRule {
    id: string
    name: string
    description?: string
    strategy: 'fallback' | 'load_balance' | 'cost_optimize' | 'quality_first' | 'custom'
    modelSequence: string[]
    conditions: Record<string, any>
    enabled: boolean
    priority: number
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
}

export interface ModelPerformance {
    model: string
    provider: string
    date: string
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    avgLatencyMs: number
    avgTokensPerRequest: number
    totalCost: number
    qualityScore?: number
}

// ============================================================================
// UTILITY
// ============================================================================

function getAuthToken(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('authToken') || 'test-token'
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
            ...options?.headers
        }
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
}

// ============================================================================
// CHAT API
// ============================================================================

/**
 * Send a chat message
 */
export async function sendChatMessage(data: ChatSendRequest): Promise<ChatSendResponse> {
    return apiCall('/chat/send', {
        method: 'POST',
        body: JSON.stringify(data)
    })
}

/**
 * Advanced chat completion
 */
export async function chatCompletion(
    messages: ChatMessage[],
    options?: {
        model?: string
        temperature?: number
        maxTokens?: number
        conversationId?: string
    }
): Promise<any> {
    return apiCall('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
            messages,
            model: options?.model || 'openai/gpt-4o-mini',
            temperature: options?.temperature ?? 0.7,
            maxTokens: options?.maxTokens,
            conversationId: options?.conversationId
        })
    })
}

// ============================================================================
// STATS API
// ============================================================================

/**
 * Get conversation token usage statistics
 */
export async function getConversationStats(conversationId: string): Promise<{ data: TokenUsageStats[] }> {
    return apiCall(`/chat/stats/conversation/${conversationId}`)
}

/**
 * Get user token usage statistics
 */
export async function getUserStats(filters?: {
    startDate?: string
    endDate?: string
}): Promise<{ data: UserTokenStats[] }> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)

    const query = params.toString()
    return apiCall(`/chat/stats/user${query ? '?' + query : ''}`)
}

/**
 * Get daily usage summary
 */
export async function getDailySummary(): Promise<DailySummary> {
    return apiCall('/chat/stats/daily')
}

// ============================================================================
// MODELS API
// ============================================================================

/**
 * List available models
 */
export async function listModels(filters?: {
    provider?: string
    tier?: number
    enabled?: boolean
}): Promise<{ data: ModelConfig[] }> {
    const params = new URLSearchParams()
    if (filters?.provider) params.append('provider', filters.provider)
    if (filters?.tier !== undefined) params.append('tier', filters.tier.toString())
    if (filters?.enabled !== undefined) params.append('enabled', filters.enabled.toString())

    const query = params.toString()
    return apiCall(`/chat/models${query ? '?' + query : ''}`)
}

/**
 * Get model details
 */
export async function getModel(modelId: string): Promise<ModelConfig> {
    return apiCall(`/chat/models/${modelId}`)
}

/**
 * Update model priority
 */
export async function updateModelPriority(modelId: string, priority: number): Promise<{ message: string }> {
    return apiCall(`/chat/models/${modelId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority })
    })
}

/**
 * Get model performance metrics
 */
export async function getModelPerformance(modelId: string, days = 7): Promise<{ data: ModelPerformance[] }> {
    return apiCall(`/chat/models/${modelId}/performance?days=${days}`)
}

// ============================================================================
// PROVIDERS API
// ============================================================================

/**
 * List AI providers
 */
export async function listProviders(): Promise<{ data: AIProvider[] }> {
    return apiCall('/chat/providers')
}

// ============================================================================
// ORCHESTRATION API
// ============================================================================

/**
 * List orchestration rules
 */
export async function listOrchestrationRules(enabledOnly = false): Promise<{ data: OrchestrationRule[] }> {
    return apiCall(`/chat/orchestration?enabledOnly=${enabledOnly}`)
}

/**
 * Create orchestration rule
 */
export async function createOrchestrationRule(data: {
    name: string
    description?: string
    strategy: OrchestrationRule['strategy']
    modelSequence: string[]
    conditions?: Record<string, any>
    enabled?: boolean
    priority?: number
}): Promise<OrchestrationRule> {
    return apiCall('/chat/orchestration', {
        method: 'POST',
        body: JSON.stringify(data)
    })
}

/**
 * Update orchestration rule
 */
export async function updateOrchestrationRule(
    ruleId: string,
    data: Partial<Omit<OrchestrationRule, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ message: string }> {
    return apiCall(`/chat/orchestration/${ruleId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
}

/**
 * Delete orchestration rule
 */
export async function deleteOrchestrationRule(ruleId: string): Promise<{ message: string }> {
    return apiCall(`/chat/orchestration/${ruleId}`, {
        method: 'DELETE'
    })
}
