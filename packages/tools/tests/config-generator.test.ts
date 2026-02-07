import { describe, it, expect } from 'vitest'
import { generateConfigCommand } from '../src/core-tools/config-generator.js'

describe('config-generator', () => {
    it('generates cisco interface ip config', () => {
        const cmd = generateConfigCommand({
            vendor: 'cisco',
            action: 'set_interface_ip',
            params: { interface: 'GigabitEthernet0/1', ip: '10.0.0.1', mask: '255.255.255.0', description: 'Uplink' }
        })
        expect(cmd).toContain('interface GigabitEthernet0/1')
        expect(cmd).toContain('ip address 10.0.0.1 255.255.255.0')
    })

    it('throws on missing param', () => {
        expect(() => generateConfigCommand({
            vendor: 'fortigate',
            action: 'set_interface_ip',
            // @ts-expect-error - Testing missing required parameters
            params: { interface: 'port1' }
        })).toThrow(/Missing param/)
    })

    it('generates mikrotik vlan', () => {
        const cmd = generateConfigCommand({
            vendor: 'mikrotik',
            action: 'lan_vlan',
            params: { vlanId: 100, interface: 'ether1', name: 'corp', cidr: '192.168.100.1/24' }
        })
        expect(cmd).toContain('vlan-id=100')
        expect(cmd).toContain('interface=ether1')
    })

    it('generates cisco baseline with hostname', () => {
        const cmd = generateConfigCommand({
            vendor: 'cisco',
            action: 'baseline',
            params: { hostname: 'CORE1', dnsServers: ['8.8.8.8'] }
        })
        expect(cmd).toContain('hostname CORE1')
        expect(cmd).toContain('ip name-server 8.8.8.8')
    })
})
