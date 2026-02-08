import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'

export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: {
        alias: {
            '@application/core': resolve(__dirname, '../../packages/application/src/index.ts'),
            '@domain/core': resolve(__dirname, '../../packages/domain/src/index.ts'),
            '@contracts/shared': resolve(__dirname, '../../packages/contracts/src/index.ts')
        }
    },
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/**/*.test.ts']
        },
        include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts']
    }
})
