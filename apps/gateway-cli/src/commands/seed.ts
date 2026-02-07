import { PgClient } from '@infra/postgres'
import { FREE_MODELS } from '@config/core'
import { z } from 'zod'

const EnvSchema = z.object({
    DATABASE_URL: z.string()
})

export async function seedCommand() {
    console.log('Seeding database...\n')

    try {
        const env = EnvSchema.parse(process.env)
        const pg = new PgClient({
            connectionString: env.DATABASE_URL,
            max: 10,
            min: 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
        })

        // Seed model configs
        for (const model of FREE_MODELS) {
            await pg.query(
                `INSERT INTO model_configs (id, provider, tier, context_window, max_tokens, cost_per_1k_input, cost_per_1k_output, capabilities, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           tier = EXCLUDED.tier,
           context_window = EXCLUDED.context_window,
           max_tokens = EXCLUDED.max_tokens,
           enabled = EXCLUDED.enabled`,
                [
                    model.id,
                    model.provider,
                    model.tier,
                    model.contextWindow,
                    model.maxTokens,
                    model.costPer1kInput,
                    model.costPer1kOutput,
                    JSON.stringify(model.capabilities),
                    true
                ]
            )

            console.log(`✓ Seeded: ${model.displayName} (Tier ${model.tier})`)
        }

        await pg.close()
        console.log('\nDatabase seeded successfully!')
    } catch (error: any) {
        console.error('✗ Seed failed:', error.message)
        process.exit(1)
    }
}
