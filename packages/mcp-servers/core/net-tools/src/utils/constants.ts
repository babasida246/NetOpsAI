export const OID_GROUPS = {
    IF_MIB: '1.3.6.1.2.1.2',
    BRIDGE_MIB: '1.3.6.1.2.1.17',
    LLDP_MIB: '1.0.8802.1.1.2',
    IP_MIB_ARP: '1.3.6.1.2.1.4.22'
} as const

export type OidGroup = keyof typeof OID_GROUPS
