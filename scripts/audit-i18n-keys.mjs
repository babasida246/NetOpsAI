#!/usr/bin/env node
/**
 * Audit i18n keys - Extract all used keys and compare with locale files
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Extract i18n keys from $_('key') or $_("key") patterns
function extractKeys(content) {
    const keys = new Set();

    // Match $_('key'), $_("key"), and $_(`key`)
    const regex = /\$_\(['"` ]([a-zA-Z0-9._]+)['"` ][),]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }

    return Array.from(keys);
}

// Recursively get all keys from nested object
function flattenKeys(obj, prefix = '') {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...flattenKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// Main execution
async function main() {
    console.log(pc.cyan('\n🔍 Scanning for i18n key usage...\n'));

    // 1. Find all Svelte/TS files in web-ui
    const files = await fg('apps/web-ui/src/**/*.{svelte,ts}', {
        cwd: rootDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**', '**/*.test.ts']
    });

    console.log(pc.gray(`Found ${files.length} files to scan\n`));

    // 2. Extract all used keys
    const usedKeys = new Set();
    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const keys = extractKeys(content);
        keys.forEach(k => usedKeys.add(k));
    }

    console.log(pc.green(`✓ Extracted ${usedKeys.size} unique keys from code\n`));

    // 3. Load locale files
    const enPath = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/en.json');
    const viPath = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/vi.json');

    const enContent = JSON.parse(await fs.readFile(enPath, 'utf-8'));
    const viContent = JSON.parse(await fs.readFile(viPath, 'utf-8'));

    const enKeys = new Set(flattenKeys(enContent));
    const viKeys = new Set(flattenKeys(viContent));

    console.log(pc.gray(`en.json has ${enKeys.size} keys`));
    console.log(pc.gray(`vi.json has ${viKeys.size} keys\n`));

    // 4. Find missing keys
    const missingInEn = [];
    const missingInVi = [];
    const unusedKeys = [];

    for (const key of usedKeys) {
        if (!enKeys.has(key)) missingInEn.push(key);
        if (!viKeys.has(key)) missingInVi.push(key);
    }

    for (const key of enKeys) {
        if (!usedKeys.has(key)) unusedKeys.push(key);
    }

    // 5. Report results
    console.log(pc.bold('\n📊 Audit Results:\n'));

    if (missingInEn.length > 0) {
        console.log(pc.red(`❌ Missing in en.json (${missingInEn.length}):`));
        missingInEn.slice(0, 20).forEach(k => console.log(pc.red(`   - ${k}`)));
        if (missingInEn.length > 20) {
            console.log(pc.red(`   ... and ${missingInEn.length - 20} more`));
        }
        console.log();
    } else {
        console.log(pc.green('✓ All used keys exist in en.json\n'));
    }

    if (missingInVi.length > 0) {
        console.log(pc.red(`❌ Missing in vi.json (${missingInVi.length}):`));
        missingInVi.slice(0, 20).forEach(k => console.log(pc.red(`   - ${k}`)));
        if (missingInVi.length > 20) {
            console.log(pc.red(`   ... and ${missingInVi.length - 20} more`));
        }
        console.log();
    } else {
        console.log(pc.green('✓ All used keys exist in vi.json\n'));
    }

    if (unusedKeys.length > 0) {
        console.log(pc.yellow(`⚠️  Potentially unused keys (${unusedKeys.length}):`));
        unusedKeys.slice(0, 10).forEach(k => console.log(pc.yellow(`   - ${k}`)));
        if (unusedKeys.length > 10) {
            console.log(pc.yellow(`   ... and ${unusedKeys.length - 10} more`));
        }
        console.log();
    }

    // 6. Generate report JSON
    const report = {
        scannedFiles: files.length,
        usedKeys: Array.from(usedKeys).sort(),
        missingInEn: missingInEn.sort(),
        missingInVi: missingInVi.sort(),
        unusedKeys: unusedKeys.sort(),
        summary: {
            totalUsed: usedKeys.size,
            totalInEn: enKeys.size,
            totalInVi: viKeys.size,
            missingInEn: missingInEn.length,
            missingInVi: missingInVi.length,
            unused: unusedKeys.length
        }
    };

    const reportPath = path.join(rootDir, 'i18n-audit-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(pc.cyan(`📝 Full report saved to: ${reportPath}\n`));

    // Exit with error if missing keys found
    if (missingInEn.length > 0 || missingInVi.length > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(pc.red('Error:'), err);
    process.exit(1);
});
