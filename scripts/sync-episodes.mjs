#!/usr/bin/env node
/**
 * Sync episodes from the podcast RSS feed into src/content/episodes/.
 *
 * The feed controls episode identity and numbering. New pages include publisher
 * artwork, a sourced listener excerpt and safe show notes. Later runs fill
 * missing provider links as directories catch up and preserve editorial fields.
 *
 * Numbering follows the convention already in the feed:
 *   - <itunes:episode> present  -> mainline episode, that number
 *   - <itunes:episode> absent   -> cross-post / special, rendered as "Bonus"
 * To promote a bonus item to a numbered episode, set its episode number in
 * Spotify for Creators; the next sync picks it up.
 *
 * Usage: node scripts/sync-episodes.mjs [--dry-run]
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { episodeNotes } from './episode-feed-content.mjs';
import { loadEpisodeCatalog } from './episode-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EPISODES_DIR = join(ROOT, 'src/content/episodes');
const FEED_URL =
  process.env.PODCAST_FEED_URL ?? 'https://anchor.fm/s/aaecdd08/podcast/rss';
const DRY_RUN = process.argv.includes('--dry-run');

/** "00:31:33" or "1893" -> "32 min" (nearest minute, matching existing files). */
function toDuration(raw) {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  let seconds;
  if (s.includes(':')) {
    const parts = s.split(':').map(Number);
    if (parts.some(Number.isNaN)) return undefined;
    seconds = parts.reduce((acc, p) => acc * 60 + p, 0);
  } else {
    seconds = Number(s);
    if (Number.isNaN(seconds)) return undefined;
  }
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function slugify(title) {
  const base = title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= 60) return base;
  const cut = base.slice(0, 60);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 30 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

/** Stable identity for an item, so a file is only ever created once. */
function dedupeKey({ episodeNumber, bonus, pubDate }) {
  return bonus ? `bonus:${pubDate}` : `ep:${episodeNumber}`;
}

function readFrontmatterField(text, field) {
  const m = text.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

async function existingKeys() {
  const files = (await readdir(EPISODES_DIR)).filter((f) => f.endsWith('.md'));
  const keys = new Map();
  const guids = new Map();
  for (const file of files) {
    const text = await readFile(join(EPISODES_DIR, file), 'utf8');
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? '';
    const guid = readFrontmatterField(frontmatter, 'guid');
    const entry = { file, text };
    if (guid) guids.set(guid, entry);
    const bonus = readFrontmatterField(frontmatter, 'bonus') === 'true';
    const episodeNumber = Number(readFrontmatterField(frontmatter, 'episodeNumber'));
    const pubDate = (readFrontmatterField(frontmatter, 'pubDate') ?? '').slice(0, 10);
    keys.set(dedupeKey({ episodeNumber, bonus, pubDate }), entry);
  }
  return { keys, guids, filenames: new Set(files) };
}

/** YAML-safe double-quoted scalar (JSON string syntax is valid YAML). */
const yamlString = (v) => JSON.stringify(String(v));

function platformFields(links, existing = '') {
  return Object.entries(links)
    .filter(([field, url]) => url && !readFrontmatterField(existing, field))
    .map(([field, url]) => field + ': ' + url);
}

function buildMarkdown(ep) {
  const lines = ['---', `title: ${yamlString(ep.title)}`, `episodeNumber: ${ep.episodeNumber}`];
  if (ep.guest) lines.push(`guest: ${yamlString(ep.guest)}`);
  lines.push(`description: ${yamlString(ep.description)}`);
  lines.push(`pubDate: ${ep.pubDate}`);
  if (ep.duration) lines.push(`duration: ${yamlString(ep.duration)}`);
  if (ep.audioUrl) lines.push(`audioUrl: ${ep.audioUrl}`);
  if (ep.artwork) lines.push(`artwork: ${ep.artwork}`);
  else lines.push('episodeVisuals: ' + JSON.stringify([{
    src: '/guests/approaching-infinity-logo.webp', alt: 'Approaching Infinity logo', kind: 'episode-artwork',
  }]));
  if (ep.listenerSummary) lines.push('listenerSummary: ' + yamlString(ep.listenerSummary));
  lines.push(...platformFields(ep.links));
  if (ep.bonus) lines.push('bonus: true');
  lines.push(`guid: ${yamlString(ep.guid)}`);
  lines.push('# Imported from the feed. Editorial fields are preserved on later syncs.');
  lines.push('---', '', ep.body, '');
  return lines.join('\n');
}

async function main() {
  const res = await fetch(FEED_URL, { headers: { 'user-agent': 'approaching-infinity-site' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  if (items.length === 0) throw new Error('Feed contained no <item> entries; refusing to continue.');

  const { keys, guids, filenames } = await existingKeys();
  const created = [];
  const enriched = [];
  const findLinks = await loadEpisodeCatalog(items);

  for (const item of items) {
    const guid = String(item.guid?.['#text'] ?? item.guid ?? '').trim();

    const rawEp = item['itunes:episode'];
    const bonus = rawEp === undefined || rawEp === null || rawEp === '';
    const episodeNumber = bonus ? 0 : Number(rawEp);
    const pubDate = new Date(item.pubDate).toISOString().slice(0, 10);

    const title = String(item.title ?? '').trim();
    if (!title) continue;

    const links = findLinks(item);
    const key = dedupeKey({ episodeNumber, bonus, pubDate });
    const existing = guids.get(guid) ?? keys.get(key);
    if (existing) {
      // Legacy files may match by date/number. Never cross-wire a different GUID.
      const existingFront = existing.text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1];
      if (!existingFront || (readFrontmatterField(existingFront, 'guid') ?? guid) !== guid) continue;
      const fields = platformFields(links, existingFront);
      if (!fields.length) continue;
      const updated = existing.text.replace(/^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/,
        (_all, front, close) => front + '\n' + fields.join('\n') + close);
      if (!DRY_RUN) await writeFile(join(EPISODES_DIR, existing.file), updated, 'utf8');
      existing.text = updated;
      enriched.push(existing.file);
      continue;
    }

    const notes = episodeNotes(item['content:encoded'] || item.description || item['itunes:summary']);
    const description = notes.text.slice(0, 400).trim() || title;
    const artUrl = URL.parse(item['itunes:image']?.['@_href'] ?? '');

    let slug = slugify(title);
    let filename = `${slug}.md`;
    let n = 2;
    while (filenames.has(filename)) filename = `${slug}-${n++}.md`;
    filenames.add(filename);

    const ep = {
      title,
      episodeNumber,
      bonus,
      description,
      pubDate,
      duration: toDuration(item['itunes:duration']),
      audioUrl: item.enclosure?.['@_url'],
      artwork: artUrl?.protocol === 'https:' && !artUrl.username && !artUrl.password ? artUrl.href : undefined,
      listenerSummary: notes.summary,
      links,
      guid,
      body: '<div>' + notes.html.replace(/\s*\r?\n\s*/g, ' ') + '</div>',
    };

    const entry = { file: filename, text: buildMarkdown(ep) };
    if (!DRY_RUN) await writeFile(join(EPISODES_DIR, filename), entry.text, 'utf8');
    created.push({ filename, title, episodeNumber, bonus, pubDate });
    keys.set(key, entry);
    if (guid) guids.set(guid, entry);
  }

  if (enriched.length) console.log((DRY_RUN ? 'Would enrich ' : 'Enriched ') + enriched.length + ' existing episode(s) with provider links.');
  if (created.length === 0 && enriched.length === 0) {
    console.log(`Up to date. ${items.length} items in feed, nothing new.`);
    return;
  }
  if (!created.length) return;
  console.log(`${DRY_RUN ? 'Would add' : 'Added'} ${created.length} episode file(s):`);
  for (const c of created) {
    const label = c.bonus ? 'Bonus' : `Episode ${c.episodeNumber}`;
    console.log(`  ${c.pubDate}  ${label.padEnd(10)}  ${c.filename}`);
    console.log(`              ${c.title}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
