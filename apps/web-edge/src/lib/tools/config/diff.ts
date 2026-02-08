export type DiffLine = {
    type: 'add' | 'remove' | 'change' | 'same'
    text: string
    previous?: string
    next?: string
}

const buildLcsTable = (a: string[], b: string[]) => {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
            }
        }
    }
    return dp
}

export function diffCommandsDetailed(previous: string[], next: string[]): DiffLine[] {
    const dp = buildLcsTable(previous, next)
    const lines: DiffLine[] = []
    let i = previous.length
    let j = next.length

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && previous[i - 1] === next[j - 1]) {
            lines.push({ type: 'same', text: previous[i - 1] })
            i -= 1
            j -= 1
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            lines.push({ type: 'add', text: next[j - 1] })
            j -= 1
        } else if (i > 0) {
            lines.push({ type: 'remove', text: previous[i - 1] })
            i -= 1
        }
    }

    lines.reverse()

    const merged: DiffLine[] = []
    for (let index = 0; index < lines.length; index++) {
        const current = lines[index]
        const nextLine = lines[index + 1]
        if (current.type === 'remove' && nextLine?.type === 'add') {
            merged.push({
                type: 'change',
                text: `${current.text} → ${nextLine.text}`,
                previous: current.text,
                next: nextLine.text
            })
            index += 1
            continue
        }
        merged.push(current)
    }

    return merged
}

export function diffCommands(previous: string[], next: string[]): string {
    const diff = diffCommandsDetailed(previous, next)
    if (diff.length === 0) {
        return 'No changes.'
    }
    return diff
        .filter((line) => line.type !== 'same')
        .map((line) => {
            if (line.type === 'add') return `+ ${line.text}`
            if (line.type === 'remove') return `- ${line.text}`
            if (line.type === 'change') return `~ ${line.text}`
            return `  ${line.text}`
        })
        .join('\n')
}
