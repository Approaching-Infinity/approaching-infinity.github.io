# Resource and Episode Usability Implementation Plan

For agentic workers: execute the two bounded tasks with isolated sub-agents, then a fresh combined spec/quality review.

**Goal:** Make the existing bill worksheet directly usable and restore the three latest episode presentations.

**Architecture:** Keep Astro static deployment. Browser-only planner reuses pure functions from the local prototype with scoped rendering/print styles. Episode enrichment uses the existing curated metadata fields; feed sync reports omissions for editorial review.

**Tech Stack:** Existing Astro, JavaScript modules, CSS, Node test runner; no dependencies added.

**Spec:** docs/superpowers/specs/2026-11-16-resource-and-episode-usability.md

## Global Constraints

- Preserve existing URLs, black/red identity, contact/newsletter behavior and earlier episode credits.
- No new tools, subscriptions, storage, network submissions or analytics; no financial advice/affordability claims.
- Live deployment remains separate from this local review. User Review pending.
- Approved opening copied verbatim from spec. Existing worksheet route retained.

## Review Focus

- Partial/invalid/estimated amounts: totals must not imply certainty or available cash.
- Changed months/cross-month dates: keep original entered dates, do not silently reschedule bills.
- Blank versus completed print: no current financial entries in blank copy.
- Replacing entries with fictional demo: no silent loss of existing work.
- Guest portrait identity/crops and question grounding: official source and actual descriptions; no inferred quote or guarantee.

### Task 1: Fillable resource and direct discovery

Files: replace src/pages/resources/bill-calendar-worksheet.md with .astro; add scoped BillPlanner component, browser script and pure helper module as appropriate; modify resources/index.astro, resources/month-ahead.md, ResourceLayout.astro, Hero.astro, Progress.astro; add meaningful helper tests in tests/*.test.mjs. Do not edit episode metadata, workflow files or package dependencies.

Interfaces: existing worksheet URL, optional #example and #print anchors; current ResourceLayout and site tokens. Agent chooses small focused filenames and records them.

- [x] Verify baseline tests, reuse/read prototype core and safe renderer.
- [x] Test amount/date/print-model edge cases that protect the user's interpretation.
- [x] Implement resource-first UI, approved copy, optional example and print views, private memory-only state.
- [x] Run scoped tests/build and self-review desktop/mobile implementation; report exact tests and unverified browser limits.
- [x] Commit only Task 1 files, report commit and source/behavior notes.

### Task 2: Episodes 30–32 and future completeness reporting

Files: only three src/content/episodes/approaching-infinity-s1e3[012]*.md frontmatters; images in src/assets/guests; append docs/episode-editorial-audit.json with verified source evidence; add a small metadata check script and existing check/sync workflow steps; no planner/page/layout edits or package dependency changes.

Interfaces: episodeVisuals JSON line, listenerQuestion JSON string and guest string supported by existing content schema and EpisodeRow. New reporter defaults to nonblocking warning/summary for uncurated imports. Do not alter RSS identity/title/body/date/audio.

- [x] Verify image identities from official pages and inspect actual images before selecting crops; download and optimize originals without generating likenesses.
- [x] Add concise description-grounded question per episode with sources and source excerpt.
- [x] Implement metadata report in existing twice-daily sync and PR checks, with missing fields/slugs actionable, no automated factual invention.
- [x] Run source completeness checks and compare before/after unchanged bodies and protected frontmatter.
- [x] Commit only Task 2 files; report provenance, checks and any publication-side unverified boundary.

### Integration and review

- [x] Combine the two isolated commits on the resource worktree and inspect combined diff.
- [x] Run npm test, npm run build, node scripts/check-episode-ui.mjs dist, and existing owned-form/build checks appropriate to changed files.
- [x] Fresh reviewer checks both task scopes, spec compliance and overall quality; fix material findings before handoff.
- [x] Verify real desktop/mobile UI, fictional/blank/print behavior, episode photos/questions, no unintended submissions/storage and old routes.
- [x] Save screenshots and review summary; leave a concrete preview for Justin. No task self-approval or live deployment.

## Remaining operator review

- [ ] Justin reviews the revised styling and approves the live release.
- [ ] A native device PDF/physical print output is inspected; screen snapshots and source print styles are verified separately.
