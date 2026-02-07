-- ============================================================================
-- 10_ai_providers.sql - AI Providers and Model Configurations
-- ============================================================================

-- AI Providers
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    provider_type character varying(50) NOT NULL,
    base_url character varying(500),
    api_key_env character varying(100),
    is_enabled boolean DEFAULT true,
    priority integer DEFAULT 100,
    rate_limit_rpm integer,
    rate_limit_tpm integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_providers_pkey PRIMARY KEY (id),
    CONSTRAINT ai_providers_provider_type_check CHECK (((provider_type)::text = ANY ((ARRAY['openai'::character varying, 'anthropic'::character varying, 'azure'::character varying, 'google'::character varying, 'local'::character varying, 'custom'::character varying])::text[])))
);

-- Model Configurations
CREATE TABLE IF NOT EXISTS public.model_configs (
    id character varying(100) NOT NULL,
    provider_id character varying(50) NOT NULL,
    display_name character varying(255) NOT NULL,
    model_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT true,
    is_default boolean DEFAULT false,
    context_window integer DEFAULT 4096,
    max_output_tokens integer DEFAULT 2048,
    supports_vision boolean DEFAULT false,
    supports_function_calling boolean DEFAULT false,
    supports_streaming boolean DEFAULT true,
    input_cost_per_1k numeric(10,6),
    output_cost_per_1k numeric(10,6),
    temperature numeric(3,2) DEFAULT 0.7,
    top_p numeric(3,2) DEFAULT 1.0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT model_configs_pkey PRIMARY KEY (id),
    CONSTRAINT model_configs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(id) ON DELETE CASCADE
);

-- Orchestration Rules
CREATE TABLE IF NOT EXISTS public.orchestration_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    rule_type character varying(50) NOT NULL,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    priority integer DEFAULT 100,
    is_enabled boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orchestration_rules_pkey PRIMARY KEY (id),
    CONSTRAINT orchestration_rules_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['model_selection'::character varying, 'fallback'::character varying, 'load_balance'::character varying, 'rate_limit'::character varying, 'content_filter'::character varying, 'cost_control'::character varying])::text[])))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON public.ai_providers USING btree (provider_type);
CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled ON public.ai_providers USING btree (is_enabled) WHERE (is_enabled = true);
CREATE INDEX IF NOT EXISTS idx_ai_providers_priority ON public.ai_providers USING btree (priority);

CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON public.model_configs USING btree (provider_id);
CREATE INDEX IF NOT EXISTS idx_model_configs_enabled ON public.model_configs USING btree (is_enabled) WHERE (is_enabled = true);
CREATE INDEX IF NOT EXISTS idx_model_configs_default ON public.model_configs USING btree (is_default) WHERE (is_default = true);
CREATE INDEX IF NOT EXISTS idx_model_configs_model_name ON public.model_configs USING btree (model_name);
CREATE INDEX IF NOT EXISTS idx_model_configs_metadata ON public.model_configs USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_orchestration_rules_type ON public.orchestration_rules USING btree (rule_type);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_enabled ON public.orchestration_rules USING btree (is_enabled) WHERE (is_enabled = true);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_priority ON public.orchestration_rules USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_conditions ON public.orchestration_rules USING gin (conditions);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_actions ON public.orchestration_rules USING gin (actions);

-- Default AI Providers
INSERT INTO public.ai_providers (id, name, provider_type, base_url, api_key_env, priority) VALUES
    ('openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', 'OPENAI_API_KEY', 100),
    ('anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com', 'ANTHROPIC_API_KEY', 90)
ON CONFLICT (id) DO NOTHING;

-- Default Model Configurations
INSERT INTO public.model_configs (id, provider_id, display_name, model_name, is_default, context_window, max_output_tokens, supports_vision, supports_function_calling, input_cost_per_1k, output_cost_per_1k) VALUES
    ('gpt-4o', 'openai', 'GPT-4o', 'gpt-4o', true, 128000, 4096, true, true, 0.005, 0.015),
    ('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'gpt-4o-mini', false, 128000, 16384, true, true, 0.00015, 0.0006),
    ('gpt-4-turbo', 'openai', 'GPT-4 Turbo', 'gpt-4-turbo-preview', false, 128000, 4096, true, true, 0.01, 0.03),
    ('claude-3-5-sonnet', 'anthropic', 'Claude 3.5 Sonnet', 'claude-3-5-sonnet-20241022', false, 200000, 8192, true, true, 0.003, 0.015),
    ('claude-3-opus', 'anthropic', 'Claude 3 Opus', 'claude-3-opus-20240229', false, 200000, 4096, true, true, 0.015, 0.075),
    ('claude-3-haiku', 'anthropic', 'Claude 3 Haiku', 'claude-3-haiku-20240307', false, 200000, 4096, true, true, 0.00025, 0.00125)
ON CONFLICT (id) DO NOTHING;
