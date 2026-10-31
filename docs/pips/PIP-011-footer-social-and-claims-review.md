# PIP-011 — Footer social link and factual wording

## Problem and resulting behavior

The footer omitted the show Facebook page. It also asserted a charitable entity status and a universal personal-capacity arrangement for guests that the reviewed source records did not establish.

Add an accessible Facebook icon using the existing official episode-note destination, publicly checked to resolve to Approaching Infinity. Increase footer disclosure/copyright contrast from the faint palette to the existing muted palette; the original small text measured 3.45:1 against the dark background. Replace those unsupported assertions with the factual statements that guest views are their own and mission work is in development. Retain the educational-use and no-charitable-solicitation language.

## Scope

Footer component only; shared across site routes. Existing forms, recipients, newsletter confirmation, payment state, episode content and assets remain unchanged. This release excludes the separate local three-pillar roadmap and episode-list spacing work.

## Validation

Existing 18 tests pass. Default and activated builds, generated archive checks and owned-form guards are checked. Desktop and narrow-width footer rendering and the actual public deployment must be verified before calling this live. No new test suite or dependency is needed for this bounded content/link change.

## Editorial acceptance

Website review remains ongoing with the owner and Maria. A published footer correction is not confirmation of program outcomes, a campaign, a public event, donations, nonprofit registration or newsletter delivery.
