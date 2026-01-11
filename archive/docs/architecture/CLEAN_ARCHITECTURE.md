# Clean Architecture Implementation

This document describes the Clean Architecture implementation in the MCP Server Gateway API.

## 🏛️ Architecture Principles

### Core Tenets

1. **Independence of Frameworks**: Business logic doesn't depend on Fastify, Express, or any framework
2. **Testability**: Business rules can be tested without UI, database, or external services
3. **Independence of UI**: UI can change without affecting business rules
4. **Independence of Database**: Business rules don't know about PostgreSQL, MongoDB, etc.
5. **Independence of External Services**: Business rules don't depend on LLM providers

### Dependency Rule

**Dependencies point inward**: Outer layers can depend on inner layers, never the reverse.

```
┌───────────────────────────────────────────┐
│    Infrastructure Layer                   │  ← Frameworks, DB, HTTP, External APIs
│  (Postgres, Redis, Fastify, LLM clients) │
└─────────────┬─────────────────────────────┘
              │ implements
              ▼
┌───────────────────────────────────────────┐
│    Application Layer                      │  ← HTTP Controllers, DTOs, Routes
│  (Controllers, Middleware, Validators)    │
└─────────────┬─────────────────────────────┘
              │ uses
              ▼
┌───────────────────────────────────────────┐
│    Use Cases Layer                        │  ← Application Business Rules
│  (Login, SendMessage, CreateConversation) │
└─────────────┬─────────────────────────────┘
              │ uses
              ▼
┌───────────────────────────────────────────┐
│    Domain Layer                           │  ← Enterprise Business Rules
│  (Entities, Value Objects, Services)      │  ← Pure TypeScript, No Dependencies
└───────────────────────────────────────────┘
```

## 📁 Folder Structure

```
apps/gateway-api/src/
├── core/                           # Clean Architecture core
│   ├── domain/                     # Domain Layer
│   │   ├── entities/              # Business entities
│   │   │   ├── user.entity.ts
│   │   │   ├── conversation.entity.ts
│   │   │   ├── message.entity.ts
│   │   │   ├── workflow.entity.ts
│   │   │   ├── tool.entity.ts
│   │   │   ├── policy.entity.ts
│   │   │   ├── session.entity.ts
│   │   │   └── api-key.entity.ts
│   │   ├── value-objects/         # Immutable value types
│   │   │   └── common.value-objects.ts  # Email, MessageRole
│   │   └── repositories/          # Repository interfaces (ports)
│   │       ├── user.repository.ts
│   │       ├── conversation.repository.ts
│   │       ├── message.repository.ts
│   │       └── workflow.repository.ts
│   ├── use-cases/                 # Use Case Layer
│   │   ├── auth/
│   │   │   ├── login.use-case.ts
│   │   │   ├── register.use-case.ts
│   │   │   ├── refresh-token.use-case.ts
│   │   │   └── logout.use-case.ts
│   │   ├── conversations/
│   │   │   ├── create-conversation.use-case.ts
│   │   │   ├── list-conversations.use-case.ts
│   │   │   ├── update-conversation.use-case.ts
│   │   │   └── delete-conversation.use-case.ts
│   │   └── messages/
│   │       ├── send-message.use-case.ts
│   │       └── list-messages.use-case.ts
│   └── services/                  # Domain Services
│       ├── chat.service.ts        # LLM orchestration
│       ├── workflow.service.ts    # Multi-step workflows
│       └── policy.service.ts      # Governance policies
├── infrastructure/                # Infrastructure Layer
│   ├── database/
│   │   ├── migrations/           # SQL migrations
│   │   └── repositories/         # Repository implementations
│   │       ├── postgres-user.repository.ts
│   │       ├── postgres-conversation.repository.ts
│   │       └── postgres-message.repository.ts
│   ├── cache/
│   │   └── redis-cache.service.ts
│   └── llm/
│       ├── openai.adapter.ts
│       ├── anthropic.adapter.ts
│       └── gemini.adapter.ts
├── application/                   # Application Layer
│   └── http/
│       ├── controllers/          # HTTP controllers
│       │   ├── auth.controller.ts
│       │   ├── conversation.controller.ts
│       │   └── message.controller.ts
│       ├── routes/               # Route definitions
│       └── middleware/           # HTTP middleware
├── shared/                       # Shared utilities
│   └── errors/
│       └── base.errors.ts        # Custom error classes
├── config/                       # Configuration
│   └── index.ts                  # Zod-validated config
└── observability/                # Observability
    ├── logging/
    │   └── logger.ts             # Pino logger
    └── metrics/
        └── prometheus.ts         # Prometheus metrics
```

## 🎯 Layer Responsibilities

### 1. Domain Layer (Innermost)

**Pure business logic, zero external dependencies.**

#### Entities

Business objects with identity and lifecycle:

```typescript
// user.entity.ts
export class UserEntity {
  private constructor(
    public readonly id: string,
    public readonly email: Email,  // Value Object
    public readonly role: UserRole,
    public readonly tier: UserTier,
    public readonly status: UserStatus,
    public readonly emailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  // Factory method
  static create(props: CreateUserProps): Result<UserEntity> {
    // Validation logic
    // Business rules
  }

  // Business methods
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  hasPremiumFeatures(): boolean {
    return this.tier === UserTier.PRO || this.tier === UserTier.ENTERPRISE;
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }
}
```

#### Value Objects

Immutable values identified by their attributes:

```typescript
// common.value-objects.ts
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(public readonly value: string) {}

  static create(email: string): Email {
    const trimmed = email?.trim() || '';
    if (!trimmed || !Email.EMAIL_REGEX.test(trimmed)) {
      throw new ValidationError('Invalid email');
    }
    return new Email(trimmed.toLowerCase());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

#### Repository Interfaces

Define data access contracts (implemented in infrastructure layer):

```typescript
// user.repository.ts
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: Email): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 2. Use Case Layer

**Application-specific business rules.**

```typescript
// login.use-case.ts
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResult> {
    // 1. Find user by email
    const email = Email.create(dto.email);
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // 2. Verify password
    const isValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // 3. Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('Account suspended');
    }

    // 4. Create session
    const session = SessionEntity.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await this.sessionRepository.save(session);

    // 5. Generate tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(session);

    // 6. Record login
    user.recordLogin();
    await this.userRepository.save(user);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
```

### 3. Domain Services

**Complex business logic spanning multiple entities.**

```typescript
// chat.service.ts
export class ChatService implements IChatService {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly policyService: IPolicyService,
    private readonly toolService: IToolService,
    private readonly costCalculator: ICostCalculator,
  ) {}

  async sendMessage(params: SendMessageParams): Promise<ChatResponse> {
    // 1. Check policies
    await this.policyService.checkRateLimit(params.userId);
    await this.policyService.checkModelAccess(params.userId, params.model);

    // 2. Execute tools if requested
    let toolResults = [];
    if (params.tools) {
      toolResults = await this.toolService.executeTools(params.tools);
    }

    // 3. Call LLM
    const response = await this.llmProvider.chat({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    // 4. Calculate cost
    const cost = this.costCalculator.calculate({
      model: params.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });

    // 5. Check cost limit
    await this.policyService.checkCostLimit(params.userId, cost);

    return {
      content: response.content,
      model: response.model,
      usage: response.usage,
      cost,
    };
  }
}
```

### 4. Application Layer

**HTTP-specific concerns.**

```typescript
// auth.controller.ts
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // 1. Validate DTO
      const dto = LoginRequestDTO.parse(request.body);

      // 2. Execute use case
      const result = await this.loginUseCase.execute(dto);

      // 3. Map to response DTO
      const response = LoginResponseDTO.from(result);

      // 4. Send HTTP response
      reply.code(200).send(response);
    } catch (error) {
      // 5. Handle errors
      if (error instanceof AuthenticationError) {
        reply.code(401).send({ error: error.message });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  }
}
```

### 5. Infrastructure Layer

**External dependencies and frameworks.**

```typescript
// postgres-user.repository.ts
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: Knex) {}

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.db('users').where({ id }).first();
    if (!row) return null;

    return UserEntity.create({
      id: row.id,
      email: Email.create(row.email),
      role: row.role,
      tier: row.tier,
      status: row.status,
      emailVerified: row.email_verified,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  async save(user: UserEntity): Promise<void> {
    await this.db('users')
      .insert({
        id: user.id,
        email: user.email.value,
        role: user.role,
        tier: user.tier,
        status: user.status,
        email_verified: user.emailVerified,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      })
      .onConflict('id')
      .merge();
  }
}
```

## 🔌 Dependency Injection

Use constructor injection for all dependencies:

```typescript
// main.ts - Application bootstrap
async function bootstrap() {
  // 1. Initialize infrastructure
  const db = initializeDatabase();
  const redis = initializeRedis();
  const logger = initializeLogger();

  // 2. Create repositories
  const userRepository = new PostgresUserRepository(db);
  const sessionRepository = new PostgresSessionRepository(db);

  // 3. Create services
  const passwordService = new BcryptPasswordService();
  const tokenService = new JwtTokenService(config.jwt);

  // 4. Create use cases
  const loginUseCase = new LoginUseCase(
    userRepository,
    sessionRepository,
    passwordService,
    tokenService,
  );

  // 5. Create controllers
  const authController = new AuthController(loginUseCase);

  // 6. Register routes
  app.post('/v1/auth/login', authController.login.bind(authController));
}
```

## ✅ Benefits Achieved

### 1. Testability

```typescript
// login.use-case.test.ts
describe('LoginUseCase', () => {
  it('should return tokens for valid credentials', async () => {
    // Arrange - Mock dependencies
    const mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      save: jest.fn(),
    };
    const useCase = new LoginUseCase(mockUserRepo, ...);

    // Act
    const result = await useCase.execute({ email, password });

    // Assert
    expect(result.accessToken).toBeDefined();
    expect(mockUserRepo.save).toHaveBeenCalled();
  });
});
```

### 2. Maintainability

- Clear separation of concerns
- Easy to locate and modify business rules
- Changes isolated to specific layers

### 3. Flexibility

- Swap Fastify for Express without touching business logic
- Replace PostgreSQL with MongoDB by implementing new repository
- Add new LLM provider with new adapter

### 4. Scalability

- Domain logic reusable across different interfaces (HTTP, WebSocket, CLI, MCP)
- Easy to add new use cases
- Clear boundaries for team collaboration

## 📊 Current Status

**Implemented** (v1.0):
- ✅ 8 Domain Entities
- ✅ 3 Value Objects
- ✅ 10 Use Cases
- ✅ 3 Domain Services
- ✅ 4 Repository Interfaces
- ✅ 39 Unit Tests (100% passing)

**In Progress**:
- 🔄 Repository Implementations (PostgreSQL)
- 🔄 HTTP Controllers
- 🔄 DTOs with Zod validation

**Planned**:
- 📋 Integration Tests
- 📋 E2E Tests
- 📋 Additional Use Cases

## 🔗 References

- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)

---

**Next**: See [API Documentation](../api/README.md) for REST endpoints.
