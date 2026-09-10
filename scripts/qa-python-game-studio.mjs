import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const STARTER = `import asyncio
import pygame

pygame.init()
screen = pygame.display.set_mode((800, 500))
clock = pygame.time.Clock()

async def main():
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                print("클릭!", event.pos)

        screen.fill((12, 20, 38))
        x, y = pygame.mouse.get_pos()
        pygame.draw.circle(screen, (116, 240, 198), (x, y), 24)
        pygame.display.flip()
        clock.tick(60)
        # 웹에서 화면과 입력을 갱신하는 줄입니다.
        await asyncio.sleep(0)

    pygame.quit()

asyncio.run(main())
`
const base = process.env.GAME_STUDIO_QA_URL || 'http://127.0.0.1:5179/dev/python-game-studio'
const out = process.env.GAME_STUDIO_QA_OUTPUT || '/tmp/metasense-pygame-qa'
await mkdir(out,{recursive:true})
const browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) })
const context = await browser.newContext({ viewport:{width:1440,height:960} })
const page = await context.newPage()
const frame = () => page.frameLocator('iframe[title="Python 코드 실행 화면"]')
const failures=[];page.on('pageerror',error=>failures.push(error.message))
async function code(text) {
  await page.locator('.pgs-file-list button').filter({hasText:'main.py'}).click()
  await page.locator('.cm-content').click();await page.keyboard.press(process.platform==='darwin'?'Meta+a':'Control+a');await page.keyboard.insertText(text)
}
async function run() {
  await page.getByRole('button',{name:'실행',exact:true}).click()
  await page.waitForFunction(()=>['실행 중','실행 완료','오류 확인'].includes(document.querySelector('.pgs-run-status')?.textContent),null,{timeout:90000})
  assert.equal(await frame().getByRole('button',{name:'게임 시작 · 소리 켜기'}).count(),0)
}
async function consoleIncludes(text) { await page.waitForFunction(text=>document.querySelector('.pgs-console pre')?.textContent.includes(text),text,{timeout:20000}) }
async function stop() { await page.getByRole('button',{name:'정지',exact:true}).click();await page.waitForFunction(()=>document.querySelector('iframe[title="Python 코드 실행 화면"]')?.getAttribute('aria-hidden')==='true');assert.equal(await page.locator('iframe[title="Python 코드 실행 화면"]').count(),1) }
try {
  await page.goto(base);await page.getByRole('button',{name:'실행',exact:true}).waitFor()
  await page.screenshot({path:`${out}/studio.png`})
  assert.equal((await page.locator('.cm-content').innerText()).trim(), '')
  await code(STARTER)
  await run();await frame().locator('#canvas').click({position:{x:180,y:120}});await consoleIncludes('클릭!')
  const isolated=await frame().locator('body').evaluate(()=>{let parentBlocked=false,storageBlocked=false;try{void parent.document.body}catch{parentBlocked=true}try{void localStorage.length}catch{storageBlocked=true}return{parentBlocked,storageBlocked}})
  assert.deepEqual(isolated,{parentBlocked:true,storageBlocked:true});console.log('PASS mouse, Korean console, opaque-origin DOM/storage isolation')
  await stop()
  await code('while True:\n    pass\n');await run();await consoleIncludes('반복문이 화면을 멈췄습니다');await stop();console.log('PASS synchronous infinite-loop recovery')
  await code('print(missing_name)\n');await run();await consoleIncludes('NameError');await page.getByRole('button',{name:'오류 줄로 이동'}).click();assert.equal(await page.locator('.python-editor-execution-line').count(),1);await stop()
  await code('def broken(:\n    pass\n');await run();await consoleIncludes('SyntaxError');await stop();console.log('PASS errors and editor navigation')
  await code('print("다시 열기")\n');await page.waitForTimeout(600);await page.reload();await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('다시 열기'));console.log('PASS reload draft recovery')
  const image=await readFile(new URL('../public/python-game-examples/knight.png',import.meta.url))
  const upload=[{name:'기사.png',mimeType:'image/png',buffer:image}]
  if(process.env.GAME_STUDIO_QA_FONT)upload.push({name:'테스트.ttf',mimeType:'font/ttf',buffer:await readFile(process.env.GAME_STUDIO_QA_FONT)})
  if(process.env.GAME_STUDIO_QA_MP3)upload.push({name:'sound.mp3',mimeType:'audio/mpeg',buffer:await readFile(process.env.GAME_STUDIO_QA_MP3)})
  await page.locator('input[type=file][multiple]:not([webkitdirectory])').setInputFiles(upload)
  await page.waitForFunction(()=>document.querySelector('.pgs-file-list')?.textContent.includes('기사.png'))
  await code(`import pygame, asyncio\npygame.init()\nscreen=pygame.display.set_mode((800,500))\nimage=pygame.image.load("기사.png")\nfont=pygame.font.Font(${process.env.GAME_STUDIO_QA_FONT?'"테스트.ttf"':'None'},24)\n${process.env.GAME_STUDIO_QA_MP3?'sound=pygame.mixer.Sound("sound.mp3")\nsound.play()\nprint("AUDIO",sound.get_length())':''}\nasync def main():\n    print("미디어 확인",image.get_size())\n    for i in range(120):\n        screen.fill((12,20,38))\n        screen.blit(image,(100,100))\n        screen.blit(font.render("Upload OK",True,(255,255,255)),(100,200))\n        pygame.display.flip()\n        await asyncio.sleep(0)\n    pygame.quit()\nasyncio.run(main())\n`)
  await run();await consoleIncludes('미디어 확인');if(process.env.GAME_STUDIO_QA_MP3)await consoleIncludes('AUDIO');await page.screenshot({path:`${out}/uploaded-media.png`})
  await stop();console.log('PASS PNG, optional TTF/MP3 upload, OGG conversion and rendering')
  await page.getByRole('button',{name:'내 프로젝트',exact:true}).click();await page.getByRole('button',{name:'몬스터 잡기 예제'}).click();await page.waitForFunction(()=>document.querySelector('input[aria-label="프로젝트 이름"]')?.value==='몬스터 잡기')
  await run();await frame().locator('#canvas').press('Enter');await page.waitForTimeout(400)
  const runtimeFrame=await (await page.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame()
  await runtimeFrame.evaluate(()=>window.python.PyRun_SimpleString(`import asyncio, json, platform\nqa_ns = next(t.get_coro().cr_frame.f_locals['coroutine'].cr_frame.f_globals for t in asyncio.all_tasks() if t.get_coro().cr_frame and 'coroutine' in t.get_coro().cr_frame.f_locals and getattr(t.get_coro().cr_frame.f_locals['coroutine'], 'cr_frame', None))\ndef qa_state():\n g=qa_ns['my_game'];p=qa_ns['my_player']\n platform.window.qaState=json.dumps({'score':g.score,'round':g.round_number,'lives':p.lives,'safe':p.safe,'y':p.rect.y,'monsters':len(g.monster_group)})\nqa_state()\n`))
  await page.waitForTimeout(200)
  const state=async()=>{await runtimeFrame.evaluate(()=>window.python.PyRun_SimpleString('qa_state()'));await page.waitForTimeout(100);return JSON.parse(await runtimeFrame.evaluate(()=>window.qaState))}
  let s=await state();if(s.round===0){await frame().locator('#canvas').press('Enter');await page.waitForTimeout(300);s=await state()}assert.equal(s.round,1);assert.equal(s.lives,5);assert.equal(s.monsters,4)
  await frame().locator('#canvas').press('Space');await page.waitForTimeout(100);s=await state();assert.equal(s.safe,2)
  await frame().locator('#canvas').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(150);await page.keyboard.up('ArrowUp');s=await state();assert.ok(s.y<636)
  await runtimeFrame.evaluate(()=>window.python.PyRun_SimpleString(`g=qa_ns['my_game'];p=qa_ns['my_player']\nfor m in g.monster_group:\n m.velocity=0\n m.rect.topleft=(1000,500)\ntarget=next(m for m in g.monster_group if m.type==g.wanted_monster_type)\ntarget.rect.topleft=(300,200)\np.rect.center=target.rect.center\n`))
  await page.waitForTimeout(150);s=await state();assert.equal(s.score,100)
  await runtimeFrame.evaluate(()=>window.python.PyRun_SimpleString(`target=next(iter(g.monster_group))\ng.wanted_monster_type=(target.type+1)%4\np.lives=1\np.rect.center=target.rect.center\n`))
  await page.waitForTimeout(200);await frame().locator('#canvas').press('Enter');await page.waitForTimeout(200);s=await state();assert.equal(s.score,0);assert.equal(s.lives,5);assert.equal(s.safe,3)
  await page.screenshot({path:`${out}/monster-game.png`});await stop();console.log('PASS monster round start, keyboard movement, safe zone, collision, game-over and restart')
  for(let i=0;i<20;i++) { await code(`print("RESTART_${i}")\n`);await run();await consoleIncludes(`RESTART_${i}`);await stop();console.log(`restart ${i+1}/20`) }
  console.log('PASS 20 warm-runtime runs, one retained iframe')
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS narrow viewport no horizontal document overflow')
  assert.deepEqual(failures,[]);console.log('PASS no uncaught browser exceptions')
} finally { await browser.close() }
