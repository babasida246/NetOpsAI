import { Pool } from 'pg'
import { fileURLToPath } from 'url'

interface IdRow {
    id: string
}

async function getOrCreateVendor(pool: Pool, name: string): Promise<string> {
    const existing = await pool.query<IdRow>('SELECT id FROM vendors WHERE name = $1 LIMIT 1', [name])
    if (existing.rows[0]) return existing.rows[0].id
    const result = await pool.query<IdRow>(
        'INSERT INTO vendors (name, created_at) VALUES ($1, NOW()) RETURNING id',
        [name]
    )
    return result.rows[0].id
}

async function getOrCreateCategory(pool: Pool, name: string): Promise<string> {
    const existing = await pool.query<IdRow>('SELECT id FROM asset_categories WHERE name = $1 LIMIT 1', [name])
    if (existing.rows[0]) return existing.rows[0].id
    const result = await pool.query<IdRow>(
        'INSERT INTO asset_categories (name, created_at) VALUES ($1, NOW()) RETURNING id',
        [name]
    )
    return result.rows[0].id
}

async function getOrCreateLocation(pool: Pool, name: string, parentId: string | null, path: string): Promise<string> {
    const existing = await pool.query<IdRow>(
        'SELECT id FROM locations WHERE name = $1 AND parent_id IS NOT DISTINCT FROM $2 LIMIT 1',
        [name, parentId]
    )
    if (existing.rows[0]) return existing.rows[0].id
    const result = await pool.query<IdRow>(
        'INSERT INTO locations (name, parent_id, path, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [name, parentId, path]
    )
    return result.rows[0].id
}

async function getOrCreateModel(
    pool: Pool,
    model: string,
    brand: string,
    categoryId: string,
    vendorId: string
): Promise<string> {
    const existing = await pool.query<IdRow>(
        'SELECT id FROM asset_models WHERE model = $1 AND brand = $2 LIMIT 1',
        [model, brand]
    )
    if (existing.rows[0]) return existing.rows[0].id
    const result = await pool.query<IdRow>(
        `INSERT INTO asset_models (category_id, vendor_id, brand, model, spec, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [categoryId, vendorId, brand, model, JSON.stringify({ cpu: 'i7', ram: '16GB' })]
    )
    return result.rows[0].id
}

async function insertAsset(pool: Pool, assetCode: string, modelId: string, locationId: string, vendorId: string): Promise<void> {
    await pool.query(
        `INSERT INTO assets (asset_code, model_id, location_id, status, vendor_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'in_stock', $4, NOW(), NOW())
         ON CONFLICT (asset_code) DO NOTHING`,
        [assetCode, modelId, locationId, vendorId]
    )
}

export async function seed(): Promise<void> {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required')
    }

    const pool = new Pool({ connectionString })

    try {
        const vendorDell = await getOrCreateVendor(pool, 'Dell')
        const vendorHp = await getOrCreateVendor(pool, 'HP')
        const categoryLaptop = await getOrCreateCategory(pool, 'Laptop')
        const categoryServer = await getOrCreateCategory(pool, 'Server')

        const hqId = await getOrCreateLocation(pool, 'HQ', null, '/HQ')
        const floor1Id = await getOrCreateLocation(pool, 'Floor 1', hqId, '/HQ/Floor-1')

        const modelLat = await getOrCreateModel(pool, 'Latitude 5420', 'Dell', categoryLaptop, vendorDell)
        const modelPro = await getOrCreateModel(pool, 'ProLiant DL380', 'HP', categoryServer, vendorHp)

        await insertAsset(pool, 'ASSET-DEMO-001', modelLat, floor1Id, vendorDell)
        await insertAsset(pool, 'ASSET-DEMO-002', modelLat, floor1Id, vendorDell)
        await insertAsset(pool, 'ASSET-DEMO-003', modelPro, hqId, vendorHp)

        console.log('✅ Seeded asset catalogs and demo assets')
    } finally {
        await pool.end()
    }
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] === currentFile) {
    seed().catch((error) => {
        console.error('Seed failed:', error)
        process.exit(1)
    })
}
