import { appendFile } from 'node:fs/promises';
import { decodeHTML } from 'entities';
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'ultrahtml';
import { amazonEpisodeId, readAmazonEpisodes, withAmazonBrowser } from './amazon-music.mjs';
import { publicAmazonEpisodes, episodeTitleKey } from './episode-catalog.mjs';

const feedUrl = 'https://anchor.fm/s/aaecdd08/podcast/rss';
const asArray = value => Array.isArray(value) ? value : value == null ? [] : [value];

function listLinks(html) {
  const groups = [];
  function visit(node) {
    if (node.name === 'ul' || node.name === 'ol') {
      const links = [];
      function collect(child) {
        if (child.name === 'a') {
          const url = URL.parse(decodeHTML(child.attributes.href ?? ''));
          if (url?.protocol === 'https:') links.push(url.href);
        }
        child.children?.forEach(collect);
      }
      collect(node);
      if (links.length) groups.push(links);
      return;
    }
    node.children?.forEach(visit);
  }
  visit(parse(String(html ?? '')));
  return groups;
}

const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error('RSS returned HTTP ' + response.status);
const parser = new XMLParser();
const items = asArray(parser.parse(await response.text()).rss?.channel?.item);
if (!items.length) throw new Error('The podcast RSS feed contained no episodes');

const lines = ['## Amazon Music episode audit', '',
  '| Episode | Link and list check |', '| --- | --- |'];
const outcome = (title, text) => lines.push('| ' + title.replaceAll('|', '\\|').replace(/\s+/g, ' ') + ' | ' + text + ' |');

try {
  await withAmazonBrowser(async page => {
    const catalog = publicAmazonEpisodes(await readAmazonEpisodes(page));
    for (const item of items.slice(0, 4)) {
      const url = catalog.get(episodeTitleKey(item.title));
      if (!url) {
        outcome(item.title, 'Episode link pending or ambiguous');
        continue;
      }
      const expected = listLinks(item['content:encoded'] || item.description || item['itunes:summary']);
      try {
        const result = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (!result?.ok() || !amazonEpisodeId(page.url())) throw new Error('Episode URL did not open');
        const expand = page.getByRole('link', { name: 'Read more', exact: true })
          .or(page.getByRole('button', { name: 'Read more', exact: true })).first();
        await page.getByRole('heading', { name: item.title, exact: true }).first().waitFor({ timeout: 12000 });
        if (await expand.isVisible()) await expand.click({ timeout: 5000 });
        const actual = await page.locator('ul,ol').evaluateAll(lists => lists
          .filter(list => list.getBoundingClientRect().height > 0)
          .map(list => [...list.querySelectorAll('li a')].map(a => a.href))
          .filter(group => group.length));
        const expectedSignature = expected.map(group => group.join('\n')).join('\n\n');
        const actualSignature = actual.map(group => group.join('\n')).join('\n\n');
        if (!expected.length) outcome(item.title, 'Direct link opens. Feed has no linked lists.');
        else if (actualSignature.includes(expectedSignature)) {
          outcome(item.title, expected.length + ' lists and ' + expected.flat().length + ' links match the feed.');
        } else {
          outcome(item.title, 'Direct link opens. Lists differ from the feed on this web view.');
          console.warn('Amazon Music list rendering differs: ' + item.title);
        }
      } catch (error) {
        outcome(item.title, 'Public episode view could not be verified.');
        console.warn('Amazon Music episode could not be verified: ' + error.message.split('\n')[0]);
      }
    }
  });
} catch (error) {
  lines.push('| Catalog | Amazon Music did not expose the public episode list on this run. |');
  console.warn('Amazon Music catalog could not be verified: ' + error.message.split('\n')[0]);
}

const report = lines.join('\n') + '\n';
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
