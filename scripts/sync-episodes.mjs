#!/usr/bin/env node
/**
 * Sync episodes from the podcast RSS feed into src/content/episodes/.
 *
 * The feed is the source of truth for *which* episodes exist and how they are
 * numbered. Existing markdown files are never modified, so any hand-written
 * body copy, guest credits, or embed IDs added later survive every sync.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EPISODES_DIR = join(ROOT, 'src/content/episodes');
const FEED_URL =
  process.env.PODCAST_FEED_URL ?? 'https://anchor.fm/s/aaecdd08/podcast/rss';
const DRY_RUN = process.argv.includes('--dry-run');

/** Collapse HTML to readable plain text. */
function htmlToText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  const keys = new Set();
  const guids = new Set();
  for (const file of files) {
    const text = await readFile(join(EPISODES_DIR, file), 'utf8');
    const guid = readFrontmatterField(text, 'guid');
    if (guid) guids.add(guid);
    const bonus = readFrontmatterField(text, 'bonus') === 'true';
    const episodeNumber = Number(readFrontmatterField(text, 'episodeNumber'));
    const pubDate = (readFrontmatterField(text, 'pubDate') ?? '').slice(0, 10);
    keys.add(dedupeKey({ episodeNumber, bonus, pubDate }));
  }
  return { keys, guids, filenames: new Set(files) };
}

/** YAML-safe double-quoted scalar (JSON string syntax is valid YAML). */
const yamlString = (v) => JSON.stringify(String(v));

function buildMarkdown(ep) {
  const lines = ['---', `title: ${yamlString(ep.title)}`, `episodeNumber: ${ep.episodeNumber}`];
  if (ep.guest) lines.push(`guest: ${yamlString(ep.guest)}`);
  lines.push(`description: ${yamlString(ep.description)}`);
  lines.push(`pubDate: ${ep.pubDate}`);
  if (ep.duration) lines.push(`duration: ${yamlString(ep.duration)}`);
  if (ep.audioUrl) lines.push(`audioUrl: ${ep.audioUrl}`);
  if (ep.artwork) lines.push(`artwork: ${ep.artwork}`);
  if (ep.bonus) lines.push('bonus: true');
  lines.push(`guid: ${yamlString(ep.guid)}`);
  lines.push('# Synced from the podcast feed. Safe to enrich by hand: this file is never');
  lines.push('# overwritten. Optional extras: spotifyEpisodeId / spotifyUrl, appleUrl,');
  lines.push('# youtubeUrl / youtubeId, guest.');
  lines.push('---', '', ep.body, '');
  return lines.join('\n');
}

async function main() {
  const res = await fetch(FEED_URL, { headers: { 'user-agent': 'approaching-infinity-site' } });
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

  for (const item of items) {
    const guid = String(item.guid?.['#text'] ?? item.guid ?? '').trim();
    if (guid && guids.has(guid)) continue;

    const rawEp = item['itunes:episode'];
    const bonus = rawEp === undefined || rawEp === null || rawEp === '';
    const episodeNumber = bonus ? 0 : Number(rawEp);
    const pubDate = new Date(item.pubDate).toISOString().slice(0, 10);

    if (keys.has(dedupeKey({ episodeNumber, bonus, pubDate }))) continue;

    const title = String(item.title ?? '').trim();
    if (!title) continue;

    const summary = htmlToText(
      item['content:encoded'] ?? item.description ?? item['itunes:summary'] ?? ''
    );
    const description = summary.split('\n')[0].slice(0, 400).trim() || title;

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
      artwork: item['itunes:image']?.['@_href'],
      guid,
      body: summary || description,
    };

    if (!DRY_RUN) await writeFile(join(EPISODES_DIR, filename), buildMarkdown(ep), 'utf8');
    created.push({ filename, title, episodeNumber, bonus, pubDate });
    keys.add(dedupeKey(ep));
  }

  if (created.length === 0) {
    console.log(`Up to date. ${items.length} items in feed, nothing new.`);
    return;
  }
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
