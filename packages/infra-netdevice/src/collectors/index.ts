/**
 * Mock Device Collector
 * 
 * Stub implementation for testing and development.
 * Replace with real SSH/API collectors for production.
 */

import type {
    IDeviceCollector,
    DeviceConnection,
    DeviceFactsData,
    ConfigType,
    DeviceVendor
} from '@contracts/shared'

export class MockCollector implements IDeviceCollector {
    vendor: DeviceVendor = 'generic'

    async collectFacts(connection: DeviceConnection): Promise<DeviceFactsData> {
        // Simulate network delay
        await this.delay(500)

        return {
            hostname: 'mock-device',
            serialNumber: 'MOCK123456',
            uptime: '10 days, 5 hours',
            uptimeSeconds: 886200,
            model: 'Mock-Model-1000',
            osVersion: '1.0.0-mock',
            memory: { total: 4096, used: 2048, free: 2048 },
            cpu: { usage: 25, cores: 2 },
            interfaces: [
                {
                    name: 'eth0',
                    adminStatus: 'up',
                    operStatus: 'up',
                    speed: '1000Mbps',
                    mtu: 1500,
                    ipAddresses: ['192.168.1.1/24']
                },
                {
                    name: 'eth1',
                    adminStatus: 'up',
                    operStatus: 'down',
                    speed: '1000Mbps',
                    mtu: 1500,
                    ipAddresses: []
                }
            ],
            vlans: [
                { id: 1, name: 'default', status: 'active' },
                { id: 100, name: 'Management', status: 'active' }
            ]
        }
    }

    async pullConfig(connection: DeviceConnection, configType: ConfigType): Promise<string> {
        await this.delay(300)

        // Return a sample config based on vendor
        return this.getMockConfig(connection.host)
    }

    async testConnection(connection: DeviceConnection): Promise<boolean> {
        await this.delay(100)
        return true
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    private getMockConfig(host: string): string {
        return `! Mock configuration for ${host}
! Generated at ${new Date().toISOString()}
!
hostname mock-device
!
interface GigabitEthernet0/0
 description WAN Interface
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/1
 description LAN Interface  
 ip address 10.0.0.1 255.255.255.0
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 192.168.1.254
!
ip ssh version 2
!
ntp server 1.1.1.1
ntp server 8.8.8.8
!
logging host 10.0.0.100
!
snmp-server community ***REDACTED*** RO
!
end`
    }
}

/**
 * Cisco SSH Collector (stub)
 */
export class CiscoCollector implements IDeviceCollector {
    vendor: DeviceVendor = 'cisco'

    async collectFacts(connection: DeviceConnection): Promise<DeviceFactsData> {
        // TODO: Implement real SSH collection
        // Would use ssh2 library to execute:
        // - show version
        // - show inventory
        // - show interfaces
        // - show vlan brief

        throw new Error('CiscoCollector: Real SSH not implemented. Use MockCollector for testing.')
    }

    async pullConfig(connection: DeviceConnection, configType: ConfigType): Promise<string> {
        // TODO: Implement real SSH collection
        // Would execute: show running-config / show startup-config

        throw new Error('CiscoCollector: Real SSH not implemented. Use MockCollector for testing.')
    }

    async testConnection(connection: DeviceConnection): Promise<boolean> {
        // TODO: Implement real SSH test
        throw new Error('CiscoCollector: Real SSH not implemented. Use MockCollector for testing.')
    }
}

/**
 * MikroTik SSH Collector (stub)
 */
export class MikroTikCollector implements IDeviceCollector {
    vendor: DeviceVendor = 'mikrotik'

    async collectFacts(connection: DeviceConnection): Promise<DeviceFactsData> {
        // TODO: Implement real SSH collection
        // Would use ssh2 library to execute:
        // - /system identity print
        // - /system resource print
        // - /interface print
        // - /ip address print

        throw new Error('MikroTikCollector: Real SSH not implemented. Use MockCollector for testing.')
    }

    async pullConfig(connection: DeviceConnection, configType: ConfigType): Promise<string> {
        // TODO: Would execute: /export
        throw new Error('MikroTikCollector: Real SSH not implemented. Use MockCollector for testing.')
    }

    async testConnection(connection: DeviceConnection): Promise<boolean> {
        throw new Error('MikroTikCollector: Real SSH not implemented. Use MockCollector for testing.')
    }
}

/**
 * FortiGate API/SSH Collector (stub)
 */
export class FortiGateCollector implements IDeviceCollector {
    vendor: DeviceVendor = 'fortigate'

    async collectFacts(connection: DeviceConnection): Promise<DeviceFactsData> {
        // TODO: Implement FortiGate API or SSH collection
        // API endpoints:
        // - /api/v2/cmdb/system/status
        // - /api/v2/cmdb/system/interface
        // - /api/v2/monitor/system/resource

        throw new Error('FortiGateCollector: Real API not implemented. Use MockCollector for testing.')
    }

    async pullConfig(connection: DeviceConnection, configType: ConfigType): Promise<string> {
        // TODO: Would use API or execute: show full-configuration
        throw new Error('FortiGateCollector: Real API not implemented. Use MockCollector for testing.')
    }

    async testConnection(connection: DeviceConnection): Promise<boolean> {
        throw new Error('FortiGateCollector: Real API not implemented. Use MockCollector for testing.')
    }
}

/**
 * Collector Factory
 */
export class CollectorFactory {
    private collectors: Map<DeviceVendor, IDeviceCollector> = new Map()
    private mockCollector = new MockCollector()

    constructor(useMock = true) {
        if (useMock) {
            // Use mock for all vendors in dev/test
            this.collectors.set('cisco', this.mockCollector)
            this.collectors.set('mikrotik', this.mockCollector)
            this.collectors.set('fortigate', this.mockCollector)
            this.collectors.set('generic', this.mockCollector)
        } else {
            // Register real collectors
            this.collectors.set('cisco', new CiscoCollector())
            this.collectors.set('mikrotik', new MikroTikCollector())
            this.collectors.set('fortigate', new FortiGateCollector())
            this.collectors.set('generic', this.mockCollector)
        }
    }

    getCollector(vendor: DeviceVendor): IDeviceCollector {
        return this.collectors.get(vendor) || this.mockCollector
    }
}

// Default factory uses mock
export const collectorFactory = new CollectorFactory(true)
