import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    formatDate,
    formatRelativeTime,
    truncateId,
    severityOrder,
    copyToClipboard,
    downloadText
} from './format';

describe('format utilities', () => {
    describe('formatDate', () => {
        it('should format date string correctly', () => {
            const dateStr = '2025-12-25T10:30:00Z';
            const result = formatDate(dateStr);
            expect(result).toContain('Dec');
            expect(result).toContain('25');
            expect(result).toContain('2025');
        });

        it('should handle different date formats', () => {
            const dateStr = '2025-01-01T00:00:00Z';
            const result = formatDate(dateStr);
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('formatRelativeTime', () => {
        it('should return "just now" for recent times', () => {
            const now = new Date();
            const dateStr = now.toISOString();
            const result = formatRelativeTime(dateStr);
            expect(result).toBe('just now');
        });

        it('should return minutes ago format', () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 5 * 60000); // 5 minutes ago
            const result = formatRelativeTime(pastDate.toISOString());
            expect(result).toMatch(/^\d+m ago$/);
        });

        it('should return hours ago format', () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 2 * 3600000); // 2 hours ago
            const result = formatRelativeTime(pastDate.toISOString());
            expect(result).toMatch(/^\d+h ago$/);
        });

        it('should return days ago format', () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 3 * 86400000); // 3 days ago
            const result = formatRelativeTime(pastDate.toISOString());
            expect(result).toMatch(/^\d+d ago$/);
        });
    });

    describe('truncateId', () => {
        it('should truncate id to default length', () => {
            const id = 'abc123def456ghi789';
            const result = truncateId(id);
            expect(result).toBe('abc123de');
            expect(result.length).toBe(8);
        });

        it('should truncate id to custom length', () => {
            const id = 'abc123def456ghi789';
            const result = truncateId(id, 5);
            expect(result).toBe('abc12');
            expect(result.length).toBe(5);
        });

        it('should handle short ids', () => {
            const id = 'abc';
            const result = truncateId(id);
            expect(result).toBe('abc');
        });
    });

    describe('severityOrder', () => {
        it('should return correct order for critical', () => {
            expect(severityOrder('critical')).toBe(0);
        });

        it('should return correct order for high', () => {
            expect(severityOrder('high')).toBe(1);
        });

        it('should return correct order for med', () => {
            expect(severityOrder('med')).toBe(2);
        });

        it('should return correct order for low', () => {
            expect(severityOrder('low')).toBe(3);
        });

        it('should return 999 for unknown severity', () => {
            expect(severityOrder('unknown' as any)).toBe(999);
        });
    });

    describe('copyToClipboard', () => {
        it('should copy text to clipboard', async () => {
            // Clipboard API might not be available in jsdom environment
            // Skip this test or use happy-dom instead
            const clipboardObject = { writeText: vi.fn().mockResolvedValue(undefined) };
            const originalClipboard = navigator.clipboard;
            Object.defineProperty(navigator, 'clipboard', {
                value: clipboardObject,
                configurable: true
            });

            try {
                await copyToClipboard('test text');
                expect(clipboardObject.writeText).toHaveBeenCalledWith('test text');
            } finally {
                Object.defineProperty(navigator, 'clipboard', {
                    value: originalClipboard,
                    configurable: true
                });
            }
        });
    });

    describe('downloadText', () => {
        it('should create blob and trigger download', () => {
            const content = 'test content';
            const filename = 'test.txt';

            const createObjectURLMock = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
            const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { });
            const clickMock = vi.fn();

            // Mock createElement and getElementById
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                const elem = originalCreateElement(tag);
                if (tag === 'a') {
                    elem.click = clickMock;
                }
                return elem;
            });

            downloadText(content, filename);

            expect(createObjectURLMock).toHaveBeenCalled();

            createObjectURLMock.mockRestore();
            revokeObjectURLMock.mockRestore();
        });
    });
});
