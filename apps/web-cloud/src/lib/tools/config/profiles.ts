import type { CanonicalConfig, CanonicalInterface, CanonicalVlan, CanonicalServices, CanonicalFirewall, Vendor, EnvironmentTier } from './types'

export type CliProfileNetworkDefaults = {
    vlans: Array<Pick<CanonicalVlan, 'id' | 'name'>>
    interfaces: Array<Pick<CanonicalInterface, 'id' | 'name' | 'role' | 'vlanId' | 'description' | 'enabled'>>
}

export type CliProfile = {
    id: string
    name: string
    vendor: Vendor
    environment: EnvironmentTier
    baseConfig: {
        hostname?: string
        firewall: CanonicalFirewall
    }
    servicesConfig: CanonicalServices
    networkDefaults: CliProfileNetworkDefaults
    createdAt: string
    updatedAt: string
}

const STORAGE_KEY = 'netops.cliProfiles.v1'
const ACTIVE_KEY = 'netops.cliProfiles.active.v1'

const createId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `profile_${Math.random().toString(36).slice(2, 9)}`
}

const readStorage = <T>(key: string, fallback: T): T => {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    try {
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

const writeStorage = (key: string, value: unknown) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
}

export function loadProfiles(): CliProfile[] {
    return readStorage<CliProfile[]>(STORAGE_KEY, [])
}

export function saveProfiles(profiles: CliProfile[]): void {
    writeStorage(STORAGE_KEY, profiles)
}

export function getActiveProfileId(): string {
    return readStorage<string>(ACTIVE_KEY, '')
}

export function setActiveProfileId(id: string): void {
    writeStorage(ACTIVE_KEY, id)
}

export function buildProfileFromConfig(
    config: CanonicalConfig,
    vendor: Vendor,
    environment: EnvironmentTier,
    name: string,
    includeHostname: boolean
): CliProfile {
    const networkDefaults: CliProfileNetworkDefaults = {
        vlans: config.vlans.map((vlan) => ({ id: vlan.id, name: vlan.name })),
        interfaces: config.interfaces.map((iface) => ({
            id: iface.id,
            name: iface.name,
            role: iface.role,
            vlanId: iface.vlanId,
            description: iface.description,
            enabled: iface.enabled
        }))
    }

    const now = new Date().toISOString()

    return {
        id: createId(),
        name: name.trim() || 'Unnamed profile',
        vendor,
        environment,
        baseConfig: {
            hostname: includeHostname ? config.hostname : undefined,
            firewall: { ...config.firewall }
        },
        servicesConfig: {
            ssh: { ...config.services.ssh },
            ntpServers: [...config.services.ntpServers],
            dnsServers: [...config.services.dnsServers],
            syslogServers: [...(config.services.syslogServers ?? [])],
            snmpCommunity: config.services.snmpCommunity ?? '',
            snmpVersion: config.services.snmpVersion,
            snmpV3Users: [...(config.services.snmpV3Users ?? [])],
            netflow: { ...config.services.netflow },
            sflow: { ...config.services.sflow }
        },
        networkDefaults,
        createdAt: now,
        updatedAt: now
    }
}

export function applyProfileToConfig(current: CanonicalConfig, profile: CliProfile): CanonicalConfig {
    return {
        ...current,
        hostname: profile.baseConfig.hostname ?? current.hostname,
        firewall: { ...current.firewall, ...profile.baseConfig.firewall },
        services: {
            ...current.services,
            ssh: { ...profile.servicesConfig.ssh },
            ntpServers: [...profile.servicesConfig.ntpServers],
            dnsServers: [...profile.servicesConfig.dnsServers],
            syslogServers: [...(profile.servicesConfig.syslogServers ?? [])],
            snmpCommunity: profile.servicesConfig.snmpCommunity ?? current.services.snmpCommunity ?? '',
            snmpVersion: profile.servicesConfig.snmpVersion ?? current.services.snmpVersion,
            snmpV3Users: profile.servicesConfig.snmpV3Users ?? current.services.snmpV3Users,
            netflow: profile.servicesConfig.netflow ?? current.services.netflow,
            sflow: profile.servicesConfig.sflow ?? current.services.sflow
        },
        vlans: profile.networkDefaults.vlans.map((vlan) => ({
            id: vlan.id,
            name: vlan.name,
            subnet: '',
            gateway: ''
        })),
        interfaces: profile.networkDefaults.interfaces.map((iface) => ({
            id: iface.id,
            name: iface.name,
            role: iface.role,
            vlanId: iface.vlanId,
            description: iface.description,
            enabled: iface.enabled,
            ipAddress: '',
            subnetMask: ''
        })),
        routing: { ...current.routing }
    }
}
