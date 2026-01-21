#!/usr/bin/env tsx
/**
 * Batch fix i18n issues by adding imports and replacing hardcoded strings
 */

import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_ROOT = path.resolve(__dirname, '..');

interface I18nFix {
    file: string;
    addImport: boolean;
    replacements: Array<{ old: string; new: string; description: string }>;
}

// Define all fixes needed based on lint output
const fixes: I18nFix[] = [
    // DynamicSpecForm.svelte
    {
        file: 'apps/web-ui/src/lib/assets/components/catalogs/DynamicSpecForm.svelte',
        addImport: true,
        replacements: [
            {
                old: '<option value="">Select option</option>',
                new: '<option value="">{$isLoading ? \'Select option\' : $_(\' assets.placeholders.selectOption\')}</option>',
                description: 'Replace Select option'
            }
        ]
    },
    // LocationCatalog.svelte
    {
        file: 'apps/web-ui/src/lib/assets/components/catalogs/LocationCatalog.svelte',
        addImport: true,
        replacements: [
            { old: '<Label class="mb-2">Location name</Label>', new: '<Label class="mb-2">{$isLoading ? \'Location name\' : $_(\' assets.locationName\')}</Label>', description: 'Location name label' },
            { old: '<Label class="mb-2">Parent location</Label>', new: '<Label class="mb-2">{$isLoading ? \'Parent location\' : $_(\' assets.parentLocation\')}</Label>', description: 'Parent location label' },
            { old: '<Button color="alternative" on:click={reset}>Cancel</Button>', new: '<Button color="alternative" on:click={reset}>{$isLoading ? \'Cancel\' : $_(\' common.cancel\')}</Button>', description: 'Cancel button' },
            { old: '<TableHeadCell>Name</TableHeadCell>', new: '<TableHeadCell>{$isLoading ? \'Name\' : $_(\' common.name\')}</TableHeadCell>', description: 'Name header' },
            { old: '<TableHeadCell>Parent</TableHeadCell>', new: '<TableHeadCell>{$isLoading ? \'Parent\' : $_(\' assets.parent\')}</TableHeadCell>', description: 'Parent header' },
            { old: '<TableHeadCell>Path</TableHeadCell>', new: '<TableHeadCell>{$isLoading ? \'Path\' : $_(\' assets.path\')}</TableHeadCell>', description: 'Path header' },
            { old: '<TableHeadCell class="w-32">Actions</TableHeadCell>', new: '<TableHeadCell class="w-32">{$isLoading ? \'Actions\' : $_(\' common.actions\')}</TableHeadCell>', description: 'Actions header' },
            { old: '<option value="">No parent</option>', new: '<option value="">{$isLoading ? \'No parent\' : $_(\' assets.noParent\')}</option>', description: 'No parent option' }
        ]
    }
];

async function addI18nImport(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Check if import already exists
    if (content.includes('from \'$lib/i18n\'')) {
        return content;
    }

    // Find first import statement and add i18n import after it
    const importRegex = /^(\s*import\s+.+;\n)/m;
    const match = content.match(importRegex);

    if (match) {
        const firstImport = match[0];
        const i18nImport = `  import { $_, $isLoading } from '$lib/i18n';\n`;
        return content.replace(firstImport, firstImport + i18nImport);
    }

    return content;
}

async function applyReplacements(content: string, replacements: I18nFix['replacements']): Promise<string> {
    let result = content;

    for (const { old, new: newStr, description } of replacements) {
        if (result.includes(old)) {
            result = result.replace(old, newStr);
            console.log(`  ✓ ${description}`);
        } else {
            console.log(`  ⚠ Skipped: ${description} (not found)`);
        }
    }

    return result;
}

async function processFix(fix: I18nFix): Promise<void> {
    const filePath = path.join(WORKSPACE_ROOT, fix.file);

    console.log(`\nProcessing: ${fix.file}`);

    try {
        let content = await fs.readFile(filePath, 'utf-8');

        if (fix.addImport) {
            content = await addI18nImport(filePath);
        }

        content = await applyReplacements(content, fix.replacements);

        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`✅ Done`);
    } catch (error) {
        console.error(`❌ Error processing ${fix.file}:`, error);
    }
}

async function main() {
    console.log('🔧 Batch fixing i18n issues...\n');

    for (const fix of fixes) {
        await processFix(fix);
    }

    console.log('\n✅ Batch fix complete!');
    console.log('\nRun `pnpm lint:i18n` to verify.');
}

main().catch(console.error);
