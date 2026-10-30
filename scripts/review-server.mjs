// Local-only static review + form harness. No mail, network forwarding or storage.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateSubmission(kind, fields) {
  const value = (key) => fields.get(key) || '';
  const allowed = kind === 'contact'
    ? ['name','email','category','organization','url','message','website_check']
    : ['email','consent','website_check','demo_failure'];
  if ([...fields.keys()].some(key => !allowed.includes(key)) ||
      allowed.some(key => fields.getAll(key).length > 1)) return 'Unexpected or duplicate form fields.';
  if (value('website_check')) return 'Demo spam check rejected the submission.';
  if (!/^[^\s@]+@example\.(com|org|net)$/.test(value('email')) || value('email').length > 254)
    return 'Use a fictional email at example.com, example.org or example.net for this demo.';
  if (value('email') === 'fail@example.com') return 'Simulated provider failure. Return to the form and retry with demo@example.com.';
  if (kind === 'newsletter') return value('consent') === 'yes' ? null : 'Choose the voluntary email consent checkbox before retrying.';
  if (!value('name').trim() || value('name').length > 100) return 'Enter a fictional name of 1–100 characters.';
  if (!['general','guest','sponsor','mission'].includes(value('category'))) return 'Choose an inquiry topic.';
  if (value('message').trim().length < 10 || value('message').length > 3000) return 'Use a fictional message of 10–3,000 characters.';
  if (value('organization').length > 150 || value('url').length > 500) return 'An optional field is too long.';
  if (value('url')) { try { if (!['https:','http:'].includes(new URL(value('url')).protocol)) return 'Use a valid website URL.'; } catch { return 'Use a valid website URL.'; } }
  return null;
}
function resultPage(kind, error) {
  const heading = error ? 'Demo submission rejected' : kind === 'contact' ? 'Demo contact checked' : 'Demo signup checked';
  // All messages are fixed strings, never reflected request values.
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>${heading}</title><style>body{background:#0a0a0a;color:#f6f3f1;font:18px/1.65 system-ui;max-width:44rem;padding:3rem 1.5rem;margin:auto}h1{font-size:2.5rem}a{color:#fff;text-underline-offset:5px}a:focus{outline:3px solid white}strong{color:#ff6b70}</style><body><strong>Local test result</strong><h1>${heading}</h1><p>${error || 'The demo validated the fictional fields. Nothing was saved, emailed or sent to a newsletter service. No subscription exists.'}</p><p>No delivery or consent confirmation is claimed by this test.</p><p><a href="http://127.0.0.1:4321/${kind === 'contact' ? 'contact' : 'newsletter'}/">Return to the form and retry</a></p><p><a href="http://127.0.0.1:4321/">Back to the preview</a></p></body></html>`;
}
export function createDemoServer() {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
    if (req.headers.host !== '127.0.0.1:4322' || req.headers.origin !== 'http://127.0.0.1:4321') { res.writeHead(403); res.end('Only the local review site may post to this demo.'); return; }
    const kind = req.url === '/submit/contact' ? 'contact' : req.url === '/submit/newsletter' ? 'newsletter' : null;
    if (!kind || req.method !== 'POST') { res.writeHead(404); res.end('Not found'); return; }
    if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) { res.writeHead(415); res.end('Use the native HTML form.'); return; }
    let body = ''; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 16384) { res.writeHead(413); res.end(resultPage(kind,'Demo request is too large. Nothing was saved or sent.')); return; } body += chunk.toString(); }
    const error = validateSubmission(kind, new URLSearchParams(body)); body = '';
    res.writeHead(error ? 422 : 200, {'Content-Type':'text/html; charset=utf-8'}); res.end(resultPage(kind,error));
  });
}
async function start() {
  const root = resolve('dist-review');
  await stat(resolve(root,'index.html'));
  const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'};
  const site = createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Cache-Control','no-store');
    if (req.headers.host !== '127.0.0.1:4321' || !['GET','HEAD'].includes(req.method)) { res.writeHead(403);res.end('Local read-only review site.');return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1:4321').pathname);
      let file = resolve(root, '.' + pathname);
      if (!file.startsWith(root + sep) && file !== root) throw new Error('outside root');
      if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
      const data = await readFile(file); res.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream'}); res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found. Return to http://127.0.0.1:4321/'); }
  });
  const forms = createDemoServer();
  for (const server of [site,forms]) server.on('error', error => { console.error(`Local review server error: ${error.code}`); process.exit(1); });
  forms.listen(4322,'127.0.0.1'); site.listen(4321,'127.0.0.1',() => console.log('Local review: http://127.0.0.1:4321/ — demo forms only; no storage or external delivery.'));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { site.close(); forms.close(); });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await start();
