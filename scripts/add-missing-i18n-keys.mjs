#!/usr/bin/env node
/**
 * Add missing i18n keys to locale files
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Check if key exists in object
function hasKey(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (!current || typeof current !== 'object' || !(part in current)) {
            return false;
        }
        current = current[part];
    }

    return true;
}

// Get or create nested object path
function getOrCreate(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
            current[part] = {};
        } else if (typeof current[part] !== 'object' || Array.isArray(current[part])) {
            // Skip if value exists and is not an object
            console.log(pc.yellow(`  ⚠ Skipping ${path} - parent "${parts.slice(0, i + 1).join('.')}" is not an object`));
            return null;
        }
        current = current[part];
    }

    return { parent: current, key: parts[parts.length - 1] };
}

// Main execution
async function main() {
    console.log(pc.cyan('\n📝 Adding missing i18n keys...\n'));

    // Load report
    const reportPath = path.join(rootDir, 'i18n-audit-report.json');
    const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));

    const missingInEn = report.missingInEn || [];
    const missingInVi = report.missingInVi || [];

    console.log(pc.yellow(`Missing in en.json: ${missingInEn.length}`));
    console.log(pc.yellow(`Missing in vi.json: ${missingInVi.length}\n`));

    if (missingInEn.length === 0 && missingInVi.length === 0) {
        console.log(pc.green('✓ No missing keys!\n'));
        return;
    }

    // Load locale files
    const enPath = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/en.json');
    const viPath = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/vi.json');

    const enContent = JSON.parse(await fs.readFile(enPath, 'utf-8'));
    const viContent = JSON.parse(await fs.readFile(viPath, 'utf-8'));

    // Add missing keys to EN
    let addedToEn = 0;
    for (const key of missingInEn) {
        if (hasKey(enContent, key)) {
            console.log(pc.gray(`  ℹ Skipping ${key} - already exists`));
            continue;
        }

        const result = getOrCreate(enContent, key);
        if (!result) continue; // Skip if parent is not an object

        const { parent, key: lastKey } = result;
        // Use the key itself as placeholder for English
        parent[lastKey] = key.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
        console.log(pc.green(`+ en.json: ${key}`));
        addedToEn++;
    }

    // Add missing keys to VI  
    let addedToVi = 0;
    for (const key of missingInVi) {
        if (hasKey(viContent, key)) {
            console.log(pc.gray(`  ℹ Skipping ${key} - already exists`));
            continue;
        }

        const result = getOrCreate(viContent, key);
        if (!result) continue; // Skip if parent is not an object

        const { parent, key: lastKey } = result;
        // Use "[TODO]" prefix for Vietnamese translations
        const enResult = getOrCreate(enContent, key);
        const enValue = enResult ? enResult.parent[enResult.key] : key;
        parent[lastKey] = `[TODO] ${enValue || key}`;
        console.log(pc.green(`+ vi.json: ${key}`));
        addedToVi++;
    }

    // Save files
    await fs.writeFile(enPath, JSON.stringify(enContent, null, 2) + '\n');
    await fs.writeFile(viPath, JSON.stringify(viContent, null, 2) + '\n');

    console.log(pc.cyan(`\n✓ Updated en.json (added ${addedToEn} keys)`));
    console.log(pc.cyan(`✓ Updated vi.json (added ${addedToVi} keys)\n`));

    if (addedToVi > 0) {
        console.log(pc.yellow(`⚠️  ${addedToVi} Vietnamese translations need manual review (marked with [TODO])\n`));
    }
}

main().catch(err => {
    console.error(pc.red('Error:'), err);
    process.exit(1);
});
