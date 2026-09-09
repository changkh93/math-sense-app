import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = await mkdtemp(join(tmpdir(), 'metasense-folder-qa-'))
const game = join(root, '게임 왕국')
const main = 'import pygame\nfrom helpers.score import value\npygame.init()\nscreen=pygame.display.set_mode((320,240))\nimage=pygame.image.load("images/hero.png")\nfont=pygame.font.Font("fonts/myfont.ttf",20)\nsound=pygame.mixer.Sound("sounds/success.ogg")\nprint("FOLDER_OK",value,image.get_size(),font.get_height(),sound.get_length())\n'
await mkdir(join(game, 'helpers'), { recursive: true }); await mkdir(join(game, 'images'))
await mkdir(join(game, 'fonts')); await mkdir(join(game, 'sounds')); await mkdir(join(game, '.venv'))
await writeFile(join(game, 'main.py'), main); await writeFile(join(game, 'helpers', 'score.py'), 'value=42\n')
await writeFile(join(game, 'README.md'), 'Folder fixture'); await writeFile(join(game, '.venv', 'ignored.py'), 'skip me')
await copyFile(new URL('../public/python-game-examples/knight.png', import.meta.url), join(game, 'images', 'hero.png'))
await copyFile(new URL('../public/python-game-examples/success.ogg', import.meta.url), join(game, 'sounds', 'success.ogg'))
await copyFile('/System/Library/Fonts/Supplemental/Arial.ttf', join(game, 'fonts', 'myfont.ttf'))
const multi = join(root, '여러 실행 파일'); await mkdir(multi)
await writeFile(join(multi, 'game.py'), 'print("ENTRY_CHOICE_OK")\n'); await writeFile(join(multi, 'helper.py'), 'value=1\n')
const invalid = join(root, '코드 없음'); await mkdir(invalid); await writeFile(join(invalid, 'README.md'), 'No Python')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const page = await browser.newPage(); page.setDefaultTimeout(15000)
async function choose(path) {
  if (!await page.getByRole('dialog', { name: '내 프로젝트', exact: true }).count()) await page.getByRole('button', { name: '내 프로젝트', exact: true }).click()
  const event = page.waitForEvent('filechooser'); await page.getByRole('button', { name: '프로젝트 가져오기', exact: true }).click()
  await (await event).setFiles(path)
}
const rows = () => page.evaluate(async () => (await import('/src/components/PythonGameStudio/projectStore.js')).listDrafts('local-preview'))
try {
  await page.goto(process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio'); await page.locator('.cm-content').waitFor()
  await choose(game)
  await page.waitForFunction(() => document.querySelector('input[aria-label="프로젝트 이름"]')?.value === '게임 왕국')
  let project = (await rows())[0].project
  assert.deepEqual(project.files.map(file => file.path).sort(), ['fonts/myfont.ttf','helpers/score.py','images/hero.png','main.py','sounds/success.ogg'])
  assert.equal(project.entrypoint, 'main.py'); assert.match(await page.locator('.pgs-notice').innerText(), /2개는 제외/)
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.pgs-console pre')?.textContent.includes('FOLDER_OK 42'), null, { timeout: 90000 })
  console.log('PASS real directory chooser preserves nested Python/image/font/audio paths and executes imports/assets')
  await choose(game); await page.waitForFunction(() => !document.querySelector('.pgs-library'))
  assert.notEqual((await rows())[0].project.id, project.id)
  console.log('PASS same directory can be imported again without overwriting the first copy')
  await choose(multi); await page.getByRole('dialog', { name: '프로젝트 실행 파일 선택' }).waitFor()
  await page.getByRole('dialog', { name: '프로젝트 실행 파일 선택' }).getByRole('button', { name: '취소' }).click()
  const before = (await rows()).length
  await choose(multi); await page.getByLabel('실행 파일', { exact: true }).selectOption('game.py')
  await page.getByRole('dialog', { name: '프로젝트 실행 파일 선택' }).getByRole('button', { name: '가져오기', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('input[aria-label="프로젝트 이름"]')?.value === '여러 실행 파일')
  assert.equal((await rows()).length, before + 1); assert.equal((await rows())[0].project.entrypoint, 'game.py')
  await choose(invalid); await page.waitForFunction(() => document.querySelector('.pgs-library')?.textContent.includes('Python(.py) 파일이 없습니다'))
  assert.equal((await rows()).length, before + 1)
  console.log('PASS entry-file choice/cancel and no-Python error preserve existing projects')
} finally { await browser.close(); await rm(root, { recursive: true, force: true }) }
