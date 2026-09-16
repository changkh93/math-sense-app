import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000)
const out='docs/collaboration/tasks/20260916-studio-notebook/verification';await mkdir(out,{recursive:true})
const events=[];page.on('pageerror',error=>events.push(error.message))
async function edit(cells){
 await page.waitForFunction(()=>!document.querySelector('.pgs-cell-header button')?.disabled)
 await page.getByRole('button',{name:'노트북 모드',exact:true}).click()
 const text=JSON.stringify({nbformat:4,cells:cells.map(source=>({cell_type:'code',source}))})
 await page.locator('.pgs-editor-pane input[type="file"]').setInputFiles({name:'notebook.ipynb',mimeType:'application/json',buffer:Buffer.from(text)})
 await page.waitForFunction(source=>document.querySelector('.pgs-cell .cm-content')?.textContent.includes(source.split('\n')[0]),cells[0])
 await page.waitForFunction(()=>!document.querySelector('.pgs-run').disabled)
}

async function run(i){console.log('run',i);const before=await page.getByLabel(`${i}번 코드 셀`,{exact:true}).locator('.pgs-cell-header>span').innerText();await page.getByRole('button',{name:`${i}번 셀 실행`,exact:true}).click();await page.waitForFunction(({i,before})=>document.querySelector(`[aria-label="${i}번 코드 셀"] .pgs-cell-header>span`)?.textContent!==before,{i,before});await page.waitForFunction(()=>['실행 완료','오류 확인'].includes(document.querySelector('.pgs-run-status')?.textContent));await page.waitForFunction(()=>!document.querySelector('.pgs-cell-header button')?.disabled)}
const output=i=>page.getByLabel(`${i}번 셀 결과`,{exact:true}).innerText()
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await page.locator('.cm-content').waitFor()
 await edit(['x=21','x*2','def ask():\n    return int(input("숫자: "))','ask()+x'])
 await run(1);await run(2);assert.match(await output(2),/42/)
 await run(3);await page.getByRole('button',{name:'4번 셀 실행',exact:true}).click()
 await page.locator('.pgs-input-form input').fill('5');await page.locator('.pgs-input-form').evaluate(form=>form.requestSubmit())
 await page.waitForFunction(()=>document.querySelector('.pgs-run-status')?.textContent==='실행 완료');assert.match(await output(4),/26/)
 await edit(['from ColabTurtlePlus.Turtle import *\nt=Turtle()\nt.shape("turtle")\nt.forward(100)','t.left(90)\nt.forward(80)\nx','import pandas as pd\nimport csv\nwith open("weather.csv") as f:\n    rows=list(csv.reader(f))\ndata=pd.read_csv("weather.csv")\ndata','data["온도"].mean()','import numpy as np\nimport matplotlib.pyplot as plt\nvalues=np.array([1,2,3])\nplt.plot(values,values*2)\nplt.title("셀 그래프")','values.sum()'])
 await page.locator('input[type=file][multiple]').setInputFiles({name:'weather.csv',mimeType:'text/csv',buffer:Buffer.from('요일,온도\n월,20\n화,30\n')})
 await page.getByRole('button',{name:/notebook.ipynb/}).first().click()
 await run(1);await run(2);assert.match(await output(2),/21/);assert.equal(await page.getByLabel('2번 셀 결과',{exact:true}).locator('.pgs-cell-surface-slot').count(),1)
 await run(3);assert.equal(await page.getByLabel('3번 셀 결과',{exact:true}).locator('table').count(),1);assert.match(await output(3),/월/)
 await run(4);assert.match(await output(4),/25/)
 await run(5);assert.equal(await page.getByLabel('5번 셀 결과',{exact:true}).locator('.pgs-cell-surface-slot').count(),1)
 await run(6);assert.match(await output(6),/6/)
 await page.screenshot({path:out+'/notebook.png'})
 await edit(['x','1/0','print("SHOULD_NOT_RUN")'])
 await page.getByRole('button',{name:'전체 실행',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pgs-run-status')?.textContent==='오류 확인');assert.match(await output(1),/21/);assert.match(await output(2),/ZeroDivisionError/)
 await edit(['x+1']);await run(1);assert.match(await output(1),/22/)
 await page.getByRole('button',{name:'세션 초기화',exact:true}).click();await run(1);assert.match(await output(1),/NameError/)
 console.log('PASS state, input, turtle, CSV, pandas, NumPy, Matplotlib, errors and reset');
 await edit(['from tkinter import *\nwindow=Tk()\nbutton=Button(window,text="클릭",command=lambda:print("TK_CLICK"))\nbutton.grid(row=0,column=0)\nwindow.mainloop()','button.config(text="바뀜")'])
 await run(1);await run(2)
 await page.locator('.pgs-cell-surface-slot').scrollIntoViewIfNeeded()
 const frame=await(await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame();await frame.getByRole('button',{name:'바뀜',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="2번 셀 결과"]')?.textContent.includes('TK_CLICK'))
 console.log('PASS tkinter');
 await edit(['import pygame\npygame.init()\nscreen=pygame.display.set_mode((800,600))','screen.fill((20,100,90))\npygame.display.flip()\nprint(screen.get_size())'])
 await run(1);assert.doesNotMatch(await output(1),/Traceback/);await run(2);assert.match(await output(2),/800, 600/)
 await edit(['name="학생"','print(name)'])
 await page.getByRole('button',{name:'전체 실행',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.pgs-cell-output')[1]?.textContent.includes('학생'))
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'.ipynb 저장',exact:true}).click();const d=await download;assert.ok(d.suggestedFilename().endsWith('.ipynb'))
 await page.setViewportSize({width:768,height:1024});await page.screenshot({path:out+'/tablet.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.reload();await page.locator('.pgs-notebook').waitFor();assert.equal(await page.locator('.pgs-cell').count(),2);assert.match(await page.locator('.pgs-cell').first().innerText(),/학생/);assert.equal(await page.locator('.pgs-cell-output').count(),0)
 await writeFile(out+'/checks.json',JSON.stringify({passed:true,events,state:true,input:true,turtle:true,csv:true,pandas:true,numpy:true,matplotlib:true,tkinter:true,pygame:true,runAllErrorStop:true,restart:true,modeSwitch:true,reload:true,download:true},null,2));console.log('PASS notebook actual Chrome/WASM flows')
}catch(error){console.error(error);console.error(await page.locator('.pgs-notebook').innerText().catch(()=>''));console.error(events);await page.screenshot({path:out+'/failure.png'});process.exitCode=1}finally{await browser.close()}
