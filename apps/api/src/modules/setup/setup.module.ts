/**
 * Setup Module - First Time System Configuration Routes
 * 
 * Handles first-time system setup and configuration
 * Note: These endpoints are publicly accessible before system initialization
 */
import type { FastifyInstance } from 'fastify'
import type { PgClient } from '@infra/postgres'
import { SetupController } from '../../controllers/setup.controller.js'

interface SetupModuleOptions {
    pgClient: PgClient
}

/**
 * Setup routes - publicly accessible during initial setup
 */
export async function setupModule(fastify: FastifyInstance, options: SetupModuleOptions): Promise<void> {
    const { pgClient } = options

    // Initialize setup controller
    const setupController = new SetupController({ pgClient })

    // Setup status check - Check current setup status and progress
    fastify.get('/status', setupController.getSetupStatus)

    // Initialize database - Initialize database with required tables and structure
    fastify.post('/database', setupController.initializeDatabase)

    // Create admin user - Create the first admin user account
    fastify.post('/admin', setupController.createAdminUser)

    // Configure system settings - Configure basic system settings
    fastify.post('/system', setupController.configureSystem)

    // Test SMTP connection
    fastify.post('/test-smtp', setupController.testSMTP)

    // Configure AI providers - Configure AI provider settings
    fastify.post('/ai-providers', setupController.configureAIProviders)

    // Test AI provider
    fastify.post('/test-ai-provider', setupController.testAIProvider)

    // Load seed data - Load initial seed data into the system
    fastify.post('/seed-data', setupController.loadSeedData)

    // Complete setup - Complete the setup process and finalize system initialization
    fastify.post('/complete', setupController.completeSetup)

    // Reset setup (dev only) - Reset setup status to allow re-initialization
    fastify.delete('/reset', setupController.resetSetup)

    // Reset database (dev only) - Drop all tables and reset database to initial state
    fastify.delete('/reset-database', setupController.resetDatabase)

    // Health check - Check health of setup components (different from main health endpoint)
    fastify.get('/health-check', setupController.healthCheck)
}