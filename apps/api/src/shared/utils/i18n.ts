/**
 * i18n Helper Functions
 */
import { i18next } from '../config/i18n.js'
import type { FastifyRequest } from 'fastify'

/**
 * Get translation function for current request language
 */
export function getTranslator(request: FastifyRequest) {
    const language = request.language || 'en'
    return (key: string, options?: Record<string, any>) => {
        return i18next.t(key, { ...options, lng: language })
    }
}

/**
 * Translate key with request context
 */
export function t(request: FastifyRequest, key: string, options?: Record<string, any>): string {
    const language = request.language || 'en'
    return i18next.t(key, { ...options, lng: language })
}

/**
 * Get current language from request
 */
export function getLanguage(request: FastifyRequest): string {
    return request.language || 'en'
}
