import type { ToolDefinition } from '@tools/registry'

export const analyzeQueryTool: ToolDefinition = {
    name: 'analyze_query',
    description: 'Analyze SQL query for potential issues',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'SQL query to analyze'
            }
        },
        required: ['query']
    },
    async execute(args: { query: string }) {
        const issues: string[] = []
        const suggestions: string[] = []

        const query = args.query.toLowerCase()

        // Check for SELECT *
        if (query.includes('select *')) {
            issues.push('Using SELECT * is inefficient')
            suggestions.push('Specify only needed columns')
        }

        // Check for missing WHERE
        if (
            (query.includes('delete') || query.includes('update')) &&
            !query.includes('where')
        ) {
            issues.push('DELETE/UPDATE without WHERE clause')
            suggestions.push('Add WHERE clause to limit affected rows')
        }

        // Check for missing LIMIT
        if (query.includes('select') && !query.includes('limit')) {
            suggestions.push('Consider adding LIMIT for large result sets')
        }

        // Check for JOIN without ON
        if (query.includes('join') && !query.includes('on')) {
            issues.push('JOIN without ON clause (possible cartesian product)')
        }

        // Check for functions in WHERE
        if (query.match(/where.*\(.*\)/)) {
            suggestions.push('Functions in WHERE may prevent index usage')
        }

        return {
            query: args.query,
            readOnly: isReadOnly(args.query),
            issues,
            suggestions,
            severity: issues.length > 0 ? 'warning' : 'info'
        }
    },
    strategy: 'retry',
    timeout: 5000
}

function isReadOnly(query: string): boolean {
    const q = query.toLowerCase().trim()
    return (
        q.startsWith('select') ||
        q.startsWith('with') ||
        q.startsWith('explain')
    )
}
