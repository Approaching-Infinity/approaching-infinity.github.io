export async function submitInquiry(endpoint, formData, startedAt, transport = fetch) {
  const fields = ['name', 'email', 'category', 'organization', 'url', 'message', 'website_check'];
  const body = Object.fromEntries(fields.map(key => [key, String(formData.get(key) ?? '')]));
  body.ts = startedAt;
  const response = await transport(endpoint, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error('response'); }
  if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || 'send');
}

export function inquiryError(error) {
  if (error?.message === 'too_fast') return 'Please wait a few seconds, then try sending again.';
  if (['name', 'email', 'message', 'category', 'organization', 'url', 'invalid', 'payload'].includes(error?.message)) return 'Please check your name, email and message, then try again. Keep the message within 3,000 characters.';
  return 'Your inquiry could not be confirmed. Your message is still here. Please retry or email the team below.';
}
