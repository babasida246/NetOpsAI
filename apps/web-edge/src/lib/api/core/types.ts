/**
 * Core API Types
 * 
 * Common types used across all API modules.
 */

export type ApiResponse<T> = {
    data: T
    meta?: {
        total?: number
        page?: number
        limit?: number
        totalPages?: number
    }
}

export type PaginationParams = {
    page?: number
    limit?: number
}

export type SortParams = {
    sort?: string
    order?: 'asc' | 'desc'
}

export type ApiError = {
    message: string
    code?: string
    statusCode?: number
    details?: Record<string, unknown>
}

export class HttpError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public code?: string,
        public details?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'HttpError'
    }
}
