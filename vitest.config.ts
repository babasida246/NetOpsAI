import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts']
        }
    },
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './packages/domain/src'),
            '@application': path.resolve(__dirname, './packages/application/src'),
            '@contracts': path.resolve(__dirname, './packages/contracts/src'),
            '@config': path.resolve(__dirname, './packages/config/src'),
            '@infra/postgres': path.resolve(__dirname, './packages/infra-postgres/src'),
            '@infra/redis': path.resolve(__dirname, './packages/infra-redis/src'),
            '@infra/vector': path.resolve(__dirname, './packages/infra-vector/src'),
            '@providers': path.resolve(__dirname, './packages/providers/src'),
            '@tools': path.resolve(__dirname, './packages/tools/src'),
            '@observability': path.resolve(__dirname, './packages/observability/src'),
            '@security': path.resolve(__dirname, './packages/security/src'),
            '@testing': path.resolve(__dirname, './packages/testing/src')
        }
    }
})
