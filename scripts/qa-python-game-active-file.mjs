import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { createProject } from '../src/components/PythonGameStudio/templates.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage(); page.setDefaultTimeout(15000)
const file = path => page.locator(`[data-kind="file"][data-path="${path}"]`)
const output = () => page.locator('.pgs-console pre').innerText()
async function run(marker) {
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(marker => document.querySelector('.pgs-console pre')?.textContent.includes(marker), marker, { timeout: 90000 })
}
async function code(text) {
  await page.locator('.cm-content').click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a'); await page.keyboard.insertText(text)
}
const project = createProject('Active script QA', 'import pygame\npygame.init()\npygame.display.set_mode((320,240))\nprint("ROOT_GAME")\nwhile True:\n    pygame.event.get()\n    pygame.display.get_surface().fill((0,180,80))\n    pygame.display.update()\n')
project.files.push({ path: 'images/test1.py', kind: 'python', text: 'print("CHILD_HELLO")\n' }, { path: 'images/hero.png', kind: 'image', data: (await readFile(new URL('../public/python-game-examples/knight.png', import.meta.url))).toString('base64') })
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio'); await page.locator('.cm-content').waitFor()
  await page.getByRole('button', { name: '내 프로젝트', exact: true }).click()
  await page.locator('input[accept=".json,.mspygame.json,.py"]').setInputFiles({ name: 'active.mspygame.json', buffer: Buffer.from(JSON.stringify(project)) })
  await file('images/test1.py').waitFor(); await run('ROOT_GAME')
  const runtime = await (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
  const marker = await runtime.evaluate(() => window.qaActiveMarker = crypto.randomUUID())
  const gameBefore = await runtime.locator('#canvas').screenshot()
  await file('images/test1.py').click()
  assert.equal(await page.locator('.pgs-run-target').innerText(), 'images/test1.py')
  await run('CHILD_HELLO'); assert.doesNotMatch(await output(), /ROOT_GAME|Traceback/)
  const gameAfter = await runtime.locator('#canvas').screenshot()
  assert.notDeepEqual(gameBefore, gameAfter)
  await page.screenshot({ path: '/tmp/metasense-active-script.png' })
  assert.equal(await runtime.evaluate(() => window.qaActiveMarker), marker)
  console.log('PASS nested open script runs directly, old game/output cleared, interpreter reused')
  await code('print("CHILD_EDITED")\n'); await run('CHILD_EDITED')
  await code('print("BEFORE_ERROR")\nraise ValueError("CHILD_ERROR")\n'); await run('ValueError: CHILD_ERROR')
  assert.match(await output(), /\/tmp\/studio\/images\/test1.py", line 2/)
  await file('main.py').click(); await page.getByRole('button', { name: '오류 줄로 이동' }).click()
  assert.equal(await page.locator('.pgs-editor-pane > .pgs-panel-title > span').innerText(), 'images/test1.py')
  await page.locator('.python-editor-execution-line').waitFor()
  console.log('PASS latest edits execute; traceback and error navigation target the nested file')
  await file('main.py').click(); await code('print("ROOT_RETURN")\n'); await run('ROOT_RETURN')
  assert.doesNotMatch(await output(), /CHILD_ERROR|BEFORE_ERROR/)
  await file('images/hero.png').click(); assert.equal(await page.locator('.pgs-run-target').innerText(), 'main.py')
  await run('ROOT_RETURN')
  await page.getByRole('button', { name: '내 프로젝트', exact: true }).click()
  const stored = await page.evaluate(async () => (await (await import('/src/components/PythonGameStudio/projectStore.js')).listDrafts('local-preview'))[0].project)
  assert.equal(stored.entrypoint, 'main.py')
  console.log('PASS switching back runs root; asset preview uses default; saved entrypoint unchanged')
} finally { await browser.close() }
