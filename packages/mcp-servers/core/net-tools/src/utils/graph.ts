export function edgeKey(aNode: string, aPort: string, bNode: string, bPort?: string | null): string {
    const left = `${aNode}:${aPort}`
    const right = `${bNode}:${bPort ?? 'unknown'}`
    return [left, right].sort().join('|')
}
