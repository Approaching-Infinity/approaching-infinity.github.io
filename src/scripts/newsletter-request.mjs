import { submitInquiry } from './contact-relay.mjs';

export const newsletterConsent = 'I want to receive Approaching Infinity Notes by email. I can unsubscribe at any time.';
export const newsletterConsentVersion = '2026-10-31';

// A separate, explicit request; the contact form never invokes this helper.
// The existing relay emails the request to the shared inbox, not a mailing list.
export async function submitNewsletterRequest(endpoint, formData, startedAt, transport = fetch, requestedAt = new Date()) {
  if (formData.get('consent') !== 'yes') throw new Error('consent');
  const inquiry = new FormData();
  inquiry.set('name', 'Newsletter signup request');
  inquiry.set('email', String(formData.get('email') ?? ''));
  inquiry.set('category', 'general');
  inquiry.set('website_check', String(formData.get('website_check') ?? ''));
  inquiry.set('message', [
    'APPROACHING INFINITY NOTES — VOLUNTARY SIGNUP REQUEST',
    `Consent: ${newsletterConsent}`,
    `Consent wording version: ${newsletterConsentVersion}`,
    `Request time reported by browser: ${requestedAt.toISOString()}`,
    'Signup page: https://approaching-infinity.github.io/newsletter/',
    '',
    'This is a pending request, not a confirmed subscription.',
    'Team: reply from the shared service inbox and ask this address to confirm.',
    'Record confirmation before adding to the sending roster; check duplicates and prior opt-outs.',
    'Honor unsubscribe replies and requests to service@limitlesslp.com before any subsequent issue.',
  ].join('\n'));
  return submitInquiry(endpoint, inquiry, startedAt, transport);
}

export function newsletterRequestError(error) {
  if (error?.message === 'consent') return 'Please tick the consent box if you want to request the newsletter.';
  if (error?.message === 'too_fast') return 'Please wait a few seconds, then try again.';
  if (error?.message === 'email') return 'Please check your email address, then try again.';
  return 'Your signup request could not be confirmed. Your email is still here. Please retry or email service@limitlesslp.com.';
}
