import { describe, expect, it } from 'vitest'

import { validateIntent, validateRouterOsConfig } from './validation.js'
import type { MikroTikFullConfigIntent } from './types.js'

const baseIntent = (): MikroTikFullConfigIntent => ({
    device: { model: 'CCR', routerOsMajor: 7, routerOsVersion: '7.12.1' },
    role: 'core-router',
    hostname: 'CORE-TEST-01',
    interfaces: [{ name: 'ether1', purpose: 'trunk', trunkVlanIds: [10] }],
    vlans: [{ id: 10, name: 'mgmt', subnet: '10.10.0.0/24', gateway: '10.10.0.1', group: 'MGMT' }],
    securityProfile: { preset: 'standard-secure' },
    management: { mgmtSubnet: '10.10.0.0/24' }
})

describe('mikrotik intent validation', () => {
    it('detects duplicate VLAN IDs', () => {
        const intent = baseIntent()
        intent.vlans = [
            { id: 10, name: 'mgmt', subnet: '10.10.0.0/24', gateway: '10.10.0.1' },
            { id: 10, name: 'staff', subnet: '10.20.0.0/24', gateway: '10.20.0.1' }
        ]
        const report = validateIntent(intent)
        expect(report.valid).toBe(false)
        expect(report.errors.some((e) => e.id.startsWith('vlans.duplicate.10'))).toBe(true)
    })

    it('detects subnet overlap', () => {
        const intent = baseIntent()
        intent.vlans = [
            { id: 10, name: 'a', subnet: '10.10.0.0/24', gateway: '10.10.0.1' },
            { id: 20, name: 'b', subnet: '10.10.0.128/25', gateway: '10.10.0.129' }
        ]
        const report = validateIntent(intent)
        expect(report.valid).toBe(false)
        expect(report.errors.some((e) => e.id.startsWith('vlans.overlap.'))).toBe(true)
    })

    it('detects gateway out of subnet', () => {
        const intent = baseIntent()
        intent.vlans = [{ id: 10, name: 'mgmt', subnet: '10.10.0.0/24', gateway: '10.20.0.1' }]
        const report = validateIntent(intent)
        expect(report.valid).toBe(false)
        expect(report.errors.some((e) => e.id === 'vlans.gateway.10')).toBe(true)
    })

    it('requires internet config for edge role', () => {
        const intent = baseIntent()
        intent.role = 'edge-internet'
        delete intent.internet
        const report = validateIntent(intent)
        expect(report.valid).toBe(false)
        expect(report.errors.some((e) => e.id === 'internet.required')).toBe(true)
    })

    it('blocks mgmt subnet 0.0.0.0/0', () => {
        const intent = baseIntent()
        intent.management.mgmtSubnet = '0.0.0.0/0'
        const report = validateIntent(intent)
        expect(report.valid).toBe(false)
        expect(report.errors.some((e) => e.id === 'management.mgmtSubnet.open')).toBe(true)
    })

    it('warns when SSH password auth is enabled', () => {
        const intent = baseIntent()
        intent.management.ssh = { allowPassword: true }
        const report = validateIntent(intent)
        expect(report.warnings.some((e) => e.id === 'management.ssh.password')).toBe(true)
    })
})

describe('mikrotik config validation', () => {
    it('flags missing firewall baseline rules', () => {
        const report = validateRouterOsConfig('# empty config\n', '7.12.1')
        expect(report.errors.some((e) => e.id === 'firewall.missing.established')).toBe(true)
        expect(report.errors.some((e) => e.id === 'firewall.missing.invalid')).toBe(true)
    })

    it('warns when DNS remote requests are enabled without firewall protection', () => {
        const config = `
            /ip dns set allow-remote-requests=yes
            /ip firewall filter add chain=input action=accept comment=\"unrelated\"
        `
        const report = validateRouterOsConfig(config, '7.12.1')
        expect(report.warnings.some((e) => e.id === 'dns.remoteRequests.unprotected')).toBe(true)
    })
})
