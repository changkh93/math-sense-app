import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } })
page.setDefaultTimeout(90000)
const folder = new URL('../public/python-game-examples/pandas/', import.meta.url)
const output = new URL('../docs/collaboration/tasks/20260910-studio-pandas-lessons/verification/', import.meta.url)
await mkdir(output, { recursive: true })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const editor = page.locator('.cm-content')
const option = name => page.locator('.cm-tooltip-autocomplete .cm-completionLabel').filter({ hasText: new RegExp(`^${name}$`) })
async function code(text) {
  await editor.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.keyboard.insertText(text); await page.keyboard.press('Escape')
}
async function run(text) {
  if (text !== undefined) await code(text)
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-run-status')?.classList.contains('exited') || document.querySelector('.pgs-run-status')?.classList.contains('error'))
  assert.equal(await page.locator('.pgs-run-status').getAttribute('class'), 'pgs-run-status exited', await page.locator('.pgs-console pre').innerText())
  return page.locator('.pgs-console pre').innerText()
}
async function saved() { await page.waitForFunction(() => document.querySelector('.pgs-save-state')?.textContent === '이 기기에 저장됨') }
async function snapshot() {
  return page.evaluate(async () => {
    const { listDrafts } = await import('/src/components/PythonGameStudio/projectStore.js')
    return (await listDrafts('local-preview')).find(row => row.project.title === 'pandas').project
  })
}
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio')
  await editor.waitFor()
  await page.getByRole('button', { name: '내 프로젝트', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '프로젝트 가져오기', exact: true }).click()
  await (await chooser).setFiles(fileURLToPath(folder))
  await page.waitForFunction(() => document.querySelector('input[aria-label="프로젝트 이름"]')?.value === 'pandas')
  const lesson = await readFile(new URL('main.py', folder), 'utf8')
  const text = await run()
  assert.match(text, /\['20', '25', '25', '18', '22'\]/)
  assert.match(text, /<class 'pandas.DataFrame'>/); assert.match(text, /<class 'pandas.Series'>/)
  assert.match(text, /22\.0/); assert.match(text, /홍길동/); assert.match(text, /new_data.csv 저장 완료/)
  assert.doesNotMatch(text, /object at|Traceback/)
  await saved()
  const first = await snapshot()
  assert.equal(Buffer.from(first.files.find(file => file.path === 'new_data.csv').data, 'base64').toString('utf8'), ',name,scores\n0,왕새우,80\n1,홍길동,90\n2,박명수,60\n')
  const frame = await (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
  await frame.evaluate(() => { window.pandasQaIdentity = 'warm' })
  await page.locator('.pgs-console').screenshot({ path: fileURLToPath(new URL('weather-output.png', output)) })
  console.log('PASS original weather/csv operations: numeric inference, Series, mean/max, filters, formatted output and local CSV')

  const quizzes = await readFile(new URL('quizzes.py', folder), 'utf8')
  const result = await run(quizzes + '\nimport json\nprint("QUIZ_RESULTS=" + json.dumps([selected_data.to_dict(), max_score_data.to_dict(), city_data.to_dict(), large_cities.to_dict()], ensure_ascii=False))')
  const answers = JSON.parse(result.split('QUIZ_RESULTS=')[1].trim())
  assert.deepEqual(answers[0], { name: { 1: '홍길동' }, scores: { 1: 90 } })
  assert.deepEqual(answers[1], answers[0])
  assert.deepEqual(Object.values(answers[2].city), ['서울', '부산', '인천'])
  assert.deepEqual(Object.values(answers[3].city), ['서울', '부산'])
  await saved()
  assert.equal(Buffer.from((await snapshot()).files.find(file => file.path === 'cities.csv').data, 'base64').toString('utf8'), ',city,population,area\n0,서울,9904312,605.21\n1,부산,3448737,770.04\n2,인천,2890451,1063.49\n')
  assert.equal(await frame.evaluate(() => window.pandasQaIdentity), 'warm')
  await page.locator('.pgs-console').screenshot({ path: fileURLToPath(new URL('quiz-output.png', output)) })
  console.log('PASS quizzes 1–5: Hong Gildong/90, city numbers, Seoul/Busan filtering, exact indexed CSV; warm engine')

  await code('import pandas as pd\ndata=pd.read_csv("weather.csv")\ndata.온도.')
  await page.keyboard.type('me', { delay: 50 }); await option('mean').click()
  assert.match(await editor.innerText(), /data\.온도\.mean\(\)/)
  await page.locator('.pgs-signature-help').waitFor()
  await code('import pandas as pd\ndata=pd.read_csv("weather.csv")\ndata["')
  await page.keyboard.press('Alt+/'); await option('온도').waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('column-completion.png', output)) })
  await option('온도').click(); assert.match(await editor.innerText(), /data\["온도/)
  console.log('PASS actual Korean CSV column suggestions, Series method insertion and signature help')

  await code('import pandas as pd\ndata=pd.read_csv("cities.csv")\nprint("RESTORED",data.population.sum(), data.city.to_list())')
  await saved(); await page.reload(); await editor.waitFor()
  assert.match(await run(), /RESTORED 16243500 \['서울', '부산', '인천'\]/)
  await run(lesson)
  assert.deepEqual(errors, [])
  console.log('PASS CSV contents survive refresh and numeric reread; weather rerun and no host errors')
} catch (error) {
  console.error('OUTPUT', await page.locator('.pgs-console pre').innerText().catch(() => '?'))
  await page.screenshot({ path: fileURLToPath(new URL('failure.png', output)) }).catch(() => {})
  throw error
} finally { await browser.close() }
