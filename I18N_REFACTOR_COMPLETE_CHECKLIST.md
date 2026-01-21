# i18n Refactor - Project Checklist

**Project**: NetOpsAI Gateway - 100% i18n Coverage  
**Objective**: Zero hardcoded English strings in UI  
**Target Locales**: English (en) + Vietnamese (vi)  

---

## Phase Overview

- ✅ **Phase 1**: Audit & Design (COMPLETE)
- ✅ **Phase 2**: Translation Files (COMPLETE) 
- ⏳ **Phase 3**: CMDB Refactoring (READY)
- ⏳ **Phase 4**: Assets Refactoring (READY)
- ⏳ **Phase 5**: Warehouse Refactoring (READY)
- ⏳ **Phase 6**: Models Refactoring (READY)
- ⏳ **Phase 7**: Lint/Script (NOT STARTED)
- ⏳ **Phase 8**: Tests (NOT STARTED)
- ⏳ **Phase 9**: Final Commit (NOT STARTED)

---

## Phase 1: Audit & Design ✅

- [x] Audit existing i18n setup (svelte-i18n 4.0.1)
- [x] Identify all hardcoded English strings (407 total)
- [x] Categorize by module (CMDB, Assets, Warehouse, Models, Common)
- [x] Design key naming convention (domain.module.element)
- [x] Plan refactoring sequence (CMDB → Assets → Warehouse → Models)
- [x] Create reference documentation

**Deliverables**:
- ✅ Hardcode audit complete (407 strings mapped)
- ✅ Key structure designed and documented
- ✅ Refactoring plan documented

---

## Phase 2: Translation Files ✅

### 2.1 Create Master English Dictionary

- [x] Extract all 407+ hardcoded strings
- [x] Organize into hierarchy (domain.module.element)
- [x] Add translations for:
  - [x] nav.* (navigation links)
  - [x] common.* (shared UI elements)
  - [x] auth.* (login/register)
  - [x] cmdb.* (CMDB module - 78 strings)
  - [x] assets.* (Assets module - 60 strings)
  - [x] warehouse.* (Warehouse module - 107 strings)
  - [x] models.* (Models module - 122 strings)
  - [x] requests, chat, stats, tools, admin, netops, reports, maintenance, inventory
  - [x] table.*, form.*, pagination.*

**Deliverables**:
- ✅ en.json (843 lines, 30.04 KB, 774 keys)
- ✅ JSON validation passed

### 2.2 Create Vietnamese Translations

- [x] Translate all 774 keys to Vietnamese
- [x] Ensure consistent terminology:
  - [x] Technical terms (CI → CI, CMDB → CMDB, schema → schema)
  - [x] Verb tenses (Saving → Đang lưu...)
  - [x] Proper nouns (NetOpsAI → NetOpsAI)
- [x] Verify grammar and tone

**Deliverables**:
- ✅ vi.json (843 lines, 34.1 KB, 774 keys)
- ✅ JSON validation passed
- ✅ Key structure matches en.json

### 2.3 Documentation

- [x] Create [I18N_REFACTOR_PHASE2_COMPLETION.md](I18N_REFACTOR_PHASE2_COMPLETION.md)
- [x] Create [I18N_REFACTOR_QUICK_REFERENCE.md](I18N_REFACTOR_QUICK_REFERENCE.md)
- [x] Create [PHASE2_COMPLETION_SUMMARY.md](PHASE2_COMPLETION_SUMMARY.md)

**Deliverables**:
- ✅ Phase 2 completion report
- ✅ Quick reference guide for developers
- ✅ Component refactoring patterns documented

---

## Phase 3: CMDB Module Refactoring ⏳

### 3.1 Inventory CMDB Hardcoded Strings

- [ ] List all "Types", "New Type", "Schema Version" instances
- [ ] List all form labels ("Add / Edit Attribute", "Key", "Label", etc.)
- [ ] List all status values ("Active", "Inactive", "Planned", "Maintenance")
- [ ] List all environment labels ("Prod", "UAT", "Dev")
- [ ] Map each to i18n key from en.json

**Files to audit**:
```
src/routes/cmdb/+page.svelte
src/routes/cmdb/types/+page.svelte
src/routes/cmdb/cis/+page.svelte
src/lib/cmdb/CmdbCisPanel.svelte
```

### 3.2 Refactor Components

- [ ] Add i18n import to each file: `import { _, isLoading } from '$lib/i18n'`
- [ ] Replace hardcoded strings with `$_('key')` pattern
- [ ] Update button labels, table headers, form placeholders
- [ ] Update tab names and filter options
- [ ] Update status/environment values

**Pattern**:
```svelte
<!-- BEFORE -->
<Button>Save</Button>

<!-- AFTER -->
<Button>{$_('common.save')}</Button>
```

### 3.3 Testing

- [ ] Run in browser with en locale
- [ ] Verify all text displays correctly
- [ ] Switch to vi locale using LanguageSwitcher
- [ ] Verify text changes to Vietnamese
- [ ] Check browser console for missing key warnings
- [ ] grep for remaining hardcoded CMDB strings (should find 0)

**Testing commands**:
```bash
grep -r "Types\|New Type\|Schema Version\|All types" src/routes/cmdb/ src/lib/cmdb/
```

### 3.4 Commit

- [ ] Stage changes: `git add src/routes/cmdb/ src/lib/cmdb/`
- [ ] Commit: `git commit -m "fix(i18n): refactor CMDB module to 100% i18n coverage"`
- [ ] Push to branch

**Deliverables**:
- ✅ 78 hardcoded strings replaced
- ✅ Both locales verified working
- ✅ Zero missing key warnings in console
- ✅ Clean commit

---

## Phase 4: Assets Module Refactoring ⏳

### 4.1 Inventory Assets Hardcoded Strings

- [ ] List all filter labels (Status, Category, Vendor, Model, Location)
- [ ] List all table headers (Asset Code, Model, Vendor, Location, Mgmt IP)
- [ ] List all status values (In stock, In use, In repair, Retired, Disposed)
- [ ] List all action buttons (Add Asset, Export CSV, Import)
- [ ] Map each to i18n key

**Files to audit**:
```
src/routes/assets/+page.svelte
src/routes/assets/catalogs/+page.svelte
src/lib/assets/components/AssetFilters.svelte    (line 114: "Clear")
src/lib/assets/components/AssetTable.svelte
```

### 4.2 Refactor Components

- [ ] Add i18n imports
- [ ] Replace all filter labels with `$_()` calls
- [ ] Replace table headers with `$_()` calls
- [ ] Replace status values with `$_()` calls
- [ ] Replace button labels

### 4.3 Testing

- [ ] Browser test with en + vi locales
- [ ] grep for remaining hardcoded assets strings (should find 0)
- [ ] No console warnings

### 4.4 Commit

- [ ] Commit: `git commit -m "fix(i18n): refactor Assets module to 100% i18n coverage"`

**Deliverables**:
- ✅ 60 hardcoded strings replaced
- ✅ Locales verified
- ✅ Clean commit

---

## Phase 5: Warehouse Module Refactoring ⏳

### 5.1 Inventory Warehouse Hardcoded Strings

- [ ] List all tab names (Stock, Documents, Ledger, Spare Parts, Warehouses, Reports) ⚠️ CRITICAL
- [ ] List all table columns (Warehouse, Part, On hand, Reserved, Available, Min level, Qty, Unit cost)
- [ ] List all document types (Receipt, Issue, Adjust, Transfer)
- [ ] List all document status values (Draft, Posted, Canceled)
- [ ] List all buttons and labels
- [ ] Map to i18n keys

**Files to audit**:
```
src/routes/(assets)/warehouse/+page.svelte      (6 tabs!)
src/routes/(assets)/warehouse/stock/+page.svelte
src/routes/(assets)/warehouse/documents/+page.svelte
src/routes/(assets)/warehouse/ledger/+page.svelte
src/routes/(assets)/warehouse/spareParts/+page.svelte
src/routes/(assets)/warehouse/warehouses/+page.svelte
src/routes/(assets)/warehouse/reports/+page.svelte
```

### 5.2 Refactor Components

- [ ] Update main warehouse page with tab labels from i18n (warehouse.tabs.*)
- [ ] Update each tab page with table headers and status labels
- [ ] Replace all hardcoded strings with `$_()` calls

**Tab refactoring pattern**:
```svelte
<!-- BEFORE -->
const tabs = [
  { label: 'Stock', href: '/warehouse/stock' },
  { label: 'Documents', href: '/warehouse/documents' }
];

<!-- AFTER -->
{#each tabs as tab}
  <Tab>{$_(`warehouse.tabs.${tab.id}`)}</Tab>
{/each}
```

### 5.3 Testing

- [ ] Browser test: all 6 tabs display with correct text
- [ ] Switch locales: all text changes to Vietnamese
- [ ] grep for remaining hardcoded warehouse strings (should find 0)

### 5.4 Commit

- [ ] Commit: `git commit -m "fix(i18n): refactor Warehouse module to 100% i18n coverage"`

**Deliverables**:
- ✅ 107 hardcoded strings replaced
- ✅ 6 warehouse tabs now i18n-powered
- ✅ Locales verified
- ✅ Clean commit

---

## Phase 6: Models Module Refactoring ⏳

### 6.1 Inventory Models Hardcoded Strings

- [ ] List all tab names (Models, Providers, Orchestration, OpenRouter) ⚠️ CRITICAL
- [ ] List all table headers (MODEL, PROVIDER, TIER, PRIORITY, STATUS, CONTEXT, COST $/1K, CAPABILITIES)
- [ ] List all button labels (+10, -10, Edit, Delete, New model, New provider, New rule)
- [ ] List all strategy labels (Fallback, Load Balance, Cost Optimize, Quality First, Custom)
- [ ] List all form field labels (Display name, Tier, Context window, Max tokens, Cost /1k input/output)
- [ ] List all capability labels (Streaming, Functions, Vision)
- [ ] Map to i18n keys

**Files to audit**:
```
src/routes/models/+page.svelte              (4 tabs + model list)
src/routes/models/providers/+page.svelte
src/routes/models/orchestration/+page.svelte
src/routes/models/openrouter/+page.svelte
```

### 6.2 Refactor Components

- [ ] Update tab labels (models.tabs.*)
- [ ] Update table headers with `$_()` pattern
- [ ] Update strategy labels
- [ ] Update button labels
- [ ] Update form field labels
- [ ] Update capability badges

### 6.3 Testing

- [ ] Browser test: all 4 tabs display correctly
- [ ] Table headers use i18n keys
- [ ] Buttons and form labels use i18n keys
- [ ] Switch locales: verify Vietnamese translations
- [ ] grep for remaining hardcoded models strings (should find 0)

### 6.4 Commit

- [ ] Commit: `git commit -m "fix(i18n): refactor Models module to 100% i18n coverage"`

**Deliverables**:
- ✅ 122 hardcoded strings replaced
- ✅ 4 models tabs now i18n-powered
- ✅ Complex form now i18n-powered
- ✅ Locales verified
- ✅ Clean commit

---

## Phase 7: Lint/Script Detection ⏳

### 7.1 Create ESLint Rule or Script

**Option A**: ESLint Custom Rule
- [ ] Create `.eslintrc.json` rule for hardcoded English detection
- [ ] Configure allowlist for:
  - [ ] Test files (*.test.svelte, *.test.ts)
  - [ ] Technical IDs (UUID, API paths)
  - [ ] Comments and documentation
  - [ ] Constants and enums with specific data

**Option B**: Simple Node Script
```javascript
// scripts/check-hardcoded-strings.js
const fs = require('fs');
const glob = require('glob');

// Scan *.svelte files for common English patterns
// Report any hardcoded strings found (not in i18n keys)
```

### 7.2 Add to CI/CD

- [ ] Integrate lint check into GitHub Actions / pipeline
- [ ] Fail build if hardcoded strings detected
- [ ] Run on every PR

### 7.3 Documentation

- [ ] Document the lint rule
- [ ] Provide allowlist configuration
- [ ] Explain how to suppress warnings (in tests/constants)

**Deliverables**:
- ✅ Lint rule/script created
- ✅ CI/CD integration documented
- ✅ Can detect new hardcoded strings automatically

---

## Phase 8: Tests ⏳

### 8.1 Unit Tests (i18n core)

**Test file**: `apps/web-ui/src/lib/i18n/index.test.ts`

- [ ] Test locale initialization
  - [ ] Default locale is 'en'
  - [ ] Fallback locale is 'en'
  - [ ] Can switch to 'vi'
  
- [ ] Test key translation
  - [ ] `$_('nav.dashboard')` returns "Dashboard" in en
  - [ ] `$_('nav.dashboard')` returns "Trang chủ" in vi
  
- [ ] Test interpolation
  - [ ] `$_('common.loading')` with count works
  - [ ] `$_('common.assignedTo', { values: { user: 'Alice' } })` returns "Assigned to Alice"
  
- [ ] Test fallback behavior
  - [ ] Missing key in vi falls back to en
  - [ ] Console warning logged for missing key

### 8.2 Component Tests

**Test file**: `apps/web-ui/src/lib/components/LanguageSwitcher.test.svelte`

- [ ] Locale switch en → vi changes UI text
- [ ] localStorage persists locale selection
- [ ] Page reload restores saved locale

### 8.3 E2E Tests

**Critical pages**:
- [ ] `/cmdb/types` - CMDB Types page
- [ ] `/assets/catalogs` - Asset Catalogs page
- [ ] `/warehouse/stock` - Warehouse Stock tab
- [ ] `/models` - Models page

**Test scenarios**:
- [ ] Page loads with English text
- [ ] Click LanguageSwitcher → Vietnamese
- [ ] All text on page changes to Vietnamese
- [ ] No console errors
- [ ] Locale persists on page reload

### 8.4 Snapshot Tests

- [ ] Create en locale snapshot for critical pages
- [ ] Verify on every CI run (prevents string drift)

**Deliverables**:
- ✅ Unit tests for i18n core
- ✅ Component tests for LanguageSwitcher
- ✅ E2E tests for 4 main modules
- ✅ Snapshot tests for locale stability
- ✅ 100% test pass rate

---

## Phase 9: Final Commit & Validation ⏳

### 9.1 Pre-Commit Validation

- [ ] Run lint check (should find 0 hardcoded strings)
- [ ] Run all i18n tests (should pass 100%)
- [ ] Browser smoke test on all 4 main modules
- [ ] Verify console is clean (0 warnings)

### 9.2 Cleanup

- [ ] Remove any temporary files
- [ ] Update README with i18n usage documentation
- [ ] Update CONTRIBUTING guide (mention i18n requirement)

### 9.3 Commit

**Option 1: Single large commit**
```bash
git commit -m "refactor(i18n): 100% i18n coverage for all UI modules

- Replaced 407 hardcoded English strings with i18n keys
- Added 774 i18n keys to en.json + vi.json
- Refactored CMDB, Assets, Warehouse, Models modules
- Added lint detection for new hardcoded strings
- Added unit + E2E tests for i18n functionality
- Both en and vi locales verified working

Closes #i18n-refactor"
```

**Option 2: Multi-commit (grouped by phase)**
```bash
git commit -m "feat(i18n): enhance translation files with 407+ keys"
git commit -m "refactor(i18n): migrate CMDB module to 100% i18n"
git commit -m "refactor(i18n): migrate Assets + Warehouse + Models to i18n"
git commit -m "feat(i18n): add lint detection + tests for hardcoded strings"
```

### 9.4 Documentation

- [ ] Update [README.md](/docs/README.md) with i18n section
- [ ] Add link to [I18N_REFACTOR_QUICK_REFERENCE.md](I18N_REFACTOR_QUICK_REFERENCE.md)
- [ ] Document how to add new UI strings:
  1. Add key to en.json
  2. Add translation to vi.json
  3. Use `$_('key')` in component
  4. Verify in both locales

### 9.5 Push to GitHub

- [ ] Push main branch
- [ ] Create PR if needed
- [ ] Request review
- [ ] Merge after approval

**Deliverables**:
- ✅ Clean commit history
- ✅ Updated documentation
- ✅ All tests passing
- ✅ Zero lint errors
- ✅ Pushed to GitHub

---

## Final Verification Checklist

Before marking complete:

- [ ] **Zero Hardcode**: grep finds 0 hardcoded English strings (except comments/tests)
- [ ] **Locale Coverage**: Both en.json and vi.json have 774+ matching keys
- [ ] **File Size**: en.json ~30KB, vi.json ~34KB
- [ ] **Browser Test**: All modules render correctly in both locales
- [ ] **Console Clean**: No "Missing key" warnings
- [ ] **Locale Switch**: LanguageSwitcher works smoothly
- [ ] **Tests Pass**: 100% unit + E2E tests passing
- [ ] **Lint Pass**: No hardcoded string warnings
- [ ] **Documentation**: All guides updated
- [ ] **GitHub**: Changes pushed and committed

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Hardcoded Strings | 0 | 407 | ⏳ In Progress |
| i18n Keys | 774 | 774 | ✅ Complete |
| Modules Refactored | 4/4 | 0/4 | ⏳ Ready |
| Test Coverage | 100% | 0% | ⏳ Pending |
| Lint Integration | Yes | No | ⏳ Pending |
| GitHub Commit | 1 clean | 0 | ⏳ Pending |

---

## Notes & References

### Useful Commands

```bash
# Find hardcoded strings
grep -r "['\"]Save\|Delete\|Edit\|Clear\|Search['\"]" src/

# Count keys in i18n file
jq 'keys_unsorted | length' apps/web-ui/src/lib/i18n/locales/en.json

# Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('en.json', 'utf8')); 'Valid')"

# Run tests
npm run test

# Run lint
npm run lint
```

### Documentation Links

- [Phase 2 Completion](I18N_REFACTOR_PHASE2_COMPLETION.md)
- [Quick Reference](I18N_REFACTOR_QUICK_REFERENCE.md)
- [svelte-i18n Docs](https://github.com/kaisermann/svelte-i18n)

---

**Project Owner**: NetOpsAI Development Team  
**Start Date**: Session 4  
**Target Completion**: End of Session (after Phase 9)  
**Status**: On Track ✅
