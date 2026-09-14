import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});page.setDefaultTimeout(90000)
const out='docs/collaboration/tasks/20260914-studio-responsive-preview/verification';await mkdir(out,{recursive:true})
const results=[]
const source=`from ColabTurtlePlus.Turtle import *
clearscreen()
baby = Turtle()
baby.shape('turtle')
baby.forward(400)
baby.forward(-200)
baby.back(200)
baby.right(90)
baby.forward(100)
print('DRAWING_DONE')`
const frame=async()=>await(await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
const logs=()=>page.locator('.pgs-console pre').innerText()
async function codeView(){const b=page.getByRole('button',{name:'코드 · 파일',exact:true});if(await b.isVisible())await b.click()}
async function run(code){await codeView();await page.locator('.cm-content').click();await page.keyboard.press('Meta+a');await page.keyboard.insertText(code);await page.getByRole('button',{name:'실행',exact:true}).click()}
async function waitText(text){await page.waitForFunction(text=>document.querySelector('.pgs-console pre')?.textContent.includes(text),text)}
async function fit(label){
 const f=await frame();await f.waitForFunction(()=>document.querySelector('#turtle-canvas')&&innerWidth>0)
 const m=await f.locator('#turtle-canvas').evaluate(svg=>{
  const matrix=svg.getScreenCTM(),box=svg.viewBox.baseVal
  const corners=[[box.x,box.y],[box.x+box.width,box.y+box.height]].map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(matrix);return [p.x,p.y]})
  const actor=svg.querySelector('[data-turtle]');const p=new DOMPoint(0,0).matrixTransform(actor.getScreenCTM())
  return {viewport:[innerWidth,innerHeight],corners,actor:[p.x,p.y],scale:[matrix.a,matrix.d],rect:svg.getBoundingClientRect().toJSON()}
 })
 const [w,h]=m.viewport;assert.ok(m.corners[0][0]>=-1&&m.corners[0][1]>=-1&&m.corners[1][0]<=w+1&&m.corners[1][1]<=h+1,JSON.stringify(m));assert.ok(Math.abs(m.scale[0]-m.scale[1])<.001)
 assert.ok(m.actor[0]>=0&&m.actor[0]<=w&&m.actor[1]>=0&&m.actor[1]<=h)
 const box=await page.locator('.pgs-game-frame').boundingBox();const size=page.viewportSize();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1)
 results.push({label,...m});await page.screenshot({path:`${out}/${label}.png`})
}
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await page.locator('.cm-content').waitFor()
 await run(source);await waitText('DRAWING_DONE');await page.waitForFunction(()=>document.querySelector('.pgs-run-status')?.textContent==='실행 완료')
 await fit('desktop')
 const id=await(await frame()).evaluate(()=>window.responsiveQA='same-iframe')
 for(const [label,width,height] of [['tablet-landscape',1024,768],['tablet-portrait',768,1024],['small-landscape',900,600],['phone-portrait',390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);await fit(label)
 }
 await codeView();assert.equal((await page.locator('.cm-content').innerText()).trim(),source.trim())
 await page.getByRole('button',{name:'실행',exact:true}).click();await waitText('DRAWING_DONE');await page.waitForFunction(()=>document.querySelector('.pgs-run-status')?.textContent==='실행 완료')
 assert.equal(await page.getByRole('button',{name:'실행 화면 · 출력',exact:true}).getAttribute('aria-pressed'),'true')
 await page.getByRole('button',{name:'실행 화면 크게 보기',exact:true}).click();await fit('enlarged')
 await page.getByRole('button',{name:'실행 화면 원래 크기로',exact:true}).click();await fit('restored')
 assert.equal(await(await frame()).evaluate(()=>window.responsiveQA),id)
 await page.setViewportSize({width:1440,height:900})
 await page.getByRole('separator',{name:'출력·오류 영역 높이 조절'}).focus();await page.keyboard.press('End');await fit('short-preview')
 const pygame=`import pygame\npygame.init()\nscreen=pygame.display.set_mode((800,600))\nscreen.fill((30,100,90))\npygame.display.flip()\nprint('GAME_READY')\nwhile True:\n    for e in pygame.event.get():\n        if e.type==pygame.MOUSEBUTTONDOWN: print('CLICK', *e.pos)\n`
 await run(pygame);await waitText('GAME_READY')
 for(const [width,height] of [[1440,900],[768,1024]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200)
  const canvas=(await frame()).locator('#canvas'),box=await canvas.boundingBox()
  const dims=await canvas.evaluate(el=>({w:el.width,h:el.height,cw:el.clientWidth,ch:el.clientHeight,vw:innerWidth,vh:innerHeight}))
  assert.ok(Math.abs(box.width/box.height-4/3)<.01);assert.ok(dims.cw<=dims.vw+1&&dims.ch<=dims.vh+1)
  await page.getByRole('button',{name:'지우기',exact:true}).click()
  await canvas.click({position:{x:box.width*.25,y:box.height*.75}})
  await waitText('CLICK');const match=(await logs()).match(/CLICK (\d+) (\d+)/);assert.ok(match);assert.ok(Math.abs(Number(match[1])-200)<=2&&Math.abs(Number(match[2])-450)<=2,match[0])
 }
 await run("name=input('이름: ')\nprint('HELLO',name)");await page.locator('.pgs-input-form input').waitFor();await page.locator('.pgs-input-form input').fill('학생');await page.locator('.pgs-input-form input').press('Enter');await waitText('HELLO 학생')
 assert.doesNotMatch(await logs(),/Traceback/)
 await writeFile(`${out}/checks.json`,JSON.stringify({fits:results,automaticResultView:true,sameIframe:true,sourceUnchanged:true,pygameMouseCoordinates:true,tabletInput:true},null,2))
 console.log('PASS responsive turtle viewport/corners/actor, rotate/switch/enlarge/resize, pygame fit+mouse, tablet input')
}catch(error){console.error('state',await logs().catch(()=>''));await page.screenshot({path:`${out}/failure.png`});throw error}finally{await browser.close()}
