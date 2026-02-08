import { nettoolsConfig } from './config.js'

export type SnmpCredential = {
    version: '2c' | '3'
    community?: string
    username?: string
    authProtocol?: 'MD5' | 'SHA' | 'SHA256'
    authPassword?: string
    privProtocol?: 'DES' | 'AES' | 'AES256'
    privPassword?: string
}

export function resolveSnmpCredential(credentialRef: string): SnmpCredential {
    if (credentialRef.startsWith('env:')) {
        const envKey = credentialRef.slice(4)
        const value = process.env[envKey]
        if (!value) throw new Error('SNMP credential env not found')
        return { version: '2c', community: value }
    }

    const resolved = nettoolsConfig.snmpCredentials[credentialRef]
    if (!resolved) {
        throw new Error('SNMP credential not found')
    }
    return resolved as SnmpCredential
}
