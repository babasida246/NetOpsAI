// Simple token counter based on GPT tokenizer rules
// For production, use a proper tokenizer library like 'gpt-tokenizer'

const AVG_CHARS_PER_TOKEN = 4
const MESSAGE_OVERHEAD = 4 // Base tokens per message

export function countTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / AVG_CHARS_PER_TOKEN)
}

export function estimateMessageTokens(message: {
    role: string
    content: string
}): number {
    return MESSAGE_OVERHEAD + countTokens(message.content)
}

export function fitMessagesInBudget(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    systemPrompt?: string
): Array<{ role: string; content: string }> {
    let budget = maxTokens

    // Reserve for system prompt
    if (systemPrompt) {
        budget -= countTokens(systemPrompt) + MESSAGE_OVERHEAD
    }

    // Take messages from end (most recent first)
    const result: typeof messages = []

    for (let i = messages.length - 1; i >= 0 && budget > 0; i--) {
        const tokens = estimateMessageTokens(messages[i])
        if (tokens <= budget) {
            result.unshift(messages[i])
            budget -= tokens
        } else {
            break
        }
    }

    return result
}

export function calculateTotalTokens(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
}

export interface TokenBudget {
    max: number
    used: number
    remaining: number
    percentage: number
}

export function getTokenBudget(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
): TokenBudget {
    const used = calculateTotalTokens(messages)
    const remaining = Math.max(0, maxTokens - used)
    const percentage = (used / maxTokens) * 100

    return {
        max: maxTokens,
        used,
        remaining,
        percentage,
    }
}
