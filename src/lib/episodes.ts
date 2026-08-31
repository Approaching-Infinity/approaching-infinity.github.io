import { getCollection } from 'astro:content';

/**
 * Every episode, newest first.
 *
 * Publication date is the ordering, not episode number. Cross-posts and
 * specials carry `episodeNumber: 0` (they are rendered as "Bonus"), so sorting
 * on the number alone would sink them to the bottom of the list regardless of
 * how recently they aired. Episode number only breaks ties between items that
 * published on the same day.
 */
export async function getEpisodesNewestFirst() {
  return (await getCollection('episodes')).sort(
    (a, b) =>
      b.data.pubDate.getTime() - a.data.pubDate.getTime() ||
      b.data.episodeNumber - a.data.episodeNumber,
  );
}
