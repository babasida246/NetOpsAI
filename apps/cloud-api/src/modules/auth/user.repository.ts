/**
 * User Repository
 */
import type { Pool } from 'pg'

export interface User {
    id: string
    email: string
    name: string
    password_hash: string
    role: 'user' | 'admin' | 'super_admin'
    is_active: boolean
    created_at: Date
    updated_at: Date
}

export interface CreateUserData {
    email: string
    name: string
    passwordHash: string
    role?: 'user' | 'admin' | 'super_admin'
}

export class UserRepository {
    constructor(private db: Pool) { }

    async findById(id: string): Promise<User | null> {
        const result = await this.db.query<User>(
            `SELECT id, email, name, password_hash, role, is_active, created_at, updated_at 
       FROM users WHERE id = $1`,
            [id]
        )
        return result.rows[0] || null
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db.query<User>(
            `SELECT id, email, name, password_hash, role, is_active, created_at, updated_at 
       FROM users WHERE email = $1`,
            [email.toLowerCase()]
        )
        return result.rows[0] || null
    }

    async create(data: CreateUserData): Promise<User> {
        const result = await this.db.query<User>(
            `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, password_hash, role, is_active, created_at, updated_at`,
            [data.email.toLowerCase(), data.name, data.passwordHash, data.role || 'user']
        )
        return result.rows[0]
    }

    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await this.db.query(
            `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
            [passwordHash, id]
        )
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.db.query(
            `UPDATE users SET updated_at = NOW() WHERE id = $1`,
            [id]
        )
    }

    async existsByEmail(email: string): Promise<boolean> {
        const result = await this.db.query<{ exists: boolean }>(
            `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists`,
            [email.toLowerCase()]
        )
        return result.rows[0]?.exists || false
    }
}
