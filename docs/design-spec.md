# Approaching Infinity — Design Spec

Approved design specification for the Approaching Infinity website at
<https://approaching-infinity.github.io>.

## Purpose and current implementation

This local review extends the existing podcast site into a useful front door for finance, technology and innovation conversations, practical free resources, open learning and connections. It preserves the existing design rather than redesigning it. The October 30 changes await owner review and are not deployed.

Mission areas remain **Ending Poverty**, **Veteran Initiatives** and **Financial Literacy**. Initiatives are in development. No charitable status, audience impact, confirmed events or active payments are claimed.

## Information architecture

- Homepage: existing hero, ticker, content-derived episode counts, episodes, mission, new resource/progress section, host, listen links and separate newsletter.
- `/contact/`: general, guest/collaboration, sponsorship and mission inquiry categories. Intended dual recipients; no auto-subscription.
- `/newsletter/` and `/notes/`: voluntary signup/status and honest empty issue archive.
- `/resources/`: first financial literacy review draft and blank printable worksheet, with dated official sources.
- `/events/`: unscheduled free public learning; no personal calendar.
- `/privacy/`: collection boundaries and direct contact.
- `/support/`: **local review build only**, excluded from default production output. No checkout.

Contact and newsletter forms are native HTML POSTs only when approved hosted endpoints are configured. Unconfigured production mode shows truthful status and direct email for contact. Local review uses an explicitly labeled loopback-only demo, never a fake delivery success.

## Brand tokens

| Token | Value |
| --- | --- |
| Background | `#0A0A0A` |
| Surface | `#131211` |
| Red accent | `#E31B23` |
| Red (hot) | `#FF3037` |
| Text | `#F6F3F1` |
| Muted (warm grey) | `#9C9591` |

Typography:

- **Display:** Avenir Next Condensed / Saira Condensed / Arial Narrow / Oswald / Impact — condensed, heavy, uppercase
- **Body:** system UI sans stack
- **Mono:** for labels and data

## Design decision: single dark theme

The site deliberately commits to a single DARK theme. This matches the brand's black-first identity and the reference site (energy-profits.org) energy. A light theme is a possible later addition, not a launch requirement.

## Compliance requirements

The site copy must respect all of the following:

- Content is **educational / entertainment only**.
- **Not** investment, legal, or tax advice.
- **Not** an offer or solicitation of any security or fund.
- The host is a principal of an investment firm; this is disclosed.
- Guests appear in a **personal capacity** and their views are their own.
- The charitable initiative is **in formation**; nothing on the site is a solicitation of charitable contributions.
- **NO performance or returns language anywhere** on the site.

The full disclaimer lives verbatim in the footer (the canonical disclaimer home) and must not be altered casually.

## Host

Justin Roopnarine — U.S. Air Force veteran, Managing Partner of Limitless Capital.

## Remaining activation gates

- Owner review of public copy, first resource and blank worksheet.
- Existing form/ESP account, exact routing, consent and service/privacy settings identified and approved.
- Authorized real contact test received in both exact inboxes with working Reply-To; separate newsletter confirmed-opt-in, unsubscribe, duplicate and suppression evidence.
- Exact privacy provider/retention details reviewed before collection opens.
- Existing Stripe business/account charge/payout and receipt/refund readiness verified before any payment request.
- Owner release approval before main merge/deployment; post-deploy readback and operator acceptance remain separate.

See `docs/pips/PIP-001-website-front-door.md` and README for local setup and actual validation evidence.
