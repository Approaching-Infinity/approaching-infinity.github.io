# Approaching Infinity — Design Spec

Approved design specification for the Approaching Infinity website at
<https://approaching-infinity.github.io>.

## Purpose

A podcast landing page that ALSO seeds a forthcoming charitable mission. The site has a dual goal:

1. **Listen & grow** — get visitors into the show (episodes, platforms, newsletter).
2. **Seed the nonprofit** — introduce the charitable mission early so the audience grows up with it.

## Mission

Three pillars:

1. **Ending Poverty**
2. **Veteran Initiatives**
3. **Financial Literacy**

The charitable initiative is **in formation**. It is not yet a registered nonprofit, and the site does NOT solicit donations.

## Information architecture

A single long-scroll page, in this order:

1. **Header** — sticky nav
2. **Hero** — show identity + primary CTA
3. **Ticker** — scrolling marquee strip
4. **Stats** — headline numbers
5. **Episodes** — rendered dynamically from the `episodes` content collection (4 highest-numbered)
6. **Mission** — the 3 charitable pillars
7. **About the host**
8. **Listen** — platform links + Linktree hub
9. **Newsletter** — signup form
10. **Footer** — the canonical disclaimer home

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

## Open items / next steps

- [ ] Replace placeholder episodes and guest roles with real bookings
- [ ] Add a real Open Graph share image
- [ ] Wire real platform and social URLs (currently the Linktree hub placeholder)
- [ ] Optional: custom domain (e.g. a `.org` for the nonprofit) via a `public/CNAME` file
- [ ] Optional: light theme
- [ ] Real newsletter form backend
