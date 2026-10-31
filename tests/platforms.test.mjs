import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listeningPlatforms, listeningHub } from '../src/data/platforms.mjs';

test('each listening destination names the provider its URL actually opens', () => {
  const providerHosts = { spotify: 'open.spotify.com', apple: 'podcasts.apple.com', youtube: 'www.youtube.com', amazon: 'music.amazon.com' };
  assert.equal(listeningPlatforms.length, 4);
  assert.equal(new Set(listeningPlatforms.map(p => p.url)).size, 4);
  for (const platform of listeningPlatforms) {
    const url = new URL(platform.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, providerHosts[platform.id]);
    assert.ok(platform.name && platform.action);
    assert.ok(!/iheart|pocket casts/i.test(`${platform.name} ${platform.action}`), 'Single-provider links must not imply unrelated services');
  }
  assert.equal(new URL(listeningHub).hostname, 'linktr.ee');
});

test('all listening brand images are local, self-contained SVG assets', async () => {
  for (const { icon } of listeningPlatforms) {
    assert.match(icon, /^\/icons\/platforms\/[a-z]+\.svg$/);
    const svg = await readFile(new URL(`../public${icon}`, import.meta.url), 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|(?:href|src)=["']https?:/i);
  }
});
