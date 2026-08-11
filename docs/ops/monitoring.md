# Monitoring

## Health endpoints

| Path | Purpose |
| --- | --- |
| `GET /api/health` | Process up (no DB) |
| `GET /api/ready` | DB `SELECT 1` — returns 503 if down |

Wire these into UptimeRobot / Better Stack / Vercel Monitoring. Alert on `/api/ready` failures.

## Cron jobs (Vercel)

| Path | Schedule | Auth |
| --- | --- | --- |
| `/api/cron/process-events` | every 5 min | `Authorization: Bearer $CRON_SECRET` |
| `/api/cron/billing-lifecycle` | hourly | same |

Watch Vercel Cron logs for elevated `failed` counts on event processing and unexpected billing transitions.

## Application signals

- **Audit log** — exports, billing changes, membership changes
- **Events outbox** — `processed_at` / `attempts` / `error` on `events`
- **Payments** — `payments.status`, bank transfers pending confirmation

## Suggested alerts

1. `/api/ready` down > 2 minutes
2. Cron failures (Vercel)
3. Spike in `events.attempts` / unprocessed age > 1 hour (query in Supabase SQL)
4. PayHere webhook 4xx/5xx rate

## Logs

Vercel request logs + Supabase Postgres logs are the primary sources. Add Sentry later if needed; not required for Phase 10.
