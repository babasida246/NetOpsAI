#!/usr/bin/env node
/**
 * Detect hardcoded English strings in Svelte files for i18n compliance
 *
 * Usage: node scripts/detect-hardcoded-strings.mjs
 *
 * This script scans all .svelte files and detects potential hardcoded English strings
 * that should be replaced with i18n keys via $_('key') function.
 *
 * Improvement:
 * - Scan ALL .svelte files (including those without i18n import)
 * - Mark findings from files missing i18n import
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Pattern to match hardcoded English strings in common UI contexts
const patterns = [
    // String literals in tags like <Label>Text</Label>
    /<(?:Label|Button|TableHeadCell|Badge|h[1-6]|p|span|div)[^>]*>(?:\s*)([A-Z][a-zA-Z\s]+)(?:\s*)</g,
    // Placeholder attributes like placeholder="Search..."
    /placeholder=["']([A-Z][a-zA-Z\s.,:!?-]+)["']/g,
    // Title attributes
    /title=["']([A-Z][a-zA-Z\s.,:!?-]+)["']/g,
    // Option text like <option value="x">Text</option>
    /<option[^>]*>(?:\s*)([A-Z][a-zA-Z\s]+)(?:\s*)<\/option>/g,
];

// Allowlist patterns - strings that are OK to be hardcoded
const allowlist = [
    /^[A-Z]{2,}$/, // All caps (e.g., "API", "HTTP")
    /^\d+/, // Starts with number
    /^[a-z]/, // Starts lowercase (variable names, etc.)
    /\$_\(/, // Already using i18n
    /\$isLoading/, // Ternary with fallback
    /class=/, // CSS classes
    /bind:/, // Svelte bindings
    /on:/, // Event handlers
    /{#/, // Svelte control flow
    /{@/, // Svelte special tags
];

/**
 * Recursively find all .svelte files
 */
async function findSvelteFiles(dir, fileList = []) {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(dir, file.name);

        if (file.isDirectory()) {
            if (!file.name.startsWith('.') && file.name !== 'node_modules') {
                await findSvelteFiles(filePath, fileList);
            }
        } else if (file.name.endsWith('.svelte')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

/**
 * Check if a string is in allowlist
 */
function isAllowlisted(str) {
    return allowlist.some((pattern) => pattern.test(str));
}

/**
 * Detect if file imports i18n
 */
function hasI18nImport(content) {
    // Support both single/double quotes and different spacing
    // Examples:
    // import { $_ } from '$lib/i18n';
    // import { $_ } from "$lib/i18n"
    return /from\s+['"]\$lib\/i18n['"]/.test(content);
}

/**
 * Detect hardcoded strings in a file
 */
async function detectInFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const findings = [];

    const importedI18n = hasI18nImport(content);
    const lines = content.split('\n');

    for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex state

        while ((match = pattern.exec(content)) !== null) {
            const detectedString = match[1]?.trim();

            if (!detectedString || isAllowlisted(detectedString)) {
                continue;
            }

            // Find line number
            const beforeMatch = content.substring(0, match.index);
            const lineNumber = beforeMatch.split('\n').length;
            const lineContent = lines[lineNumber - 1]?.trim();

            findings.push({
                file: path.relative(rootDir, filePath),
                line: lineNumber,
                string: detectedString,
                context: lineContent,
                missingI18nImport: !importedI18n,
            });
        }
    }

    return findings;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Scanning for hardcoded English strings...\n');

    const webUiDir = path.join(rootDir, 'apps', 'web-ui', 'src');
    const svelteFiles = await findSvelteFiles(webUiDir);

    console.log(`Found ${svelteFiles.length} Svelte files\n`);

    const allFindings = [];

    for (const file of svelteFiles) {
        const findings = await detectInFile(file);
        allFindings.push(...findings);
    }

    if (allFindings.length === 0) {
        console.log('✅ No hardcoded strings detected! All UI text is using i18n.');
        process.exit(0);
    }

    const missingImportCount = new Set(
        allFindings.filter((f) => f.missingI18nImport).map((f) => f.file),
    ).size;

    console.log(`⚠️  Found ${allFindings.length} potential hardcoded strings:`);
    console.log(
        `   - Files with issues missing i18n import: ${missingImportCount}\n`,
    );

    // Group by file
    const byFile = allFindings.reduce((acc, finding) => {
        if (!acc[finding.file]) acc[finding.file] = [];
        acc[finding.file].push(finding);
        return acc;
    }, {});

    for (const [file, findings] of Object.entries(byFile)) {
        const missingImport = findings.some((f) => f.missingI18nImport);
        console.log(
            `\n📄 ${file} (${findings.length} issues)${missingImport ? ' ⚠️ missing i18n import' : ''
            }`,
        );

        if (missingImport) {
            console.log(
                `   Hint: add i18n import (example): import { $_ } from '$lib/i18n';`,
            );
        }

        findings.forEach(({ line, string, context, missingI18nImport }) => {
            console.log(
                `   Line ${line}: "${string}"${missingI18nImport ? '  [NO i18n import]' : ''
                }`,
            );
            console.log(
                `   Context: ${context.substring(0, 80)}${context.length > 80 ? '...' : ''
                }`,
            );
        });
    }

    console.log(`\n\n❌ Total: ${allFindings.length} hardcoded strings found.`);
    console.log('Please replace them with i18n keys using $_("key") pattern.\n');

    process.exit(1);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
