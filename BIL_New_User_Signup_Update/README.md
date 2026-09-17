# BIL Professional Suite signup addition

Prepared 17 September 2026. This is a proposed replacement login page, not a deployed update or a standalone website.

## Included change

`login.html` retains the public login page's original design, password sign-in, secure email-link option and invitation-code controls. It adds a collapsible “New here? Create an account” section with email, password and confirm-password fields. It uses the existing `BILAuth.state.client.auth.signUp` service. Passwords are not copied into browser storage by the new code. No organisation, subscription or privileged role is assigned by this form.

The addition handles email-confirmation and immediate-session responses, prevents repeated submission while a request is pending, and limits the destination after login to the current origin. The minimum password length in the form is eight characters; the account service's stronger rules, if configured, still apply.

## Source and deployment limitation

The supplied deployment-specific URL returned Vercel's access page. No source repository was available through the connected repository list. This replacement is based on https://profiler-bot.vercel.app/login.html and its public `js/bil-auth.js`, retrieved on 17 September 2026. Its visible layout matches the supplied screenshot. Differences in the protected deployment could not be inspected.

## Apply to the existing project

1. Compare this file against the target deployment's actual `login.html`; preserve any newer changes before replacing it. Keep the existing `js/bil-auth.js`, APIs and backend configuration. Do not deploy this ZIP as a complete application.
2. Confirm email/password signup is enabled in the existing Supabase project, and confirm whether email confirmation is required. This package does not change account-service settings.
3. Allow the deployment's `/login.html` callback URL in Supabase Auth redirect settings and confirm the confirmation-email template and email delivery work.
4. Verify the existing account-provisioning path creates the profile expected by `/api/me` for newly registered users. This code and the database policies were not available for review. Retain existing least-privilege defaults and organisation boundaries; an account must not itself grant access to another organisation's records.
5. Deploy to an authorised preview and test a new email through signup, confirmation, sign-in and access to the intended workspace. Test an existing account, rejected password, invitation code and email-link login. Only then promote through the project's normal release process.

## Checks performed

Local JavaScript tests with a simulated account service passed: email confirmation, immediate session, service rejection, network failure, mismatched passwords, external redirect rejection, form switching and pending-submission protection. No live account was created and no email was sent. Visual browser testing and end-to-end backend registration remain outstanding.

## Reference

Supabase signup interface: https://supabase.com/docs/reference/javascript/auth-signup
