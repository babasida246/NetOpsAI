/**
 * Error Handler Middleware
 */
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from '../errors/http-errors.js'
import { ZodError } from 'zod'
import { env } from '../../config/env.js'

interface ProblemDetails {
    type: string
    title: string
    status: number
    detail?: string
    instance?: string
    errors?: unknown
    requestId?: string
    error?: {
        code: string
        message: string
        details?: unknown
    }
}

const errorTypeBase = 'https://netops.ai/errors'

function toProblem(
    status: number,
    title: string,
    detail: string,
    request: FastifyRequest,
    code = 'INTERNAL_ERROR',
    errors?: unknown
): ProblemDetails {
    return {
        type: `${errorTypeBase}/${code.toLowerCase()}`,
        title,
        status,
        detail,
        instance: request.url,
        requestId: request.id as string,
        errors,
        // Backward compatibility for older clients still reading { error: { code, message } }
        error: {
            code,
            message: detail,
            details: errors
        }
    }
}

export function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): void {
    const requestId = request.id

    request.log.error({
        err: error,
        requestId,
        path: request.url,
        method: request.method
    })

    const sendProblem = (problem: ProblemDetails) => {
        reply
            .status(problem.status)
            .type('application/problem+json')
            .send(problem)
    }

    // Zod validation errors
    if (error instanceof ZodError) {
        return sendProblem(
            toProblem(
                422,
                'Validation error',
                'Request validation failed',
                request,
                'VALIDATION_ERROR',
                error.errors
            )
        )
    }

    // Custom HTTP errors
    if (error instanceof HttpError) {
        return sendProblem(
            toProblem(
                error.statusCode,
                error.code.replace(/_/g, ' ').toLowerCase(),
                error.message,
                request,
                error.code,
                error.details
            )
        )
    }

    // Fastify validation errors
    if (error.validation) {
        return sendProblem(
            toProblem(
                400,
                'Bad Request',
                'Request validation failed',
                request,
                'VALIDATION_ERROR',
                error.validation
            )
        )
    }

    // JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
        error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
        error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return sendProblem(
            toProblem(
                401,
                'Unauthorized',
                error.message,
                request,
                'UNAUTHORIZED'
            )
        )
    }

    const statusCode = error.statusCode || 500
    const message = statusCode === 500 && env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message

    return sendProblem(
        toProblem(
            statusCode,
            statusCode === 500 ? 'Internal Server Error' : 'Error',
            message,
            request,
            statusCode === 500 ? 'INTERNAL_ERROR' : (error.code || 'ERROR'),
            env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined
        )
    )
}
