# PIP-005 · Visible contact and newsletter signup requests

Status: implemented locally October 31, 2026; release and operator verification pending.

The owner requested obvious Contact us and newsletter signup before Maria's update. Keep the existing GitHub Pages site, hosted contact relay and shared service inbox. No new provider, database, API key, SMTP credential, user or paid plan.

## User flow

Header and homepage link to Contact us and Join newsletter. Newsletter asks only email plus a separate, required, initially unchecked consent box. The exact approved relay URL enables a JSON handler; other configured providers retain their existing native POST flow. The contact form has no newsletter consent/enrollment field.

The newsletter handler wraps the address in a fixed contact request. It records consent wording/version, source page and browser-reported time in the email to the shared service inbox (Maria Cc remains incidental). It forwards the existing honeypot and minimum wait. No user-provided recipient/subject/header, unbounded field, new backend route or subscriber database. Failure preserves the form. Acceptance means submitted, not confirmed subscriber or Inbox placement. JavaScript-disabled readers can send an explicit signup-request email themselves.

## Manual operating process — before a newsletter send

1. Review the request in service@limitlesslp.com. Treat it as **pending**. Do not add contact inquiries, guest contacts or event participants.
2. Reply from the shared inbox asking the requester to reply with confirmation that they want Approaching Infinity Notes. This verifies mailbox control; a form checkbox alone does not.
3. Preserve the original request and confirmation thread. Maintain one record per normalized email in a private sending roster with request/confirmation dates, source and status. Do not put addresses in this repository.
4. Process opt-outs received by reply or service email. Mark suppressed before any further issue; preserve the address and opt-out date only as needed to avoid re-enrollment. A duplicate request is not renewed permission for a previously opted-out address; seek fresh confirmation.
5. Before any authorized campaign, reconcile roster against suppression, verify postal/footer and functioning unsubscribe handling, test received rendering and mail-merge behavior, and obtain issue/send authorization. This implementation does not establish campaign readiness or send an issue.

## Acceptance and rollback

Verify separate consent prevents a request, fixed request body/email transport contract, retry errors, existing tests and production/review builds. After reviewed release, configure NEWSLETTER_FORM_URL to the existing owned relay and NEWSLETTER_FORM_APPROVED=true, deploy and submit one authorized test in the public browser. Read the exact request in the shared inbox; label it TEST ONLY and do not treat it as a real subscription. End-to-end ownership confirmation/opt-out and Maria runtime remain separate operator checks.

Rollback: unset newsletter URL/approval and redeploy to restore the truthful not-open state. Contact configuration and endpoint remain unchanged.
