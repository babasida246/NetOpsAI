-- Migration: Alter users table and add sessions
-- Date: 2024-12-24
-- Description: Update existing users table and add sessions for Clean Architecture

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN
IF NOT EXISTS username VARCHAR
(255);
ALTER TABLE users ADD COLUMN
IF NOT EXISTS tier VARCHAR
(50) DEFAULT 'free';

-- Create unique index on username if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_users_username') THEN
    CREATE UNIQUE INDEX idx_users_username ON users(username);
END
IF;
END $$;

-- Update existing users to have username = name if null
UPDATE users SET username = name WHERE username IS NULL;

-- Make username NOT NULL after populating
ALTER TABLE users ALTER COLUMN username
SET NOT NULL;

-- Rename last_login to last_login_at for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login') THEN
    ALTER TABLE users RENAME COLUMN last_login TO last_login_at;
END
IF;
END $$;

-- Sessions table (user_id references VARCHAR id from users)
CREATE TABLE
IF NOT EXISTS sessions
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4
(),
    user_id VARCHAR
(255) NOT NULL REFERENCES users
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

-- Create default admin user if not exists
INSERT INTO users
    (id, email, name, username, password_hash, role, tier, status)
VALUES
    (
        'admin-' || gen_random_uuid()
::text,
    'admin@example.com',
    'Admin User',
    'admin',
    '$2b$10$rJYRxvL0V3x9pVE9K9X9NOEKm5f9K9X9NOEKm5f9K9X9NOEKm5f9K', -- password: admin123
    'admin',
    'enterprise',
    'active'
) ON CONFLICT
(email) DO NOTHING;
