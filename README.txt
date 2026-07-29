BIL PROFESSIONAL SUITE v4.0.4 - CONTROLLED PILOT BUILD

SECURE ACCOUNT UPGRADE (PHASE 1)
- Individual Supabase accounts replace the shared demo code when configured.
- Server-side entitlement checks protect both Behaviour Engine API routes.
- Access tiers: Demo, Pilot, Professional, Enterprise and Admin.
- Demo outputs are watermarked and account access can expire automatically.
- Hashed invitation codes convert signed-in users to the assigned tier.
- The existing BIL_DEMO_CODE remains as a safe fallback until Supabase is live.

WHAT IS INCLUDED
- Case, timeline, dashboard, behaviour-engine and governance modules
- Optional Cloud Integration Roadmap page
- Supabase email/password authentication integration
- Manual upload/download of local case records
- Database schema with profiles, organisations, cases and audit log
- Row Level Security starter policies
- Local-first mode remains available when cloud is not configured

UPLOAD ALL FILES TO THE GITHUB ROOT
Keep folders intact:
- api/profile.js
- js/bil-cloud.js
- supabase/schema.sql

TO ACTIVATE CLOUD MODE
1. Create a Supabase project.
2. Open Supabase SQL Editor and run supabase/schema.sql.
3. In Supabase Authentication, configure your approved sign-in settings.
4. Edit config.js and enter:
   supabaseUrl: 'https://YOUR-PROJECT.supabase.co'
   supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY'
5. Commit and redeploy.
6. Open Cloud Integration Roadmap, create an account and test with fictional data.

TO ACTIVATE INDIVIDUAL ACCOUNTS
1. Create or use the approved Supabase project in the London region.
2. Run supabase/schema.sql in the Supabase SQL Editor.
3. Add these Vercel Environment Variables to Production and Preview:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (server only; required for invite redemption)
4. Redeploy. The suite will then require /login.html authentication.
5. Create Tim and Emma in Supabase Authentication.
6. In the profiles table, set subscription_tier='admin' and
   role='administrator' for authorised BIL administrators.
7. Test with a Demo account before inviting customers.

ACCESS TIERS
- demo: time-limited account, watermarked AI output
- pilot: full individual access with an expiry date (normally 8 weeks)
- professional: full individual access
- enterprise: organisation-linked access; seat controls come in Phase 3
- admin: BIL account administration

IMPORTANT SECURITY NOTES
- Never put SUPABASE_SERVICE_ROLE_KEY in config.js, HTML or browser JavaScript.
- Users cannot update their own tier, status, expiry or Stripe identifiers.
- Configure MFA and email templates in Supabase before operational use.
- Phase 2 adds Stripe webhooks. Phase 3 adds enterprise seats and dashboards.

SECURITY
- The anon key is designed for browser use and is protected by Row Level Security.
- Never expose the Supabase service-role key.
- The included policies initially isolate cases by user. Organisation-wide sharing should only be enabled after roles and governance are agreed.

OPERATIONAL BOUNDARY
Version 4.0.4 is a controlled-pilot technical foundation, not a government-accredited live case system. The public build does not have cloud integration configured. Formal deployment still requires DPIA, approved architecture, contracts, penetration testing, retention controls, accessibility testing, incident response and independent professional safety review.

VERSION 4.0.1 PHONE-READY UPDATE
- Shared mobile.css added to every standalone page.
- Phone-safe input sizing prevents unwanted iPhone zoom.
- Single-column layouts on narrow screens.
- Full-width touch controls and safer spacing.
- Fixed portal viewer sizing below the mobile header.
- Long text, tables, reports and framework pills no longer overflow horizontally.
- Service-worker cache version bumped so older mobile styling is replaced.
