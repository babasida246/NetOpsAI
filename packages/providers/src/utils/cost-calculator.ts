// Pricing as of Dec 2024 (adjust as needed)
export const MODEL_PRICING: Record<
    string,
    {
        input: number // USD per 1M tokens
        output: number // USD per 1M tokens
    }
> = {
    // T0 - Free models
    'mistralai/mistral-7b-instruct:free': { input: 0, output: 0 },
    'google/gemma-7b-it:free': { input: 0, output: 0 },

    // T1 - Basic paid models
    'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
    'openai/gpt-3.5-turbo': { input: 0.5, output: 1.5 },

    // T2 - Advanced models
    'anthropic/claude-3-sonnet': { input: 3, output: 15 },
    'openai/gpt-4-turbo': { input: 10, output: 30 },

    // T3 - Premium models
    'anthropic/claude-3-opus': { input: 15, output: 75 },
    'openai/gpt-4': { input: 30, output: 60 },
}

export interface CostEstimate {
    inputTokens: number
    outputTokens: number
    inputCost: number
    outputCost: number
    totalCost: number
    model: string
}

export function calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
): CostEstimate {
    const pricing = MODEL_PRICING[model] || { input: 0, output: 0 }

    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output
    const totalCost = inputCost + outputCost

    return {
        inputTokens,
        outputTokens,
        inputCost,
        outputCost,
        totalCost,
        model,
    }
}

export function estimateMaxCost(
    model: string,
    maxInputTokens: number,
    maxOutputTokens: number
): number {
    const estimate = calculateCost(model, maxInputTokens, maxOutputTokens)
    return estimate.totalCost
}

export function formatCost(cost: number): string {
    if (cost === 0) return 'Free'
    if (cost < 0.01) return '<$0.01'
    return `$${cost.toFixed(4)}`
}

export interface BudgetCheck {
    allowed: boolean
    estimatedCost: number
    budgetRemaining: number
    reason?: string
}

export function checkBudget(
    model: string,
    inputTokens: number,
    outputTokens: number,
    userBudget: number,
    usedBudget: number
): BudgetCheck {
    const estimate = calculateCost(model, inputTokens, outputTokens)
    const budgetRemaining = userBudget - usedBudget

    if (estimate.totalCost === 0) {
        return {
            allowed: true,
            estimatedCost: 0,
            budgetRemaining,
        }
    }

    if (estimate.totalCost > budgetRemaining) {
        return {
            allowed: false,
            estimatedCost: estimate.totalCost,
            budgetRemaining,
            reason: `Estimated cost ($${estimate.totalCost.toFixed(4)}) exceeds remaining budget ($${budgetRemaining.toFixed(4)})`,
        }
    }

    return {
        allowed: true,
        estimatedCost: estimate.totalCost,
        budgetRemaining: budgetRemaining - estimate.totalCost,
    }
}
