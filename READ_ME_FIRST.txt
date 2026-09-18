BIL registration update — 18 September 2026

READY TO UPLOAD; NOT YET DEPLOYED

Adds required Full name and Organisation fields to Create an account.
Saves full_name and organisation_name in Supabase Auth user metadata during signup.
The existing database trigger also copies full_name into the account profile.
Reuses the permanent Supabase user UUID automatically assigned on account creation.
This is a unique account ID, not a short sequential BIL-000001 number.
Adds a My account link in the suite and a signed-in page showing name,
organisation, email and user ID. Existing accounts without these details show
Not provided. Organisation text does not grant membership or record access.
No database migration or environment-variable change is needed.

UPLOAD
1. Unzip this archive.
2. Open https://github.com/timatyeo09-code/profiler-bot and select main.
3. Choose Add file > Upload files.
4. Drag the contents of the unzipped folder into GitHub: login.html,
   index.html, account.html, api, tests and BIL_New_User_Signup_Update.
   Keep the directory structure. Do not upload the ZIP or its outer folder.
5. Review that only these six files are added/updated. Commit the changes.
6. Wait for the Vercel deployment to finish, then refresh the registration page.

If newer changes have been made after commit
6240d80387998045b3eb348f7ba75e6aca4eb75b, compare them before uploading.

VERIFICATION
node BIL_New_User_Signup_Update/test_signup.cjs
node tests/account.mjs
Both passed with mocked services. Tests cover submitted metadata, rejected and
pending requests, email-confirmation and immediate-session flows, redirect
safety, authenticated account details, existing accounts, fixed user identity,
and organisation text rendered safely without changing permissions.
A real signup/email-confirmation round trip and browser visual checks remain
unverified. No live accounts or emails were created during these tests.

After deployment, register one test account with an email you control, confirm
it if requested, and open My account to verify the saved name, organisation
and ID. Sign out and in again to confirm the details persist.
