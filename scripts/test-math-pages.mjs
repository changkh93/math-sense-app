import {readFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('dist/math-assets/build-manifest.json','utf8'));
assert(manifest.articles.length >= 10);
const sitemap=await readFile('dist/sitemap.xml','utf8');
assert(sitemap.includes('/python/guides/'));
const titles=new Set();
for(const path of manifest.paths){
 const html=await readFile(`dist${path}index.html`,'utf8');
 assert.equal((html.match(/<h1>/g)||[]).length,1,path);
 const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);
 assert(html.includes(`rel="canonical" href="https://msense.me${path}"`));
 assert(sitemap.includes(`<loc>https://msense.me${path}</loc>`));
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 for(const entry of schema['@graph'])if(entry['@type']==='FAQPage')for(const q of entry.mainEntity){assert(html.includes(q.name));assert(html.includes(q.acceptedAnswer.text));}
 for(const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)){
   const target=m[1];if(target.startsWith('/math/'))await access(`dist${target}index.html`);
   if(target.startsWith('/math-assets/'))await access(`dist${target}`);
 }
}
console.log(`PASS ${manifest.paths.length} static math pages: titles, H1, canonical, JSON-LD/visible FAQ, sitemap and links`);

const course=await readFile('dist/math/index.html','utf8');
assert(!course.includes('width="65536"'), 'Invalid image dimensions must not be published');
assert(course.includes('/math-application/index.html'), 'Inline trial form must exist');
await access('dist/math-application/application.js');
console.log('PASS math evidence dimensions and trial entry');
