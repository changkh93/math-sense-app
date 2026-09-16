import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const out = 'docs/collaboration/tasks/20260916-studio-error-coach/verification'
const calls = [], errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => { if (/cloudfunctions\.net\/studioErrorCoach|api\.openai\.com/.test(request.url())) calls.push(request.url()) })
page.setDefaultTimeout(30000)
async function edit(code) {
  await page.locator('.pgs-editor-pane .cm-content').first().click()
  await page.keyboard.press('Meta+a'); await page.keyboard.insertText(code)
}
const source = `a = 2
print("hello world", a)
print("가", "나", sep=" / ", end=" → ")
print("끝")
print()
for i in range(3):
    print(i, end="")
print("!")
print("첫째\\n둘째")
import sys
sys.stdout.write("앞")
sys.stderr.write("경고")
print("뒤")
print("완료", end="")`
const expected = 'hello world 2\n가 / 나 → 끝\n\n012!\n첫째\n둘째\n앞경고뒤\n완료'
try {
  await page.goto('http://127.0.0.1:5180/dev/python-game-studio')
  await page.locator('[data-path="main.py"]').waitFor()
  for (const mode of ['file', 'notebook']) {
    if (mode === 'notebook') await page.getByRole('button', { name: '노트북 모드', exact: true }).click()
    await edit(source)
    await page.getByRole('button', { name: mode === 'file' ? '실행' : '1번 셀 실행', exact: true }).click()
    const selector = mode === 'file' ? '.pgs-console .pgs-stream-output' : '.pgs-cell-output .pgs-stream-output'
    await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.textContent === expected, { selector, expected }, { timeout: 120000 })
    const stream = page.locator(selector)
    assert.equal(await stream.count(), 1)
    assert.equal(await stream.innerText(), expected)
    // Text equality alone misses CSS-added line breaks: compare rendered glyphs.
    const sameLine = await stream.evaluate(node => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      let offset = 0, first, last
      while (walker.nextNode()) {
        const text = walker.currentNode
        for (const [index, save] of [[0, rect => { first = rect }], [12, rect => { last = rect }]]) {
          if (index >= offset && index < offset + text.length) {
            const range = document.createRange(); range.setStart(text, index - offset); range.setEnd(text, index - offset + 1); save(range.getBoundingClientRect().top)
          }
        }
        offset += text.length
      }
      return first !== undefined && first === last
    })
    assert.equal(sameLine, true, `${mode}: hello world and 2 must occupy the same visual line`)
    if (mode === 'notebook') {
      await page.setViewportSize({ width: 768, height: 1024 })
      await stream.scrollIntoViewIfNeeded()
    }
    await page.screenshot({ path: `${out}/print-${mode}.png` })
  }
  assert.deepEqual(errors, []); assert.equal(calls.length, 0)
  await writeFile(`${out}/print-checks.json`, JSON.stringify({ passed: true, modes: ['file', 'notebook'], multiArgument: true, sameVisualLine: true, sepAndEnd: true, blankAndEmbeddedNewlines: true, loops: true, unicode: true, mixedStdoutStderr: true, noTrailingNewline: true, paidApiCalls: 0 }, null, 2))
  console.log('PASS exact Python output and visual line positions in file/notebook: sep, end, Unicode, blank lines, loops and stderr; no API calls')
} catch (error) { console.error(error); await page.screenshot({ path: `${out}/print-failure.png` }); process.exitCode = 1 } finally { await browser.close() }
