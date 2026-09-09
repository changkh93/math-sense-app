import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage(); page.setDefaultTimeout(15000)
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  const editor = page.locator('.cm-content'); await editor.waitFor()
  assert.equal((await editor.innerText()).trim(), '')
  assert.equal(await page.getByRole('button', { name: /코드 놀이터|새 파일로 열기/ }).count(), 0)
  assert.equal(await page.locator('.pgs-experiments').count(), 0)
  const code = 'class Pet:\n    def greet(self):\n        name = "구름이"\n        print(name)\n\nPet().greet()\n'
  await editor.click(); await page.keyboard.insertText(code)
  for (const role of ['class', 'function', 'variable', 'string']) assert.ok(await editor.locator(`.pgs-code-${role}`).count())
  const before = await editor.locator('.pgs-code-variable').first().evaluate(el => getComputedStyle(el).color)
  await page.getByLabel('코드 색상', { exact: true }).selectOption('candy')
  assert.notEqual(await editor.locator('.pgs-code-variable').first().evaluate(el => getComputedStyle(el).color), before)
  await page.getByRole('button', { name: '집중 모드 켜기' }).click()
  await page.getByRole('button', { name: '내 프로젝트', exact: true }).click(); await page.reload(); await editor.waitFor()
  assert.equal(await page.getByLabel('코드 색상', { exact: true }).inputValue(), 'candy')
  await page.getByRole('button', { name: '집중 모드 끄기' }).waitFor()
  const savedCode = await page.evaluate(async () => (await (await import('/src/components/PythonGameStudio/projectStore.js')).listDrafts('local-preview'))[0].project.files[0].text)
  assert.equal(savedCode, code)
  assert.equal(await page.locator('[data-kind="file"]').count(), 1)
  console.log('PASS playground removed; syntax colors, theme/focus settings, blank project and saved code preserved')
} finally { await browser.close() }
