import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await b.newPage({viewport:{width:1440,height:1050}});
const out='docs/collaboration/tasks/20260911-python-showcase/verification';
try {
 await p.goto('http://127.0.0.1:5180/python');
 const cards=p.locator('.pe-course-rail button');
 assert.equal(await cards.count(),6);
 await p.locator('#courses').scrollIntoViewIfNeeded();
 await p.locator('.pe-course-rail img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 for(const width of [1440,1024,768,390,360]) {
  await p.setViewportSize({width,height:1050});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow: ${width}`);
  for(const card of await cards.all()) await card.isVisible().then(v=>assert.ok(v));
  await p.locator('#course-videos').scrollIntoViewIfNeeded();
  if(width===1440 || width===390) await p.screenshot({path:`${out}/gallery-${width}.png`});
 }
 await p.setViewportSize({width:390,height:844});
 await cards.nth(0).click();
 assert.equal(await p.getByRole('button',{name:'이전 영상 보기'}).isDisabled(),true);
 for(let i=1;i<6;i++) {
  await p.locator('.pe-next-video').click();
  assert.equal(await cards.nth(i).getAttribute('aria-pressed'),'true');
  assert.equal(await p.locator('.pe-player-heading b').textContent(),`${i+1} / 6`);
  if(i===2) assert.equal(await p.locator('.pe-course-video iframe').count(),0);
 }
 await p.locator('.pe-next-video').click();
 assert.equal(await cards.first().getAttribute('aria-pressed'),'true');
 await p.locator('.pe-player-heading a').click();
 await cards.nth(4).focus(); await p.keyboard.press('Enter');
 assert.equal(await cards.nth(4).getAttribute('aria-pressed'),'true');
 await p.getByRole('button',{name:'이전 영상 보기'}).click();
 assert.equal(await cards.nth(3).getAttribute('aria-pressed'),'true');
 await p.screenshot({path:`${out}/gallery-mobile-player.png`});
 await writeFile(`${out}/gallery-checks.json`,JSON.stringify({cards:6,widths:[1440,1024,768,390,360],noOverflow:true,nextPreviousAndWrap:'pass',keyboardSelection:'pass',gameClickGate:'preserved',autoplay:false},null,2));
 console.log('PASS six visible thumbnail cards; responsive layouts; next/previous/wrap; keyboard; game click gate');
} finally {await b.close()}
