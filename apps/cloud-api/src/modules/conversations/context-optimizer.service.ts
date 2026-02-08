/**
 * Context Optimization Service
 * Handles conversation summarization and context compression
 */
import type { ConversationMessage, ConversationMemoryService } from './memory.service.js'

export interface SummaryResult {
    summary: string
    keyPoints: string[]
    tokensReduced: number
    originalTokens: number
    compressedTokens: number
}

export interface ContextOptimizationConfig {
    summarizationThreshold: number  // Token count to trigger summarization
    summaryMaxTokens: number        // Max tokens for summary
    preserveRecentMessages: number  // Number of recent messages to keep
    systemPromptForSummary: string  // System prompt for summarization
}

const DEFAULT_CONFIG: ContextOptimizationConfig = {
    summarizationThreshold: 4000,
    summaryMaxTokens: 500,
    preserveRecentMessages: 10,
    systemPromptForSummary: `You are a conversation summarizer. Create a concise summary of the conversation that captures:
1. Main topics discussed
2. Key decisions or conclusions
3. Important context for continuing the conversation
4. Any unresolved questions or action items

Format: Brief narrative summary followed by bullet points of key information.
Be concise but preserve essential context for continuing the conversation.`
}

interface LLMChatFunction {
    (messages: Array<{ role: string; content: string }>, options?: { maxTokens?: number; temperature?: number }): Promise<string>
}

export class ContextOptimizationService {
    private config: ContextOptimizationConfig

    constructor(
        private memoryService: ConversationMemoryService,
        private llmChat: LLMChatFunction,
        config: Partial<ContextOptimizationConfig> = {}
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Check if conversation needs summarization
     */
    needsSummarization(messages: ConversationMessage[], existingSummary?: string): boolean {
        const totalTokens = messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)

        // If we already have a summary, threshold is lower
        const threshold = existingSummary
            ? this.config.summarizationThreshold * 0.75
            : this.config.summarizationThreshold

        return totalTokens > threshold
    }

    /**
     * Generate a summary of the conversation
     */
    async generateSummary(
        conversationId: string,
        userId: string,
        messages: ConversationMessage[]
    ): Promise<SummaryResult> {
        const originalTokens = messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)

        // Keep recent messages, summarize older ones
        const recentMessages = messages.slice(-this.config.preserveRecentMessages)
        const messagesToSummarize = messages.slice(0, -this.config.preserveRecentMessages)

        if (messagesToSummarize.length === 0) {
            return {
                summary: '',
                keyPoints: [],
                tokensReduced: 0,
                originalTokens,
                compressedTokens: originalTokens
            }
        }

        // Format messages for summarization
        const formattedMessages = this.formatMessagesForSummary(messagesToSummarize)

        // Call LLM for summarization
        const summaryPrompt = [
            { role: 'system', content: this.config.systemPromptForSummary },
            { role: 'user', content: `Please summarize this conversation:\n\n${formattedMessages}` }
        ]

        const summary = await this.llmChat(summaryPrompt, {
            maxTokens: this.config.summaryMaxTokens,
            temperature: 0.3
        })

        // Extract key points from summary
        const keyPoints = this.extractKeyPoints(summary)

        // Calculate token savings
        const summaryTokens = this.estimateTokens(summary)
        const summarizedMessagesTokens = messagesToSummarize.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
        const recentMessagesTokens = recentMessages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
        const compressedTokens = summaryTokens + recentMessagesTokens

        // Save summary to memory service
        await this.memoryService.saveSummary(conversationId, userId, summary)

        return {
            summary,
            keyPoints,
            tokensReduced: summarizedMessagesTokens - summaryTokens,
            originalTokens,
            compressedTokens
        }
    }

    /**
     * Get optimized context for LLM
     * Returns messages with summary prepended if needed
     */
    async getOptimizedContext(
        conversationId: string,
        userId: string,
        maxTokens?: number
    ): Promise<{
        messages: Array<{ role: string; content: string }>
        summary?: string
        optimizationApplied: boolean
        stats: {
            originalTokens: number
            finalTokens: number
            reduction: number
        }
    }> {
        const contextResult = await this.memoryService.getMessagesForContext(
            conversationId,
            userId,
            maxTokens
        )

        const { messages, summary, truncated, totalTokens } = contextResult

        // Convert to LLM format
        const llmMessages: Array<{ role: string; content: string }> = []

        // If we have a summary and messages were truncated, prepend it as context
        if (summary && truncated) {
            llmMessages.push({
                role: 'system',
                content: `Previous conversation summary:\n${summary}\n\n---\nContinuing the conversation:`
            })
        }

        // Add messages
        for (const msg of messages) {
            llmMessages.push({
                role: msg.role,
                content: msg.content
            })
        }

        // Calculate stats
        const originalTokens = messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
        const summaryTokens = summary ? this.estimateTokens(summary) : 0
        const finalTokens = originalTokens + summaryTokens

        return {
            messages: llmMessages,
            summary,
            optimizationApplied: truncated,
            stats: {
                originalTokens: totalTokens,
                finalTokens,
                reduction: truncated ? totalTokens - finalTokens : 0
            }
        }
    }

    /**
     * Auto-optimize context if needed
     * Generates summary automatically when threshold is reached
     */
    async autoOptimize(
        conversationId: string,
        userId: string
    ): Promise<{ optimized: boolean; summary?: SummaryResult }> {
        const context = await this.memoryService.getContext(conversationId, userId)
        if (!context) {
            return { optimized: false }
        }

        if (!this.needsSummarization(context.messages, context.summary)) {
            return { optimized: false }
        }

        const summary = await this.generateSummary(
            conversationId,
            userId,
            context.messages
        )

        return {
            optimized: true,
            summary
        }
    }

    /**
     * Create a rolling summary that updates incrementally
     */
    async updateRollingSummary(
        conversationId: string,
        userId: string,
        existingSummary: string,
        newMessages: ConversationMessage[]
    ): Promise<string> {
        if (newMessages.length === 0) {
            return existingSummary
        }

        const formattedNewMessages = this.formatMessagesForSummary(newMessages)

        const updatePrompt = [
            {
                role: 'system',
                content: `You are updating a conversation summary. Incorporate the new messages while keeping the summary concise and focused on the most important information.`
            },
            {
                role: 'user',
                content: `Existing summary:\n${existingSummary}\n\nNew messages to incorporate:\n${formattedNewMessages}\n\nProvide an updated summary:`
            }
        ]

        const updatedSummary = await this.llmChat(updatePrompt, {
            maxTokens: this.config.summaryMaxTokens,
            temperature: 0.3
        })

        // Save updated summary
        await this.memoryService.saveSummary(conversationId, userId, updatedSummary)

        return updatedSummary
    }

    // ==================== Private Methods ====================

    private formatMessagesForSummary(messages: ConversationMessage[]): string {
        return messages.map(m => {
            const roleLabel = m.role.charAt(0).toUpperCase() + m.role.slice(1)
            let content = m.content

            // Truncate very long messages for summarization
            if (content.length > 1000) {
                content = content.substring(0, 1000) + '...[truncated]'
            }

            return `${roleLabel}: ${content}`
        }).join('\n\n')
    }

    private extractKeyPoints(summary: string): string[] {
        const keyPoints: string[] = []

        // Extract bullet points
        const bulletMatches = summary.match(/[-•*]\s*(.+)/g)
        if (bulletMatches) {
            for (const match of bulletMatches) {
                const point = match.replace(/^[-•*]\s*/, '').trim()
                if (point.length > 5) {
                    keyPoints.push(point)
                }
            }
        }

        // If no bullets, try to extract sentences
        if (keyPoints.length === 0) {
            const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20)
            keyPoints.push(...sentences.slice(0, 5).map(s => s.trim()))
        }

        return keyPoints.slice(0, 10) // Max 10 key points
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }
}
