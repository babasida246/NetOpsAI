# NetOps Web UI Prompts for GitHub Copilot (Claude Opus 4.5)

Tài liệu này gom **3 prompt** về UI (NetOps pages + Tailwind UI spec + NetOps Chat control-plane) thành một file để bạn copy/paste vào **GitHub Copilot Chat (Claude Opus 4.5)**.

## Mục lục
1. [Prompt 1 — NetOps UI pages kết nối API hiện có](#prompt-1--netops-ui-pages-kết-nối-api-hiện-có)
2. [Prompt 2 — Bổ sung mô tả UI/CSS chi tiết (Tailwind-first)](#prompt-2--bổ-sung-mô-tả-uicss-chi-tiết-tailwind-first)
3. [Prompt 3 — NetOps Chat-driven Workflow UI (phương án 2)](#prompt-3--netops-chat-driven-workflow-ui-phương-án-2)

---

## Prompt 1 — NetOps UI pages kết nối API hiện có

```text
You are GitHub Copilot Chat running Claude Opus 4.5.
Act as a Staff+ frontend engineer (SvelteKit + TypeScript) with strong API integration skills.
Your task: implement NetOps Web UI pages in the existing apps/web-ui SvelteKit app, connecting ONLY to the already-implemented NetOps API endpoints (as documented in NETOPS.md). Do not invent backend behavior; call what exists.

========================
0) HARD CONSTRAINTS
========================
- Do NOT change backend code. UI only.
- Strict TypeScript, no any.
- Use existing web-ui conventions, layout, routing, auth handling, and component style (Material Tailwind / existing components).
- Add minimal new dependencies (prefer none).
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
- Add reusable components:
  - DataTable (or reuse existing)
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
- Diff: if API returns text diff, render in <pre> with +/- line coloring (simple CSS ok).
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
2) Propose exact file paths to add/modify.
3) Implement netopsApi.ts + types.ts first.
4) Build pages one-by-one:
   - /devices
   - /devices/[id]
   - /configs/[versionId]
   - /rulepacks
   - /changes
   - /changes/new
   - /changes/[id]
5) Add “NetOps” entry into existing nav component.
6) Provide a PR-style summary (files changed, screenshots description, how to run).

Start now by scanning web-ui for existing fetch/auth patterns and nav components, then implement netopsApi.ts and types.ts.
```

---

## Prompt 2 — Bổ sung mô tả UI/CSS chi tiết (Tailwind-first)

```text
You are GitHub Copilot Chat running Claude Opus 4.5.
Act as a Staff+ frontend engineer (SvelteKit + TypeScript) with strong product UI/UX skills.
Your task: implement NetOps Web UI pages in apps/web-ui (SvelteKit) that connect to the existing NetOps API endpoints (as documented in NETOPS.md). UI only — do NOT change backend behavior.

IMPORTANT: Provide a polished, consistent UI using Tailwind CSS utilities (preferred). If the repo already uses Material Tailwind components, you may wrap them, but default to Tailwind-first styling so the UI is fast to build and consistent.

========================
0) HARD CONSTRAINTS
========================
- Do NOT modify backend code. UI only.
- Strict TypeScript, no any.
- Reuse existing web-ui conventions, layout, auth/fetch wrappers, and component style.
- Prefer Tailwind classes. Minimal/no new dependencies.
- All pages must include: loading, empty, error states.
- Form validation: required fields, basic patterns for IP, VLAN id, etc.
- Never display secrets; if API returns redacted values, keep them redacted.

========================
1) GLOBAL UI STYLE GUIDE (TAILWIND-FIRST)
========================
Use these styling conventions everywhere:

1.1 Layout
- Page container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6
- Page header: flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between
- Section cards: bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-sm
- Card padding: p-4 sm:p-6
- Divider: border-t border-slate-200 dark:border-slate-800

1.2 Typography
- Title: text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100
- Subtitle: text-sm text-slate-600 dark:text-slate-400
- Section title: text-base font-semibold text-slate-900 dark:text-slate-100
- Body: text-sm leading-6 text-slate-700 dark:text-slate-300
- Monospace viewers: font-mono text-xs

1.3 Buttons
Primary: inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50
Secondary: inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50
Danger: inline-flex items-center gap-2 rounded-xl bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-500
Ghost: inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800/60

1.4 Inputs
- Input: w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400
- Textarea: same + min-h-[96px]
- Select: same
- Help text: text-xs text-slate-500
- Error text: text-xs text-rose-600

1.5 Badges (Status/Severity/Risk)
- Base: inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border
Status:
  - draft: bg-slate-50 border-slate-200 text-slate-700
  - planned: bg-blue-50 border-blue-200 text-blue-700
  - candidate_ready: bg-amber-50 border-amber-200 text-amber-800
  - verified: bg-indigo-50 border-indigo-200 text-indigo-700
  - waiting_approval: bg-violet-50 border-violet-200 text-violet-700
  - deployed: bg-emerald-50 border-emerald-200 text-emerald-700
  - needs_fix/rejected: bg-rose-50 border-rose-200 text-rose-700
Severity:
  - critical: bg-rose-50 border-rose-200 text-rose-700
  - high: bg-orange-50 border-orange-200 text-orange-700
  - med: bg-amber-50 border-amber-200 text-amber-800
  - low: bg-slate-50 border-slate-200 text-slate-700
Risk tier:
  - low: bg-emerald-50 border-emerald-200 text-emerald-700
  - med: bg-amber-50 border-amber-200 text-amber-800
  - high: bg-rose-50 border-rose-200 text-rose-700

1.6 Tables
- Wrapper: overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800
- Table: min-w-full text-sm
- Th: text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-900/40 border-b
- Td: border-b border-slate-100 dark:border-slate-800 px-4 py-3 text-slate-700 dark:text-slate-300
- Row hover: hover:bg-slate-50 dark:hover:bg-slate-800/30

1.7 Tabs
- Tabs container: inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-1
- Tab button: px-3 py-1.5 text-sm rounded-lg
- Active: bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-slate-100
- Inactive: text-slate-600 dark:text-slate-400 hover:text-slate-900

1.8 Code / JSON viewers
- Panel: rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100
- Header: flex items-center justify-between px-4 py-2 border-b border-slate-800
- Body: p-4 overflow-auto max-h-[60vh] text-xs font-mono whitespace-pre (toggle wrap)
- Copy button: secondary small.

1.9 Alerts
- Info: bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-3 text-sm
- Warn: bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-sm
- Error: bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-sm
- Success: bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 text-sm

1.10 Modals
- Overlay: fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4
- Modal: w-full max-w-xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl
- Header/Footer: px-5 py-4 border-b / border-t
- Close button top-right.

========================
2) NAVIGATION
========================
- Add “NetOps” nav group with links:
  - Devices
  - Changes
  - Rulepacks
  - Reports (optional placeholder)
- Use an icon if lucide is already present; otherwise plain text.

========================
3) TARGET UI PAGES (DETAIL SPEC)
========================
Use the following detailed spec for each page:

3.1 /netops/devices
Page header:
- Title: “NetOps Devices”
- Subtitle: count summary (e.g., “12 devices • 3 Cisco • 5 MikroTik • 4 FortiGate”)
Actions (right side):
- Primary: “Add device”
- Secondary: “Import CSV”
- Secondary: “Refresh”

Filters row (card):
- Search input (name/IP)
- Vendor select
- Site select (from data)
- Role select
- Clear filters button

Devices table columns:
- Name (clickable link)
- Vendor (badge)
- Role (badge)
- Site
- Mgmt IP
- Last config snapshot time (if present)
Row actions:
- “Pull config” (secondary small)
- “Collect facts” (ghost small)

Modals:
- Add device modal:
  - name, vendor, model, os_version(optional), site, role, mgmt_ip, tags (json optional)
- Import CSV modal:
  - file upload + sample template download text
  - show parsed preview and errors (if API returns)

3.2 /netops/devices/[id]
Header card:
- Device name + badges vendor/role + mgmt ip
- Quick actions:
  - Pull config (primary)
  - Collect facts (secondary)
  - Run lint (secondary; opens select rulepack modal)

Tabs:
- “Facts”
  - Facts panel: key/value grid (2 columns on desktop)
  - Show “Last collected at”
- “Configs”
  - Config versions list (table):
    - Collected at, source, created_by, note, actions: View, Parse/Normalize, Lint
  - “Upload config text” (if API supports POST /netops/configs import) as a collapsible panel:
    - textarea raw config + vendor select + submit

Lint modal:
- Select active rulepack (dropdown) + run.

3.3 /netops/configs/[versionId]
Top header:
- Breadcrumb: Devices > {device} > Config {versionId short}
- Actions:
  - Parse & Normalize (primary)
  - Run Lint (secondary)
  - Compare Diff (secondary; opens selector)

Layout:
- Two-column on desktop:
  Left:
    - Raw config CodeViewer
  Right:
    - Normalized JSON viewer (if exists)
    - Lint results panel (if exists)
Below:
  - Diff panel:
    - dropdown “Compare to” (list latest versions from same device)
    - show diff text

Diff rendering (simple):
- Split lines; wrap in <pre>.
- Add class for lines starting with “+” greenish background, “-” reddish background.
  (Use Tailwind: bg-emerald-500/10 text-emerald-300 and bg-rose-500/10 text-rose-300 inside dark panel)

3.4 /netops/rulepacks
Header:
- “Rulepacks”
Actions:
- Create Rulepack (if API supports) else hide
List:
- Cards or table:
  - Name, version, vendor_scope, active badge
  - Buttons: View JSON, Activate (if not active)

Rulepack detail modal:
- JSON viewer read-only.

3.5 /netops/changes
Header:
- “Changes”
Actions:
- Primary: “New Change”
Filters:
- Status select, Risk tier select, search title
Table columns:
- Title (link)
- Status badge
- Risk badge
- Intent type
- Created at
- Actions: Open

3.6 /netops/changes/new
Wizard layout (stepper):
Step 1: Basics
- title (required)
- intent_type dropdown (hardcode known ones for MVP + allow custom)
- risk_tier preview computed client-side heuristically (optional)
Step 2: Scope
- Device selector (multi-select list with search)
Step 3: Params
- Render:
  - If intent_type in known map (VLAN_CREATE_AND_TRUNK, FORTIGATE_POLICY_ALLOW_SERVICE_WITH_LOG, FORTIGATE_NAT_SNAT_DNAT):
    show structured fields.
  - Else: JSON editor textarea for params.
Step 4: Review
- Show summary + submit.

Styling:
- Stepper: horizontal pills on desktop, vertical on mobile.

3.7 /netops/changes/[id]
Header card:
- Title + Status badge + Risk badge
- Subtitle: intent type, created by, created at
Actions row:
- Plan (primary)
- Generate (secondary)
- Verify (secondary)
- Submit approval (secondary)
- Deploy (danger or primary) BUT disabled if API indicates disabled/flag off
- Close (ghost)

Sections as accordion cards:
A) Context (if endpoint exists)
- Show ContextPack summaries:
  - rolling summary
  - key decisions list
  - open questions list
  - network snapshot mini-stats
  - related devices list with linkage_reason
B) Plan output
- Show missing_info_questions in an alert + checklist UI
- Task graph as a simple list with dependencies
C) Change Sets (per device) tabs:
- Tab bar with device names
Inside each device tab:
- Candidate config CodeViewer
- Diff panel
- Steps panels: precheck/apply/postcheck/rollback in StepList
- Lint summary for candidate (grouped by severity)
D) Verify output
- Show verify plan items (pre/post)
- pass/fail criteria list
E) Approval
- Show judge decision (badge) + reasons + required fixes
- If approve endpoint exists: show Approve/Reject/Waive buttons (based on role)
F) Orchestration Runs (optional debug)
- Timeline list with nodes statuses (if endpoint exists)

Interactions:
- Each action button triggers the corresponding POST and then refetches the change detail.
- Show toast/alert on success/failure.

========================
4) DATA FETCHING & STATE MANAGEMENT
========================
- Implement netopsApi.ts:
  - typed methods calling /netops endpoints
  - unified error handling returning {message, details}
- Use SvelteKit load functions:
  - +page.ts to fetch initial data (server-side if auth allows)
  - For actions, use form actions or client fetch with progressive enhancement (match repo pattern).
- Avoid over-fetching:
  - cache devices list in a simple store for the session.
- If API endpoints are missing (e.g., context-pack), detect 404 and hide the section gracefully.

========================
5) COMPONENT LIBRARY (CREATE THESE)
========================
Create reusable components under src/lib/netops/components:
- PageHeader.svelte (title/subtitle + actions slot)
- Card.svelte (consistent card wrapper)
- Badge.svelte (variant: status|severity|risk|vendor|role)
- DataTable.svelte (simple table with slots)
- Modal.svelte (basic modal)
- CodeViewer.svelte (copy + wrap toggle + max height)
- JsonViewer.svelte
- LintFindingsList.svelte (group by severity)
- StepList.svelte (precheck/apply/postcheck/rollback)
- EmptyState.svelte

Also create:
- src/lib/netops/api/netopsApi.ts
- src/lib/netops/types.ts
- src/lib/netops/utils/format.ts (date, truncate id, severity sort)

========================
6) ACCESSIBILITY & RESPONSIVENESS
========================
- Buttons have focus rings.
- Modals trap focus if existing utilities exist; otherwise minimal focus management.
- Tables are horizontally scrollable.
- Use responsive grids:
  - Facts grid: grid grid-cols-1 md:grid-cols-2 gap-3
  - Change detail: 1 column on mobile, 2 columns on desktop where suitable.

========================
7) ACCEPTANCE CRITERIA
========================
- NetOps pages render with consistent Tailwind styling, dark mode friendly if app supports it.
- Devices: CRUD (create), import (if supported), list, filter, actions.
- Device detail: facts/configs list; pull config; lint.
- Config detail: view raw, parse/normalize, lint, diff.
- Rulepacks: list, view, activate.
- Changes: list, create wizard, detail with action buttons calling plan/generate/verify/submit-approval/deploy (gracefully disable if missing/flag off).
- No backend changes. No new heavy deps.

========================
8) EXECUTION PLAN
========================
Before coding:
1) Inspect existing web-ui: navigation component, layout, auth fetch wrapper, styling approach.
2) Confirm Tailwind config (dark mode, base classes).
3) Propose exact file paths to add/modify.

Implementation order:
A) netopsApi.ts + types.ts + format utils
B) shared components (Card/Badge/Modal/PageHeader/CodeViewer/JsonViewer)
C) /netops/devices
D) /netops/devices/[id]
E) /netops/configs/[versionId]
F) /netops/rulepacks
G) /netops/changes
H) /netops/changes/new
I) /netops/changes/[id] (most complex)
J) Add NetOps nav entry

Output:
- Provide PR-style summary: file list, how to run dev server, and describe key screens.
Start now by scanning web-ui for existing fetch/auth patterns and nav components, then implement netopsApi.ts and types.ts first.
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

IMPORTANT: Prefer reusing existing chat endpoints/UI components. Only add minimal new API glue if absolutely required. Most logic should be in tools/orchestrator + UI.

========================================================
0) HARD CONSTRAINTS
========================================================
- Do not break existing chat functionality and existing tests.
- Strict TypeScript; no any; validate inputs.
- All netops actions triggered from chat MUST be audited (payload redacted).
- Never expose secrets in chat. Never show raw configs by default; show digests + link to config viewer.
- Tool results must be structured JSON; UI renders them safely.
- Enforce RBAC:
  - Viewer cannot run actions
  - NetOps can plan/generate/verify
  - SecOps can submit-approval/approve/waive
  - Deploy requires explicit permission and feature flag

========================================================
1) USER EXPERIENCE (WHAT TO BUILD)
========================================================
Add a new page: /netops/chat
- Left side: conversations list (reuse existing conversation sidebar if exists)
- Main: chat timeline with streaming assistant messages
- Input box supports:
  - natural language
  - slash commands (optional): /devices, /change new, /plan <id>, /generate <id>, /verify <id>, /judge <id>, /deploy <id>, /lint <configVersionId>
- When the assistant uses tools, the UI shows a “Tool Card”:
  - title, status, summary
  - key fields
  - “Open details” collapsible JSON
  - deep links to relevant NetOps pages (device/config/change)

Chat should behave like a “control plane”:
- ask: “Create change to add VLAN 120 PACS on core switch and allow traffic to HIS through FortiGate logging enabled”
- assistant:
  1) asks missing params if needed
  2) creates change request
  3) runs plan/generate/verify
  4) returns summary + links
User can say: “Proceed to submit approval” or “Fix policy to restrict dst to HIS subnet only”.

========================================================
2) REQUIRED BACKEND (TOOLS) — MINIMAL AND SAFE
========================================================
Leverage existing chat tool/function calling system (contracts ToolDefinition + JSON schemas).
Implement or register NetOps tools that the chat model can call.
If you already implemented netops MCP tools, reuse them. Otherwise, add tool definitions in the API tool registry.

Required Tools (function signatures MUST be strict):
- netops.listDevices(filters?)
- netops.getDevice(deviceId)
- netops.pullConfig(deviceId)
- netops.listConfigs(deviceId)
- netops.getConfig(configVersionId)  (should return metadata + digests, not raw by default)
- netops.parseNormalizeConfig(configVersionId)
- netops.listRulepacks()
- netops.runLint(targetType, targetId, rulepackId)
- netops.createChange({title, intent_type, params, device_scope})
- netops.getChange(changeId)
- netops.planChange(changeId)
- netops.generateChange(changeId)
- netops.verifyChange(changeId)
- netops.submitApproval(changeId)
- netops.approveChange(changeId) / reject / waive (if present)
- netops.deployChange(changeId) (feature-flagged)
- netops.getContextPack(changeId) (if exists)
- netops.listOrchestrationRuns(changeId) (if exists)

Tool Output Contract:
Each tool returns:
{
  ok: boolean,
  summary: string,
  data: object,
  links?: {label:string, href:string}[],
  warnings?: string[]
}
Never return secrets. Never return full raw configs by default; return digest and a link.

Audit:
Every tool invocation must write an audit event with redacted inputs and output summaries.

RBAC/Gating:
Tools must enforce role permissions and deploy feature flag.
If forbidden -> return ok:false + error code + safe message.

========================================================
3) SYSTEM PROMPT FOR CHAT (IMPORTANT)
========================================================
Add a dedicated “NetOps Chat System Prompt” used by /netops/chat to guide behavior:
- You are a NetOps Copilot.
- Always prefer calling tools to fetch real data rather than guessing.
- Before proposing changes, ensure you know:
  vendor, device scope, vlan/zone/subnets/services, logging requirement, rollback target.
- For high-risk intents, ask confirmation and require approvals.
- Never output raw secrets.
- Default to “plan first”, then “generate”, then “verify”.
- Summarize results and provide links.
Tool usage policy:
- Use netops.listDevices when device scope unclear.
- Use netops.getContextPack and netops.getChange before generate/verify.
- If missing required params, ask the user concisely.

========================================================
4) UI IMPLEMENTATION DETAILS (SvelteKit)
========================================================
4.1 Routes
- /netops/chat/+page.svelte
- Reuse existing chat components if present in web-ui:
  - chat message list
  - streaming renderer
  - conversation sidebar
If not present, implement minimal chat UI using Tailwind style guide used elsewhere.

4.2 Rendering tool calls
The streaming API likely emits events for:
- assistant content chunks
- tool_call start
- tool_call result
Implement a ToolCard.svelte component:
- Badge: Running/Success/Error
- Title: tool name
- Summary: from tool output
- Details JSON collapsible
- Links rendered as buttons

4.3 Interaction / Commands
Implement parsing for:
- “plan change 123” -> call send message; assistant will call tool
Optional local slash commands:
- /devices -> send a templated message “List devices…”
Do NOT directly call netops endpoints from UI for these actions; let chat do tool calling.
(Except you may fetch conversations list via existing chat APIs.)

4.4 Safety: raw config display
If a tool result includes raw config (should not), UI must collapse and warn.
Prefer linking to /netops/configs/[id] where raw config viewer already exists.

========================================================
5) WIRING / API CALLS
========================================================
Use the existing chat API endpoints and streaming mechanism.
- Create a NetOps Chat conversation type if already supported; otherwise reuse standard chat.
- The UI page should call:
  - GET conversations list (existing)
  - POST send message (existing)
  - stream events (existing SSE/WebSocket)

Add minimal “context injection”:
When starting a NetOps chat session, include metadata:
{ domain: "netops" }
so backend picks the NetOps system prompt and NetOps toolset.
If the chat API already supports selecting “system prompt template” or “toolset”, use that.
Otherwise add minimal glue:
- a new chat route /chat/netops that sets system prompt + allowed tools.

========================================================
6) TESTING
========================================================
Backend:
- Unit test tool registry wiring:
  - netops tools are available only in netops chat context
  - RBAC blocks forbidden actions
  - deploy tool blocked when feature flag off
- Mock LLM calls to produce tool_call sequences deterministically.

Frontend:
- Minimal component tests if framework exists; otherwise manual checklist:
  - tool cards render with running/success/error
  - streaming message renders
  - links navigate to netops pages

========================================================
7) IMPLEMENTATION PLAN (ORDER)
========================================================
A) Locate existing chat endpoints, streaming event format, and existing chat UI components.
B) Implement NetOps toolset registration in the chat tool registry (backend) OR reuse MCP tools if already integrated.
C) Add NetOps system prompt template and ensure tool usage rules.
D) Add /netops/chat UI page reusing existing chat UI; add ToolCard renderer for tool calls.
E) Add minimal backend glue if needed to select netops prompt + toolset based on metadata/domain.
F) Add tests for tool availability + RBAC + feature flag.
G) Update NETOPS.md and/or WEB_UI.md with /netops/chat usage.

========================================================
8) OUTPUT REQUIREMENTS
========================================================
- Provide code changes with file paths.
- Do not break existing tests.
- Provide “how to run” steps and a manual verification script:
  - start api
  - open /netops/chat
  - run sample prompts:
    1) “List my FortiGate devices”
    2) “Create a change to add VLAN 120 named PACS on device X and allow PACS to HIS on FortiGate with logging”
    3) “Run plan, then generate, then verify for that change”
    4) “Submit approval”
  - show tool cards and links.

Start now:
1) Inspect chat system prompt/template mechanism and tool registry.
2) Propose exact files to create/modify for backend toolset and frontend /netops/chat page.
3) Implement minimal vertical slice first: /netops/chat UI + netops.listDevices tool + tool cards streaming.
Then expand toolset.
```
