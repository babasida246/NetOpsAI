import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    clean: true,
    dts: true,
    tsconfig: 'tsconfig.build.json',
    sourcemap: false,
    minify: false,
    splitting: false,
    // Bundle workspace dependencies but external all node_modules
    noExternal: [
        '@domain/core',
        '@contracts/shared',
    ],
    external: [
        'redis',
        'bull',
        'nodemailer',
        'pg',
        '@redis/client',
        '@redis/bloom',
        '@redis/graph',
        '@redis/json',
        '@redis/search',
        '@redis/time-series',
    ],
})
