import AjvModule from 'ajv'
import addFormatsModule from 'ajv-formats'
import { AppError } from '@domain/core'
import type { JSONSchema, ToolDefinition as ContractToolDef } from '@contracts/shared'

// Handle both ESM and CJS imports
const Ajv = (AjvModule as any).default || AjvModule
const addFormats = (addFormatsModule as any).default || addFormatsModule

export interface ToolDefinition extends ContractToolDef {
    execute: (args: any, context: ToolContext) => Promise<any>
    strategy?: 'retry' | 'fail-fast' | 'best-effort'
    timeout?: number
    requiresAuth?: boolean
    requiredRole?: string
}

export interface ToolContext {
    userId: string
    correlationId: string
    logger?: any
}

export interface ToolResult {
    success: boolean
    output?: any
    error?: string
    duration: number
}

export class ToolRegistry {
    private tools = new Map<string, ToolDefinition>()
    private ajv: any
    private executionLog: Array<{
        tool: string
        userId: string
        timestamp: Date
        success: boolean
    }> = []

    constructor() {
        this.ajv = new Ajv({ allErrors: true })
        addFormats(this.ajv)
    }

    register(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool ${tool.name} already registered`)
        }

        // Compile schema for validation
        this.ajv.compile(tool.inputSchema)

        this.tools.set(tool.name, tool)
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name)
    }

    list(): ContractToolDef[] {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
        }))
    }

    async invoke(
        name: string,
        args: any,
        context: ToolContext
    ): Promise<ToolResult> {
        const tool = this.tools.get(name)
        if (!tool) {
            throw AppError.notFound(`Tool not found: ${name}`)
        }

        // Validate input
        const validate = this.ajv.compile(tool.inputSchema)
        if (!validate(args)) {
            throw AppError.badRequest('Invalid tool arguments', {
                errors: validate.errors
            })
        }

        // Check auth
        if (tool.requiresAuth && !context.userId) {
            throw AppError.unauthorized('Authentication required')
        }

        const start = Date.now()

        try {
            // Execute with timeout
            const timeout = tool.timeout || 30000
            const output = await this.executeWithTimeout(
                tool.execute(args, context),
                timeout
            )

            const duration = Date.now() - start

            // Log execution
            this.logExecution(name, context.userId, true)

            return {
                success: true,
                output,
                duration
            }
        } catch (error: any) {
            const duration = Date.now() - start

            // Log failure
            this.logExecution(name, context.userId, false)

            // Handle based on strategy
            if (tool.strategy === 'best-effort') {
                return {
                    success: false,
                    error: error.message,
                    duration
                }
            }

            throw error
        }
    }

    private async executeWithTimeout<T>(
        promise: Promise<T>,
        timeout: number
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
            )
        ])
    }

    private logExecution(tool: string, userId: string, success: boolean): void {
        this.executionLog.push({
            tool,
            userId,
            timestamp: new Date(),
            success
        })

        // Keep only last 1000 entries
        if (this.executionLog.length > 1000) {
            this.executionLog.shift()
        }
    }

    getExecutionStats(): Record<string, any> {
        const stats: Record<string, any> = {}

        for (const log of this.executionLog) {
            if (!stats[log.tool]) {
                stats[log.tool] = { total: 0, success: 0, failure: 0 }
            }
            stats[log.tool].total++
            if (log.success) {
                stats[log.tool].success++
            } else {
                stats[log.tool].failure++
            }
        }

        return stats
    }
}
