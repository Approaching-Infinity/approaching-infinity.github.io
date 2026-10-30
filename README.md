# Approaching Infinity website

Static Astro site for thoughtful conversations on finance, technology and innovation, practical resources, free learning and connections. The Financial Literacy, Veteran Initiatives and Ending Poverty mission areas are in development. No charitable status or completed impact is claimed.

## Local preview

Use Node 22, matching CI. Main pushes automatically deploy to GitHub Pages; keep this work local until release approval.

```bash
npm ci
npm test
npm run build
npm run build:review
npm run check:builds
npm run review
```

Open http://127.0.0.1:4321/. The review build is separate in `dist-review/` (ignored by git). A clearly labeled review banner links the support draft; that route is **excluded** from the ordinary production build. Review mode refuses CI builds.

The review server binds only `127.0.0.1`: static site on 4321 and demo native form handler on 4322. Use **fictional values only**, `demo@example.com` to pass or `fail@example.com` to exercise a simulated provider failure. Other email domains are rejected. Native required/email/length validation runs before POST; the demo also checks categories, lengths, duplicate fields and a honeypot. The response contains no echoed field values, no success claim about delivery and no subscription claim. Nothing is persisted or emailed; request bodies are not logged. Stop both servers with Ctrl-C. No external accounts, keys, purchases or subscriptions are needed.

## Hosted form integration (not activated)

Default `npm run build` has no contact collection form and no newsletter collection form. It shows a truthful contact status with a direct email link, and a newsletter-not-open status. Email links open the visitor's mail client; they are not evidence of delivered mail. Destinations are intended to be Justin `jroopnarine@limitlesslp.com` and Maria `msison@limitlesslp.com`; dual receipt remains unverified.

Once an existing hosted provider and costs are approved, configure shell/CI build-time environment variables (the server-only reader uses `process.env`; it does not load an `.env` file). **These are public HTML POST URLs, never secret API keys.** Astro/GitHub Pages is static; the provider must accept native `application/x-www-form-urlencoded` POSTs and perform its own validation, spam controls and result/confirmation flow.

| Variable | Use |
| --- | --- |
| `CONTACT_FORM_URL` | Approved hosted contact form HTTPS action |
| `CONTACT_FORM_APPROVED=true` | Owner/operator confirms provider, routing and privacy release gate |
| `NEWSLETTER_FORM_URL` | Approved ESP's hosted native signup HTTPS action |
| `NEWSLETTER_FORM_APPROVED=true` | Owner/operator confirms separate confirmed-opt-in and privacy release gate |
| `SITE_REVIEW_MODE=true` | Local review only; never set in deployment |

Unapproved, credential-bearing, non-HTTPS, local/IP-literal endpoints and obvious secret query parameters fail configuration. Validation cannot tell whether an arbitrary URL hides a credential in its path: do not paste service API URLs or secrets. Only HTML action URLs belong here. Flags record operator approval; they do not prove delivery.

Contact fields: `name`, `email`, `category` (`general`, `guest`, `sponsor`, `mission`), optional `organization`, optional `url`, `message`, honeypot `website_check`. Newsletter fields: `email`, required `consent=yes`, honeypot `website_check`. No contact consent field exists and no automatic enrollment is implemented. If the approved service needs different names/hidden public form IDs, adapt those fields explicitly from its embed instructions; do not guess provider compatibility. Endpoint configuration does not create recipient routing, From/Reply-To settings, CAPTCHA or an ESP list.

Before setting approval flags, update `/privacy/` with the exact provider, applicable processing and retention/deletion details. Verify service-owned authenticated From, visitor Reply-To, all categories reaching **both** inboxes, provider-side spam and validation, error/retry behavior and real authorized receipts. Newsletter separately needs sender identity, postal address, confirmed opt-in, duplicate handling, unsubscribe and suppression tests. The provider must show pending/confirmation and error states; no local static thank-you page claims delivery. No external test send has been authorized/performed in this implementation.

## Content and review

- `/resources/month-ahead/`: first financial literacy article, **Review Draft**; publication date unset.
- `/resources/bill-calendar-worksheet/`: blank original worksheet; browser Print / save as PDF supported. It sends no financial data.
- `/events/`: public event status only, no fabricated date or personal booking calendar.
- `/notes/`: honest empty archive; add real issues after publication.
- `/support/`: local review only, no checkout. Existing Stripe entity/account, charge/payout readiness, destination, receipt/refund terms and exact request require verification and owner approval. Business support is not represented as a charitable donation or tax-deductible.

Draft article/worksheet source was copied from the October 30 editorial reports. The internal review appendix is excluded. Article and worksheet have reciprocal route links and official CFPB sources. Updates should preserve draft/date/source labels and distinguish outputs from measured outcomes. Owner editorial review precedes publication.

## Build and release

`npm run build` creates static output in `dist/`; no server or API keys ship. Shared canonical and Open Graph URLs derive from the current route and configured `site` URL. Node 22 PR workflow runs install, behavior tests and production build. Episode RSS synchronization remains unchanged. Refresh from current main and rebuild before any approved merge because automated episode additions may advance it.

The inherited Astro 5 dependency tree has npm advisories, including [AVIF optimization RCE](https://github.com/advisories/GHSA-26w7-cxv4-gfx2). The advisory requires processing an attacker-supplied AVIF. This site does not use Astro image optimization or accept uploads, and the local preview serves built files without Astro's dev server. This limits that specific exposure; it does not make the dependency tree advisory-free. npm's Astro fix is a major upgrade to 7; no forced major update is bundled into this front-door change. Review dependency remediation separately before introducing untrusted build content, image processing or server rendering. See `docs/pips/PIP-001-website-front-door.md` for actual evidence and remaining gates.

Owner approval remains required before merge/push to main, production deployment, live collection activation or payment activation. No commit, PR, push, merge or deployment is included in this local preview work.
