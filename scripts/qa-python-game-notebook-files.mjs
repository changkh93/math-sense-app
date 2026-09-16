import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile, writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000)
const out='docs/collaboration/tasks/20260916-studio-notebook/verification', errors=[]
page.on('pageerror',e=>errors.push(e.message))
const file=path=>page.locator(`[data-kind="file"][data-path="${path}"]`)
async function edit(code){const editor=page.locator('.pgs-editor-pane .cm-content').first();await editor.click();await page.keyboard.press('Meta+a');await page.keyboard.insertText(code)}
async function saved(){await page.waitForFunction(()=>document.querySelector('.pgs-save-state')?.textContent==='이 기기에 저장됨')}
async function download(name){const wait=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const result=await wait;return {name:result.suggestedFilename(),text:await readFile(await result.path(),'utf8')}}
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await file('main.py').waitFor();assert.equal(await file('notebook.ipynb').count(),0)
 await edit('print("PY_ORIGINAL")')
 await page.getByRole('button',{name:'노트북 모드',exact:true}).click();await file('notebook.ipynb').waitFor();assert.equal((await page.locator('.pgs-cell .cm-content').innerText()).trim(),'')
 await edit('number=17');await page.getByRole('button',{name:'+ 코드 셀',exact:true}).click()
 await page.locator('.pgs-cell .cm-content').nth(1).click();await page.keyboard.insertText('print(number*2)')
 await page.getByRole('button',{name:'전체 실행',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="2번 셀 결과"]')?.textContent.includes('34'),null,{timeout:120000})
 await page.getByRole('button',{name:'파일 모드',exact:true}).click();assert.match(await page.locator('.cm-content').innerText(),/PY_ORIGINAL/)
 await page.getByRole('button',{name:'노트북 모드',exact:true}).click();assert.equal(await page.locator('.pgs-cell').count(),2)
 await page.getByRole('button',{name:'노트북 파일 추가',exact:true}).click();assert.match(await page.getByLabel('이름',{exact:true}).inputValue(),/\.ipynb$/)
 await page.getByLabel('이름',{exact:true}).fill('연습.ipynb');await page.getByRole('button',{name:'확인',exact:true}).click();await file('연습.ipynb').waitFor();await edit('print("SECOND_BOOK")')
 await page.getByRole('button',{name:'파일 모드',exact:true}).click();await page.getByRole('button',{name:'노트북 모드',exact:true}).click();assert.match(await page.locator('.pgs-editor-pane>.pgs-panel-title').innerText(),/연습.ipynb/)
 await saved();await page.reload();await page.locator('.pgs-notebook').waitFor();assert.match(await page.locator('.cm-content').innerText(),/SECOND_BOOK/)
 await file('notebook.ipynb').click();assert.equal(await page.locator('.pgs-cell').count(),2)
 const selected=await download('선택한 파일 다운로드');assert.equal(selected.name,'notebook.ipynb');assert.equal(JSON.parse(selected.text).cells[1].source,'print(number*2)')
 const backup=await download('프로젝트 다운로드'), project=JSON.parse(backup.text);assert.equal(project.files.find(f=>f.path==='main.py').text,'print("PY_ORIGINAL")');assert.equal(project.files.filter(f=>f.kind==='notebook').length,2)
 // Mount the actual assignment picker against synthetic local drafts, with no submission/network writes.
 await saved();await page.evaluate(async()=>{
   const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');const {default:Picker}=await import('/src/components/PythonGameStudio/GameStudioAttachmentPicker.jsx')
   const host=document.createElement('div');host.id='qa-picker';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#102031;padding:30px;overflow:auto';document.body.append(host)
   createRoot(host).render(React.createElement(Picker,{uid:'local-preview',onAdd:async files=>window.qaAttachments=await Promise.all(files.map(async file=>({name:file.name,type:file.type,text:await file.text()})))}))
 })
 await page.locator('#qa-picker').getByLabel('notebook.ipynb',{exact:true}).check();await page.locator('#qa-picker').getByRole('button',{name:'선택한 파일 1개 첨부',exact:true}).click();await page.waitForFunction(()=>window.qaAttachments?.length===1)
 const attached=await page.evaluate(()=>window.qaAttachments[0]);assert.equal(attached.type,'application/x-ipynb+json');assert.equal(JSON.parse(attached.text).cells.length,2)
 await page.locator('#qa-picker').getByRole('button',{name:'목록 새로고침',exact:true}).click();await page.locator('#qa-picker').getByLabel('연습.ipynb',{exact:true}).waitFor();await page.locator('#qa-picker').evaluate(el=>el.remove())
 // Folder import keeps native notebooks and subfolders, including notebook-only projects.
 const folder=await page.evaluate(async text=>{
   const {readProjectFolder}=await import('/src/components/PythonGameStudio/projectFolderImport.js')
   return readProjectFolder([{file:new File([text],'study.ipynb'),relativePath:'학습/notes/study.ipynb'}])
 },selected.text);assert.equal(folder.project.entrypoint,'notes/study.ipynb');assert.equal(folder.project.files[0].kind,'notebook')
 await page.getByRole('button',{name:'내 프로젝트',exact:true}).click();await page.locator('input[accept=".json,.mspygame.json,.py,.ipynb"]').setInputFiles({name:backup.name,mimeType:'application/json',buffer:Buffer.from(backup.text)})
 await page.waitForFunction(()=>!document.querySelector('.pgs-library'));await file('연습.ipynb').waitFor();await file('notebook.ipynb').click();assert.equal(await page.locator('.pgs-cell').count(),2)
 await page.screenshot({path:out+'/native-notebook-files.png'});assert.deepEqual(errors,[])
 await writeFile(out+'/native-file-checks.json',JSON.stringify({passed:true,lazyCreation:true,independentPython:true,multipleNotebooks:true,reload:true,download:true,backupRestore:true,notebookOnlyFolder:true,actualAssignmentPicker:true,nativeJsonAttachment:true},null,2));console.log('PASS native notebooks, independent scripts, multiple files, persistence, import/export and actual assignment picker')
}catch(error){console.error(error);console.error(await page.locator('.pgs-notice').innerText().catch(()=>''));await page.screenshot({path:out+'/native-files-failure.png'});process.exitCode=1}finally{await browser.close()}
