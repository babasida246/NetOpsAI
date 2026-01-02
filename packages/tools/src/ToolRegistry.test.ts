import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRegistry } from './ToolRegistry.js'
import { echoTool } from './core-tools/echo.js'
import { timeNowTool } from './core-tools/time_now.js'

describe('ToolRegistry', () => {
    let registry: ToolRegistry

    beforeEach(() => {
        registry = new ToolRegistry()
    })

    describe('register', () => {
        it('registers tool successfully', () => {
            registry.register(echoTool)
            const tool = registry.get('echo')
            expect(tool).toBeDefined()
            expect(tool?.name).toBe('echo')
        })

        it('throws on duplicate registration', () => {
            registry.register(echoTool)
            expect(() => registry.register(echoTool)).toThrow('already registered')
        })
    })

    describe('list', () => {
        it('lists all registered tools', () => {
            registry.register(echoTool)
            registry.register(timeNowTool)

            const tools = registry.list()
            expect(tools).toHaveLength(2)
            expect(tools.map(t => t.name)).toContain('echo')
            expect(tools.map(t => t.name)).toContain('time_now')
        })

        it('returns tool definitions without execute function', () => {
            registry.register(echoTool)
            const tools = registry.list()
            expect(tools[0]).not.toHaveProperty('execute')
        })
    })

    describe('invoke', () => {
        it('validates and executes tool', async () => {
            registry.register(echoTool)

            const result = await registry.invoke('echo', { message: 'test' }, {
                userId: 'user-1',
                correlationId: 'corr-1'
            })

            expect(result.success).toBe(true)
            expect(result.output).toMatchObject({ echoed: 'test' })
            expect(result.duration).toBeGreaterThanOrEqual(0)
        })

        it('rejects invalid arguments', async () => {
            registry.register(echoTool)

            await expect(
                registry.invoke('echo', {}, {
                    userId: 'user-1',
                    correlationId: 'corr-1'
                })
            ).rejects.toThrow('Invalid tool arguments')
        })

        it('throws for unknown tool', async () => {
            await expect(
                registry.invoke('unknown', {}, {
                    userId: 'user-1',
                    correlationId: 'corr-1'
                })
            ).rejects.toThrow('Tool not found')
        })

        it('checks authentication for requiresAuth tools', async () => {
            const authTool = {
                ...echoTool,
                name: 'auth_echo',
                requiresAuth: true
            }
            registry.register(authTool)

            await expect(
                registry.invoke('auth_echo', { message: 'test' }, {
                    userId: '',
                    correlationId: 'corr-1'
                })
            ).rejects.toThrow('Authentication required')
        })
    })

    describe('timeout', () => {
        it('times out long-running tools', async () => {
            const slowTool = {
                name: 'slow',
                description: 'Slow tool',
                inputSchema: { type: 'object' },
                async execute() {
                    await new Promise(resolve => setTimeout(resolve, 5000))
                    return { done: true }
                },
                timeout: 100
            }

            registry.register(slowTool)

            await expect(
                registry.invoke('slow', {}, {
                    userId: 'user-1',
                    correlationId: 'corr-1'
                })
            ).rejects.toThrow('timeout')
        }, 10000)
    })

    describe('strategy', () => {
        it('returns error for best-effort strategy on failure', async () => {
            const failingTool = {
                name: 'failing',
                description: 'Failing tool',
                inputSchema: { type: 'object' },
                async execute() {
                    throw new Error('Test failure')
                },
                strategy: 'best-effort' as const
            }

            registry.register(failingTool)

            const result = await registry.invoke('failing', {}, {
                userId: 'user-1',
                correlationId: 'corr-1'
            })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Test failure')
        })

        it('throws for retry/fail-fast strategy on failure', async () => {
            const failingTool = {
                name: 'failing_fast',
                description: 'Failing tool',
                inputSchema: { type: 'object' },
                async execute() {
                    throw new Error('Test failure')
                },
                strategy: 'fail-fast' as const
            }

            registry.register(failingTool)

            await expect(
                registry.invoke('failing_fast', {}, {
                    userId: 'user-1',
                    correlationId: 'corr-1'
                })
            ).rejects.toThrow('Test failure')
        })
    })

    describe('execution stats', () => {
        it('tracks successful executions', async () => {
            registry.register(echoTool)

            await registry.invoke('echo', { message: 'test' }, {
                userId: 'user-1',
                correlationId: 'corr-1'
            })

            const stats = registry.getExecutionStats()
            expect(stats.echo).toMatchObject({
                total: 1,
                success: 1,
                failure: 0
            })
        })

        it('tracks failed executions', async () => {
            const failingTool = {
                name: 'failing_stats',
                description: 'Failing tool',
                inputSchema: { type: 'object' },
                async execute() {
                    throw new Error('Test failure')
                },
                strategy: 'best-effort' as const
            }

            registry.register(failingTool)

            await registry.invoke('failing_stats', {}, {
                userId: 'user-1',
                correlationId: 'corr-1'
            })

            const stats = registry.getExecutionStats()
            expect(stats.failing_stats).toMatchObject({
                total: 1,
                success: 0,
                failure: 1
            })
        })
    })
})

describe('echoTool', () => {
    it('echoes message with timestamp', async () => {
        const result = await echoTool.execute(
            { message: 'Hello' },
            { userId: 'test', correlationId: 'test' }
        )

        expect(result.echoed).toBe('Hello')
        expect(result.timestamp).toBeDefined()
    })
})

describe('timeNowTool', () => {
    it('returns current time info', async () => {
        const result = await timeNowTool.execute(
            {},
            { userId: 'test', correlationId: 'test' }
        )

        expect(result.utc).toBeDefined()
        expect(result.unix).toBeGreaterThan(0)
        expect(result.timezone).toBe('UTC')
    })

    it('accepts timezone parameter', async () => {
        const result = await timeNowTool.execute(
            { timezone: 'America/New_York' },
            { userId: 'test', correlationId: 'test' }
        )

        expect(result.timezone).toBe('America/New_York')
    })
})
