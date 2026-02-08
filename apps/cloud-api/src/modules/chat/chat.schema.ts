/**
 * Chat Module Schemas
 */
import { z } from 'zod'

// Message role
export const messageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool'])
export type MessageRole = z.infer<typeof messageRoleSchema>

// Chat message
export const chatMessageSchema = z.object({
    role: messageRoleSchema,
    content: z.string(),
    name: z.string().optional(),
    toolCallId: z.string().optional()
})

export type ChatMessage = z.infer<typeof chatMessageSchema>

// Tool call
export const toolCallSchema = z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
        name: z.string(),
        arguments: z.string()
    })
})

export type ToolCall = z.infer<typeof toolCallSchema>

// Chat completion request (OpenAI compatible)
export const chatCompletionRequestSchema = z.object({
    model: z.string().default('openai/gpt-4o-mini'),
    messages: z.array(chatMessageSchema).min(1),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    stream: z.boolean().default(false),
    stop: z.array(z.string()).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    tools: z.array(z.object({
        type: z.literal('function'),
        function: z.object({
            name: z.string(),
            description: z.string().optional(),
            parameters: z.record(z.any()).optional()
        })
    })).optional(),
    toolChoice: z.union([
        z.literal('none'),
        z.literal('auto'),
        z.object({
            type: z.literal('function'),
            function: z.object({ name: z.string() })
        })
    ]).optional(),
    conversationId: z.string().uuid().optional()
})

export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>

// Chat completion response
export const chatCompletionChoiceSchema = z.object({
    index: z.number(),
    message: z.object({
        role: z.literal('assistant'),
        content: z.string().nullable(),
        toolCalls: z.array(toolCallSchema).optional()
    }),
    finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).nullable()
})

export const chatCompletionUsageSchema = z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
})

export const chatCompletionResponseSchema = z.object({
    id: z.string(),
    object: z.literal('chat.completion'),
    created: z.number(),
    model: z.string(),
    choices: z.array(chatCompletionChoiceSchema),
    usage: chatCompletionUsageSchema
})

export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>

// Streaming chunk
export const chatCompletionChunkSchema = z.object({
    id: z.string(),
    object: z.literal('chat.completion.chunk'),
    created: z.number(),
    model: z.string(),
    choices: z.array(z.object({
        index: z.number(),
        delta: z.object({
            role: z.literal('assistant').optional(),
            content: z.string().optional(),
            toolCalls: z.array(z.object({
                index: z.number(),
                id: z.string().optional(),
                type: z.literal('function').optional(),
                function: z.object({
                    name: z.string().optional(),
                    arguments: z.string().optional()
                }).optional()
            })).optional()
        }),
        finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).nullable()
    }))
})

export type ChatCompletionChunk = z.infer<typeof chatCompletionChunkSchema>

// Model info
export const modelInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    contextLength: z.number(),
    pricing: z.object({
        prompt: z.number(),
        completion: z.number()
    }).optional(),
    capabilities: z.array(z.string()).optional()
})

export type ModelInfo = z.infer<typeof modelInfoSchema>
