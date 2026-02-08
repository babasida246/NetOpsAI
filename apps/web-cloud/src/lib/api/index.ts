/**
 * Web UI API Module
 * 
 * This module provides a unified API client for the web UI.
 * Structure follows the apps/cloud-api module pattern.
 * 
 * Usage:
 *   import { login, listAssets, sendChatMessage } from '$lib/api'
 *   
 * Or import specific modules:
 *   import * as auth from '$lib/api/modules/auth'
 *   import * as assets from '$lib/api/modules/assets'
 */

// Core HTTP client and types
export * from './core'

// All modules
export * from './modules'

// Legacy exports for backward compatibility
export {
    API_BASE,
    getStoredTokens,
    setStoredTokens,
    setStoredUser,
    clearStoredSession,
    requireAccessToken,
    refreshAccessToken,
    authorizedFetch,
    apiJson,
    apiJsonData,
    unwrapApiData,
    buildQuery,
    getAssetHeaders,
    authJson,
    authJsonData
} from './core/http-client'
