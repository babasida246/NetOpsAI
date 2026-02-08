/**
 * Conversations Module Schemas
 */
import { z } from 'zod'
import { paginationQuerySchema } from '../../shared/schemas/common.js'

// Conversation status
export const conversationStatusSchema = z.enum(['active', 'archived', 'deleted'])
export type ConversationStatus = z.infer<typeof conversationStatusSchema>

// Conversation
export const conversationSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string(),
    model: z.string(),
    status: conversationStatusSchema,
    messageCount: z.number().int(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

export type Conversation = z.infer<typeof conversationSchema>

// Create conversation
export const createConversationSchema = z.object({
    title: z.string().min(1).max(200).optional().default('New Conversation'),
    model: z.string().optional().default('openai/gpt-4o-mini'),
    metadata: z.record(z.any()).optional()
})

export type CreateConversationRequest = z.infer<typeof createConversationSchema>

// Update conversation
export const updateConversationSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    status: conversationStatusSchema.optional(),
    metadata: z.record(z.any()).optional()
})

export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>

// Message
export const messageSchema = z.object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
    model: z.string().optional(),
    tokenCount: z.number().int().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime()
})

export type Message = z.infer<typeof messageSchema>

// Create message
export const createMessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
    model: z.string().optional(),
    metadata: z.record(z.any()).optional()
})

export type CreateMessageRequest = z.infer<typeof createMessageSchema>

// List conversations query
export const listConversationsQuerySchema = paginationQuerySchema.extend({
    status: conversationStatusSchema.optional(),
    search: z.string().optional()
})

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>

// List messages query
export const listMessagesQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().uuid().optional(),
    after: z.string().uuid().optional()
})

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
