import {createRequire} from 'node:module'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
const {chromium}=createRequire(import.meta.url)('/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const dir=path.resolve(process.env.CAPTURE_DIR || 'videos/python-course-showcase/out/captures')
await mkdir(dir,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']})
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir,size:{width:1600,height:900}},locale:'ko-KR'})
const started=Date.now(); const page=await context.newPage(); page.setDefaultTimeout(180000)
const report={segments:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message))
const time=()=> (Date.now()-started)/1000
const sleep=ms=>page.waitForTimeout(ms)
const editor=page.locator('.cm-content')
async function code(source){await editor.click();await page.keyboard.press('Meta+a');await page.keyboard.insertText(source);await page.keyboard.press('Escape')}
async function run(){await page.getByRole('button',{name:'실행',exact:true}).click()}
async function done(){await page.waitForFunction(()=>/exited|error/.test(document.querySelector('.pgs-run-status')?.className||''));const log=await page.locator('.pgs-console pre').innerText();if(log.includes('Traceback'))throw Error(log);return log}
const frame=async()=> (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await editor.waitFor()
 await code('import numpy as np\nimport matplotlib.pyplot as plt\nprint("촬영 준비 완료")');await run();await done();console.log('runtime warm',time())
 for(const id of (process.env.CAPTURE_COURSES || 'foundation,math,advanced,algorithm').split(',').filter(Boolean)){
  const source=await readFile(`videos/python-course-showcase/examples/${id}.py`,'utf8')
  const titles={foundation:'처음 파이썬 · 나만의 꽃',math:'파이썬 수학 · 기울기 실험',advanced:'파이썬 심화 · 단어 카드',algorithm:'생각의 항로 · 신호 규칙'}
  await page.locator('.pgs-brand input').fill(titles[id]);await page.locator('.pgs-brand input').press('Tab')
  const split=source.lastIndexOf('\n', Math.floor(source.length*0.66));await code(source.slice(0,split)+'\n');await sleep(600)
  const segment={id,start:time()};await sleep(1600)
  await editor.click();await page.keyboard.press('Meta+End')
  // Insert genuine source into CodeMirror, in small chunks; all output is real runtime output.
  const tail=source.slice(split+1);for(const line of tail.split('\n')){await page.keyboard.insertText(line+'\n');await sleep(170)}
  await page.keyboard.press('Escape');await sleep(1000);await run();segment.run=time();console.log('run',id,segment.run)
  if(id==='advanced'){
   const f=await frame();await f.getByText('imagine',{exact:true}).waitFor();await sleep(2500)
   await f.getByRole('button',{name:'뜻 확인',exact:true}).click();await f.getByText('상상하다',{exact:true}).waitFor();await sleep(3500)
   await f.getByRole('button',{name:'다음 단어',exact:true}).click();await f.getByText('create',{exact:true}).waitFor();await sleep(2500)
   await f.getByRole('button',{name:'뜻 확인',exact:true}).click();await f.getByText('만들다',{exact:true}).waitFor();await sleep(3000)
   await f.getByRole('button',{name:'다음 단어',exact:true}).click();await f.getByText('imagine',{exact:true}).waitFor();await sleep(2500)
   segment.result='Tk callbacks verified: imagine → 상상하다 → create → 만들다 → imagine'

  }else {segment.result=await done();await sleep(3500)}
  await page.screenshot({path:path.join(dir,`${id}-screen.png`)}); segment.resultAt=time();
  await sleep(Math.max(2000,30000-(Date.now()-started-segment.start*1000)))
  segment.end=time();report.segments.push(segment);console.log('captured',segment)
 }
 if(process.env.CAPTURE_LUMI !== '0') {
 await page.goto('http://127.0.0.1:5180/videos/python-course-showcase/capture.html');await page.locator('.python-lab__code-panel').waitFor()
 const close=page.getByRole('button',{name:'닫기',exact:true});if(await close.isVisible())await close.click()
 await page.waitForFunction(()=>document.body.innerText.includes('PYTHON READY'))
 await code('');const segment={id:'lumi',start:time()};await sleep(1700)
 await page.keyboard.insertText('lumi.move(2)\n');await sleep(1400);await page.keyboard.insertText('lumi.turn(90)\n');await sleep(1400);await page.keyboard.insertText('lumi.move(1)');await page.keyboard.press('Escape');await sleep(1200)
 await page.locator('.python-lab__editor-toolbar .is-run').click();segment.run=time();await sleep(10000)
 await page.screenshot({path:path.join(dir,'lumi-screen.png')});segment.result=(await page.locator('body').innerText()).slice(-7000);await sleep(13000);segment.end=time();report.segments.push(segment);console.log('captured lumi',segment.result)
 }
}catch(e){report.failure=e.stack;console.error(e)}finally{
 report.video=await page.video().path();await context.close();await browser.close();await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log('REPORT',dir)
}
