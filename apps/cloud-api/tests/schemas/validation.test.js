/**
 * Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { loginRequestSchema, registerRequestSchema, changePasswordRequestSchema } from '../../src/modules/auth/auth.schema.js';
import { chatCompletionRequestSchema } from '../../src/modules/chat/chat.schema.js';
import { createConversationSchema, updateConversationSchema } from '../../src/modules/conversations/conversations.schema.js';
describe('Schema Validation', () => {
    describe('Auth Schemas', () => {
        describe('loginRequestSchema', () => {
            it('should validate correct login data', () => {
                const result = loginRequestSchema.safeParse({
                    email: 'test@example.com',
                    password: 'password123'
                });
                expect(result.success).toBe(true);
            });
            it('should reject invalid email', () => {
                const result = loginRequestSchema.safeParse({
                    email: 'invalid-email',
                    password: 'password123'
                });
                expect(result.success).toBe(false);
            });
            it('should reject short password', () => {
                const result = loginRequestSchema.safeParse({
                    email: 'test@example.com',
                    password: '12345'
                });
                expect(result.success).toBe(false);
            });
        });
        describe('registerRequestSchema', () => {
            it('should validate correct registration data', () => {
                const result = registerRequestSchema.safeParse({
                    email: 'test@example.com',
                    name: 'Test User',
                    password: 'Password123',
                    confirmPassword: 'Password123'
                });
                expect(result.success).toBe(true);
            });
            it('should reject mismatched passwords', () => {
                const result = registerRequestSchema.safeParse({
                    email: 'test@example.com',
                    name: 'Test User',
                    password: 'Password123',
                    confirmPassword: 'DifferentPassword123'
                });
                expect(result.success).toBe(false);
            });
            it('should reject weak password', () => {
                const result = registerRequestSchema.safeParse({
                    email: 'test@example.com',
                    name: 'Test User',
                    password: 'weakpassword',
                    confirmPassword: 'weakpassword'
                });
                expect(result.success).toBe(false);
            });
        });
        describe('changePasswordRequestSchema', () => {
            it('should validate correct change password data', () => {
                const result = changePasswordRequestSchema.safeParse({
                    currentPassword: 'OldPassword123',
                    newPassword: 'NewPassword123',
                    confirmPassword: 'NewPassword123'
                });
                expect(result.success).toBe(true);
            });
        });
    });
    describe('Chat Schemas', () => {
        describe('chatCompletionRequestSchema', () => {
            it('should validate correct chat request', () => {
                const result = chatCompletionRequestSchema.safeParse({
                    messages: [
                        { role: 'user', content: 'Hello!' }
                    ]
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.model).toBe('openai/gpt-4o-mini');
                    expect(result.data.temperature).toBe(0.7);
                    expect(result.data.stream).toBe(false);
                }
            });
            it('should validate with custom model and temperature', () => {
                const result = chatCompletionRequestSchema.safeParse({
                    model: 'openai/gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are helpful.' },
                        { role: 'user', content: 'Hi!' }
                    ],
                    temperature: 0.5,
                    maxTokens: 1000
                });
                expect(result.success).toBe(true);
            });
            it('should reject empty messages', () => {
                const result = chatCompletionRequestSchema.safeParse({
                    messages: []
                });
                expect(result.success).toBe(false);
            });
            it('should reject invalid temperature', () => {
                const result = chatCompletionRequestSchema.safeParse({
                    messages: [{ role: 'user', content: 'Hi!' }],
                    temperature: 3.0
                });
                expect(result.success).toBe(false);
            });
            it('should validate with tools', () => {
                const result = chatCompletionRequestSchema.safeParse({
                    messages: [{ role: 'user', content: 'What time is it?' }],
                    tools: [
                        {
                            type: 'function',
                            function: {
                                name: 'get_time',
                                description: 'Get current time'
                            }
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });
    });
    describe('Conversation Schemas', () => {
        describe('createConversationSchema', () => {
            it('should use defaults', () => {
                const result = createConversationSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.title).toBe('New Conversation');
                    expect(result.data.model).toBe('openai/gpt-4o-mini');
                }
            });
            it('should accept custom values', () => {
                const result = createConversationSchema.safeParse({
                    title: 'My Chat',
                    model: 'openai/gpt-4o',
                    metadata: { source: 'web' }
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.title).toBe('My Chat');
                    expect(result.data.model).toBe('openai/gpt-4o');
                }
            });
        });
        describe('updateConversationSchema', () => {
            it('should accept partial updates', () => {
                const result = updateConversationSchema.safeParse({
                    title: 'Updated Title'
                });
                expect(result.success).toBe(true);
            });
            it('should validate status values', () => {
                const result = updateConversationSchema.safeParse({
                    status: 'archived'
                });
                expect(result.success).toBe(true);
            });
            it('should reject invalid status', () => {
                const result = updateConversationSchema.safeParse({
                    status: 'invalid'
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
//# sourceMappingURL=validation.test.js.map