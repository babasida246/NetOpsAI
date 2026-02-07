# Contributing Guide

> How to contribute to IT Service Hub

## Welcome

Thank you for your interest in contributing to IT Service Hub! This document provides guidelines and instructions for contributing.

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- pnpm 8.x or higher
- Docker Desktop
- Git
- VS Code (recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/it-service-hub.git
cd it-service-hub

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/it-service-hub.git
```

### Setup Development Environment

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web-ui/.env.example apps/web-ui/.env

# Start services
docker-compose up -d

# Run database migrations
pnpm --filter @gateway/api db:migrate

# Start development servers
pnpm dev
```

---

## Development Workflow

### Branch Naming

Use descriptive branch names:

```
feature/add-asset-export
fix/login-validation-error
docs/update-api-reference
refactor/auth-middleware
chore/update-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(assets): add bulk import functionality

- Add CSV parser
- Add import preview
- Add error handling

Closes #123
```

```
fix(auth): resolve token refresh race condition

The refresh token endpoint was returning 401 when multiple
requests were made simultaneously. Added mutex lock.

Fixes #456
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Make changes** with tests
3. **Run checks locally:**
   ```bash
   pnpm lint
   pnpm test
   pnpm build:all
   ```
4. **Push and create PR**
5. **Fill PR template**
6. **Address review comments**
7. **Squash and merge**

---

## Code Standards

### TypeScript

```typescript
// ✅ Good
interface CreateAssetDto {
  code: string;
  name: string;
  categoryId: string;
}

async function createAsset(dto: CreateAssetDto): Promise<Asset> {
  // Implementation
}

// ❌ Bad
async function createAsset(data: any) {
  // No types
}
```

### File Organization

```typescript
// 1. Imports - external first, then internal
import { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { db } from '@/core/database';
import { AssetService } from './asset.service';

// 2. Types/Interfaces
interface AssetParams {
  id: string;
}

// 3. Constants
const MAX_PAGE_SIZE = 100;

// 4. Main exports
export async function getAsset(req: FastifyRequest<{ Params: AssetParams }>) {
  // Implementation
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `asset-service.ts` |
| Classes | PascalCase | `AssetService` |
| Functions | camelCase | `createAsset` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `CreateAssetDto` |
| Database tables | snake_case | `asset_categories` |

### Error Handling

```typescript
// ✅ Good - Use custom errors
import { NotFoundError, ValidationError } from '@/errors';

async function getAsset(id: string) {
  const asset = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  
  if (!asset) {
    throw new NotFoundError('Asset not found');
  }
  
  return asset;
}

// ❌ Bad - Generic errors
async function getAsset(id: string) {
  const asset = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  
  if (!asset) {
    throw new Error('Not found'); // Too generic
  }
  
  return asset;
}
```

---

## Testing

### Test Structure

```
tests/
├── unit/           # Unit tests
│   ├── services/
│   └── utils/
├── integration/    # Integration tests
│   └── api/
└── e2e/           # End-to-end tests
    └── playwright/
```

### Writing Tests

```typescript
// Unit test example
import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '@/modules/assets/asset.service';

describe('AssetService', () => {
  describe('create', () => {
    it('should create asset with valid data', async () => {
      const service = new AssetService(mockDb);
      
      const result = await service.create({
        code: 'PC-001',
        name: 'Dell OptiPlex',
        categoryId: 'uuid',
      });
      
      expect(result).toMatchObject({
        code: 'PC-001',
        name: 'Dell OptiPlex',
      });
    });
    
    it('should throw error for duplicate code', async () => {
      const service = new AssetService(mockDb);
      
      await expect(
        service.create({ code: 'EXISTING', name: 'Test' })
      ).rejects.toThrow('Asset code already exists');
    });
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @gateway/api test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

---

## API Development

### Adding New Endpoint

1. **Define schema** (`module.schema.ts`)
```typescript
export const createAssetSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
});
```

2. **Add route** (`module.routes.ts`)
```typescript
export const assetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', {
    schema: {
      body: zodToJsonSchema(createAssetSchema),
    },
    preHandler: [fastify.authenticate, fastify.authorize('assets.create')],
    handler: assetController.create,
  });
};
```

3. **Implement controller** (`module.controller.ts`)
```typescript
export const assetController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as CreateAssetDto;
    const asset = await assetService.create(data);
    return reply.status(201).send({ success: true, data: asset });
  },
};
```

4. **Implement service** (`module.service.ts`)
```typescript
export const assetService = {
  async create(dto: CreateAssetDto) {
    // Business logic
    return await assetRepository.create(dto);
  },
};
```

5. **Add tests**
6. **Update API documentation**

---

## Frontend Development

### Component Structure

```svelte
<!-- Component.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  
  // Props
  export let id: string;
  export let title: string;
  
  // State
  let loading = false;
  let data: Asset | null = null;
  
  // Reactive
  $: displayName = data?.name ?? 'Unknown';
  
  // Lifecycle
  onMount(async () => {
    await fetchData();
  });
  
  // Functions
  async function fetchData() {
    loading = true;
    try {
      data = await api.getAsset(id);
    } finally {
      loading = false;
    }
  }
</script>

<div class="component">
  {#if loading}
    <Spinner />
  {:else if data}
    <h2>{displayName}</h2>
    <!-- Content -->
  {:else}
    <p>{$t('common.notFound')}</p>
  {/if}
</div>

<style>
  .component {
    /* Styles */
  }
</style>
```

### i18n

Add translations to both locales:

```json
// src/lib/i18n/locales/vi.json
{
  "assets": {
    "title": "Quản lý tài sản",
    "create": "Thêm tài sản",
    "fields": {
      "code": "Mã tài sản",
      "name": "Tên tài sản"
    }
  }
}

// src/lib/i18n/locales/en.json
{
  "assets": {
    "title": "Asset Management",
    "create": "Add Asset",
    "fields": {
      "code": "Asset Code",
      "name": "Asset Name"
    }
  }
}
```

---

## Database Changes

### Creating Migration

```bash
# Generate migration
pnpm --filter @gateway/api db:generate

# Run migrations
pnpm --filter @gateway/api db:migrate
```

### Schema Changes

```typescript
// drizzle/schema/assets.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  // New column
  serialNumber: varchar('serial_number', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Documentation

### Code Documentation

```typescript
/**
 * Creates a new asset in the system.
 * 
 * @param dto - The asset creation data
 * @returns The created asset
 * @throws {ValidationError} If validation fails
 * @throws {DuplicateError} If asset code exists
 * 
 * @example
 * const asset = await assetService.create({
 *   code: 'PC-001',
 *   name: 'Dell OptiPlex',
 *   categoryId: 'uuid',
 * });
 */
async function create(dto: CreateAssetDto): Promise<Asset> {
  // Implementation
}
```

### README Updates

Update relevant docs when making changes:
- API changes → `docs/api/`
- New features → `docs/modules/`
- Setup changes → `docs/01-QUICK-START.md`

---

## Review Checklist

Before submitting PR, ensure:

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description is complete
- [ ] No sensitive data in commits

---

## Getting Help

- 📖 Check documentation
- 🔍 Search existing issues
- 💬 Ask in discussions
- 🐛 Open an issue

---

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Collaborate openly

Thank you for contributing! 🎉
