import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node'
    },
    resolve: {
        alias: {
            '@domain/core': path.resolve(__dirname, '../domain/src/index.js'),
            '@contracts/shared': path.resolve(__dirname, '../contracts/src/index.js')
        }
    }
})
