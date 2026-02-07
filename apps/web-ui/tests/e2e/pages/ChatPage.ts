/**
 * Chat Page Object
 */
import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ChatPage extends BasePage {
    readonly selectors = {
        messageInput: 'chat-message-input',
        sendButton: 'chat-send-button',
        newChatButton: 'chat-new-button',
        deleteButton: 'chat-delete-button',
        conversationList: 'chat-conversation-list',
        conversationItem: 'chat-conversation-item',
        messageContainer: 'chat-message-container',
        userMessage: 'chat-user-message',
        assistantMessage: 'chat-assistant-message',
        modelSelect: 'chat-model-select',
        loadingSpinner: 'chat-loading-spinner',
        statsTokens: 'chat-stats-tokens',
        statsCost: 'chat-stats-cost'
    };

    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigate to chat page
     */
    async navigate(): Promise<void> {
        await this.goto('/chat');
    }

    /**
     * Wait for chat page to load
     */
    async waitForLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
        // Wait for conversations to load or empty state
        await this.page.waitForSelector('button:has-text("New Chat"), button:has-text("Cuộc trò chuyện mới"), .conversations-empty', { timeout: 10000 });
    }

    /**
     * Type message in input
     */
    async typeMessage(message: string): Promise<void> {
        const textarea = this.page.locator('textarea[placeholder*="message"], textarea[placeholder*="tin nhắn"]');
        await textarea.fill(message);
    }

    /**
     * Send message
     */
    async sendMessage(message: string): Promise<void> {
        await this.typeMessage(message);
        const sendBtn = this.page.locator('button').filter({ has: this.page.locator('svg') }).last();
        await sendBtn.click();
    }

    /**
     * Create new conversation
     */
    async createNewChat(): Promise<void> {
        const newBtn = this.page.locator('button:has-text("New Chat"), button:has-text("Cuộc trò chuyện mới")');
        await newBtn.click();
    }

    /**
     * Get all messages
     */
    async getMessages(): Promise<string[]> {
        const messages = this.page.locator('.chat-message, [class*="message"]');
        const count = await messages.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await messages.nth(i).textContent();
            if (text) texts.push(text);
        }
        return texts;
    }

    /**
     * Get conversation count
     */
    async getConversationCount(): Promise<number> {
        const items = this.page.locator('.conversation-item, [data-testid="chat-conversation-item"]');
        return await items.count();
    }

    /**
     * Select model
     */
    async selectModel(modelId: string): Promise<void> {
        const select = this.page.locator('select');
        await select.selectOption(modelId);
    }

    /**
     * Check if sending message
     */
    async isSending(): Promise<boolean> {
        const spinner = this.page.locator('.thinking, [class*="spinner"]');
        return await spinner.isVisible();
    }

    /**
     * Wait for assistant response
     */
    async waitForResponse(timeout = 30000): Promise<void> {
        // Wait for "Thinking..." to disappear
        await this.page.waitForSelector('.thinking, [class*="Thinking"]', { state: 'hidden', timeout });
    }
}
