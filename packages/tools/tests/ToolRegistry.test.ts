import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry, type ToolDefinition, type ToolContext } from '../src/ToolRegistry.js';

describe('ToolRegistry Unit Tests', () => {
    let registry: ToolRegistry;
    let mockContext: ToolContext;

    beforeEach(() => {
        registry = new ToolRegistry();
        mockContext = {
            userId: 'test-user-123',
            correlationId: 'test-correlation-id',
            logger: console
        };
    });

    describe('Tool Registration', () => {
        it('should register a tool successfully', () => {
            const tool: ToolDefinition = {
                name: 'test_tool',
                description: 'Test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        input: { type: 'string' }
                    },
                    required: ['input']
                },
                execute: async (args) => ({ result: args.input })
            };

            registry.register(tool);
            const tools = registry.list();

            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe('test_tool');
        });

        it('should throw error when registering duplicate tool', () => {
            const tool: ToolDefinition = {
                name: 'duplicate',
                description: 'Duplicate tool',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ result: 'test' })
            };

            registry.register(tool);

            expect(() => {
                registry.register(tool);
            }).toThrow('already registered');
        });

        it('should retrieve a tool by name', () => {
            const tool: ToolDefinition = {
                name: 'retrievable',
                description: 'Retrievable tool',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ result: 'test' })
            };

            registry.register(tool);
            const retrieved = registry.get('retrievable');

            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('retrievable');
        });
    });

    describe('Tool Invocation', () => {
        beforeEach(() => {
            const echoTool: ToolDefinition = {
                name: 'echo',
                description: 'Echoes input',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    },
                    required: ['message']
                },
                execute: async (args: any) => ({ echoed: args.message })
            };

            registry.register(echoTool);
        });

        it('should invoke a tool successfully', async () => {
            const result = await registry.invoke('echo', { message: 'Hello' }, mockContext);

            expect(result.success).toBe(true);
            expect(result.output.echoed).toBe('Hello');
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should validate tool arguments', async () => {
            await expect(
                registry.invoke('echo', {}, mockContext) // missing required 'message'
            ).rejects.toThrow('Invalid tool arguments');
        });

        it('should throw error for nonexistent tool', async () => {
            await expect(
                registry.invoke('nonexistent', {}, mockContext)
            ).rejects.toThrow('Tool not found');
        });
    });

    describe('Tool Authentication', () => {
        beforeEach(() => {
            const securedTool: ToolDefinition = {
                name: 'secured',
                description: 'Requires auth',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ result: 'authenticated' }),
                requiresAuth: true
            };

            registry.register(securedTool);
        });

        it('should reject unauthenticated invocation', async () => {
            const unauthContext = { ...mockContext, userId: '' };

            await expect(
                registry.invoke('secured', {}, unauthContext)
            ).rejects.toThrow('Authentication required');
        });

        it('should allow authenticated invocation', async () => {
            const result = await registry.invoke('secured', {}, mockContext);

            expect(result.success).toBe(true);
            expect(result.output.result).toBe('authenticated');
        });
    });

    describe('Tool Timeout', () => {
        it('should timeout long-running tools', async () => {
            const slowTool: ToolDefinition = {
                name: 'slow',
                description: 'Slow tool',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return { result: 'done' };
                },
                timeout: 100 // 100ms timeout
            };

            registry.register(slowTool);

            await expect(
                registry.invoke('slow', {}, mockContext)
            ).rejects.toThrow('timeout');
        }, 10000);

        it('should complete fast tools within timeout', async () => {
            const fastTool: ToolDefinition = {
                name: 'fast',
                description: 'Fast tool',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ result: 'done' }),
                timeout: 1000
            };

            registry.register(fastTool);
            const result = await registry.invoke('fast', {}, mockContext);

            expect(result.success).toBe(true);
        });
    });

    describe('Error Handling Strategies', () => {
        it('should throw error with fail-fast strategy (default)', async () => {
            const errorTool: ToolDefinition = {
                name: 'error',
                description: 'Always fails',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => {
                    throw new Error('Intentional error');
                },
                strategy: 'fail-fast'
            };

            registry.register(errorTool);

            await expect(
                registry.invoke('error', {}, mockContext)
            ).rejects.toThrow('Intentional error');
        });

        it('should return error result with best-effort strategy', async () => {
            const errorTool: ToolDefinition = {
                name: 'best_effort',
                description: 'Best effort',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => {
                    throw new Error('Expected error');
                },
                strategy: 'best-effort'
            };

            registry.register(errorTool);
            const result = await registry.invoke('best_effort', {}, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Expected error');
        });
    });

    describe('Execution Statistics', () => {
        beforeEach(() => {
            const tool: ToolDefinition = {
                name: 'statful',
                description: 'Tool for stats',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ result: 'ok' })
            };

            registry.register(tool);
        });

        it('should track tool execution stats', async () => {
            await registry.invoke('statful', {}, mockContext);
            await registry.invoke('statful', {}, mockContext);
            await registry.invoke('statful', {}, mockContext);

            const stats = registry.getExecutionStats();

            expect(stats.statful).toBeDefined();
            expect(stats.statful.total).toBe(3);
            expect(stats.statful.success).toBe(3);
            expect(stats.statful.failure).toBe(0);
        });

        it('should track failures in stats', async () => {
            const flakeyTool: ToolDefinition = {
                name: 'flakey',
                description: 'Sometimes fails',
                inputSchema: { type: 'object', properties: {} },
                execute: vi.fn()
                    .mockRejectedValueOnce(new Error('fail'))
                    .mockResolvedValueOnce({ result: 'ok' })
                    .mockRejectedValueOnce(new Error('fail')),
                strategy: 'best-effort'
            };

            registry.register(flakeyTool);

            await registry.invoke('flakey', {}, mockContext); // fail
            await registry.invoke('flakey', {}, mockContext); // success
            await registry.invoke('flakey', {}, mockContext); // fail

            const stats = registry.getExecutionStats();

            expect(stats.flakey.total).toBe(3);
            expect(stats.flakey.success).toBe(1);
            expect(stats.flakey.failure).toBe(2);
        });
    });

    describe('Tool Listing', () => {
        it('should list all registered tools', () => {
            const tools: ToolDefinition[] = [
                {
                    name: 'tool1',
                    description: 'First tool',
                    inputSchema: { type: 'object', properties: {} },
                    execute: async () => ({})
                },
                {
                    name: 'tool2',
                    description: 'Second tool',
                    inputSchema: { type: 'object', properties: {} },
                    execute: async () => ({})
                }
            ];

            tools.forEach(tool => registry.register(tool));
            const listed = registry.list();

            expect(listed).toHaveLength(2);
            expect(listed.map(t => t.name)).toContain('tool1');
            expect(listed.map(t => t.name)).toContain('tool2');
        });

        it('should not expose execute function in listing', () => {
            const tool: ToolDefinition = {
                name: 'private',
                description: 'Private execution',
                inputSchema: { type: 'object', properties: {} },
                execute: async () => ({ secret: 'data' })
            };

            registry.register(tool);
            const listed = registry.list();

            expect(listed[0]).not.toHaveProperty('execute');
            expect(listed[0]).toHaveProperty('name');
            expect(listed[0]).toHaveProperty('description');
            expect(listed[0]).toHaveProperty('inputSchema');
        });
    });

    describe('Schema Validation', () => {
        it('should validate complex schemas', async () => {
            const complexTool: ToolDefinition = {
                name: 'complex',
                description: 'Complex validation',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', minLength: 1 },
                        age: { type: 'number', minimum: 0, maximum: 150 },
                        email: { type: 'string', format: 'email' },
                        tags: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 1
                        }
                    },
                    required: ['name', 'email']
                },
                execute: async (args) => ({ validated: args })
            };

            registry.register(complexTool);

            // Valid input
            const validArgs = {
                name: 'John',
                age: 30,
                email: 'john@example.com',
                tags: ['developer']
            };

            const result = await registry.invoke('complex', validArgs, mockContext);
            expect(result.success).toBe(true);

            // Invalid email format
            await expect(
                registry.invoke('complex', { name: 'John', email: 'invalid' }, mockContext)
            ).rejects.toThrow('Invalid tool arguments');

            // Missing required field
            await expect(
                registry.invoke('complex', { name: 'John' }, mockContext)
            ).rejects.toThrow('Invalid tool arguments');
        });
    });
});
