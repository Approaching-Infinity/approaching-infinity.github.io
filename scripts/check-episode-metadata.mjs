#!/usr/bin/env node
// Editorial reminders only. Valid feed imports remain publishable while a human
// verifies portraits, credits and description-grounded listener questions.
import { appendFile, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function missingCuratedMetadata(text) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? '';
  const value = key => {
    const raw = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1];
    if (!raw) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  };
  const missing = [];
  const appearance = value('guestAppearance');
  // A plain guest label is optional: a verified title/portrait can already
  // identify the guest. Only check external-host credit when the entry declares
  // an appearance or uses the established external-show artwork convention.
  const visuals = value('episodeVisuals');
  if ((/^guestAppearance:/m.test(front) || (Array.isArray(visuals) && visuals.some(v => v?.kind === 'show'))) &&
      !(appearance?.show && appearance?.host && appearance?.url)) missing.push('guestAppearance show/host/url credit');
  const question = value('listenerQuestion') ?? value('listenerSummary');
  if (typeof question !== 'string' || !question.trim()) missing.push('listenerQuestion');
  const publisherArtwork = /^artwork: https:\/\/\S+$/m.test(front);
  if ((!Array.isArray(visuals) || !visuals.length) ? !publisherArtwork : visuals.some(v => !v?.src || !v?.alt)) missing.push('episodeVisuals');
  return missing;
}

export async function reportEpisodeMetadata(directory = 'src/content/episodes', summaryFile = process.env.GITHUB_STEP_SUMMARY) {
  const pending = [];
  for (const file of (await readdir(directory)).filter(f => f.endsWith('.md')).sort()) {
    const missing = missingCuratedMetadata(await readFile(join(directory, file), 'utf8'));
    if (missing.length) pending.push({ slug: file.slice(0, -3), missing });
  }
  const lines = ['## Episode editorial review', ''];
  if (pending.length) {
    lines.push(`${pending.length} episode(s) need curated metadata. Feed import remains nonblocking.`, '',
      '| Episode slug | Missing metadata |', '| --- | --- |');
    for (const { slug, missing } of pending) {
      lines.push(`| ${slug} | ${missing.join(', ')} |`);
      console.warn(`Editorial review: ${slug}: missing ${missing.join(', ')}`);
      if (process.env.GITHUB_ACTIONS === 'true') {
        const escape = value => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/,/g, '%2C').replace(/:/g, '%3A');
        console.log(`::warning file=${escape(join(directory, `${slug}.md`))},title=Episode editorial review::${escape(`${slug}: missing ${missing.join(', ')}`)}`);
      }
    }
    lines.push('', 'Review src/content/episodes/<slug>.md. Verify guest identity and photo from a primary source, write a listener question supported by the published notes, and record evidence in docs/episode-editorial-audit.json. Use the existing single-line JSON metadata format. Do not invent or automatically generate claims.');
  } else lines.push('All episodes have listener questions and image metadata; declared external-show appearances have credits. Source accuracy still requires editorial review.');
  console.log(lines.join('\n'));
  if (summaryFile) await appendFile(summaryFile, `${lines.join('\n')}\n`);
  return pending;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await reportEpisodeMetadata(process.argv[2]);
}
