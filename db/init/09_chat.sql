-- ============================================================================
-- 09_chat.sql - Chat Conversations and Messages
-- ============================================================================

-- Conversations
CREATE TABLE
IF NOT EXISTS public.conversations
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    user_id uuid NOT NULL,
    title character varying
(255),
    model_id character varying
(100),
    provider_id character varying
(50),
    is_archived boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT conversations_pkey PRIMARY KEY
(id),
    CONSTRAINT conversations_user_id_fkey FOREIGN KEY
(user_id) REFERENCES public.users
(id) ON
DELETE CASCADE
);

-- Messages
CREATE TABLE
IF NOT EXISTS public.messages
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    conversation_id uuid NOT NULL,
    role character varying
(20) NOT NULL,
    content text NOT NULL,
    tokens_used integer DEFAULT 0,
    model_id character varying
(100),
    provider_id character varying
(50),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT messages_pkey PRIMARY KEY
(id),
    CONSTRAINT messages_role_check CHECK
(((role)::text = ANY
((ARRAY['system'::character varying, 'user'::character varying, 'assistant'::character varying, 'tool'::character varying])::text[]))),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY
(conversation_id) REFERENCES public.conversations
(id) ON
DELETE CASCADE
);

-- Chat Contexts (for context management)
CREATE TABLE
IF NOT EXISTS public.chat_contexts
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    conversation_id uuid NOT NULL,
    context_type character varying
(50) NOT NULL,
    context_data jsonb NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp
with time zone,
    created_at timestamp
with time zone DEFAULT now
(),
    updated_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT chat_contexts_pkey PRIMARY KEY
(id),
    CONSTRAINT chat_contexts_context_type_check CHECK
(((context_type)::text = ANY
((ARRAY['system'::character varying, 'user_profile'::character varying, 'session'::character varying, 'asset'::character varying, 'cmdb'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT chat_contexts_conversation_id_fkey FOREIGN KEY
(conversation_id) REFERENCES public.conversations
(id) ON
DELETE CASCADE
);

-- Conversation Token Usage
CREATE TABLE
IF NOT EXISTS public.conversation_token_usage
(
    id uuid DEFAULT public.uuid_generate_v4
() NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    model_id character varying
(100),
    provider_id character varying
(50),
    cost_estimate numeric
(10,6) DEFAULT 0,
    created_at timestamp
with time zone DEFAULT now
(),
    CONSTRAINT conversation_token_usage_pkey PRIMARY KEY
(id),
    CONSTRAINT conversation_token_usage_conversation_id_fkey FOREIGN KEY
(conversation_id) REFERENCES public.conversations
(id) ON
DELETE CASCADE,
    CONSTRAINT conversation_token_usage_message_id_fkey FOREIGN KEY
(message_id) REFERENCES public.messages
(id) ON
DELETE
SET NULL
);

-- Indexes
CREATE INDEX
IF NOT EXISTS idx_conversations_user ON public.conversations USING btree
(user_id);
CREATE INDEX
IF NOT EXISTS idx_conversations_created ON public.conversations USING btree
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_conversations_updated ON public.conversations USING btree
(updated_at DESC);
CREATE INDEX
IF NOT EXISTS idx_conversations_archived ON public.conversations USING btree
(user_id, is_archived);
CREATE INDEX
IF NOT EXISTS idx_conversations_model ON public.conversations USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_conversations_provider ON public.conversations USING btree
(provider_id);
CREATE INDEX
IF NOT EXISTS idx_conversations_metadata ON public.conversations USING gin
(metadata);

CREATE INDEX
IF NOT EXISTS idx_messages_conversation ON public.messages USING btree
(conversation_id);
CREATE INDEX
IF NOT EXISTS idx_messages_created ON public.messages USING btree
(created_at);
CREATE INDEX
IF NOT EXISTS idx_messages_role ON public.messages USING btree
(role);
CREATE INDEX
IF NOT EXISTS idx_messages_model ON public.messages USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_messages_metadata ON public.messages USING gin
(metadata);

CREATE INDEX
IF NOT EXISTS idx_chat_contexts_conversation ON public.chat_contexts USING btree
(conversation_id);
CREATE INDEX
IF NOT EXISTS idx_chat_contexts_type ON public.chat_contexts USING btree
(context_type);
CREATE INDEX
IF NOT EXISTS idx_chat_contexts_active ON public.chat_contexts USING btree
(conversation_id, is_active) WHERE
(is_active = true);
CREATE INDEX
IF NOT EXISTS idx_chat_contexts_expires ON public.chat_contexts USING btree
(expires_at) WHERE
(expires_at IS NOT NULL);
CREATE INDEX
IF NOT EXISTS idx_chat_contexts_data ON public.chat_contexts USING gin
(context_data);

CREATE INDEX
IF NOT EXISTS idx_token_usage_conversation ON public.conversation_token_usage USING btree
(conversation_id);
CREATE INDEX
IF NOT EXISTS idx_token_usage_message ON public.conversation_token_usage USING btree
(message_id);
CREATE INDEX
IF NOT EXISTS idx_token_usage_model ON public.conversation_token_usage USING btree
(model_id);
CREATE INDEX
IF NOT EXISTS idx_token_usage_created ON public.conversation_token_usage USING btree
(created_at);
