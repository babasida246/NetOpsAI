/**
 * Conversations Module Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationRepository } from '../../src/modules/conversations/conversations.repository.js';
import { createMockPool, testUser, testConversation, testMessage } from '../utils.js';
describe('ConversationRepository', () => {
    let conversationRepo;
    let mockPool;
    beforeEach(() => {
        mockPool = createMockPool();
        conversationRepo = new ConversationRepository(mockPool);
    });
    describe('findById', () => {
        it('should return conversation when found', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: testConversation.title,
                        model: testConversation.model,
                        status: 'active',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            });
            const conversation = await conversationRepo.findById(testConversation.id, testUser.id);
            expect(conversation).not.toBeNull();
            expect(conversation?.id).toBe(testConversation.id);
            expect(conversation?.title).toBe(testConversation.title);
        });
        it('should return null when not found', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            const conversation = await conversationRepo.findById('nonexistent', testUser.id);
            expect(conversation).toBeNull();
        });
    });
    describe('findAll', () => {
        it('should return paginated conversations', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '2' }] })
                .mockResolvedValueOnce({
                rows: [
                    {
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: 'Conversation 1',
                        model: 'openai/gpt-4o-mini',
                        status: 'active',
                        message_count: 5,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    },
                    {
                        id: 'conv-2',
                        user_id: testUser.id,
                        title: 'Conversation 2',
                        model: 'openai/gpt-4o',
                        status: 'active',
                        message_count: 10,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ]
            });
            const result = await conversationRepo.findAll(testUser.id, {
                page: 1,
                limit: 20,
                sortOrder: 'desc'
            });
            expect(result.total).toBe(2);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].title).toBe('Conversation 1');
        });
        it('should filter by status', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: 'Active Conversation',
                        model: 'openai/gpt-4o-mini',
                        status: 'active',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            });
            const result = await conversationRepo.findAll(testUser.id, {
                page: 1,
                limit: 20,
                sortOrder: 'desc',
                status: 'active'
            });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].status).toBe('active');
        });
    });
    describe('create', () => {
        it('should create a new conversation', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: 'New Conversation',
                        model: 'openai/gpt-4o-mini',
                        status: 'active',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            });
            const conversation = await conversationRepo.create(testUser.id, {
                title: 'New Conversation',
                model: 'openai/gpt-4o-mini'
            });
            expect(conversation.id).toBe(testConversation.id);
            expect(conversation.title).toBe('New Conversation');
            expect(conversation.status).toBe('active');
        });
    });
    describe('update', () => {
        it('should update conversation title', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: 'Updated Title',
                        model: 'openai/gpt-4o-mini',
                        status: 'active',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            });
            const conversation = await conversationRepo.update(testConversation.id, testUser.id, { title: 'Updated Title' });
            expect(conversation?.title).toBe('Updated Title');
        });
        it('should archive conversation', async () => {
            mockPool.query.mockResolvedValue({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: testConversation.title,
                        model: 'openai/gpt-4o-mini',
                        status: 'archived',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            });
            const conversation = await conversationRepo.update(testConversation.id, testUser.id, { status: 'archived' });
            expect(conversation?.status).toBe('archived');
        });
    });
    describe('delete', () => {
        it('should delete conversation and return true', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });
            const result = await conversationRepo.delete(testConversation.id, testUser.id);
            expect(result).toBe(true);
        });
        it('should return false when conversation not found', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 0 });
            const result = await conversationRepo.delete('nonexistent', testUser.id);
            expect(result).toBe(false);
        });
    });
    describe('createMessage', () => {
        it('should create a message in conversation', async () => {
            // First query: verify conversation
            mockPool.query
                .mockResolvedValueOnce({
                rows: [{
                        id: testConversation.id,
                        user_id: testUser.id,
                        title: testConversation.title,
                        model: 'openai/gpt-4o-mini',
                        status: 'active',
                        message_count: 0,
                        metadata: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
            })
                // Second query: create message
                .mockResolvedValueOnce({
                rows: [{
                        id: testMessage.id,
                        conversation_id: testConversation.id,
                        role: 'user',
                        content: 'Hello!',
                        model: null,
                        token_count: null,
                        metadata: null,
                        created_at: new Date()
                    }]
            })
                // Third query: update message count
                .mockResolvedValueOnce({ rowCount: 1 });
            const message = await conversationRepo.createMessage(testConversation.id, testUser.id, { role: 'user', content: 'Hello!' });
            expect(message).not.toBeNull();
            expect(message?.role).toBe('user');
            expect(message?.content).toBe('Hello!');
        });
        it('should return null for non-existent conversation', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            const message = await conversationRepo.createMessage('nonexistent', testUser.id, { role: 'user', content: 'Hello!' });
            expect(message).toBeNull();
        });
    });
});
//# sourceMappingURL=conversations.test.js.map