/**
 * Parser Unit Tests
 */
import { describe, it, expect } from 'vitest'
import { CiscoParser, MikroTikParser, FortiGateParser, parserRegistry } from '../src/parsers/index.js'

describe('CiscoParser', () => {
    const parser = new CiscoParser()

    const sampleCiscoConfig = `
hostname core-switch-01
!
enable secret 5 $1$xyz$xxxxxxxxx
!
vlan 10
 name Management
vlan 20
 name Users
vlan 30-35
 name Guest-Range
!
interface GigabitEthernet0/1
 description Uplink to Router
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30-35
 spanning-tree portfast
!
interface GigabitEthernet0/2
 description User Access Port
 switchport mode access
 switchport access vlan 20
 ip address 192.168.1.1 255.255.255.0
!
interface Vlan10
 ip address 10.0.10.1 255.255.255.0
!
ip route 0.0.0.0 0.0.0.0 10.0.10.254
ip route 172.16.0.0 255.255.0.0 10.0.10.253
!
ip access-list extended ALLOW_HTTP
 permit tcp any any eq 80
 permit tcp any any eq 443
 deny ip any any log
!
username admin privilege 15 secret 0 admin123
username netops privilege 10 secret 5 $1$xxx$yyyyyyy
!
ip ssh version 2
ip ssh time-out 60
!
snmp-server community public RO
snmp-server community private RW
!
ntp server 10.0.0.100
ntp server 10.0.0.101
!
logging host 10.0.0.200
logging trap informational
!
line vty 0 4
 transport input ssh
!
end
`

    it('should parse hostname', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.device.hostname).toBe('core-switch-01')
    })

    it('should parse VLANs', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.vlans.length).toBeGreaterThan(0)

        const vlan10 = result.normalized.vlans.find(v => v.id === 10)
        expect(vlan10).toBeDefined()
        expect(vlan10?.name).toBe('Management')
    })

    it('should parse interfaces', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.interfaces.length).toBeGreaterThan(0)

        const gi01 = result.normalized.interfaces.find(i => i.name.includes('GigabitEthernet0/1'))
        expect(gi01).toBeDefined()
        expect(gi01?.description).toBe('Uplink to Router')
        expect(gi01?.mode).toBe('trunk')
    })

    it('should parse static routes', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.routing.static.length).toBeGreaterThan(0)

        const defaultRoute = result.normalized.routing.static.find(r => r.network === '0.0.0.0/0')
        expect(defaultRoute).toBeDefined()
        expect(defaultRoute?.nextHop).toBe('10.0.10.254')
    })

    it('should parse ACLs', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.security.acls.length).toBeGreaterThan(0)

        const httpAcl = result.normalized.security.acls.find(a => a.name === 'ALLOW_HTTP')
        expect(httpAcl).toBeDefined()
        expect(httpAcl?.entries.length).toBe(3) // 2 permits + 1 deny
    })

    it('should parse SSH configuration', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.mgmt.ssh?.enabled).toBe(true)
        expect(result.normalized.mgmt.ssh?.version).toBe(2)
    })

    it('should parse NTP servers', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.mgmt.ntp?.servers.length).toBe(2)
        expect(result.normalized.mgmt.ntp?.servers).toContain('10.0.0.100')
    })

    it('should parse users', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.security.users.length).toBe(2)

        const admin = result.normalized.security.users.find(u => u.name === 'admin')
        expect(admin).toBeDefined()
        expect(admin?.privilege).toBe(15)
    })

    it('should set vendor to cisco', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.normalized.device.vendor).toBe('cisco')
    })

    it('should return no errors for valid config', async () => {
        const result = await parser.parse(sampleCiscoConfig)
        expect(result.errors.length).toBe(0)
    })
})

describe('MikroTikParser', () => {
    const parser = new MikroTikParser()

    const sampleMikroTikConfig = `
# RouterOS export
/system identity
set name=mikrotik-gw-01

/interface bridge
add name=bridge-lan vlan-filtering=yes

/interface vlan
add interface=bridge-lan name=vlan10-mgmt vlan-id=10
add interface=bridge-lan name=vlan20-users vlan-id=20

/interface bridge vlan
add bridge=bridge-lan tagged=bridge-lan,ether1 vlan-ids=10
add bridge=bridge-lan tagged=bridge-lan untagged=ether2,ether3 vlan-ids=20

/interface bridge port
add bridge=bridge-lan interface=ether1
add bridge=bridge-lan interface=ether2 pvid=20
add bridge=bridge-lan interface=ether3 pvid=20

/ip address
add address=192.168.1.1/24 interface=vlan10-mgmt
add address=10.0.20.1/24 interface=vlan20-users

/ip route
add dst-address=0.0.0.0/0 gateway=192.168.1.254
add dst-address=172.16.0.0/16 gateway=192.168.1.253

/ip firewall filter
add chain=input action=accept protocol=icmp
add chain=input action=accept connection-state=established,related
add chain=input action=drop in-interface=ether1

/ip firewall nat
add chain=srcnat action=masquerade out-interface=ether1

/user
add name=admin group=full
add name=netops group=read

/ip ssh
set strong-crypto=yes forwarding-enabled=no

/system ntp client
set enabled=yes primary-ntp=10.0.0.100 secondary-ntp=10.0.0.101

/snmp
set enabled=yes contact="admin@example.com" location="DC1"

/system logging
add action=remote topics=info,warning,error
add action=remote topics=firewall
`

    it('should parse hostname (identity)', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        expect(result.normalized.device.hostname).toBe('mikrotik-gw-01')
    })

    it('should parse VLANs', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        expect(result.normalized.vlans.length).toBeGreaterThan(0)

        const vlan10 = result.normalized.vlans.find(v => v.id === 10)
        expect(vlan10).toBeDefined()
        expect(vlan10?.name).toBe('vlan10-mgmt')
    })

    it('should parse IP addresses on interfaces', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        const vlan10Iface = result.normalized.interfaces.find(i => i.name.includes('vlan10'))
        expect(vlan10Iface?.ipv4).toBe('192.168.1.1')
    })

    it('should parse static routes', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        expect(result.normalized.routing.static.length).toBe(2)

        const defaultRoute = result.normalized.routing.static.find(r => r.network === '0.0.0.0/0')
        expect(defaultRoute?.nextHop).toBe('192.168.1.254')
    })

    it('should parse firewall filter rules as ACLs', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        const inputAcl = result.normalized.security.acls.find(a => a.name === 'filter-input')
        expect(inputAcl).toBeDefined()
        expect(inputAcl?.entries.length).toBeGreaterThan(0)
    })

    it('should parse NAT rules', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        const natAcl = result.normalized.security.acls.find(a => a.name === 'nat-srcnat')
        expect(natAcl).toBeDefined()
    })

    it('should parse users', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        expect(result.normalized.security.users.length).toBe(2)

        const admin = result.normalized.security.users.find(u => u.name === 'admin')
        expect(admin?.role).toBe('full')
    })

    it('should set vendor to mikrotik', async () => {
        const result = await parser.parse(sampleMikroTikConfig)
        expect(result.normalized.device.vendor).toBe('mikrotik')
    })
})

describe('FortiGateParser', () => {
    const parser = new FortiGateParser()

    const sampleFortiGateConfig = `
config system global
    set hostname "fortigate-fw-01"
    set timezone "America/New_York"
end
config system interface
    edit "wan1"
        set ip 203.0.113.1 255.255.255.0
        set allowaccess ping https ssh snmp
        set type physical
        set role wan
    next
    edit "lan"
        set ip 10.0.1.1 255.255.255.0
        set allowaccess ping https ssh
        set type physical
        set role lan
    next
    edit "vlan100"
        set vdom "root"
        set ip 10.100.0.1 255.255.255.0
        set allowaccess ping
        set interface "lan"
        set vlanid 100
    next
end
config router static
    edit 1
        set gateway 203.0.113.254
        set device "wan1"
    next
    edit 2
        set dst 172.16.0.0 255.255.0.0
        set gateway 10.0.1.254
        set device "lan"
    next
end
config firewall policy
    edit 1
        set name "Allow-Outbound"
        set srcintf "lan"
        set dstintf "wan1"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
    next
    edit 2
        set name "Block-All"
        set srcintf "wan1"
        set dstintf "lan"
        set srcaddr "all"
        set dstaddr "all"
        set action deny
        set schedule "always"
        set service "ALL"
    next
end
config firewall vip
    edit "WebServer-VIP"
        set extip 203.0.113.10
        set mappedip "10.0.1.100"
        set extintf "wan1"
        set portforward enable
        set extport 443
        set mappedport 443
    next
end
config system admin
    edit "admin"
        set accprofile "super_admin"
        set vdom "root"
    next
    edit "netops"
        set accprofile "read_only"
        set vdom "root"
    next
end
config system ntp
    set ntpsync enable
    set server-mode disable
    config ntpserver
        edit 1
            set server "10.0.0.100"
        next
        edit 2
            set server "10.0.0.101"
        next
    end
end
config log syslogd setting
    set status enable
    set server "10.0.0.200"
    set port 514
    set facility local7
end
end
`

    it('should parse hostname', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.device.hostname).toBe('fortigate-fw-01')
    })

    it('should parse interfaces', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.interfaces.length).toBeGreaterThan(0)

        const wan1 = result.normalized.interfaces.find(i => i.name === 'wan1')
        expect(wan1).toBeDefined()
        expect(wan1?.ipv4).toBe('203.0.113.1')
    })

    it('should parse VLAN interfaces', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        const vlan100 = result.normalized.vlans.find(v => v.id === 100)
        expect(vlan100).toBeDefined()
        expect(vlan100?.name).toBe('vlan100')
    })

    it('should parse static routes', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.routing.static.length).toBe(2)

        const defaultRoute = result.normalized.routing.static.find(r => r.network === '0.0.0.0/0')
        expect(defaultRoute?.nextHop).toBe('203.0.113.254')
    })

    it('should parse firewall policies as ACLs', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        const policyAcl = result.normalized.security.acls.find(a => a.name === 'firewall-policy')
        expect(policyAcl).toBeDefined()
        expect(policyAcl?.entries.length).toBe(2)
    })

    it('should parse admin users', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.security.users.length).toBe(2)

        const admin = result.normalized.security.users.find(u => u.name === 'admin')
        expect(admin?.role).toBe('super_admin')
    })

    it('should parse NTP servers', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.mgmt.ntp?.servers).toContain('10.0.0.100')
    })

    it('should set vendor to fortigate', async () => {
        const result = await parser.parse(sampleFortiGateConfig)
        expect(result.normalized.device.vendor).toBe('fortigate')
    })
})

describe('ParserRegistry', () => {
    it('should have all parsers registered', () => {
        expect(parserRegistry.getParser('cisco')).toBeDefined()
        expect(parserRegistry.getParser('mikrotik')).toBeDefined()
        expect(parserRegistry.getParser('fortigate')).toBeDefined()
    })

    it('should detect Cisco config', () => {
        const ciscoConfig = `hostname test-router
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
end`
        const parser = parserRegistry.detectAndGetParser(ciscoConfig)
        expect(parser).toBeDefined()
    })

    it('should detect MikroTik config', () => {
        const mikrotikConfig = `/system identity
set name=test-router
/ip address
add address=10.0.0.1/24 interface=ether1`
        const parser = parserRegistry.detectAndGetParser(mikrotikConfig)
        expect(parser).toBeDefined()
    })

    it('should detect FortiGate config', () => {
        const fortigateConfig = `config system global
    set hostname "fortigate-test"
end`
        const parser = parserRegistry.detectAndGetParser(fortigateConfig)
        expect(parser).toBeDefined()
    })
})
