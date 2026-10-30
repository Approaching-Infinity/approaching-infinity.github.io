// Public hosted form URLs only. Never put mail-service/ESP API keys here.
export function formConfig(env = {}) {
  const review = env.SITE_REVIEW_MODE === 'true';
  if (review && (env.GITHUB_ACTIONS === 'true' || env.CI === 'true')) throw new Error('Review mode is local only; cannot build it in CI.');
  const endpoint = (value, kind) => {
    if (review) return `http://127.0.0.1:4322/submit/${kind}`;
    if (!value?.trim()) return null;
    let url;
    try { url = new URL(value); } catch { throw new Error(`Invalid ${kind} endpoint URL`); }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || host === 'localhost' || host.endsWith('.localhost') || !host.includes('.') || host.includes(':') || /^\d+(\.\d+){3}$/.test(host) || host.endsWith('.local') || host.endsWith('.internal') || [...url.searchParams.keys()].some(key => /secret|api.?key|password|access.?token/i.test(key))) throw new Error(`${kind} requires a public HTTPS hosted form URL without credentials or secrets`);
    return url.href;
  };
  const contact = endpoint(env.CONTACT_FORM_URL, 'contact');
  const newsletter = endpoint(env.NEWSLETTER_FORM_URL, 'newsletter');
  // A URL alone is not permission to collect. Approval follows provider/privacy tests.
  if (!review && ((contact && env.CONTACT_FORM_APPROVED !== 'true') || (newsletter && env.NEWSLETTER_FORM_APPROVED !== 'true'))) throw new Error('Configured forms require explicit provider approval flags. See README.');
  return { review, contact, newsletter };
}
