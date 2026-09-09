import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext()
context.setDefaultTimeout(30000)
const page = await context.newPage()
const original = `import pygame

pygame.init()
pygame.display.set_mode((800, 600))
pygame.display.set_caption("게임 왕국")

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    pygame.display.update()
pygame.quit()
`
const frame = () => page.frameLocator('iframe[title="Python 게임 실행 화면"]')
async function code(text) {
  await page.locator('.cm-content').click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a'); await page.keyboard.insertText(text)
}
async function start(text) {
  await code(text); await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-run-status')?.textContent === '실행 중', null, { timeout: 90000 })
}
async function python(source) {
  const runtime = await (await page.locator('iframe[title="Python 게임 실행 화면"]').elementHandle()).contentFrame()
  await runtime.evaluate(source => window.python.PyRun_SimpleString(source), source)
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio'); await page.locator('.cm-content').waitFor()
  await start(original)
  await page.waitForTimeout(3000)
  assert.equal(await page.locator('.pgs-run-status').innerText(), '실행 중')
  assert.doesNotMatch(await page.locator('.pgs-console pre').innerText(), /RuntimeError|Traceback/)
  assert.equal(await page.evaluate(async () => { const rows = await (await import('/src/components/PythonGameStudio/projectStore.js')).listDrafts('local-preview'); return rows[0].project.files.find(file => file.path === 'main.py').text }), original)
  await python('import pygame, platform, json\nplatform.window.qaDisplay=json.dumps([pygame.display.get_surface().get_size(),pygame.display.get_caption()[0]])\n')
  assert.deepEqual(JSON.parse(await frame().locator('body').evaluate(() => window.qaDisplay)), [[800,600], '게임 왕국'])
  const marker = await frame().locator('body').evaluate(() => window.qaMarker = crypto.randomUUID())
  await python('pygame.event.post(pygame.event.Event(pygame.QUIT))\n')
  await page.waitForFunction(() => document.querySelector('.pgs-run-status')?.textContent === '실행 완료')
  console.log('PASS exact supplied synchronous code: 800x600, Korean title, survives timeout, QUIT exits, editor source unchanged')
  await start(`import pygame as pg\npg.init()\nscreen=pg.display.set_mode((320,240))\nframes=0\nwhile True:\n    frames+=1\n    if frames<3: continue\n    for event in pg.event.get():\n        if event.type==pg.MOUSEBUTTONDOWN: print("SYNC_CLICK")\n    screen.fill((0,60,120))\n    pg.display.flip()\n`)
  await frame().locator('#canvas').click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('SYNC_CLICK'))
  await page.getByRole('button', { name: '정지', exact: true }).click()
  await code('print("AFTER_SYNC_STOP")\n'); await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('AFTER_SYNC_STOP'))
  assert.equal(await frame().locator('body').evaluate(() => window.qaMarker), marker)
  console.log('PASS alias, flip, continue, mouse, stop and warm re-execution')
} finally { await browser.close() }
