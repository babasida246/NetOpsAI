import { Client } from 'pg'

async function main() {
    const databaseUrl = process.env.DATABASE_URL
    const userId = process.env.CHATOPS_DEFAULT_USER_ID
    const chatId = process.env.CHATOPS_SEED_CHAT_ID || 'demo-chat'

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required')
    }
    if (!userId) {
        throw new Error('CHATOPS_DEFAULT_USER_ID is required')
    }

    const client = new Client({ connectionString: databaseUrl })
    await client.connect()

    const channelResult = await client.query(
        `INSERT INTO channels (type, name, config, enabled)
     VALUES ('telegram', 'telegram-default', '{}'::jsonb, true)
     ON CONFLICT DO NOTHING
     RETURNING id`
    )

    const channelId = channelResult.rows[0]?.id || (
        await client.query(`SELECT id FROM channels WHERE type = 'telegram' ORDER BY created_at ASC LIMIT 1`)
    ).rows[0].id

    await client.query(
        `INSERT INTO channel_bindings (channel_id, external_user_id, external_chat_id, user_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (channel_id, external_user_id, external_chat_id) DO NOTHING`,
        [channelId, 'demo-user', chatId, userId]
    )

    await client.query(
        `INSERT INTO alert_subscriptions (user_id, channel_id, target_chat_id, alert_types, severity_min, enabled)
     VALUES ($1, $2, $3, $4, 'info', true)
     ON CONFLICT DO NOTHING`,
        [userId, channelId, chatId, ['provider.health', 'net.device_down']]
    )

    await client.end()
    console.log('Messaging hub seed complete')
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
