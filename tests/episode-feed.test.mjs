import test from 'node:test';
import assert from 'node:assert/strict';
import { episodeNotes } from '../scripts/episode-feed-content.mjs';
import { publicAppleEpisodes, publicSpotifyEpisodes, publicYouTubeEpisodes } from '../scripts/episode-catalog.mjs';

test('feed notes retain bullets, section separation and safe links', () => {
  const notes = episodeNotes('<p>In this episode the host interviews the team.</p>' +
    '<p>The team explains how to test a prototype with the people who will use it.</p>' +
    '<ul><li><a href="https://example.com/?x=1&amp;y=2" onclick="alert(1)">Example &amp; links</a></li>' +
    '<li><a href="javascript:alert(1)">Keep the label</a></li></ul>' +
    '<p><br /><strong>Follow Approaching Infinity</strong></p><script>discard</script>');
  assert.match(notes.html, /<ul><li><a href="https:\/\/example\.com\/\?x=1&amp;y=2">Example &amp; links<\/a><\/li><li>Keep the label<\/li><\/ul><p><br \/>/);
  assert.doesNotMatch(notes.html, /javascript:|onclick|script|discard/);
  assert.equal(notes.summary, 'The team explains how to test a prototype with the people who will use it.');
});

test('catalogs expose only active episode IDs and skip Shorts and ambiguous uploads', () => {
  const spotifyUrl = 'https://open.spotify.com/episode/0RZc6SbbJSREJRI233jihS';
  const appleUrl = 'https://podcasts.apple.com/us/podcast/approaching-infinity/id1641001955?i=1000802659536';
  const state = { episodePreview: { episodes: [
    { episodeId: 'eabc', stationId: 'aaecdd08', spotifyUrl },
    { episodeId: 'edeleted', stationId: 'aaecdd08', spotifyUrl, isDeleted: true },
    { episodeId: 'egated', stationId: 'aaecdd08', spotifyUrl, isMembershipGated: true },
    { episodeId: 'ewrongshow', stationId: 'other', spotifyUrl },
  ] } };
  assert.deepEqual([...publicSpotifyEpisodes('window.__STATE__ = ' + JSON.stringify(state) + ';')], [['eabc', spotifyUrl]]);
  const apple = { wrapperType: 'podcastEpisode', collectionId: 1641001955, episodeGuid: 'feed-guid', trackViewUrl: appleUrl + '&uo=4' };
  assert.deepEqual([...publicAppleEpisodes({ results: [apple, { ...apple, collectionId: 1 }] })], [['feed-guid', appleUrl]]);
  const yt = (id, title, path = 'watch?v=') => '<entry><yt:videoId>' + id + '</yt:videoId><yt:channelId>UCbxaQxY_ZXaHFC03GWI6gYg</yt:channelId>' +
    '<title>' + title + '</title><link rel="alternate" href="https://www.youtube.com/' + path + id + '" /></entry>';
  assert.deepEqual([...publicYouTubeEpisodes('<feed>' +
    yt('abcdefghijk', 'Approaching Infinity S1E31: The episode') +
    yt('abcdefghijl', 'A Short', 'shorts/') + '</feed>')], [['theepisode', 'https://www.youtube.com/watch?v=abcdefghijk']]);
  assert.equal(publicYouTubeEpisodes('<feed>' + yt('abcdefghijk', 'Same Title') + yt('abcdefghijl', 'Same Title') + '</feed>').get('sametitle'), null);
});
