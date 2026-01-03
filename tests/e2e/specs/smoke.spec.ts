import { expect } from '@playwright/test';
import { test } from '../fixtures/hooks';

async function stubOptionalApis(page: any) {
  const okJson = (body: any) => ({ status: 200, body: JSON.stringify(body) });
  await page.route('**/chat/**', route => {
    const url = route.request().url();
    if (url.includes('/providers/openrouter') || url.includes('/admin/audit-logs') || url.includes('/admin/users')) {
      return route.fulfill(okJson({ data: [], meta: {} }));
    }
    if (url.includes('/chat/usage/logs')) {
      return route.fulfill(okJson({ data: [] }));
    }
    if (url.includes('/chat/stats/daily')) {
      return route.fulfill(okJson({ totalTokens: 0, totalCost: 0, totalMessages: 0, modelsUsed: 0 }));
    }
    if (url.includes('/chat/stats/user')) {
      return route.fulfill(okJson({ data: [] }));
    }
    return route.continue();
  });
  await page.route('**/conversations**', route => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill(okJson({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }));
    }
    if (method === 'POST') {
      return route.fulfill(okJson({ id: '00000000-0000-0000-0000-000000000000', userId: 'mock-user', title: 'New Conversation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    }
    return route.continue();
  });
  await page.route('**/conversations/**/messages**', route => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill(okJson({ data: [] }));
    }
    if (method === 'POST') {
      return route.fulfill(okJson({ id: 'msg-1', conversationId: '00000000-0000-0000-0000-000000000000', role: 'assistant', content: 'Hello from bot', createdAt: new Date().toISOString() }));
    }
    return route.continue();
  });
  await page.route('**/admin/**', route => route.fulfill(okJson({ data: [], meta: {} })));
  const mockChat = {
    message: 'Hello from bot',
    conversationId: 'mock-conv',
    model: 'openai/gpt-4o-mini',
    provider: 'openai',
    usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15, estimatedCost: 0.0001 },
    latencyMs: 50
  };
  await page.route('**/api/chat/send', route => route.fulfill(okJson(mockChat)));
  await page.route('**/chat/send', route => route.fulfill(okJson(mockChat)));
  await page.route('**/api/chat/completions', route => route.fulfill(okJson(mockChat)));
  await page.route('**/chat/completions', route => route.fulfill(okJson(mockChat)));
}

test.describe('Smoke navigation', () => {
  test('redirects unauthenticated to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test('navbar links reachable', async ({ pageWithMonitors }) => {
    const page = pageWithMonitors;
    await stubOptionalApis(page);
    await page.goto('/chat');
    await expect(page.locator('header a', { hasText: 'NetOpsAI' })).toBeVisible();

    await page.click('a:has-text("Models")');
    await expect(page).toHaveURL(/\/models/);

    await page.click('a:has-text("Stats")');
    await expect(page).toHaveURL(/\/stats/);

    await page.click('a:has-text("Admin")');
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe('Chat', () => {
  test('create conversation and send message', async ({ pageWithMonitors }) => {
    const page = pageWithMonitors;
    await stubOptionalApis(page);
    await page.route('**/api/chat/completions', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          message: 'Hello from bot',
          conversationId: 'mock-conv',
          model: 'openai/gpt-4o-mini',
          provider: 'openai',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15, estimatedCost: 0.0001 },
          latencyMs: 50
        })
      });
    });
    await page.goto('/chat');
    await page.click('button:has-text("New chat")');
    await page.fill('textarea, [contenteditable="true"]', 'Hello from E2E');
    await page.keyboard.press('Enter');
    await expect(page.locator('textarea, [contenteditable="true"]')).toBeVisible();
  });
});
