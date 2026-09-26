import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicSeo } from '../src/utils/publicSeo.js';
const titles = new Set();
for (const [path, meta] of Object.entries(publicSeo)) {
  const canonicalPath = path === '/' ? '/' : `${path}/`;
  const file = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  const html = await readFile(file, 'utf8');
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert(html.includes(`<title>${meta.title}</title>`));
  assert(html.includes(`<link rel="canonical" href="https://msense.me${canonicalPath}">`));
  assert(/<h1\b/.test(html) && html.includes('href="/'));
  assert(!html.includes('noindex'));
  assert(html.includes(`content="${meta.description}"`));
  if (path === '/') {
    const head = html.split('</head>')[0];
    assert(head.includes('<link rel="stylesheet" href="/home-assets/home.css">'), 'Homepage CSS must block the first paint from the persistent document head');
    assert.equal((html.match(/href="\/home-assets\/home.css"/g) || []).length, 1, 'Homepage CSS must not be remounted inside the React root');
    assert(head.includes('metasense_auth_session_hint'), 'Homepage must hide its public prerender when a returning auth session is expected');
    assert(html.includes('<div data-public-prerender>'), 'Homepage prerender must be independently hideable during auth restoration');
  }
  titles.add(meta.title);
}
assert.equal(titles.size, Object.keys(publicSeo).length);
const fallback = await readFile('dist/spa.html', 'utf8');
assert(!fallback.includes('rel="canonical"'));
assert(fallback.includes('<div id="root"></div>'));
assert(fallback.split('</head>')[0].includes('href="/home-assets/home.css"'), 'SPA navigation must retain homepage styles');
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const path of Object.keys(publicSeo)) assert(sitemap.includes(`<loc>https://msense.me${path === '/' ? '/' : `${path}/`}</loc>`));
const catalog = JSON.parse(await readFile('content/math-guides/catalog.json', 'utf8'));
for (const article of catalog.filter(a => a.status === 'published')) {
  assert(sitemap.includes(`<loc>https://msense.me/math/guides/${article.slug}/</loc><lastmod>${article.updated}</lastmod>`), `Wrong lastmod: ${article.slug}`);
}
assert(!sitemap.includes('<loc>https://msense.me/python</loc>'));
console.log('PASS: public HTML bodies, unique metadata, sitemap, isolated SPA fallback');
