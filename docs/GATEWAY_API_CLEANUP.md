# Gateway API - Deprecated Files & Cleanup Guide

**Purpose**: Identify and document files in `gateway-api` that are outdated, unused, or can be consolidated.

**Created**: 2024-12-24  
**Status**: Review & Planning Phase

---

## 📋 Quick Summary

| Category | Count | Priority | Action |
|----------|-------|----------|--------|
| Empty Folders | 1 | HIGH | Remove immediately |
| Consolidate to Shared | 3 | MEDIUM | Extract & move to packages |
| Legacy Config | 2-3 | MEDIUM | Update references |
| Dead Code | 2-3 | LOW | Review & clean |
| Duplicate Logic | 2-3 | LOW | Extract to services |

---

## 🗂️ SECTION 1: EMPTY FOLDERS TO REMOVE

### ❌ `src/routes/v1/admin/` (Completely Empty)

**Location**: `apps/gateway-api/src/routes/v1/admin/`

**Status**: ✅ CONFIRMED EMPTY - No files

**What It Should Have Contained**: 
- Admin route handlers (database, redis, providers, models, users, roles, policies, system)

**What Actually Happened**:
- All admin routes are implemented as **individual route files** in `src/routes/v1/`
- Example: `src/routes/v1/admin/database.ts` instead of `src/routes/v1/admin/database/index.ts`

**Files It's Missing**:
- `database.ts` → Actually at `src/routes/v1/admin/database.ts`
- `redis.ts` → Actually at `src/routes/v1/admin/redis.ts`
- `providers.ts` → Actually at `src/routes/v1/admin/providers.ts`
- `models.ts` → Actually at `src/routes/v1/admin/models.ts`
- `users.ts` → Actually at `src/routes/v1/admin/users.ts`
- `roles.ts` → Actually at `src/routes/v1/admin/roles.ts`
- `policies.ts` → Actually at `src/routes/v1/admin/policies.ts`
- `system.ts` → Actually at `src/routes/v1/admin/system.ts`

**Action**: 
```bash
# Remove empty folder (safe - verified empty)
rmdir apps/gateway-api/src/routes/v1/admin/

# or Windows PowerShell:
Remove-Item -Path "apps/gateway-api/src/routes/v1/admin/" -Force

# Verify files still exist at correct location:
ls apps/gateway-api/src/routes/v1/admin*.ts
```

**Risk Level**: 🟢 LOW (No files affected)

---

## 🧩 SECTION 2: CONSOLIDATE TO SHARED PACKAGES

### ⚠️ Middleware Files (3 files)

**Location**: `apps/gateway-api/src/middleware/`

**Current Files**:
1. `correlation-id.ts` - Adds correlation ID to requests
2. `error-handler.ts` - Global error handling
3. `validation.ts` - Zod schema validation
4. `admin-auth.ts` - Admin authentication
5. `permissions.ts` - RBAC permission checks
6. `rate-limit.ts` - Rate limiting

**Issues**:
- These are generic and could be reused by `gateway-mcp` and `gateway-cli`
- Currently duplicated logic across apps
- No centralized error handling strategy
- Validation logic could be shared

**Recommendation**:
Create new package: `@middleware/core`

**Files to Move**:
```
packages/middleware/
├── src/
│   ├── correlation-id.ts       # Generic correlation ID
│   ├── error-handler.ts        # Error formatting
│   ├── validation.ts           # Zod wrapper
│   ├── rate-limit.ts           # Generic rate limiter
│   ├── auth/
│   │   ├── jwt-auth.ts
│   │   ├── admin-auth.ts
│   │   └── rbac.ts             # RBAC logic
│   └── index.ts                # Exports
├── package.json
├── tsconfig.json
└── README.md
```

**Timeline**: Phase 2 (Medium Priority)  
**Impact**: Reusability +200%, Code DRY improvement

---

### ⚠️ Shared Utils (`src/shared/utils/`)

**Location**: `apps/gateway-api/src/shared/utils/index.ts`

**Current Content**:
```typescript
// Needs inspection - likely contains:
// - formatBytes()
// - formatDuration()
// - encrypt/decrypt helpers
// - Common validators
```

**Issues**:
- Could conflict with `@contracts/shared`
- Encryption/decryption logic duplicated in routes
- Helper functions not properly tested

**Recommendation**:
Move to `packages/contracts/src/utils/`

**Action**:
1. Review `src/shared/utils/index.ts` content
2. Move unique utilities to `@contracts/shared`
3. Remove gateway-api's local copy
4. Update imports

**Timeline**: Phase 2 (Medium Priority)

---

### ⚠️ Infrastructure Services (2 files)

**Location**: `apps/gateway-api/src/infrastructure/services/`

**Current Files**:
1. `password.service.ts` - Password hashing with bcrypt
2. `token.service.ts` - JWT token generation

**Issues**:
- Too thin - just wraps bcrypt and jsonwebtoken
- Could be in domain layer (more appropriate)
- Not complex enough for separate service
- Better as utility functions

**Current Implementation**:
```typescript
// password.service.ts
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

// token.service.ts  
export function generateToken(payload: any) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' })
}
```

**Recommendation**:
Move to `@domain/core/services/` as domain services

**Or**:
Keep in gateway-api but consolidate into single file:
```
src/infrastructure/security/
  ├── password.ts    # Password hashing
  ├── tokens.ts      # JWT handling
  └── index.ts       # Exports
```

**Timeline**: Phase 3 (Low Priority - works as-is)

---

## 🗜️ SECTION 3: LEGACY CONFIGURATION

### ⚠️ `.env.example` - Old Variables

**Location**: `apps/gateway-api/.env.example`

**Legacy Variables to Update**:
```env
❌ OLD_DB_HOST=localhost          → Use DATABASE_URL instead
❌ OLD_DB_PORT=5432              → Use DATABASE_URL instead
❌ OLD_CACHE_TYPE=redis          → Use REDIS_URL instead
❌ OLD_CACHE_HOST=localhost      → Use REDIS_URL instead
❌ API_TIMEOUT_MS=30000          → Use specific timeouts
❌ ENABLE_OLD_ROUTES=false       → Remove, use feature flags
```

**Current `.env` Structure** (What Should Be There):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/netopsai_gateway

# Redis
REDIS_URL=redis://localhost:6379

# API Configuration
API_HOST=0.0.0.0
API_PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10

# Observability
LOG_LEVEL=info
OTEL_ENABLED=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# LLM Providers
OPENROUTER_API_KEY=sk-...
```

**Action**:
1. Review current `.env.example`
2. Remove old variable references
3. Add missing required variables
4. Document all variables with descriptions

**Timeline**: Phase 1 (High Priority)

---

## 💀 SECTION 4: DEAD CODE TO REVIEW

### ⚠️ Commented-Out Code (Multiple Files)

**Locations to Check**:
- `src/routes/v1/chat.ts` - Old stream implementation?
- `src/application/http/routes/index.ts` - Legacy route definitions?
- `src/container.ts` - Old service registrations?

**Action**:
```bash
# Find all commented code
grep -r "^[[:space:]]*\/\/" apps/gateway-api/src/ | wc -l

# Find block comments
grep -r "\/\*.*\*\/" apps/gateway-api/src/ | head -20
```

**Cleanup Steps**:
1. Remove all `// TODO`, `// FIXME` comments
2. Remove commented-out code > 3 months old
3. Keep architectural comments
4. Document remaining TODOs in GitHub issues

**Timeline**: Phase 1 (High Priority)

---

### ⚠️ Unused Type Definitions

**Locations**:
- `src/application/http/dtos/` - Old DTOs?
- `src/core/domain/` - Legacy entities?

**How to Find Them**:
```bash
# Find unused types using TypeScript compiler
tsc --noEmit --listFiles | grep -E "\.d\.ts|types\."
```

**Action**:
1. Run TypeScript unused check
2. Document unused types
3. Remove after 1 release cycle (keep for backwards compatibility)

---

### ⚠️ Duplicate Utility Functions

**Known Duplicates**:
1. `formatBytes()` - Found in:
   - `src/routes/v1/admin/database.ts` (lines 30-34)
   - `src/routes/v1/admin/redis.ts` (lines 17-21)

2. `formatDuration()` - Found in:
   - `src/routes/v1/admin/redis.ts` (lines 25-29)

3. `maskApiKey()` - Found in:
   - `src/routes/v1/admin/providers.ts` (lines 37-45)

**Action**:
```typescript
// Create shared utils file
src/shared/formatting.ts

export function formatBytes(bytes: number): string { ... }
export function formatDuration(seconds: number): string { ... }
export function maskApiKey(key: string): string { ... }
```

**Update Imports**:
```typescript
// Before
function formatBytes(bytes: number) { ... }

// After
import { formatBytes } from '../../shared/formatting.js'
```

**Timeline**: Phase 1 (High Priority - Easy win)

---

## 📊 SECTION 5: CONSOLIDATION ROADMAP

### Phase 1: Quick Cleanup (1-2 hours)

**Priority**: HIGH
**Impact**: Immediate code quality improvement

```
✅ Remove empty src/routes/v1/admin/ folder
✅ Remove duplicate formatBytes/formatDuration functions
✅ Clean up commented code
✅ Update .env.example (remove legacy variables)
```

**Commands**:
```bash
cd apps/gateway-api

# 1. Remove empty folder
rmdir src/routes/v1/admin/

# 2. Create shared formatting utilities
mkdir -p src/shared
cat > src/shared/formatting.ts << 'EOF'
export function formatBytes(bytes: number): string { ... }
export function formatDuration(seconds: number): string { ... }
export function maskApiKey(key: string): string { ... }
EOF

# 3. Run cleanup
grep -r "// TODO\|// FIXME" src/ | wc -l
```

### Phase 2: Package Extraction (4-6 hours)

**Priority**: MEDIUM
**Impact**: Better code reusability

```
✅ Extract middleware to @middleware/core package
✅ Move shared utils to @contracts/shared
✅ Create shared formatting package
```

### Phase 3: Long-term Refactoring (8-12 hours)

**Priority**: LOW
**Impact**: Better maintainability

```
✅ Move services to domain layer
✅ Create integration tests
✅ Document patterns
```

---

## 🧪 TESTING AFTER CLEANUP

### Tests to Run

```bash
# 1. Build check
pnpm --filter gateway-api build

# 2. TypeScript check
pnpm --filter gateway-api tsc --noEmit

# 3. Run tests
pnpm --filter gateway-api test

# 4. Lint check
pnpm lint

# 5. Full integration
docker-compose up -d postgres redis
pnpm --filter gateway-api dev
```

### Validation Checklist

- [ ] No compilation errors
- [ ] All tests pass (100/100)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] API routes still work
- [ ] Admin endpoints accessible
- [ ] No import errors

---

## 📋 SUMMARY TABLE

| File/Folder | Type | Priority | Action | Timeline |
|-------------|------|----------|--------|----------|
| `src/routes/v1/admin/` | Empty folder | HIGH | Remove | Phase 1 |
| Duplicate utils | Dead code | HIGH | Consolidate | Phase 1 |
| `.env.example` | Legacy config | HIGH | Update | Phase 1 |
| Commented code | Dead code | HIGH | Remove | Phase 1 |
| `src/middleware/` | Consolidate | MEDIUM | Move to package | Phase 2 |
| `src/shared/utils/` | Consolidate | MEDIUM | Move to package | Phase 2 |
| Services layer | Refactor | LOW | Reorganize | Phase 3 |

---

## 🎯 Execution Plan

### Week 1: Phase 1 (Quick Cleanup)
- Day 1: Remove empty folders
- Day 2-3: Extract duplicate utilities
- Day 4: Clean up legacy config
- Day 5: Test & validate

### Week 2-3: Phase 2 (Package Extraction)
- Create `@middleware/core` package
- Move middleware files
- Update imports
- Test thoroughly

### Week 4+: Phase 3 (Long-term)
- Services refactoring
- Documentation
- Performance optimization

---

## 🔍 How to Verify Cleanup

```bash
# 1. Check no empty directories
find apps/gateway-api/src -type d -empty

# 2. Check no dead code remains
grep -r "// TODO\|// FIXME\|console.log" apps/gateway-api/src | wc -l

# 3. Check no duplicate functions
grep -r "^export function formatBytes" apps/gateway-api/src | wc -l

# 4. Verify all imports work
pnpm --filter gateway-api build

# 5. Run full test suite
pnpm --filter gateway-api test
```

---

## 📞 Questions & Notes

**Q: Will cleanup break anything?**  
A: No - all changes are internal refactoring only

**Q: Can we do this gradually?**  
A: Yes - Phase approach allows incremental cleanup

**Q: Should we create migration docs?**  
A: Yes - document all import path changes

**Q: How do we prevent re-creating dead code?**  
A: Use ESLint, pre-commit hooks, code review process

---

**Document Version**: v1.0.0  
**Last Updated**: 2024-12-24  
**Status**: Ready for Review & Planning

