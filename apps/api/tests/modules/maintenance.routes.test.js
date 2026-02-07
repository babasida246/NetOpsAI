import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import { maintenanceRoutes } from '../../src/routes/v1/maintenance/maintenance.routes.js';
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js';
describe('maintenance routes', () => {
    let app;
    let maintenanceService;
    const ticket = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        assetId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Check',
        severity: 'low',
        status: 'open',
        openedAt: new Date(),
        closedAt: null,
        diagnosis: null,
        resolution: null,
        createdBy: 'user-1',
        correlationId: 'corr-1'
    };
    beforeEach(async () => {
        app = Fastify();
        app.addHook('onRequest', requestIdHook);
        app.setErrorHandler(errorHandler);
        maintenanceService = {
            listTickets: vi.fn().mockResolvedValue({ items: [ticket], total: 1, page: 1, limit: 20 }),
            openTicket: vi.fn().mockResolvedValue(ticket),
            updateTicketStatus: vi.fn().mockResolvedValue({ ...ticket, status: 'closed' })
        };
        await app.register(maintenanceRoutes, { prefix: '/v1', maintenanceService });
    });
    afterEach(async () => {
        await app.close();
    });
    it('lists maintenance tickets', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/maintenance',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' }
        });
        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.data).toHaveLength(1);
    });
    it('rejects write without role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/maintenance',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'viewer' },
            payload: { assetId: ticket.assetId, title: 'Fix', severity: 'low' }
        });
        expect(response.statusCode).toBe(403);
    });
    it('creates maintenance tickets with manager role', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/v1/maintenance',
            headers: { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' },
            payload: { assetId: ticket.assetId, title: 'Fix', severity: 'low' }
        });
        expect(response.statusCode).toBe(201);
    });
});
//# sourceMappingURL=maintenance.routes.test.js.map