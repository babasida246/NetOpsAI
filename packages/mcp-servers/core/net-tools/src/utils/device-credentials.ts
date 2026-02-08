import { nettoolsConfig } from './config.js'

export type DeviceCredential = {
    host: string
    port?: number
    user: string
    authType: 'password' | 'key'
    password?: string
    privateKey?: string
}

export function resolveDeviceCredential(deviceId: string): DeviceCredential {
    const entry = nettoolsConfig.deviceCredentials[deviceId]
    if (!entry) {
        throw new Error(`Missing device credentials for ${deviceId}`)
    }
    return entry as DeviceCredential
}
