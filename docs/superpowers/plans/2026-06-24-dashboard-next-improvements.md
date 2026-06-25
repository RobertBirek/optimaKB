# Dashboard Next Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the next five dashboard upgrades: Inbox pagination, health cockpit, MCP control center polish, source ingestion wizard, and zero lint warnings.

**Architecture:** Keep the dashboard incremental: reuse existing API routes, `useApi`, `PageShell`, `DataTable`, `Modal`, and shared CSS. Add small focused helpers only when a page needs a reusable data shape or UI primitive.

**Tech Stack:** Node.js ESM dashboard server, React 18, Vite, ESLint, existing OpenSPG/MCP HTTP endpoints.

---

## File Structure

- Modify `src/InboxPage.jsx`: consume `/api/inbox?limit=&offset=` from the frontend, expose page controls, reset page on filters.
- Modify `src/shared/useApi.js`: support dynamic URLs and reload with the latest URL if needed.
- Modify `src/Overview.jsx` or create `src/HealthCockpit.jsx`: display operational health signals.
- Modify `scripts/erp_kb_dashboard_server.mjs`: add any missing health fields under `/api/system` or `/api/status` without making `/api/status` heavy again.
- Modify `src/McpPage.jsx`: tighten action states, copy config UX, and live health refresh.
- Modify `src/AddDraftPage.jsx` and/or `src/SourcesPage.jsx`: add a guided ingestion path for file/URL/folder inputs.
- Modify `src/styles.css`: add focused classes for pagination, health cards, MCP action groups, and wizard steps.
- Modify lint-targeted files listed by `npm run lint`: remove unused imports/vars or prefix intentional unused values with `_` where already established.

## Execution Order

1. Inbox 2.0 with server-side pagination.
2. Zero lint warnings for touched dashboard files first, then scripts if safe.
3. Health cockpit.
4. MCP control center polish.
5. Source ingestion wizard.

## Task 1: Inbox 2.0 Server-Side Pagination

**Files:**
- Modify: `src/InboxPage.jsx`
- Modify if needed: `src/shared/useApi.js`
- Modify: `src/styles.css`

- [ ] Step 1: Change `InboxPage` to derive `inboxUrl` from `page`, `PAGE_SIZE`, `filter`, `kbFilter`, and `query`.

```jsx
const PAGE_SIZE = 50;
const offset = (page - 1) * PAGE_SIZE;
const inboxUrl = `/api/inbox?limit=${PAGE_SIZE}&offset=${offset}`;
const { data: inboxData, loading, error, reload } = useApi(inboxUrl);
```

- [ ] Step 2: Remove local `.slice((page - 1) * 50, page * 50)` pagination and use `inboxData.drafts` as the current page.

```jsx
const rows = (inboxData?.drafts || [])
  .filter((draft) => filter === 'all' || draft.status === filter)
  .filter((draft) => kbFilter === 'all' || draft.kbNamespace === kbFilter)
  .filter((draft) => `${draft.title} ${draft.id} ${draft.kbName} ${draft.kbNamespace} ${draft.sourceUrl}`.toLowerCase().includes(query.toLowerCase()))
  .slice()
  .reverse();
const pageRows = rows;
const totalRows = inboxData?.total || rows.length;
const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
```

- [ ] Step 3: Add pagination controls that use `total`, `offset`, and `hasMore`.

```jsx
<div className="paginationBar">
  <button className="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Poprzednia</button>
  <span>Strona {page} / {totalPages} · {formatNumber(totalRows)} rekordów</span>
  <button className="secondary" disabled={!inboxData?.hasMore || loading} onClick={() => setPage((p) => p + 1)}>Następna</button>
</div>
```

- [ ] Step 4: Run validation.

Run: `npm run lint && npm run build`
Expected: ESLint has 0 errors, build passes.

## Task 2: Reduce Lint Warnings Safely

**Files:**
- Modify: files reported by `npm run lint`

- [ ] Step 1: Remove unused imports and unused local variables in dashboard frontend files.
- [ ] Step 2: For scripts, only remove unused code when it is obviously dead and not an exported helper; otherwise prefix intentionally unused destructured values with `_`.
- [ ] Step 3: Run `npm run lint`.
Expected: 0 errors and materially fewer warnings; target 0 warnings if changes are safe.

## Task 3: Health Cockpit

**Files:**
- Modify: `scripts/erp_kb_dashboard_server.mjs`
- Modify: `src/Overview.jsx`
- Modify: `src/styles.css`

- [ ] Step 1: Add a compact health payload with API availability, OpenSPG status, MCP bridge status, recent action failures, and stale data signals.
- [ ] Step 2: Render a cockpit card above existing overview sections.
- [ ] Step 3: Use existing `StatusBadge` and compact cards; avoid new dependencies.
- [ ] Step 4: Run `npm run check && npm run lint && npm run build`.

## Task 4: MCP Control Center Polish

**Files:**
- Modify: `src/McpPage.jsx`
- Modify: `src/styles.css`

- [ ] Step 1: Add per-server action busy state so restart/stop/delete only disables the affected server.
- [ ] Step 2: Add copy buttons for connection JSON, SSE URL, and service install commands.
- [ ] Step 3: Add explicit health refresh feedback and last-check timestamp.
- [ ] Step 4: Run `npm run lint && npm run build`.

## Task 5: Source Ingestion Wizard

**Files:**
- Modify: `src/AddDraftPage.jsx`
- Modify: `src/SourcesPage.jsx` if source discovery should deep-link into the wizard
- Modify: `src/styles.css`

- [ ] Step 1: Add a three-step wizard UI: input source, choose target KB, submit draft.
- [ ] Step 2: Reuse existing draft submission API; do not add a new backend route unless current API cannot express the workflow.
- [ ] Step 3: Add success and failure states with the created draft path/id.
- [ ] Step 4: Run `npm run lint && npm run build`.

## Final Verification

- [ ] Run `npm run check`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Summarize changed files, behavior, and any remaining warnings or known limitations.

## Self-Review

- Scope is decomposed into five independent tasks with a safe order.
- No new dependencies are required.
- `/api/status` must remain lightweight; heavier health details should stay in `/api/system` unless Overview needs a compact summary.
- The checkout is not a git repository in this environment, so plan execution will not include commits unless a git repo is initialized later and the user asks for commits.
