/**
 * Shared Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import { calculatePagination, calculateOffset, sleep, safeJsonParse, omit, pick, slugify, formatBytes } from '../../src/shared/utils/helpers.js';
describe('Utility Functions', () => {
    describe('calculatePagination', () => {
        it('should calculate pagination correctly', () => {
            const result = calculatePagination(1, 20, 100);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.total).toBe(100);
            expect(result.totalPages).toBe(5);
            expect(result.hasNext).toBe(true);
            expect(result.hasPrev).toBe(false);
        });
        it('should handle last page', () => {
            const result = calculatePagination(5, 20, 100);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(true);
        });
        it('should handle single page', () => {
            const result = calculatePagination(1, 20, 10);
            expect(result.totalPages).toBe(1);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);
        });
        it('should handle empty results', () => {
            const result = calculatePagination(1, 20, 0);
            expect(result.totalPages).toBe(0);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);
        });
    });
    describe('calculateOffset', () => {
        it('should calculate offset correctly', () => {
            expect(calculateOffset(1, 20)).toBe(0);
            expect(calculateOffset(2, 20)).toBe(20);
            expect(calculateOffset(3, 10)).toBe(20);
        });
    });
    describe('sleep', () => {
        it('should delay execution', async () => {
            const start = Date.now();
            await sleep(50);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(45);
        });
    });
    describe('safeJsonParse', () => {
        it('should parse valid JSON', () => {
            const result = safeJsonParse('{"name": "test"}', {});
            expect(result).toEqual({ name: 'test' });
        });
        it('should return fallback for invalid JSON', () => {
            const result = safeJsonParse('invalid json', { default: true });
            expect(result).toEqual({ default: true });
        });
    });
    describe('omit', () => {
        it('should omit specified keys', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const result = omit(obj, ['b']);
            expect(result).toEqual({ a: 1, c: 3 });
        });
        it('should handle non-existent keys', () => {
            const obj = { a: 1, b: 2 };
            const result = omit(obj, ['c']);
            expect(result).toEqual({ a: 1, b: 2 });
        });
    });
    describe('pick', () => {
        it('should pick specified keys', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const result = pick(obj, ['a', 'c']);
            expect(result).toEqual({ a: 1, c: 3 });
        });
        it('should handle non-existent keys', () => {
            const obj = { a: 1, b: 2 };
            const result = pick(obj, ['a', 'c']);
            expect(result).toEqual({ a: 1 });
        });
    });
    describe('slugify', () => {
        it('should convert string to slug', () => {
            expect(slugify('Hello World')).toBe('hello-world');
            expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
            expect(slugify('Special@#$Characters')).toBe('specialcharacters');
            expect(slugify('Already-a-slug')).toBe('already-a-slug');
        });
    });
    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1073741824)).toBe('1 GB');
            expect(formatBytes(1500)).toBe('1.46 KB');
        });
    });
});
//# sourceMappingURL=utils.test.js.map