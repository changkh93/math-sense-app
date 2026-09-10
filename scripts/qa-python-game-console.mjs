import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage()
page.setDefaultTimeout(90000)
const messages = []
const errors = []
page.on('console', message => messages.push({ type: message.type(), text: message.text() }))
page.on('pageerror', error => errors.push(error.message))
async function run(source, expected) {
  await page.locator('.cm-content').click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.keyboard.insertText(source)
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(text => document.querySelector('.pgs-console pre')?.textContent.includes(text), expected)
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await page.locator('.cm-content').waitFor()
  await run('print("CONSOLE_QA_PRINT")', 'CONSOLE_QA_PRINT')
  const runtime = await (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
  await runtime.evaluate(() => { window.consoleQaIdentity = 'warm' })
  await run('import pygame\npygame.init()\npygame.display.set_mode((320,240))\nprint("CONSOLE_QA_GAME")\nrunning = True\nwhile running:\n    for event in pygame.event.get():\n        if event.type == pygame.MOUSEBUTTONDOWN:\n            print("CONSOLE_QA_MOUSE")\n    pygame.display.update()\n', 'CONSOLE_QA_GAME')
  await runtime.locator('#canvas').click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('CONSOLE_QA_MOUSE'))
  await run('print("CONSOLE_QA_WARM")\nraise ValueError("CONSOLE_QA_ERROR")', 'ValueError: CONSOLE_QA_ERROR')
  assert.equal(await runtime.evaluate(() => window.consoleQaIdentity), 'warm')
  assert.match(await page.locator('.pgs-console pre').innerText(), /CONSOLE_QA_WARM/)
  assert.equal(messages.some(m => /script\?|config\.cdn|AUTOSTART|== FLAGS|FIXME: SecurityError|BrowserFS not found|VM\.(prerun|postrun)|cross_file.fetch|Loading python interpreter|focus set|\[sixel image\]/.test(m.text)), false, JSON.stringify(messages))
  assert.deepEqual(errors, [])
  console.log('PASS cold boot, pygame/mouse, warm run, Python print and traceback; no noisy loader logs')
  console.log('Remaining browser messages:', JSON.stringify(messages))
  await page.evaluate(() => console.warn('CONSOLE_QA_PARENT'))
  await runtime.evaluate(() => {
    console.warn('CONSOLE_QA_UNKNOWN_WARNING')
    console.error('CONSOLE_QA_UNKNOWN_ERROR')
    window.studioSetRuntimeDiagnostics(true)
    console.log('script?', 'CONSOLE_QA_FULL_DIAGNOSTICS')
  })
  // evaluate resolves after console events have been delivered by the browser.
  for (const text of ['CONSOLE_QA_PARENT', 'CONSOLE_QA_UNKNOWN_WARNING', 'CONSOLE_QA_UNKNOWN_ERROR', 'CONSOLE_QA_FULL_DIAGNOSTICS']) {
    assert.ok(messages.some(m => m.text.includes(text)), text)
  }
  console.log('PASS parent console, unknown warnings/errors and full diagnostics preserved')
} finally { await browser.close() }
