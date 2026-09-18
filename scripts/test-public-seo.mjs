import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicSeo } from '../src/utils/publicSeo.js';
const titles = new Set();
for (const [path, meta] of Object.entries(publicSeo)) {
  const file = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  const html = await readFile(file, 'utf8');
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert(html.includes(`<title>${meta.title}</title>`));
  assert(html.includes(`<link rel="canonical" href="https://msense.me${path}">`));
  assert(html.includes('<h1>') && html.includes('href="/'));
  assert(!html.includes('noindex'));
  assert(html.includes(`content="${meta.description}"`));
  titles.add(meta.title);
}
assert.equal(titles.size, 3);
const fallback = await readFile('dist/spa.html', 'utf8');
assert(!fallback.includes('rel="canonical"'));
assert(fallback.includes('<div id="root"></div>'));
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const path of Object.keys(publicSeo)) assert(sitemap.includes(`<loc>https://msense.me${path}</loc>`));
console.log('PASS: 3 public HTML bodies, unique metadata, sitemap, isolated SPA fallback');
