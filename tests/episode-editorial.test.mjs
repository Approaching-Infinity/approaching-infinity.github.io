import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
const audit = JSON.parse(await readFile('docs/episode-editorial-audit.json', 'utf8'));
const records = new Map();
for (const file of (await readdir('src/content/episodes')).filter(f => f.endsWith('.md'))) {
  const text = await readFile(`src/content/episodes/${file}`, 'utf8');
  const front = text.split('---')[1];
  const get = key => { const value = front.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1]; return value ? JSON.parse(value) : undefined; };
  records.set(file.slice(0, -3), { text, question: get('listenerQuestion'), visuals: get('episodeVisuals') ?? [], appearance: get('guestAppearance'), bonus: /^bonus: true$/m.test(front), number: Number(front.match(/^episodeNumber: (\d+)$/m)?.[1]) });
}
const normalized = value => value.replace(/[\*_`]/g, '').replace(/\s+/g, ' ').trim();
test('every audited question matches published copy and an actual description excerpt', () => {
  assert.equal(audit.length, 35);
  assert.equal(new Set(audit.map(x => x.slug)).size, 35);
  for (const entry of audit) {
    const row = records.get(entry.slug);
    assert.ok(row, entry.slug);
    assert.equal(row.question, entry.question);
    assert.ok(normalized(row.text.split('---').slice(2).join('---')).includes(normalized(entry.sourceExcerpt)), `${entry.slug}: supporting excerpt must be in public notes`);
    assert.equal(entry.audioOrTranscriptVerified, false, 'Description audit must not imply audio verification');
    assert.equal(entry.sourceURL, 'https://anchor.fm/s/aaecdd08/podcast/rss');
  }
});
test('archive art exists locally, credits external hosts and preserves solo/multi-person identity', async () => {
  let appearances = 0;
  for (const [slug, row] of records) {
    if (!audit.some(x => x.slug === slug)) continue; // Future feed additions remain independently reviewable.
    assert.ok(row.visuals.length > 0, `${slug}: reviewed archive image required`);
    for (const visual of row.visuals) {
      assert.match(visual.src, /^\/(guests|shows)\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/);
      assert.ok(visual.alt.length > 1);
      assert.ok((await stat(`src/assets${visual.src}`)).isFile());
    }
    if (row.bonus) {
      appearances++;
      assert.ok(row.appearance?.show && row.appearance?.host);
      assert.ok(row.visuals.every(v => v.kind === 'show' && v.src.startsWith('/shows/')), `${slug}: external show art, not Justin/guest substitution`);
      assert.match(row.appearance.url, /^https:\/\//);
    } else assert.equal(row.appearance, undefined);
    if ([1, 2].includes(row.number)) assert.equal(row.visuals[0].alt, 'Justin Roopnarine');
  }
  assert.equal(appearances, 6);
  const pair = records.get('crafting-the-future-of-patient-care-maria-nikol-s-daniela-yu').visuals;
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0].alt, pair[1].alt);
  assert.equal(records.get('building-and-scaling-a-bank-inside-the-world-of-globify-bank').visuals[0].alt, 'Approaching Infinity logo', 'Unverified guest face must remain an honest show-logo fallback');
});
