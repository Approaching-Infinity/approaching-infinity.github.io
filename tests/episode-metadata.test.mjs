import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { missingCuratedMetadata } from '../scripts/check-episode-metadata.mjs';

const curated = `---
guest: "Verified Guest"
listenerQuestion: "What does the published episode discuss?"
episodeVisuals: [{"src":"/guests/verified.webp","alt":"Verified Guest"}]
---
Published notes.
`;

test('curated episodes and credited guest appearances have no reminders', () => {
  assert.deepEqual(missingCuratedMetadata(curated), []);
  assert.deepEqual(missingCuratedMetadata(curated.replace('guest: "Verified Guest"\n', '')), []);
  assert.deepEqual(missingCuratedMetadata(curated.replace('guest: "Verified Guest"', 'guestAppearance: {"show":"External Show","host":"External Host","url":"https://example.com"}')), []);
});

test('a valid fresh feed import reports actionable fields and summary without blocking or rewriting it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'episode-metadata-'));
  try {
    const file = join(directory, 'new-feed-episode.md');
    const text = '---\ntitle: "New feed episode"\nepisodeNumber: 99\npubDate: 2026-11-16\n---\nOriginal published notes.\n';
    await writeFile(file, text);
    const summary = join(directory, 'summary.md');
    const result = spawnSync(process.execPath, ['scripts/check-episode-metadata.mjs', directory], {
      encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: summary },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /new-feed-episode: missing listenerQuestion, episodeVisuals/);
    const report = await readFile(summary, 'utf8');
    assert.match(report, /\| new-feed-episode \|/);
    assert.match(report, /nonblocking/);
    assert.equal(await readFile(file, 'utf8'), text);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('empty and incomplete curated metadata still needs a human review', () => {
  assert.equal(missingCuratedMetadata('---\nguest: ""\nlistenerQuestion: ""\nepisodeVisuals: []\n---\n').length, 2);
  assert.deepEqual(missingCuratedMetadata(curated.replace('"/guests/verified.webp"', '"/shows/verified.webp"').replace('"alt":"Verified Guest"', '"alt":"External Show","kind":"show"')), ['guestAppearance show/host/url credit']);
});
