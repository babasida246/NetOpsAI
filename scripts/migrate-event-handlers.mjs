#!/usr/bin/env node
/**
 * Migrate Svelte 4 event handlers (on:event) to Svelte 5 event attributes (onevent)
 * 
 * Svelte 4: <button on:click={handler}>
 * Svelte 5: <button onclick={handler}>
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Common DOM events to migrate
const events = [
    'click', 'dblclick', 'contextmenu',
    'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
    'keydown', 'keyup', 'keypress',
    'focus', 'blur', 'focusin', 'focusout',
    'input', 'change', 'submit', 'reset',
    'scroll', 'resize',
    'load', 'error',
    'touchstart', 'touchend', 'touchmove', 'touchcancel',
    'dragstart', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
    'select', 'selectstart',
    'wheel',
    'close' // for modals
];

async function migrateFile(filePath) {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Migrate on:event={handler} to onevent={handler}
    for (const event of events) {
        const pattern = new RegExp(`\\bon:${event}=`, 'g');
        if (pattern.test(content)) {
            content = content.replace(pattern, `on${event}=`);
            modified = true;
        }
    }

    // Special case: on:event|modifiers={handler} (modifiers are deprecated)
    // Extract the logic and put it in the handler
    const modifierPattern = /\bon:([a-z]+)\|([a-z|]+)=/g;
    if (modifierPattern.test(content)) {
        console.warn(`⚠️  Found event modifiers in ${filePath} - manual migration needed`);
        // For now, just remove modifiers and convert to onevent
        content = content.replace(modifierPattern, 'on$1=');
        modified = true;
    }

    if (modified) {
        writeFileSync(filePath, content, 'utf-8');
        return true;
    }

    return false;
}

async function main() {
    console.log('🔍 Finding Svelte files...\n');

    const files = await glob('apps/web-ui/src/**/*.svelte', {
        cwd: rootDir,
        absolute: true,
        ignore: ['**/node_modules/**']
    });

    console.log(`Found ${files.length} Svelte files\n`);

    let migratedCount = 0;

    for (const file of files) {
        const wasMigrated = await migrateFile(file);
        if (wasMigrated) {
            migratedCount++;
            const relPath = file.replace(rootDir, '').replace(/\\/g, '/');
            console.log(`✅ ${relPath}`);
        }
    }

    console.log(`\n✨ Migration complete! ${migratedCount}/${files.length} files updated`);

    if (migratedCount > 0) {
        console.log('\n📝 Next steps:');
        console.log('1. Review the changes with git diff');
        console.log('2. Check for any event modifiers that need manual migration');
        console.log('3. Test the application');
    }
}

main().catch(console.error);
