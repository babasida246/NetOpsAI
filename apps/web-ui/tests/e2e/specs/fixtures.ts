/**
 * Spec-level Test Fixtures
 * Re-exports from parent fixtures and adds spec-specific helpers
 */
import { test as base, expect, type Page } from '@playwright/test';

// Mock data
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

/**
 * Setup authenticated session by injecting auth tokens into localStorage
 * Uses the same keys as the actual app (+layout.svelte)
 */
export async function setupAuthenticatedSession(page: Page): Promise<void> {
    await page.addInitScript((tokens) => {
        // Match the keys used by +layout.svelte
        localStorage.setItem('authToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('userEmail', tokens.user.email);
        localStorage.setItem('userRole', tokens.user.role);
        localStorage.setItem('userName', tokens.user.name);
        localStorage.setItem('userId', tokens.user.id);
        // Also set user object for components that need it
        localStorage.setItem('user', JSON.stringify(tokens.user));
    }, mockAuthTokens);
}

/**
 * Setup API mocks for testing
 */
export async function setupApiMocks(page: Page): Promise<void> {
    // Mock auth endpoints
    await page.route('**/api/v1/auth/me', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockUser
            })
        });
    });

    await page.route('**/api/v1/auth/login', async route => {
        const body = route.request().postDataJSON();
        if (body?.email === 'test@example.com' && body?.password === 'password123') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: mockAuthTokens
                })
            });
        } else {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid credentials'
                })
            });
        }
    });

    await page.route('**/api/v1/auth/refresh', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: mockAuthTokens
            })
        });
    });

    // Mock assets endpoints
    await page.route('**/api/v1/assets**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [],
                    meta: { total: 0, page: 1, limit: 20 }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock CMDB endpoints
    await page.route('**/api/v1/cmdb/**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [],
                    meta: { total: 0 }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock warehouse endpoints
    await page.route('**/api/v1/warehouse/**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [],
                    meta: { total: 0 }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock admin endpoints
    await page.route('**/api/v1/admin/**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [mockUser],
                    meta: { total: 1 }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock chat/conversations endpoints
    await page.route('**/api/v1/conversations**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [],
                    meta: { total: 0 }
                })
            });
        } else {
            await route.continue();
        }
    });

    // Mock models endpoints (new + legacy)
    const modelsResponse = {
        success: true,
        data: [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, priority: 1 },
            { id: 'claude-3', name: 'Claude 3', provider: 'anthropic', enabled: true, priority: 2 }
        ]
    };
    await page.route('**/api/v1/models**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(modelsResponse)
            });
        } else {
            await route.continue();
        }
    });
    await page.route('**/api/v1/chat/models**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(modelsResponse)
            });
        } else {
            await route.continue();
        }
    });

    // Mock providers endpoints (new + legacy)
    const providersResponse = {
        success: true,
        data: [
            { id: 'openai', name: 'OpenAI', enabled: true },
            { id: 'anthropic', name: 'Anthropic', enabled: true }
        ]
    };
    await page.route('**/api/v1/providers**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(providersResponse)
            });
        } else {
            await route.continue();
        }
    });
    await page.route('**/api/v1/chat/providers**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(providersResponse)
            });
        } else {
            await route.continue();
        }
    });

    // Mock stats endpoints
    await page.route('**/api/v1/stats/chat/daily**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        totalTokens: 0,
                        totalCost: 0,
                        totalMessages: 0,
                        modelsUsed: 0
                    }
                })
            });
        } else {
            await route.continue();
        }
    });
}

// Extended test with fixtures
export const test = base.extend<{
    authenticatedPage: Page;
}>({
    authenticatedPage: async ({ page }, use) => {
        await setupAuthenticatedSession(page);
        await setupApiMocks(page);
        await use(page);
    }
});

export { expect };
