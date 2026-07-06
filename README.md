# Approaching Infinity — Website

The official site for the Approaching Infinity podcast and its forthcoming charitable mission.

## Tech stack

- [Astro 5](https://astro.build), static output (no server runtime)
- Deployed to GitHub Pages via GitHub Actions

## Local development

```bash
npm install
npm run dev      # serves at http://localhost:4321
npm run build    # outputs the static site to dist/
```

## Project structure

```
src/components/          Section components (Hero, Episodes, Mission, etc.)
src/layouts/Layout.astro HTML shell + header/footer + site script
src/pages/index.astro    The page (single long-scroll homepage)
src/content/episodes/    One markdown file per episode
src/styles/global.css    The whole design system
public/                  Favicon + static assets
```

## Adding an episode

Create `src/content/episodes/episode-N.md` with this frontmatter:

```yaml
---
title: "Episode title"
episodeNumber: 26
guest: "Guest Name"
description: "One-paragraph episode description."
pubDate: 2026-07-01
duration: "58 min"
spotifyUrl: "https://..."
appleUrl: "https://..."
youtubeUrl: "https://..."
featured: false
---
```

The homepage automatically shows the 4 highest-numbered episodes.

## Brand tokens

| Token | Value |
| --- | --- |
| Background | `#0A0A0A` |
| Red accent | `#E31B23` |
| Text | `#F6F3F1` |

Display type is condensed and heavy (Avenir Next Condensed / Arial Narrow / Impact); body copy uses the system sans stack.

## Deploy

Pushes to `main` auto-build and deploy via GitHub Actions to GitHub Pages. Live at <https://approaching-infinity.github.io>.

> **NOTE:** Current episodes and guest roles are PLACEHOLDERS to be replaced with real bookings. Platform and social links currently point to the Linktree hub (<https://linktr.ee/approachinginfinityshow>) as placeholders.
