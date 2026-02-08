/**
 * Conversations Module
 * 
 * Manages chat conversations and messages.
 */
import { API_BASE, authJson, authJsonData } from '../../core/http-client'
import type { ApiResponse } from '../../core/types'

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
    id: string
    userId: string
    title: string | null
    createdAt: string
    updatedAt: string
}

export interface Message {
    id: string
    conversationId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: Record<string, unknown>
    createdAt: string
}

export interface CreateConversationRequest {
    title?: string
}

export interface CreateMessageRequest {
    role: 'user' | 'assistant'
    content: string
    metadata?: Record<string, unknown>
}

export interface ListConversationsResponse {
    data: Conversation[]
    meta: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface ListMessagesResponse {
    data: Message[]
}

// ============================================================================
// Conversations API
// ============================================================================

export async function listConversations(page = 1, limit = 20): Promise<ListConversationsResponse> {
    return authJson(`${API_BASE}/v1/conversations?page=${page}&limit=${limit}`)
}

export async function createConversation(data: CreateConversationRequest): Promise<Conversation> {
    return authJsonData(`${API_BASE}/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function getConversation(id: string): Promise<Conversation> {
    return authJsonData(`${API_BASE}/v1/conversations/${id}`)
}

export async function deleteConversation(id: string): Promise<void> {
    await authJson(`${API_BASE}/v1/conversations/${id}`, { method: 'DELETE' })
}

export async function updateConversation(id: string, data: Partial<CreateConversationRequest>): Promise<Conversation> {
    return authJsonData(`${API_BASE}/v1/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

// ============================================================================
// Messages API
// ============================================================================

export async function listMessages(conversationId: string, limit = 100): Promise<ListMessagesResponse> {
    return authJson(`${API_BASE}/v1/conversations/${conversationId}/messages?limit=${limit}`)
}

export async function sendMessage(conversationId: string, data: CreateMessageRequest): Promise<Message> {
    return authJsonData(`${API_BASE}/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await authJson(`${API_BASE}/v1/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE' })
}
