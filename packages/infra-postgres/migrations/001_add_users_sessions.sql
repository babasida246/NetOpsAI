-- Migration: Add users and sessions tables
-- Date: 2024-12-24
-- Description: Add authentication tables for Clean Architecture migration

-- Users table
CREATE TABLE
IF NOT EXISTS users
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    email VARCHAR
(255) UNIQUE NOT NULL,
    username VARCHAR
(255) UNIQUE NOT NULL,
    password_hash VARCHAR
(255) NOT NULL,
    role VARCHAR
(50) NOT NULL DEFAULT 'user',
    tier VARCHAR
(50) NOT NULL DEFAULT 'free',
    status VARCHAR
(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW
(),
    updated_at TIMESTAMPTZ DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_users_email ON users
(email);
CREATE INDEX
IF NOT EXISTS idx_users_username ON users
(username);
CREATE INDEX
IF NOT EXISTS idx_users_status ON users
(status);

-- Sessions table
CREATE TABLE
IF NOT EXISTS sessions
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
    token VARCHAR(500)
NOT NULL UNIQUE,
    refresh_token VARCHAR
(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR
(45),
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    last_activity_at TIMESTAMPTZ DEFAULT NOW
(),
    created_at TIMESTAMPTZ DEFAULT NOW
(),
    updated_at TIMESTAMPTZ DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_sessions_user_id ON sessions
(user_id);
CREATE INDEX
IF NOT EXISTS idx_sessions_token ON sessions
(token);
CREATE INDEX
IF NOT EXISTS idx_sessions_refresh_token ON sessions
(refresh_token);
CREATE INDEX
IF NOT EXISTS idx_sessions_expires_at ON sessions
(expires_at);

-- Insert default admin user (password: admin123 hashed with bcrypt)
INSERT INTO users
    (email, username, password_hash, role, tier, status)
VALUES
    (
        'admin@example.com',
        'admin',
        '$2b$10$YourHashHere', -- Change this after running
        'admin',
        'enterprise',
        'active'
)
ON CONFLICT
(email) DO NOTHING;
