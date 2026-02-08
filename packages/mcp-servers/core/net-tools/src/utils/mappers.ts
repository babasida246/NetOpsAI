export function mapPortToKind(ports: number[]): 'server' | 'unknown' {
    if (ports.some((port) => [22, 3389, 445].includes(port))) return 'server'
    if (ports.some((port) => [80, 443, 8080].includes(port))) return 'server'
    return 'unknown'
}
