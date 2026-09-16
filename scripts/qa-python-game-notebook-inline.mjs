import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000)
const out='docs/collaboration/tasks/20260916-studio-notebook/verification', errors=[]
page.on('pageerror',e=>errors.push(e.message))
const cell=i=>page.getByLabel(`${i}번 코드 셀`,{exact:true})
const result=i=>page.getByLabel(`${i}번 셀 결과`,{exact:true})
async function run(i){console.log('run',i);await page.getByRole('button',{name:`${i}번 셀 실행`,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.pgs-cell-header button')?.disabled,null,{timeout:30000});console.log('done',i);}
async function replace(i,code){await page.waitForFunction(()=>!document.querySelector('.pgs-cell-header button')?.disabled);await cell(i).locator('.cm-content[contenteditable="true"]').click();await page.keyboard.press('Meta+a');await page.keyboard.insertText(code);assert.equal((await cell(i).locator('.cm-content').innerText()).trim(),code.trim())}

try {
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await page.locator('.cm-content').waitFor()
 await page.locator('.cm-content').click();await page.keyboard.insertText('# %%\nfrom ColabTurtlePlus.Turtle import *\nt=Turtle()\nt.shape("turtle")\nt.forward(100)\n# %%\nprint("ONLY_TEXT")\n# %%\nprint("unterminated)\n# %%\nt.left(90)\nt.forward(70)\n')
 await page.getByRole('button',{name:'노트북 모드',exact:true}).click()
 await run(1)
 const iframe=page.locator('iframe[title="Python 코드 실행 화면"]'), frame=await(await iframe.elementHandle()).contentFrame()
 await frame.evaluate(()=>window.qaIdentity='same-interpreter')
 assert.equal(await page.locator('.pgs-console').count(),0)
 assert.equal(await page.locator('.pgs-panel-switch').isVisible(),false)
 const editor=await page.locator('.pgs-editor-pane').boundingBox();assert.ok(editor.width>1100)
 await page.locator('.pgs-cell-surface-slot').scrollIntoViewIfNeeded()
 await page.waitForFunction(()=>document.querySelector('.pgs-preview-pane')?.style.opacity==='1')
 const slot=await page.locator('.pgs-cell-surface-slot').boundingBox(), box=await iframe.boundingBox();assert.ok(Math.abs(slot.x-box.x)<2&&Math.abs(slot.y-box.y)<2)
 await page.screenshot({path:out+'/inline-desktop.png'})
 await run(2);assert.match(await result(2).innerText(),/ONLY_TEXT/);assert.equal(await result(2).locator('img,.pgs-cell-surface-slot').count(),0)
 await run(3);assert.match(await result(3).innerText(),/SyntaxError/);assert.equal(await result(3).locator('img,.pgs-cell-surface-slot').count(),0)
 await run(4);assert.equal(await result(1).locator('img').count(),1);assert.equal(await result(4).locator('.pgs-cell-surface-slot').count(),1)
 assert.equal(await frame.evaluate(()=>window.qaIdentity),'same-interpreter')
 await page.getByRole('button',{name:'파일 모드',exact:true}).click();assert.equal(await page.locator('.pgs-console').count(),1)
 await page.getByRole('button',{name:'노트북 모드',exact:true}).click();assert.equal(await frame.evaluate(()=>window.qaIdentity),'same-interpreter')
 await replace(2,'n=int(input("숫자 입력: "))\nprint(n*3)')
 await page.getByRole('button',{name:'2번 셀 실행',exact:true}).click();await result(2).locator('.pgs-input-form input').fill('7');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[aria-label="2번 셀 결과"]')?.textContent.includes('21'))
 await replace(2,'import asyncio\nasync def main():\n    print("TASK_OK")\nasyncio.run(main())');await run(2);assert.match(await result(2).innerText(),/TASK_OK/);assert.doesNotMatch(await result(2).innerText(),/Task pending/)
 await replace(2,'from tkinter import *\nwindow=Tk()\nbutton=Button(window,text="셀 버튼",command=lambda: print("CLICK_OK"))\nbutton.grid(row=0,column=0)\nwindow.mainloop()');await run(2)
 await frame.getByRole('button',{name:'셀 버튼',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="2번 셀 결과"]')?.textContent.includes('CLICK_OK'))
 for(const size of [{width:1024,height:768},{width:768,height:1024}]) {
   await page.setViewportSize(size);await page.locator('.pgs-cell-surface-slot').scrollIntoViewIfNeeded();await frame.getByRole('button',{name:'셀 버튼',exact:true}).click()
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   await page.screenshot({path:out+`/inline-tablet-${size.width}.png`})
 }
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();assert.equal(await page.locator('.pgs-preview-expanded').count(),1);await frame.getByRole('button',{name:'셀 버튼',exact:true}).click();await page.getByRole('button',{name:'실행 화면 원래 크기로',exact:true}).click();assert.equal(await frame.evaluate(()=>window.qaIdentity),'same-interpreter')
 assert.deepEqual(errors,[])
 await writeFile(out+'/inline-checks.json',JSON.stringify({passed:true,fullWidth:true,noDuplicateConsole:true,inlineTurtle:true,inlineInput:true,inlineTkInteraction:true,syntaxErrorNoBlankGraphic:true,plainPrintNoGraphic:true,previousSnapshot:true,noTaskLeak:true,sameInterpreterAcrossCellsAndModes:true,tabletLandscapePortrait:true,enlargeRestore:true,errors},null,2))
 console.log('PASS inline notebook graphics/input/errors, persistent interpreter, full width and tablet layouts')
} catch(e){console.error(e);console.error(await page.locator('.pgs-preview-pane').evaluate(el=>({style:el.getAttribute('style'),hidden:el.getAttribute('aria-hidden'),rect:el.getBoundingClientRect().toJSON()})));const f=await(await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame();console.error(await f.evaluate(()=>({run:window.studioActiveRun,command:window.studioCommand,visual:window.studioVisualRun,busy:window.studioTurtleBusy(),ready:window.studioEngineReady}))); console.error(await page.locator('.pgs-notebook').innerText().catch(()=>''));await page.screenshot({path:out+'/inline-failure.png'});process.exitCode=1} finally {await browser.close()}
