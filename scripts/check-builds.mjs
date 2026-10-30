import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const html = (dir,path = '') => readFile(`${dir}/${path}index.html`,'utf8');
const production = await html('dist');
const review = await html('dist-review');
assert.ok(!production.includes('Local review preview.'), 'Production must omit internal banner');
assert.ok(review.includes('Local review preview.'), 'Astro must actually enable review mode');
assert.ok(review.includes('noindex,nofollow'), 'Review must discourage indexing');
for (const kind of ['contact','newsletter']) {
  const prodForm = await html('dist',`${kind}/`);
  const demoForm = await html('dist-review',`${kind}/`);
  assert.ok(!prodForm.includes('<form'), `Unconfigured production ${kind} cannot collect`);
  assert.ok(demoForm.includes(`action="http://127.0.0.1:4322/submit/${kind}" method="POST"`), `Review ${kind} must have native local POST`);
  assert.ok(demoForm.includes('name="email"') && demoForm.includes('required'), 'Named email and validation required');
  for (const page of [prodForm,demoForm]) assert.ok(page.includes(`href="https://approaching-infinity.github.io/${kind}/"`), 'Canonical must be route-correct');
}
await assert.rejects(access('dist/support/index.html'), 'Support draft must not be published in default build');
assert.ok((await html('dist-review','support/')).includes('Payments are not open.'), 'Support review route must exist');
for (const dir of ['dist','dist-review']) {
  const article = await html(dir,'resources/month-ahead/');
  assert.ok(article.includes('/resources/bill-calendar-worksheet/'), 'Worksheet link must resolve');
  assert.ok(!article.includes('Internal review notes') && !article.includes('October 31'), 'Internal appendix must not ship');
  assert.ok(!article.includes('publication_date'), 'No invented publication date');
  assert.ok(!await html(dir,'contact/').then(s=>s.includes('name="consent"')), 'Contact cannot auto-enroll newsletter');
}
assert.ok((await html('dist-review','newsletter/')).includes('<h1>'), 'Standalone newsletter needs its own h1');
const worksheet = await html('dist-review','resources/bill-calendar-worksheet/');
assert.ok(worksheet.includes('Date: ____<br>________'), 'Calendar date/write-in blanks must render literally');
console.log('Generated production/review mode checks passed: forms, banner, support exclusion, canonical URLs, article privacy.');
