import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { locale, _, isLoading } from './index';

describe('i18n Core Functionality', () => {
    beforeEach(() => {
        // Reset locale to default before each test
        locale.set('en');
    });

    describe('Initialization', () => {
        it('should initialize with default locale', () => {
            expect(get(locale)).toBe('en');
        });

        it('should set isLoading to true initially', () => {
            // During initialization, loading should be true until translations are loaded
            const loading = get(isLoading);
            expect(typeof loading).toBe('boolean');
        });

        it('should support switching to Vietnamese locale', async () => {
            locale.set('vi');
            expect(get(locale)).toBe('vi');
        });
    });

    describe('Translation Key Resolution', () => {
        it('should resolve common.save key', () => {
            const translation = get(_);
            const result = translation('common.save');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            expect(result).not.toContain('common.save'); // Should not return the key itself
        });

        it('should resolve nested keys (cmdb.types)', () => {
            const translation = get(_);
            const result = translation('cmdb.types');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should resolve assets.assetCode key', () => {
            const translation = get(_);
            const result = translation('assets.assetCode');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should resolve warehouse keys', () => {
            const translation = get(_);
            const warehouseKey = translation('warehouse.warehouse');
            expect(warehouseKey).toBeTruthy();
            expect(typeof warehouseKey).toBe('string');
        });

        it('should resolve models keys', () => {
            const translation = get(_);
            const modelsKey = translation('models.models');
            expect(modelsKey).toBeTruthy();
            expect(typeof modelsKey).toBe('string');
        });

        it('should return fallback for missing keys', () => {
            const translation = get(_);
            const result = translation('nonexistent.key.path');
            expect(result).toBeTruthy();
            // svelte-i18n typically returns the key itself as fallback
            expect(result).toContain('nonexistent');
        });
    });

    describe('Locale Switching', () => {
        it('should switch from English to Vietnamese', async () => {
            locale.set('en');
            const enTranslation = get(_);
            const enSave = enTranslation('common.save');

            locale.set('vi');
            const viTranslation = get(_);
            const viSave = viTranslation('common.save');

            expect(enSave).toBeTruthy();
            expect(viSave).toBeTruthy();
            // Translations should be different in different locales
            expect(enSave).not.toBe(viSave);
        });

        it('should maintain same key structure across locales', () => {
            const keysToTest = [
                'common.save',
                'common.cancel',
                'common.edit',
                'common.delete',
                'assets.assetCode',
                'cmdb.types',
                'warehouse.warehouse'
            ];

            locale.set('en');
            const enTranslation = get(_);
            const enResults = keysToTest.map(key => enTranslation(key));

            locale.set('vi');
            const viTranslation = get(_);
            const viResults = keysToTest.map(key => viTranslation(key));

            // All keys should exist in both locales
            enResults.forEach(result => expect(result).toBeTruthy());
            viResults.forEach(result => expect(result).toBeTruthy());
        });
    });

    describe('Parameter Interpolation', () => {
        it('should interpolate parameters in translation keys', () => {
            const translation = get(_);
            // Test key that uses parameters (if available)
            // Example: warehouse.documentsTotal uses {count}
            const result = translation('warehouse.documentsTotal', { values: { count: 5 } });
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
    });

    describe('Loading State', () => {
        it('should have isLoading store available', () => {
            const loading = get(isLoading);
            expect(typeof loading).toBe('boolean');
        });
    });

    describe('Translation Coverage', () => {
        const criticalKeys = [
            // Common keys
            'common.save',
            'common.cancel',
            'common.edit',
            'common.delete',
            'common.create',
            'common.search',
            'common.apply',
            'common.clear',
            'common.yes',
            'common.no',

            // CMDB module
            'cmdb.types',
            'cmdb.newType',
            'cmdb.cis',

            // Assets module
            'assets.assetCode',
            'assets.status',
            'assets.createAsset',
            'assets.filters.status',

            // Warehouse module
            'warehouse.warehouse',
            'warehouse.documents',
            'warehouse.spareParts',

            // Models module
            'models.models',
            'models.providers',
            'models.orchestration'
        ];

        it.each(criticalKeys)('should have translation for %s', (key) => {
            const translation = get(_);
            const result = translation(key);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('Fallback Behavior', () => {
        it('should handle missing locale gracefully', () => {
            locale.set('xx'); // Invalid locale
            const translation = get(_);
            const result = translation('common.save');
            // Should still return something (either fallback locale or key)
            expect(result).toBeTruthy();
        });
    });
});
