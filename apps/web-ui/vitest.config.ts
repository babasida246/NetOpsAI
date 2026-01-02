import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        environment: 'jsdom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            exclude: [
                'node_modules/',
                '**/*.d.ts',
                '**/dist/**',
                '**/.svelte-kit/**'
            ]
        },
        setupFiles: [],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        testTimeout: 10000
    }
});
