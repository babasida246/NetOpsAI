/**
 * Shared parsing helpers for vendor CLI outputs.
 *
 * Keep these helpers deterministic and tolerant: the same input should always produce the same tokens.
 */

export function stripQuotes(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1)
    }
    return value
}

/**
 * Split a line into tokens, respecting double quotes.
 *
 * Example:
 *   set srcintf "port1" "port2"
 * => ["set","srcintf","port1","port2"]
 */
export function splitQuotedTokens(line: string): string[] {
    const tokens: string[] = []
    let current = ''
    let inQuote = false
    let escape = false

    const push = () => {
        const trimmed = current.trim()
        if (trimmed) tokens.push(trimmed)
        current = ''
    }

    for (const ch of line) {
        if (escape) {
            current += ch
            escape = false
            continue
        }
        if (ch === '\\') {
            escape = true
            continue
        }
        if (ch === '"') {
            inQuote = !inQuote
            continue
        }
        if (!inQuote && /\s/.test(ch)) {
            push()
            continue
        }
        current += ch
    }

    push()
    return tokens
}

type RouterOsKV = Record<string, string>

/**
 * Parse a RouterOS `export terse` `add` line into key/value pairs.
 *
 * Example:
 *   add chain=input action=accept comment="Allow established" connection-state=established,related
 */
export function parseRouterOsAddLine(line: string): RouterOsKV {
    const result: RouterOsKV = {}
    const raw = line.trim()
    if (!raw.startsWith('add ')) return result

    let i = 0
    const s = raw.slice(4) // after "add "

    const len = s.length
    while (i < len) {
        while (i < len && s[i] === ' ') i++
        if (i >= len) break

        // key
        let key = ''
        while (i < len && s[i] !== '=' && s[i] !== ' ') {
            key += s[i]
            i++
        }
        if (!key) break
        if (i >= len || s[i] !== '=') {
            // keys without "=" are unusual; skip.
            while (i < len && s[i] !== ' ') i++
            continue
        }
        i++ // skip '='

        // value
        let value = ''
        if (i < len && s[i] === '"') {
            i++ // open quote
            let escape = false
            while (i < len) {
                const ch = s[i]
                i++
                if (escape) {
                    value += ch
                    escape = false
                    continue
                }
                if (ch === '\\') {
                    escape = true
                    continue
                }
                if (ch === '"') break
                value += ch
            }
        } else {
            while (i < len && s[i] !== ' ') {
                value += s[i]
                i++
            }
        }

        result[key] = value
    }

    return result
}

