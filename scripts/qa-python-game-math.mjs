import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } })
page.setDefaultTimeout(180000)
const folder = new URL('../public/python-game-examples/math/', import.meta.url)
const output = new URL('../docs/collaboration/tasks/20260910-studio-math-libraries/verification/', import.meta.url)
await mkdir(output, { recursive: true })
const errors = [], packages = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => { if (request.url().includes('.whl')) packages.push(request.url()) })
const editor = page.locator('.cm-content')
async function run(source) {
  await editor.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.keyboard.insertText(source); await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-run-status')?.classList.contains('exited') || document.querySelector('.pgs-run-status')?.classList.contains('error'))
  const text = await page.locator('.pgs-console pre').innerText()
  assert.equal(await page.locator('.pgs-run-status').getAttribute('class'), 'pgs-run-status exited', text)
  assert.doesNotMatch(text, /Traceback/)
  return text
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await editor.waitFor()
  assert.match(await run(await readFile(new URL('main.py', folder), 'utf8')), /배열·표 수업 확인 완료/)
  const frame = await (await page.locator('iframe[title="Python 게임 실행 화면"]').elementHandle()).contentFrame()
  await frame.evaluate(() => { window.mathQaIdentity = 'warm' })
  console.log('PASS native NumPy arrays, 2D slice writes, random, pandas Series dtype/labels, matrix/dict/tuple inputs and loc')
  assert.match(await run(await readFile(new URL('probability.py', folder), 'utf8')), /확률: 5\/12/)
  console.log('PASS itertools permutations/combinations/product and exact fractions')
  await run(await readFile(new URL('histograms.py', folder), 'utf8'))
  assert.equal(await frame.locator('#plot-root img').count(), 2)
  for (let i = 0; i < 2; i++) {
    const chart = frame.locator('#plot-root img').nth(i)
    await chart.evaluate(image => image.decode())
    assert.equal(await chart.evaluate(image => image.naturalWidth), 600)
    await writeFile(new URL(`histogram-${i+1}.png`, output), Buffer.from((await chart.getAttribute('src')).split(',')[1], 'base64'))
  }
  console.log('PASS hist/bar, correct bins, relative frequency, explicit show and auto-show; Korean plots')
  const loaded = packages.length
  const graphText = await run((await readFile(new URL('graphs.py', folder), 'utf8')) + '\nprint("INF_GAP", np.isinf(y).sum())')
  assert.match(graphText, /INF_GAP 1/)
  assert.doesNotMatch(graphText, /Glyph.*missing|findfont|unknown encoding/)
  assert.equal(await frame.locator('#plot-root img').count(), 3)
  for (let i = 0; i < 3; i++) {
    const chart = frame.locator('#plot-root img').nth(i)
    await chart.evaluate(image => image.decode())
    await writeFile(new URL(`graph-${i+1}.png`, output), Buffer.from((await chart.getAttribute('src')).split(',')[1], 'base64'))
  }
  console.log('PASS pyplot/Axes scatter/plot/text, legend, ticks/limits, Korean title, reciprocal inf gap')
  assert.equal(packages.length, loaded, 'warm rerun must not fetch packages again')
  assert.equal(await frame.evaluate(() => window.mathQaIdentity), 'warm')
  const second = await run('import matplotlib.pyplot as plt\nplt.scatter(1,2)\nprint("WARM")')
  assert.match(second, /WARM/); assert.equal(await frame.locator('#plot-root img').count(), 1)
  await run('print("ONLY_PRINT")')
  assert.equal(await frame.locator('#plot-root').count(), 0)
  assert.equal(await frame.evaluate(() => window.mathQaIdentity), 'warm')
  await run('import numpy as np\nnp.seterr(divide="raise")\nnp.set_printoptions(precision=1)')
  assert.match(await run('import numpy as np\nprint("RESET", np.geterr()["divide"], np.get_printoptions()["precision"])'), /RESET warn 8/)
  console.log('PASS warm package/engine reuse and removal of prior plots on ordinary print')
  await editor.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.keyboard.insertText('import numpy as np\na=np.array([1,2])\na.')
  await page.keyboard.press('Alt+/')
  await page.locator('.cm-completionLabel').filter({ hasText: /^mean$/ }).waitFor()
  console.log('PASS actual array autocomplete')
  assert.deepEqual(errors, [])
  console.log('PASS no unhandled browser errors; wheel requests:', packages.length)
} finally { await browser.close() }
