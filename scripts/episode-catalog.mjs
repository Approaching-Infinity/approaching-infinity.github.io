import { XMLParser } from 'fast-xml-parser';
import { amazonEpisodeId, readAmazonEpisodes, withAmazonBrowser } from './amazon-music.mjs';

const appleShowId = 1641001955;
const spotifyStation = 'aaecdd08';
const youtubeChannel = 'UCbxaQxY_ZXaHFC03GWI6gYg';
const appleCatalog = 'https://itunes.apple.com/lookup?id=' + appleShowId + '&entity=podcastEpisode&limit=200&country=US';
const youtubeFeed = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + youtubeChannel;

const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
export const episodeTitleKey = title => String(title ?? '').normalize('NFKC').toLowerCase()
  .replace(/^approaching infinity\s*/, '')
  .replace(/^s\d+e\d+\b\s*/, '')
  .replace(/[^\p{L}\p{N}]/gu, '');
const publisherKey = url => String(url ?? '').match(/^https:\/\/(?:podcasters|creators)\.spotify\.com\/pod\/(?:show|profile)\/approaching-infinity\/episodes\/[^/?#]+-(e[a-z0-9]+)(?:[?#].*)?$/i)?.[1];

export function publicSpotifyEpisodes(html) {
  const source = html.match(/window\.__STATE__\s*=\s*(\{[^\n]+\})\s*;/)?.[1];
  return new Map(list(source ? JSON.parse(source).episodePreview?.episodes : [])
    .filter(row => row.stationId === spotifyStation && !row.isDeleted && !row.isMembershipGated &&
      /^https:\/\/open\.spotify\.com\/episode\/[a-z0-9]{22}$/i.test(row.spotifyUrl))
    .map(row => [row.episodeId, row.spotifyUrl]));
}

export function publicAppleEpisodes(catalog) {
  return new Map(list(catalog.results)
    .filter(row => row.wrapperType === 'podcastEpisode' && row.collectionId === appleShowId &&
      row.episodeGuid && /^https:\/\/podcasts\.apple\.com\/[^?]+\/id1641001955\?i=\d+(?:&uo=4)?$/.test(row.trackViewUrl))
    .map(row => [row.episodeGuid, row.trackViewUrl.replace(/&uo=4$/, '')]));
}

export function publicYouTubeEpisodes(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const urls = new Map();
  for (const row of list(parser.parse(xml).feed?.entry)) {
    const id = row['yt:videoId'];
    const url = list(row.link).find(link => link['@_rel'] === 'alternate')?.['@_href'];
    const key = episodeTitleKey(row.title);
    if (row['yt:channelId'] !== youtubeChannel || !key || !/^[\w-]{11}$/.test(id) ||
        url !== 'https://www.youtube.com/watch?v=' + id) continue;
    // Ambiguous titles are not matched automatically.
    urls.set(key, urls.has(key) ? null : url);
  }
  return urls;
}

/** Match the published player link. Reject distinct episodes with the same title. */
export function publicAmazonEpisodes(rows) {
  const matches = new Map();
  for (const { title, url } of rows) {
    const id = amazonEpisodeId(url);
    const key = episodeTitleKey(title);
    if (!id || !key) continue;
    if (!matches.has(key)) matches.set(key, url);
    else if (amazonEpisodeId(matches.get(key)) !== id) matches.set(key, null);
  }
  return matches;
}

async function amazonCatalog() {
  try {
    const published = publicAmazonEpisodes(await withAmazonBrowser(readAmazonEpisodes));
    if (!published.size) throw new Error('no episode links on the public show page');
    console.log('Amazon Music catalog: ' + [...published.values()].filter(Boolean).length + ' unambiguous titles.');
    return published;
  } catch (error) {
    console.warn('Amazon Music catalog unavailable: ' + error.message.split('\n')[0] + '. Existing links are retained.');
    return new Map();
  }
}

async function catalog(url, transform, name) {
  if (!url) return new Map();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return transform(await response.text());
  } catch (error) {
    console.warn(name + ' catalog unavailable: ' + error.message + '. Existing links are retained.');
    return new Map();
  }
}

export async function loadEpisodeCatalog(items) {
  const publisherUrl = items.find(item => publisherKey(item.link))?.link;
  const [apple, spotify, youtube, amazon] = await Promise.all([
    catalog(appleCatalog, source => publicAppleEpisodes(JSON.parse(source)), 'Apple Podcasts'),
    catalog(publisherUrl, publicSpotifyEpisodes, 'Spotify'),
    catalog(youtubeFeed, publicYouTubeEpisodes, 'YouTube'),
    amazonCatalog(),
  ]);
  const repeated = new Set();
  const seen = new Set();
  for (const { title } of items) {
    const key = episodeTitleKey(title);
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  return item => {
    const guid = String(item.guid?.['#text'] ?? item.guid ?? '').trim();
    const key = episodeTitleKey(item.title);
    return {
      amazonUrl: repeated.has(key) ? undefined : amazon.get(key),
      appleUrl: apple.get(guid),
      spotifyUrl: spotify.get(publisherKey(item.link)),
      youtubeUrl: youtube.get(key),
    };
  };
}
