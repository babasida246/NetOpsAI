/**
 * NetOps Module Tests
 * Tests for network operations device management, configurations, lint, and changes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPool, testUser } from '../utils.js';
import { NetOpsService } from '../../src/modules/netops/netops.service.js';
import { NetOpsRepository } from '../../src/modules/netops/netops.repository.js';
import { NotFoundError, BadRequestError } from '../../src/shared/errors/http-errors.js';
describe('NetOpsRepository', () => {
    let repo;
    let mockPool;
    beforeEach(() => {
        mockPool = createMockPool();
        repo = new NetOpsRepository(mockPool);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Devices', () => {
        const mockDevice = {
            id: 'device-001',
            name: 'core-switch-01',
            hostname: 'core-sw-01.example.com',
            mgmt_ip: '192.168.1.1',
            vendor: 'cisco',
            model: 'Catalyst 9300',
            os_version: '17.3.1',
            serial_number: 'ABC123456',
            role: 'core',
            location: 'DC1-R1',
            site: 'headquarters',
            status: 'active',
            tags: ['production', 'critical'],
            notes: 'Main core switch',
            created_at: new Date(),
            updated_at: new Date(),
            last_seen_at: new Date(),
            created_by: testUser.id
        };
        it('should find device by ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockDevice] });
            const device = await repo.findDeviceById('device-001');
            expect(device).toBeDefined();
            expect(device?.id).toBe('device-001');
            expect(device?.name).toBe('core-switch-01');
            expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['device-001']);
        });
        it('should return null for non-existent device', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            const device = await repo.findDeviceById('non-existent');
            expect(device).toBeNull();
        });
        it('should create a new device', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockDevice] });
            const created = await repo.createDevice({
                name: 'core-switch-01',
                hostname: 'core-sw-01.example.com',
                mgmtIp: '192.168.1.1',
                vendor: 'cisco',
                model: 'Catalyst 9300',
                osVersion: '17.3.1',
                role: 'core',
                location: 'DC1-R1',
                site: 'headquarters',
                status: 'active',
                tags: ['production'],
                notes: 'Test device'
            });
            expect(created).toBeDefined();
            expect(created.name).toBe('core-switch-01');
            expect(mockPool.query).toHaveBeenCalled();
        });
        it('should update an existing device', async () => {
            const updatedDevice = { ...mockDevice, name: 'core-switch-01-updated' };
            mockPool.query.mockResolvedValue({ rows: [updatedDevice] });
            const updated = await repo.updateDevice('device-001', { name: 'core-switch-01-updated' });
            expect(updated?.name).toBe('core-switch-01-updated');
        });
        it('should delete a device', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });
            const deleted = await repo.deleteDevice('device-001');
            expect(deleted).toBe(true);
        });
        it('should find all devices with filters', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockDevice] });
            const devices = await repo.findAllDevices({ vendor: 'cisco', status: 'active' });
            expect(devices).toHaveLength(1);
            expect(devices[0].vendor).toBe('cisco');
        });
        it('should count devices with filters', async () => {
            mockPool.query.mockResolvedValue({ rows: [{ count: '5' }] });
            const count = await repo.countDevices({ vendor: 'cisco' });
            expect(count).toBe(5);
        });
    });
    describe('Configurations', () => {
        const mockConfig = {
            id: 'config-001',
            device_id: 'device-001',
            config_type: 'running',
            raw_config: 'hostname test-router\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0',
            normalized_config: null,
            parser_version: null,
            parse_errors: null,
            source: 'pull',
            collected_by: testUser.id,
            collected_at: new Date(),
            checksum: 'sha256:abc123'
        };
        it('should create a config version', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockConfig] });
            const config = await repo.createConfigVersion({
                deviceId: 'device-001',
                configType: 'running',
                rawConfig: 'hostname test-router',
                source: 'pull',
                collectedBy: testUser.id
            });
            expect(config).toBeDefined();
            expect(config.deviceId).toBe('device-001');
        });
        it('should find configs by device ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockConfig, { ...mockConfig, id: 'config-002' }] });
            const configs = await repo.findConfigsByDeviceId('device-001', 10);
            expect(configs).toHaveLength(2);
        });
        it('should find config by ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockConfig] });
            const config = await repo.findConfigById('config-001');
            expect(config?.id).toBe('config-001');
        });
        it('should get raw config', async () => {
            mockPool.query.mockResolvedValue({ rows: [{ raw_config: mockConfig.raw_config }] });
            const raw = await repo.getConfigRaw('config-001');
            expect(raw).toContain('hostname test-router');
        });
        it('should update normalized config', async () => {
            const normalizedConfig = {
                schemaVersion: 'v1',
                device: { hostname: 'test-router', vendor: 'cisco' },
                interfaces: [],
                vlans: [],
                routing: { static: [], ospf: [], bgp: [] },
                security: { acls: [], users: [], aaa: null },
                mgmt: { ssh: null, snmp: null, ntp: null, logging: null }
            };
            mockPool.query.mockResolvedValue({ rowCount: 1 });
            await repo.updateConfigNormalized('config-001', normalizedConfig, '1.0.0', []);
            expect(mockPool.query).toHaveBeenCalled();
        });
    });
    describe('Rulepacks', () => {
        const mockRulepack = {
            id: 'rulepack-001',
            name: 'baseline-security',
            version: '1.0.0',
            description: 'Baseline security rules',
            vendor_scope: ['cisco', 'mikrotik'],
            rules: [
                { id: 'SEC-001', name: 'No plaintext passwords', severity: 'critical', enabled: true }
            ],
            rule_count: 1,
            is_active: true,
            created_by: testUser.id,
            created_at: new Date()
        };
        it('should create a rulepack', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockRulepack] });
            const rulepack = await repo.createRulepack({
                name: 'baseline-security',
                version: '1.0.0',
                description: 'Baseline security rules',
                vendorScope: ['cisco', 'mikrotik'],
                rules: mockRulepack.rules,
                createdBy: testUser.id
            });
            expect(rulepack).toBeDefined();
            expect(rulepack.name).toBe('baseline-security');
        });
        it('should find all rulepacks', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockRulepack] });
            const rulepacks = await repo.findAllRulepacks();
            expect(rulepacks).toHaveLength(1);
        });
        it('should find active rulepacks', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockRulepack] });
            const rulepacks = await repo.findActiveRulepacks();
            expect(rulepacks[0].isActive).toBe(true);
        });
        it('should activate a rulepack', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ name: 'baseline-security' }] }) // get name
                .mockResolvedValueOnce({ rowCount: 1 }) // deactivate others
                .mockResolvedValueOnce({ rowCount: 1 }); // activate this one
            await repo.activateRulepack('rulepack-001');
            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });
    });
    describe('Lint Runs', () => {
        const mockLintRun = {
            id: 'lint-001',
            target_type: 'config_version',
            target_id: 'config-001',
            rulepack_id: 'rulepack-001',
            status: 'completed',
            findings: [],
            summary: { passed: true, total: 10, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
            rules_evaluated: 10,
            rules_passed: 10,
            rules_failed: 0,
            rules_skipped: 0,
            duration_ms: 150,
            triggered_by: testUser.id,
            created_at: new Date()
        };
        it('should create a lint run', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockLintRun] });
            const lintRun = await repo.createLintRun({
                targetType: 'config_version',
                targetId: 'config-001',
                rulepackId: 'rulepack-001',
                triggeredBy: testUser.id
            });
            expect(lintRun).toBeDefined();
            expect(lintRun.status).toBe('pending');
        });
        it('should update lint run results', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });
            await repo.updateLintRun('lint-001', {
                status: 'completed',
                findings: [],
                summary: { passed: true, total: 10, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
                rulesEvaluated: 10,
                rulesPassed: 10,
                rulesFailed: 0,
                rulesSkipped: 0,
                durationMs: 150
            });
            expect(mockPool.query).toHaveBeenCalled();
        });
        it('should find lint runs by target', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockLintRun] });
            const runs = await repo.findLintRunsByTarget('config_version', 'config-001');
            expect(runs).toHaveLength(1);
        });
    });
    describe('Change Requests', () => {
        const mockChange = {
            id: 'change-001',
            title: 'Update VLAN configuration',
            description: 'Add VLAN 100 for guest network',
            change_type: 'vlan',
            device_scope: ['device-001', 'device-002'],
            scheduled_at: new Date(),
            risk_level: 'medium',
            status: 'draft',
            created_by: testUser.id,
            created_at: new Date(),
            updated_at: new Date()
        };
        it('should create a change request', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockChange] });
            const change = await repo.createChange({
                title: 'Update VLAN configuration',
                description: 'Add VLAN 100 for guest network',
                changeType: 'vlan',
                deviceScope: ['device-001', 'device-002'],
                riskLevel: 'medium',
                createdBy: testUser.id
            });
            expect(change).toBeDefined();
            expect(change.title).toBe('Update VLAN configuration');
            expect(change.status).toBe('draft');
        });
        it('should find all changes with filters', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockChange] });
            const changes = await repo.findAllChanges({ status: 'draft' });
            expect(changes).toHaveLength(1);
        });
        it('should update change status', async () => {
            mockPool.query.mockResolvedValue({ rowCount: 1 });
            await repo.updateChangeStatus('change-001', 'planned');
            expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), ['planned', 'change-001']);
        });
    });
    describe('Audit Events', () => {
        it('should log an audit event', async () => {
            mockPool.query.mockResolvedValue({ rows: [{ id: 'audit-001' }] });
            await repo.logAuditEvent({
                eventType: 'device.created',
                actorId: testUser.id,
                resourceType: 'device',
                resourceId: 'device-001',
                action: 'create',
                details: { name: 'test-device' }
            });
            expect(mockPool.query).toHaveBeenCalled();
        });
    });
});
describe('NetOpsService', () => {
    let service;
    let mockPool;
    const auditCtx = {
        userId: testUser.id,
        userRole: testUser.role,
        requestId: 'req-001',
        ip: '127.0.0.1'
    };
    beforeEach(() => {
        mockPool = createMockPool();
        service = new NetOpsService(mockPool);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Device Operations', () => {
        const mockDevice = {
            id: 'device-001',
            name: 'core-switch-01',
            hostname: 'core-sw-01.example.com',
            mgmt_ip: '192.168.1.1',
            vendor: 'cisco',
            model: 'Catalyst 9300',
            os_version: '17.3.1',
            serial_number: 'ABC123456',
            role: 'core',
            location: 'DC1-R1',
            site: 'headquarters',
            status: 'active',
            tags: ['production'],
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            last_seen_at: null,
            created_by: testUser.id
        };
        it('should get device by ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockDevice] });
            const device = await service.getDeviceById('device-001');
            expect(device.id).toBe('device-001');
        });
        it('should throw NotFoundError for non-existent device', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            await expect(service.getDeviceById('non-existent')).rejects.toThrow(NotFoundError);
        });
        it('should create a device with audit', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockDevice] }) // create device
                .mockResolvedValueOnce({ rows: [{ id: 'audit-001' }] }); // audit event
            const device = await service.createDevice({
                name: 'core-switch-01',
                hostname: 'core-sw-01.example.com',
                mgmtIp: '192.168.1.1',
                vendor: 'cisco',
                role: 'core',
                status: 'active'
            }, auditCtx);
            expect(device.name).toBe('core-switch-01');
        });
        it('should import multiple devices', async () => {
            const devices = [
                { name: 'switch-01', hostname: 'sw-01.example.com', mgmtIp: '10.0.0.1', vendor: 'cisco', role: 'access', status: 'active' },
                { name: 'switch-02', hostname: 'sw-02.example.com', mgmtIp: '10.0.0.2', vendor: 'cisco', role: 'access', status: 'active' }
            ];
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ ...mockDevice, id: 'd1', name: 'switch-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'audit-001' }] })
                .mockResolvedValueOnce({ rows: [{ ...mockDevice, id: 'd2', name: 'switch-02' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'audit-002' }] });
            const result = await service.importDevices(devices, auditCtx);
            expect(result.created).toBe(2);
            expect(result.errors).toHaveLength(0);
        });
    });
    describe('Configuration Operations', () => {
        const mockConfig = {
            id: 'config-001',
            device_id: 'device-001',
            config_type: 'running',
            raw_config: 'hostname test-router',
            normalized_config: null,
            parser_version: null,
            parse_errors: null,
            source: 'upload',
            collected_by: testUser.id,
            collected_at: new Date(),
            checksum: 'sha256:abc123'
        };
        const mockDevice = {
            id: 'device-001',
            name: 'test-router',
            hostname: 'test-router.example.com',
            mgmt_ip: '10.0.0.1',
            vendor: 'cisco',
            status: 'active',
            role: 'core'
        };
        it('should upload a config with redaction', async () => {
            const configWithPassword = `hostname test-router
enable secret cisco123
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0`;
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockDevice] }) // find device
                .mockResolvedValueOnce({ rows: [mockConfig] }) // create config
                .mockResolvedValueOnce({ rows: [{ id: 'audit-001' }] }); // audit
            const config = await service.uploadConfig({
                deviceId: 'device-001',
                configType: 'running',
                rawConfig: configWithPassword,
                source: 'upload'
            }, auditCtx);
            expect(config).toBeDefined();
        });
        it('should get config diff', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ raw_config: 'line 1\nline 2\nline 3' }] })
                .mockResolvedValueOnce({ rows: [{ raw_config: 'line 1\nline 2 modified\nline 3' }] });
            const diff = await service.getConfigDiff('config-001', 'config-002');
            expect(diff.diff).toContain('- line 2');
            expect(diff.diff).toContain('+ line 2 modified');
        });
    });
    describe('Lint Operations', () => {
        const mockLintRun = {
            id: 'lint-001',
            target_type: 'config_version',
            target_id: 'config-001',
            rulepack_id: 'rulepack-001',
            status: 'pending',
            triggered_by: testUser.id,
            created_at: new Date()
        };
        const mockRulepack = {
            id: 'rulepack-001',
            name: 'baseline',
            version: '1.0.0',
            rules: [
                {
                    id: 'TEST-001',
                    name: 'Test rule',
                    description: 'Test description',
                    severity: 'medium',
                    enabled: true,
                    type: 'match',
                    path: '$.device.hostname',
                    condition: { operator: 'exists' }
                }
            ],
            is_active: true
        };
        it('should get lint run by ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockLintRun] });
            const run = await service.getLintRun('lint-001');
            expect(run.id).toBe('lint-001');
        });
        it('should throw NotFoundError for non-existent lint run', async () => {
            mockPool.query.mockResolvedValue({ rows: [] });
            await expect(service.getLintRun('non-existent')).rejects.toThrow(NotFoundError);
        });
    });
    describe('Change Operations', () => {
        const mockChange = {
            id: 'change-001',
            title: 'VLAN Update',
            description: 'Add VLAN 100',
            change_type: 'vlan',
            device_scope: ['device-001'],
            status: 'draft',
            risk_level: 'medium',
            created_by: testUser.id,
            created_at: new Date(),
            updated_at: new Date()
        };
        it('should validate state transitions', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockChange] }) // find change
                .mockResolvedValueOnce({ rowCount: 1 }) // update status
                .mockResolvedValueOnce({ rows: [{ id: 'audit-001' }] }) // audit
                .mockResolvedValueOnce({ rows: [{ ...mockChange, status: 'planned' }] }); // find updated
            const change = await service.updateChangeStatus('change-001', 'planned', auditCtx);
            expect(change.status).toBe('planned');
        });
        it('should reject invalid state transitions', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockChange] });
            await expect(service.updateChangeStatus('change-001', 'deployed', auditCtx)).rejects.toThrow(BadRequestError);
        });
        it('should create change with device scope validation', async () => {
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 'device-001' }] }) // find device
                .mockResolvedValueOnce({ rows: [mockChange] }) // create change
                .mockResolvedValueOnce({ rows: [{ id: 'audit-001' }] }); // audit
            const change = await service.createChange({
                title: 'VLAN Update',
                description: 'Add VLAN 100',
                changeType: 'vlan',
                deviceScope: ['device-001'],
                riskLevel: 'medium'
            }, auditCtx);
            expect(change.title).toBe('VLAN Update');
        });
    });
});
//# sourceMappingURL=netops.test.js.map