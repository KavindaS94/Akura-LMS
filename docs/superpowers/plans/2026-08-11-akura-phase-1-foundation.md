# Akura Phase 1 — Foundation (executable checklist)

> Implement with subagent-driven-development or executing-plans. Check boxes as you go.

**Goal:** Drizzle + Neon pooled driver, foundation tables + RLS, `withTenant()`, `/i/{slug}` resolution, `__Host-` cookie policy, CI isolation tests. Product name Akura only.

## Done when

- [x] Prisma / Lumina surfaces removed
- [x] `tenants`, `memberships`, `audit_log`, `events` + RLS in `drizzle/migrations/0001_foundation.sql`
- [x] `lib/db/tenant.ts` `withTenant()` using `set_config(..., true)`
- [x] Middleware + `/i/[slug]` membership re-verify
- [x] Auth cookie rewrite toward `__Host-`
- [x] `tests/rls-isolation.test.ts` + `.github/workflows/ci.yml`
- [x] `AGENTS.md` + Akura branding

Stop before Phase 2.
