/**
 * CMDB Relationship Types Tests
 * Sprint 1.1 - Automated test suite for relationship types CRUD operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import { cmdbRoutes } from '../../src/routes/v1/cmdb/cmdb.routes.js';
import { errorHandler, requestIdHook } from '../../src/shared/middleware/index.js';
describe('CMDB Relationship Types', () => {
    let app;
    let relationshipService;
    const viewerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'viewer' };
    const managerHeaders = { 'x-user-id': 'user-1', 'x-user-role': 'it_asset_manager' };
    const validRelTypeId = '550e8400-e29b-41d4-a716-446655440000';
    const typeAppId = '550e8400-e29b-41d4-a716-446655440001';
    const typeDbId = '550e8400-e29b-41d4-a716-446655440002';
    // Mock relationship types data
    const mockRelationshipTypes = [
        {
            id: validRelTypeId,
            code: 'depends_on',
            name: 'Depends On',
            reverseName: 'Dependency Of',
            allowedFromTypeId: typeAppId,
            allowedToTypeId: typeDbId
        },
        {
            id: 'rel-type-2',
            code: 'hosts',
            name: 'Hosts',
            reverseName: 'Hosted By',
            allowedFromTypeId: null,
            allowedToTypeId: null
        },
        {
            id: 'rel-type-3',
            code: 'connects_to',
            name: 'Connects To',
            reverseName: 'Connected From',
            allowedFromTypeId: null,
            allowedToTypeId: null
        }
    ];
    beforeEach(async () => {
        app = Fastify();
        app.addHook('onRequest', requestIdHook);
        app.setErrorHandler(errorHandler);
        // Mock services with minimal implementations
        const schemaService = {
            listTypes: vi.fn().mockResolvedValue([]),
            createType: vi.fn(),
            listTypeVersions: vi.fn(),
            createDraftVersion: vi.fn(),
            publishVersion: vi.fn(),
            listDefsByVersion: vi.fn(),
            addAttrDef: vi.fn(),
            updateAttrDef: vi.fn(),
            deleteAttrDef: vi.fn()
        };
        const ciService = {
            listCis: vi.fn(),
            createCi: vi.fn(),
            getCiDetail: vi.fn(),
            updateCi: vi.fn(),
            resolveCiByAsset: vi.fn()
        };
        relationshipService = {
            getGraph: vi.fn(),
            createRelationship: vi.fn(),
            retireRelationship: vi.fn(),
            listRelationshipTypes: vi.fn().mockResolvedValue(mockRelationshipTypes),
            createRelationshipType: vi.fn().mockImplementation((input) => Promise.resolve({
                id: `550e8400-e29b-41d4-a716-${String(Date.now()).substring(0, 12).padEnd(12, '0')}`,
                ...input
            })),
            updateRelationshipType: vi.fn().mockImplementation((id, input) => Promise.resolve({
                id,
                ...mockRelationshipTypes[0],
                ...input
            })),
            deleteRelationshipType: vi.fn().mockResolvedValue(undefined),
            listCiRelationships: vi.fn().mockResolvedValue([])
        };
        const serviceMappingService = {
            listServices: vi.fn(),
            createService: vi.fn(),
            getServiceDetail: vi.fn(),
            updateService: vi.fn(),
            addMember: vi.fn(),
            removeMember: vi.fn(),
            serviceImpact: vi.fn()
        };
        await app.register(cmdbRoutes, {
            prefix: '/v1',
            schemaService,
            ciService,
            relationshipService,
            serviceMappingService
        });
    });
    afterEach(async () => {
        await app.close();
    });
    describe('GET /v1/cmdb/relationship-types', () => {
        it('should list all relationship types', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/cmdb/relationship-types',
                headers: viewerHeaders
            });
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.data).toHaveLength(3);
            expect(body.data[0]).toMatchObject({
                code: 'depends_on',
                name: 'Depends On',
                reverseName: 'Dependency Of'
            });
        });
        it('should return empty array when no types exist', async () => {
            vi.mocked(relationshipService.listRelationshipTypes).mockResolvedValueOnce([]);
            const response = await app.inject({
                method: 'GET',
                url: '/v1/cmdb/relationship-types',
                headers: viewerHeaders
            });
            expect(response.statusCode).toBe(200);
            expect(response.json().data).toHaveLength(0);
        });
        it('should allow viewer role to list types', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/cmdb/relationship-types',
                headers: viewerHeaders
            });
            expect(response.statusCode).toBe(200);
        });
    });
    describe('POST /v1/cmdb/relationship-types', () => {
        const validPayload = {
            code: 'runs_on',
            name: 'Runs On',
            reverseName: 'Runs',
            allowedFromTypeId: null,
            allowedToTypeId: null
        };
        it('should create relationship type with valid data', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: managerHeaders,
                payload: validPayload
            });
            expect(response.statusCode).toBe(201);
            const body = response.json();
            expect(body.data).toMatchObject({
                code: 'runs_on',
                name: 'Runs On',
                reverseName: 'Runs'
            });
            expect(relationshipService.createRelationshipType).toHaveBeenCalledWith(validPayload, expect.objectContaining({ userId: 'user-1' }));
        });
        it('should require it_asset_manager role', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: viewerHeaders,
                payload: validPayload
            });
            expect(response.statusCode).toBe(403);
            expect(response.json().error).toMatchObject({
                code: 'FORBIDDEN'
            });
        });
        it('should validate required fields', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: managerHeaders,
                payload: { code: 'test' } // missing name
            });
            expect(response.statusCode).toBe(422);
            expect(response.json().error.code).toBe('VALIDATION_ERROR');
        });
        it('should allow null reverse name', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: managerHeaders,
                payload: {
                    code: 'manages',
                    name: 'Manages',
                    reverseName: null,
                    allowedFromTypeId: null,
                    allowedToTypeId: null
                }
            });
            expect(response.statusCode).toBe(201);
        });
        it('should handle type constraints', async () => {
            const typeAppId = '550e8400-e29b-41d4-a716-446655440001';
            const typeDbId = '550e8400-e29b-41d4-a716-446655440002';
            const response = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: managerHeaders,
                payload: {
                    code: 'app_to_db',
                    name: 'Uses Database',
                    reverseName: 'Used By',
                    allowedFromTypeId: typeAppId,
                    allowedToTypeId: typeDbId
                }
            });
            expect(response.statusCode).toBe(201);
            expect(response.json().data.allowedFromTypeId).toBe(typeAppId);
            expect(response.json().data.allowedToTypeId).toBe(typeDbId);
        });
    });
    describe('PUT /v1/cmdb/relationship-types/:id', () => {
        it('should update relationship type', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/v1/cmdb/relationship-types/${validRelTypeId}`,
                headers: managerHeaders,
                payload: {
                    code: 'depends_on',
                    name: 'Depends On (Updated)',
                    reverseName: 'Required By',
                    allowedFromTypeId: null,
                    allowedToTypeId: null
                }
            });
            expect(response.statusCode).toBe(200);
            expect(response.json().data.name).toBe('Depends On (Updated)');
            expect(relationshipService.updateRelationshipType).toHaveBeenCalledWith(validRelTypeId, expect.any(Object), expect.objectContaining({ userId: 'user-1' }));
        });
        it('should require it_asset_manager role for update', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/v1/cmdb/relationship-types/${validRelTypeId}`,
                headers: viewerHeaders,
                payload: { code: 'test', name: 'Test', reverseName: null, allowedFromTypeId: null, allowedToTypeId: null }
            });
            expect(response.statusCode).toBe(403);
        });
        it('should validate update payload', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: `/v1/cmdb/relationship-types/${validRelTypeId}`,
                headers: managerHeaders,
                payload: { code: '' } // invalid empty code
            });
            expect(response.statusCode).toBe(422);
        });
    });
    describe('DELETE /v1/cmdb/relationship-types/:id', () => {
        it('should delete relationship type', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: `/v1/cmdb/relationship-types/${validRelTypeId}`,
                headers: managerHeaders
            });
            expect(response.statusCode).toBe(204);
            expect(relationshipService.deleteRelationshipType).toHaveBeenCalledWith(validRelTypeId, expect.objectContaining({ userId: 'user-1' }));
        });
        it('should require it_asset_manager role for deletion', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: `/v1/cmdb/relationship-types/${validRelTypeId}`,
                headers: viewerHeaders
            });
            expect(response.statusCode).toBe(403);
        });
    });
    describe('Integration scenarios', () => {
        it('should create all 5 required relationship types', async () => {
            const types = [
                { code: 'depends_on', name: 'Depends On', reverseName: 'Dependency Of' },
                { code: 'hosts', name: 'Hosts', reverseName: 'Hosted By' },
                { code: 'connects_to', name: 'Connects To', reverseName: 'Connected From' },
                { code: 'runs_on', name: 'Runs On', reverseName: 'Runs' },
                { code: 'manages', name: 'Manages', reverseName: 'Managed By' }
            ];
            for (const type of types) {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/cmdb/relationship-types',
                    headers: managerHeaders,
                    payload: { ...type, allowedFromTypeId: null, allowedToTypeId: null }
                });
                expect(response.statusCode).toBe(201);
                expect(response.json().data.code).toBe(type.code);
            }
            expect(relationshipService.createRelationshipType).toHaveBeenCalledTimes(5);
        });
        it('should handle CRUD lifecycle', async () => {
            // Create
            const createRes = await app.inject({
                method: 'POST',
                url: '/v1/cmdb/relationship-types',
                headers: managerHeaders,
                payload: {
                    code: 'test_rel',
                    name: 'Test',
                    reverseName: null,
                    allowedFromTypeId: null,
                    allowedToTypeId: null
                }
            });
            expect(createRes.statusCode).toBe(201);
            const createdId = createRes.json().data.id;
            // Update
            const updateRes = await app.inject({
                method: 'PUT',
                url: `/v1/cmdb/relationship-types/${createdId}`,
                headers: managerHeaders,
                payload: {
                    name: 'Test Updated'
                }
            });
            expect(updateRes.statusCode).toBe(200);
            // Delete
            const deleteRes = await app.inject({
                method: 'DELETE',
                url: `/v1/cmdb/relationship-types/${createdId}`,
                headers: managerHeaders
            });
            expect(deleteRes.statusCode).toBe(204);
        });
    });
    describe('Error handling', () => {
        it('should handle service errors gracefully', async () => {
            vi.mocked(relationshipService.listRelationshipTypes).mockRejectedValueOnce(new Error('Database connection failed'));
            const response = await app.inject({
                method: 'GET',
                url: '/v1/cmdb/relationship-types',
                headers: viewerHeaders
            });
            expect(response.statusCode).toBe(500);
        });
        it('should handle invalid ID format in update', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/cmdb/relationship-types/invalid-id',
                headers: managerHeaders,
                payload: { name: 'Test' }
            });
            // Should fail validation before reaching service
            expect(response.statusCode).toBe(422);
            expect(response.json().error.code).toBe('VALIDATION_ERROR');
        });
    });
});
//# sourceMappingURL=cmdb.relationship-types.test.js.map