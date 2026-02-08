/**
 * Chat Module
 * 
 * AI chat operations, model management, and orchestration.
 */
import { API_BASE, authJson, authJsonData } from '../../core/http-client'
import type { ApiResponse } from '../../core/types'

// ============================================================================
// Types
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
    displayName?: string
    provider: string
    tier: number
    contextWindow?: number
    maxTokens?: number
    costPer1kInput?: number
    costPer1kOutput?: number
    capabilities: Record<string, unknown>
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
    apiKey?: string
    authType?: string
    capabilities: Record<string, unknown>
    status: 'active' | 'inactive' | 'maintenance'
    rateLimitPerMinute?: number
    creditsRemaining?: number
    tokensUsed?: number
    lastUsageAt?: string
    metadata?: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export interface OrchestrationRule {
    id: string
    name: string
    description?: string
    strategy: 'fallback' | 'load_balance' | 'cost_optimize' | 'quality_first' | 'custom'
    modelSequence: string[]
    conditions: Record<string, unknown>
    enabled: boolean
    priority: number
    metadata?: Record<string, unknown>
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

export interface UsageHistoryEntry {
    date: string
    totalTokens: number
    totalCost: number
    creditsUsed?: number
    messageCount?: number
}

export interface UsageLogEntry {
    conversationId: string
    model: string
    provider: string
    totalTokens: number
    cost: number
    messageCount: number
    date: string
}

export interface ProviderHealth {
    status: 'healthy' | 'degraded' | 'unreachable'
    statusCode: number
    latencyMs: number | null
    message?: string
}

export interface RemoteOpenRouterModel {
    id: string
    name: string
    description?: string
    pricing?: Record<string, unknown>
    contextLength?: number
    provider: string
}

// ============================================================================
// Chat API
// ============================================================================

export async function sendChatMessage(data: ChatSendRequest): Promise<ChatSendResponse> {
    return authJsonData(`${API_BASE}/v1/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function chatCompletion(
    messages: ChatMessage[],
    options?: {
        model?: string
        temperature?: number
        maxTokens?: number
        conversationId?: string
    }
): Promise<ChatSendResponse> {
    return authJsonData(`${API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, ...options })
    })
}

// ============================================================================
// Model Configs API
// ============================================================================

export async function listModelConfigs(): Promise<ApiResponse<ModelConfig[]>> {
    return authJson(`${API_BASE}/v1/chat/models`)
}

export async function getModelConfig(id: string): Promise<ModelConfig> {
    return authJsonData(`${API_BASE}/v1/chat/models/${id}`)
}

export async function createModelConfig(data: Omit<ModelConfig, 'id' | 'createdAt'>): Promise<ModelConfig> {
    return authJsonData(`${API_BASE}/v1/chat/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateModelConfig(id: string, data: Partial<ModelConfig>): Promise<ModelConfig> {
    return authJsonData(`${API_BASE}/v1/chat/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteModelConfig(id: string): Promise<void> {
    await authJson(`${API_BASE}/v1/chat/models/${id}`, { method: 'DELETE' })
}

// ============================================================================
// AI Providers API
// ============================================================================

export async function listAIProviders(): Promise<ApiResponse<AIProvider[]>> {
    return authJson(`${API_BASE}/v1/chat/providers`)
}

export async function getAIProvider(id: string): Promise<AIProvider> {
    return authJsonData(`${API_BASE}/v1/chat/providers/${id}`)
}

export async function createAIProvider(data: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider> {
    return authJsonData(`${API_BASE}/v1/chat/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateAIProvider(id: string, data: Partial<AIProvider>): Promise<AIProvider> {
    return authJsonData(`${API_BASE}/v1/chat/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteAIProvider(id: string): Promise<void> {
    await authJson(`${API_BASE}/v1/chat/providers/${id}`, { method: 'DELETE' })
}

export async function testProviderHealth(id: string): Promise<ProviderHealth> {
    return authJsonData(`${API_BASE}/v1/chat/providers/${id}/health`)
}

// ============================================================================
// Orchestration Rules API
// ============================================================================

export async function listOrchestrationRules(): Promise<ApiResponse<OrchestrationRule[]>> {
    return authJson(`${API_BASE}/v1/chat/orchestration`)
}

export async function getOrchestrationRule(id: string): Promise<OrchestrationRule> {
    return authJsonData(`${API_BASE}/v1/chat/orchestration/${id}`)
}

export async function createOrchestrationRule(data: Omit<OrchestrationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrchestrationRule> {
    return authJsonData(`${API_BASE}/v1/chat/orchestration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function updateOrchestrationRule(id: string, data: Partial<OrchestrationRule>): Promise<OrchestrationRule> {
    return authJsonData(`${API_BASE}/v1/chat/orchestration/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteOrchestrationRule(id: string): Promise<void> {
    await authJson(`${API_BASE}/v1/chat/orchestration/${id}`, { method: 'DELETE' })
}

// ============================================================================
// Usage & Statistics API
// ============================================================================

export async function getUserTokenStats(userId?: string, startDate?: string, endDate?: string): Promise<UserTokenStats[]> {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return authJsonData(`${API_BASE}/v1/chat/stats/user${query ? `?${query}` : ''}`)
}

export async function getDailySummary(date?: string): Promise<DailySummary> {
    const query = date ? `?date=${date}` : ''
    return authJsonData(`${API_BASE}/v1/chat/stats/daily${query}`)
}

export async function getModelPerformance(model?: string, startDate?: string, endDate?: string): Promise<ModelPerformance[]> {
    const params = new URLSearchParams()
    if (model) params.append('model', model)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const query = params.toString()
    return authJsonData(`${API_BASE}/v1/chat/stats/performance${query ? `?${query}` : ''}`)
}

export async function getUsageHistory(days?: number): Promise<UsageHistoryEntry[]> {
    const query = days ? `?days=${days}` : ''
    return authJsonData(`${API_BASE}/v1/chat/stats/history${query}`)
}

export async function getUsageLogs(params?: { page?: number; limit?: number }): Promise<ApiResponse<UsageLogEntry[]>> {
    const search = new URLSearchParams()
    if (params?.page) search.append('page', params.page.toString())
    if (params?.limit) search.append('limit', params.limit.toString())
    const query = search.toString()
    return authJson(`${API_BASE}/v1/chat/stats/logs${query ? `?${query}` : ''}`)
}

// ============================================================================
// External Models API (OpenRouter)
// ============================================================================

export async function listRemoteModels(): Promise<RemoteOpenRouterModel[]> {
    return authJsonData(`${API_BASE}/v1/chat/remote-models`)
}

export async function syncRemoteModels(): Promise<{ synced: number; added: number; updated: number }> {
    return authJsonData(`${API_BASE}/v1/chat/remote-models/sync`, { method: 'POST' })
}
