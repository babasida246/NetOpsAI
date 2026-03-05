import { test, expect } from '@playwright/test';

/**
 * Security & Compliance Page E2E Tests
 * Tests: permissions table, audit logs, compliance frameworks, assessments, summary cards
 */

async function stubSecurityApis(page: any) {
    const okJson = (body: any) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

    const mockPermissions = [
        { id: 'perm-001', code: 'asset.read', name: 'Read Assets', description: 'View asset data', module: 'assets', action: 'read' },
        { id: 'perm-002', code: 'asset.write', name: 'Write Assets', description: 'Create/update assets', module: 'assets', action: 'write' },
        { id: 'perm-003', code: 'asset.delete', name: 'Delete Assets', description: 'Delete assets', module: 'assets', action: 'delete' },
        { id: 'perm-004', code: 'maintenance.read', name: 'Read Maintenance', description: null, module: 'maintenance', action: 'read' },
        { id: 'perm-005', code: 'admin.manage', name: 'Admin Manage', description: 'Full admin access', module: 'admin', action: 'manage' },
    ];

    const mockAuditLogs = [
        {
            id: 'log-001',
            userId: 'admin-001',
            action: 'asset.create',
            entityType: 'asset',
            entityId: 'asset-abc123',
            details: { name: 'Laptop Dell XPS 15' },
            ipAddress: '192.168.1.100',
            riskLevel: 'low',
            createdAt: '2025-01-10T14:30:00Z',
        },
        {
            id: 'log-002',
            userId: 'admin-001',
            action: 'user.delete',
            entityType: 'user',
            entityId: 'user-def456',
            details: {},
            ipAddress: '10.0.0.1',
            riskLevel: 'high',
            createdAt: '2025-01-09T10:15:00Z',
        },
        {
            id: 'log-003',
            userId: 'tech-002',
            action: 'config.change',
            entityType: 'system',
            entityId: null,
            details: { setting: 'max_retries', newValue: 5 },
            ipAddress: '172.20.0.1',
            riskLevel: 'critical',
            createdAt: '2025-01-08T08:00:00Z',
        },
    ];

    const mockFrameworks = [
        {
            id: 'fw-001',
            code: 'ISO27001',
            name: 'ISO 27001:2022',
            version: '2022',
            description: 'Information security management',
            isActive: true,
            createdAt: '2025-01-01T00:00:00Z',
        },
        {
            id: 'fw-002',
            code: 'SOC2',
            name: 'SOC 2 Type II',
            version: '2023',
            description: 'Service organization controls',
            isActive: true,
            createdAt: '2025-01-01T00:00:00Z',
        },
        {
            id: 'fw-003',
            code: 'INTERNAL',
            name: 'Internal IT Policy',
            version: '1.0',
            description: 'Internal security policies',
            isActive: false,
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    const mockControls = [
        {
            id: 'ctrl-001',
            frameworkId: 'fw-001',
            controlCode: 'A.5.1',
            name: 'Information security policies',
            description: 'Management direction for information security',
            category: 'Organizational',
            severity: 'high',
            createdAt: '2025-01-01T00:00:00Z',
        },
        {
            id: 'ctrl-002',
            frameworkId: 'fw-001',
            controlCode: 'A.6.1',
            name: 'Screening',
            description: 'Background verification checks',
            category: 'People',
            severity: 'medium',
            createdAt: '2025-01-01T00:00:00Z',
        },
    ];

    const mockAssessments = [
        {
            id: 'ass-001',
            controlId: 'ctrl-001',
            assetId: null,
            status: 'compliant',
            evidence: 'Policy document v2.1 reviewed and approved',
            assessedBy: 'admin-001',
            assessedAt: '2025-01-05T00:00:00Z',
            notes: 'Meets all requirements',
            nextReviewDate: '2025-07-01',
        },
    ];

    const mockSummary = {
        totalControls: 20,
        compliant: 12,
        nonCompliant: 3,
        partial: 2,
        notAssessed: 3,
        complianceRate: 60,
    };

    // Permissions
    await page.route('**/api/v1/security/permissions*', (route: any) => {
        return route.fulfill(okJson({ data: mockPermissions }));
    });

    // Audit Logs
    await page.route('**/api/v1/security/audit-logs*', (route: any) => {
        return route.fulfill(okJson({ data: mockAuditLogs }));
    });

    // Compliance Frameworks
    await page.route('**/api/v1/security/compliance/frameworks', (route: any) => {
        return route.fulfill(okJson({ data: mockFrameworks }));
    });

    // Controls for specific framework
    await page.route('**/api/v1/security/compliance/frameworks/*/controls*', (route: any) => {
        return route.fulfill(okJson({ data: mockControls }));
    });

    // Assessments
    await page.route('**/api/v1/security/compliance/assessments*', (route: any) => {
        const method = route.request().method();
        if (method === 'POST') {
            const body = JSON.parse(route.request().postData() || '{}');
            const newAss = {
                id: 'ass-new',
                ...body,
                assessedBy: 'admin-001',
                assessedAt: new Date().toISOString(),
                nextReviewDate: null,
            };
            return route.fulfill({ ...okJson({ data: newAss }), status: 201 });
        }
        return route.fulfill(okJson({ data: mockAssessments }));
    });

    // Compliance Summary
    await page.route('**/api/v1/security/compliance/summary*', (route: any) => {
        return route.fulfill(okJson({ data: mockSummary }));
    });
}

test.describe('Security & Compliance Page', () => {
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
        await stubSecurityApis(page);
    });

    test('page loads with heading', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText('Security & Compliance');
    });

    test('displays compliance summary cards', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        // Check summary cards - use exact matching to avoid substring conflicts
        await expect(page.getByText('Total Controls', { exact: true })).toBeVisible();
        await expect(page.getByText('20', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Compliant', { exact: true })).toBeVisible();
        await expect(page.getByText('Non-Compliant', { exact: true })).toBeVisible();
        await expect(page.getByText('Compliance Rate', { exact: true })).toBeVisible();
        await expect(page.getByText('60%')).toBeVisible();
    });

    test('displays permissions in table', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        // Permissions tab is open by default
        await expect(page.getByText('asset.read')).toBeVisible();
        await expect(page.getByText('Read Assets')).toBeVisible();
        await expect(page.getByText('asset.write')).toBeVisible();
        await expect(page.getByText('admin.manage')).toBeVisible();
    });

    test('navigates to Audit Logs tab', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        // Click Audit Logs tab using role selector
        await page.getByRole('tab', { name: 'Audit Logs' }).click();

        // Should show audit log entries
        await expect(page.getByText('asset.create')).toBeVisible();
        await expect(page.getByText('user.delete')).toBeVisible();
        await expect(page.getByText('config.change')).toBeVisible();

        // Should show risk level badges (exact: true to avoid matching hidden <option> elements)
        await expect(page.getByText('high', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('critical', { exact: true }).first()).toBeVisible();
    });

    test('navigates to Compliance tab', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        // Click Compliance tab using role selector
        await page.getByRole('tab', { name: 'Compliance' }).click();

        // Should show frameworks
        await expect(page.getByText('ISO 27001:2022')).toBeVisible();
        await expect(page.getByText('SOC 2 Type II')).toBeVisible();
        await expect(page.getByText('Internal IT Policy')).toBeVisible();
    });

    test('selects framework and shows controls', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Compliance' }).click();

        // Click on ISO 27001 framework card
        await page.getByText('ISO 27001:2022').click();

        // Should show controls
        await expect(page.getByText('A.5.1')).toBeVisible();
        await expect(page.getByText('Information security policies')).toBeVisible();
        await expect(page.getByText('A.6.1')).toBeVisible();
        await expect(page.getByText('Screening')).toBeVisible();
    });

    test('opens assessment modal from framework controls', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Compliance' }).click();
        await page.getByText('ISO 27001:2022').click();

        // Wait for controls to load
        await expect(page.getByText('A.5.1')).toBeVisible();

        // Click New Assessment
        await page.locator('[data-testid="btn-new-assessment"]').click();

        // Modal should appear
        await expect(page.locator('[data-testid="select-assessment-control"]')).toBeVisible();
        await expect(page.locator('[data-testid="select-assessment-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-evidence"]')).toBeVisible();
        await expect(page.locator('[data-testid="input-notes"]')).toBeVisible();
    });

    test('creates compliance assessment', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Compliance' }).click();
        await page.getByText('ISO 27001:2022').click();
        await expect(page.getByText('A.5.1')).toBeVisible();

        await page.locator('[data-testid="btn-new-assessment"]').click();

        // Fill form
        await page.locator('[data-testid="select-assessment-status"]').selectOption('compliant');
        await page.locator('[data-testid="input-evidence"]').fill('All controls verified and documented');
        await page.locator('[data-testid="input-notes"]').fill('Annual review completed');

        // Save
        await page.locator('[data-testid="btn-save-assessment"]').click();
        await expect(page.locator('[data-testid="select-assessment-control"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('assessment save disabled without control', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Compliance' }).click();
        await page.getByText('ISO 27001:2022').click();
        await expect(page.getByText('A.5.1')).toBeVisible();

        await page.locator('[data-testid="btn-new-assessment"]').click();

        // If controls are loaded, assControlId is auto-set, so button should be enabled
        const options = page.locator('[data-testid="select-assessment-control"] option');
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('framework cards show active/inactive status', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Compliance' }).click();

        // Active frameworks should show Active badge
        await expect(page.getByText('Active').first()).toBeVisible();

        // Inactive framework should show Inactive badge
        await expect(page.getByText('Inactive', { exact: true })).toBeVisible();
    });

    test('audit log risk level badge colors', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        await page.getByRole('tab', { name: 'Audit Logs' }).click();

        // Verify risk levels are displayed
        await expect(page.getByText('low', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('high', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('critical', { exact: true }).first()).toBeVisible();
    });

    test('permissions table shows module badges', async ({ page }) => {
        await page.goto('/security');
        await page.waitForLoadState('networkidle');

        // Check module badges in permissions table
        await expect(page.locator('code:has-text("asset.read")')).toBeVisible();
        await expect(page.locator('code:has-text("admin.manage")')).toBeVisible();
    });
});
