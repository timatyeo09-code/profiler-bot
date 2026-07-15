BIL PROFESSIONAL SUITE v4.0 - CLOUD-READY FOUNDATION

WHAT IS INCLUDED
- All v3.2-v3.5 case, timeline, dashboard, behaviour-engine and governance modules
- Secure Access & Cloud Sync page
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
6. Open Accounts & Cloud Sync, create an account and test with fictional data.

SECURITY
- The anon key is designed for browser use and is protected by Row Level Security.
- Never expose the Supabase service-role key.
- The included policies initially isolate cases by user. Organisation-wide sharing should only be enabled after roles and governance are agreed.

OPERATIONAL BOUNDARY
Version 4.0 is a cloud-ready technical foundation, not a government-accredited live case system. Formal deployment still requires DPIA, approved architecture, contracts, penetration testing, retention controls, accessibility testing, incident response and independent professional safety review.

VERSION 4.0.1 PHONE-READY UPDATE
- Shared mobile.css added to every standalone page.
- Phone-safe input sizing prevents unwanted iPhone zoom.
- Single-column layouts on narrow screens.
- Full-width touch controls and safer spacing.
- Fixed portal viewer sizing below the mobile header.
- Long text, tables, reports and framework pills no longer overflow horizontally.
- Service-worker cache version bumped so older mobile styling is replaced.
