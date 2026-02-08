import { describe, it, expect } from 'vitest';
import type { Device, ConfigVersion, Severity, DeviceRole, Vendor } from './types';

describe('NetOps Types', () => {
    describe('Device type', () => {
        it('should create a valid device object', () => {
            const device: Device = {
                id: '123',
                name: 'router-1',
                vendor: 'cisco',
                model: 'ASR1002',
                os_version: '15.9',
                site: 'NYC',
                role: 'core',
                mgmt_ip: '192.168.1.1',
                tags: { env: 'prod' },
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
                last_config_snapshot: '2025-01-02T00:00:00Z'
            };

            expect(device.id).toBe('123');
            expect(device.name).toBe('router-1');
            expect(device.vendor).toBe('cisco');
            expect(device.mgmt_ip).toBe('192.168.1.1');
        });

        it('should create minimal device object', () => {
            const device: Device = {
                id: '456',
                name: 'switch-1',
                vendor: 'mikrotik',
                mgmt_ip: '10.0.0.1',
                created_at: '2025-01-01T00:00:00Z'
            };

            expect(device.id).toBe('456');
            expect(device.vendor).toBe('mikrotik');
        });
    });

    describe('ConfigVersion type', () => {
        it('should create a valid config version object', () => {
            const config: ConfigVersion = {
                id: 'cv-001',
                device_id: 'dev-001',
                raw_config: 'interface eth0\n ip address 192.168.1.1',
                source: 'pull',
                checksum: 'abc123def456',
                collected_at: '2025-01-01T00:00:00Z',
                created_by: 'admin',
                note: 'Initial config'
            };

            expect(config.id).toBe('cv-001');
            expect(config.source).toBe('pull');
            expect(config.checksum).toHaveLength(12);
        });
    });

    describe('Type constraints', () => {
        it('should validate Severity type', () => {
            const severities: Severity[] = ['low', 'med', 'high', 'critical'];
            expect(severities).toHaveLength(4);
        });

        it('should validate DeviceRole type', () => {
            const roles: DeviceRole[] = ['core', 'distribution', 'access', 'edge', 'firewall', 'wan'];
            expect(roles).toHaveLength(6);
        });

        it('should validate Vendor type', () => {
            const vendors: Vendor[] = ['cisco', 'mikrotik', 'fortigate'];
            expect(vendors).toHaveLength(3);
        });
    });
});
