# Akura

Multi-tenant Learning Management System for education institutes. Built by Elgiriya Innovations.

Tenant workspaces live at `/i/{slug}`. Every institute gets every feature; plans differ only by capacity.

## Stack

- Next.js App Router + TypeScript
- Supabase Postgres + Drizzle ORM (`pg` driver)
- Supabase Auth (`@supabase/ssr`)
- Tailwind CSS
- Supabase Storage for course files
- Resend + React Email
- PayHere recurring billing

## Prerequisites

- Node.js 20+
- Supabase project (Postgres + Auth + Storage)
- Database connection string (direct or session pooler that supports `SET LOCAL` in a transaction)

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL, NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, etc.

npm install
npm run db:migrate
npm run db:seed   # optional demo tenant: demo-institute
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local signup without email confirmation, disable **Confirm email** in Supabase Auth → Providers → Email.

## Ops

- Health: `GET /api/health` · Ready: `GET /api/ready`
- Backup/restore: [`docs/ops/backup-restore.md`](docs/ops/backup-restore.md)
- Monitoring: [`docs/ops/monitoring.md`](docs/ops/monitoring.md)
- Load smoke: `BASE_URL=http://localhost:3000 npm run load:smoke` (requires [k6](https://k6.io))

## Tests

```bash
npm test
```

Requires `DATABASE_URL` pointing at a migrated database.

## Docs

- [`AGENTS.md`](AGENTS.md) — product brief and invariants
- [`docs/AUDIT.md`](docs/AUDIT.md) — Phase 0 audit
- [`docs/ops/`](docs/ops/) — backup & monitoring
