import { formConfig } from './forms.mjs';
// Server-only build environment; never import this module from a client script.
// This module is imported only by server-rendered frontmatter, never client scripts.
export function siteForms() {
  return formConfig({
    SITE_REVIEW_MODE: process.env.SITE_REVIEW_MODE,
    CONTACT_FORM_URL: process.env.CONTACT_FORM_URL,
    CONTACT_FORM_APPROVED: process.env.CONTACT_FORM_APPROVED,
    NEWSLETTER_FORM_URL: process.env.NEWSLETTER_FORM_URL,
    NEWSLETTER_FORM_APPROVED: process.env.NEWSLETTER_FORM_APPROVED,
    CI: process.env.CI,
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
  });
}
