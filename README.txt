BIL PROFESSIONAL SUITE v4.0.4 - CONTROLLED PILOT BUILD

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
