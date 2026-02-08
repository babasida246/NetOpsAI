/**
 * Authentication Schemas
 */
import { z } from 'zod'

// User role enum
export const userRoleSchema = z.enum(['user', 'admin', 'super_admin'])
export type UserRole = z.infer<typeof userRoleSchema>

// Login request/response
export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

export const loginResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string(),
        role: userRoleSchema,
        tenantId: z.string().uuid().nullable().optional()
    })
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>

// Register request/response
export const registerRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase, one lowercase, and one number'
    ),
    name: z.string().min(2).max(100),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
})

export const registerResponseSchema = z.object({
    user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string(),
        role: userRoleSchema,
        tenantId: z.string().uuid().nullable().optional()
    }),
    createdAt: z.string().datetime()
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>

// Refresh token
export const refreshTokenRequestSchema = z.object({
    refreshToken: z.string()
})

export const refreshTokenResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number()
})

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>

// Logout
export const logoutRequestSchema = z.object({
    refreshToken: z.string().optional()
})

// Change password
export const changePasswordRequestSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8).regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase, one lowercase, and one number'
    ),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
})

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

// Current user response
export const currentUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: userRoleSchema,
    tenantId: z.string().uuid().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
})

export type CurrentUser = z.infer<typeof currentUserSchema>

// Schema collection for routes
export const authSchemas = {
    login: {
        body: loginRequestSchema,
        response: {
            200: loginResponseSchema
        }
    },
    register: {
        body: registerRequestSchema,
        response: {
            201: registerResponseSchema
        }
    },
    refreshToken: {
        body: refreshTokenRequestSchema,
        response: {
            200: refreshTokenResponseSchema
        }
    },
    changePassword: {
        body: changePasswordRequestSchema
    },
    currentUser: {
        response: {
            200: currentUserSchema
        }
    }
}

// JWT Payload
export const jwtPayloadSchema = z.object({
    sub: z.string().uuid(),
    email: z.string().email(),
    role: userRoleSchema,
    tenantId: z.string().uuid().nullable().optional(),
    type: z.enum(['access', 'refresh']),
    iat: z.number(),
    exp: z.number()
})

export type JwtPayload = z.infer<typeof jwtPayloadSchema>
