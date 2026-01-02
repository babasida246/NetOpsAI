/**
 * Authentication Service
 */
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { UserRepository } from './user.repository.js'
import { SessionRepository } from './session.repository.js'
import type {
    LoginRequest, LoginResponse,
    RegisterRequest, RegisterResponse,
    RefreshTokenRequest, RefreshTokenResponse,
    ChangePasswordRequest, CurrentUser, JwtPayload
} from './auth.schema.js'
import {
    UnauthorizedError,
    ConflictError,
    BadRequestError,
    NotFoundError
} from '../../shared/errors/http-errors.js'

interface AuthConfig {
    accessSecret: string
    refreshSecret: string
    accessExpiresIn: string
    refreshExpiresIn: string
}

export class AuthService {
    private readonly SALT_ROUNDS = 12

    constructor(
        private userRepo: UserRepository,
        private sessionRepo: SessionRepository,
        private config: AuthConfig
    ) { }

    async login(data: LoginRequest, metadata?: { userAgent?: string; ip?: string }): Promise<LoginResponse> {
        const user = await this.userRepo.findByEmail(data.email)

        if (!user) {
            throw new UnauthorizedError('Invalid email or password')
        }

        if (!user.is_active) {
            throw new UnauthorizedError('Account is deactivated')
        }

        const isValidPassword = await bcrypt.compare(data.password, user.password_hash)
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid email or password')
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user)
        const refreshToken = this.generateRefreshToken(user)

        // Store session
        await this.sessionRepo.create(user.id, refreshToken, metadata)

        // Update last login
        await this.userRepo.updateLastLogin(user.id)

        return {
            accessToken,
            refreshToken,
            expiresIn: this.parseExpiry(this.config.accessExpiresIn),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }
    }

    async register(data: RegisterRequest): Promise<RegisterResponse> {
        // Check if email exists
        const exists = await this.userRepo.existsByEmail(data.email)
        if (exists) {
            throw new ConflictError('Email already registered')
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS)

        // Create user
        const user = await this.userRepo.create({
            email: data.email,
            name: data.name,
            passwordHash
        })

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.created_at.toISOString()
        }
    }

    async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
        // Verify refresh token
        let payload: JwtPayload
        try {
            payload = jwt.verify(data.refreshToken, this.config.refreshSecret) as JwtPayload
        } catch {
            throw new UnauthorizedError('Invalid refresh token')
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedError('Invalid token type')
        }

        // Check session exists
        const session = await this.sessionRepo.findByRefreshToken(data.refreshToken)
        if (!session) {
            throw new UnauthorizedError('Session expired or invalid')
        }

        // Get user
        const user = await this.userRepo.findById(payload.sub)
        if (!user || !user.is_active) {
            await this.sessionRepo.delete(data.refreshToken)
            throw new UnauthorizedError('User not found or inactive')
        }

        // Delete old session
        await this.sessionRepo.delete(data.refreshToken)

        // Generate new tokens
        const newAccessToken = this.generateAccessToken(user)
        const newRefreshToken = this.generateRefreshToken(user)

        // Create new session
        await this.sessionRepo.create(user.id, newRefreshToken)

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: this.parseExpiry(this.config.accessExpiresIn)
        }
    }

    async logout(userId: string, refreshToken?: string): Promise<void> {
        if (refreshToken) {
            await this.sessionRepo.delete(refreshToken)
        } else {
            await this.sessionRepo.deleteAllByUserId(userId)
        }
    }

    async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
        const user = await this.userRepo.findById(userId)
        if (!user) {
            throw new NotFoundError('User not found')
        }

        // Verify current password
        const isValid = await bcrypt.compare(data.currentPassword, user.password_hash)
        if (!isValid) {
            throw new BadRequestError('Current password is incorrect')
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(data.newPassword, this.SALT_ROUNDS)

        // Update password
        await this.userRepo.updatePassword(userId, passwordHash)

        // Invalidate all sessions
        await this.sessionRepo.deleteAllByUserId(userId)
    }

    async getCurrentUser(userId: string): Promise<CurrentUser> {
        const user = await this.userRepo.findById(userId)
        if (!user) {
            throw new NotFoundError('User not found')
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.created_at.toISOString(),
            updatedAt: user.updated_at.toISOString()
        }
    }

    verifyAccessToken(token: string): JwtPayload {
        try {
            const payload = jwt.verify(token, this.config.accessSecret) as JwtPayload
            if (payload.type !== 'access') {
                throw new UnauthorizedError('Invalid token type')
            }
            return payload
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Token expired')
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError('Invalid token')
            }
            throw error
        }
    }

    private generateAccessToken(user: { id: string; email: string; role: string }): string {
        return jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                type: 'access'
            },
            this.config.accessSecret,
            { expiresIn: this.config.accessExpiresIn } as jwt.SignOptions
        )
    }

    private generateRefreshToken(user: { id: string; email: string; role: string }): string {
        return jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                type: 'refresh'
            },
            this.config.refreshSecret,
            { expiresIn: this.config.refreshExpiresIn } as jwt.SignOptions
        )
    }

    private parseExpiry(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/)
        if (!match) return 900 // Default 15 minutes

        const value = parseInt(match[1], 10)
        const unit = match[2]

        switch (unit) {
            case 's': return value
            case 'm': return value * 60
            case 'h': return value * 60 * 60
            case 'd': return value * 60 * 60 * 24
            default: return 900
        }
    }
}
