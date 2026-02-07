/**
 * HTTP Errors Tests
 */
import { describe, it, expect } from 'vitest';
import { HttpError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, TooManyRequestsError, InternalServerError, ServiceUnavailableError } from '../../src/shared/errors/http-errors.js';
describe('HTTP Errors', () => {
    describe('HttpError', () => {
        it('should create error with all properties', () => {
            const error = new HttpError(418, 'I am a teapot', 'TEAPOT', { extra: 'info' });
            expect(error.statusCode).toBe(418);
            expect(error.message).toBe('I am a teapot');
            expect(error.code).toBe('TEAPOT');
            expect(error.details).toEqual({ extra: 'info' });
            expect(error.name).toBe('HttpError');
        });
    });
    describe('BadRequestError', () => {
        it('should have correct status code and defaults', () => {
            const error = new BadRequestError();
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Bad Request');
            expect(error.code).toBe('BAD_REQUEST');
        });
        it('should accept custom message', () => {
            const error = new BadRequestError('Invalid input');
            expect(error.message).toBe('Invalid input');
        });
    });
    describe('UnauthorizedError', () => {
        it('should have correct status code', () => {
            const error = new UnauthorizedError();
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('UNAUTHORIZED');
        });
    });
    describe('ForbiddenError', () => {
        it('should have correct status code', () => {
            const error = new ForbiddenError();
            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN');
        });
    });
    describe('NotFoundError', () => {
        it('should have correct status code', () => {
            const error = new NotFoundError('User not found');
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('User not found');
            expect(error.code).toBe('NOT_FOUND');
        });
    });
    describe('ConflictError', () => {
        it('should have correct status code', () => {
            const error = new ConflictError('Email already exists');
            expect(error.statusCode).toBe(409);
            expect(error.message).toBe('Email already exists');
            expect(error.code).toBe('CONFLICT');
        });
    });
    describe('ValidationError', () => {
        it('should have correct status code and accept details', () => {
            const error = new ValidationError('Invalid data', [
                { field: 'email', message: 'Invalid email format' }
            ]);
            expect(error.statusCode).toBe(422);
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.details).toHaveLength(1);
        });
    });
    describe('TooManyRequestsError', () => {
        it('should have correct status code', () => {
            const error = new TooManyRequestsError();
            expect(error.statusCode).toBe(429);
            expect(error.code).toBe('TOO_MANY_REQUESTS');
        });
    });
    describe('InternalServerError', () => {
        it('should have correct status code', () => {
            const error = new InternalServerError();
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
        });
    });
    describe('ServiceUnavailableError', () => {
        it('should have correct status code', () => {
            const error = new ServiceUnavailableError('Database connection failed');
            expect(error.statusCode).toBe(503);
            expect(error.message).toBe('Database connection failed');
            expect(error.code).toBe('SERVICE_UNAVAILABLE');
        });
    });
});
//# sourceMappingURL=errors.test.js.map