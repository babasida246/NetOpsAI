#!/usr/bin/env node
/**
 * Check i18n display issues using Playwright
 * Finds all untranslated keys, literal i18n keys displayed to users, etc.
 */
import { chromium } from 'playwright';
import pc from 'picocolors';

const BASE_URL = 'http://localhost:3003';
const ROUTES = [
    '/',
    '/chat',
    '/stats',
    '/models',
    '/models/orchestration',
    '/tools',
    '/cmdb',
    '/assets',
    '/assets/catalogs',
    '/maintenance',
    '/warehouse/stock',
    '/warehouse/documents',
    '/warehouse/ledger',
    '/warehouse/spare-parts',
    '/warehouse/warehouses',
    '/warehouse/reports',
    '/admin'
];

// Pattern to detect untranslated i18n keys (lowercase.with.dots or contains .label, .title, etc.)
const I18N_KEY_PATTERN = /\b[a-z]+\.[a-z.]+\b/g;
const SUSPICIOUS_PATTERNS = [
    /\b\w+\.\w+\.\w+/,  // Three+ level keys like models.capabilities.streaming
    /\b(title|label|description|placeholder|button|message|error|success|warning|info)\.[\w.]+/,
    /\bTODO\b/,
    /\[\s*TODO\s*\]/,
];

async function checkRoute(page, route) {
    const issues = [];

    try {
        console.log(pc.gray(`  Checking ${route}...`));

        // Navigate with timeout
        await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        }).catch(() => {
            issues.push({ route, type: 'navigation', text: 'Failed to load page' });
        });

        // Wait for app to render
        await page.waitForTimeout(2000);

        // Find all text nodes that look like i18n keys
        const i18nKeyElements = await page.evaluate(() => {
            const results = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (!text) continue;

                // Check if text looks like an i18n key pattern
                // e.g., "warehouse.description", "models.capabilities.streaming"
                if (/^[a-z]+\.[a-z._]+$/i.test(text)) {
                    const parent = node.parentElement;
                    if (parent && parent.offsetParent !== null) { // Check if visible
                        results.push({
                            text: text,
                            tag: parent.tagName.toLowerCase(),
                            class: parent.className
                        });
                    }
                }
            }
            return results;
        });

        for (const item of i18nKeyElements) {
            // Skip false positives like "localhost.3003" or JavaScript code
            if (item.text.includes('localhost') ||
                item.text.includes('document.') ||
                item.text.includes('window.') ||
                item.text === 'e.g.') {
                continue;
            }

            issues.push({
                route,
                type: 'literal-key',
                text: item.text,
                element: `<${item.tag}>`
            });
        }

        // Check for [TODO] markers
        const todoMatches = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const matches = bodyText.match(/\[TODO\]/g);
            return matches ? matches.length : 0;
        });

        if (todoMatches > 0) {
            issues.push({
                route,
                type: 'todo-marker',
                text: `Found ${todoMatches} [TODO] markers`
            });
        }

        // Check input placeholders
        const placeholderIssues = await page.evaluate(() => {
            const results = [];
            const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
            inputs.forEach(input => {
                const placeholder = input.getAttribute('placeholder');
                if (placeholder && /^[a-z]+\.[a-z._]+$/i.test(placeholder)) {
                    results.push(placeholder);
                }
            });
            return results;
        });

        for (const placeholder of placeholderIssues) {
            issues.push({
                route,
                type: 'placeholder-key',
                text: placeholder
            });
        }

    } catch (error) {
        issues.push({
            route,
            type: 'error',
            text: error.message
        });
    }

    return issues;
}

async function main() {
    console.log(pc.cyan('\n🔍 Checking i18n display issues in web UI...\n'));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        locale: 'vi-VN',
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    const allIssues = [];

    for (const route of ROUTES) {
        const issues = await checkRoute(page, route);
        allIssues.push(...issues);
    }

    await browser.close();

    // Deduplicate issues
    const uniqueIssues = Array.from(
        new Map(allIssues.map(i => [`${i.route}:${i.type}:${i.text}`, i])).values()
    );

    // Group by route
    const issuesByRoute = {};
    for (const issue of uniqueIssues) {
        if (!issuesByRoute[issue.route]) {
            issuesByRoute[issue.route] = [];
        }
        issuesByRoute[issue.route].push(issue);
    }

    // Print report
    console.log(pc.bold('\n📊 i18n Display Issues Report:\n'));

    if (uniqueIssues.length === 0) {
        console.log(pc.green('✓ No i18n display issues found!\n'));
        return;
    }

    console.log(pc.yellow(`Found ${uniqueIssues.length} i18n display issues:\n`));

    for (const [route, issues] of Object.entries(issuesByRoute)) {
        console.log(pc.bold(`\n${route}`) + pc.gray(` (${issues.length} issues)`));
        for (const issue of issues) {
            const icon = issue.type === 'literal-key' ? '🔴' :
                issue.type === 'todo-marker' ? '🟡' :
                    issue.type === 'placeholder-key' ? '🟠' : '⚠️';
            const detail = issue.element ? ` in ${issue.element}` : '';
            console.log(`  ${icon} [${issue.type}] ${pc.red(issue.text)}${detail}`);
        }
    }

    // Save to file
    const report = {
        timestamp: new Date().toISOString(),
        totalIssues: uniqueIssues.length,
        issuesByRoute,
        allIssues: uniqueIssues
    };

    await import('fs/promises').then(fs =>
        fs.writeFile('i18n-display-issues.json', JSON.stringify(report, null, 2))
    );

    console.log(pc.gray('\n📝 Full report saved to: i18n-display-issues.json\n'));
}

main().catch(console.error);
