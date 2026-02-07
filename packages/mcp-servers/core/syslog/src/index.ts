import * as dgram from 'dgram'
import * as net from 'net'
import * as tls from 'tls'
import { EventEmitter } from 'events'

export interface SyslogConfig {
    host: string
    port: number
    protocol: 'udp' | 'tcp' | 'tls'
    facility?: number
    tlsOptions?: tls.ConnectionOptions
    maxConnections?: number
}

export interface SyslogMessage {
    timestamp: Date
    hostname: string
    facility: number
    severity: number
    message: string
    appName?: string
    procId?: string
    msgId?: string
    structuredData?: Record<string, any>
    raw: string
}

export enum SyslogSeverity {
    Emergency = 0,
    Alert = 1,
    Critical = 2,
    Error = 3,
    Warning = 4,
    Notice = 5,
    Informational = 6,
    Debug = 7,
}

export enum SyslogFacility {
    Kernel = 0,
    User = 1,
    Mail = 2,
    System = 3,
    Auth = 4,
    Syslog = 5,
    LPR = 6,
    News = 7,
    UUCP = 8,
    Cron = 9,
    AuthPriv = 10,
    FTP = 11,
    NTP = 12,
    LogAudit = 13,
    LogAlert = 14,
    Clock = 15,
    Local0 = 16,
    Local1 = 17,
    Local2 = 18,
    Local3 = 19,
    Local4 = 20,
    Local5 = 21,
    Local6 = 22,
    Local7 = 23,
}

export class SyslogClient extends EventEmitter {
    private config: SyslogConfig
    private connections: Array<net.Socket | tls.TLSSocket> = []
    private udpSocket?: dgram.Socket
    private messageBuffer: SyslogMessage[] = []
    private maxBufferSize = 10000

    constructor(config: SyslogConfig) {
        super()
        this.config = {
            facility: SyslogFacility.Local0,
            maxConnections: 10,
            ...config,
        }
    }

    async connect(): Promise<void> {
        if (this.config.protocol === 'udp') {
            this.udpSocket = dgram.createSocket('udp4')
            return Promise.resolve()
        }

        // For TCP/TLS, create initial connection
        await this.createConnection()
    }

    private async createConnection(): Promise<net.Socket | tls.TLSSocket> {
        return new Promise((resolve, reject) => {
            let socket: net.Socket | tls.TLSSocket

            if (this.config.protocol === 'tls') {
                socket = tls.connect(
                    this.config.port,
                    this.config.host,
                    this.config.tlsOptions || {}
                )
            } else {
                socket = net.connect(this.config.port, this.config.host)
            }

            socket.on('connect', () => {
                this.connections.push(socket)
                resolve(socket)
            })

            socket.on('error', (error) => {
                reject(error)
            })

            socket.on('data', (data) => {
                this.handleIncomingMessage(data.toString())
            })

            socket.on('close', () => {
                this.connections = this.connections.filter((s) => s !== socket)
            })
        })
    }

    private handleIncomingMessage(raw: string): void {
        const messages = raw.split('\n').filter((line) => line.trim())

        for (const msgStr of messages) {
            try {
                const message = this.parseSyslogMessage(msgStr)
                this.messageBuffer.push(message)

                // Trim buffer if too large
                if (this.messageBuffer.length > this.maxBufferSize) {
                    this.messageBuffer.shift()
                }

                this.emit('message', message)
            } catch (error) {
                this.emit('parse-error', error)
            }
        }
    }

    private parseSyslogMessage(raw: string): SyslogMessage {
        // RFC 5424 format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
        // RFC 3164 format: <PRI>TIMESTAMP HOSTNAME TAG: MSG

        const priMatch = raw.match(/^<(\d+)>/)
        if (!priMatch) {
            throw new Error('Invalid syslog message: missing priority')
        }

        const priority = parseInt(priMatch[1], 10)
        const facility = Math.floor(priority / 8)
        const severity = priority % 8

        const rest = raw.substring(priMatch[0].length)

        // Try RFC 5424 format first
        const rfc5424Match = rest.match(
            /^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/
        )

        if (rfc5424Match) {
            return {
                timestamp: new Date(rfc5424Match[2]),
                hostname: rfc5424Match[3],
                facility,
                severity,
                appName: rfc5424Match[4],
                procId: rfc5424Match[5],
                msgId: rfc5424Match[6],
                structuredData: this.parseStructuredData(rfc5424Match[7]),
                message: rfc5424Match[8],
                raw,
            }
        }

        // Fall back to RFC 3164
        const rfc3164Match = rest.match(/^(\S+\s+\S+\s+\S+)\s+(\S+)\s+(\S+):\s+(.*)$/)

        if (rfc3164Match) {
            return {
                timestamp: new Date(rfc3164Match[1]),
                hostname: rfc3164Match[2],
                facility,
                severity,
                appName: rfc3164Match[3],
                message: rfc3164Match[4],
                raw,
            }
        }

        // Basic fallback
        return {
            timestamp: new Date(),
            hostname: 'unknown',
            facility,
            severity,
            message: rest.trim(),
            raw,
        }
    }

    private parseStructuredData(sd: string): Record<string, any> | undefined {
        if (sd === '-') return undefined

        const result: Record<string, any> = {}
        const sdMatch = sd.match(/\[([^\]]+)\]/g)

        if (sdMatch) {
            for (const element of sdMatch) {
                const content = element.slice(1, -1)
                const parts = content.split(' ')
                const sdId = parts[0]
                result[sdId] = {}

                for (let i = 1; i < parts.length; i++) {
                    const [key, ...valueParts] = parts[i].split('=')
                    const value = valueParts.join('=').replace(/^"|"$/g, '')
                    result[sdId][key] = value
                }
            }
        }

        return result
    }

    async send(
        message: string,
        severity: SyslogSeverity = SyslogSeverity.Informational,
        options?: {
            appName?: string
            hostname?: string
        }
    ): Promise<void> {
        const priority = (this.config.facility! * 8) + severity
        const timestamp = new Date().toISOString()
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const hostname = options?.hostname || require('os').hostname()
        const appName = options?.appName || 'netopsai-gateway'
        const syslogMsg = `<${priority}>1 ${timestamp} ${hostname} ${appName} - - - ${message}`

        if (this.config.protocol === 'udp') {
            return this.sendUdp(syslogMsg)
        } else {
            return this.sendTcp(syslogMsg)
        }
    }

    private sendUdp(message: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.udpSocket) {
                return reject(new Error('UDP socket not initialized'))
            }

            this.udpSocket.send(
                message,
                this.config.port,
                this.config.host,
                (error) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                }
            )
        })
    }

    private async sendTcp(message: string): Promise<void> {
        let socket = this.connections[0]

        if (!socket || socket.destroyed) {
            socket = await this.createConnection()
        }

        return new Promise((resolve, reject) => {
            socket.write(message + '\n', (error) => {
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
            })
        })
    }

    search(filters: {
        severity?: SyslogSeverity[]
        hostname?: string
        appName?: string
        message?: string
        since?: Date
        limit?: number
    }): SyslogMessage[] {
        let results = [...this.messageBuffer]

        if (filters.severity) {
            results = results.filter((msg) => filters.severity!.includes(msg.severity))
        }

        if (filters.hostname) {
            results = results.filter((msg) => msg.hostname.includes(filters.hostname!))
        }

        if (filters.appName) {
            results = results.filter((msg) => msg.appName?.includes(filters.appName!))
        }

        if (filters.message) {
            const regex = new RegExp(filters.message, 'i')
            results = results.filter((msg) => regex.test(msg.message))
        }

        if (filters.since) {
            results = results.filter((msg) => msg.timestamp >= filters.since!)
        }

        // Sort by timestamp desc
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        if (filters.limit) {
            results = results.slice(0, filters.limit)
        }

        return results
    }

    getRecentMessages(limit = 100): SyslogMessage[] {
        return this.messageBuffer.slice(-limit)
    }

    async disconnect(): Promise<void> {
        if (this.udpSocket) {
            this.udpSocket.close()
            this.udpSocket = undefined
        }

        for (const socket of this.connections) {
            socket.destroy()
        }

        this.connections = []
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (this.config.protocol === 'udp') {
                return !!this.udpSocket
            } else {
                return this.connections.length > 0 && !this.connections[0].destroyed
            }
        } catch {
            return false
        }
    }
}

// Factory function
export function createSyslogClient(config: SyslogConfig): SyslogClient {
    return new SyslogClient(config)
}

