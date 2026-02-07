import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { generateFirewallMermaid } from './generate_firewall_mermaid.js'

async function loadExample(filename: string): Promise<string> {
    const path = fileURLToPath(new URL(`../../../examples/firewall-diagram/${filename}`, import.meta.url))
    return readFile(path, 'utf8')
}

describe('generate_firewall_mermaid (file mode)', () => {
    it('renders MikroTik diagrams from export terse bundle', async () => {
        const text = await loadExample('mikrotik_bundle.txt')
        const output = await generateFirewallMermaid({
            vendor: 'mikrotik',
            source: { type: 'file', file: { text } },
            options: { includeIR: false, maskSensitive: true }
        })

        expect(output.validation.errors).toEqual([])
        expect(output.mermaid.pipeline).toContain('flowchart')
        expect(output.mermaid.map).toContain('flowchart')
        expect(Object.keys(output.mermaid.chains ?? {})).toContain('forward')

        expect(output.mermaid.pipeline).toMatchSnapshot()
        expect(output.mermaid.chains?.forward).toMatchSnapshot()
        expect(output.mermaid.map).toMatchSnapshot()
    })

    it('renders FortiGate diagrams from show blocks bundle', async () => {
        const text = await loadExample('fortigate_bundle.txt')
        const output = await generateFirewallMermaid({
            vendor: 'fortigate',
            source: { type: 'file', file: { text } },
            options: { includeIR: false, maskSensitive: true }
        })

        expect(output.validation.errors).toEqual([])
        expect(Object.keys(output.mermaid.chains ?? {})).toEqual(['policy'])

        expect(output.mermaid.pipeline).toMatchSnapshot()
        expect(output.mermaid.chains?.policy).toMatchSnapshot()
        expect(output.mermaid.map).toMatchSnapshot()
    })
})

