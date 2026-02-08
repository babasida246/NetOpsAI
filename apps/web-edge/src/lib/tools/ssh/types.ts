export type SshAuthType = 'password' | 'key'

export type SshSessionStatus = 'connected' | 'closed'

export type SshSession = {
    id: string
    deviceId: string
    deviceName: string
    host: string
    port: number
    user: string
    authType: SshAuthType
    createdAt: string
    lastActiveAt: string
    status: SshSessionStatus
    idleTimeoutSec: number
}

export type SshLogEvent = {
    timestamp: string
    type: 'input' | 'output' | 'system' | 'error'
    message: string
}

export type SshCommandPolicy = {
    environment: 'dev' | 'staging' | 'prod'
    allowList: string[]
    denyList: string[]
    dangerousList: string[]
}

export type SshCommandResult = {
    output: string[]
    warning?: string
}
