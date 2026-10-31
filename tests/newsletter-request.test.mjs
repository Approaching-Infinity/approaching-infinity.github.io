import test from 'node:test';
import assert from 'node:assert/strict';
import { submitNewsletterRequest, newsletterRequestError, newsletterConsent } from '../src/scripts/newsletter-request.mjs';

function data(consent = 'yes') {
  const form = new FormData(); form.set('email', 'reader@example.com');
  if (consent) form.set('consent', consent);
  return form;
}
test('newsletter request cannot send without separate affirmative consent', async () => {
  let calls = 0;
  for (const consent of ['', 'no', 'on']) await assert.rejects(submitNewsletterRequest('https://example.com', data(consent), 100, async () => { calls++; }), /consent/);
  assert.equal(calls, 0);
});
test('newsletter request reuses bounded contact fields and retains exact consent evidence', async () => {
  const form = data(); form.set('category', 'sponsor'); form.set('message', 'Untrusted replacement'); form.set('website_check', '');
  await submitNewsletterRequest('https://limitlesslp.com/contact-approaching-infinity.php', form, 100, async (url, options) => {
    assert.equal(url, 'https://limitlesslp.com/contact-approaching-infinity.php');
    assert.equal(options.credentials, 'omit');
    const body = JSON.parse(options.body);
    assert.equal(body.email, 'reader@example.com'); assert.equal(body.category, 'general');
    assert.equal(body.name, 'Newsletter signup request'); assert.equal(body.ts, 100);
    assert.ok(body.message.includes(newsletterConsent));
    assert.match(body.message, /Consent wording version: 2026-10-31/);
    assert.match(body.message, /browser: 2026-10-31T12:00:00.000Z/);
    assert.match(body.message, /pending request, not a confirmed subscription/);
    assert.match(body.message, /Signup page: https:\/\/approaching-infinity.github.io\/newsletter\//);
    assert.ok(!body.message.includes('Untrusted replacement'));
    assert.ok(body.message.length < 3000);
    return { ok: true, json: async () => ({ ok: true }) };
  }, new Date('2026-10-31T12:00:00Z'));
});
test('request provenance is the rendered canonical page and cannot be an arbitrary URL', async () => {
  let calls = 0;
  await submitNewsletterRequest('https://example.com', data(), 100, async (_url, options) => {
    calls++;
    assert.match(JSON.parse(options.body).message, /Signup page: https:\/\/approaching-infinity.github.io\/\n/);
    return { ok: true, json: async () => ({ ok: true }) };
  }, new Date('2026-10-31T12:00:00Z'), '/');
  for (const path of ['https://evil.example/', '/contact/', '/newsletter/?email=reader@example.com']) {
    await assert.rejects(submitNewsletterRequest('https://example.com', data(), 100, async () => { calls++; }, new Date(), path), /source/);
  }
  assert.equal(calls, 1);
});
test('honeypot reaches the relay and a refused request never resolves as success', async () => {
  const form = data(); form.set('website_check', 'bot');
  await assert.rejects(submitNewsletterRequest('https://example.com', form, 100, async (_url, options) => {
    assert.equal(JSON.parse(options.body).website_check, 'bot');
    return { ok: false, json: async () => ({ ok: false, error: 'spam' }) };
  }), /spam/);
});
test('newsletter failure guidance avoids claiming a subscription', () => {
  assert.match(newsletterRequestError(new Error('consent')), /consent box/);
  assert.match(newsletterRequestError(new Error('too_fast')), /wait/);
  assert.match(newsletterRequestError(new Error('email')), /email address/);
  assert.match(newsletterRequestError(new Error('send')), /could not be confirmed/);
});
