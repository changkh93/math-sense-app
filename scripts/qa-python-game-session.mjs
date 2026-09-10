import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext()
context.setDefaultTimeout(90000)
const page = await context.newPage()
const runtime = () => page.frameLocator('iframe[title="Python 코드 실행 화면"]')
const times = [], requests = []
page.on('request', request => { if (/\/cpython312\/(main\.js|main\.wasm)/.test(request.url())) requests.push(request.url()) })
async function code(text) {
  await page.locator('.cm-content').click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a'); await page.keyboard.insertText(text)
}
async function run(text, output) {
  await code(text)
  const start = performance.now()
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(output => document.querySelector('.pgs-console pre')?.textContent.includes(output), output)
  times.push(Math.round(performance.now() - start))
}
async function stop() {
  await page.getByRole('button', { name: '정지', exact: true }).click()
  await runtime().locator('body').evaluate(() => new Promise(resolve => {
    const check = () => window.studioActiveRun === null ? resolve() : setTimeout(check, 20); check()
  }))
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await page.locator('.cm-content').waitFor()
  await run('old_value=42\nopen("old.txt","w").write("old")\nprint("FIRST")\n', 'FIRST')
  const marker = await runtime().locator('body').evaluate(() => window.qaSessionMarker = crypto.randomUUID())
  for (let i = 0; i < 20; i++) {
    await run(`import os\nassert "old_value" not in globals()\nassert not os.path.exists("old.txt")\nprint("FAST_${i}")\n`, `FAST_${i}`)
    assert.equal(await runtime().locator('body').evaluate(() => window.qaSessionMarker), marker)
  }
  assert.equal(requests.filter(url => url.endsWith('/main.js')).length, 1)
  assert.equal(await runtime().locator('#start').isVisible(), false)
  const warm = times.slice(1).sort((a, b) => a - b)
  assert.ok(warm[Math.floor(warm.length / 2)] < 1500, `warm median too slow: ${warm}`)
  console.log(JSON.stringify({ firstRunMs: times[0], warmMedianMs: warm[Math.floor(warm.length / 2)], warmMaxMs: warm.at(-1), engineRequests: requests }))
  console.log('PASS 20 warm runs, one engine, no stale globals/files')
  for (const value of [1, 2]) {
    await run(`open("helper.py", "w").write("value=${value}\\n")\nimport helper\nprint("HELPER",helper.value)\n`, `HELPER ${value}`)
  }
  await run('import helper\n', 'ModuleNotFoundError')
  console.log('PASS changed helper module reloads and removed helper is unavailable')
  for (let i = 0; i < 5; i++) {
    await run(`import pygame, asyncio\npygame.init()\nscreen=pygame.display.set_mode((320,240))\nsound=pygame.mixer.Sound(buffer=bytes(44100))\nsound.play(loops=-1)\nasync def main():\n    print("GAME_${i}")\n    while True:\n        pygame.event.get()\n        screen.fill((20,40,60))\n        pygame.display.flip()\n        await asyncio.sleep(0)\nasyncio.run(main())\n`, `GAME_${i}`)
    await stop()
    assert.equal(await runtime().locator('body').evaluate(() => window.qaSessionMarker), marker)
  }
  console.log('PASS five pygame display/audio starts and stops on the same engine')
  await run('import asyncio\nasync def background():\n    while True:\n        print("OLD_BACKGROUND")\n        await asyncio.sleep(.05)\nasync def main():\n    asyncio.create_task(background())\n    asyncio.get_running_loop().call_later(1, lambda: print("OLD_TIMER"))\n    while True: await asyncio.sleep(0)\nasyncio.run(main())\n', 'OLD_BACKGROUND')
  await stop()
  await run('print("AFTER_STOP")\n', 'AFTER_STOP')
  await page.waitForTimeout(1200)
  assert.doesNotMatch(await page.locator('.pgs-console pre').innerText(), /OLD_BACKGROUND|OLD_TIMER/)
  assert.equal(await runtime().locator('body').evaluate(() => window.qaSessionMarker), marker)
  console.log('PASS stop cancels background tasks and timers without engine reload')
  await run('while True:\n    pass\n', '반복문이 화면을 멈췄습니다')
  await run('print("AFTER_ERROR")\n', 'AFTER_ERROR')
  assert.equal(await runtime().locator('body').evaluate(() => window.qaSessionMarker), marker)
  console.log('PASS infinite-loop error recovery retains ready engine')
} finally { await browser.close() }
