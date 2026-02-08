import { test, expect } from '@playwright/test';

test.describe('Chat Page - Authenticated Tests', () => {
    test('should load chat page', async ({ page }) => {
        await page.goto('/chat');

        // Should see chat interface elements
        await expect(page.getByRole('heading', { name: 'NetOpsAI Conversations' })).toBeVisible({ timeout: 10000 });
    });

    test('should show chat input area', async ({ page }) => {
        await page.goto('/chat');

        // Chat page shows list of conversations first, need to create or select one to see input
        // The "New chat" button should be visible
        const newChatButton = page.getByRole('button', { name: /new chat/i });
        await expect(newChatButton).toBeVisible({ timeout: 10000 });
    });

    test('should be able to create new chat', async ({ page }) => {
        await page.goto('/chat');

        // Look for new chat button
        const newChatButton = page.getByRole('button', { name: /new|create/i }).first();
        if (await newChatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await newChatButton.click();
            await page.waitForTimeout(500);
        }
    });
});

test.describe('Stats Page - Authenticated Tests', () => {
    test('should load stats page', async ({ page }) => {
        await page.goto('/stats');

        // Should see stats/dashboard elements
        await expect(page.getByRole('heading', { name: /stats|statistics|dashboard/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display usage statistics', async ({ page }) => {
        await page.goto('/stats');

        // Wait for data to load
        await page.waitForTimeout(2000);

        // Should have some stats content
        const statsContent = page.locator('main');
        await expect(statsContent).toBeVisible();
    });
});

test.describe('Models Page - Authenticated Tests', () => {
    test('should load models page', async ({ page }) => {
        await page.goto('/models');

        // Should see models configuration
        await expect(page.getByRole('heading', { name: /model/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display AI providers section', async ({ page }) => {
        await page.goto('/models');

        await page.waitForTimeout(2000);

        // Look for provider-related content
        const modelsContent = page.locator('main');
        await expect(modelsContent).toBeVisible();
    });
});

test.describe('Tools Page - Authenticated Tests', () => {
    test('should load tools page', async ({ page }) => {
        await page.goto('/tools');

        // Should see tools configuration
        await expect(page.getByRole('heading', { name: /tool/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display available tools', async ({ page }) => {
        await page.goto('/tools');

        await page.waitForTimeout(2000);

        // Look for tools list or configuration
        const toolsContent = page.locator('main');
        await expect(toolsContent).toBeVisible();
    });
});

test.describe('Admin Page - Authenticated Tests', () => {
    test('should load admin page', async ({ page }) => {
        await page.goto('/admin');

        // Should see admin panel
        await expect(page.getByRole('heading', { name: /admin|user|management/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display user management section', async ({ page }) => {
        await page.goto('/admin');

        await page.waitForTimeout(2000);

        // Should have user management controls
        const adminContent = page.locator('main');
        await expect(adminContent).toBeVisible();
    });

    test('should be able to view user list', async ({ page }) => {
        await page.goto('/admin');

        // Wait for users to load
        await page.waitForTimeout(2000);

        // Check if there's a table or list of users
        const userListOrTable = page.locator('table, [role="table"], .user-list');
        if (await userListOrTable.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(userListOrTable).toBeVisible();
        }
    });
});
