# Akura Phase 0 — Codebase Audit

**Date:** 2026-08-11  
**Scope:** Read-only inventory of the existing repository before any Akura work.  
**Product name in repo today:** Lumina (`package.json` name: `lms`) — not Akura.

---

## 1. Stack inventory

| Layer | Current | Notes |
| --- | --- | --- |
| Framework | **Next.js 15.5.23** (App Router), **React 19.1.0**, TypeScript `^5` | Aligned with target framework family |
| Package manager | **npm** (`package-lock.json` lockfileVersion 3) | — |
| Database | PostgreSQL via Neon-oriented env (`DATABASE_URL` pooled + `DIRECT_URL`) | Neon-compatible; driver is Prisma’s, not `@neondatabase/serverless` WebSocket |
| ORM | **Prisma ^6.19.3** + `@prisma/client` | **Conflicts with target Drizzle** |
| Auth | **`@neondatabase/auth` ^0.4.2-beta** (Managed Better Auth) | **Aligned**; README/design docs still say Auth.js in places (stale) |
| Styling | **Tailwind CSS v4** (`tailwindcss`, `@tailwindcss/postcss`) | Aligned |
| Validation | **Zod ^4.4.3** | Present; not applied on every server action / route handler |
| File storage | Local filesystem under `uploads/` via `/api/uploads` | **Not Cloudflare R2** |
| Email | None | No Resend / React Email |
| Payments | None | Old docs mention Stripe later; **no PayHere** |
| PDF | None | — |
| Test runner | `tsx --test` on `src/lib/learning.test.ts` | Plan docs mention vitest (stale) |
| Lint | ESLint 9 + `eslint-config-next` 15.5.23 | — |
| Hosting hints | README mentions Vercel; no `vercel.json`; `.gitignore` includes `.vercel` | — |
| Brand in code | “Lumina”, cobalt-style tokens in CSS | Target is Akura Ink `#101828` / Accent `#E4761B` / Surface `#F7F8FB` |

**Key scripts** (`package.json`): `dev`, `build`, `start`, `lint`, `db:migrate`, `db:seed`, `db:reset`, `test`, `postinstall: prisma generate`.

**Env template** (`.env.example`): `DATABASE_URL`, `DIRECT_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_AUTH_COOKIE_SECRET`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

---

## 2. Directory map

### Repository root (top level)

| Path | Purpose |
| --- | --- |
| `package.json` / `package-lock.json` | App metadata, deps, npm lockfile |
| `next.config.ts` | Minimal Next config |
| `tsconfig.json` | TypeScript; `@/*` → `./src/*` |
| `postcss.config.mjs` | Tailwind v4 PostCSS plugin |
| `eslint.config.mjs` | ESLint flat config |
| `prisma.config.ts` | Prisma CLI datasource / migrations paths |
| `prisma/` | Schema, migrations, seed |
| `src/` | App Router UI, lib, server actions, middleware |
| `scripts/` | Ad-hoc smoke / workflow helpers (not wired into npm scripts) |
| `docs/` | Design spec + implementation plan; this audit |
| `public/` | Default Next static SVGs |
| `.env.example` | Required env vars template |
| `README.md` | Lumina setup / smoke checklist |
| `.gitignore` | Ignores `.env`, `uploads/`, `.next`, etc. |

### `src/` (second level)

| Path | Purpose |
| --- | --- |
| `src/app/` | Pages, layouts, API routes |
| `src/components/` | Forms and UI widgets |
| `src/lib/` | DB, tenant/RBAC, learning helpers, auth |
| `src/lib/auth/` | Neon Auth client/server, JWKS, session sync |
| `src/server/` | Server Actions / domain writes |
| `src/middleware.ts` | Auth gate via Neon Auth middleware |

### App routes (`src/app/`)

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/login`, `/signup`, `/accept-invite` | Auth surfaces |
| `/platform` | Platform admin (create institutes) |
| `/admin` | Institute admin |
| `/instructor`, `/instructor/courses/[courseId]` | Instructor dashboard + course builder |
| `/learn`, `/learn/courses/[courseId]` | Student catalog + player |
| `/api/auth/[...path]` | Neon Auth handler |
| `/api/uploads`, `/api/uploads/[filename]` | Local upload + serve |

### `prisma/`

| Path | Purpose |
| --- | --- |
| `schema.prisma` | Data model |
| `seed.ts` | Platform admin seed |
| `migrations/` | SQL migrations + lock |

### `docs/`

| Path | Purpose |
| --- | --- |
| `docs/superpowers/specs/2026-08-11-multi-tenant-lms-design.md` | Prior Lumina design (soft tenancy, Auth.js/Prisma narrative) |
| `docs/superpowers/plans/2026-08-11-multi-tenant-lms.md` | Prior implementation plan (Tasks 1–6 marked done) |
| `docs/AUDIT.md` | This report |

### Missing vs Akura target tree

No `/i/[slug]`, no `/capabilities/{key}/`, no `/lib/db` Drizzle layer, no `/emails`, no R2/storage module, no PayHere webhooks, no cron routes.

---

## 3. Database

**Source of truth:** `prisma/schema.prisma`  
**Migrations:**

- `prisma/migrations/20260811090820_init/migration.sql` — full initial schema
- `prisma/migrations/20260811103000_neon_user_fields/migration.sql` — nullable `passwordHash` + `neonUserId`
- `prisma/migrations/migration_lock.toml` — `provider = "postgresql"`

### `tenant_id`

**Does not exist.** Soft tenancy uses `instituteId` (cuid string) on `Membership`, `Invite`, and `Course`. Nested tables inherit institute scope only through joins / app filters.

### RLS

**Not enabled anywhere.** Migrations contain no `ROW LEVEL SECURITY`, `CREATE POLICY`, `SET LOCAL`, or `app.current_tenant`.

### Enums

| Enum | Values |
| --- | --- |
| `Role` | `PLATFORM_ADMIN`, `INSTITUTE_ADMIN`, `INSTRUCTOR`, `STUDENT` |
| `InstituteStatus` | `ACTIVE`, `SUSPENDED` |
| `EnrollmentMode` | `OPEN`, `APPROVAL`, `PAID_LATER` |
| `CourseStatus` | `DRAFT`, `PUBLISHED` |
| `LessonType` | `TEXT`, `VIDEO`, `FILE` |
| `EnrollmentStatus` | `ACTIVE`, `PENDING`, `REVOKED` |

### Tables and columns

**User**  
`id` (cuid PK), `email` (unique), `name?`, `passwordHash?`, `neonUserId?` (unique), `isPlatformAdmin` (default false), `createdAt`, `updatedAt`

**Institute**  
`id`, `name`, `slug` (unique), `status`, `enrollmentMode`, `createdAt`, `updatedAt`

**Membership**  
`id`, `userId`, `instituteId`, `role`, `createdAt`  
`@@unique([userId, instituteId])` — `onDelete: Cascade` from User and Institute

**Invite**  
`id`, `email`, `instituteId`, `role`, `token` (unique), `expiresAt`, `acceptedAt?`, `createdAt`, `invitedById?`

**Course**  
`id`, `instituteId`, `instructorId`, `title`, `description`, `status`, `createdAt`, `updatedAt`

**Module**  
`id`, `courseId`, `title`, `position`, `createdAt`, `updatedAt`

**Lesson**  
`id`, `moduleId`, `title`, `type`, `content`, `videoUrl?`, `filePath?`, `position`, `createdAt`, `updatedAt`

**Enrollment**  
`id`, `userId`, `courseId`, `status`, `createdAt`, `updatedAt` — `@@unique([userId, courseId])`

**LessonProgress**  
`id`, `enrollmentId`, `lessonId`, `completedAt` — `@@unique([enrollmentId, lessonId])`

**Quiz**  
`id`, `lessonId` (unique), `title`, `passThreshold`, `createdAt`, `updatedAt`

**QuizQuestion**  
`id`, `quizId`, `prompt`, `options` (`String[]`), `correctIndex`, `position`

**QuizAttempt**  
`id`, `quizId`, `userId`, `answers` (`Int[]`), `score`, `passed`, `createdAt`

### Absent relative to Akura §6

No `tenants` (uuid + billing fields), `is_owner`, `audit_log`, `events` outbox, plans/subscriptions/invoices/payments/usage, setting definitions, students/guardians/staff_profiles, registration links/applications, subjects/classes/class_enrolments, attendance/sessions, exams/marks/grade_scales/exam_results, notifications, soft-delete columns.

### Client access pattern

`src/lib/db.ts` exports a plain `PrismaClient`. No tenant middleware, no `$extends`, no transaction-scoped GUC.

---

## 4. Auth

### What handles login

**Neon Auth** (`createNeonAuth` from `@neondatabase/auth/next/server` in `src/lib/auth/server.ts`), Better Auth under the hood.

Flow:

1. UI (`login-form.tsx`) → `loginAction` (`src/server/auth-actions.ts`)
2. `auth.signIn.email({ email, password })`
3. `ensureAppUser` upserts local `User` by `neonUserId` / email
4. `resolveMembership` loads first membership (or null for platform admin)
5. Redirect via `roleHomePath` → `/platform` | `/admin` | `/instructor` | `/learn`

Signup and invite accept also go through Neon Auth. Catch-all: `src/app/api/auth/[...path]/route.ts` → `auth.handler()`.

Middleware (`src/middleware.ts`): `auth.middleware({ loginUrl: "/login" })`; skips Server Actions; matcher excludes login/signup/accept-invite/`api/auth`.

### Where sessions live

- Identity session: Neon Auth / Better Auth **HTTP cookies** (validated with `auth.getSession()`)
- Not stored as app-owned Prisma Session rows
- App context derived per request: Neon user → local `User` → `Membership` → `TenantContext`
- JWKS helper (`src/lib/auth/jwks.ts`) exists but is not on the main login path

Cookie config in app code:

```ts
cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! }
```

No `__Host-` prefix, no explicit `Secure`/`HttpOnly`/`SameSite`/`Path` overrides in repo code. Default Neon Auth / Better Auth cookie naming applies (typically not `__Host-`).

### User table shape

App `User` as above. Passwords for login live in **Neon Auth**, not app bcrypt. `passwordHash` remains for seed/smoke legacy. Platform admin = `isPlatformAdmin` and/or email matching `PLATFORM_ADMIN_EMAIL`.

Roles with logins today: platform admin (flag), institute admin, instructor, student. **No Owner flag on membership. No Guardian users (and Akura guardians must not log in).**

---

## 5. Multi-tenancy

**There is a tenant concept**, but it is **soft multi-tenancy** for a course LMS — not Akura’s path-based, RLS-backed model.

| Question | Finding |
| --- | --- |
| Tenant entity | `Institute` (`slug`, `status`, `enrollmentMode`) |
| Resolution | **First `Membership` by `createdAt`**, not URL `/i/{slug}` |
| Isolation | Application filters + `assertSameInstitute`; **no RLS** |
| `withTenant` / `SET LOCAL` | **Absent** |
| Quotas / settings / audit / outbox | **Absent** |
| Multi-membership UX | Schema allows multiple; **no institute switcher** — first membership wins |
| Slug usage | Display / reference; routes are role homes, not `/i/{slug}/…` |

```
Browser → Neon Auth cookies → middleware
       → getSessionContext() → first Membership.instituteId + Role
       → prisma.* where instituteId = …
       → shared Postgres (no RLS)
```

---

## 6. Feature inventory

Honest split: **works end-to-end** vs **scaffolded / partial** vs **absent**.

### Works end-to-end

| Area | Evidence |
| --- | --- |
| Neon login / signup / logout | `auth-actions.ts`, auth pages, middleware |
| Platform create institute + admin membership | `institutes.ts`, `/platform` |
| Invite create + accept (link only) | `memberships.ts`, `invite-actions.ts`, `/accept-invite` |
| Course / module / lesson CRUD + publish | `courses.ts`, instructor pages |
| Student enroll + approval modes | `enrollments.ts`, learn + admin UIs |
| Lesson progress | `progress.ts`, course player |
| Lesson quizzes (create, take, score) | `quizzes.ts`, `quiz-taker.tsx`, `learning.ts` |
| Local lesson file upload | `POST /api/uploads`, `lesson-upload.tsx` |

Scripts `scripts/smoke.ts` and `scripts/verify-workflows.ts` exercise DB flows (not full HTTP UI).

### Scaffolded / partial

| Area | Gap |
| --- | --- |
| Uploads GET | `api/uploads/[filename]` serves files **without auth** |
| Invites | Token URL copied in UI — **no email delivery** |
| Role layouts | `force-dynamic` only; **no path-tenant gate**, weak layout-level RBAC |
| Zod coverage | Institutes/invites/some lesson fields; **not every** action/handler |
| Docs vs code | README/spec still mention Auth.js / Stripe / vitest in places |

### Absent (Akura core)

Attendance (sessions, marking, lock, reports) · Exams / marks / publish gate / ranks / report cards · Guardians · Student self-registration links / QR / OG / approval queue · Settings definitions · Billing / PayHere / bank transfer · Resend + React Email · R2 + quota checks · Capability packs + outbox · RLS + `withTenant` · `__Host-` cookies · Soft-delete / `audit_log` · Owner-on-membership billing rights

**Note:** In-product **online quizzes** work here; Akura §15 lists online quizzes as **out of scope**.

---

## 7. Reusable

Worth keeping as reference or porting with light adaptation:

| Item | Why |
| --- | --- |
| `src/lib/learning.ts` + `src/lib/learning.test.ts` | Pure quiz scoring / progress % — ORM-agnostic if enums detached |
| Neon Auth wiring | `src/lib/auth/server.ts`, `client.ts`, `api/auth/[...path]/route.ts`, middleware pattern (skip redirect on Server Actions) |
| `ensureAppUser` idea (`session.ts`) | Pattern for linking Neon identity → app profile (rewrite to Drizzle + `auth_user_id`) |
| Invite token accept flow | Concept only; add Resend; align roles (Teacher vs INSTRUCTOR) |
| Zod snippets in institutes/memberships | Starting validation shapes |
| Course → Module → Lesson mental model | Closest to Akura courses capability; **tables/routes must be rebuilt** (`resources`, drip, etc.) |
| `src/components/ui.tsx` shell patterns | Restyle to Akura brand tokens |
| `.env.example` Neon var names | `DATABASE_URL` / `DIRECT_URL` / `NEON_AUTH_*` |

**Not reusable as-is:** Prisma schema/migrations, `src/lib/db.ts`, soft-tenant `requireTenant` / first-membership resolution, local uploads, role route tree (`/admin` etc.), cobalt/Lumina brand, prior `docs/superpowers/*` as Akura truth.

---

## 8. Conflicts

### §2 Stack

| Target | Current conflict |
| --- | --- |
| Drizzle + `@neondatabase/serverless` WS/pooled | Prisma Client only |
| Cloudflare R2 | Local disk uploads |
| Resend + React Email | None |
| PayHere only | None; docs still point at Stripe as future |
| Zod on every action/handler | Partial |
| Brand Ink / Accent / Surface CSS variables | Lumina / cobalt styling |
| Repo layout `/capabilities`, `/i/[slug]` | Flat `src/server/*`, role paths |
| Neon Auth | Present — **aligned** |
| Tailwind + Next App Router + TS | Present — **aligned** |

### §4 Invariants

| Invariant | Conflict |
| --- | --- |
| **4.1** `tenant_id` + RLS in same migration | `instituteId` cuid; **no RLS** |
| **4.2** `withTenant` + `SET LOCAL` in transaction | Raw `prisma.*` everywhere |
| **4.3** Tenant from `/i/{slug}`, re-verify membership | First membership; role routes; forms can pass `instituteId` |
| **4.4** `__Host-` cookies, never parent Domain | Cookie secret only; no `__Host-` enforcement |
| **4.5** Quotas / `assertWritable` | None |
| **4.6** Capability isolation + outbox | Flat server modules; no events table |
| **4.7** Settings via definitions | `enrollmentMode` column + hardcoded branches |
| **4.8** Soft-delete; no auth-user cascade; `audit_log` | Widespread `onDelete: Cascade` including User→Membership/Enrollment/QuizAttempt; hard deletes; no audit_log |

### §11 PayHere

No Recurring API, `notify_url`, hash verification, subscriptions, invoices, bank-transfer flow, or subscription state machine. Payment direction in prior docs (Stripe) is wrong for Akura.

### Product mismatch

This repo is a **catalog + course player + MCQ** product. Akura is an **institute ops LMS** (attendance, exams, guardians, registration, capacity billing). Prior design/plan under `docs/superpowers/` contradict the Akura master brief.

---

## 9. Recommendation per area

| Area | Action | One reason |
| --- | --- | --- |
| Neon Auth wiring | **Adapt** | Already Managed Better Auth; rewire to path tenant + Drizzle memberships |
| Prisma / `db.ts` / migrations | **Delete / replace** | Wrong ORM; no RLS / `tenant_id` story |
| Soft-tenant helpers (`tenant.ts`, `rbac.ts`) | **Rewrite** | First-membership ≠ `/i/{slug}` + `withTenant` + Owner flag |
| Institutes / platform pages | **Rewrite** | Becomes `tenants` + signup Owner + billing; not only platform-admin factory |
| Courses / lessons / quizzes | **Adapt domain ideas, rewrite persistence & UI** | Content hierarchy is closest Akura slice; schema/routes/product rules differ; quizzes out of Akura scope |
| Uploads | **Rewrite** | Must be R2 + quota + auth; local public GET is unsafe |
| Enrollments / progress | **Rewrite** | Different entities (`course_enrolments`, class enrolment, `resource_views`) |
| Invites | **Adapt** | Keep token accept; add Resend; align Teacher/Admin/Owner |
| Role dashboards | **Delete / replace** | Replace with `/i/[slug]/(admin\|teacher\|student)` |
| Prior conflicting design/plan docs | **Delete** | Contradict Akura (soft tenancy, Auth.js narrative, Stripe) |
| Brand / globals | **Rewrite** | Wrong product name and tokens |
| Attendance / exams / guardians / registration / settings / billing / email / RLS | **Greenfield** | Nothing to salvage |

---

## Straight recommendation

**Start a clean Next.js Akura app on the target stack (Drizzle, pooled Neon driver, RLS, `/i/{slug}`, capabilities). Port only Neon Auth glue, pure learning helpers if still useful, and lightly adapted UI primitives — do not retrofit this codebase.**

Retrofitting multi-tenancy and RLS onto a single-soft-tenant Prisma schema looks cheaper than it is: every query path, migration, cascade rule, route tree, and domain model would still be replaced, while the working course/quiz surface is a thin slice of Akura and is bound to the wrong isolation model. A greenfield foundation plus a short port list costs less and avoids carrying Lumina assumptions into production data.

---

## Phase 0 stop

This audit changes **only** `docs/AUDIT.md`. No application code, schema, or other files were modified as part of Phase 0. Await confirmation before Phase 1 (Foundation) or saving the master brief as `AGENTS.md`.
