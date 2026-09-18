BIL owner dashboard: organisation and user ID update

UPLOAD TO owner-dashboard BRANCH ONLY
https://github.com/timatyeo09-code/profiler-bot/tree/owner-dashboard

Unzip, choose Add file > Upload files on that branch, and drag the contents
of the unzipped folder (not the outer folder or ZIP) into GitHub. Commit to
owner-dashboard and wait for its Vercel deployment to become Ready.
Refresh the existing owner dashboard URL afterwards.

The user directory shows the signup organisation when no managed organisation
is assigned. If assigned and signup names differ, both are shown. The existing
permanent Supabase user ID appears beneath each user's email and can be searched.
The organisation filter and organisation totals remain based on assigned
membership; searching finds both assigned and signup organisation names.
No membership, role or data-access permission is granted by entered text.

The owner-only server endpoint uses the existing SUPABASE_SERVICE_ROLE_KEY
to read organisation_name from Auth metadata. Only that display field is added
to the report; raw Auth admin records never reach the browser. No database
migration or new secret is required. If the metadata lookup fails, the existing
report still loads and a refresh warning is shown.

This branch's registration form also now collects Full name and Organisation,
saving the same metadata as the main-site registration update. Existing users
keep their permanent IDs. Missing historical organisations cannot be recovered
from a form that did not collect them; those users show Not provided.

Tested locally using mocked services: pagination, owner-only access, rejection
of non-owners, preservation of membership, ID display, escaped text, search,
metadata lookup failure, existing reporting checks and registration flows.
Run: node --test tests/owner-registration.mjs tests/owner-reporting.mjs
Run: node tests/registration-form.cjs
Live authenticated testing remains to be completed after deployment.

Prepared against owner-dashboard commit:
6995708 (verify newer changes before replacing files).
GitHub's connected app previously refused write access, so this ZIP is prepared
for manual upload and has not been deployed by the assistant.
