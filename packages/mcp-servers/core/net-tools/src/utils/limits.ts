export function enforceMaxPorts(ports: string, maxPorts: number): void {
    const count = ports.split(',').filter(Boolean).length
    if (count > maxPorts) {
        throw new Error('Ports list exceeds maxPorts limit')
    }
}
