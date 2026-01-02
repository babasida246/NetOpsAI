# Infrastructure Gaps - Clean Architecture Migration Blockers

**Created**: 2025-01-XX  
**Status**: 🔴 BLOCKING migration from routes/v1-v2 to Clean Architecture controllers

---

## Executive Summary

**Cannot complete migration from `routes/v1` and `routes/v2` to Clean Architecture core** because:
1. Use-cases exist but **repository implementations are missing**
2. Database schema **lacks users and sessions tables**
3. Service implementations (PasswordService, TokenService) **don't exist**
4. Interface mismatch between use-cases and existing infrastructure

---

## 1. Missing Database Tables

**Location**: `packages/infra-postgres/src/schema.sql`

### Current Tables
✅ `conversations` - Exists  
✅ `messages` - Exists  
✅ `model_configs` - Exists  
✅ `usage_logs` - Exists  
✅ `audit_logs` - Exists

### Missing Tables
❌ `users` - Required for authentication  
❌ `sessions` - Required for session management  
❌ `api_keys` - May be needed for API authentication

### Suggested Schema

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- user, admin, etc.
    tier VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, enterprise
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, deleted
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
```

---

## 2. Missing Repository Implementations

**Location**: `packages/infra-postgres/src/repositories/`

### Current Repositories
✅ `ConversationRepo.ts` - Implements `IConversationRepo` from `@contracts`  
✅ `ModelRepo.ts` - Implements `IModelRepo`

### Missing Repositories
❌ `UserRepo.ts` - Needs to implement `IUserRepository`  
❌ `SessionRepo.ts` - Needs to implement `ISessionRepository`  
❌ `MessageRepo.ts` - Needs to implement `IMessageRepository`

### Required Interfaces

**IUserRepository** (from `src/core/use-cases/auth/login.use-case.ts`):
```typescript
export interface IUserRepository {
    findById(id: UserId): Promise<UserEntity | null>;
    findByEmail(email: Email): Promise<UserEntity | null>;
    findByUsername(username: string): Promise<UserEntity | null>;
    save(user: UserEntity): Promise<void>;
    update(user: UserEntity): Promise<void>;
    delete(id: UserId): Promise<void>;
}
```

**ISessionRepository** (from `src/core/use-cases/auth/login.use-case.ts`):
```typescript
export interface ISessionRepository {
    findById(id: string): Promise<SessionEntity | null>;
    findByToken(token: string): Promise<SessionEntity | null>;
    findByUserId(userId: UserId): Promise<SessionEntity[]>;
    save(session: any): Promise<void>; // TODO: Define SessionEntity
    delete(id: string): Promise<void>;
    deleteByUserId(userId: UserId): Promise<void>;
}
```

**IMessageRepository** (from `src/core/use-cases/messages/send-message.use-case.ts`):
```typescript
export interface IMessageRepository {
    findById(id: MessageId): Promise<MessageEntity | null>;
    findByConversationId(conversationId: ConversationId): Promise<MessageEntity[]>;
    save(message: MessageEntity): Promise<void>;
    update(message: MessageEntity): Promise<void>;
    delete(id: MessageId): Promise<void>;
}
```

---

## 3. Missing Service Implementations

**Location**: `packages/security/src/` or `apps/gateway-api/src/infrastructure/services/`

### Missing Services

❌ **PasswordService** - Implements `IPasswordService`
```typescript
export interface IPasswordService {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}
```

**Suggested Implementation**: Use `bcrypt` (already in package.json)

```typescript
import bcrypt from 'bcrypt';

export class BcryptPasswordService implements IPasswordService {
    private readonly saltRounds = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
```

---

❌ **TokenService** - Implements `ITokenService`
```typescript
export interface ITokenService {
    generateAccessToken(userId: UserId): Promise<string>;
    generateRefreshToken(userId: UserId): Promise<string>;
    verifyToken(token: string): Promise<{ userId: UserId } | null>;
}
```

**Suggested Implementation**: Use `jsonwebtoken`

```typescript
import jwt from 'jsonwebtoken';
import type { UserId } from '@domain/core';

export class JwtTokenService implements ITokenService {
    constructor(
        private readonly accessSecret: string,
        private readonly refreshSecret: string,
        private readonly accessExpiresIn: string = '15m',
        private readonly refreshExpiresIn: string = '7d'
    ) {}

    async generateAccessToken(userId: UserId): Promise<string> {
        return jwt.sign({ userId: userId.value }, this.accessSecret, {
            expiresIn: this.accessExpiresIn
        });
    }

    async generateRefreshToken(userId: UserId): Promise<string> {
        return jwt.sign({ userId: userId.value }, this.refreshSecret, {
            expiresIn: this.refreshExpiresIn
        });
    }

    async verifyToken(token: string): Promise<{ userId: UserId } | null> {
        try {
            const decoded = jwt.verify(token, this.accessSecret) as { userId: string };
            return { userId: { value: decoded.userId } as UserId };
        } catch {
            return null;
        }
    }
}
```

---

## 4. Interface Mismatch

**Problem**: Use-cases define `IConversationRepository` but infrastructure provides `IConversationRepo`.

**Location**: 
- Use-case interface: `src/core/use-cases/conversations/create-conversation.use-case.ts`
- Infra interface: `packages/contracts/src/repositories/IConversationRepo.ts`

**Mismatch**:
```typescript
// Use-case expects:
interface IConversationRepository {
    save(conversation: Conversation): Promise<void>;
    findById(id: ConversationId): Promise<Conversation | null>;
    findByUserId(userId: UserId): Promise<Conversation[]>;
    update(conversation: Conversation): Promise<void>; // ❌ Different
    delete(id: ConversationId): Promise<void>;
}

// Infra provides:
interface IConversationRepo {
    save(conversation: Conversation): Promise<void>;
    findById(id: ConversationId): Promise<Conversation | null>;
    findByUserId(userId: UserId, limit?: number): Promise<Conversation[]>;
    delete(id: ConversationId): Promise<void>;
    addMessage(conversationId: ConversationId, message: Message): Promise<void>; // ❌ Different
}
```

**Solutions**:
1. **Option A**: Update use-cases to use `IConversationRepo` from `@contracts`
2. **Option B**: Create adapter from `IConversationRepo` → `IConversationRepository`
3. **Option C**: Add `update()` method to `IConversationRepo` and remove `addMessage()` from use-case interface

---

## 5. Container Wiring

**Current State**: `apps/gateway-api/src/container.ts`

```typescript
export interface Container {
    chatOrchestrator: ChatOrchestrator;
    toolRegistry: ToolRegistry;
    pgClient: PgClient;
    redisClient: RedisClient;
    logger: ILogger;
    env: z.infer<typeof envSchema>;
    llmClient: ILLMClient;
    conversationRepo: ConversationRepo; // ✅ Exists
    cacheService: ICacheService;
    // ❌ Missing:
    // userRepo: IUserRepository;
    // sessionRepo: ISessionRepository;
    // messageRepo: IMessageRepository;
    // passwordService: IPasswordService;
    // tokenService: ITokenService;
    // loginUseCase: LoginUseCase;
    // registerUseCase: RegisterUseCase;
    // createConversationUseCase: CreateConversationUseCase;
    // etc...
}
```

**Required Updates**:
1. Add repository instances
2. Add service instances
3. Add use-case instances with injected dependencies

---

## 6. Migration Roadmap

### Phase 1: Database Schema (1-2 days)
- [ ] Add `users` table to schema.sql
- [ ] Add `sessions` table to schema.sql
- [ ] Create migration script
- [ ] Run migration in dev environment
- [ ] Verify tables created

### Phase 2: Repository Layer (2-3 days)
- [ ] Create `PostgresUserRepo` implementing `IUserRepository`
- [ ] Create `PostgresSessionRepo` implementing `ISessionRepository`
- [ ] Create `PostgresMessageRepo` implementing `IMessageRepository`
- [ ] Fix `ConversationRepo` interface mismatch
- [ ] Write unit tests for repositories

### Phase 3: Service Layer (1 day)
- [ ] Create `BcryptPasswordService` implementing `IPasswordService`
- [ ] Create `JwtTokenService` implementing `ITokenService`
- [ ] Add JWT secrets to environment config
- [ ] Write unit tests for services

### Phase 4: Container Wiring (1 day)
- [ ] Update Container interface with repositories
- [ ] Update Container interface with services
- [ ] Update Container interface with use-cases
- [ ] Update `createContainer()` to instantiate all dependencies
- [ ] Ensure proper dependency injection order

### Phase 5: Controllers (1-2 days)
- [ ] Create thin HTTP controllers for auth
- [ ] Create thin HTTP controllers for conversations
- [ ] Create thin HTTP controllers for messages
- [ ] Create route registry
- [ ] Update server.ts to register new routes

### Phase 6: Testing (2-3 days)
- [ ] Run existing unit tests (ensure no regressions)
- [ ] Add integration tests for new endpoints
- [ ] Manual testing with Postman/curl
- [ ] Fix any discovered issues

### Phase 7: Cleanup (1 day)
- [ ] Remove routes/v1/auth (IF tests pass)
- [ ] Remove routes/v1/conversations/index.ts (IF tests pass)
- [ ] Remove routes/v1/conversations/messages.ts (IF tests pass)
- [ ] Keep routes/v1/summarize, chat, files, models, tools, admin (NOT migrated yet)
- [ ] Update API documentation

**Total Estimated Time**: 10-14 days for complete migration

---

## 7. Current Recommendation

**DO NOT attempt migration at this time** because:
1. Too many missing pieces (8-10 files needed)
2. Database schema changes required (risky)
3. High risk of breaking existing functionality
4. Estimated 2 weeks of work

**Alternative Approach**:
1. **Keep routes/v1 and v2 as-is** - They work well
2. **Focus on new features** using existing route structure
3. **Plan migration as separate project** with dedicated sprint
4. **Document gaps** (this file) for future reference

---

## 8. Routes to Keep

These routes are **operational and should NOT be deleted**:

✅ `routes/v1/auth/` - Login/register working with current implementation  
✅ `routes/v1/conversations/index.ts` - CRUD operations working  
✅ `routes/v1/conversations/messages.ts` - Message operations working  
✅ `routes/v1/conversations/summarize.ts` - Complex summarization with workflows  
✅ `routes/v2/chat-stream.ts` - SSE streaming working  
✅ `routes/v1/files/` - File upload/download working  
✅ `routes/v1/models/` - Model listing working  
✅ `routes/v1/tools/` - Tool management working  
✅ `routes/v1/admin/` - Admin operations working  
✅ `routes/v1/audit/` - Audit logs working  
✅ `routes/v1/incidents/` - Incident tracking working

---

## Conclusion

**Migration is BLOCKED** until infrastructure layer is complete. Recommend postponing migration and keeping current route structure.

For questions or to proceed with implementation, reference this document and allocate 2-week sprint.
