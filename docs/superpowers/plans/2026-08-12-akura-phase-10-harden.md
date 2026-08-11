# Phase 10 — Harden

**Goal:** Operational readiness — demo seed, Owner CSV export, health checks, backup/restore runbook, smoke load test, CI coverage.

## Scope (pragmatic)

| Item | Deliverable |
| --- | --- |
| Seed | `scripts/db-seed.ts` — idempotent demo tenant + sample people/class |
| Export | Owner CSV for students, guardians, attendance, marks + admin Reports page |
| Monitoring | `/api/health`, `/api/ready` + ops monitoring notes |
| Backup restore | `docs/ops/backup-restore.md` (Supabase PITR) |
| Load test | `load/k6-smoke.js` stub |
| CI | migrate + unit tests + RLS |

No new migration required.
