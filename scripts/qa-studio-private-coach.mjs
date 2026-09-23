import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)('/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const page = await browser.newPage({ viewport: { width: 1024, height: 900 } })
const out = 'docs/collaboration/tasks/20260916-studio-private-coach'
const network = []
page.on('request', req => { if (/cloudfunctions\.net\/studioErrorCoach|api\.openai\.com/.test(req.url())) network.push(req.url()) })
try {
  await page.goto('http://127.0.0.1:5180/dev/python-game-studio')
  await page.locator('[data-path="main.py"]').waitFor()
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { default: Coach } = await import('/src/components/PythonGameStudio/ErrorCoach.jsx')
    const host = document.createElement('div'); host.id = 'private-coach-test'; document.body.replaceChildren(host)
    const source = 'from ColabTurtlePlus.Turtle import *\n학생이름 = "가상학생@example.com"\n거북이 = Turtle\n거북이.forward(100)'
    window.testCalls = 0
    createRoot(host).render(React.createElement(Coach, { uid: 'synthetic-only', source, currentSource: source,
      text: '  File "/tmp/studio/main.py", line 4\nTypeError: Turtle.forward() missing 1 required positional argument: \'distance\'',
      requestAdvice: async (_uid, payload) => { window.testCalls++; window.sentPayload = payload; return { advice: { explanation: '객체를 만드는 괄호를 확인해요.', hint: '3번째 줄의 variable_2 = Turtle을 살펴보세요.', question: 'Turtle 뒤에 ()가 있나요?', check: '다시 실행해 보세요.' } } }
    }))
  })
  await page.getByRole('button', { name: '확인 방법 · 예시 보기' }).click()
  await page.getByRole('button', { name: '아직 어렵다면 · AI 도움' }).click()
  const preview = await page.locator('.pgs-coach-preview pre').innerText()
  assert.match(preview, /variable_2 = Turtle/)
  assert.match(preview, /variable_2.forward\(number_1\)/)
  assert.ok(!/가상학생|학생이름|거북이|example.com/.test(preview))
  assert.equal(await page.evaluate(() => window.testCalls), 0)
  await page.screenshot({ path: `${out}/structure-preview.png`, fullPage: true })
  assert.equal(await page.locator('.pgs-coach-preview input[type="checkbox"]').count(), 0)
  await page.getByRole('button', { name: 'AI 힌트 받기' }).click()
  await page.locator('.pgs-coach-answer').waitFor()
  assert.match(await page.locator('.pgs-coach-answer').innerText(), /거북이 = Turtle/)
  const sent = await page.evaluate(() => window.sentPayload)
  assert.equal(sent.version, 2)
  assert.equal(sent.finding, 'constructor-not-called')
  assert.ok(!/가상학생|학생이름|거북이|example.com/.test(JSON.stringify(sent)))
  assert.equal(await page.evaluate(() => window.testCalls), 1)
  for (const [path, title] of [['/privacy', '코드 스튜디오 AI 도움'], ['/terms', '선택적 AI 도움']]) {
    await page.goto('http://127.0.0.1:5180' + path)
    await page.getByRole('heading', { name: new RegExp(title) }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: `${out}/${path.slice(1)}.png`, fullPage: true })
  }
  assert.equal(network.length, 0)
  await writeFile(`${out}/browser-checks.json`, JSON.stringify({ passed: true, transformedPreview: true, explicitRequestOnly: true, tokensOnly: true, policyPages: true, tabletFits: true, paidCalls: 0 }, null, 2))
  console.log('PASS transformed preview, token-only explicit request, privacy/terms tablet pages; zero paid calls')
} finally { await browser.close() }
