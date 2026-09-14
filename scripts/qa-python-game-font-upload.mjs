import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile, mkdir, writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const fontPath=process.env.STUDIO_FONT_QA_FILE || '/tmp/NanumMyeongjoEcoBold.ttf'
const font=await readFile(fontPath)
const out='docs/collaboration/tasks/20260914-studio-font-upload/verification';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000)
const picker=()=>page.locator('.pgs-files input[type=file]')
const row=()=>page.locator('[data-path="NanumMyeongjoEcoBold.ttf"]')
const logs=()=>page.locator('.pgs-console pre').innerText()
const waitText=async text=>page.waitForFunction(text=>document.querySelector('.pgs-console pre')?.textContent.includes(text),text)
const payload={name:'NanumMyeongjoEcoBold.ttf',mimeType:'font/ttf',buffer:font}
try{
 await page.goto('http://127.0.0.1:5180/dev/python-game-studio');await page.locator('.cm-content').waitFor()
 await picker().setInputFiles(payload);console.log('selected font');await row().waitFor({timeout:15000});console.log('row found');await page.locator('.pgs-font-sample').waitFor({timeout:15000})
 await page.waitForFunction(()=>[...document.fonts].some(f=>f.family.startsWith('studio-')&&f.status==='loaded'),null,{timeout:15000})
 await page.waitForFunction(()=>document.querySelector('.pgs-save-state')?.textContent==='이 기기에 저장됨')
 await page.screenshot({path:`${out}/font-preview.png`});console.log('PASS actual 9.36 MiB upload + browser font preview')
 await page.reload();await row().waitFor();await row().click()
 await page.getByRole('button',{name:'파일 교체',exact:true}).click({trial:true})
 await page.locator('.pgs-editor-pane input[type=file]').setInputFiles(payload)
 await page.waitForFunction(()=>document.querySelector('.pgs-notice')?.textContent.includes('교체했습니다'))
 await page.locator('[data-path="main.py"]').click()
 const source=`import pygame\npygame.init()\nscreen=pygame.display.set_mode((640, 220))\nfont=pygame.font.Font('NanumMyeongjoEcoBold.ttf', 40)\nscreen.fill((12, 25, 40))\nscreen.blit(font.render('안녕하세요! 나눔명조 에코', True, (131, 243, 205)), (20, 80))\npygame.display.flip()\nprint('FONT_RENDERED', font.get_height())\nwhile True:\n    for event in pygame.event.get():\n        if event.type == pygame.QUIT: raise SystemExit\n`
 await page.locator('.cm-content').click();await page.keyboard.press('Meta+a');await page.keyboard.insertText(source)
 await page.getByRole('button',{name:'실행',exact:true}).click();await waitText('FONT_RENDERED')
 assert.doesNotMatch(await logs(),/Traceback|Error/);await page.screenshot({path:`${out}/pygame-font.png`})
 await page.getByRole('button',{name:'정지',exact:true}).click()
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'프로젝트 다운로드',exact:true}).click();const download=await downloading;await download.saveAs('/tmp/studio-font-backup.mspygame.json')
 assert.ok((await readFile('/tmp/studio-font-backup.mspygame.json')).length>9*1024*1024)
 await page.getByRole('button',{name:'내 프로젝트',exact:true}).click()
 const choosing=page.waitForEvent('filechooser');await page.getByRole('button',{name:'백업 파일 복원',exact:true}).click();await(await choosing).setFiles('/tmp/studio-font-backup.mspygame.json')
 await page.getByRole('dialog',{name:'내 프로젝트'}).waitFor({state:'detached'});await row().waitFor()
 // A rejected selection must leave the existing project intact and show a local error.
 await picker().setInputFiles({name:'too-large.ttf',mimeType:'font/ttf',buffer:Buffer.alloc(21*1024*1024)})
 await page.locator('.pgs-upload-error').waitFor();assert.match(await page.locator('.pgs-upload-error').innerText(),/20 MB/);assert.equal(await row().count(),1)
 await page.screenshot({path:`${out}/upload-error.png`})
 // Folder import uses the same large-font limits.
 const folderResult=await page.evaluate(async ({data})=>{
  const {readProjectFolder}=await import('/src/components/PythonGameStudio/projectFolderImport.js')
  const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0))
  const result=await readProjectFolder([{relativePath:'lesson/main.py',file:new File(['print(1)'],'main.py')},{relativePath:'lesson/fonts/NanumMyeongjoEcoBold.ttf',file:new File([binary],'NanumMyeongjoEcoBold.ttf')}])
  return {bytes:result.project.totalBytes,paths:result.project.files.map(f=>f.path)}
 },{data:font.toString('base64')})
 assert.ok(folderResult.paths.includes('fonts/NanumMyeongjoEcoBold.ttf'))
 await writeFile(`${out}/checks.json`,JSON.stringify({fontBytes:font.length,upload:true,fontFaceLoaded:true,localReload:true,replace:true,pygameRender:true,backupRestore:true,folderImport:true,visibleLimitError:true},null,2))
 console.log('PASS font reload/replace/pygame/large backup/folder import/visible rejection')
}catch(error){console.error('state',await page.locator('.pgs-notice').allTextContents(),await page.locator('.pgs-font-sample').allTextContents(),await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status}))),await logs().catch(()=>''));await page.screenshot({path:`${out}/failure.png`});throw error}finally{await browser.close()}
