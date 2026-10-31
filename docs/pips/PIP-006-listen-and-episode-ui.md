# PIP-006 · Platform picker and source-grounded episode archive

Status: implementation verified; owner explicitly authorized publication October 31, 2026. TASK-0089. Release evidence is recorded in the task packet and workspace reports/archive-release-2026-10-31. No message or newsletter campaign is part of this release.

## Problem and result
The listening section had an orphan grid cell, incorrect Apple glyph and misleading Amazon caption. Owner selected actual displayed option3balanced2×2. Four semantic whole-card links now use real local brand/library assets, preserved destinations, accurate captions, quiet hub and visible keyboard focus. Two desktop columns/one below640px, no runtime CDN/dependency.

Archive titles alone did not explain the value of each conversation. A shared row now shows optional grounded Why listen copy and appropriate images. All35current records have a question and visual treatment:27interview episodes,2solo and6external guest appearances. Six bonus rows and detail pages explicitly credit Justin as guest and the original show/host, with actual publisher show artwork. Solo1–2use Justin. Two-person episode12uses both portraits. Zera episode23uses exact show-owned group episode artwork. Giulio episode4uses current actual Approaching Infinity logo because correct old sources are unavailable; never represents a guessed face.

## Evidence and content
All35questions independently audited against current primary publisher RSS descriptions:26retained,5added,4refreshed; original approved4exact. Full authored notes refreshed with paragraph/list boundaries preserved, fixing stale/truncated descriptions and concatenated social links. Joe affiliation updated to Cowboy Capital and Josh title credits The Thoughtful Entrepreneur; slugs/player sources/dates preserved.33records match exact decoded audio URL; Willard/Jeff matched distinct full title/person/topic. docs/episode-editorial-audit.json contains excerpts/sourceGUID/URL/hash/confidence. Description grounding is not full audio/transcript verification or a promised outcome.

Source photos/covers are actual images; no generated faces. docs/guest-portrait-sources.json records original and delivery hashes/provenance. Public repository contains only35compact304px WebP sources; full originals retained locally outside git. No private Drive IDs/local paths in publication provenance. Shared build resolver accepts only schema-bounded local asset refs; missing file fails build. Crop/zoom bounded; actual art contains rather than cropping publisher logos. Multi-person image treatment and number-only fallback remain supported for future unaudited feed additions.

## Verification
18behavior/editorial tests,45-page default,46-page review and activated production build passed. Generated safety checks cover separate contact/newsletter consent/pending/privacy/canonicals; delivery unchanged. Archive check verifies35links/questions,36image instances/35optimized assets,6external credits, exact alt metadata and compact asset ceiling. PR CI runs tests/default/archive/activated form checks on existing Node22.23.4; review mode and cross-mode checks run locally because the existing security guard intentionally prohibits review builds in CI. Initial CI caught the mistakenly added review step; it was removed without weakening that guard. Local runtime26.0.0. Remote CI/release recorded separately after execution.

Supported IAB:1280desktop/390phone, loaded assets, no horizontal overflow, keyboard focus, bonus Enter navigation, visible long detail notes and empty console-error logs. Combined approved/current full and focused comparison plus all35image crop sheet; design-qa.md passed. Independent read-only review found no actionable release blocker. Earlier long-list reveal/mobile rule/crop bugs fixed; long detail prose likewise no longer depends on tall-element reveal threshold.

## Release and rollback
Owner publication authorization is explicit. Use existing configured Pages workflow; verify exact merged revision and actual public archive/picker/credits/form controls afterward. Forms/backend/accounts/SMTP/Stripe/taxes unchanged; no email or newsletter send. Source portraits are attributed public professional assets, without claiming a broad reuse license or endorsement. No new package dependency.

Rollback uses a revert of the release merge/commit through the same Pages workflow. Original working checkouts are untouched; isolated codex/listen-episodes-ui-20261031. Optional visual/question absence remains clean for future feed additions; no fabricated fallback identities.
