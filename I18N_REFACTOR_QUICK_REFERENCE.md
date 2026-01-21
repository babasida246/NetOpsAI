# i18n Refactoring Quick Reference

## Key Navigation for Each Module

### CMDB Module
**Location**: `apps/web-ui/src/routes/cmdb/`

| Hardcoded | i18n Key | Context |
|-----------|----------|---------|
| "Types" | `cmdb.types` | Tab/page title |
| "New Type" | `cmdb.types.newType` | Button/form title |
| "Schema Version" | `cmdb.types.schemaVersion` | Label |
| "CI Code" | `cmdb.ciCode` | Table header |
| "Save" | `common.save` | Button |
| "Clear" | `common.clear` | Button |
| "All types" | `cmdb.allTypes` | Dropdown option |
| "Active" | `cmdb.active` | Status |
| "Inactive" | `cmdb.inactive` | Status |

**Files to update**:
- ✏️ `src/routes/cmdb/+page.svelte`
- ✏️ `src/routes/cmdb/types/+page.svelte`
- ✏️ `src/routes/cmdb/cis/+page.svelte`
- ✏️ `src/lib/cmdb/CmdbCisPanel.svelte`

---

### Assets Module
**Location**: `apps/web-ui/src/routes/assets/`

| Hardcoded | i18n Key | Context |
|-----------|----------|---------|
| "Status" | `assets.filters.status` | Filter label |
| "Category" | `assets.filters.category` | Filter label |
| "Choose option" | `common.chooseOption` | Filter placeholder |
| "Asset Code" | `assets.assetCode` | Table header |
| "In stock" | `assets.filters.inStock` | Status value |
| "In use" | `assets.filters.inUse` | Status value |
| "Search" | `common.search` | Button |
| "Export CSV" | `common.exportCsv` | Button |

**Files to update**:
- ✏️ `src/routes/assets/+page.svelte`
- ✏️ `src/routes/assets/catalogs/+page.svelte`
- ✏️ `src/lib/assets/components/AssetFilters.svelte` (line 114 "Clear")
- ✏️ `src/lib/assets/components/AssetTable.svelte`

---

### Warehouse Module (HIGH PRIORITY - 6 Tabs)
**Location**: `apps/web-ui/src/routes/warehouse/`

| Hardcoded | i18n Key | Context |
|-----------|----------|---------|
| "Stock" | `warehouse.tabs.stock` | Tab name |
| "Documents" | `warehouse.tabs.documents` | Tab name |
| "Ledger" | `warehouse.tabs.ledger` | Tab name |
| "Spare Parts" | `warehouse.tabs.spareParts` | Tab name |
| "Warehouses" | `warehouse.tabs.warehouses` | Tab name |
| "Reports" | `warehouse.tabs.reports` | Tab name |
| "New Document" | `warehouse.newDocument` | Button |
| "Post" | `warehouse.post` | Button |
| "Draft" | `warehouse.docStatus.draft` | Status |
| "On hand" | `warehouse.onHand` | Table header |

**Files to update**:
- ✏️ `src/routes/(assets)/warehouse/+page.svelte` (tabs definition)
- ✏️ `src/routes/(assets)/warehouse/stock/+page.svelte`
- ✏️ `src/routes/(assets)/warehouse/documents/+page.svelte`
- ✏️ `src/routes/(assets)/warehouse/ledger/+page.svelte`
- ✏️ `src/routes/(assets)/warehouse/spareParts/+page.svelte`
- ✏️ `src/routes/(assets)/warehouse/warehouses/+page.svelte`
- ✏️ `src/routes/(assets)/warehouse/reports/+page.svelte`

---

### Models Module (COMPLEX - 4 Tabs + Table)
**Location**: `apps/web-ui/src/routes/models/`

| Hardcoded | i18n Key | Context |
|-----------|----------|---------|
| "Models" | `models.tabs.models` | Tab name |
| "Providers" | `models.tabs.providers` | Tab name |
| "Orchestration" | `models.tabs.orchestration` | Tab name |
| "OpenRouter" | `models.tabs.openrouter` | Tab name |
| "MODEL" | `models.table.model` | Table header |
| "PROVIDER" | `models.table.provider` | Table header |
| "TIER" | `models.table.tier` | Table header |
| "Fallback" | `models.strategies.fallback` | Strategy |
| "Load Balance" | `models.strategies.loadBalancing` | Strategy |
| "+10" / "-10" | `models.actions.plusTen` / `models.actions.minusTen` | Button |

**Files to update**:
- ✏️ `src/routes/models/+page.svelte` (tabs + model list)
- ✏️ `src/routes/models/providers/+page.svelte`
- ✏️ `src/routes/models/orchestration/+page.svelte`
- ✏️ `src/routes/models/openrouter/+page.svelte`

---

## Refactoring Pattern (Svelte 5 + svelte-i18n)

### Pattern 1: Simple Button/Label
```svelte
<!-- BEFORE -->
<Button>Save</Button>
<label>Asset Code</label>

<!-- AFTER -->
<script>
  import { _ } from '$lib/i18n';
</script>
<Button>{$_('common.save')}</Button>
<label>{$_('assets.assetCode')}</label>
```

### Pattern 2: Conditional with Loading
```svelte
<!-- BEFORE (existing pattern in codebase) -->
<Button>{$isLoading ? 'Saving...' : 'Save'}</Button>

<!-- AFTER -->
<script>
  import { _, isLoading } from '$lib/i18n';
</script>
<Button>{$isLoading ? $_('common.saving') : $_('common.save')}</Button>
```

### Pattern 3: Tab/Option Arrays
```svelte
<!-- BEFORE -->
const tabs = [
  { label: 'Stock', href: '/warehouse/stock' },
  { label: 'Documents', href: '/warehouse/documents' }
];

<!-- AFTER -->
<script>
  import { _ } from '$lib/i18n';
</script>

{#each tabs as tab}
  <Tab>{$_(`warehouse.tabs.${tab.id}`)}</Tab>
{/each}
```

### Pattern 4: Pluralization (if using intl-messageformat)
```svelte
<!-- i18n key: "items": "You have {count, plural, one {1 item} other {# items}}" -->
<script>
  import { _ } from '$lib/i18n';
</script>
{$_('common.items', { values: { count: items.length } })}
```

### Pattern 5: Interpolation (variable substitution)
```svelte
<!-- i18n key: "assignedTo": "Assigned to {{user}}" -->
<script>
  import { _ } from '$lib/i18n';
</script>
{$_('common.assignedTo', { values: { user: assigneeName } })}
```

---

## Search & Replace Strategy (for each file)

### Step 1: Identify all hardcoded strings
Use grep in the file:
```bash
grep -n "Save\|Clear\|Delete\|Edit" src/routes/cmdb/+page.svelte
```

### Step 2: Map to i18n keys (from en.json/vi.json)
```json
"Save" → "common.save"
"Delete" → "common.delete"
"Asset Code" → "assets.assetCode"
```

### Step 3: Add import if missing
```svelte
<script>
  import { _, isLoading } from '$lib/i18n';
</script>
```

### Step 4: Replace string
```svelte
<!-- Find: -->
<Button>Save</Button>

<!-- Replace: -->
<Button>{$_('common.save')}</Button>
```

### Step 5: Test
- [ ] String displays in English
- [ ] Switch locale to Vietnamese → text changes
- [ ] No console errors for missing keys

---

## Testing Each Module After Refactoring

### Visual Test
1. Navigate to page in browser
2. Verify all text displays (no blank fields)
3. Switch locale en ↔ vi in LanguageSwitcher
4. Verify text changes correctly

### Console Test
```javascript
// Open browser DevTools → Console
// Should NOT see messages like:
// "Missing key 'cmdb.types.newType' for locale 'vi'"
```

### Grep Test (find any remaining hardcode)
```bash
# After refactoring CMDB module, no matches should appear
grep -r "New Type\|Schema Version" apps/web-ui/src/routes/cmdb/
grep -r "All types\|CI Code" apps/web-ui/src/lib/cmdb/
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Text shows as blank | Missing i18n key | Check en.json/vi.json for typo in key name |
| Locale switch doesn't change text | Not using `$_()` function | Wrap string with `{$_('key')}` |
| "Missing key" console warning | Key doesn't exist in i18n files | Add key to en.json and vi.json |
| Interpolation not working | Wrong variable syntax | Use `{value}` not `{{value}}` in component, check i18n key for `{{}}` |
| Performance slow after i18n | Too many stores subscribing | Memoize i18n calls with `$derived` |

---

## Commit Message Template

```
fix(i18n): refactor CMDB module to 100% i18n coverage

- Replace 78 hardcoded strings with i18n keys
- Update cmdb.types, cmdb.cis, cmdb.status keys
- Verify en/vi locale switching works
- No console errors for missing keys

Closes issue: i18n refactoring phase 3/6
```

---

## Useful Commands

### Count hardcoded strings in a file
```bash
grep -o "['\"]Save\|Delete\|Edit\|Clear\|Search['\"]" file.svelte | wc -l
```

### Find all files with specific hardcoded string
```bash
grep -r "Choose option" apps/web-ui/src/
```

### Validate i18n JSON syntax
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('en.json', 'utf8')))"
```

### Check for missing keys between en.json and vi.json
```bash
# List keys in en.json
jq 'keys_unsorted' en.json > en-keys.txt
# List keys in vi.json
jq 'keys_unsorted' vi.json > vi-keys.txt
# Compare
diff en-keys.txt vi-keys.txt
```

---

## Files Ready for Refactoring

All translation files are complete and tested:
- ✅ `apps/web-ui/src/lib/i18n/locales/en.json` (30.04 KB)
- ✅ `apps/web-ui/src/lib/i18n/locales/vi.json` (34.1 KB)

**Start with Phase 3**: CMDB module refactoring (smallest scope)

---

**Generated**: 2025  
**Last Updated**: After Phase 2 completion
