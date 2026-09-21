import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const catalog=JSON.parse(await readFile('content/python-guides/catalog.json','utf8')).filter(a=>a.status==='published');
assert(catalog.length>=10);
const sitemap=await readFile('dist/sitemap.xml','utf8');
const titles=new Set();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const a of catalog) {
 const html=await readFile(`dist/python/guides/${a.slug}/index.html`,'utf8');
 assert.equal((html.match(/<h1>/g)||[]).length,1,a.slug);
 assert(!html.includes('type="module"'),`${a.slug} must work without app JS`);
 assert(html.includes(`/python/guides/${a.slug}/`));
 assert(sitemap.includes(`https://msense.me/python/guides/${a.slug}/`));
 assert(html.includes(esc(a.answer)));
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=data['@graph'].find(g=>g['@type']==='FAQPage');
 assert.equal(faq.mainEntity.length,a.faq.length);
 for(const f of faq.mainEntity) {assert(html.includes(esc(f.name)));assert(html.includes(esc(f.acceptedAnswer.text)));}
 for(const src of html.matchAll(/<img[^>]+src="([^"]+)"/g)) await access(`dist${src[1]}`);
 for(const href of html.matchAll(/href="(\/python\/guides\/[^"#]*)"/g)) await access(`dist${href[1]}index.html`);
 titles.add(a.title);
}
assert.equal(titles.size,catalog.length);
console.log(`PASS: ${catalog.length} static bodies, unique headings/titles, visible FAQ = JSON-LD, local assets/related links/sitemap`);

const courses={foundation:50,games:100,advanced:50,math:200};
for(const [course,count] of Object.entries(courses)) {
 const notes=catalog.filter(a=>a.courseNote?.course===course);
 assert.equal(notes.length,count);
 const html=await readFile(`dist/python/guides/courses/${course}/index.html`,'utf8');
 for(const a of notes) assert(html.includes(`/python/guides/${a.slug}/`));
 assert(sitemap.includes(`https://msense.me/python/guides/courses/${course}/`));
}
console.log('PASS: four course hubs and exact 50/100/50/200 note counts');
