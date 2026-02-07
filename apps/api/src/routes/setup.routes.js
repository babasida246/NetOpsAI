/**
 * Setup Routes - First Time Configuration
 */
import { Router } from 'express'
import { SetupController } from '../controllers/setup.controller.js'

const router = Router()
const setupController = new SetupController()

// Setup status and health
router.get('/status', setupController.getSetupStatus)
router.get('/health', setupController.healthCheck)

// Setup steps
router.post('/step/database', setupController.initializeDatabase)
router.post('/step/admin', setupController.createAdminUser)
router.post('/step/system', setupController.configureSystem)
router.post('/step/ai-providers', setupController.configureAIProviders)
router.post('/step/seed-data', setupController.loadSeedData)

// Complete setup
router.post('/complete', setupController.completeSetup)

export { router as setupRoutes }