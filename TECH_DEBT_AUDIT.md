# Tech Debt Audit — Prospyr Dashboard

**Generated:** 2026-04-25  
**Stack:** TypeScript, Next.js 14.2.35, React, Tailwind CSS v3  
**Audit scope:** `.` (full repo)

---

## Executive Summary

- **4 audit vulnerabilities** (1 High — Next.js DoS, 3 Moderate — postcss XSS, uuid buffer, next-auth uuid)  
- **5 unused files** confirmed dead code (`lib/database.ts`, `lib/paperclip.ts`, `lib/storage.ts`, `agent-poller.js`, `agent-sse.js`)  
- **10 unused exports** in `lib/store.ts` alone — internal functions exposed but never consumed  
- **No test directory** — zero test coverage on critical paths (SSE connections, task creation, agent registration)  
- **Unused dependencies:** `swr`, `@supabase/supabase-js`, `eventsource`, `autoprefixer`, `tailwindcss`, `typescript`, `postcss`  
- **In-memory stores** reset on every server restart — no persistence for MVP but not flagged as a debt item since it's intentional  
- **No circular dependencies** — confirmed clean via `madge`

---

## Architectural Mental Model

Prospyr is a multi-agent command center built on Next.js with an in-memory store. The system has two distinct layers:

1. **API layer** (`app/api/prospyr/*/route.ts`) — stateless route handlers that read/write to `lib/store.ts`. Four main resources: agents, tasks, messages/chat, and SSE events. The SSE route (`events/route.ts`) is the real-time communication backbone; it maintains controller connections per agent in a `Map`.

2. **Agent layer** (`agents/`) — three TypeScript agents: a `BaseAgent` class, a `SupervisorAgent` (orchestrator), and a `COOSouthstarAgent` (operations/execution). These appear to be standalone Node.js processes that connect to the API layer via SSE and polling.

The agents code (`agents/`) is NOT part of the Next.js build — it's likely deployed separately. The Next.js app is purely the API and dashboard UI.

**Notable:** The `orchestrator/`, `providers/`, `components/`, and `pages/` directories appear mostly dormant. The active surface area is the API routes plus `lib/store.ts`.

---

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Dependency & config | `package.json` | Critical | S | 4 audit vulnerabilities: Next.js DoS (high), postcss XSS, uuid buffer underflow, next-auth uuid (3× moderate) | `npm audit fix --force` will pull next@16.2.4 (breaking). Weigh upgrade path vs accepting risk for MVP |
| F002 | Dependency & config | `package.json` | High | S | 6 unused dependencies: `swr`, `@supabase/supabase-js`, `@supabase/supabase-js` (unused but installed), `eventsource`, `autoprefixer`, `tailwindcss`, `typescript`, `postcss` | `npm uninstall swr @supabase/supabase-js eventsource autoprefixer` — devDeps don't affect prod build but clutter audits |
| F003 | Architectural decay | `lib/database.ts` | High | S | 154-line file, zero imports across entire codebase — confirmed dead code via `knip` | Delete. If database integration is planned, stub it explicitly rather than leaving dead weight |
| F004 | Architectural decay | `lib/paperclip.ts` | High | S | 68-line file, zero imports — dead code | Delete or move to reference/ if kept for context |
| F005 | Architectural decay | `lib/storage.ts` | High | S | Storage abstraction with zero consumers | Delete |
| F006 | Architectural decay | `agent-poller.js` + `agent-sse.js` | High | S | Standalone agent connector scripts, neither imported anywhere | Remove or wire up — if agents are being deprecated, remove; if they're the actual agent runtime, import them somewhere |
| F007 | Type & contract debt | `lib/store.ts:10,13` | Medium | S | `tasks` and `messages` Maps exported but only used internally as module-level singletons — should be encapsulated | Unexport unless external consumers exist; use getter functions only |
| F008 | Type & contract debt | `lib/store.ts:19,40,48,62,69,93` | Medium | S | 6 store functions exported but unused outside `lib/store.ts`: `broadcastToAgent`, `registerSSEClient`, `removeSSEClient`, `addTask`, `updateTask`, `getAllTasks` | Unexport or document why they're public |
| F009 | Type & contract debt | `types/index.ts` + `lib/types.ts` | Medium | M | `SSEEvent` (`lib/types.ts:38`), `Attachment`, `ToolCall`, `DashboardConfig` exported but not imported anywhere | Remove unused exported types |
| F010 | Type & contract debt | `agents/specialists/COOSouthstarAgent.ts:8` | Low | S | `SOUTHSTAR_TOOLS` exported but not consumed — tool definitions for an agent that has no caller | Unexport if not dynamically loaded |
| F011 | Type & contract debt | `agents/supervisor/SupervisorAgent.ts:8` | Low | S | `SUPERVISOR_TOOLS` exported but not consumed | Unexport if not dynamically loaded |
| F012 | Test debt | `*` | High | L | Zero test files — no `test/`, `__tests__/`, or `.test.ts` files in repo | Add tests for: SSE connection lifecycle, task creation/deletion, agent registration, message broadcasting |
| F013 | Error handling & observability | `app/api/prospyr/msg/route.ts:160` | Medium | S | Empty `catch {}` swallows all errors silently, returns 400 with no detail | Log the error or at minimum distinguish validation errors from unexpected ones |
| F014 | Error handling & observability | `app/api/prospyr/chat/route.ts` | Medium | S | `addResponse` is called but the function is defined in a dead file (`lib/storage.ts`) — calls will throw at runtime | Verify `addResponse` exists in `lib/store.ts` or restore from `lib/storage.ts` |
| F015 | Error handling & observability | `app/api/prospyr/*/route.ts` | Low | M | No structured logging anywhere in API routes — errors go to console only | Add `console.error` or a lightweight logger on 5xx responses |
| F016 | Security hygiene | `app/api/prospyr/*/route.ts` | Medium | M | No authentication/authorization checks on any route — `GET /api/prospyr/agents` returns all agents without auth | Add auth guard or document that these are internal APIs behind a network fence |
| F017 | Security hygiene | `app/api/prospyr/chat/route.ts` | Low | S | `addResponse` result is discarded (`const _ = addResponse(...)`) — may indicate incomplete integration | Verify response flow end-to-end |
| F018 | Documentation drift | `README.md` | Low | S | No mention of current `/api/prospyr/` routes, agents directory structure, or in-memory store behavior | Update README or create `ARCHITECTURE.md` |
| F019 | Documentation drift | `MULTICA-INTEGRATION.md` | Low | S | Orphaned doc file — `multica` not in package.json or any import | Either delete or wire up the integration and update docs |
| F020 | Consistency rot | `app/api/prospyr/chat/route.ts` | Low | S | Imports use `../../lib/types` relative path — inconsistent with `@/lib/types` alias used in other routes | Standardize all imports to `@/lib/*` alias |
| F021 | Performance & resource hygiene | `app/api/prospyr/events/route.ts:67` | Low | S | `clients.forEach` iterating a Set in-place while deleting invalidates during iteration — potential behavior difference vs `Array.from(clients).forEach` | Verify clients are correctly pruned on error |
| F022 | Architectural decay | `app/api/prospyr/events/route.ts:181` | Low | M | 181-line route handles SSE lifecycle, agent registry, buffering, broadcasting, and task/message forwarding — may exceed Single Responsibility for a route | Extract `sseClients` management into `lib/sse.ts` helper |

---

## Top 5

1. **F001 — Fix audit vulnerabilities** (`npm audit fix --force` or evaluate upgrade path). High severity (Next.js DoS) in a networked API. At minimum, document why it's acceptable for MVP or gate behind a network policy.

2. **F003/F004/F005/F006 — Delete dead files.** `lib/database.ts`, `lib/paperclip.ts`, `lib/storage.ts`, `agent-poller.js`, `agent-sse.js` have zero consumers. Dead code is a maintenance liability and misleads contributors.

3. **F012 — Add test coverage.** No tests on SSE connection lifecycle, task CRUD, or agent registration. These are the core flows — a regression here is silent in production. Even a `test/` folder with 5 basic integration tests would change the risk profile.

4. **F016 — Auth guard on `/api/prospyr/*` routes.** Currently wide open. If Railway is the only access path this is acceptable; if there's any public exposure these routes need auth. Document the assumption explicitly.

5. **F014 — Verify `addResponse` exists.** `lib/storage.ts` (dead) defined `addResponse`. If that logic moved to `lib/store.ts`, it's missing. Call site in `app/api/prospyr/chat/route.ts` will throw.

---

## Quick Wins

- [ ] Delete `lib/database.ts` (154 lines, zero consumers)
- [ ] Delete `lib/paperclip.ts` (68 lines, zero consumers)  
- [ ] Delete `lib/storage.ts` (zero consumers)
- [ ] Delete `agent-poller.js` + `agent-sse.js` (zero consumers, or wire up)
- [ ] Unexport `tasks` and `messages` Maps from `lib/store.ts` (internal state, not public API)
- [ ] Unexport 6 unused functions from `lib/store.ts`: `broadcastToAgent`, `registerSSEClient`, `removeSSEClient`, `addTask`, `updateTask`, `getAllTasks`
- [ ] Unexport unused types `SSEEvent`, `Attachment`, `ToolCall`, `DashboardConfig`
- [ ] Fix empty `catch {}` in `app/api/prospyr/msg/route.ts`
- [ ] Verify `addResponse` exists in `lib/store.ts` before chat route goes live
- [ ] Run `npm uninstall swr @supabase/supabase-js eventsource` to clean up unused deps

---

## Things That Look Bad But Are Actually Fine

- **In-memory stores (`lib/store.ts`)** — `tasks`, `messages`, `sseClients` reset on restart. This is documented as intentional MVP behavior. Fine.
- **`agents/BaseAgent.ts` (358 lines)** — large class, but it's a god class by design: base class for all agents, handles LLM interaction, tool execution, memory, and state. Not refactorable without breaking the agent hierarchy. Accept the mass for now.
- **`app/api/prospyr/events/route.ts` (181 lines)** — long, but SSE lifecycle management inherently requires holding connection state. Extracting to a helper is a `LOW` effort item but not urgent.
- **`lib/auth.ts` (51 lines)** — stub for NextAuth, used as placeholder. Fine.
- **`orchestrator/Orchestrator.ts`** — exists but not wired into the Next.js build. Likely a planned component. Don't delete without confirming intent.

---

## Open Questions

- Is `lib/storage.ts` intentionally kept for future database integration, or should it be deleted?
- Are `agent-poller.js` and `agent-sse.js` the actual agent runtime? If agents run standalone (not in Next.js), these should be wired up or removed.
- Is `addResponse` supposed to exist in `lib/store.ts`? If so, it's missing — was it accidentally deleted when the merge conflict was resolved?
- Is the `orchestrator/` directory planned or abandoned?
- Are SSE clients cleaned up on disconnect? `closeSSEConnection` is defined but may not be called on client disconnect — potential memory leak under long-running server.
- What's the plan for persistence? In-memory is MVP — when does this get a real database?
