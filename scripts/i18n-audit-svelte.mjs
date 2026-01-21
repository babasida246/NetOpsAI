#!/usr/bin/env node
import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

// Svelte compiler (có sẵn trong project svelte)
import { parse as svelteParse } from "svelte/compiler";

/**
 * CONFIG
 * - chỉnh path tới vi.normalized.json theo repo của bạn
 */
const VI_JSON_PATH = path.resolve(process.cwd(), "vi.normalized.json");
// hoặc ví dụ: path.resolve(process.cwd(), "src/lib/i18n/locales/vi.normalized.json");

const SRC_GLOBS = [
    "src/**/*.svelte",
    "src/**/*.{ts,js}",   // optional: quét key trong TS/JS nữa nếu bạn gọi $_ ở đó
];

const IGNORE = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.svelte-kit/**",
    "**/coverage/**",
    "**/__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/e2e/**",
];

const ALLOWLIST_EXACT = new Set([
    "", "OK", "ID", "IP", "CPU", "RAM", "SSD", "HDD", "GB", "MB", "TB",
    "HTTP", "HTTPS", "GET", "POST", "PUT", "PATCH", "DELETE",
]);

function flattenKeys(obj, prefix = "", out = new Set()) {
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) {
            flattenKeys(v, next, out);
        } else {
            out.add(next);
        }
    }
    return out;
}

function isLikelyTechnical(str) {
    if (!str) return true;
    const s = str.trim();
    if (ALLOWLIST_EXACT.has(s)) return true;
    if (/^(https?:)?\/\//i.test(s)) return true;
    if (/^[./][\w./-]+$/.test(s)) return true;
    if (/^[A-Z0-9_]+$/.test(s)) return true;
    if (/^\d+([.,]\d+)?$/.test(s)) return true;
    if (/^[\W_]+$/.test(s)) return true;
    return false;
}

function looksLikeUserFacingText(str) {
    const s = (str ?? "").replace(/\s+/g, " ").trim();
    if (!s) return false;
    if (isLikelyTechnical(s)) return false;

    // Nếu có chữ cái latin => thường là text UI cần i18n
    if (/[A-Za-z]/.test(s)) {
        const words = s.match(/[A-Za-z]{2,}/g) || [];
        if (words.length > 0) return true;
    }

    // Nếu bạn muốn bắt cả hardcode tiếng Việt, bật dòng dưới:
    // if (/[À-ỹ]/.test(s)) return true;

    return false;
}

function looksLikeKeyLeak(str) {
    const s = (str ?? "").trim();
    if (!s) return false;
    // warehouse.description
    if (/^[a-z0-9]+(\.[a-z0-9_-]+){1,}$/.test(s)) return true;
    // ASSETS.BRAND
    if (/^[A-Z0-9_]+(\.[A-Z0-9_]+){1,}$/.test(s)) return true;
    return false;
}

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readText(p) {
    return fs.readFileSync(p, "utf8");
}

// --- Extract i18n keys by regex (covers TS/JS + Svelte expressions) ---
function extractKeysByRegex(code) {
    const keys = [];
    // $_('common.name') or $_("common.name")
    const re = /\$_\(\s*['"]([^'"]+)['"]\s*(?:,\s*[^)]*)?\)/g;
    let m;
    while ((m = re.exec(code))) keys.push(m[1]);
    return keys;
}

// --- Walk ESTree expression to find string literals inside { ... } ---
function walkExpr(node, visitor) {
    if (!node || typeof node !== "object") return;
    visitor(node);
    for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v)) v.forEach((x) => walkExpr(x, visitor));
        else if (v && typeof v === "object") walkExpr(v, visitor);
    }
}

// --- Traverse Svelte AST (html + mustache + attributes) ---
function walkSvelteHtml(node, cb) {
    if (!node) return;
    cb(node);

    // children containers
    const kids = node.children || node.fragment?.children;
    if (Array.isArray(kids)) kids.forEach((c) => walkSvelteHtml(c, cb));

    // attributes
    if (Array.isArray(node.attributes)) {
        for (const a of node.attributes) cb(a);
    }

    // else blocks etc
    if (node.else) walkSvelteHtml(node.else, cb);
    if (node.then) walkSvelteHtml(node.then, cb);
    if (node.catch) walkSvelteHtml(node.catch, cb);
}

// --- main ---
async function main() {
    if (!fs.existsSync(VI_JSON_PATH)) {
        console.error(pc.red(`Không tìm thấy vi json: ${VI_JSON_PATH}`));
        process.exit(2);
    }

    const viObj = readJson(VI_JSON_PATH);
    const viKeys = flattenKeys(viObj);

    const files = await fg(SRC_GLOBS, { ignore: IGNORE, absolute: true });

    const usedKeys = new Set();
    const hardcoded = []; // {file, line, col, kind, text}
    const keyLeaks = [];  // {file, line, col, text}

    for (const file of files) {
        const code = readText(file);

        // 1) Regex: get $_('...') anywhere
        for (const k of extractKeysByRegex(code)) usedKeys.add(k);

        // 2) If .svelte => parse template and catch hardcoded text/attrs/expr-literals
        if (file.endsWith(".svelte")) {
            let ast;
            try {
                ast = svelteParse(code);
            } catch (e) {
                // fallback: nếu parse fail thì scan thô theo dòng
                const lines = code.split("\n");
                lines.forEach((ln, idx) => {
                    // bắt 'Name' trong expression
                    const strLits = ln.match(/'([^']+)'|"([^"]+)"/g) || [];
                    for (const lit of strLits) {
                        const v = lit.slice(1, -1);
                        if (looksLikeUserFacingText(v)) {
                            hardcoded.push({ file, line: idx + 1, col: 0, kind: "fallback-string", text: v });
                        }
                    }
                    // bắt key leak
                    if (looksLikeKeyLeak(ln)) keyLeaks.push({ file, line: idx + 1, col: 0, text: ln.trim() });
                });
                continue;
            }

            // Walk html nodes
            walkSvelteHtml(ast.html, (n) => {
                // Text nodes like <h1>Warehouse</h1>
                if (n.type === "Text") {
                    const t = (n.data ?? "").replace(/\s+/g, " ").trim();
                    if (looksLikeUserFacingText(t)) {
                        hardcoded.push({
                            file,
                            line: n.start, // start index (not line), we'll compute below
                            col: 0,
                            kind: "html-text",
                            text: t,
                        });
                    }
                    if (looksLikeKeyLeak(t)) {
                        keyLeaks.push({ file, line: n.start, col: 0, text: t });
                    }
                }

                // Attribute values like placeholder="Choose option ..."
                if (n.type === "Attribute") {
                    const ifName = n.name;
                    // Svelte AST: value is array of Text/MustacheTag
                    const parts = n.value || [];
                    for (const p of parts) {
                        if (p.type === "Text") {
                            const t = (p.data ?? "").trim();
                            if (looksLikeUserFacingText(t)) {
                                hardcoded.push({
                                    file,
                                    line: n.start,
                                    col: 0,
                                    kind: `attr:${ifName}`,
                                    text: t,
                                });
                            }
                            if (looksLikeKeyLeak(t)) {
                                keyLeaks.push({ file, line: n.start, col: 0, text: t });
                            }
                        }
                        if (p.type === "MustacheTag" && p.expression) {
                            walkExpr(p.expression, (x) => {
                                // string literal inside expression: {$isLoading ? 'Name' : $_('common.name')}
                                if (x.type === "Literal" && typeof x.value === "string") {
                                    const t = x.value;
                                    // loại bỏ literal là key i18n trong $_('...') vì đã lấy bằng regex rồi
                                    if (looksLikeUserFacingText(t)) {
                                        hardcoded.push({
                                            file,
                                            line: n.start,
                                            col: 0,
                                            kind: `expr-string:${ifName}`,
                                            text: t,
                                        });
                                    }
                                    if (looksLikeKeyLeak(t)) {
                                        keyLeaks.push({ file, line: n.start, col: 0, text: t });
                                    }
                                }
                            });
                        }
                    }
                }

                // MustacheTag outside attribute: { ... }
                if (n.type === "MustacheTag" && n.expression) {
                    walkExpr(n.expression, (x) => {
                        if (x.type === "Literal" && typeof x.value === "string") {
                            const t = x.value;
                            if (looksLikeUserFacingText(t)) {
                                hardcoded.push({
                                    file,
                                    line: n.start,
                                    col: 0,
                                    kind: "expr-string",
                                    text: t,
                                });
                            }
                            if (looksLikeKeyLeak(t)) {
                                keyLeaks.push({ file, line: n.start, col: 0, text: t });
                            }
                        }
                    });
                }
            });
        } else {
            // TS/JS: bắt string literal hay key leak thô theo regex (để map nhanh)
            const lines = code.split("\n");
            lines.forEach((ln, idx) => {
                const strLits = ln.match(/'([^']+)'|"([^"]+)"/g) || [];
                for (const lit of strLits) {
                    const v = lit.slice(1, -1);
                    if (looksLikeUserFacingText(v) || looksLikeKeyLeak(v)) {
                        hardcoded.push({ file, line: idx + 1, col: 0, kind: "tsjs-string", text: v });
                    }
                }
            });
        }
    }

    // Compare with vi.normalized.json
    const missingKeysInVi = [...usedKeys].filter((k) => !viKeys.has(k)).sort();
    const unusedKeysInVi = [...viKeys].filter((k) => !usedKeys.has(k)).sort();

    // Prepare report
    const report = {
        meta: {
            viJson: path.relative(process.cwd(), VI_JSON_PATH),
            scannedFiles: files.length,
            usedKeysCount: usedKeys.size,
            viKeysCount: viKeys.size,
            missingKeysInViCount: missingKeysInVi.length,
            unusedKeysInViCount: unusedKeysInVi.length,
            hardcodedCount: hardcoded.length,
            keyLeakCount: keyLeaks.length,
        },
        usedKeys: [...usedKeys].sort(),
        missingKeysInVi,
        unusedKeysInVi,
        hardcodedTexts: hardcoded
            // giảm noise: chỉ giữ text có khả năng là UI
            .filter((x) => looksLikeUserFacingText(x.text) || looksLikeKeyLeak(x.text))
            .slice(0, 2000), // tránh file quá nặng
        keyLeaks: keyLeaks.slice(0, 2000),
    };

    const outDir = path.resolve(process.cwd(), "i18n-audit");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");

    // Markdown summary
    const md = [];
    md.push(`# i18n Audit Report`);
    md.push(`- vi: \`${path.relative(process.cwd(), VI_JSON_PATH)}\``);
    md.push(`- scanned files: **${report.meta.scannedFiles}**`);
    md.push(`- used keys: **${report.meta.usedKeysCount}**`);
    md.push(`- missing in vi: **${report.meta.missingKeysInViCount}**`);
    md.push(`- hardcoded texts: **${report.meta.hardcodedCount}**`);
    md.push(`- key leaks: **${report.meta.keyLeakCount}**`);
    md.push(``);

    if (missingKeysInVi.length) {
        md.push(`## Missing keys in vi.normalized.json`);
        md.push(missingKeysInVi.map((k) => `- \`${k}\``).join("\n"));
        md.push(``);
    }

    if (keyLeaks.length) {
        md.push(`## Key leaks (rendering raw keys on UI)`);
        md.push(keyLeaks.slice(0, 100).map((x) => `- \`${path.relative(process.cwd(), x.file)}\`: ${x.text}`).join("\n"));
        md.push(``);
    }

    md.push(`## Hardcoded texts (sample)`);
    md.push(
        report.hardcodedTexts.slice(0, 100).map((x) =>
            `- \`${path.relative(process.cwd(), x.file)}:${x.line}\` [${x.kind}] ${JSON.stringify(x.text)}`
        ).join("\n")
    );
    md.push(``);

    fs.writeFileSync(path.join(outDir, "report.md"), md.join("\n"), "utf8");

    // Console
    console.log(pc.green(`✅ Wrote report:`));
    console.log(pc.cyan(`- ${path.relative(process.cwd(), path.join(outDir, "report.json"))}`));
    console.log(pc.cyan(`- ${path.relative(process.cwd(), path.join(outDir, "report.md"))}`));

    if (missingKeysInVi.length > 0) {
        console.log(pc.red(`\n❌ Missing ${missingKeysInVi.length} key(s) in vi.normalized.json`));
        process.exit(1);
    }

    // Không fail chỉ vì hardcoded (tuỳ bạn), nhưng nên xem report để xử
    process.exit(0);
}

main().catch((e) => {
    console.error(pc.red("Audit crashed:"), e);
    process.exit(2);
});
