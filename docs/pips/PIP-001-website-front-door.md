# PIP-001 — Website front door

**October 30, 2026 · Local implementation; owner/operator review pending.**

The existing Astro site now has a working local preview for resources, contact, voluntary newsletter, public events, progress and a review-only support draft. No real inquiry/subscription has been delivered, no payment is active, and nothing has been pushed, merged or deployed. The source checkout in `/Users/jrjus/Documents/Development/approaching-infinity.github.io` was not edited.

- Base: `67d72cf187b56f82774278e866d284cdc54de7be`, isolated `codex/ai-website-preview` worktree.
- Preview: http://127.0.0.1:4321/ (loopback-only static server); demo POST handler on 4322.
- Article and blank worksheet: Review Draft, publication date unset, internal editorial appendix excluded.
- Production fallback: no collection forms; truthful status plus direct team email. Support draft absent from default output.
- Remaining live gates: provider/recipient/consent/privacy evidence, editorial approval, payment readiness, release approval and operator acceptance.

## Scope and design decision

Preserve the current black/red/white identity, display type and system body type. Tokens: background `#0A0A0A`, surface `#131211`, accent `#E31B23`, hot accent `#FF3037`, text `#F6F3F1`, muted `#9C9591`. No redesign or new visual library. Extend existing left-aligned editorial sections with clear content headings, thin dividers and native fields. Keep the infinity hero as the memorable element; resource pages prioritize readable text and usable tables.

```
Existing header
  Episodes | Resources | Mission | Events | Contact | Newsletter
Homepage conversations → mission → practical resource/progress → listening → voluntary signup
Resource index → first walkthrough ⇄ private blank worksheet
Contact → provider result (local demo for review only)
Newsletter → provider opt-in (local demo for review only)
```

The frontend-design skill was applied against the explicit preserve-style brief. The added routes reuse brand tokens and no account/CMS/payment stack was introduced. Public copy uses one umbrella: finance, technology and innovation, with practical resources, free learning and connections. Quant/AI/family-office guest criteria remain outside the public positioning. The existing footer educational/host-affiliation/initiative-in-formation disclaimer remains verbatim. Feed count is labeled “Episodes & appearances”; the inherited guest-metadata count was replaced with “Free / Resources & public learning” because it did not establish a unique guest count.

## Implementation

| Area | Files and result |
| --- | --- |
| Shared shell | `Header.astro`, `Footer.astro`, `Layout.astro`, `global.css`: stable navigation, route-derived canonical/og URLs, skip link, focus styles, hidden closed mobile nav, Escape close, reduced motion and no-JS content fallback |
| Positioning | `Hero.astro`, `Mission.astro`, `About.astro`: consistent umbrella and explicit developing mission status; no outcome, audience or partnership claims |
| Contact | `ContactForm.astro`, `/contact/`: native POST, name/email/category/message and optional organization/URL; no newsletter consent/enrollment; direct intended dual email link |
| Newsletter | `Newsletter.astro`, `/newsletter/`: distinct required voluntary consent, native POST, no subscribed claim; h1 standalone/h2 homepage |
| Public resources | `/resources/`, `/resources/month-ahead/`, `/resources/bill-calendar-worksheet/`, `ResourceLayout.astro`: source-linked draft, fictional example, blank private worksheet, print/save-PDF and keyboard-scrollable tables |
| Progress/events/archive | `Progress.astro`, `/events/`, `/notes/`: dated preparation status, no fabricated event date, no personal calendar, honest empty newsletter archive |
| Privacy | `/privacy/`: collection boundaries, no worksheet upload, contact/newsletter separation, direct deletion-question route; exact provider/retention details must be finalized before live collection |
| Support draft | `[reviewPage].astro`: `/support/` generated only in local review mode; business-support boundaries and sponsorship inquiry, no checkout/link, no charitable deduction claim |
| Integration | `forms.mjs`, server-only `site.ts`: explicit process environment values; approval flags; invalid/unapproved action fails build; no credentials shipped |
| Harness | `scripts/review-server.mjs`: loopback static server and native form demo, fictional example-domain emails only, no storage/email/forwarding; fixed non-reflective response content |
| Checks | `tests/forms.test.mjs`, `scripts/check-builds.mjs`, PR check workflow: useful config/consent/validation checks and actual generated-output mode assertions; Node22 CI install/test/build |

## Form configuration and safe demo

`npm run review` builds `dist-review/` then starts the local servers. Use `demo@example.com` to pass and `fail@example.com` to test failure/retry. Other email domains are rejected. No participant data should be entered. The result says only that fictional demo fields were checked; no delivery, consent confirmation or subscription is claimed. Both ports bind `127.0.0.1`, the handler enforces the exact local Origin, limits bodies, checks required/category/length/URL fields, rejects duplicate/unexpected fields and the honeypot, logs no body, and saves no submissions.

`npm run build` produces `dist/` without review pages or demo actions. An approved native hosted contact endpoint and separate approved ESP action can later be configured using `CONTACT_FORM_URL` / `CONTACT_FORM_APPROVED=true` and `NEWSLETTER_FORM_URL` / `NEWSLETTER_FORM_APPROVED=true`. Use shell/CI environment variables (not client `PUBLIC_` keys); see README for field contract. The endpoint itself cannot configure dual recipients, authenticated From/Reply-To, provider spam rules or confirmed opt-in. Flags record approval, not proof of delivery.

Initial generic `import.meta.env` forwarding did not preserve the private review flag in this Astro build. Browser review caught the failure before release; it was corrected to explicit server-only `process.env` access and tested against actual output. A generated-HTML regression check now requires demo actions/banner/support in review and their absence in unconfigured production. No fake form-success patch was used.

## Verification record

- `npm ci` and baseline `npm run build`: passed before edits, 37 existing pages. Inherited audit findings recorded below.
- `npm test`: 6 behavior tests pass under local Node26 and Node22 runtime (observed downloaded Node `v22.23.4`, no system runtime changed).
- Production build: passed, 45 pages; local review build: passed, 46 pages including support.
- `npm run check:builds`: passed against both generated outputs, including banner/noindex, native POST actions, contact no-consent, support exclusion, route canonical URLs, reciprocal article worksheet link and private appendix exclusion.
- Node22 production build passed, matching CI's major Node version.
- Fresh live curl confirmed the review banner, contact native POST to `127.0.0.1:4322`, and the review support page.
- Live loopback HTTP checks passed: contact accept → simulated failure → retry; newsletter consent required and accepted separately; honeypot, foreign Origin and oversized request rejected. No request went to an external provider.
- Actual CI + review build was rejected with the local-only error; actual unapproved endpoint build was rejected with the approval-flags error. These negative builds use separate temporary output paths.
- Browser/mobile/print evidence and independent review: recorded in the final review addendum below as completed; owner/operator acceptance remains pending.

## Dependency advisories and limits

The untouched inherited dependency tree (`astro@5.18.2`, `sharp@0.34.5`, `vite@6.4.3`) reports 13 npm advisories: 1 low, 11 high, 1 critical (audit obtained October 30). npm's Astro fix requires a major move to 7; no forced major upgrade or unrelated lockfile churn is bundled into this preview.

The [Astro AVIF RCE advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) states exposure requires processing an untrusted AVIF. This source has no Astro Image/Picture/AVIF optimization, upload facility, SSR/server islands, JSX/MDX or view-transition feature usage. The preview serves prebuilt static files instead of Astro's dev server. These observations limit the identified critical execution path; they are not a claim that all inherited dependencies are safe or patched. Remote/untrusted content must not be passed into a new image/build processing path without dependency remediation. Schedule the major dependency upgrade as a separate reviewed task before those capabilities expand.

## Acceptance and release gates

| State | Evidence still required |
| --- | --- |
| Local code | Implemented; final browser/render and independent review recorded below |
| Editorial | Justin review of matching website/LinkedIn copy, financial article, worksheet and support request; publication date set only after actual publication |
| Contact live | Approved current hosted endpoint and costs; provider/privacy/retention details; all categories reach `jroopnarine@limitlesslp.com` and `msison@limitlesslp.com`; actual authorized unique test in both inboxes; authenticated From, working Reply-To, failure/retry and spam evidence |
| Newsletter live | Existing approved ESP/list, sender/postal/reply/authentication setup; separate confirmed opt-in, duplicate handling, unsubscribe and suppression proof; no CRM/guest/contact imports by default |
| Public session | Presenter, capacity, topic/date/time/join instructions confirmed before listing; free general learning, no personal calendar |
| Support live | Existing entity/Stripe account match, charge/payout state and destination, receipt/refund arrangements, specific work/costs, owner-approved request; no checkout until these pass |
| Release | Refresh current main/RSS additions and rebuild; owner go before main merge because it auto-deploys; actual deployment/page readback and operator acceptance afterwards |

No purchase, provider signup, external email/test send, CRM import, payment setup or production mutation was performed. Technical implementer owns this local draft only; Maria triage/publishing and Justin release roles remain review decisions, not silently assigned commitments.

## Final review addendum

Independent source/output review passed after the environment fix and standalone newsletter h1 correction: 45 production / 46 review routes; no broken internal links, canonical/og mismatch, private-link token or internal appendix leak. Report: `/Users/jrjus/Documents/ChatGPT/Approaching Infinity/research/website-preview-independent-review.md`. No remaining local-preview code blocker reported.

Lead Chrome/CUA UI readback passed: `fail@example.com` produces the explicit simulated contact failure and retry link; retry with `demo@example.com` validates a fictional sponsor inquiry and says nothing is stored/emailed and no subscription exists. Newsletter submission with consent unchecked is blocked by native browser validation (“Please check this box”); checking voluntary consent allows the demo POST, which still says no subscription exists. Homepage/contact/newsletter copy readback was consistent. These checks exercise local demo behavior only; they do not prove real delivery, provider consent records or production behavior.

Implementer Playwright UI check passed: blank contact submission stays on the contact route and focuses the required name field; filling fictional required fields produces the fixed local demo result. Live HTTP checks cover simulated fail/retry, newsletter consent, spam, oversized body and foreign Origin. Lead article mobile check at 390×844 reported body width 390 with no page overflow. Lead caught the inherited browser button background on the new print button; explicit transparent `.btn-ghost` background corrected it. Implementer final worksheet mobile check at 390px confirmed body width 390, print text `rgb(246, 243, 241)` against transparent dark background, and both keyboard-focusable table regions at 350px with 620px scroll content. Long blank lines now wrap within the page.

The final browser-produced worksheet PDF was rendered and inspected: `output/playwright/worksheet-print.pdf` (3 pages with 12mm print margins). Bill list, six-row/42-cell calendar and follow-up are readable; the short final education disclaimer continues on page 3. Calendar underscores are escaped in Markdown so literal write-in blanks survive rendering rather than becoming empty emphasis tags. The PDF and mobile screenshots remain ignored local review artifacts, not a public binary download pipeline. No worksheet data was entered or collected.

Final Node22 production build (45 pages) and review build (46 pages) passed after those fixes, as did `npm run check:builds` and `git diff --check`. Source checkout status remained clean. No additional functional changes were made after those checks.

Next action: owner reviews the local preview and content, then identify the existing hosted provider configuration before requesting live activation.

## Lead final verification and local checkpoint

Lead final CUA readback verified mobile contact navigation closes after selecting a destination, and article/contact/worksheet pages have 390px body width at a 390px viewport. The corrected print button has transparent background and text rgb(246,243,241); its label is visibly readable. Literal calendar write-in blanks appear in the rendered worksheet. Desktop viewport was restored and the resource page left open for owner review. Screenshot: workspace research/preview-evidence/financial-literacy-preview.png.

Native managed worktree creation could not target the separate source repository from this chat's permitted workspace roots. A manual Git worktree was used inside this chat workspace instead, on codex/ai-website-preview from current origin/main. No source checkout files were changed.

A local Git checkpoint follows these checks. It is for review and durability only; no branch push, PR publication or main release is authorized or performed here. Exact commit identity is recorded in TASK-0085 results and Git history.
