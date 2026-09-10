import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { RUNTIME_VERSION } from '../src/components/PythonGameStudio/projectPolicy.mjs'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } })
page.setDefaultTimeout(90000)
const folder = new URL('../public/python-game-examples/tkinter/', import.meta.url)
const output = new URL(process.env.GAME_STUDIO_QA_OUTPUT || '../docs/collaboration/tasks/20260910-studio-tkinter/verification/', import.meta.url)
await mkdir(output, { recursive: true })
const source = await readFile(new URL('main.py', folder), 'utf8')
// The supplied lesson (without the example's optional last-word guard).
const original = source.replace(/    # 모든 단어[\s\S]*?        return\n/, '').replace(', columns=["English", "Korean"]', '')
const fixture = { id: 'tkinter-qa-project', title: 'Flash Card QA', schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, revision: 0, entrypoint: 'main.py', files: [{ path: 'main.py', kind: 'python', text: original }] }
for (const path of ['data/english_word.csv', 'images/card_front.png', 'images/card_back.png', 'images/right.png', 'images/wrong.png']) fixture.files.push({ path, kind: path.endsWith('.csv') ? 'csv' : 'image', data: (await readFile(new URL(path, folder))).toString('base64') })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const frame = async () => (await page.locator('iframe[title="Python 게임 실행 화면"]').elementHandle()).contentFrame()
async function run(text) {
  if (text !== undefined) {
    await page.locator('.cm-content').click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
    await page.keyboard.insertText(text)
  }
  await page.getByRole('button', { name: '실행', exact: true }).click()
}
async function saved() { await page.waitForFunction(() => document.querySelector('.pgs-save-state')?.textContent === '이 기기에 저장됨') }
async function snapshot() {
  return page.evaluate(async () => {
    const { listDrafts } = await import('/src/components/PythonGameStudio/projectStore.js')
    return (await listDrafts('local-preview')).find(row => row.project.id === 'tkinter-qa-project')?.project
  })
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await page.locator('.cm-content').waitFor(); await saved()
  await page.evaluate(async fixture => {
    const { saveDraft } = await import('/src/components/PythonGameStudio/projectStore.js')
    await saveDraft('local-preview', fixture)
  }, fixture)
  await page.reload(); await page.locator('.cm-content').waitFor()
  assert.match(await page.locator('.cm-content').innerText(), /from tkinter/)
  await run()
  const f = await frame()
  await f.getByText('English', { exact: true }).waitFor()
  await f.evaluate(() => { window.tkQaIdentity = 'warm' })
  const canvas = f.locator('#tk-root svg')
  assert.ok(await f.evaluate(() => {
    const host = document.querySelector('#tk-root').getBoundingClientRect(), panel = document.querySelector('#tk-root section').getBoundingClientRect()
    return panel.left >= host.left - 1 && panel.right <= host.right + 1 && panel.top >= host.top - 1 && panel.bottom <= host.bottom + 1
  }), 'whole scaled window must fit without clipped buttons or card edges')
  assert.equal(await canvas.getAttribute('viewBox'), '0 0 800 526')
  assert.equal(await canvas.locator('image').getAttribute('x'), '0')
  assert.equal(await canvas.locator('image').getAttribute('y'), '0')
  assert.equal(await f.locator('#tk-root button img').count(), 2)
  await page.waitForTimeout(1000)
  await f.locator('#tk-root button').nth(0).click()
  await page.waitForTimeout(2200)
  assert.equal(await canvas.locator('text').first().textContent(), 'English', 'cancelled timer must not flip at its original deadline')
  await f.getByText('Korean', { exact: true }).waitFor()
  assert.match(await canvas.locator('text').nth(1).textContent(), /사과|구름|거북이/)
  assert.equal(await canvas.locator('text').nth(1).getAttribute('fill'), 'white')
  await f.locator('#tk-root').screenshot({ path: fileURLToPath(new URL('card-back.png', output)) })
  console.log('PASS supplied Tk lesson: centered images, Korean text, grid buttons, 3-second flip and timer cancellation')

  await f.locator('#tk-root button').nth(1).click()
  await page.getByText('data/words_to_learn.csv에 학습 기록을 저장했습니다.', { exact: false }).waitFor()
  await saved()
  let project = await snapshot()
  const persisted = project.files.find(file => file.path === 'data/words_to_learn.csv')
  assert.equal(Buffer.from(persisted.data, 'base64').toString('utf8').trim().split('\n').length, 3)
  assert.equal(project.files.filter(file => file.path === persisted.path).length, 1)
  console.log('PASS known-word button writes CSV into local project without duplicate files')

  await run('print("AFTER_TK")')
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('AFTER_TK'))
  assert.equal(await f.locator('#tk-root').count(), 0)
  await page.waitForTimeout(3300)
  assert.equal(await f.locator('#tk-root').count(), 0)
  assert.equal(await f.evaluate(() => window.tkQaIdentity), 'warm')
  console.log('PASS warm rerun removes Tk UI and pending callbacks')

  await run(source)
  await f.getByText('English', { exact: true }).waitFor()
  await f.locator('#tk-root button').nth(1).click()
  await f.locator('#tk-root button').nth(1).click()
  await f.getByText('모두 익혔어요', { exact: true }).waitFor()
  assert.equal(await f.locator('#tk-root button:disabled').count(), 2)
  await saved()
  project = await snapshot()
  assert.equal(Buffer.from(project.files.find(file => file.path === persisted.path).data, 'base64').toString('utf8'), 'English,Korean\n')
  await page.reload(); await page.locator('.cm-content').waitFor(); await run()
  const reloaded = await frame()
  await reloaded.getByText('모두 익혔어요', { exact: true }).waitFor()
  console.log('PASS complete lesson saves CSV headers; fresh page reads saved progress and empty-deck guard')
  await reloaded.locator('#tk-root').screenshot({ path: fileURLToPath(new URL('complete.png', output)) })

  await run('from tkinter import *\nwindow=Tk()\ndef fail():\n    raise ValueError("CALLBACK_TEST")\nButton(text="오류 확인", command=fail).grid(row=0,column=0)\nwindow.mainloop()')
  await reloaded.getByRole('button', { name: '오류 확인', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('CALLBACK_TEST'))
  assert.match(await page.locator('.pgs-console pre').innerText(), /main.py", line 4/)
  assert.equal(await page.locator('.pgs-run-status').getAttribute('class'), 'pgs-run-status error')
  await page.getByRole('button', { name: '내 프로젝트', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '프로젝트 가져오기', exact: true }).click()
  await (await chooser).setFiles(fileURLToPath(folder))
  await page.waitForFunction(() => document.querySelector('input[aria-label="프로젝트 이름"]')?.value === 'tkinter')
  assert.match(await page.locator('.pgs-notice').innerText(), /6개 파일/)
  await run()
  await reloaded.getByText('English', { exact: true }).waitFor()
  await reloaded.locator('#tk-root button').nth(1).focus()
  await page.keyboard.press('Space')
  await page.getByText('data/words_to_learn.csv에 학습 기록을 저장했습니다.', { exact: false }).waitFor()
  await saved()
  await page.setViewportSize({ width: 1000, height: 800 })
  await reloaded.waitForFunction(() => {
    const h = document.querySelector('#tk-root').getBoundingClientRect(), p = document.querySelector('#tk-root section').getBoundingClientRect()
    return p.left >= h.left - 1 && p.right <= h.right + 1 && p.top >= h.top - 1 && p.bottom <= h.bottom + 1
  })
  await reloaded.locator('#tk-root').screenshot({ path: fileURLToPath(new URL('narrow.png', output)) })
  await page.getByRole('button', { name: '정지', exact: true }).click()
  await reloaded.locator('#tk-root').waitFor({ state: 'detached' })
  await page.waitForTimeout(3200)
  assert.equal(await reloaded.locator('#tk-root').count(), 0)
  console.log('PASS actual folder import includes CSV; keyboard Space activates buttons; narrow window fits; Stop cancels pending timer')
  assert.deepEqual(errors, [])
  console.log('PASS callback traceback with student line; no host page errors')
} catch (error) {
  console.error('STATUS', await page.locator('.pgs-run-status').textContent().catch(() => '?'))
  console.error('OUTPUT', await page.locator('.pgs-console pre').innerText().catch(() => '?'))
  await page.screenshot({ path: fileURLToPath(new URL('failure.png', output)) }).catch(() => {})
  throw error
} finally { await browser.close() }
