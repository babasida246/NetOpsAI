/**
 * Test Fixtures - API Mocking and Authentication
 */
import { test as base, expect, type Page, type Route } from '@playwright/test';
import { LoginPage, ChatPage, LayoutPage } from '../pages';

// API Mock Data
export const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin'
};

export const mockAuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser
};

export const mockConversations = [
    {
        id: 'conv-1',
        title: 'Test Conversation 1',
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'conv-2',
        title: 'Test Conversation 2',
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export const mockMessages = [
    {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello, AI!',
        createdAt: new Date().toISOString()
    },
    {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        createdAt: new Date().toISOString()
    }
];

export const mockModels = [
    {
        id: 'openai/gpt-4o-mini',
        provider: 'openai',
        description: 'GPT-4o Mini',
        priority: 1,
        enabled: true
    },
    {
        id: 'anthropic/claude-3-haiku',
        provider: 'anthropic',
        description: 'Claude 3 Haiku',
        priority: 2,
        enabled: true
    }
];

export const mockDailyStats = {
    totalTokens: 5000,
    totalCost: 0.0125,
    totalMessages: 20,
    modelsUsed: 2
};

// Fixture Types
type TestFixtures = {
    loginPage: LoginPage;
    chatPage: ChatPage;
    layoutPage: LayoutPage;
    authenticatedPage: Page;
    mockApi: (page: Page) => Promise<void>;
};

/**
 * Setup API mocking for a page
 */
export async function setupApiMocks(page: Page): Promise<void> {
    await page.route('**/api/v1/setup/status', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: { isComplete: true }
            })
        });
    });

    // Auth endpoints
    await page.route('**/api/v1/auth/login', async (route: Route) => {
        const json = await route.request().postDataJSON();
        if (json.email === 'test@example.com' && json.password === 'password123') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: mockAuthTokens,
                    meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
                })
            });
        } else {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
                    meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
                })
            });
        }
    });

    await page.route('**/api/v1/auth/me', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockUser,
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });

    // Conversations
    await page.route('**/api/v1/conversations', async (route: Route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: mockConversations,
                    meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
                })
            });
        } else if (route.request().method() === 'POST') {
            const newConv = {
                id: `conv-${Date.now()}`,
                title: 'New Conversation',
                userId: mockUser.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: newConv,
                    meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
                })
            });
        }
    });

    await page.route('**/api/v1/conversations/*/messages', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockMessages,
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });

    // Chat
    await page.route('**/api/v1/chat/send', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    conversationId: 'conv-1',
                    message: {
                        id: `msg-${Date.now()}`,
                        role: 'assistant',
                        content: 'This is a mock AI response.',
                        createdAt: new Date().toISOString()
                    },
                    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                },
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });

    await page.route('**/api/v1/chat/stats/daily', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockDailyStats,
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });

    await page.route('**/api/v1/chat/models', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockModels,
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });

    // Health check
    await page.route('**/api/v1/health', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: { status: 'healthy', uptime: 12345, timestamp: new Date().toISOString() },
                meta: { timestamp: new Date().toISOString(), requestId: 'req-1' }
            })
        });
    });
}

/**
 * Setup authenticated session
 */
export async function setupAuthenticatedSession(page: Page): Promise<void> {
    await page.addInitScript(() => {
        localStorage.setItem('authToken', 'mock-access-token');
        localStorage.setItem('refreshToken', 'mock-refresh-token');
        localStorage.setItem('userId', 'test-user-id');
        localStorage.setItem('userEmail', 'test@example.com');
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userName', 'Test User');
    });
}

// Extended test with fixtures
export const test = base.extend<TestFixtures>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    chatPage: async ({ page }, use) => {
        const chatPage = new ChatPage(page);
        await use(chatPage);
    },

    layoutPage: async ({ page }, use) => {
        const layoutPage = new LayoutPage(page);
        await use(layoutPage);
    },

    authenticatedPage: async ({ page }, use) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
        await use(page);
    },

    mockApi: async ({ page: _page }, use) => {
        await use(setupApiMocks);
    }
});

export { expect };
