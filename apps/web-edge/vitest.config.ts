import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    resolve: {
        conditions: ['browser']
    },
    test: {
        environment: 'jsdom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                '**/*.d.ts',
                '**/dist/**',
                '**/.svelte-kit/**',
                '**/tests/**',
                '**/e2e/**',
                '**/*.config.{js,ts}'
            ],
            thresholds: {
                statements: 50,
                branches: 50,
                functions: 50,
                lines: 50
            }
        },
        setupFiles: ['./src/setupTests.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/e2e/**',
            '**/tests/e2e/**'
        ],
        testTimeout: 10000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        },
        reporters: process.env.CI
            ? ['default', 'junit']
            : ['default'],
        outputFile: {
            junit: './test-results/vitest-junit.xml'
        }
    }
});
