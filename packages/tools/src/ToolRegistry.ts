import AjvModule from 'ajv'
import addFormatsModule from 'ajv-formats'
type JSONSchema = Record<string, any>

// Handle both ESM and CJS imports
const Ajv = (AjvModule as any).default || AjvModule
const addFormats = (addFormatsModule as any).default || addFormatsModule

const AppError = {
    notFound: (msg: string) => Object.assign(new Error(msg), { statusCode: 404, code: 'NOT_FOUND' }),
    badRequest: (msg: string, details?: any) => Object.assign(new Error(msg), { statusCode: 400, code: 'BAD_REQUEST', details }),
    unauthorized: (msg: string) => Object.assign(new Error(msg), { statusCode: 401, code: 'UNAUTHORIZED' }),
    forbidden: (msg: string) => Object.assign(new Error(msg), { statusCode: 403, code: 'FORBIDDEN' })
}

export interface ToolDefinition {
    name: string
    description?: string
    inputSchema?: JSONSchema
    outputSchema?: JSONSchema
    execute: (args: any, context: ToolContext) => Promise<any>
    strategy?: 'retry' | 'fail-fast' | 'best-effort'
    timeout?: number
    requiresAuth?: boolean
    requiredRole?: string
}

export interface ToolContext {
    userId: string
    correlationId: string
    /**
     * Optional role for RBAC enforcement.
     *
     * The platform uses roles like: user | admin | super_admin
     * Some legacy tools may use additional role strings.
     */
    role?: string
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

    list(): Array<Omit<ToolDefinition, 'execute'>> {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            outputSchema: t.outputSchema,
            strategy: t.strategy,
            timeout: t.timeout,
            requiresAuth: t.requiresAuth,
            requiredRole: t.requiredRole
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

        // Check RBAC
        if (tool.requiredRole) {
            const role = context.role
            if (!role) {
                throw AppError.unauthorized('Role required')
            }
            if (!hasRequiredRole(role, tool.requiredRole)) {
                throw AppError.forbidden('Insufficient role')
            }
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

const ROLE_RANK: Record<string, number> = {
    user: 1,
    admin: 2,
    super_admin: 3
}

function hasRequiredRole(userRole: string, requiredRole: string): boolean {
    if (userRole === requiredRole) return true

    // Always allow top-level admins
    if (userRole === 'super_admin') return true

    const userRank = ROLE_RANK[userRole]
    const requiredRank = ROLE_RANK[requiredRole]
    if (userRank !== undefined && requiredRank !== undefined) {
        return userRank >= requiredRank
    }

    // For non-standard roles, treat 'admin' as elevated.
    if (userRole === 'admin') return true

    return false
}
