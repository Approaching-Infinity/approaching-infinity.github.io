import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const cards = JSON.parse(await readFile('src/data/episode-resources.json', 'utf8'));
const audit = JSON.parse(await readFile('docs/episode-resources-audit.json', 'utf8'));
const normalize = text => text.replace(/[\*_`]/g, '').replace(/\s+/g, ' ').trim();

test('episode resource cards trace their ideas to actual published episode notes', async () => {
  assert.equal(cards.length, 3);
  assert.equal(new Set(cards.map(card => card.pillar)).size, 3);
  assert.equal(audit.audioOrTranscriptVerified, false);
  assert.equal(audit.checkedDate, '2026-11-16');
  for (const card of cards) {
    const text = await readFile(`src/content/episodes/${card.episodeId}.md`, 'utf8');
    const record = audit.cards.find(row => row.episodeId === card.episodeId);
    assert.ok(record, `${card.episodeId}: source record required`);
    assert.ok(normalize(text.split('---').slice(2).join('---')).includes(normalize(record.sourceExcerpt)), `${card.episodeId}: excerpt must occur in published notes`);
    assert.match(text, /^guest: /m);
    assert.match(text, /^episodeVisuals: /m);
    for (const resource of card.resources) {
      assert.equal(new URL(resource.url).protocol, 'https:');
      const source = record.resources.find(row => row.url === resource.url);
      assert.ok(source, `${resource.url}: current source required`);
      assert.equal(source.relationship, resource.relationship);
      assert.ok(['episode-notes', 'team-selected'].includes(resource.relationship));
      for (const url of source.verificationURLs) assert.equal(new URL(url).protocol, 'https:');
      if (resource.relationship === 'episode-notes') {
        assert.ok(text.includes(source.linkedInNotesURL), 'Original organization must actually be linked in the notes');
        if (source.linkedInNotesURL !== resource.url) assert.ok(source.successorExplanation, 'Changed program destinations need explicit source mapping');
      } else {
        assert.equal(source.linkedInNotesURL, undefined, 'Team-selected resources cannot imply a link in the episode notes');
      }
    }
    assert.equal(record.resources.length, card.resources.length);
  }
});
