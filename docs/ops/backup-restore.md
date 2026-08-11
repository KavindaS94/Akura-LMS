# Backup & restore (Supabase)

Akura stores tenant data in **Supabase Postgres**. File blobs live in **Supabase Storage** (`akura-uploads`). Do not invent an application-level backup engine — use the platform.

## Backups

1. Supabase Dashboard → **Project Settings → Database → Backups**
2. Enable **Point-in-Time Recovery (PITR)** on paid plans (recommended for production).
3. Confirm daily backups are enabled; note retention window.
4. Storage: treat the `akura-uploads` bucket as critical; enable versioning if available or replicate to a secondary bucket periodically.

## Restore drill (quarterly)

1. Pick a restore point (timestamp or backup id).
2. Prefer restoring into a **new** Supabase project / branch for dry-run.
3. Run `npm run db:migrate` only if schema is behind (usually restore includes schema).
4. Point a staging Vercel env at the restored DB (`DATABASE_URL`, Auth URL/keys).
5. Smoke-check: `/api/ready`, login, one tenant `/i/{slug}/admin`, export CSV, open a course file.
6. Document RPO/RTO achieved in the ops log.

## RPO / RTO targets (initial)

| Metric | Target |
| --- | --- |
| RPO | ≤ 24h (daily backup) or ≤ minutes with PITR |
| RTO | ≤ 4h for staging validation; production cutover planned separately |

## What not to do

- Do not `DROP` production schemas to “test” restore.
- Do not commit database dumps with PII to git.
- Auth users live in Supabase Auth — coordinate Auth + DB restore together.
