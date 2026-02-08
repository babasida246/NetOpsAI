import type { Pool } from 'pg'

export type UserRecord = {
    id: string
    email: string
    role: string
}

export class UserRepository {
    constructor(private db: Pool) { }

    async findById(id: string): Promise<UserRecord | null> {
        const result = await this.db.query(
            `SELECT id, email, role FROM users WHERE id = $1`,
            [id]
        )
        if (!result.rows[0]) return null
        return {
            id: result.rows[0].id,
            email: result.rows[0].email,
            role: result.rows[0].role
        }
    }
}
