import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@testing/mocks': resolve(__dirname, '../testing/src'),
            '@domain/core': resolve(__dirname, '../domain/src'),
            '@contracts/shared': resolve(__dirname, '../contracts/src')
        }
    },
    test: {
        globals: true
    }
})
