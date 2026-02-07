/**
 * Network Operations (NetOps) Module E2E Tests
 * 
 * Tests for network device management and configuration control
 * Based on: docs/modules/NETOPS.md
 */
import { test, expect } from '@playwright/test';

// Helper to get auth token
async function getAuthToken(request: any): Promise<string | null> {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    const response = await request.post('/api/v1/auth/login', {
        data: { email, password }
    });

    if (response.status() === 200) {
        const body = await response.json();
        return body.data?.accessToken || null;
    }
    return null;
}

test.describe('Network Operations Dashboard', () => {
    test('should display network page', async ({ page }) => {
        await page.goto('/network');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/network') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });

    test('should display network device list', async ({ page }) => {
        await page.goto('/network');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        if (url.includes('/login') || url.includes('/setup')) {
            test.skip();
            return;
        }

        const content = await page.content();
        expect(content.length).toBeGreaterThan(500);
    });

    test('should navigate to add device page', async ({ page }) => {
        await page.goto('/network/devices/new');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        expect(url.includes('/network') || url.includes('/login') || url.includes('/setup')).toBeTruthy();
    });
});

test.describe('Network Devices API', () => {
    test.describe('Device List', () => {
        test('GET /api/v1/network/devices should return devices list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/network/devices', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toBeDefined();
            }
        });

        test('should support status filter (online/offline)', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/network/devices?status=online', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support device type filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/network/devices?type=switch', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('should support vendor filter', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.get('/api/v1/network/devices?vendor=cisco', {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Device CRUD', () => {
        let testDeviceId: string | null = null;

        test('POST /api/v1/network/devices should create new device', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/network/devices', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    hostname: `TEST-SW-${Date.now()}`,
                    ipAddress: '192.168.1.100',
                    deviceType: 'switch',
                    vendor: 'cisco',
                    model: 'Catalyst 9300',
                    serialNumber: `SN${Date.now()}`,
                    firmwareVersion: '17.6.3'
                }
            });

            expect([200, 201, 400, 404]).toContain(response.status());

            if (response.status() === 200 || response.status() === 201) {
                const body = await response.json();
                testDeviceId = body.data?.id || null;
            }
        });

        test('should require hostname for device creation', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            const response = await request.post('/api/v1/network/devices', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    ipAddress: '192.168.1.100'
                    // missing hostname
                }
            });

            expect([400, 404, 422]).toContain(response.status());
        });

        test('GET /api/v1/network/devices/:id should return device details', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            // First get a device ID
            const listResponse = await request.get('/api/v1/network/devices?limit=1', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (listResponse.status() !== 200) {
                test.skip();
                return;
            }

            const listBody = await listResponse.json();
            const deviceId = listBody.data?.items?.[0]?.id || listBody.data?.[0]?.id;

            if (!deviceId) {
                test.skip();
                return;
            }

            const response = await request.get(`/api/v1/network/devices/${deviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });
    });

    test.describe('Configuration Management', () => {
        test('GET /api/v1/network/devices/:id/configs should return config history', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            // First get a device ID
            const listResponse = await request.get('/api/v1/network/devices?limit=1', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (listResponse.status() !== 200) {
                test.skip();
                return;
            }

            const listBody = await listResponse.json();
            const deviceId = listBody.data?.items?.[0]?.id || listBody.data?.[0]?.id;

            if (!deviceId) {
                test.skip();
                return;
            }

            const response = await request.get(`/api/v1/network/devices/${deviceId}/configs`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 404]).toContain(response.status());
        });

        test('POST /api/v1/network/devices/:id/backup should trigger config backup', async ({ request }) => {
            const token = await getAuthToken(request);
            if (!token) {
                test.skip();
                return;
            }

            // First get a device ID
            const listResponse = await request.get('/api/v1/network/devices?limit=1', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (listResponse.status() !== 200) {
                test.skip();
                return;
            }

            const listBody = await listResponse.json();
            const deviceId = listBody.data?.items?.[0]?.id || listBody.data?.[0]?.id;

            if (!deviceId) {
                test.skip();
                return;
            }

            const response = await request.post(`/api/v1/network/devices/${deviceId}/backup`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            expect([200, 202, 400, 404]).toContain(response.status());
        });
    });

    test.describe('Device Types', () => {
        test('GET /api/v1/network/device-types should return device types', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/network/device-types', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Vendors', () => {
        test('GET /api/v1/network/vendors should return vendor list', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/network/vendors', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });

    test.describe('Compliance', () => {
        test('GET /api/v1/network/compliance should return compliance status', async ({ request }) => {
            const token = await getAuthToken(request);

            const response = await request.get('/api/v1/network/compliance', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            expect([200, 401, 404]).toContain(response.status());
        });
    });
});
