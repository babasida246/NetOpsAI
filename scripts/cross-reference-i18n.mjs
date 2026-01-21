#!/usr/bin/env node
/**
 * Cross-reference i18n keys between Svelte files and locale files
 * Shows actual values being displayed vs expected translations
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const EN_PATH = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/en.json');
const VI_PATH = path.join(rootDir, 'apps/web-ui/src/lib/i18n/locales/vi.json');

// Extract i18n keys from $_('key') patterns
function extractKeys(content) {
    const keys = new Set();
    const regex = /\$_\(['"` ]([a-zA-Z0-9._]+)['"` ][),]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }

    return Array.from(keys);
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[part];
    }

    return current;
}

// Check if value looks like untranslated (lowercase with dots, or literal key)
function looksUntranslated(value, key) {
    if (!value || typeof value !== 'string') return false;

    // Check if value is same as last part of key (e.g., key="warehouse.description" value="description")
    const keyParts = key.split('.');
    const lastPart = keyParts[keyParts.length - 1];
    if (value.toLowerCase() === lastPart.toLowerCase()) return true;

    // Check if value contains dots (likely a key itself)
    if (/^[a-z]+\.[a-z._]+$/.test(value)) return true;

    // Check if value is all lowercase single word matching key part
    if (value === lastPart) return true;

    return false;
}

async function analyzeFile(filePath, enContent, viContent) {
    const content = await fs.readFile(filePath, 'utf-8');
    const keys = extractKeys(content);

    const issues = [];
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    for (const key of keys) {
        const enValue = getNestedValue(enContent, key);
        const viValue = getNestedValue(viContent, key);

        // Check for missing keys
        if (enValue === undefined) {
            issues.push({
                type: 'missing-en',
                key,
                file: relativePath
            });
        }

        if (viValue === undefined) {
            issues.push({
                type: 'missing-vi',
                key,
                file: relativePath
            });
        }

        // Check for untranslated values
        if (enValue && looksUntranslated(enValue, key)) {
            issues.push({
                type: 'untranslated-en',
                key,
                value: enValue,
                file: relativePath
            });
        }

        if (viValue && looksUntranslated(viValue, key)) {
            issues.push({
                type: 'untranslated-vi',
                key,
                value: viValue,
                file: relativePath
            });
        }

        // Check if VI is same as EN (not translated)
        if (enValue && viValue && enValue === viValue &&
            !['OK', 'Email', 'UUID', 'ID', 'Serial', 'IP', 'VLAN', 'VPN', 'API', 'URL', 'HTTP', 'HTTPS', 'SSH', 'TCP', 'UDP', 'DNS', 'DHCP'].includes(enValue)) {
            issues.push({
                type: 'same-as-english',
                key,
                value: enValue,
                file: relativePath
            });
        }
    }

    return { file: relativePath, keys, issues };
}

async function main() {
    console.log(pc.cyan('\n🔍 Cross-referencing i18n keys with locale files...\n'));

    // Load locale files
    const enContent = JSON.parse(await fs.readFile(EN_PATH, 'utf-8'));
    const viContent = JSON.parse(await fs.readFile(VI_PATH, 'utf-8'));

    // Find all Svelte files
    const files = await fg('apps/web-ui/src/**/*.svelte', {
        cwd: rootDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/build/**']
    });

    console.log(pc.gray(`Analyzing ${files.length} Svelte files...\n`));

    const allIssues = [];
    const fileReports = [];

    for (const file of files) {
        const report = await analyzeFile(file, enContent, viContent);
        if (report.issues.length > 0) {
            fileReports.push(report);
            allIssues.push(...report.issues);
        }
    }

    // Group issues by type
    const issuesByType = {
        'missing-en': [],
        'missing-vi': [],
        'untranslated-en': [],
        'untranslated-vi': [],
        'same-as-english': []
    };

    for (const issue of allIssues) {
        issuesByType[issue.type].push(issue);
    }

    // Print results
    console.log(pc.bold('\n📊 Cross-Reference Results:\n'));

    if (allIssues.length === 0) {
        console.log(pc.green('✓ No issues found!\n'));
        return;
    }

    console.log(pc.yellow(`Found ${allIssues.length} issues:\n`));

    // Show issues by file for warehouse section
    const warehouseFiles = fileReports.filter(r => r.file.includes('warehouse'));
    if (warehouseFiles.length > 0) {
        console.log(pc.cyan('\n🏭 WAREHOUSE SECTION ISSUES:\n'));

        for (const fileReport of warehouseFiles) {
            console.log(pc.bold(`\n${fileReport.file}`) + pc.gray(` (${fileReport.keys.length} keys, ${fileReport.issues.length} issues)`));

            for (const issue of fileReport.issues) {
                const icon = issue.type === 'missing-en' ? '❌ EN' :
                    issue.type === 'missing-vi' ? '❌ VI' :
                        issue.type === 'untranslated-en' ? '🟡 EN' :
                            issue.type === 'untranslated-vi' ? '🟡 VI' :
                                '🔄';

                const detail = issue.value ? ` = "${pc.red(issue.value)}"` : '';
                console.log(`  ${icon} ${issue.key}${detail}`);
            }
        }
    }

    // Summary by type
    console.log(pc.bold('\n📈 Summary by Type:\n'));

    if (issuesByType['missing-en'].length > 0) {
        console.log(pc.red(`Missing in en.json: ${issuesByType['missing-en'].length}`));
        issuesByType['missing-en'].slice(0, 5).forEach(i => console.log(pc.gray(`  - ${i.key}`)));
        if (issuesByType['missing-en'].length > 5) {
            console.log(pc.gray(`  ... and ${issuesByType['missing-en'].length - 5} more`));
        }
    }

    if (issuesByType['missing-vi'].length > 0) {
        console.log(pc.red(`\nMissing in vi.json: ${issuesByType['missing-vi'].length}`));
        issuesByType['missing-vi'].slice(0, 5).forEach(i => console.log(pc.gray(`  - ${i.key}`)));
        if (issuesByType['missing-vi'].length > 5) {
            console.log(pc.gray(`  ... and ${issuesByType['missing-vi'].length - 5} more`));
        }
    }

    if (issuesByType['untranslated-en'].length > 0) {
        console.log(pc.yellow(`\nUntranslated EN values: ${issuesByType['untranslated-en'].length}`));
        issuesByType['untranslated-en'].slice(0, 5).forEach(i =>
            console.log(pc.gray(`  - ${i.key} = "${i.value}"`))
        );
        if (issuesByType['untranslated-en'].length > 5) {
            console.log(pc.gray(`  ... and ${issuesByType['untranslated-en'].length - 5} more`));
        }
    }

    if (issuesByType['untranslated-vi'].length > 0) {
        console.log(pc.yellow(`\nUntranslated VI values: ${issuesByType['untranslated-vi'].length}`));
        issuesByType['untranslated-vi'].slice(0, 5).forEach(i =>
            console.log(pc.gray(`  - ${i.key} = "${i.value}"`))
        );
        if (issuesByType['untranslated-vi'].length > 5) {
            console.log(pc.gray(`  ... and ${issuesByType['untranslated-vi'].length - 5} more`));
        }
    }

    if (issuesByType['same-as-english'].length > 0) {
        console.log(pc.cyan(`\nSame as English (not translated): ${issuesByType['same-as-english'].length}`));
        issuesByType['same-as-english'].slice(0, 10).forEach(i =>
            console.log(pc.gray(`  - ${i.key} = "${i.value}"`))
        );
        if (issuesByType['same-as-english'].length > 10) {
            console.log(pc.gray(`  ... and ${issuesByType['same-as-english'].length - 10} more`));
        }
    }

    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        totalIssues: allIssues.length,
        issuesByType,
        fileReports: fileReports.map(r => ({
            file: r.file,
            keyCount: r.keys.length,
            issues: r.issues
        }))
    };

    await fs.writeFile(
        path.join(rootDir, 'i18n-cross-reference.json'),
        JSON.stringify(report, null, 2)
    );

    console.log(pc.gray('\n📝 Detailed report saved to: i18n-cross-reference.json\n'));
}

main().catch(console.error);
