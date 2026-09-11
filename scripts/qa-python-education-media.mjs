import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const out='docs/collaboration/tasks/20260911-python-showcase/verification';
try{
 await p.goto('http://127.0.0.1:5180/python');await p.locator('.pe-course-rail').scrollIntoViewIfNeeded();
 let previousVideo=null;
 for(const i of [0,1,3,4,5]){
  await p.locator('.pe-course-rail button').nth(i).click();if(previousVideo)assert.deepEqual(await previousVideo.evaluate(video=>({paused:video.paused,connected:video.isConnected})),{paused:true,connected:false});const v=p.locator('.pe-course-video video');assert.equal(await v.getAttribute('preload'),'none');
  await v.evaluate(async video=>{video.muted=true;await video.play()});await p.waitForFunction(()=>document.querySelector('.pe-course-video video')?.currentTime>0.2)
  const info=await v.evaluate(video=>({duration:video.duration,error:video.error?.message,src:video.currentSrc}));assert.ok(Math.abs(info.duration-57)<0.1);assert.equal(info.error,undefined);assert.ok(info.src.endsWith('?v=music-2'));previousVideo=await v.elementHandle();
 }
 await p.locator('.pe-video-credits summary').click();assert.equal(await p.locator('.pe-video-credits li').count(),5);assert.equal(await p.locator('.pe-video-credits').getByText('Pixelland',{exact:true}).count(),0);await p.locator('.pe-course-rail button').nth(2).click();assert.equal(await previousVideo.evaluate(video=>video.paused),true);assert.equal(await p.locator('.pe-course-video iframe').count(),0)
 await p.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<p>QA: YouTube embed endpoint intercepted; no external playback assertion.</p>'}))
 await p.getByRole('button',{name:'게임 프로젝트 영상 보기'}).click();assert.match(await p.locator('.pe-course-video iframe').getAttribute('src'),/xVBNU8vHoW4/)
 await p.locator('.pe-course-rail button').nth(0).click();assert.equal(await p.locator('.pe-course-video iframe').count(),0);
 await p.waitForTimeout(200);await p.screenshot({path:`${out}/desktop-courses.png`});await p.setViewportSize({width:390,height:844});await p.locator('.pe-course-rail').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/mobile-courses.png`});
 await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${out}/desktop-full.png`,fullPage:true});assert.deepEqual(errors,[])
 await writeFile(`${out}/playback-checks.json`,JSON.stringify({localVideos:5,duration:57,musicRevision:'music-2',distinctCreditEntries:5,metadataAndPlayback:'pass',switchPausesAndRemovesPreviousVideo:true,youtube:'click mounts correct nocookie video id; external playback not asserted',browserErrors:errors},null,2))
 console.log('PASS all five final videos play; selection/YouTube gating; no browser exceptions')
}finally{await b.close()}
