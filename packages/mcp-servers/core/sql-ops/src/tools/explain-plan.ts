import type { ToolDefinition } from '@tools/registry'
import pg from 'pg'

const { Pool } = pg

export const explainPlanTool: ToolDefinition = {
    name: 'explain_plan',
    description: 'Get EXPLAIN plan for SQL query (read-only)',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'SQL query to explain'
            },
            analyze: {
                type: 'boolean',
                default: false,
                description: 'Run EXPLAIN ANALYZE (actually executes query)'
            }
        },
        required: ['query']
    },
    async execute(args: { query: string; analyze?: boolean }) {
        // Validate read-only
        if (!isReadOnly(args.query)) {
            throw new Error('Only SELECT queries allowed')
        }

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL
        })

        try {
            const explainQuery = args.analyze
                ? `EXPLAIN ANALYZE ${args.query}`
                : `EXPLAIN ${args.query}`

            const result = await pool.query(explainQuery)

            return {
                plan: result.rows.map(r => r['QUERY PLAN']).join('\n'),
                analyze: args.analyze || false,
                summary: extractPlanSummary(result.rows)
            }
        } finally {
            await pool.end()
        }
    },
    strategy: 'fail-fast',
    timeout: 30000,
    requiresAuth: true
}

function isReadOnly(query: string): boolean {
    const q = query.toLowerCase().trim()
    return q.startsWith('select') || q.startsWith('with')
}

function extractPlanSummary(rows: any[]): any {
    // Extract key metrics from EXPLAIN output
    const plan = rows.map(r => r['QUERY PLAN']).join('\n')

    return {
        estimatedCost: extractCost(plan),
        seqScans: (plan.match(/Seq Scan/g) || []).length,
        indexScans: (plan.match(/Index Scan/g) || []).length
    }
}

function extractCost(plan: string): { start: number; end: number } | null {
    const match = plan.match(/cost=(\d+\.\d+)\.\.(\d+\.\d+)/)
    if (match) {
        return {
            start: parseFloat(match[1]),
            end: parseFloat(match[2])
        }
    }
    return null
}
