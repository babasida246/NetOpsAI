import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/main.ts'],
    format: ['esm'],
    target: 'es2022',
    clean: true,
    dts: false,
    sourcemap: false,
    minify: false,
    // Bundle workspace packages but not node_modules
    noExternal: [
        '@domain/core',
        '@contracts/shared',
        '@application/core',
        '@config/env',
        '@infra/postgres',
        '@infra/redis',
        '@infra/vector',
        '@infra/netdevice',
        '@providers/provider',
        '@tools/tools',
        '@observability/observability',
        '@security/security',
    ],
    // External all production dependencies that have dynamic requires
    external: [
        'redis',
        'bull',
        'nodemailer',
        'pg',
        '@redis/client',
    ],
    onSuccess: async () => {
        // Copy locale files after build
        const fs = await import('fs')
        const path = await import('path')

        const srcLocales = 'src/locales'
        const distLocales = 'locales'

        // Create locales directory
        if (!fs.existsSync(distLocales)) {
            fs.mkdirSync(distLocales, { recursive: true })
        }

        // Copy locale files
        const copyRecursive = (src: string, dest: string) => {
            if (!fs.existsSync(src)) return

            const stat = fs.statSync(src)
            if (stat.isDirectory()) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true })
                }
                const files = fs.readdirSync(src)
                files.forEach(file => {
                    copyRecursive(path.join(src, file), path.join(dest, file))
                })
            } else {
                fs.copyFileSync(src, dest)
            }
        }

        copyRecursive(srcLocales, distLocales)
        console.log('✓ Locale files copied to dist')
    }
})
