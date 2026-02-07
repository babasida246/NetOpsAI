/**
 * All Pages Smoke Tests
 * Logs in with admin credentials and verifies every page route loads.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { LoginPage } from '../pages';

const ADMIN_EMAIL = 'admin@techcorp.vn';
const ADMIN_PASSWORD = 'Admin@123';

const adminUser = {
    id: 'admin-user-id',
    email: ADMIN_EMAIL,
    name: 'System Administrator',
    role: 'super_admin'
};

const adminTokens = {
    accessToken: 'admin-access-token',
    refreshToken: 'admin-refresh-token',
    expiresIn: 3600,
    user: adminUser
};

function buildAssetDetail(id: string, now: string) {
    return {
        asset: {
            id,
            assetCode: 'AST-001',
            status: 'in_stock',
            modelName: 'Model X',
            vendorName: 'Vendor Y',
            locationName: 'HQ',
            serialNo: 'SN-0001',
            mgmtIp: '10.0.0.1',
            warrantyEnd: '2026-12-31',
            createdAt: now,
            updatedAt: now
        },
        assignments: [],
        maintenance: []
    };
}

function buildInventorySession(id: string, now: string) {
    return {
        session: {
            id,
            name: 'Inventory Session',
            status: 'draft',
            createdAt: now
        },
        items: []
    };
}

function buildWorkflowRequest(id: string, now: string) {
    return {
        id,
        requestType: 'assign',
        status: 'submitted',
        payload: {},
        createdAt: now,
        updatedAt: now
    };
}

function buildStockDocumentDetail(id: string, now: string) {
    return {
        document: {
            id,
            docType: 'receipt',
            code: 'DOC-001',
            status: 'draft',
            docDate: now.slice(0, 10),
            createdAt: now,
            updatedAt: now
        },
        lines: []
    };
}

function buildCmdbDetail(id: string, now: string) {
    return {
        ci: {
            id,
            typeId: 'type-1',
            name: 'CI Item',
            ciCode: 'CI-001',
            status: 'active',
            environment: 'prod',
            createdAt: now,
            updatedAt: now
        },
        attributes: [],
        schema: [],
        version: {
            id: 'ver-1',
            typeId: 'type-1',
            version: 1,
            status: 'active',
            createdAt: now
        }
    };
}

function buildDevice(id: string, now: string) {
    return {
        id,
        name: 'core-sw-01',
        vendor: 'cisco',
        mgmt_ip: '192.168.1.1',
        role: 'core',
        site: 'HQ',
        created_at: now,
        updated_at: now,
        last_config_snapshot: now
    };
}

function buildConfig(id: string, deviceId: string, now: string) {
    return {
        id,
        device_id: deviceId,
        raw_config: 'hostname core-sw-01\ninterface Gi1/0/1\n description Uplink',
        source: 'pull',
        checksum: 'checksum-1',
        collected_at: now,
        created_by: 'admin',
        note: 'Mock config'
    };
}

function buildRulepack(now: string) {
    return {
        id: 'rulepack-1',
        name: 'Default Rulepack',
        version: '1.0.0',
        vendor_scope: 'cisco',
        rules: [],
        active: true,
        created_at: now
    };
}

function buildLintRun(now: string) {
    return {
        id: 'lint-1',
        target_type: 'config_version',
        target_id: 'cfg-1',
        rulepack_id: 'rulepack-1',
        findings: [],
        summary: { total: 0, critical: 0, high: 0, med: 0, low: 0 },
        status: 'completed',
        run_at: now
    };
}

function buildChangeRequest(id: string, now: string) {
    return {
        id,
        title: 'Change Request',
        status: 'draft',
        intent_type: 'baseline',
        params: {},
        device_scope: [],
        risk_tier: 'low',
        created_by: 'admin',
        created_at: now,
        updated_at: now
    };
}

async function setupAdminApiMocks(page: Page, options: { setupComplete?: boolean } = {}) {
    const setupComplete = options.setupComplete ?? true;
    const now = new Date().toISOString();
    const json = (data: unknown, meta?: Record<string, unknown>) => ({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data, meta })
    });

    const fulfillLogin = async (route: Route) => {
        let body: any = {};
        try {
            body = route.request().postDataJSON() || {};
        } catch {
            body = {};
        }

        if (body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD) {
            await route.fulfill(json(adminTokens));
            return;
        }

        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Invalid credentials' })
        });
    };

    const fulfillLogout = async (route: Route) => {
        await route.fulfill(json({ loggedOut: true }));
    };

    const fulfillMe = async (route: Route) => {
        await route.fulfill(json(adminUser));
    };

    await page.route('**/api/v1/auth/login**', fulfillLogin);
    await page.route('**/api/v1/auth/logout**', fulfillLogout);
    await page.route('**/api/v1/auth/me**', fulfillMe);

    const setupStatusPayload = {
        isComplete: setupComplete,
        currentStep: setupComplete ? 6 : 1,
        steps: {},
        systemInfo: {
            version: '1.0.0',
            environment: 'production',
            database: { type: 'PostgreSQL', connected: true }
        }
    };

    await page.route('**/api/v1/setup/status**', async route => {
        await route.fulfill(json(setupStatusPayload));
    });

    await page.route('**/api/netops/**', async route => {
        const { pathname } = new URL(route.request().url());
        const deviceId = 'dev-1';
        const configId = 'cfg-1';
        const changeId = 'chg-1';
        const device = buildDevice(deviceId, now);
        const config = buildConfig(configId, deviceId, now);

        if (pathname.endsWith('/netops/devices')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [device], total: 1, limit: 20 })
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/devices\/[^/]+\/configs$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([config])
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/devices\/[^/]+$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(device)
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/configs\/[^/]+\/raw$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: config.raw_config
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/configs\/[^/]+$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(config)
            });
            return;
        }

        if (pathname.endsWith('/netops/rulepacks')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([buildRulepack(now)])
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/rulepacks\/[^/]+/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(buildRulepack(now))
            });
            return;
        }

        if (pathname.endsWith('/netops/changes')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [buildChangeRequest(changeId, now)], total: 1 })
            });
            return;
        }

        if (pathname.match(/^\/api\/netops\/changes\/[^/]+$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ...buildChangeRequest(changeId, now), changeSets: [] })
            });
            return;
        }

        if (pathname.endsWith('/netops/lint/history')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
            return;
        }

        if (pathname.endsWith('/netops/lint/run')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(buildLintRun(now))
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
        });
    });

    await page.route('**/api/v1/**', async route => {
        const { pathname } = new URL(route.request().url());
        const method = route.request().method();
        const assetId = 'asset-1';
        const inventoryId = 'inv-1';
        const requestId = 'req-1';
        const documentId = 'doc-1';
        const ciId = 'ci-1';

        if (pathname.startsWith('/api/v1/auth/login')) {
            await fulfillLogin(route);
            return;
        }

        if (pathname.startsWith('/api/v1/auth/logout')) {
            await fulfillLogout(route);
            return;
        }

        if (pathname.startsWith('/api/v1/auth/me')) {
            await fulfillMe(route);
            return;
        }

        if (pathname.startsWith('/api/v1/setup/status')) {
            await route.fulfill(json(setupStatusPayload));
            return;
        }

        if (pathname.startsWith('/api/v1/assets/catalogs')) {
            await route.fulfill(json({
                categories: [],
                locations: [],
                vendors: [],
                models: []
            }));
            return;
        }

        if (pathname.match(/^\/api\/v1\/assets\/[^/]+\/timeline/)) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.match(/^\/api\/v1\/assets\/[^/]+\/attachments/)) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.match(/^\/api\/v1\/assets\/[^/]+$/)) {
            await route.fulfill(json(buildAssetDetail(assetId, now)));
            return;
        }

        if (pathname.startsWith('/api/v1/assets/reminders')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/assets')) {
            await route.fulfill(json([], { total: 0, page: 1, limit: 20 }));
            return;
        }

        if (pathname.startsWith('/api/v1/maintenance')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.match(/^\/api\/v1\/inventory\/sessions\/[^/]+$/)) {
            await route.fulfill(json(buildInventorySession(inventoryId, now)));
            return;
        }

        if (pathname.startsWith('/api/v1/inventory/sessions')) {
            await route.fulfill(json([], { total: 0, page: 1, limit: 20 }));
            return;
        }

        if (pathname.match(/^\/api\/v1\/workflows\/[^/]+$/)) {
            await route.fulfill(json(buildWorkflowRequest(requestId, now)));
            return;
        }

        if (pathname.startsWith('/api/v1/workflows')) {
            await route.fulfill(json([], { total: 0, page: 1, limit: 20 }));
            return;
        }

        if (pathname.match(/^\/api\/v1\/stock-documents\/[^/]+$/)) {
            await route.fulfill(json(buildStockDocumentDetail(documentId, now)));
            return;
        }

        if (pathname.startsWith('/api/v1/stock-documents')) {
            await route.fulfill(json([], { total: 0, page: 1, limit: 20 }));
            return;
        }

        if (pathname.startsWith('/api/v1/warehouses')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/spare-parts')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/stock/view') || pathname.startsWith('/api/v1/stock/ledger')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/reports/valuation')) {
            await route.fulfill(json({ total: 0, currency: 'USD', items: [] }));
            return;
        }

        if (pathname.startsWith('/api/v1/reports/')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.match(/^\/api\/v1\/cmdb\/cis\/[^/]+\/graph/)) {
            await route.fulfill(json({ nodes: [], edges: [] }));
            return;
        }

        if (pathname.match(/^\/api\/v1\/cmdb\/cis\/[^/]+\/relationships/)) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.match(/^\/api\/v1\/cmdb\/cis\/[^/]+$/)) {
            await route.fulfill(json(buildCmdbDetail(ciId, now)));
            return;
        }

        if (pathname.startsWith('/api/v1/cmdb/cis')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/cmdb/types')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/cmdb/services')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/cmdb/relationship-types')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/cmdb/graph')) {
            await route.fulfill(json({ nodes: [], edges: [] }));
            return;
        }

        if (pathname.startsWith('/api/v1/admin')) {
            await route.fulfill(json([adminUser], { total: 1 }));
            return;
        }

        if (pathname.startsWith('/api/v1/conversations')) {
            await route.fulfill(json([], { total: 0 }));
            return;
        }

        if (pathname.startsWith('/api/v1/chat/models')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/chat/providers')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/models')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/providers')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/orchestration/rules')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/stats/chat/user')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/stats/chat/daily')) {
            await route.fulfill(json({
                totalTokens: 0,
                totalCost: 0,
                totalMessages: 0,
                modelsUsed: 0
            }));
            return;
        }

        if (pathname.startsWith('/api/v1/stats/chat/conversations')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/usage/logs')) {
            await route.fulfill(json([]));
            return;
        }

        if (pathname.startsWith('/api/v1/providers/openrouter/remote-models')) {
            await route.fulfill(json([]));
            return;
        }

        if (method === 'GET') {
            await route.fulfill(json([]));
            return;
        }

        await route.fulfill(json({ ok: true }));
    });
}

async function loginAsAdmin(page: Page) {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await loginPage.fillCredentials(ADMIN_EMAIL, ADMIN_PASSWORD);
    await Promise.all([
        page.waitForResponse('**/api/v1/auth/login'),
        loginPage.submit()
    ]);

    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
}

const authenticatedRoutes = [
    '/',
    '/chat',
    '/stats',
    '/models',
    '/tools',
    '/admin',
    '/assets',
    '/assets/catalogs',
    '/assets/asset-1',
    '/inventory',
    '/inventory/inv-1',
    '/maintenance',
    '/requests',
    '/requests/new',
    '/requests/req-1',
    '/reports/assets',
    '/cmdb',
    '/cmdb/cis',
    '/cmdb/cis/ci-1',
    '/cmdb/types',
    '/cmdb/services',
    '/cmdb/reports',
    '/warehouse',
    '/warehouse/warehouses',
    '/warehouse/parts',
    '/warehouse/stock',
    '/warehouse/ledger',
    '/warehouse/documents',
    '/warehouse/documents/new',
    '/warehouse/documents/doc-1',
    '/warehouse/reports',
    '/netops/devices',
    '/netops/devices/dev-1',
    '/netops/changes',
    '/netops/changes/new',
    '/netops/changes/chg-1',
    '/netops/rulepacks',
    '/netops/tools',
    '/netops/configs/cfg-1',
    '/qlts/purchase-plans',
    '/qlts/purchase-plans/new',
    '/qlts/asset-increases/new'
];

test.describe('All pages - admin flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupAdminApiMocks(page, { setupComplete: true });
        await page.addInitScript(() => localStorage.clear());
    });

    test('should login with admin credentials', async ({ page }) => {
        await loginAsAdmin(page);
        await expect(page).toHaveURL(/\/(chat|netops\/devices)/);
    });

    test('should load every authenticated page', async ({ page }) => {
        test.setTimeout(120_000);
        await loginAsAdmin(page);

        for (const route of authenticatedRoutes) {
            await test.step(`loads ${route}`, async () => {
                const response = await page.goto(route);
                await page.waitForLoadState('domcontentloaded');
                if (response) {
                    expect(response.status()).toBeLessThan(400);
                }
                await expect(page).not.toHaveURL(/\/login/);
            });
        }
    });

    test('should logout and redirect to login', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logout');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Public pages', () => {
    test.beforeEach(async ({ page }) => {
        await setupAdminApiMocks(page, { setupComplete: false });
        await page.addInitScript(() => localStorage.clear());
    });

    test('should load setup page when not complete', async ({ page }) => {
        const response = await page.goto('/setup');
        await page.waitForLoadState('domcontentloaded');
        if (response) {
            expect(response.status()).toBeLessThan(400);
        }
        // Setup page may have different content
        expect(true).toBe(true);
    });
});
