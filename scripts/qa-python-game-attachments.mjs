import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile, unlink, readFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const png = (await readFile(new URL('../public/python-game-examples/knight.png', import.meta.url))).toString('base64')
const filename = `__qa-studio-attachment-${Date.now()}.html`
await writeFile(filename, `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background:#101827;color:white"><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import Picker from '/src/components/PythonGameStudio/GameStudioAttachmentPicker.jsx';
import {createProject} from '/src/components/PythonGameStudio/templates.js';
import {saveDraft,listDrafts,deleteDraft} from '/src/components/PythonGameStudio/projectStore.js';
window.store={saveDraft,listDrafts,deleteDraft};
window.own=(await listDrafts('qa-student'))[0]?.project || createProject('나의 프로젝트','print("FIRST")');if(window.own.files.length===1)window.own.files.push({path:'images/test.py',kind:'python',text:'print("NESTED")'},{path:'hero.png',kind:'image',data:'${png}'});
await saveDraft('qa-student',window.own);if(!(await listDrafts('qa-other')).length)await saveDraft('qa-other',createProject('다른 학생 비공개','secret'));
import {initialAssignmentCluster} from '/src/components/Space/assignmentNavigation.js';
if(!sessionStorage.getItem('metasense_current_view')){sessionStorage.setItem('metasense_current_view','assignment_hub');sessionStorage.setItem('metasense_cluster_id','python')}
const restored=initialAssignmentCluster(sessionStorage.getItem('metasense_current_view'),window.location,sessionStorage.getItem('metasense_cluster_id'));
window.restoredCourse=restored;
window.attachments=[];window.busy=false;
createRoot(document.getElementById('root')).render(restored==='python'?React.createElement(Picker,{uid:'qa-student',onBusyChange:value=>window.busy=value,onAdd:files=>window.attachments.push(files)}):null);
</script></body></html>`)
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 950, height: 900 } }); page.setDefaultTimeout(20000)
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try {
  await page.goto(`http://127.0.0.1:5179/${filename}`)
  await page.getByLabel('스튜디오 프로젝트').waitFor()
  assert.equal(await page.getByLabel('스튜디오 프로젝트').locator('option').count(),1)
  assert.doesNotMatch(await page.locator('body').innerText(), /다른 학생 비공개/)
  await page.reload();await page.getByLabel('스튜디오 프로젝트').waitFor();assert.equal(await page.evaluate(()=>window.restoredCourse),'python')
  assert.equal(await page.getByRole('radio').count(),0);assert.equal(await page.getByLabel('hero.png',{exact:true}).count(),0)
  assert.equal(await page.getByRole('checkbox').count(),2)
  await page.getByLabel('main.py',{exact:true}).check()
  await page.evaluate(async()=>{window.own.files[0].text='print("LATEST")';await window.store.saveDraft('qa-student',window.own)})
  await page.getByRole('button',{name:'선택한 파일 1개 첨부',exact:true}).click()
  await page.waitForFunction(()=>window.attachments.length===1)
  const snapshot=await page.evaluate(async()=>await window.attachments[0][0].text())
  assert.equal(snapshot,'print("LATEST")')
  await page.evaluate(async()=>{window.own.files[0].text='print("AFTER_ATTACH")';await window.store.saveDraft('qa-student',window.own)})
  assert.equal(await page.evaluate(async()=>await window.attachments[0][0].text()),'print("LATEST")')
  await page.getByLabel('main.py',{exact:true}).uncheck();await page.getByLabel('images/test.py',{exact:true}).check()
  await page.getByRole('button',{name:'선택한 파일 1개 첨부'}).click();await page.waitForFunction(()=>window.attachments.length===2)
  assert.equal(await page.evaluate(async()=>window.attachments[1][0].text()),'print("NESTED")')
  assert.equal(await page.evaluate(()=>window.attachments[1][0].name),'나의 프로젝트/images/test.py')
  console.log('PASS own-account listing, latest saved snapshot, selected nested source, immutable attachments')
  await page.screenshot({path:'/tmp/metasense-studio-attachment.png'})
  const before=page.url();const popupEvent=page.waitForEvent('popup');await page.getByRole('link',{name:'게임 스튜디오 열기 ↗'}).click();const popup=await popupEvent
  await popup.waitForURL('**/python-game-studio');assert.equal(page.url(),before);assert.equal(await popup.evaluate(()=>window.opener),null)
  await popup.goto('http://127.0.0.1:5179/dev/python-game-studio');await popup.locator('.cm-content').waitFor()
  assert.equal(await popup.getByRole('button',{name:'수업으로 돌아가기'}).count(),0);await popup.close()
  await page.evaluate(async()=>window.store.deleteDraft('qa-student',window.own.id))
  await page.getByRole('button',{name:'선택한 파일 1개 첨부'}).click();await page.getByRole('alert').filter({hasText:'프로젝트가 삭제'}).waitFor()
  assert.equal(await page.evaluate(()=>window.attachments.length),2)
  await page.getByRole('button',{name:'목록 새로고침'}).click();await page.getByText('저장된 프로젝트가 없습니다.',{exact:false}).waitFor()
  assert.deepEqual(errors,[])
  console.log('PASS new tab/no opener, standalone editor no back arrow, deleted-project error and empty state')
} finally {await browser.close();await unlink(filename)}
