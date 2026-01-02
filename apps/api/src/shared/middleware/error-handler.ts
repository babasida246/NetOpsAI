/**
 * Error Handler Middleware
 */
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from '../errors/http-errors.js'
import { ZodError } from 'zod'
import { env } from '../../config/env.js'

export function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): void {
    const requestId = request.id

    // Log error
    request.log.error({
        err: error,
        requestId,
        path: request.url,
        method: request.method
    })

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        reply.status(422).send({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: error.errors
            },
            requestId
        })
        return
    }

    // Handle custom HTTP errors
    if (error instanceof HttpError) {
        reply.status(error.statusCode).send({
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            },
            requestId
        })
        return
    }

    // Handle Fastify validation errors
    if (error.validation) {
        reply.status(400).send({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: error.validation
            },
            requestId
        })
        return
    }

    // Handle JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
        error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
        error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        reply.status(401).send({
            error: {
                code: 'UNAUTHORIZED',
                message: error.message
            },
            requestId
        })
        return
    }

    // Default error response
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 && env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message

    reply.status(statusCode).send({
        error: {
            code: 'INTERNAL_ERROR',
            message,
            ...(env.NODE_ENV !== 'production' && { stack: error.stack })
        },
        requestId
    })
}
