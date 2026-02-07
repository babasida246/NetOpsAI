/**
 * Health Module Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from '../../src/modules/health/health.service.js';
import { createMockPool, createMockRedis } from '../utils.js';
describe('HealthService', () => {
    let healthService;
    let mockPool;
    let mockRedis;
    beforeEach(() => {
        mockPool = createMockPool();
        mockRedis = createMockRedis();
        healthService = new HealthService(mockPool, mockRedis, '2.0.0');
    });
    describe('getHealth', () => {
        it('should return healthy status when all services are up', async () => {
            // Mock successful DB query
            mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
            const health = await healthService.getHealth();
            expect(health.status).toBe('healthy');
            expect(health.version).toBe('2.0.0');
            expect(health.services.database.status).toBe('up');
            expect(health.services.redis.status).toBe('up');
            expect(health.timestamp).toBeDefined();
            expect(health.uptime).toBeGreaterThanOrEqual(0);
        });
        it('should return unhealthy status when database is down', async () => {
            // Mock failed DB query
            mockPool.query.mockRejectedValue(new Error('Connection refused'));
            const health = await healthService.getHealth();
            expect(health.status).toBe('unhealthy');
            expect(health.services.database.status).toBe('down');
            expect(health.services.redis.status).toBe('up');
        });
        it('should return unhealthy status when redis is down', async () => {
            // Mock failed Redis ping
            mockRedis.ping.mockRejectedValue(new Error('Connection refused'));
            const health = await healthService.getHealth();
            expect(health.status).toBe('unhealthy');
            expect(health.services.database.status).toBe('up');
            expect(health.services.redis.status).toBe('down');
        });
        it('should include latency when services respond', async () => {
            const health = await healthService.getHealth();
            expect(health.services.database.latency).toBeGreaterThanOrEqual(0);
            expect(health.services.redis.latency).toBeGreaterThanOrEqual(0);
        });
    });
    describe('getReadiness', () => {
        it('should return ready when all checks pass', async () => {
            const readiness = await healthService.getReadiness();
            expect(readiness.ready).toBe(true);
            expect(readiness.checks).toHaveLength(2);
            expect(readiness.checks.every(c => c.status === 'pass')).toBe(true);
        });
        it('should return not ready when database check fails', async () => {
            mockPool.query.mockRejectedValue(new Error('Connection refused'));
            const readiness = await healthService.getReadiness();
            expect(readiness.ready).toBe(false);
            expect(readiness.checks.find(c => c.name === 'database')?.status).toBe('fail');
        });
    });
    describe('getLiveness', () => {
        it('should always return alive', () => {
            const liveness = healthService.getLiveness();
            expect(liveness.alive).toBe(true);
            expect(liveness.timestamp).toBeDefined();
        });
    });
});
//# sourceMappingURL=health.test.js.map