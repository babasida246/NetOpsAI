import { test, expect } from '@playwright/test';

/**
 * Automation Page E2E Tests
 * Tests: page load, rules CRUD, scheduled tasks CRUD, notifications display, form validation
 */

// Stub all automation API endpoints with mock data
async function stubAutomationApis(page: any) {
    const okJson = (body: any) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

    const mockRules = [
        {
            id: 'rule-001',
            name: 'Auto-assign maintenance',
            eventType: 'asset_status_change',
            conditions: { status: 'in_repair' },
            actions: { notify: true, assignTo: 'team-a' },
            isActive: true,
            priority: 1,
            createdBy: 'admin-001',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
        },
        {
            id: 'rule-002',
            name: 'Warranty alert',
            eventType: 'warranty_expiring',
            conditions: { daysUntilExpiry: 30 },
            actions: { notify: true },
            isActive: false,
            priority: 5,
            createdBy: 'admin-001',
            createdAt: '2025-01-02T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
        },
    ];

    const mockNotifications = [
        {
            id: 'notif-001',
            userId: 'admin-001',
            type: 'rule_triggered',
            title: 'Maintenance auto-assigned',
            message: 'Asset LAP-001 assigned to team-a',
            isRead: false,
            readAt: null,
            relatedEntityType: 'asset',
            relatedEntityId: 'asset-001',
            createdAt: '2025-01-10T09:00:00Z',
        },
        {
            id: 'notif-002',
            userId: 'admin-001',
            type: 'info',
            title: 'Task completed',
            message: 'Weekly check ran successfully',
            isRead: true,
            readAt: '2025-01-09T10:00:00Z',
            relatedEntityType: null,
            relatedEntityId: null,
            createdAt: '2025-01-09T09:00:00Z',
        },
    ];

    const mockTasks = [
        {
            id: 'task-001',
            name: 'Weekly maintenance check',
            taskType: 'maintenance_check',
            schedule: '0 9 * * 1',
            config: {},
            isActive: true,
            lastRunAt: '2025-01-06T09:00:00Z',
            nextRunAt: '2025-01-13T09:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    // Intercept API routes
    await page.route('**/api/v1/automation/rules', (route: any) => {
        const method = route.request().method();
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockRules }));
        }
        if (method === 'POST') {
            const newRule = {
                id: 'rule-new',
                ...JSON.parse(route.request().postData() || '{}'),
                createdBy: 'admin-001',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            return route.fulfill({ ...okJson({ data: newRule }), status: 201 });
        }
        return route.continue();
    });

    await page.route('**/api/v1/automation/rules/*', (route: any) => {
        const method = route.request().method();
        if (method === 'PUT' || method === 'PATCH') {
            return route.fulfill(okJson({ data: { ...mockRules[0], ...JSON.parse(route.request().postData() || '{}') } }));
        }
        if (method === 'DELETE') {
            return route.fulfill(okJson({ data: { success: true } }));
        }
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockRules[0] }));
        }
        return route.continue();
    });

    await page.route('**/api/v1/notifications*', (route: any) => {
        return route.fulfill(okJson({ data: mockNotifications }));
    });

    await page.route('**/api/v1/automation/tasks', (route: any) => {
        const method = route.request().method();
        if (method === 'GET') {
            return route.fulfill(okJson({ data: mockTasks }));
        }
        if (method === 'POST') {
            const newTask = {
                id: 'task-new',
                ...JSON.parse(route.request().postData() || '{}'),
                lastRunAt: null,
                nextRunAt: null,
                createdAt: new Date().toISOString(),
            };
            return route.fulfill({ ...okJson({ data: newTask }), status: 201 });
        }
        return route.continue();
    });

    await page.route('**/api/v1/automation/tasks/*', (route: any) => {
        if (route.request().method() === 'DELETE') {
            return route.fulfill(okJson({ data: { success: true } }));
        }
        return route.continue();
    });

    // Stub other APIs to prevent 500s
    await page.route('**/api/v1/auth/**', (route: any) => route.continue());
}

test.describe('Automation Page', () => {
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
        await stubAutomationApis(page);
    });

    test('page loads and displays heading', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Check heading is visible
        await expect(page.locator('h1')).toContainText('Workflow Automation');
    });

    test('displays automation rules in table', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Wait for rules to load
        const ruleRows = page.locator('[data-testid="rule-row"]');
        await expect(ruleRows).toHaveCount(2);

        // Verify rule data is displayed
        await expect(ruleRows.first()).toContainText('Auto-assign maintenance');
        await expect(ruleRows.first()).toContainText('Active');
        await expect(ruleRows.nth(1)).toContainText('Warranty alert');
        await expect(ruleRows.nth(1)).toContainText('Inactive');
    });

    test('opens New Rule modal and validates form', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Click New Rule button
        await page.locator('[data-testid="btn-new-rule"]').click();

        // Modal should appear
        await expect(page.locator('[data-testid="input-rule-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-event-type"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-priority"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-conditions"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-actions"]')).toBeVisible();

        // Save button should be disabled when name is empty
        await expect(page.locator('[data-testid="btn-save-rule"]')).toBeDisabled();
    });

    test('creates new automation rule', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Open the New Rule modal
        await page.locator('[data-testid="btn-new-rule"]').click();

        // Fill in the form
        await page.locator('[data-testid="input-rule-name"]').fill('Test Rule E2E');
        await page.locator('[data-testid="select-event-type"]').selectOption('warranty_expiring');
        await page.locator('[data-testid="input-priority"]').fill('3');
        await page.locator('[data-testid="input-conditions"]').fill('{"daysUntilExpiry": 14}');
        await page.locator('[data-testid="input-actions"]').fill('{"notify": true}');

        // Save button should be enabled now
        await expect(page.locator('[data-testid="btn-save-rule"]')).toBeEnabled();

        // Click save
        await page.locator('[data-testid="btn-save-rule"]').click();

        // Modal should close
        await expect(page.locator('[data-testid="input-rule-name"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('edits existing automation rule', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Click edit on first rule
        const editBtns = page.locator('[data-testid="btn-edit-rule"]');
        await editBtns.first().click();

        // Modal should appear with pre-filled data
        await expect(page.locator('[data-testid="input-rule-name"]')).toHaveValue('Auto-assign maintenance');

        // Modify name
        await page.locator('[data-testid="input-rule-name"]').fill('Updated Rule Name');
        await page.locator('[data-testid="btn-save-rule"]').click();

        // Modal should close
        await expect(page.locator('[data-testid="input-rule-name"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('deletes automation rule with confirmation', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Set up dialog handler for confirm dialog
        page.on('dialog', (dialog: any) => dialog.accept());

        // Click delete on first rule
        await page.locator('[data-testid="btn-delete-rule"]').first().click();

        // After delete, the table should reload (stubs return same data, but API was called)
        await page.waitForLoadState('networkidle');
    });

    test('navigates to Notifications tab', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Click Notifications tab
        await page.getByRole('tab', { name: 'Notifications' }).click();

        // Should show notification cards
        await expect(page.getByText('Maintenance auto-assigned')).toBeVisible();
        await expect(page.getByText('Task completed')).toBeVisible();

        // Unread notification should have "New" badge
        await expect(page.getByText('New')).toBeVisible();
    });

    test('navigates to Scheduled Tasks tab', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Click Scheduled Tasks tab
        await page.getByRole('tab', { name: 'Scheduled Tasks' }).click();

        // Should show tasks in table
        const taskRows = page.locator('[data-testid="task-row"]');
        await expect(taskRows).toHaveCount(1);
        await expect(taskRows.first()).toContainText('Weekly maintenance check');
        await expect(taskRows.first()).toContainText('maintenance_check');
    });

    test('creates new scheduled task', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        // Navigate to tasks tab
        await page.getByRole('tab', { name: 'Scheduled Tasks' }).click();

        // Click New Task button
        await page.locator('[data-testid="btn-new-task"]').click();

        // Fill form
        await page.locator('[data-testid="input-task-name"]').fill('Daily Inventory Check');
        await page.locator('[data-testid="select-task-type"]').selectOption('inventory_audit');
        await page.locator('[data-testid="input-schedule"]').fill('0 8 * * *');
        await page.locator('[data-testid="input-task-config"]').fill('{"scope": "all"}');

        // Save
        await expect(page.locator('[data-testid="btn-save-task"]')).toBeEnabled();
        await page.locator('[data-testid="btn-save-task"]').click();

        // Modal should close
        await expect(page.locator('[data-testid="input-task-name"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('save button disabled when task name empty', async ({ page }) => {
        await page.goto('/automation');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Scheduled Tasks' }).click();
        await page.locator('[data-testid="btn-new-task"]').click();

        // Without filling name, save should be disabled
        await expect(page.locator('[data-testid="btn-save-task"]')).toBeDisabled();

        // Fill name
        await page.locator('[data-testid="input-task-name"]').fill('Test');
        await expect(page.locator('[data-testid="btn-save-task"]')).toBeEnabled();

        // Clear name
        await page.locator('[data-testid="input-task-name"]').fill('');
        await expect(page.locator('[data-testid="btn-save-task"]')).toBeDisabled();
    });
});
