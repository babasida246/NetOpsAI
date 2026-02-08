export type NmapHost = {
    ip: string
    hostname?: string
    up: boolean
    openTcpPorts: number[]
}

export function parseNmapGrepable(output: string): NmapHost[] {
    const lines = output.split(/\r?\n/g)
    const hosts: NmapHost[] = []

    for (const line of lines) {
        if (!line.startsWith('Host: ')) continue
        const hostMatch = line.match(/^Host:\s+(\S+)\s+\(([^)]*)\)\s+Status:\s+(\w+)/)
        if (!hostMatch) continue
        const [, ip, hostname, status] = hostMatch
        const portsMatch = line.match(/Ports:\s+(.+)/)
        const openTcpPorts: number[] = []

        if (portsMatch?.[1]) {
            const ports = portsMatch[1].split(',')
            for (const portEntry of ports) {
                const fields = portEntry.trim().split('/')
                const port = Number(fields[0])
                const state = fields[1]
                const proto = fields[2]
                if (proto === 'tcp' && state === 'open' && Number.isFinite(port)) {
                    openTcpPorts.push(port)
                }
            }
        }

        hosts.push({
            ip,
            hostname: hostname || undefined,
            up: status.toLowerCase() === 'up',
            openTcpPorts
        })
    }

    return hosts
}
