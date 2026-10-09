import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';

const FEED = 'https://medium.com/feed/@matt.r.shaw4';
const OUT = 'src/content/writing';
const IMG = 'public/images/writing';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; portfolio-import/1.0)' };

const res = await fetch(FEED, { headers: UA });
if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
const xml = await res.text();

const unwrap = (s) => s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? unwrap(m[1]) : '';
};

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.addRule('pre', {
  filter: 'pre',
  replacement: (_c, node) => '\n\n```\n' + node.textContent.replace(/\n+$/, '') + '\n```\n\n',
});

await mkdir(OUT, { recursive: true });
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
console.log(`Found ${items.length} posts`);

for (const item of items) {
  const title = tag(item, 'title').trim();
  const link = tag(item, 'link').trim().split('?')[0];
  const pub = new Date(tag(item, 'pubDate'));
  const tags = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((m) => unwrap(m[1]).trim());
  const slug = new URL(link).pathname.split('/').pop().replace(/-[0-9a-f]{10,12}$/, '');
  let html = tag(item, 'content:encoded');
  console.log(`\n${slug}`);
  if (!html.trim()) { console.warn('  WARNING: feed has no body for this post, skipping'); continue; }

  html = html
    .replace(/<img[^>]+medium\.com\/_\/stat[^>]*>/g, '')
    .replace(/<(\/?)h1\b/g, '<$1h2')
    .replace(/<(\/?)h3\b/g, '<$1h2')
    .replace(/<(\/?)h4\b/g, '<$1h3');

  const srcs = [...new Set([...html.matchAll(/<img[^>]*?src="([^"]+)"/g)].map((m) => m[1]))].filter((s) => /^https?:/.test(s));
  let n = 0;
  for (const src of srcs) {
    n++;
    const r = await fetch(src, { headers: UA });
    if (!r.ok) { console.warn(`  image failed (${r.status}): ${src}`); continue; }
    const ct = r.headers.get('content-type') || '';
    const ext = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : ct.includes('webp') ? 'webp' : 'jpg';
    const dir = path.join(IMG, slug);
    await mkdir(dir, { recursive: true });
    const file = `img-${n}.${ext}`;
    await writeFile(path.join(dir, file), Buffer.from(await r.arrayBuffer()));
    html = html.split(src).join(`/images/writing/${slug}/${file}`);
  }
  if (/<iframe/.test(html)) console.warn('  WARNING: contains an iframe embed (blocked by CSP), review by hand');

  const body = td.turndown(html).trim();
  const firstPara = body.split(/\n{2,}/).map((s) => s.trim()).find((s) => s && !/^(#|!\[|```|[-*>])/.test(s)) || '';
  const plain = firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
  const summary = plain.length > 160 ? plain.slice(0, plain.lastIndexOf(' ', 157)) + '…' : plain;

  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `summary: ${JSON.stringify(summary)}`,
    'kind: medium',
    `date: ${pub.toISOString().slice(0, 10)}`,
    `mediumUrl: ${JSON.stringify(link)}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
  ].join('\n');
  await writeFile(path.join(OUT, `${slug}.md`), fm + '\n' + body + '\n');
  console.log(`  wrote ${slug}.md (${n} images)`);
}
