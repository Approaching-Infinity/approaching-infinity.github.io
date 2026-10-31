import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
const dir = process.argv[2] || 'dist';
const index = await readFile(`${dir}/episodes/index.html`, 'utf8');
const home = await readFile(`${dir}/index.html`, 'utf8');
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&#x27;', "'");
const audit = JSON.parse(await readFile('docs/episode-editorial-audit.json', 'utf8'));
const reviewed = new Set(audit.map(x => x.slug));
const files = (await readdir('src/content/episodes')).filter(f => f.endsWith('.md'));
let curated = 0, absent = 0, images = 0, appearances = 0;
const uniqueImages = new Set();
for (const file of files) {
  const source = await readFile(`src/content/episodes/${file}`, 'utf8');
  const front = source.split('---')[1];
  const questionLine = front.match(/^listenerQuestion: (.+)$/m);
  const slug = file.slice(0, -3);
  const row = index.match(new RegExp(`<a\\b[^>]*href="/episodes/${slug}/"[^>]*>[\\s\\S]*?</a>`));
  assert.ok(row, `${slug}: existing episode link retained`);
  assert.ok(!row[0].includes('<button'), `${slug}: no nested control in row link`);
  if (questionLine) {
    assert.ok(decode(row[0]).includes(JSON.parse(questionLine[1])), `${slug}: curated question rendered`);
    assert.ok(row[0].includes('Why listen'));
    curated++;
  } else { assert.ok(!row[0].includes('ep-insight')); absent++; }
  const expected = JSON.parse(front.match(/^episodeVisuals: (.+)$/m)?.[1] ?? '[]');
  const actual = [...row[0].matchAll(/<img[^>]*src="([^\"]+)"[^>]*alt="([^\"]+)"/g)];
  assert.equal(actual.length, expected.length, `${slug}: every curated image and no fabricated extra`);
  if (reviewed.has(slug)) assert.ok(expected.length && questionLine, `${slug}: complete approved archive row`);
  for (let i = 0; i < actual.length; i++) {
    const [, src, alt] = actual[i];
    assert.equal(decode(alt), expected[i].alt);
    assert.ok(src.startsWith('/_astro/') && src.endsWith('.webp'));
    assert.ok((await stat(`${dir}${src}`)).size < 60000, `${slug}: compact optimized image`);
    uniqueImages.add(src); images++;
  }
  const appearance = front.match(/^guestAppearance: (.+)$/m);
  const detail = await readFile(`${dir}/episodes/${slug}/index.html`, 'utf8');
  assert.ok(!/class="prose[^\"]*\breveal\b/.test(detail), `${slug}: long notes must not remain hidden by animation threshold`);
  if (appearance) {
    const credit = JSON.parse(appearance[1]);
    assert.ok(decode(row[0]).includes(`Justin featured on ${credit.show}`));
    assert.ok(decode(row[0]).includes(credit.host));
    assert.ok(decode(detail).includes(credit.show) && decode(detail).includes(credit.host));
    assert.ok(detail.includes(credit.url.replaceAll('&', '&amp;')) || decode(detail).includes(credit.url));
    appearances++;
  }
}
assert.ok(home.includes('How do you protect your judgment when everything is going right?'));
assert.ok(index.includes('<h1>All episodes</h1>'));
assert.ok(!index.includes('High-signal conversations'));
assert.ok(!/class="ep-list[^\"]*\breveal\b/.test(index));
assert.equal(appearances, 6);
console.log(`Episode UI: ${files.length} preserved links, ${curated} questions, ${absent} omissions, ${images} images/${uniqueImages.size} optimized files, ${appearances} credited guest appearances; latest/detail verified.`);
