# Akura

Multi-tenant Learning Management System for education institutes. Built by Elgiriya Innovations.

Tenant workspaces live at `/i/{slug}`. Every institute gets every feature; plans differ only by capacity.

## Stack

- Next.js App Router + TypeScript
- Supabase Postgres + Drizzle ORM (`pg` driver)
- Supabase Auth (`@supabase/ssr`)
- Tailwind CSS
- Supabase Storage for course files

## Prerequisites

- Node.js 20+
- Supabase project (Postgres + Auth)
- Database connection string (direct or session pooler that supports `SET LOCAL` in a transaction)

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local signup without email confirmation, disable **Confirm email** in Supabase Auth → Providers → Email.

## Scope

Foundation through email: tenants, memberships, RLS, `withTenant()`, path tenant resolution, auth/roles, settings/billing skeleton, people/registration, attendance, exams, courses, Resend notifications.

Later phases: PayHere billing live, harden.

## Tests

```bash
npm test
```

Requires `DATABASE_URL` (or `DATABASE_URL_UNPOOLED`) pointing at a database with migrations applied.

## Database roles

The Supabase `postgres` role can bypass RLS. Migrations create an `akura_app` role **without** `BYPASSRLS`. Every tenant query path calls `SET LOCAL ROLE akura_app` inside `withTenant()` so RLS always applies.

Session cookies must never use a parent `Domain` (e.g. `.elgiriya.com`). Supabase SSR cookies are set with `domain: undefined`, `SameSite=Lax`, and `Path=/`.

## Docs

- [`AGENTS.md`](AGENTS.md) — product brief and invariants
- [`docs/AUDIT.md`](docs/AUDIT.md) — Phase 0 audit (pre-Akura codebase)
