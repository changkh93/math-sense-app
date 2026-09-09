import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})})
const context=await browser.newContext()
const a=await context.newPage(),url=process.env.GAME_STUDIO_QA_URL||'http://127.0.0.1:5179/dev/python-game-studio'
try {
 await a.goto(url);await a.getByLabel('프로젝트 이름',{exact:true}).waitFor();await a.waitForTimeout(600)
 const b=await context.newPage();await b.goto(url);await b.getByLabel('프로젝트 이름',{exact:true}).waitFor();await b.waitForTimeout(600)
 await a.getByLabel('프로젝트 이름',{exact:true}).fill('TAB A');await a.waitForTimeout(700)
 await b.getByLabel('프로젝트 이름',{exact:true}).fill('TAB B');await b.waitForFunction(()=>document.querySelector('input[aria-label="프로젝트 이름"]').value.includes('탭 충돌 사본'));await b.waitForTimeout(600)
 let rows=await b.evaluate(async()=>{const {listDrafts}=await import('/src/components/PythonGameStudio/projectStore.js');return (await listDrafts('local-preview')).map(row=>row.project.title)})
 assert.ok(rows.includes('TAB A'));assert.ok(rows.some(x=>x.startsWith('TAB B')&&x.includes('충돌 사본')))
 console.log('PASS two-tab edits preserve both projects')
 await context.setOffline(true);await b.getByLabel('프로젝트 이름',{exact:true}).fill('OFFLINE DRAFT');await b.waitForTimeout(600);await context.setOffline(false);await b.reload();await b.getByLabel('프로젝트 이름',{exact:true}).waitFor();assert.equal(await b.getByLabel('프로젝트 이름',{exact:true}).inputValue(),'OFFLINE DRAFT');console.log('PASS offline edits and reload recovery')
 const isolated=await b.evaluate(async()=>{const m=await import('/src/components/PythonGameStudio/projectStore.js');const rows=await m.listDrafts('local-preview');await m.saveDraft('different-user',{...rows[0].project,title:'PRIVATE OTHER'});return (await m.listDrafts('local-preview')).every(row=>row.project.title!=='PRIVATE OTHER')})
 assert.ok(isolated);console.log('PASS draft user namespaces')
 const downloadPromise=b.waitForEvent('download');await b.getByRole('button',{name:'프로젝트 다운로드',exact:true}).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.mspygame.json'));console.log('PASS project export')
 await b.getByRole('button',{name:'내 프로젝트',exact:true}).click();await b.locator('input[type=file][accept=".json,.mspygame.json,.py"]').setInputFiles({name:download.suggestedFilename(),buffer:await readFile(await download.path())});await b.waitForFunction(()=>document.querySelector('.pgs-notice')?.textContent.includes('새 사본'));console.log('PASS project import')
}finally{await browser.close()}
