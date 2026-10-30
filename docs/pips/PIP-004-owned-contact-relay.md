# PIP-004 · Owned Approaching Infinity contact delivery

Status: implementation and review in progress, October 30, 2026. Owner approved live contact routing to service@limitlesslp.com and Maria; service is the dedicated operations/AI inbox and intended newsletter sender.

The existing firm website already has a first-party PHP mail relay. A separate contact-approaching-infinity.php endpoint reuses the same existing Hostinger mail transport and fixed service/Maria recipients; the firm contact.php is preserved. This replaces the FormSubmit trial whose CAPTCHA rendered blank. The trial was never enabled on the public site.

Frontend: exact endpoint selects a small JSON client with credentials omitted, timeout, form validation, honeypot and render timestamp. Failure preserves user input and provides retry/email guidance; success says submitted, not an assurance of inbox arrival. JavaScript-disabled browsers have a direct email fallback.

Backend: exact production Origin, narrow OPTIONS preflight, bounded JSON body, field/URL/header checks, fixed recipients, no credentials/uploads/persistence/request-body logs, minimum3second gate. A mail accepted result is distinct from actual delivery. Backend PIP and tests live in its owning repository.

Acceptance: nine frontend behavior/transport tests, static builds and independent review; backend validation/mail and CORS tests; backend CI/deployment; a uniquely labeled actual email received in service and Maria's visibility verified where available; then enable endpoint configuration, publish frontend and test the public browser flow. No newsletter send or payment is implied.

Rollback: unset CONTACT_FORM_APPROVED/URL and redeploy to restore direct email fallback. Revert only the dedicated backend endpoint release if needed; do not alter the existing firm's contact relay or unrelated applications.
