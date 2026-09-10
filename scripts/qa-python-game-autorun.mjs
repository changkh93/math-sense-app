import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=user-gesture-required'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext()
context.setDefaultTimeout(90000)
const page = await context.newPage()
const frame = () => page.frameLocator('iframe[title="Python 코드 실행 화면"]')
async function code(source) {
  await page.locator('.cm-content').click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.keyboard.insertText(source)
}
async function run(output) {
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(text => document.querySelector('.pgs-console pre')?.textContent.includes(text), output)
  assert.equal(await frame().getByRole('button').count(), 0)
  assert.equal(await frame().locator('#start').isVisible(), false)
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await page.locator('.cm-content').waitFor()
  await code('print("hello World")\nimport sys\nprint("PYGAME_LOADED", "pygame" in sys.modules)\n')
  await run('PYGAME_LOADED False')
  assert.match(await page.locator('.pgs-console pre').innerText(), /hello World/)
  assert.equal(await frame().locator('#audio-note').isVisible(), false)
  await page.getByRole('button', { name: '정지', exact: true }).click()
  console.log('PASS print auto-executes with no extra button, pygame import or audio prompt')
  await page.locator('input[type=file][multiple]:not([webkitdirectory])').setInputFiles({ name: 'helper.py', mimeType: 'text/plain', buffer: Buffer.from('from pygame import display\ndef open_window():\n    return display.set_mode((320,240))\n') })
  await page.locator('.pgs-file-list button').filter({ hasText: 'main.py' }).click()
  await code('import helper\nimport asyncio\nhelper.open_window()\nprint("GAME_AUTO_STARTED")\nasync def main():\n    while True:\n        await asyncio.sleep(0)\nasyncio.run(main())\n')
  await run('GAME_AUTO_STARTED')
  assert.equal(await frame().locator('#audio-note').isVisible(), false)
  console.log('PASS helper/from imports and display start without an extra click')
  const runtime = await (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
  await runtime.evaluate(async () => {
    window.qaAudio = new AudioContext()
    await qaAudio.suspend()
    const source = qaAudio.createBufferSource()
    source.buffer = qaAudio.createBuffer(1, 44100, 44100)
    source.loop = true; source.connect(qaAudio.destination); source.start()
  })
  await frame().locator('#audio-note').waitFor({ state: 'visible' })
  await frame().locator('#canvas').click()
  await runtime.waitForFunction(() => window.qaAudio.state === 'running')
  await frame().locator('#audio-note').waitFor({ state: 'hidden' })
  console.log('PASS blocked audio is nonblocking and resumes through normal canvas interaction')
} finally { await browser.close() }
