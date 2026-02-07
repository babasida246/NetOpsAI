-- ============================================================================
-- 11_usage_stats.sql - Usage Logs and Statistics
-- ============================================================================

-- Usage Logs
CREATE TABLE
IF NOT EXISTS public.usage_logs
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    user_id uuid,
    conversation_id uuid,
    message_id uuid,
    provider_id character varying
(50),
    model_id character varying
(100),
    action_type character varying
(50) NOT NULL,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    latency_ms integer,
    cost_estimate numeric
(10,6) DEFAULT 0,
    success boolean DEFAULT true,
    error_message text,
    request_metadata jsonb DEFAULT '{}'::jsonb,
    response_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT usage_logs_pkey PRIMARY KEY
(id),
    CONSTRAINT usage_logs_action_type_check CHECK
(((action_type)::text = ANY
((ARRAY['chat_completion'::character varying, 'embedding'::character varying, 'moderation'::character varying, 'image_generation'::character varying, 'audio_transcription'::character varying, 'function_call'::character varying])::text[]))),
    CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY
(user_id) REFERENCES public.users
(id) ON
DELETE
SET NULL
,
    CONSTRAINT usage_logs_conversation_id_fkey FOREIGN KEY
(conversation_id) REFERENCES public.conversations
(id) ON
DELETE
SET NULL
,
    CONSTRAINT usage_logs_message_id_fkey FOREIGN KEY
(message_id) REFERENCES public.messages
(id) ON
DELETE
SET NULL
);

-- User Token Stats (aggregated)
CREATE TABLE
IF NOT EXISTS public.user_token_stats
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    user_id uuid NOT NULL,
    period_start date NOT NULL,
    period_type character varying
(20) NOT NULL,
    provider_id character varying
(50),
    model_id character varying
(100),
    total_requests integer DEFAULT 0,
    total_prompt_tokens integer DEFAULT 0,
    total_completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    total_cost numeric
(12,6) DEFAULT 0,
    avg_latency_ms numeric
(10,2),
    success_rate numeric
(5,2),
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT user_token_stats_pkey PRIMARY KEY
(id),
    CONSTRAINT user_token_stats_unique UNIQUE
(user_id, period_start, period_type, provider_id, model_id),
    CONSTRAINT user_token_stats_period_type_check CHECK
(((period_type)::text = ANY
((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT user_token_stats_user_id_fkey FOREIGN KEY
(user_id) REFERENCES public.users
(id) ON
DELETE CASCADE
);

-- Model Usage History (for trending and analysis)
CREATE TABLE
IF NOT EXISTS public.model_usage_history
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    period_start timestamp
with time zone NOT NULL,
    period_type character varying
(20) NOT NULL,
    provider_id character varying
(50) NOT NULL,
    model_id character varying
(100) NOT NULL,
    total_requests integer DEFAULT 0,
    total_prompt_tokens integer DEFAULT 0,
    total_completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    total_cost numeric
(12,6) DEFAULT 0,
    unique_users integer DEFAULT 0,
    avg_latency_ms numeric
(10,2),
    p50_latency_ms numeric
(10,2),
    p95_latency_ms numeric
(10,2),
    p99_latency_ms numeric
(10,2),
    error_count integer DEFAULT 0,
    error_rate numeric
(5,2),
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT model_usage_history_pkey PRIMARY KEY
(id),
    CONSTRAINT model_usage_history_unique UNIQUE
(period_start, period_type, provider_id, model_id),
    CONSTRAINT model_usage_history_period_type_check CHECK
(((period_type)::text = ANY
((ARRAY['hourly'::character varying, 'daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[])))
);

-- Provider Usage History
CREATE TABLE
IF NOT EXISTS public.provider_usage_history
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    period_start timestamp
with time zone NOT NULL,
    period_type character varying
(20) NOT NULL,
    provider_id character varying
(50) NOT NULL,
    total_requests integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    total_cost numeric
(12,6) DEFAULT 0,
    unique_users integer DEFAULT 0,
    unique_models integer DEFAULT 0,
    avg_latency_ms numeric
(10,2),
    error_count integer DEFAULT 0,
    rate_limit_hits integer DEFAULT 0,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT provider_usage_history_pkey PRIMARY KEY
(id),
    CONSTRAINT provider_usage_history_unique UNIQUE
(period_start, period_type, provider_id),
    CONSTRAINT provider_usage_history_period_type_check CHECK
(((period_type)::text = ANY
((ARRAY['hourly'::character varying, 'daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[])))
);

-- Model Performance Metrics
CREATE TABLE
IF NOT EXISTS public.model_performance
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    model_id character varying
(100) NOT NULL,
    provider_id character varying
(50) NOT NULL,
    recorded_at timestamp
with time zone DEFAULT now
() NOT NULL,
    avg_response_time_ms numeric
(10,2),
    p50_response_time_ms numeric
(10,2),
    p95_response_time_ms numeric
(10,2),
    p99_response_time_ms numeric
(10,2),
    success_rate numeric
(5,2),
    tokens_per_second numeric
(10,2),
    availability_percent numeric
(5,2),
    sample_size integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT model_performance_pkey PRIMARY KEY
(id)
);

-- Indexes
CREATE INDEX
IF NOT EXISTS idx_usage_logs_user ON public.usage_logs USING btree
(user_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_conversation ON public.usage_logs USING btree
(conversation_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_model ON public.usage_logs USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_provider ON public.usage_logs USING btree
(provider_id);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_created ON public.usage_logs USING btree
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_action ON public.usage_logs USING btree
(action_type);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_success ON public.usage_logs USING btree
(success);
CREATE INDEX
IF NOT EXISTS idx_usage_logs_user_created ON public.usage_logs USING btree
(user_id, created_at DESC);

CREATE INDEX
IF NOT EXISTS idx_user_token_stats_user ON public.user_token_stats USING btree
(user_id);
CREATE INDEX
IF NOT EXISTS idx_user_token_stats_period ON public.user_token_stats USING btree
(period_start, period_type);
CREATE INDEX
IF NOT EXISTS idx_user_token_stats_model ON public.user_token_stats USING btree
(model_id);

CREATE INDEX
IF NOT EXISTS idx_model_usage_history_period ON public.model_usage_history USING btree
(period_start, period_type);
CREATE INDEX
IF NOT EXISTS idx_model_usage_history_model ON public.model_usage_history USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_model_usage_history_provider ON public.model_usage_history USING btree
(provider_id);

CREATE INDEX
IF NOT EXISTS idx_provider_usage_history_period ON public.provider_usage_history USING btree
(period_start, period_type);
CREATE INDEX
IF NOT EXISTS idx_provider_usage_history_provider ON public.provider_usage_history USING btree
(provider_id);

CREATE INDEX
IF NOT EXISTS idx_model_performance_model ON public.model_performance USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_model_performance_provider ON public.model_performance USING btree
(provider_id);
CREATE INDEX
IF NOT EXISTS idx_model_performance_recorded ON public.model_performance USING btree
(recorded_at DESC);
