export type Vendor = 'cisco' | 'fortigate' | 'mikrotik'

export type GeneratorAction =
    | 'baseline'
    | 'wan_uplink'
    | 'lan_vlan'
    | 'dhcp_server'
    | 'static_route'
    | 'ospf'
    | 'nat_overload'
    | 'firewall_basic'
    | 'load_balancing'
    | 'bridge'
    | 'secure_baseline'

export interface GenerateConfigInput {
    vendor: Vendor
    action: GeneratorAction
    params: Record<string, any>
}

/**
 * Generate vendor-specific CLI configuration snippets.
 * This is deterministic template-based (no external calls).
 */
export function generateConfigCommand(input: GenerateConfigInput): string {
    const { vendor, action, params } = input
    switch (vendor) {
        case 'cisco':
            return generateCisco(action, params)
        case 'fortigate':
            return generateFortigate(action, params)
        case 'mikrotik':
            return generateMikrotik(action, params)
        default:
            throw new Error(`Unsupported vendor: ${vendor}`)
    }
}

function requireParam<T>(params: Record<string, any>, key: string): T {
    if (params[key] === undefined || params[key] === null || params[key] === '') {
        throw new Error(`Missing param: ${key}`)
    }
    return params[key] as T
}

function generateCisco(action: GeneratorAction, params: Record<string, any>): string {
    switch (action) {
        case 'baseline': {
            const hostname = requireParam<string>(params, 'hostname')
            const domain = params.domain || 'local'
            const dns = (params.dnsServers as string[] | undefined)?.join(' ') || ''
            const ntp = (params.ntpServers as string[] | undefined)?.map(s => `ntp server ${s}`).join('\n') || ''
            return [
                'configure terminal',
                `hostname ${hostname}`,
                `ip domain-name ${domain}`,
                dns ? `ip name-server ${dns}` : '',
                ntp,
                'service timestamps debug datetime msec',
                'service timestamps log datetime msec',
                'no ip domain-lookup',
                'line con 0',
                ' logging synchronous',
                ' exec-timeout 10 0',
                ' privilege level 15',
                'line vty 0 4',
                ' transport input ssh',
                ' login local',
                ' exec-timeout 10 0',
                'end'
            ].filter(Boolean).join('\n')
        }
        case 'wan_uplink': {
            const iface = requireParam<string>(params, 'interface')
            const ip = requireParam<string>(params, 'ip')
            const mask = requireParam<string>(params, 'mask')
            const gateway = requireParam<string>(params, 'gateway')
            const desc = params.description ? `\n description ${params.description}` : ''
            return `configure terminal\ninterface ${iface}${desc}\n ip address ${ip} ${mask}\n no shutdown\nexit\nip route 0.0.0.0 0.0.0.0 ${gateway}\nend`
        }
        case 'lan_vlan': {
            const vlanId = requireParam<number>(params, 'vlanId')
            const name = params.name ? `\n name ${params.name}` : ''
            const ip = requireParam<string>(params, 'ip')
            const mask = requireParam<string>(params, 'mask')
            return [
                'configure terminal',
                `vlan ${vlanId}${name}`,
                'exit',
                `interface Vlan${vlanId}`,
                ` ip address ${ip} ${mask}`,
                ' no shutdown',
                'exit',
                'end'
            ].join('\n')
        }
        case 'dhcp_server': {
            const pool = requireParam<string>(params, 'pool')
            const network = requireParam<string>(params, 'network')
            const mask = requireParam<string>(params, 'mask')
            const gateway = requireParam<string>(params, 'gateway')
            const dns = (params.dnsServers as string[] | undefined)?.join(' ') || ''
            return [
                'configure terminal',
                `ip dhcp pool ${pool}`,
                ` network ${network} ${mask}`,
                ` default-router ${gateway}`,
                dns ? ` dns-server ${dns}` : '',
                'exit',
                'end'
            ].filter(Boolean).join('\n')
        }
        case 'static_route': {
            const network = requireParam<string>(params, 'network')
            const mask = requireParam<string>(params, 'mask')
            const nextHop = requireParam<string>(params, 'nextHop')
            return `configure terminal\nip route ${network} ${mask} ${nextHop}\nend`
        }
        case 'ospf': {
            const processId = params.processId ?? 1
            const area = params.area ?? '0'
            const networks = requireParam<string[]>(params, 'networks')
            const nets = networks.map(n => ` network ${n} area ${area}`).join('\n')
            return `configure terminal\nrouter ospf ${processId}\n${nets}\nexit\nend`
        }
        case 'nat_overload': {
            const insideInterfaces = requireParam<string[]>(params, 'insideInterfaces')
            const outsideInterface = requireParam<string>(params, 'outsideInterface')
            const aclName = params.aclName || 'NAT_INSIDE'
            const insideNetworks = requireParam<string[]>(params, 'insideNetworks')
            const aclLines = insideNetworks.map(net => `access-list ${aclName} permit ${net}`).join('\n')
            const ifInside = insideInterfaces.map(iface => `interface ${iface}\n ip nat inside`).join('\n')
            return [
                'configure terminal',
                aclLines,
                ifInside,
                `interface ${outsideInterface}\n ip nat outside`,
                `ip nat inside source list ${aclName} interface ${outsideInterface} overload`,
                'end'
            ].join('\n')
        }
        case 'firewall_basic': {
            const outside = requireParam<string>(params, 'outsideInterface')
            const inside = requireParam<string>(params, 'insideInterface')
            const insideAcl = params.insideAcl || 'INSIDE-IN'
            return [
                'configure terminal',
                `interface ${inside}\n ip access-group ${insideAcl} in`,
                `ip access-list extended ${insideAcl}`,
                ' permit ip any any',
                'exit',
                `interface ${outside}\n ip access-group OUTSIDE-IN in`,
                'ip access-list extended OUTSIDE-IN',
                ' permit icmp any any',
                ' permit tcp any host x.x.x.x eq 22',
                ' deny   ip any any log',
                'exit',
                'end'
            ].join('\n')
        }
        case 'load_balancing': {
            const gw1 = requireParam<string>(params, 'gateway1')
            const gw2 = requireParam<string>(params, 'gateway2')
            return [
                'configure terminal',
                `ip route 0.0.0.0 0.0.0.0 ${gw1} 1`,
                `ip route 0.0.0.0 0.0.0.0 ${gw2} 2`,
                'end'
            ].join('\n')
        }
        case 'bridge': {
            const vlanId = requireParam<number>(params, 'vlanId')
            const ports = requireParam<string[]>(params, 'ports')
            const portCfg = ports.map(p => `interface ${p}\n switchport access vlan ${vlanId}\n switchport mode access`).join('\n')
            return [
                'configure terminal',
                `vlan ${vlanId}`,
                portCfg,
                'end'
            ].join('\n')
        }
        case 'secure_baseline': {
            // High-level secure baseline: mgmt lockdown, AAA local, SSH only, SNMPv3, syslog, NTP, ACLs
            const hostname = params.hostname || 'HOSP-CORE'
            const mgmtAcl = params.mgmtAcl || 'MGMT-ACL'
            const mgmtNetwork = params.mgmtNetwork || '10.0.100.0 0.0.0.255'
            const syslog = params.syslog || '10.0.200.10'
            const snmpUser = params.snmpUser || 'secops'
            const snmpAuth = params.snmpAuth || 'authpass'
            const snmpPriv = params.snmpPriv || 'privpass'
            const ntp = (params.ntpServers as string[] | undefined)?.map(s => `ntp server ${s}`).join('\n') || ''
            return [
                'configure terminal',
                `hostname ${hostname}`,
                'no ip http server',
                'no ip http secure-server',
                'ip ssh version 2',
                'service password-encryption',
                'aaa new-model',
                'username admin privilege 15 secret Admin@123',
                `ip access-list standard ${mgmtAcl}`,
                ` permit ${mgmtNetwork}`,
                ' deny any log',
                'line vty 0 4',
                ` access-class ${mgmtAcl} in`,
                ' transport input ssh',
                ' login local',
                ' exec-timeout 10 0',
                ntp,
                `logging host ${syslog}`,
                'logging trap warnings',
                `snmp-server group SECOPS v3 priv`,
                `snmp-server user ${snmpUser} SECOPS v3 auth sha ${snmpAuth} priv aes 128 ${snmpPriv}`,
                'snmp-server enable traps syslog',
                'ip tcp synwait-time 10',
                'ip ssh time-out 60',
                'ip ssh authentication-retries 2',
                'end'
            ].filter(Boolean).join('\n')
        }
        default:
            throw new Error(`Unsupported action for Cisco: ${action}`)
    }
}

function generateFortigate(action: GeneratorAction, params: Record<string, any>): string {
    switch (action) {
        case 'baseline': {
            const hostname = requireParam<string>(params, 'hostname')
            const dns = (params.dnsServers as string[] | undefined)?.map(s => ` set dns-server1 ${s}`).join('\n') || ''
            const ntp = (params.ntpServers as string[] | undefined)?.map(s => ` set ntpserver ${s}`).join('\n') || ''
            return [
                'config system global',
                ` set hostname "${hostname}"`,
                ' set timezone 04',
                'end',
                dns ? `config system dns\n${dns}\nend` : '',
                ntp ? `config system ntp\n set ntpsync enable\n${ntp}\nend` : ''
            ].filter(Boolean).join('\n')
        }
        case 'wan_uplink': {
            const iface = requireParam<string>(params, 'interface')
            const ip = requireParam<string>(params, 'ip')
            const mask = requireParam<string>(params, 'mask')
            const gw = requireParam<string>(params, 'gateway')
            return [
                'config system interface',
                ` edit "${iface}"`,
                `  set ip ${ip} ${mask}`,
                '  set allowaccess ping https ssh',
                ' next',
                'end',
                'config router static',
                ' edit 1',
                '  set dst 0.0.0.0 0.0.0.0',
                `  set gateway ${gw}`,
                `  set device "${iface}"`,
                ' next',
                'end'
            ].join('\n')
        }
        case 'lan_vlan': {
            const vlanId = requireParam<number>(params, 'vlanId')
            const iface = requireParam<string>(params, 'interface')
            const name = params.name || `vlan${vlanId}`
            const ip = requireParam<string>(params, 'ip')
            const mask = requireParam<string>(params, 'mask')
            return [
                'config system interface',
                ` edit "${name}"`,
                `  set vdom "root"`,
                `  set interface "${iface}"`,
                `  set vlanid ${vlanId}`,
                `  set ip ${ip} ${mask}`,
                '  set allowaccess ping',
                ' next',
                'end'
            ].join('\n')
        }
        case 'dhcp_server': {
            const iface = requireParam<string>(params, 'interface')
            const start = requireParam<string>(params, 'start')
            const end = requireParam<string>(params, 'end')
            const gateway = requireParam<string>(params, 'gateway')
            const dns = (params.dnsServers as string[] | undefined)?.[0]
            return [
                'config system dhcp server',
                ' edit 1',
                `  set interface "${iface}"`,
                `  set default-gateway ${gateway}`,
                dns ? `  set dns-server1 ${dns}` : '',
                `  config ip-range`,
                '   edit 1',
                `    set start-ip ${start}`,
                `    set end-ip ${end}`,
                '   next',
                '  end',
                ' next',
                'end'
            ].filter(Boolean).join('\n')
        }
        case 'static_route': {
            const network = requireParam<string>(params, 'network')
            const mask = requireParam<string>(params, 'mask')
            const nextHop = requireParam<string>(params, 'nextHop')
            const device = params.device ? `\n  set device "${params.device}"` : ''
            return `config router static\n edit 0\n  set dst ${network} ${mask}\n  set gateway ${nextHop}${device}\n next\nend`
        }
        case 'ospf': {
            const routerId = params.routerId || '1.1.1.1'
            const area = params.area || '0.0.0.0'
            const networks = requireParam<string[]>(params, 'networks')
            const nets = networks.map(n => `  config network\n   edit ${n}\n    set prefix ${n}\n    set area "${area}"\n   next\n  end`).join('\n')
            return [
                'config router ospf',
                ` set router-id ${routerId}`,
                nets || '',
                'end'
            ].join('\n')
        }
        case 'nat_overload': {
            const src = params.srcintf || 'lan'
            const dst = params.dstintf || 'wan'
            return [
                'config firewall policy',
                ' edit 0',
                `  set srcintf "${src}"`,
                `  set dstintf "${dst}"`,
                '  set srcaddr "all"',
                '  set dstaddr "all"',
                '  set action accept',
                '  set schedule "always"',
                '  set service "ALL"',
                '  set nat enable',
                ' next',
                'end'
            ].join('\n')
        }
        case 'firewall_basic': {
            const inside = params.srcintf || 'lan'
            const outside = params.dstintf || 'wan'
            return [
                'config firewall policy',
                ' edit 1',
                `  set srcintf "${inside}"`,
                `  set dstintf "${outside}"`,
                '  set srcaddr "all"',
                '  set dstaddr "all"',
                '  set action accept',
                '  set schedule "always"',
                '  set service "ALL"',
                '  set nat enable',
                ' next',
                'end',
                'config firewall policy',
                ' edit 2',
                `  set srcintf "${outside}"`,
                `  set dstintf "${inside}"`,
                '  set srcaddr "all"',
                '  set dstaddr "all"',
                '  set action deny',
                '  set schedule "always"',
                '  set service "ALL"',
                ' next',
                'end'
            ].join('\n')
        }
        case 'load_balancing': {
            const gw1 = requireParam<string>(params, 'gateway1')
            const gw2 = requireParam<string>(params, 'gateway2')
            const dst1 = params.dstintf1 || 'wan1'
            const dst2 = params.dstintf2 || 'wan2'
            return [
                'config router static',
                ' edit 1',
                '  set dst 0.0.0.0 0.0.0.0',
                `  set gateway ${gw1}`,
                `  set device "${dst1}"`,
                '  set distance 10',
                ' next',
                ' edit 2',
                '  set dst 0.0.0.0 0.0.0.0',
                `  set gateway ${gw2}`,
                `  set device "${dst2}"`,
                '  set distance 20',
                ' next',
                'end'
            ].join('\n')
        }
        case 'bridge': {
            const name = params.name || 'br0'
            const ports = requireParam<string[]>(params, 'ports')
            const portLines = ports.map(p => ` config member\n  edit "${p}"\n  next`).join('\n')
            return [
                'config system interface',
                ` edit "${name}"`,
                '  set type bridge',
                ' next',
                'end',
                'config system switch-interface',
                ` edit "${name}"`,
                portLines,
                ' next',
                'end'
            ].join('\n')
        }
        case 'secure_baseline': {
            const hostname = params.hostname || 'FGT-HOSP'
            const adminPw = params.adminPassword || 'Admin@123'
            const syslog = params.syslog || '10.0.200.10'
            const ntp = (params.ntpServers as string[] | undefined)?.map(s => ` set ntpserver ${s}`).join('\n') || ''
            const mgmt = params.mgmtSubnet || '10.0.100.0 255.255.255.0'
            return [
                'config system global',
                ` set hostname "${hostname}"`,
                ' set admin-https disable',
                ' set admin-scp enable',
                ' set admin-ssh-port 22',
                ' set admin-lockout-threshold 3',
                ' set admin-lockout-duration 300',
                ` set admin-password "${adminPw}"`,
                'end',
                ntp ? `config system ntp\n set ntpsync enable\n${ntp}\nend` : '',
                `config log syslogd setting\n set status enable\n set server "${syslog}"\n set facility local7\nend`,
                'config system snmp sysinfo',
                ' set description "Healthcare L3"',
                ' set location "DataCenter"',
                ' set contact "secops"',
                'end',
                'config firewall address',
                ' edit "MGMT_NET"',
                `  set subnet ${mgmt}`,
                ' next',
                'end',
                'config firewall policy',
                ' edit 10',
                '  set srcintf "mgmt"',
                '  set dstintf "wan1"',
                '  set srcaddr "MGMT_NET"',
                '  set dstaddr "all"',
                '  set action accept',
                '  set schedule "always"',
                '  set service "ALL"',
                '  set logtraffic all',
                ' next',
                'end'
            ].filter(Boolean).join('\n')
        }
        default:
            throw new Error(`Unsupported action for Fortigate: ${action}`)
    }
}

function generateMikrotik(action: GeneratorAction, params: Record<string, any>): string {
    switch (action) {
        case 'baseline': {
            const hostname = requireParam<string>(params, 'hostname')
            const dns = (params.dnsServers as string[] | undefined)?.map(s => s).join(',') || ''
            const ntp = (params.ntpServers as string[] | undefined)?.map(s => s).join(',') || ''
            return [
                `/system identity set name=${hostname}`,
                dns ? `/ip dns set servers=${dns} allow-remote-requests=yes` : '',
                ntp ? `/system ntp client set enabled=yes primary-ntp=${ntp}` : '',
                '/system logging add topics=firewall action=memory'
            ].filter(Boolean).join('\n')
        }
        case 'wan_uplink': {
            const iface = requireParam<string>(params, 'interface')
            const cidr = requireParam<string>(params, 'cidr')
            const gateway = requireParam<string>(params, 'gateway')
            return [
                `/ip address add address=${cidr} interface=${iface} comment="WAN"`,
                `/ip route add dst-address=0.0.0.0/0 gateway=${gateway}`
            ].join('\n')
        }
        case 'lan_vlan': {
            const vlanId = requireParam<number>(params, 'vlanId')
            const iface = requireParam<string>(params, 'interface')
            const name = params.name || `vlan${vlanId}`
            const cidr = requireParam<string>(params, 'cidr')
            return [
                `/interface vlan add name=${name} vlan-id=${vlanId} interface=${iface}`,
                `/ip address add address=${cidr} interface=${name}`
            ].join('\n')
        }
        case 'dhcp_server': {
            const interfaceName = requireParam<string>(params, 'interface')
            const poolName = params.pool || 'dhcp_pool'
            const start = requireParam<string>(params, 'start')
            const end = requireParam<string>(params, 'end')
            const gateway = requireParam<string>(params, 'gateway')
            const dns = (params.dnsServers as string[] | undefined)?.[0]
            return [
                `/ip pool add name=${poolName} ranges=${start}-${end}`,
                `/ip dhcp-server network add address=${gateway} gateway=${gateway} dns-server=${dns || gateway}`,
                `/ip dhcp-server add name=dhcp1 interface=${interfaceName} address-pool=${poolName} lease-time=1d disabled=no`
            ].join('\n')
        }
        case 'static_route': {
            const dst = requireParam<string>(params, 'dst')
            const gateway = requireParam<string>(params, 'gateway')
            return `/ip route add dst-address=${dst} gateway=${gateway}`
        }
        case 'ospf': {
            const area = params.area || 'backbone'
            const networks = requireParam<string[]>(params, 'networks')
            const netLines = networks.map(n => `/routing ospf network add network=${n} area=${area}`).join('\n')
            return [
                `/routing ospf area add name=${area}`,
                netLines
            ].join('\n')
        }
        case 'nat_overload': {
            const outIface = requireParam<string>(params, 'outInterface')
            return `/ip firewall nat add chain=srcnat out-interface=${outIface} action=masquerade`
        }
        case 'firewall_basic': {
            return [
                '/ip firewall filter add chain=input action=accept connection-state=established,related',
                '/ip firewall filter add chain=input action=drop connection-state=invalid',
                '/ip firewall filter add chain=input protocol=tcp dst-port=22,80,443 action=accept',
                '/ip firewall filter add chain=input in-interface=!lan action=drop',
                '/ip firewall filter add chain=forward action=accept connection-state=established,related',
                '/ip firewall filter add chain=forward action=drop connection-state=invalid',
                '/ip firewall filter add chain=forward action=accept connection-state=new in-interface=lan out-interface=WAN',
                '/ip firewall filter add chain=forward action=drop'
            ].join('\n')
        }
        case 'load_balancing': {
            const gw1 = requireParam<string>(params, 'gateway1')
            const gw2 = requireParam<string>(params, 'gateway2')
            return [
                `/ip route add dst-address=0.0.0.0/0 gateway=${gw1},${gw2} check-gateway=ping`,
                '/ip firewall mangle add chain=prerouting dst-address-type=!local action=mark-connection new-connection-mark=WAN1 passthrough=yes per-connection-classifier=src-address:2/0',
                '/ip firewall mangle add chain=prerouting dst-address-type=!local action=mark-connection new-connection-mark=WAN2 passthrough=yes per-connection-classifier=src-address:2/1',
                '/ip firewall mangle add chain=prerouting connection-mark=WAN1 action=mark-routing new-routing-mark=to_WAN1 passthrough=yes',
                '/ip firewall mangle add chain=prerouting connection-mark=WAN2 action=mark-routing new-routing-mark=to_WAN2 passthrough=yes',
                '/ip route add dst-address=0.0.0.0/0 gateway=' + gw1 + ' routing-mark=to_WAN1 check-gateway=ping',
                '/ip route add dst-address=0.0.0.0/0 gateway=' + gw2 + ' routing-mark=to_WAN2 check-gateway=ping'
            ].join('\n')
        }
        case 'bridge': {
            const name = params.name || 'bridge1'
            const ports = requireParam<string[]>(params, 'ports')
            const portLines = ports.map(p => `/interface bridge port add bridge=${name} interface=${p}`).join('\n')
            return [
                `/interface bridge add name=${name} comment="LAN bridge"`,
                portLines
            ].join('\n')
        }
        case 'secure_baseline': {
            const hostname = params.hostname || 'RB-HOSP'
            const syslog = params.syslog || '10.0.200.10'
            const mgmt = params.mgmtCidr || '10.0.100.0/24'
            const ntp = (params.ntpServers as string[] | undefined)?.[0] || 'pool.ntp.org'
            return [
                `/system identity set name=${hostname}`,
                `/system ntp client set enabled=yes primary-ntp=${ntp}`,
                `/system logging action add name=remote target=remote remote=${syslog} remote-port=514`,
                `/system logging add topics=info action=remote`,
                '/ip service set www disabled=yes',
                '/ip service set telnet disabled=yes',
                '/ip service set ftp disabled=yes',
                '/ip service set api disabled=yes',
                '/ip service set api-ssl disabled=yes',
                '/ip service set ssh address=' + mgmt,
                '/ip firewall filter add chain=input action=accept connection-state=established,related',
                '/ip firewall filter add chain=input action=drop connection-state=invalid',
                '/ip firewall filter add chain=input src-address=' + mgmt + ' action=accept',
                '/ip firewall filter add chain=input in-interface=!mgmt action=drop',
                '/ip firewall filter add chain=forward action=accept connection-state=established,related',
                '/ip firewall filter add chain=forward action=drop connection-state=invalid',
                '/ip firewall filter add chain=forward action=drop connection-state=new in-interface=!lan'
            ].join('\n')
        }
        default:
            throw new Error(`Unsupported action for Mikrotik: ${action}`)
    }
}
