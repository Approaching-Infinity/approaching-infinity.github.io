import test from 'node:test';
import assert from 'node:assert/strict';
import { submitInquiry, inquiryError } from '../src/scripts/contact-relay.mjs';

test('contact request follows the owned relay contract without browser credentials', async () => {
  const data = new FormData();
  data.set('name', 'Test person'); data.set('email', 'test@example.com');
  data.set('message', 'A useful question'); data.set('category', 'general');
  data.set('unapproved-extra', 'must not be sent');
  await submitInquiry('https://limitlesslp.com/contact-approaching-infinity.php', data, 1234, async (url, options) => {
    assert.equal(url, 'https://limitlesslp.com/contact-approaching-infinity.php');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers['Content-Type'], 'application/json');
    const payload = JSON.parse(options.body);
    assert.equal(payload.ts, 1234); assert.equal(payload.website_check, '');
    assert.equal(payload.email, 'test@example.com');
    assert.equal(payload['unapproved-extra'], undefined);
    return { ok: true, json: async () => ({ ok: true }) };
  });
});
test('HTTP success without relay acceptance never becomes success in the form', async () => {
  await assert.rejects(submitInquiry('https://example.com', new FormData(), 1, async () => ({ ok: true, json: async () => ({ ok: false, error: 'too_fast' }) })), /too_fast/);
  await assert.rejects(submitInquiry('https://example.com', new FormData(), 1, async () => ({ ok: true, json: async () => { throw new Error('not JSON'); } })), /response/);
});
test('timeout and server errors keep retry guidance; rapid send has useful feedback', () => {
  assert.match(inquiryError(new Error('too_fast')), /wait a few seconds/);
  assert.match(inquiryError(new Error('send')), /message is still here/);
  assert.match(inquiryError(new DOMException('timeout', 'TimeoutError')), /retry/);
});
