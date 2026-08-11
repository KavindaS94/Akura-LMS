# Phase 8 Email Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Deliver guardian and invite emails via Resend + React Email, driven by the events outbox, with quiet hours, batching, and emails quota.

**Architecture:** Producers already emit `attendance.marked` and `exams.published`. A cron claims pending events via SECURITY DEFINER helpers, runs handlers in `withTenant`, and sends through Resend. Quiet hours defer (no attempt bump). Guardians with the same email get one batched absence email. Invites send immediately on create when Resend is configured.

**Tech Stack:** Resend, `@react-email/components` + `@react-email/render`, existing outbox + settings + quota.

## Status

- [x] Migration `0009_email.sql` — claim/mark/bounce helpers
- [x] Quiet hours + guardian batching
- [x] Absence / results / invite React Email templates
- [x] Outbox processor + cron + Resend webhook
- [x] Invite send on create
- [x] Tests `tests/email-quiet-hours.test.ts`
