import { decodeHTML } from 'entities';
import { parse } from 'ultrahtml';

const allowedTags = new Set(['p', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'a']);
const omitTags = new Set(['script', 'style', 'noscript', 'iframe', 'object', 'svg', 'template']);
const blockTags = new Set(['p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'blockquote']);
const sentenceBoundaries = new Intl.Segmenter('en', { granularity: 'sentence' });
const escapeText = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const tidy = text => text.replace(/\s+/g, ' ').trim();

function renderNotes(node) {
  if (omitTags.has(node.name)) return { text: '', html: '' };
  if (!node.children) {
    const text = node.type === 2 ? decodeHTML(node.value) : '';
    return { text, html: escapeText(text) };
  }

  const children = node.children.map(renderNotes);
  const body = children.map(child => child.html).join('');
  const text = children.map(child => child.text).join('') + (blockTags.has(node.name) ? '\n' : '');
  if (!allowedTags.has(node.name)) return { text, html: body };
  if (node.name === 'br') return { text, html: '<br />' };
  if (node.name === 'a') {
    const href = URL.parse(decodeHTML(node.attributes.href ?? ''));
    if (href?.protocol !== 'https:' || href.username || href.password) return { text, html: body };
    return { text, html: '<a href="' + escapeText(href.href).replaceAll('"', '&quot;') + '">' + body + '</a>' };
  }
  return { text, html: '<' + node.name + '>' + body.trim() + '</' + node.name + '>' };
}

export function episodeNotes(html) {
  const notes = renderNotes(parse(String(html ?? '')));
  const editorialText = notes.text.split(/(?:^|\n)\s*(?:Support and Connect|Follow Approaching Infinity|Hosted by Justin|Thank you for tuning|Disclaimer\b)/i)[0];
  const sentences = [...sentenceBoundaries.segment(tidy(editorialText))]
    .map(item => item.segment.trim())
    .filter(line => line.length >= 35 && !/\bhttps?:\/\/|@[\w]+/.test(line));
  const subject = sentences.find(line => !/^(?:In (?:this|the) episode|Welcome to|Join us|This (?:week|episode))\b/i.test(line)) ?? sentences[0] ?? '';
  const limit = 155;
  const summary = subject.length > limit ? subject.slice(0, limit).replace(/\s+\S*$/, '').trimEnd() + '…' : subject;
  return { html: notes.html.trim(), text: tidy(editorialText), summary };
}
