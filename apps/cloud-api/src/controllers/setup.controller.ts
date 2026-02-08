/**
 * Setup Controller - First Time Configuration Handler
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { PgClient } from '@infra/postgres'
import { SetupService } from '../services/setup.service.js'

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

interface SetupControllerOptions {
    pgClient?: PgClient
}

export class SetupController {
    private setupService: SetupService

    constructor(options?: SetupControllerOptions) {
        this.setupService = new SetupService(options?.pgClient)

        // Bind methods to preserve context
        this.getSetupStatus = this.getSetupStatus.bind(this)
        this.initializeDatabase = this.initializeDatabase.bind(this)
        this.createAdminUser = this.createAdminUser.bind(this)
        this.configureSystem = this.configureSystem.bind(this)
        this.configureAIProviders = this.configureAIProviders.bind(this)
        this.loadSeedData = this.loadSeedData.bind(this)
        this.completeSetup = this.completeSetup.bind(this)
        this.healthCheck = this.healthCheck.bind(this)
        this.testSMTP = this.testSMTP.bind(this)
        this.testAIProvider = this.testAIProvider.bind(this)
        this.resetSetup = this.resetSetup.bind(this)
        this.resetDatabase = this.resetDatabase.bind(this)
    }

    async getSetupStatus(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const status = await this.setupService.checkSetupStatus()
            res.send({
                success: true,
                data: status
            })
        } catch (error: any) {
            console.error('Setup status check failed:', error)
            res.code(500).send({
                success: false,
                error: 'Failed to check setup status',
                message: error.message
            })
        }
    }

    async initializeDatabase(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.initializeDatabase()
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Database initialization failed:', error)
            res.code(500).send({
                success: false,
                error: 'Database initialization failed',
                message: error.message
            })
        }
    }

    async createAdminUser(req: FastifyRequest<{ Body: AdminUserData }>, res: FastifyReply): Promise<void> {
        try {
            const { email, name, password } = req.body

            // Validation
            if (!email || !name || !password) {
                res.code(400).send({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Email, name, and password are required'
                })
                return
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                res.code(400).send({
                    success: false,
                    error: 'Invalid email format',
                    message: 'Please provide a valid email address'
                })
                return
            }

            // Password validation
            if (password.length < 8) {
                res.code(400).send({
                    success: false,
                    error: 'Password too weak',
                    message: 'Password must be at least 8 characters long'
                })
                return
            }

            const result = await this.setupService.createAdminUser({
                email,
                name,
                password
            })

            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Admin user creation failed:', error)
            res.code(400).send({
                success: false,
                error: 'Admin user creation failed',
                message: error.message
            })
        }
    }

    async configureSystem(req: FastifyRequest<{ Body: SystemConfig }>, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.configureSystem(req.body)
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('System configuration failed:', error)
            res.code(500).send({
                success: false,
                error: 'System configuration failed',
                message: error.message
            })
        }
    }

    async configureAIProviders(req: FastifyRequest<{ Body: AIProviderConfig }>, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.configureAIProviders(req.body)
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('AI providers configuration failed:', error)
            res.code(500).send({
                success: false,
                error: 'AI providers configuration failed',
                message: error.message
            })
        }
    }

    async loadSeedData(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.loadSeedData()
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Seed data loading failed:', error)
            res.code(500).send({
                success: false,
                error: 'Seed data loading failed',
                message: error.message
            })
        }
    }

    async completeSetup(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.completeSetup()
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Setup completion failed:', error)
            res.code(500).send({
                success: false,
                error: 'Setup completion failed',
                message: error.message
            })
        }
    }

    async healthCheck(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const checks = await this.setupService.healthCheck()
            res.send({
                success: true,
                data: checks
            })
        } catch (error: any) {
            console.error('Health check failed:', error)
            res.code(500).send({
                success: false,
                error: 'Health check failed',
                message: error.message
            })
        }
    }

    async testSMTP(req: FastifyRequest<{ Body: any }>, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.testSMTP(req.body)
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('SMTP test failed:', error)
            res.code(500).send({
                success: false,
                error: 'SMTP test failed',
                message: error.message
            })
        }
    }

    async testAIProvider(req: FastifyRequest<{ Body: any }>, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.testAIProvider(req.body)
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('AI provider test failed:', error)
            res.code(500).send({
                success: false,
                error: 'AI provider test failed',
                message: error.message
            })
        }
    }

    async resetSetup(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.resetSetup()
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Reset setup failed:', error)
            res.code(500).send({
                success: false,
                error: 'Reset setup failed',
                message: error.message
            })
        }
    }

    async resetDatabase(req: FastifyRequest, res: FastifyReply): Promise<void> {
        try {
            const result = await this.setupService.resetDatabase()
            res.send({
                success: true,
                data: result
            })
        } catch (error: any) {
            console.error('Reset database failed:', error)
            res.code(500).send({
                success: false,
                error: 'Reset database failed',
                message: error.message
            })
        }
    }
}