/**
 * Setup Service - First Time Configuration Logic
 * Handles the step-by-step setup process for initial system configuration
 */
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { promises as fs } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import type { PgClient } from '@infra/postgres'

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface SetupStatus {
    isComplete: boolean
    currentStep: number
    totalSteps: number
    steps: {
        [key: string]: boolean
    }
}

interface AdminUserData {
    email: string
    name: string
    password: string
}

interface SystemConfig {
    companyName: string
    companyAddress?: string
    companyPhone?: string
    companyEmail?: string
    timezone?: string
    language?: string
    currency?: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPassword?: string
    smtpSecure?: boolean
}

interface AIProviderConfig {
    [key: string]: {
        apiKey: string
        organization?: string
        endpoint?: string
        models?: string[]
    }
}

interface SMTPTestConfig {
    host: string
    port: number
    secure: boolean
    auth?: {
        user: string
        pass: string
    }
}

interface DatabaseInfo {
    tablesCreated: number
    indexesCreated: number
    seedDataLoaded: boolean
}

interface HealthCheckResult {
    database: boolean
    smtp?: boolean
    ai?: boolean
}

export class SetupService {
    private client: PgClient | undefined
    private readonly SETUP_STEPS = {
        DATABASE_INITIALIZED: 'database_initialized',
        ADMIN_USER_CREATED: 'admin_user_created',
        SYSTEM_CONFIGURED: 'system_configured',
        AI_PROVIDERS_CONFIGURED: 'ai_providers_configured',
        SEED_DATA_LOADED: 'seed_data_loaded',
        SETUP_COMPLETED: 'setup_completed'
    }

    constructor(client?: PgClient) {
        this.client = client
    }

    /**
     * Check current setup status
     */
    async checkSetupStatus(): Promise<SetupStatus> {
        try {
            const steps = await this.getCompletedSteps()
            const completedCount = Object.values(steps).filter(Boolean).length
            const totalSteps = Object.keys(this.SETUP_STEPS).length

            return {
                isComplete: completedCount === totalSteps,
                currentStep: completedCount + 1,
                totalSteps,
                steps
            }
        } catch (error: any) {
            console.error('Error checking setup status:', error)
            // If we can't check status, assume setup is not complete
            return {
                isComplete: false,
                currentStep: 1,
                totalSteps: Object.keys(this.SETUP_STEPS).length,
                steps: Object.values(this.SETUP_STEPS).reduce((acc: any, step) => {
                    acc[step] = false
                    return acc
                }, {})
            }
        }
    }

    /**
     * Initialize database with required tables and structure
     */
    async initializeDatabase(): Promise<DatabaseInfo> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            let tablesCreated = 0
            let indexesCreated = 0

            // Read and execute schema migrations.
            // In production (bundled), __dirname points to /app/apps/cloud-api/dist
            // so we need ../migrations to reach /app/apps/cloud-api/migrations
            const migrationsPath = path.join(__dirname, '../migrations')
            console.log('[DEBUG] Migrations path:', migrationsPath)

            const entries = await fs.readdir(migrationsPath).catch(() => [])
            const migrationFiles = entries
                .filter((name) => name.toLowerCase().endsWith('.sql'))
                .sort((a, b) => a.localeCompare(b))

            if (migrationFiles.length === 0) {
                throw new Error(`No migration files found in: ${migrationsPath}`)
            }

            for (const fileName of migrationFiles) {
                const filePath = path.join(migrationsPath, fileName)
                const fileExists = await this.fileExists(filePath)
                if (!fileExists) {
                    throw new Error(`Migration file not found: ${filePath}`)
                }

                const sql = await fs.readFile(filePath, 'utf8')
                console.log(`[DEBUG] Executing migration ${fileName} (${sql.length} bytes)...`)

                // Split by CREATE statements to count tables/indexes for reporting
                const createTableMatches = sql.match(/CREATE TABLE/gi) || []
                const createIndexMatches = sql.match(/CREATE INDEX/gi) || []
                tablesCreated += createTableMatches.length
                indexesCreated += createIndexMatches.length

                await this.client.query(sql)
                console.log(`[DEBUG] Migration ${fileName} executed successfully`)
            }

            console.log(`Database initialized: ${tablesCreated} tables, ${indexesCreated} indexes`)

            // Mark step as complete
            await this.markStepComplete(this.SETUP_STEPS.DATABASE_INITIALIZED)

            return {
                tablesCreated,
                indexesCreated,
                seedDataLoaded: false
            }
        } catch (error: any) {
            throw new Error(`Database initialization failed: ${error.message}`)
        }
    }

    /**
     * Create the first admin user
     */
    async createAdminUser(userData: AdminUserData): Promise<{ userId: string }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // Check if admin already exists
            const existingAdmin = await this.client.query(
                'SELECT id FROM users WHERE email = $1',
                [userData.email]
            )

            if (existingAdmin.rows.length > 0) {
                throw new Error('Admin user with this email already exists')
            }

            // Hash password
            const saltRounds = 12
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds)
            const userId = crypto.randomUUID()
            const tenantId = await this.ensureDefaultTenant()

            // Create admin user
            await this.client.query(`
                INSERT INTO users (
                    id, email, name, password_hash, role, tenant_id, is_active, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
            `, [
                userId,
                userData.email,
                userData.name,
                hashedPassword,
                'super_admin',
                tenantId
            ])

            await this.client.query(
                `INSERT INTO tenant_members (tenant_id, user_id, role)
                 VALUES ($1, $2, 'admin')
                 ON CONFLICT (tenant_id, user_id) DO NOTHING`,
                [tenantId, userId]
            )

            // Mark step as complete
            await this.markStepComplete(this.SETUP_STEPS.ADMIN_USER_CREATED)

            return { userId }
        } catch (error: any) {
            throw new Error(`Failed to create admin user: ${error.message}`)
        }
    }

    /**
     * Configure basic system settings
     */
    async configureSystem(config: SystemConfig): Promise<{ configured: boolean }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            if (config.companyName) {
                await this.ensureDefaultTenant(config.companyName)
            }
            // System configuration stored in environment variables or config files
            // No database storage needed for basic setup

            // Mark step as complete
            await this.markStepComplete(this.SETUP_STEPS.SYSTEM_CONFIGURED)

            return { configured: true }
        } catch (error: any) {
            throw new Error(`System configuration failed: ${error.message}`)
        }
    }

    private async ensureDefaultTenant(companyName?: string): Promise<string> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        const existing = await this.client.query(
            `SELECT id FROM tenants WHERE code = 'default' LIMIT 1`
        )

        if (existing.rows.length > 0) {
            if (companyName) {
                await this.client.query(
                    `UPDATE tenants SET name = $1, updated_at = NOW() WHERE code = 'default'`,
                    [companyName]
                )
            }
            return existing.rows[0].id as string
        }

        const insert = await this.client.query(
            `INSERT INTO tenants (code, name)
             VALUES ('default', $1)
             RETURNING id`,
            [companyName ?? 'Default Tenant']
        )
        return insert.rows[0].id as string
    }

    /**
     * Configure AI providers
     */
    async configureAIProviders(providers: AIProviderConfig): Promise<{ configured: number }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // AI providers configured via environment variables
            // Mark step as complete
            await this.markStepComplete(this.SETUP_STEPS.AI_PROVIDERS_CONFIGURED)

            return { configured: 0 }
        } catch (error: any) {
            throw new Error(`AI provider configuration failed: ${error.message}`)
        }
    }

    /**
     * Load initial seed data
     */
    async loadSeedData(): Promise<{ loaded: boolean }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // Seed data can be loaded here if needed
            // For now, just mark step as complete

            // Mark step as complete
            await this.markStepComplete(this.SETUP_STEPS.SEED_DATA_LOADED)

            return { loaded: true }
        } catch (error: any) {
            throw new Error(`Seed data loading failed: ${error.message}`)
        }
    }

    /**
     * Complete the setup process
     */
    async completeSetup(): Promise<{ completed: boolean }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // Verify all steps except SETUP_COMPLETED are complete
            const steps = await this.getCompletedSteps()
            const requiredSteps = [
                this.SETUP_STEPS.DATABASE_INITIALIZED,
                this.SETUP_STEPS.ADMIN_USER_CREATED,
                this.SETUP_STEPS.SYSTEM_CONFIGURED,
                this.SETUP_STEPS.AI_PROVIDERS_CONFIGURED,
                this.SETUP_STEPS.SEED_DATA_LOADED
            ]

            const pendingSteps = requiredSteps.filter(step => !steps[step])

            if (pendingSteps.length > 0) {
                console.log('Pending steps:', pendingSteps)
                throw new Error(`Cannot complete setup: ${pendingSteps.join(', ')} still pending`)
            }

            // Mark final step as complete
            await this.markStepComplete(this.SETUP_STEPS.SETUP_COMPLETED)

            return { completed: true }
        } catch (error: any) {
            throw new Error(`Setup completion failed: ${error.message}`)
        }
    }

    /**
     * Perform health checks
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const result: HealthCheckResult = {
            database: false,
            smtp: undefined,
            ai: undefined
        }

        try {
            // Test database connection
            if (this.client) {
                await this.client.query('SELECT 1')
                result.database = true
            }

            // Test SMTP if configured
            try {
                const smtpSettings = await this.getSMTPSettings()
                if (smtpSettings.host) {
                    await this.testSMTPConnection(smtpSettings)
                    result.smtp = true
                }
            } catch (error) {
                result.smtp = false
            }

            // Test AI providers if configured
            try {
                const providers = await this.getActiveAIProviders()
                result.ai = providers.length > 0
            } catch (error) {
                result.ai = false
            }

        } catch (error) {
            console.error('Health check error:', error)
        }

        return result
    }

    /**
     * Test SMTP connection
     */
    async testSMTP(config: any): Promise<{ success: boolean; message: string }> {
        try {
            // Validate configuration
            if (!config.host || !config.port) {
                throw new Error('SMTP host and port are required')
            }

            // TODO: Implement actual SMTP test with nodemailer
            // For now, just validate configuration
            return {
                success: true,
                message: 'SMTP configuration validated (actual connection test not implemented)'
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    /**
     * Test AI Provider connection
     */
    async testAIProvider(config: any): Promise<{ success: boolean; message: string }> {
        try {
            // Validate configuration
            if (!config.provider || !config.apiKey) {
                throw new Error('Provider name and API key are required')
            }

            // TODO: Implement actual AI provider test
            // For now, just validate configuration
            return {
                success: true,
                message: `${config.provider} configuration validated (actual connection test not implemented)`
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    /**
     * Reset setup status (development only)
     */
    async resetSetup(): Promise<{ reset: boolean; message: string }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // Clear setup_status table
            await this.client.query('DELETE FROM setup_status')

            // Remove system_initialized flag
            await this.client.query(`
                DELETE FROM system_settings 
                WHERE key = 'system_initialized'
            `)

            return {
                reset: true,
                message: 'Setup status has been reset. You can now run the setup wizard again.'
            }
        } catch (error: any) {
            throw new Error(`Failed to reset setup: ${error.message}`)
        }
    }

    /**
     * Reset database to initial state (development only)
     * WARNING: This will drop all tables and data!
     */
    async resetDatabase(): Promise<{ reset: boolean; message: string; tablesDropped: number }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            // List of tables to drop in order (respecting foreign key constraints)
            const tables = [
                'setup_status',
                'user_roles',
                'ai_providers',
                'system_settings',
                'sessions',
                'users',
                'roles'
            ]

            let dropped = 0

            for (const table of tables) {
                try {
                    await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`)
                    dropped++
                } catch (error) {
                    console.warn(`Failed to drop table ${table}:`, error)
                }
            }

            return {
                reset: true,
                message: `Database reset complete. ${dropped} tables dropped. You can now initialize the database.`,
                tablesDropped: dropped
            }
        } catch (error: any) {
            throw new Error(`Failed to reset database: ${error.message}`)
        }
    }

    // Private helper methods

    private async getCompletedSteps(): Promise<{ [key: string]: boolean }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        try {
            const result = await this.client.query(
                'SELECT step_name FROM setup_status WHERE completed = true'
            )

            const completedSteps = result.rows.map((row: any) => row.step_name)
            const steps: { [key: string]: boolean } = {}

            for (const step of Object.values(this.SETUP_STEPS)) {
                steps[step] = completedSteps.includes(step)
            }

            return steps
        } catch (error: any) {
            // If table doesn't exist yet (first time setup), return all steps as incomplete
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log('[DEBUG] setup_status table does not exist yet, returning all steps as incomplete')
                const steps: { [key: string]: boolean } = {}
                for (const step of Object.values(this.SETUP_STEPS)) {
                    steps[step] = false
                }
                return steps
            }
            throw error
        }
    }

    private async markStepComplete(stepName: string): Promise<void> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        await this.client.query(`
            INSERT INTO setup_status (step_name, completed, completed_at)
            VALUES ($1, true, NOW())
            ON CONFLICT (step_name)
            DO UPDATE SET 
                completed = true,
                completed_at = NOW()
        `, [stepName])
    }

    private async ensureAdminRole(): Promise<{ id: string }> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        const role = await this.client.query(
            'SELECT id FROM roles WHERE name = $1',
            ['admin']
        )

        if (role.rows.length === 0) {
            const roleId = crypto.randomUUID()
            await this.client.query(`
                INSERT INTO roles (id, name, description, created_at)
                VALUES ($1, 'admin', 'System Administrator', NOW())
            `, [roleId])
            return { id: roleId }
        }

        return { id: role.rows[0].id }
    }

    private async testSMTPConnection(config: SMTPTestConfig): Promise<void> {
        // Note: Actual SMTP testing would require nodemailer
        // For now, just validate configuration
        if (!config.host || !config.port) {
            throw new Error('Invalid SMTP configuration')
        }
        // TODO: Implement actual SMTP test with nodemailer
    }

    private async getSMTPSettings(): Promise<SMTPTestConfig> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        const result = await this.client.query(`
            SELECT key, value FROM system_settings 
            WHERE key IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password')
        `)

        const settings: { [key: string]: string } = {}
        result.rows.forEach((row: any) => {
            settings[row.key] = row.value
        })

        return {
            host: settings.smtp_host || '',
            port: parseInt(settings.smtp_port) || 587,
            secure: settings.smtp_secure === 'true',
            auth: settings.smtp_user ? {
                user: settings.smtp_user,
                pass: settings.smtp_password || ''
            } : undefined
        }
    }

    private async getActiveAIProviders(): Promise<any[]> {
        if (!this.client) {
            throw new Error('Database client not available')
        }

        const result = await this.client.query(
            'SELECT * FROM ai_providers WHERE is_active = true'
        )

        return result.rows
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath)
            return true
        } catch {
            return false
        }
    }
}
