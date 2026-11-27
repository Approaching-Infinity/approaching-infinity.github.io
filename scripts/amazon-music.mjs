import { chromium } from 'playwright';
import { listeningPlatforms } from '../src/data/platforms.mjs';

const showUrl = listeningPlatforms.find(platform => platform.id === 'amazon').url;
const showPath = new URL(showUrl).pathname.split('/').slice(0, 3).join('/');
export const amazonEpisodePath = showPath + '/episodes/';

export function amazonEpisodeId(value) {
  const url = URL.parse(value, showUrl);
  if (url?.origin !== 'https://music.amazon.com' || url.username || url.password || !url.pathname.startsWith(amazonEpisodePath)) return undefined;
  return url.pathname.slice(amazonEpisodePath.length).match(/^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\/|$)/i)?.[1];
}

export async function withAmazonBrowser(run) {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    return await run(await browser.newPage({ locale: 'en-US', viewport: { width: 1440, height: 900 } }));
  } finally {
    await browser.close();
  }
}

export async function readAmazonEpisodes(page) {
  await page.goto(showUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const episodes = page.locator('a[href*="' + amazonEpisodePath + '"]');
  await episodes.first().waitFor({ state: 'attached', timeout: 15000 });
  return episodes.evaluateAll(anchors => anchors.map(a => ({
    url: a.href,
    title: a.getAttribute('aria-label') || a.querySelector('h2,h3,h4')?.textContent || a.innerText.trim(),
  })));
}
