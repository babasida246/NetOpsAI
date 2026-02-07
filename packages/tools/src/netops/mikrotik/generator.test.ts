import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { generateMikrotikFullConfig } from './generator.js'
import type { MikroTikFullConfigIntent } from './types.js'

async function loadExample(filename: string): Promise<MikroTikFullConfigIntent> {
    const path = fileURLToPath(new URL(`../../../examples/mikrotik/${filename}`, import.meta.url))
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as MikroTikFullConfigIntent
}

describe('mikrotik full config generator', () => {
    const examples = [
        'edge-nat-simple.json',
        'core-router-5-vlans.json',
        'access-crs-trunk-access.json',
        'core-router-ospf-area0.json',
        'hospital-secure-syslog.json'
    ]

    it.each(examples)('generates scripts for %s', async (filename) => {
        const intent = await loadExample(filename)
        const output = generateMikrotikFullConfig(intent)

        expect(output.config).toContain('### BASE')
        expect(output.config).toContain('/system identity set')
        expect(output.rollback).toContain('# Mode: ROLLBACK')
        expect(output.rollback).toMatch(/###\s+/)
        expect(output.validation.errors).toEqual([])

        // Snapshot the apply/rollback scripts (large but stable).
        expect(output.config).toMatchSnapshot()
        expect(output.rollback).toMatchSnapshot()
    })
})
