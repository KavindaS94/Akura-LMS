# Akura

Multi-tenant Learning Management System for education institutes. Built by Elgiriya Innovations.

Tenant workspaces live at `/i/{slug}`. Every institute gets every feature; plans differ only by capacity.

## Stack (Phase 1)

- Next.js App Router + TypeScript
- Neon Postgres + Drizzle ORM
- `@neondatabase/serverless` WebSocket/pooled driver
- Neon Auth (Managed Better Auth)
- Tailwind CSS

## Prerequisites

- Node.js 20+
- Neon project with Auth enabled
- Pooled + unpooled connection strings

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL (pooled), DATABASE_URL_UNPOOLED (migrate), Neon Auth vars

npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 scope

Foundation only: `tenants`, `memberships`, `audit_log`, `events`, RLS, `withTenant()`, path tenant resolution, `__Host-`-compatible session cookies, cross-tenant isolation tests.

Later phases add roles UX, settings, billing, attendance, exams, courses, email, and PayHere.

## Tests

```bash
npm test
```

Requires `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`) pointing at a database with foundation migrations applied. The RLS suite seeds two tenants and asserts Tenant A cannot see Tenant B rows.

## Database roles

Neon’s `neondb_owner` has `BYPASSRLS`. Migrations create an `akura_app` role **without** `BYPASSRLS`. Every tenant query path calls `SET LOCAL ROLE akura_app` inside `withTenant()` so RLS always applies, even when the connection string uses the owner.

Session cookies must never use a parent `Domain` (e.g. `.elgiriya.com`). Neon Auth is configured with **no `domain`**, `SameSite=Lax`, and the auth route rewrites `Set-Cookie` headers toward `__Host-` names with `Secure`, `HttpOnly`, `Path=/`.

## Docs

- [`AGENTS.md`](AGENTS.md) — product brief and invariants
- [`docs/AUDIT.md`](docs/AUDIT.md) — Phase 0 audit (pre-Akura codebase)
- [`docs/superpowers/plans/2026-08-11-akura-phase-1-foundation.md`](docs/superpowers/plans/2026-08-11-akura-phase-1-foundation.md) — Phase 1 checklist
