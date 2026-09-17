# BIL owner reporting

This adds a read-only platform-owner dashboard at `/owner.html`. It follows the dark panels, amber highlights, date controls and summary layout in Tim's Public Sector Outreach reference. It uses central Supabase records rather than the outreach file's browser-only storage.

## What this version does

- Shows current registered accounts, email confirmation, organisation, tier, status and access expiry.
- Shows daily new registrations, distinct active users, tool openings and accepted AI requests to `/api/profile`.
- Shows 14 UTC days of activity, per-organisation totals, user filtering, the latest 100 daily events and 30 saved daily summaries.
- Flags unassigned accounts and active-status accounts already expired or expiring within seven days.
- Saves the previous UTC day's aggregate summary at 06:00 UTC through Vercel Cron. This is 07:00 UK summer time and 06:00 UK winter time. It is an in-dashboard report, not an email automation.
- Allows summary download without exporting the user directory or confidential cases.

## Deployment steps

1. Apply `supabase/owner-reporting.sql` AFTER the project's existing schema, first against a staging database. This migration adds new reporting tables and a service-only SQL function; it does not change existing case permissions.
2. Set `BIL_OWNER_USER_IDS` on the server to Tim's actual Supabase Auth user UUID. Multiple explicit owner UUIDs may be comma-separated. Leave it unset until the correct account is confirmed. An `admin` subscription, local administrator setting or organisation-manager role does not grant platform-owner access.
3. Ensure the existing `SUPABASE_URL`, `SUPABASE_ANON_KEY` and server-only `SUPABASE_SERVICE_ROLE_KEY` are configured. Never put the service-role key in browser files or commit it.
4. Set a strong random `CRON_SECRET` through the hosting environment. Only the bearer secret can run the daily-report endpoint. No secret is included here.
5. Set `BIL_USAGE_ENABLED=true` after agreeing the usage notice, purpose and retention with the adopting organisations. Deploy the branch to a preview with separate staging credentials, verify the tests below, then release to production. Vercel schedules run on production deployments.
6. Sign in as the configured owner. An Owner dashboard link appears. The API enforces owner access independently of this link.
7. Confirm the first scheduled report the following morning. A retry upserts the same UTC date rather than duplicating a report. Monitor failed Cron invocations and the `BIL_USAGE_WRITE_FAILED` server log; tracking failures do not prevent people using their tools.

## Measurement definitions and limitations

Active user means an authenticated user with at least one recorded event during the UTC day. `/api/me` generates an access-check event whenever its authenticated check runs; this is NOT a distinct-login or session count. Tool openings are browser-reported, can be blocked, missed or fabricated by a logged-in user, and must not be treated as a forensic audit or staff-performance measure. Only recognised tool IDs are accepted; user and organisation identity and event time are assigned on the server. Repeat event UUIDs are ignored.

AI requests are recorded after input validation and before calling the AI provider. They are not successful completions, token costs or an uptime measure. This initial version does not instrument `/api/chat`, local case changes, case exports, time-on-task, billing or case outcomes. Server usage writes have a five-second timeout and fail open for the working suite. Browser telemetry failures are not retried. Do not treat an empty day as evidence of non-use. No historic activity exists before tracking is activated. Current memberships and account totals may differ from a historical report's position; event organisation IDs retain the assignment at event time.

Usage metadata contains user IDs, organisation IDs, event names, tool IDs and server timestamps only. It does not include cases, observations, transcripts, prompt/output text, IP addresses, passwords, screen recordings or keystrokes. The owner directory is sensitive and available only through the allowlisted owner API. Case content remains under existing controls. Users are shown a short collection notice in the authenticated interface.

Raw events and daily reports currently have no automatic deletion. Agree retention and implement a scheduled deletion policy before operational rollout; otherwise they accumulate. The initial query loads the complete user directory and aggregates retained events. At larger volumes add pagination and daily roll-ups before broad rollout. Daily saved reports intentionally omit individual email/activity histories; the live owner view offers named activity. Re-running a historical daily job can reflect updated account totals.

## Validation before release

Local checks: `node --test tests/owner-reporting.mjs` passes five API test groups using mocked Supabase responses (owner/ordinary/disabled/legacy access, actor spoofing, disabled collection, cron authentication, date validation and error redaction). JavaScript syntax and `git diff --check` pass. These do not establish live database correctness. Browser visual verification was attempted but the runtime has no Chromium executable; the migration has not been run against a real PostgreSQL/Supabase instance. Both are release gates below.

- Owner account can open dashboard; signed-out, ordinary user, organisation manager and admin-tier accounts cannot call its API unless explicitly allowlisted.
- A new registration creates its existing profile and appears in the directory. Existing sign-in and invitation flows still work.
- Load suite, embedded child log and an external tool; verify actor identity and counts. Submit one synthetic AI request and confirm the server event. Never use real case content to test reporting.
- Verify browser requests cannot read/write reporting tables or execute the owner SQL function directly using anon/authenticated credentials. Verify user/tier/body fields cannot promote a user to owner.
- Missing configuration fails closed for dashboard access, while normal tools continue working.
- Schedule/retry one report in staging; check previous UTC date and no duplicate report. Keep production email sending disabled until a recipient and delivery service are approved.

## Next stages

Add server-recorded success/failure and token usage for both AI endpoints, central storage for client records with organisation permissions, access-management controls with an authenticated audit, agreed retention, and optional daily email to a verified recipient. None is implied by the initial dashboard. Operational rollout still needs the existing governance and professional assurance work.

References: https://vercel.com/docs/cron-jobs/manage-cron-jobs and https://supabase.com/docs/guides/troubleshooting/how-can-i-revoke-execution-of-a-postgresql-function-2GYb0A
