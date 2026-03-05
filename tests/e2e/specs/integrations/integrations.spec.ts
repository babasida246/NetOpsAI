import { test, expect } from '@playwright/test';

/**
 * Integrations Page E2E Tests
 * Tests: connectors CRUD, webhooks CRUD, test connection, form validation
 */

async function stubIntegrationApis(page: any) {
    const okJson = (body: any) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

    const mockConnectors = [
        {
            id: 'conn-001',
            name: 'ServiceNow Prod',
            provider: 'servicenow',
            config: { url: 'https://dev123.service-now.com' },
            isActive: true,
            credentialsRef: 'vault:sn-prod',
            lastHealthCheck: '2025-01-10T08:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-10T08:00:00Z',
        },
        {
            id: 'conn-002',
            name: 'Jira Cloud',
            provider: 'jira',
            config: { url: 'https://myorg.atlassian.net' },
            isActive: false,
            credentialsRef: null,
            lastHealthCheck: null,
            createdAt: '2025-01-05T00:00:00Z',
            updatedAt: '2025-01-05T00:00:00Z',
        },
    ];

    const mockWebhooks = [
        {
            id: 'wh-001',
            connectorId: null,
            name: 'Slack Alerts',
            url: 'https://hooks.slack.com/services/xxx',
            secret: 'wh-secret',
            events: ['asset_created', 'asset_updated'],
            isActive: true,
            lastTriggered: '2025-01-10T09:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    const mockSyncRules = [
        {
            id: 'sync-001',
            connectorId: 'conn-001',
            name: 'Sync assets daily',
            direction: 'pull',
            entityType: 'asset',
            schedule: '0 2 * * *',
            isActive: true,
            lastSyncAt: '2025-01-10T02:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    // Connectors
    await page.route('**/api/v1/integrations/connectors', (route: any) => {
        const method = route.request().method();
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockConnectors }));
        }
        if (method === 'POST') {
            const body = JSON.parse(route.request().postData() || '{}');
            const newConn = {
                id: 'conn-new',
                ...body,
                isActive: true,
                credentialsRef: null,
                lastHealthCheck: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            return route.fulfill({ ...okJson({ data: newConn }), status: 201 });
        }
        return route.continue();
    });

    await page.route('**/api/v1/integrations/connectors/*/test', (route: any) => {
        return route.fulfill(okJson({ data: { success: true, latencyMs: 45, message: 'Connection OK' } }));
    });

    await page.route('**/api/v1/integrations/connectors/*', (route: any) => {
        const method = route.request().method();
        if (method === 'DELETE') {
            return route.fulfill(okJson({ data: { success: true } }));
        }
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockConnectors[0] }));
        }
        return route.continue();
    });

    // Webhooks
    await page.route('**/api/v1/integrations/webhooks', (route: any) => {
        const method = route.request().method();
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockWebhooks }));
        }
        if (method === 'POST') {
            const body = JSON.parse(route.request().postData() || '{}');
            const newWh = {
                id: 'wh-new',
                connectorId: null,
                ...body,
                isActive: true,
                lastTriggered: null,
                createdAt: new Date().toISOString(),
            };
            return route.fulfill({ ...okJson({ data: newWh }), status: 201 });
        }
        return route.continue();
    });

    await page.route('**/api/v1/integrations/webhooks/*', (route: any) => {
        if (route.request().method() === 'DELETE') {
            return route.fulfill(okJson({ data: { success: true } }));
        }
        return route.continue();
    });

    // Sync Rules
    await page.route('**/api/v1/integrations/sync-rules*', (route: any) => {
        return route.fulfill(okJson({ data: mockSyncRules }));
    });
}

test.describe('Integrations Page', () => {
    test.use({
        storageState: {
            cookies: [],
            origins: [{
                origin: 'http://localhost:3003',
                localStorage: [
                    { name: 'authToken', value: 'mock-e2e-token' },
                    { name: 'userRole', value: 'admin' },
                    { name: 'userEmail', value: 'admin@example.com' },
                ],
            }],
        },
    });

    test.beforeEach(async ({ page }) => {
        await stubIntegrationApis(page);
    });

    test('page loads and displays heading', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText('Integration');
    });

    test('displays connectors in table', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        const connRows = page.locator('[data-testid="connector-row"]');
        await expect(connRows).toHaveCount(2);

        await expect(connRows.first()).toContainText('ServiceNow Prod');
        await expect(connRows.first()).toContainText('servicenow');
        await expect(connRows.nth(1)).toContainText('Jira Cloud');
    });

    test('opens New Connector modal', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-new-connector"]').click();

        await expect(page.locator('[data-testid="input-conn-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-provider"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-conn-config"]')).toBeVisible();
    });

    test('connector form validates name is required', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-new-connector"]').click();

        // Save disabled without name
        await expect(page.locator('[data-testid="btn-save-connector"]')).toBeDisabled();

        // After filling name
        await page.locator('[data-testid="input-conn-name"]').fill('Test Connector');
        await expect(page.locator('[data-testid="btn-save-connector"]')).toBeEnabled();
    });

    test('creates new connector', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-new-connector"]').click();

        // Fill form
        await page.locator('[data-testid="input-conn-name"]').fill('AWS Integration');
        await page.locator('[data-testid="select-provider"]').selectOption('aws');
        await page.locator('[data-testid="input-conn-config"]').fill('{"region": "us-east-1"}');

        // Save
        await page.locator('[data-testid="btn-save-connector"]').click();
        await expect(page.locator('[data-testid="input-conn-name"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('test connection button works', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        // Click test connection on first connector
        await page.locator('[data-testid="btn-test-conn"]').first().click();
        await page.waitForLoadState('networkidle');
    });

    test('deletes connector with confirmation', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        page.on('dialog', (dialog: any) => dialog.accept());
        await page.locator('[data-testid="btn-delete-conn"]').first().click();
        await page.waitForLoadState('networkidle');
    });

    test('displays webhooks table', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        // Switch to Webhooks tab
        await page.getByRole('tab', { name: 'Webhooks' }).click();

        const whRows = page.locator('[data-testid="webhook-row"]');
        await expect(whRows).toHaveCount(1);
        await expect(whRows.first()).toContainText('Slack Alerts');
    });

    test('opens New Webhook modal and creates', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        // Switch to Webhooks tab first
        await page.getByRole('tab', { name: 'Webhooks' }).click();

        await page.locator('[data-testid="btn-new-webhook"]').click();

        // Check modal fields
        await expect(page.locator('[data-testid="input-wh-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-wh-url"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-wh-events"]')).toBeVisible();

        // Save disabled without name and url
        await expect(page.locator('[data-testid="btn-save-webhook"]')).toBeDisabled();

        // Fill form
        await page.locator('[data-testid="input-wh-name"]').fill('Teams Webhook');
        await page.locator('[data-testid="input-wh-url"]').fill('https://outlook.office.com/webhook/test');
        await page.locator('[data-testid="input-wh-events"]').fill('asset_deleted, maintenance_created');

        // Save
        await expect(page.locator('[data-testid="btn-save-webhook"]')).toBeEnabled();
        await page.locator('[data-testid="btn-save-webhook"]').click();
        await expect(page.locator('[data-testid="input-wh-name"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('deletes webhook with confirmation', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        // Switch to Webhooks tab
        await page.getByRole('tab', { name: 'Webhooks' }).click();

        page.on('dialog', (dialog: any) => dialog.accept());
        await page.locator('[data-testid="btn-delete-wh"]').first().click();
        await page.waitForLoadState('networkidle');
    });

    test('provider dropdown has all options', async ({ page }) => {
        await page.goto('/integrations');
        await page.waitForLoadState('networkidle');

        await page.locator('[data-testid="btn-new-connector"]').click();

        const select = page.locator('[data-testid="select-provider"]');
        const options = select.locator('option');

        // Should have multiple provider options
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(5);
    });
});
