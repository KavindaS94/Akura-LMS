# Phase 9 — PayHere billing (live)

**Goal:** Owner-managed PayHere recurring checkout, bank-transfer submissions, webhook-driven activation, and subscription lifecycle cron.

## State machine (locked for this phase)

| From | Trigger | To |
| --- | --- | --- |
| `trialing` | PayHere success / bank confirmed | `active` |
| `trialing` | `trial_ends_at` passed | `past_due` (+7d grace) |
| `active` | Recurring fail (`item_rec_status` -2/-3) | `past_due` (+7d grace) |
| `past_due` | Payment success / bank confirmed | `active` |
| `past_due` | `grace_ends_at` passed | `read_only` |
| `read_only` | Payment success / bank confirmed | `active` |
| `read_only` | 30d after grace ended | `dormant` |
| `dormant` | Payment success / bank confirmed | `active` |
| `*` paid plan | Owner cancels at period end | `cancel_at_period_end=true` |
| `active` + cancel flag | `current_period_end` passed | `free` plan |

Grace = 7 days. Dormant delay = 30 days after entering `read_only`.

## Files

- `drizzle/migrations/0010_billing_live.sql`
- `lib/billing/payhere.ts`, `lib/billing/transitions.ts`
- `capabilities/billing/lib/service.ts`, `actions.ts`
- `app/api/webhooks/payhere/route.ts`
- `app/api/cron/billing-lifecycle/route.ts`
- `app/api/ops/confirm-bank/route.ts`
- `app/i/[slug]/admin/billing/*` UI
- `tests/billing-payhere.test.ts`
