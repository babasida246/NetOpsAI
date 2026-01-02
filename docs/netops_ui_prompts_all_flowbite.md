# NetOps Web UI Prompts for GitHub Copilot (Claude Opus 4.5) — Flowbite Svelte Edition

Tài liệu này gom **3 prompt** về UI (NetOps pages + UI/CSS spec + NetOps Chat control-plane) thành một file để bạn copy/paste vào **GitHub Copilot Chat (Claude Opus 4.5)**.

> Yêu cầu cập nhật: **UI/CSS ưu tiên dùng Flowbite for Svelte (flowbite-svelte)**.

## Mục lục
1. [Prompt 1 — NetOps UI pages kết nối API hiện có](#prompt-1--netops-ui-pages-kết-nối-api-hiện-có)
2. [Prompt 2 — UI/CSS chi tiết (Flowbite Svelte + Tailwind-first)](#prompt-2--uicss-chi-tiết-flowbite-svelte--tailwind-first)
3. [Prompt 3 — NetOps Chat-driven Workflow UI (phương án 2)](#prompt-3--netops-chat-driven-workflow-ui-phương-án-2)

---

## Prompt 1 — NetOps UI pages kết nối API hiện có

```text
You are GitHub Copilot Chat running Claude Opus 4.5.
Act as a Staff+ frontend engineer (SvelteKit + TypeScript) with strong API integration skills.
Your task: implement NetOps Web UI pages in the existing apps/web-ui SvelteKit app, connecting ONLY to the already-implemented NetOps API endpoints (as documented in NETOPS.md). Do not invent backend behavior; call what exists.

UI library preference:
- Prefer Flowbite for Svelte (flowbite-svelte) components for buttons, modals, tables, tabs, badges, alerts.
- Use Tailwind utilities for spacing/layout/typography and to glue Flowbite components.

========================
0) HARD CONSTRAINTS
========================
- Do NOT change backend code. UI only.
- Strict TypeScript, no any.
- Use existing web-ui conventions, layout, routing, auth handling, and component style.
- Add minimal new dependencies (prefer none). If flowbite-svelte is not installed, add it only if allowed by repo policy; otherwise fall back to Tailwind-only equivalents.
- Reuse existing fetch wrapper / API client pattern if present (cookies/JWT/session).
- All pages must handle:
  - loading states
  - empty states
  - error states with user-friendly messages
  - basic form validation
- No secrets in UI logs; never display redacted secrets if API returns them.

========================
1) TARGET UI SCOPE (PAGES)
========================
Implement the following SvelteKit routes under /netops:

1) /netops/devices
  - Table of devices with filters (vendor, site, role) and search by name/IP
  - Actions:
    - Create device (modal/form)
    - Import devices from CSV (upload)
    - Open device detail page
  - Calls API:
    - GET /netops/devices
    - POST /netops/devices
    - POST /netops/devices/import

2) /netops/devices/[id]
  - Device header (name, vendor, site, role, mgmt_ip)
  - Tabs:
    - Facts: latest collected facts (if available)
    - Config Versions: list of config snapshots
  - Actions:
    - Collect facts
    - Pull config (create new config version)
    - Run lint (select active rulepack)
  - Calls API:
    - GET /netops/devices/:id  (or if not available, derive from list response)
    - POST /netops/devices/:id/collect-facts
    - POST /netops/devices/:id/pull-config
    - GET /netops/devices/:id/configs
    - GET /netops/rulepacks
    - POST /netops/lint/run

3) /netops/configs/[versionId]
  - Raw config viewer (monospace, collapsible)
  - Buttons:
    - Parse & Normalize
    - Run Lint (select rulepack)
    - Compare Diff (select another version)
  - Panels:
    - Normalized JSON viewer (if available)
    - Lint results panel (if run)
    - Diff panel (raw diff)
  - Calls API:
    - GET /netops/configs/:versionId
    - POST /netops/configs/:versionId/parse-normalize
    - GET /netops/configs/:versionId/diff?to=...
    - GET /netops/rulepacks
    - POST /netops/lint/run

4) /netops/rulepacks
  - List rulepacks, show active flag
  - View rulepack JSON (read-only unless API supports editing)
  - Action: Activate rulepack
  - Calls API:
    - GET /netops/rulepacks
    - POST /netops/rulepacks/:id/activate
    - POST /netops/rulepacks (optional if already supported)

5) /netops/changes
  - Table of change requests, filters by status/risk_tier, search title
  - Action: Create new change request (go to /netops/changes/new)
  - Calls API:
    - GET /netops/changes

6) /netops/changes/new
  - “Intent Wizard” minimal MVP:
    - Fields: title, intent_type (dropdown), params (JSON editor or dynamic fields for common intents)
    - Device scope selector: pick one or more devices (from GET /netops/devices)
  - Submit creates a change and then navigates to /netops/changes/[id]
  - Calls API:
    - GET /netops/devices
    - POST /netops/changes

7) /netops/changes/[id]
  - Change detail with status, risk tier, created_by, timestamps
  - Sections (collapsible):
    - Context (if endpoint exists: GET /netops/changes/:id/context-pack)
    - Plan (button to run /plan; show missing info questions and task graph if API returns them)
    - Generate (button /generate; show change sets per device)
    - Verify (button /verify; show verify plan + lint summary)
    - Submit approval (button /submit-approval; show judge decision & required fixes)
    - Deploy (button /deploy if feature flag indicated; otherwise show disabled)
  - Show per-device ChangeSet tabs:
    - Candidate config viewer
    - Diff viewer (raw diff)
    - Precheck/apply/postcheck steps
    - Rollback plan
  - Calls API:
    - GET /netops/changes/:id
    - POST /netops/changes/:id/plan
    - POST /netops/changes/:id/generate
    - POST /netops/changes/:id/verify
    - POST /netops/changes/:id/submit-approval
    - POST /netops/changes/:id/approve | reject | waive  (if exists)
    - POST /netops/changes/:id/deploy
    - POST /netops/changes/:id/close
  - Optional debug:
    - GET /netops/changes/:id/orchestration-runs (if exists)
    - GET /netops/changes/:id/context-pack (if exists)

========================
2) UI COMPONENTS / UX REQUIREMENTS
========================
- Reuse existing layout and navigation style.
- Add a “NetOps” section in the sidebar/top nav (consistent with existing nav).
- Use a shared API client:
  - netopsApi.ts with typed functions and shared error handling.
- Prefer Flowbite Svelte components:
  - Table, Button, Modal, Tabs, Badge, Alert, Dropdown, Tooltip
- Add reusable wrappers/components:
  - DataTable (if needed to unify table behavior)
  - JsonViewer (simple: <pre> JSON.stringify(obj,null,2) )
  - CodeViewer (raw config/candidate config monospace with copy button)
  - LintFindingsList (severity badges + grouping)
  - StatusBadge, RiskBadge
  - StepList for precheck/apply/postcheck/rollback
  - ConfirmDialog for destructive actions

UX details:
- Paging/limit: if API doesn’t support, do client-side.
- Dates: format local.
- Monospace viewers: allow wrap toggle + copy-to-clipboard.
- Diff: if API returns text diff, render in <pre> with +/- line coloring.
- Always show API error text in a collapsible “Details” panel, but keep the main message user-friendly.

========================
3) TYPES AND API CONTRACTS
========================
- Read NETOPS.md to confirm the exact shapes. Do not guess fields beyond what API returns.
- Create TypeScript types mirroring response payloads:
  - Device, ConfigVersion, Rulepack, LintFinding, LintRun, ChangeRequest, ChangeSet, Approval, OrchestrationRun/Node (optional).
- Implement runtime validation only if repo already does it; otherwise rely on types and handle missing fields defensively.

========================
4) FILE/ROUTE STRUCTURE (SUGGESTED)
========================
apps/web-ui/src/routes/netops/+layout.svelte   (NetOps layout wrapper)
apps/web-ui/src/routes/netops/devices/+page.svelte
apps/web-ui/src/routes/netops/devices/[id]/+page.svelte
apps/web-ui/src/routes/netops/configs/[versionId]/+page.svelte
apps/web-ui/src/routes/netops/rulepacks/+page.svelte
apps/web-ui/src/routes/netops/changes/+page.svelte
apps/web-ui/src/routes/netops/changes/new/+page.svelte
apps/web-ui/src/routes/netops/changes/[id]/+page.svelte

Shared:
apps/web-ui/src/lib/netops/api/netopsApi.ts
apps/web-ui/src/lib/netops/types.ts
apps/web-ui/src/lib/netops/components/*.svelte

If the repo uses a different structure, adapt.

========================
5) AUTH / API BASE URL
========================
- Reuse existing authenticated fetch utilities used by the web-ui (cookies/JWT/session).
- Do not hardcode base URLs; use existing env config pattern.
- Ensure requests include credentials if needed.

========================
6) ACCEPTANCE CRITERIA
========================
- I can navigate to NetOps pages, list devices/configs/changes/rulepacks.
- I can create a device, import devices, pull config, parse/normalize, run lint.
- I can create a change request and run plan/generate/verify/submit-approval from the UI (showing returned artifacts).
- All pages have proper loading/error/empty states.
- Code compiles with strict TS and matches existing style.

========================
7) EXECUTION PLAN
========================
Before coding:
1) Inspect existing web-ui layout/navigation and API fetch patterns.
2) Confirm Tailwind + Flowbite config pattern in repo (or add if missing).
3) Implement netopsApi.ts + types.ts first.
4) Build pages one-by-one, then add nav entry.
```

---

## Prompt 2 — UI/CSS chi tiết (Flowbite Svelte + Tailwind-first)

```text
You are GitHub Copilot Chat running Claude Opus 4.5.
Act as a Staff+ frontend engineer (SvelteKit + TypeScript) with strong product UI/UX skills.
Your task: implement NetOps Web UI pages in apps/web-ui (SvelteKit) that connect to the existing NetOps API endpoints (as documented in NETOPS.md). UI only — do NOT change backend behavior.

CSS/UI library:
- Prefer Flowbite for Svelte (flowbite-svelte) components for UI primitives.
- Use Tailwind utilities for layout/spacing/typography and small customizations.
- Do NOT add another UI kit.

========================
0) SETUP FLOWBITE-SVELTE (ONLY IF NOT PRESENT)
========================
First, inspect package.json and tailwind config. If flowbite-svelte already exists, do not change setup.
If it does not exist and adding deps is allowed, add:

- pnpm add -D flowbite flowbite-svelte
(or npm/yarn equivalent)

Tailwind config updates (adapt to repo structure):
- Ensure Tailwind content includes Flowbite Svelte:
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite/**/*.{html,js}"
  ]

- Ensure plugin:
  plugins: [require("flowbite/plugin")]

If repo uses Tailwind v4 directives, follow repo conventions and ensure Flowbite utilities are available.
If dark mode exists, keep it.

========================
1) GLOBAL UI STYLE GUIDE
========================
Keep UI minimal, clean, and consistent.

Layout defaults (Tailwind):
- Page container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6
- Header: flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between
- Cards: rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm
- Card padding: p-4 sm:p-6

Prefer Flowbite components (examples):
- Buttons: <Button color="dark|light|alternative|failure|success|warning|purple" size="sm|md" .../>
- Modal: <Modal bind:open ...> (or <Modal/> API in repo version)
- Tabs: <Tabs> / <TabItem>
- Table: <Table> / <TableHead> / <TableBody> / <TableRow> / <TableCell>
- Badge: <Badge color="gray|red|yellow|green|blue|indigo|purple|pink">
- Alert: <Alert color="info|failure|warning|success">
- Dropdown: <Dropdown> / <DropdownItem>
- Tooltip: <Tooltip>

When Flowbite component is missing for a specific need, build a small wrapper with Tailwind.

========================
2) PAGE-BY-PAGE UI SPEC (USE FLOWBITE COMPONENTS)
========================

2.1 /netops/devices
- Header: Title + subtitle (counts)
- Actions: Flowbite Buttons (Add device, Import CSV, Refresh)
- Filters row (card): Flowbite TextInput/Select (or plain <input class=...> if flowbite input not used)
- Device table: Flowbite Table
- Row actions: small Buttons (Pull config, Collect facts)
- Modals: Flowbite Modal (Add device, Import CSV)

2.2 /netops/devices/[id]
- Header card: device name + vendor/role badges + mgmt ip
- Actions: Buttons (Pull config primary, Collect facts, Run lint)
- Tabs: Flowbite Tabs (Facts/Configs)
- Facts: key/value grid (Tailwind grid)
- Configs: Flowbite Table for versions; actions link to /netops/configs/[versionId]
- Lint modal: rulepack select + run

2.3 /netops/configs/[versionId]
- Breadcrumb + Actions (Buttons)
- Two-column layout:
  - Left: CodeViewer card (Tailwind + optional Flowbite Card)
  - Right: JSON viewer + Lint findings (Flowbite Alert + Badge)
- Diff panel: <pre> with Tailwind line highlighting

2.4 /netops/rulepacks
- List rulepacks in Flowbite Table or Card grid
- Active badge
- View JSON modal
- Activate button (confirm modal)

2.5 /netops/changes
- Filters + search inputs
- Flowbite Table
- Status/Risk badges
- “New Change” button

2.6 /netops/changes/new
- Stepper: implement with Flowbite Tabs (as steps) OR custom stepper using Tailwind
- Structured params for known intents; otherwise JSON textarea
- Review step card + submit

2.7 /netops/changes/[id]
- Header card: status badge + risk badge + timestamps
- Action bar: Plan/Generate/Verify/Submit approval/Deploy/Close
- Accordion sections: implement with Flowbite Accordion OR custom disclosure panels:
  - Context
  - Plan output
  - Change sets (Tabs by device)
  - Verify output
  - Approval
  - Orchestration runs (optional)
- Tool outputs: use Alert + CodeViewer/JsonViewer.

========================
3) COMPONENTS TO CREATE (FLOWBITE-WRAPPED)
========================
Create wrappers under src/lib/netops/components:
- PageHeader.svelte
- Card.svelte (optional wrapper)
- StatusBadge.svelte / RiskBadge.svelte (wrap Flowbite Badge)
- ConfirmModal.svelte (wrap Flowbite Modal)
- CodeViewer.svelte (Tailwind + copy button; optionally embed Flowbite Button)
- JsonViewer.svelte
- LintFindingsList.svelte (group findings; badges)
- EmptyState.svelte
- ToolCard.svelte (for chat tool results, if used)

========================
4) DATA FETCHING & STATES
========================
- Use SvelteKit load functions; follow existing auth fetch wrappers.
- All views must have:
  - Skeleton/Spinner (Flowbite Spinner if available)
  - Empty state (EmptyState component)
  - Error state (Flowbite Alert)

========================
5) ACCEPTANCE CRITERIA
========================
- UI uses Flowbite Svelte components for most primitives.
- Tailwind used for layout and small tweaks.
- No backend changes.
- Strict TS, good loading/empty/error states.
```

---

## Prompt 3 — NetOps Chat-driven Workflow UI (phương án 2)

```text
You are GitHub Copilot Chat running Claude Opus 4.5.
Act as a Staff+ engineer implementing a “Chat-driven NetOps workflow” (Option 2) in the existing repo.
Goal: Use the EXISTING API chat feature (chat completions + streaming + tool/function calling) to CONTROL NetOps workflows:
- create change requests
- run plan/generate/verify/submit-approval/deploy
- fetch devices/configs/rulepacks/findings
and render tool results in a dedicated NetOps Chat UI.

UI requirement update:
- Use Flowbite Svelte components for chat UI primitives:
  - Buttons, Badges, Alerts, Cards, Modals, Tabs, Dropdowns, Spinner.
- Tailwind for layout/spacing/typography.

========================================================
0) HARD CONSTRAINTS
========================================================
- Do not break existing chat functionality and existing tests.
- Strict TypeScript; no any; validate inputs.
- All netops actions triggered from chat MUST be audited (payload redacted).
- Never expose secrets in chat. Never show raw configs by default; show digests + link to config viewer.
- Tool results must be structured JSON; UI renders them safely.
- Enforce RBAC and deploy feature flag.

========================================================
1) USER EXPERIENCE (WHAT TO BUILD)
========================================================
Add a new page: /netops/chat
- Left: conversations list (reuse existing sidebar if exists)
- Main: chat timeline with streaming assistant messages
- Input: prompt box + send button
- Optional slash commands
- Tool calls render as “Tool Card” using Flowbite Card/Alert/Badge:
  - Running/Success/Error
  - Summary
  - Details JSON collapsible
  - Links to /netops/devices/... /netops/configs/... /netops/changes/...

========================================================
2) REQUIRED BACKEND (TOOLS) — MINIMAL AND SAFE
========================================================
Leverage existing tool/function calling system. Register NetOps tools.
Tool output must be safe, structured, no secrets; raw configs not shown by default.

========================================================
3) SYSTEM PROMPT
========================================================
Add NetOps system prompt template for chat domain.
Prefer tool calls, plan->generate->verify pipeline, ask missing params.

========================================================
4) UI IMPLEMENTATION DETAILS
========================================================
- Reuse existing chat streaming implementation.
- ToolCard.svelte:
  - Flowbite Badge for state
  - Flowbite Accordion or Disclosure for “details”
  - Flowbite Button for links

========================================================
5) TESTING & OUTPUT
========================================================
- Ensure tool cards render and streaming works.
- Provide manual test script prompts.
```
