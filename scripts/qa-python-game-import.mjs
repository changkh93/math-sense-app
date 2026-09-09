import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext()
context.setDefaultTimeout(15000)
const page = await context.newPage()
const rows = () => page.evaluate(async () => (await import('/src/components/PythonGameStudio/projectStore.js')).listDrafts('local-preview'))
const library = async () => { if (!await page.getByRole('dialog', { name: '내 프로젝트', exact: true }).count()) await page.getByRole('button', { name: '내 프로젝트', exact: true }).click() }
async function choose(file) {
  await library()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '백업 파일 복원', exact: true }).click()
  await (await chooser).setFiles(file)
}
async function success() { await page.waitForFunction(() => document.querySelector('.pgs-notice')?.textContent.includes('새 사본으로 가져왔습니다')) }
async function failure() { await page.waitForFunction(() => document.querySelector('.pgs-library')?.textContent.includes('가져오기 실패:')) }
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio'); await page.locator('.cm-content').waitFor()
  await library(); await page.getByRole('button', { name: '몬스터 잡기 예제' }).click()
  await page.waitForFunction(() => document.querySelector('input[aria-label="프로젝트 이름"]')?.value === '몬스터 잡기')
  const font = await readFile('/System/Library/Fonts/Supplemental/Arial.ttf')
  await page.locator('input[type=file][multiple]:not([webkitdirectory])').setInputFiles({ name: 'myfont.ttf', mimeType: 'font/ttf', buffer: font })
  await page.waitForFunction(() => document.querySelector('.pgs-file-list')?.textContent.includes('myfont.ttf'))
  await library(); await page.getByRole('button', { name: '프로젝트 목록 닫기' }).click()
  const original = (await rows())[0].project
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '프로젝트 다운로드', exact: true }).click()
  const download = await downloadEvent
  const exported = { name: download.suggestedFilename(), mimeType: 'application/json', buffer: await readFile(await download.path()) }
  await choose(exported); await success()
  let imported = (await rows())[0].project
  assert.notEqual(imported.id, original.id); assert.deepEqual(imported.files, original.files); assert.equal(imported.entrypoint, original.entrypoint)
  assert.ok((await rows()).some(row => row.project.id === original.id))
  console.log('PASS actual file chooser + exported code/images/sounds/font import; original retained and imported draft persisted')
  await page.reload(); await page.locator('.cm-content').waitFor(); assert.equal((await rows())[0].project.id, imported.id)
  await choose(exported); await success(); assert.notEqual((await rows())[0].project.id, imported.id)
  console.log('PASS reload recovery and importing the same file again')
  const idBeforeInvalid = (await rows())[0].project.id, count = (await rows()).length
  for (const file of [
    { name: 'broken.json', buffer: Buffer.from('{broken') },
    { name: 'shape.json', buffer: Buffer.from('{"files":[]}') },
    { name: 'not-supported.zip', buffer: Buffer.from('PK00') },
  ]) { await choose(file); await failure(); assert.equal((await rows()).length, count); assert.equal((await rows())[0].project.id, idBeforeInvalid) }
  console.log('PASS malformed/unsupported files show an error and preserve the active project')
  await choose({ name: 'hello.py', mimeType: 'text/x-python', buffer: Buffer.from('print("IMPORTED_PY_OK")\n') }); await success()
  imported = (await rows())[0].project
  assert.equal(imported.entrypoint, 'hello.py'); assert.equal(imported.files[0].text, 'print("IMPORTED_PY_OK")\n')
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('IMPORTED_PY_OK'), null, { timeout: 90000 })
  console.log('PASS Python-file import and execution')
  const large = structuredClone(original)
  const image = large.files.find(file => file.kind === 'image')
  image.data = Buffer.concat([Buffer.from(image.data, 'base64'), Buffer.alloc(3 * 1024 * 1024)]).toString('base64')
  large.title = '큰 프로젝트'
  await choose({ name: 'large.mspygame.json', buffer: Buffer.from(JSON.stringify(large)) }); await success()
  assert.equal((await rows())[0].project.files.find(file => file.path === image.path).data, image.data)
  console.log('PASS large embedded asset import without data loss')
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (record, ...args) {
      if (record?.project?.title === 'STORAGE_FAIL') throw new DOMException('테스트 저장 공간 부족', 'QuotaExceededError')
      return put.call(this, record, ...args)
    }
  })
  const beforeFailure = (await rows())[0].project.id
  await choose({ name: 'storage.json', buffer: Buffer.from(JSON.stringify({ ...original, title: 'STORAGE_FAIL' })) })
  await page.waitForFunction(() => document.querySelector('.pgs-library')?.textContent.includes('이 기기에 저장하지 못했습니다'))
  assert.equal((await rows())[0].project.id, beforeFailure)
  assert.equal(await page.getByRole('button', { name: '백업 파일 복원', exact: true }).isEnabled(), true)
  console.log('PASS storage failure remains visible, no false success or frozen controls')
} finally { await browser.close() }
