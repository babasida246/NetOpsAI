/**
 * Conversations API Client
 */

const API_BASE = '/api'

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

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('authToken') || 'test-token'
}

/**
 * List all conversations
 */
export async function listConversations(page = 1, limit = 20): Promise<ListConversationsResponse> {
    const response = await fetch(`${API_BASE}/conversations?page=${page}&limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch conversations')
    }

    return response.json()
}

/**
 * Create a new conversation
 */
export async function createConversation(data: CreateConversationRequest): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error('Failed to create conversation')
    }

    return response.json()
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch conversation')
    }

    return response.json()
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to delete conversation')
    }
}

/**
 * List messages in a conversation
 */
export async function listMessages(conversationId: string, limit = 100): Promise<ListMessagesResponse> {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages?limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch messages')
    }

    return response.json()
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(conversationId: string, data: CreateMessageRequest): Promise<Message> {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        throw new Error('Failed to send message')
    }

    return response.json()
}
