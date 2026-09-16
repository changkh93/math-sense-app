import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1024,height:768}});page.setDefaultTimeout(60000)
const out='docs/collaboration/tasks/20260916-studio-notebook/verification'
async function done(){await page.waitForFunction(()=>['실행 완료','오류 확인'].includes(document.querySelector('.pgs-run-status')?.textContent),null,{timeout:120000})}
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await page.locator('.cm-content').waitFor()
 const cells=[{cell_type:'markdown',source:'# 수학 노트\n코드를 실행하고 결과를 관찰해요.'},...[
 'import pandas as pd\ndef square(n): return n*n\nsquare(3)',
 'data=pd.DataFrame({"score":[1,2]})\ndata.to_csv("saved.csv",index=False)',
 'data=pd.DataFrame({"score":[3,4]})\ndata.to_csv("saved.csv",index=False)',
 'pd.read_csv("saved.csv")'].map(source=>({cell_type:'code',source,outputs:[],execution_count:null}))]
 await page.locator('input[accept=".ipynb"]').setInputFiles({name:'lesson.ipynb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({nbformat:4,cells,metadata:{}}))})
 await page.locator('.pgs-notebook').waitFor();assert.equal(await page.locator('.pgs-cell').count(),5)
 assert.match(await page.locator('.pgs-cell-markdown').innerText(),/수학 노트/)
 await page.getByRole('button',{name:'전체 실행',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[aria-label="5번 셀 결과"] table') || document.querySelector('.pgs-run-status')?.textContent==='오류 확인',null,{timeout:120000})
 assert.match(await page.getByLabel('5번 셀 결과',{exact:true}).innerText(),/3/)
 assert.ok(!(await page.locator('.pgs-notice').innerText()).includes('실패'))
 const code=page.getByLabel('2번 코드 셀',{exact:true}).locator('.cm-content'),before=await code.innerText()
 await code.click();await page.keyboard.press('Shift+Enter');await done();assert.equal(await code.innerText(),before);assert.match(await page.getByLabel('2번 셀 결과',{exact:true}).innerText(),/9/)
 // Completion in a later cell can see imports and objects in prior cells.
 const later=page.getByLabel('5번 코드 셀',{exact:true}).locator('.cm-content');await later.click();await page.keyboard.press('Meta+a');await page.keyboard.insertText('data.');await page.keyboard.press('Control+Space');await page.getByRole('option').filter({hasText:'to_csv'}).first().waitFor()
 await page.keyboard.press('Escape');await page.keyboard.press('Meta+a');await page.keyboard.insertText('pd.read_csv("saved.csv")')
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'.ipynb 저장',exact:true}).click();const download=await downloading
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.cells.length,5);assert.equal(exported.cells[0].cell_type,'markdown');assert.ok(exported.cells[4].source.includes('read_csv'))
 await page.getByRole('button',{name:'+ 설명 셀',exact:true}).click();await page.getByLabel('6번 설명 편집',{exact:true}).fill('메모 저장');await page.getByRole('button',{name:'설명 보기',exact:true}).click()
 await page.getByRole('button',{name:'6번 셀 위로',exact:true}).click();assert.match(await page.getByLabel('5번 설명 셀',{exact:true}).innerText(),/메모 저장/)
 await page.getByRole('button',{name:'5번 셀 삭제',exact:true}).click();assert.equal(await page.locator('.pgs-cell').count(),5)
 await page.locator('.pgs-main-panes').evaluate(el=>el.scrollTop=0);await page.screenshot({path:out+'/import-tablet.png'})
 await page.waitForFunction(()=>document.querySelector('.pgs-save-state')?.textContent==='이 기기에 저장됨');await page.reload();await page.locator('.pgs-notebook').waitFor();assert.equal(await page.locator('.pgs-cell').count(),5)
 await page.getByRole('button',{name:/saved.csv/}).click();assert.match(await page.locator('.pgs-csv-preview').innerText(),/score\n3\n4/)
 await page.getByRole('button',{name:/lesson.ipynb/}).first().click();await page.getByRole('button',{name:'파일 모드',exact:true}).click()
 await page.locator('.cm-content').click();await page.keyboard.press('Meta+a');await page.keyboard.insertText('print("FILE_MODE_OK")');await page.getByRole('button',{name:'실행',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pgs-console pre')?.textContent.includes('FILE_MODE_OK'))
 await page.getByRole('button',{name:'코드 · 파일',exact:true}).click();await page.getByRole('button',{name:'노트북 모드',exact:true}).click();const editor=page.locator('.pgs-cell .cm-content').first();await editor.click();await page.keyboard.press('Meta+a');await page.keyboard.insertText('import pygame\npygame.init()\npygame.display.set_mode((200,200))\nwhile True:\n    pygame.event.get()')
 await page.getByRole('button',{name:'2번 셀 실행',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pgs-run-status')?.textContent==='실행 중');await page.getByRole('button',{name:'정지',exact:true}).click();assert.equal(await page.locator('.pgs-run-status').innerText(),'정지됨');await page.getByRole('button',{name:'2번 셀 실행',exact:true}).isEnabled()
 await writeFile(out+'/workflow-checks.json',JSON.stringify({passed:true,ipynbImportExport:true,markdown:true,cellReorderDelete:true,shiftEnterUnchangedSource:true,previousCellCompletion:true,csvRepeatedSaveReload:true,fileModeRegression:true,stopInfinitePygame:true},null,2));console.log('PASS notebook import/export, CSV writes/reload, Markdown, keyboard, completions, file mode and stop')
}catch(error){console.error(error);console.error(await page.locator('.pgs-console').innerText().catch(()=>''));await page.screenshot({path:out+'/workflow-failure.png'});process.exitCode=1}finally{await browser.close()}
