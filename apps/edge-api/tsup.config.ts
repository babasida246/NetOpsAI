import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/main.ts', 'src/scripts/migrate.ts', 'src/scripts/seed.ts'],
    format: ['esm'],
    sourcemap: true,
    clean: true,
    target: 'node20'
});
