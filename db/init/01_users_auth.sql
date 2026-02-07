-- ============================================================================
-- 01_users_auth.sql - Users, Sessions, and Authentication
-- ============================================================================

-- Users table
CREATE TABLE
IF NOT EXISTS public.users
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    email character varying
(255) NOT NULL,
    name character varying
(255) NOT NULL,
    username character varying
(255),
    password_hash character varying
(255) NOT NULL,
    role character varying
(50) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tier character varying
(50) DEFAULT 'free'::character varying NOT NULL,
    status character varying
(20) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp
with time zone,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT users_pkey PRIMARY KEY
(id),
    CONSTRAINT users_email_key UNIQUE
(email),
    CONSTRAINT users_username_key UNIQUE
(username)
);

-- Sessions table
CREATE TABLE
IF NOT EXISTS public.sessions
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    user_id uuid NOT NULL,
    token character varying
(500) NOT NULL,
    refresh_token character varying
(500) NOT NULL,
    expires_at timestamp
with time zone NOT NULL,
    refresh_expires_at timestamp
with time zone NOT NULL,
    ip_address character varying
(45),
    user_agent text,
    is_revoked boolean DEFAULT false,
    last_activity_at timestamp
with time zone DEFAULT now
(),
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT sessions_pkey PRIMARY KEY
(id),
    CONSTRAINT sessions_refresh_token_key UNIQUE
(refresh_token),
    CONSTRAINT sessions_token_key UNIQUE
(token),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY
(user_id) REFERENCES public.users
(id) ON
DELETE CASCADE
);

-- Audit logs
CREATE TABLE
IF NOT EXISTS public.audit_logs
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    correlation_id character varying
(100),
    user_id character varying
(255),
    action character varying
(100) NOT NULL,
    resource character varying
(255),
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY
(id)
);

-- Indexes
CREATE INDEX
IF NOT EXISTS idx_users_email ON public.users USING btree
(email);
CREATE INDEX
IF NOT EXISTS idx_users_username ON public.users USING btree
(username);
CREATE INDEX
IF NOT EXISTS idx_users_status ON public.users USING btree
(status);
CREATE INDEX
IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree
(user_id);
CREATE INDEX
IF NOT EXISTS idx_sessions_token ON public.sessions USING btree
(token);
CREATE INDEX
IF NOT EXISTS idx_sessions_refresh_token ON public.sessions USING btree
(refresh_token);
CREATE INDEX
IF NOT EXISTS idx_sessions_expires_at ON public.sessions USING btree
(expires_at);
CREATE INDEX
IF NOT EXISTS idx_audit_logs_correlation ON public.audit_logs USING btree
(correlation_id);
CREATE INDEX
IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs USING btree
(user_id, action, created_at DESC);
