import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(90000);
const out='docs/collaboration/tasks/20260911-studio-method-loops/verification';await mkdir(out,{recursive:true});
const source=`import pygame
pygame.init()
screen = pygame.display.set_mode((480, 320))
running = True
class Player(pygame.sprite.Sprite):
    def update(self): return 42
class Game:
    def __init__(self): self.frames = 0
    def update(self):
        self.frames += 1
        self.check_collision()
    def check_collision(self):
        if self.frames == 10: self.pause_game('COLLISION_PAUSE')
    def pause_game(self, reason):
        global running
        screen.fill((100, 30, 80))
        pygame.display.update()
        print(reason)
        is_paused = True
        while is_paused:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                    is_paused = False
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                    is_paused = False
        print('RESUMED', reason)
player = Player()
game = Game()
game.pause_game('START_PAUSE')
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT: running = False
    assert player.update() == 42
    game.update()
    screen.fill((0, 80, 70))
    pygame.display.update()
pygame.quit()
print('FINISHED')
`;
const logs=()=>p.locator('.pgs-console pre').innerText();
async function run(code){await p.locator('.cm-content').click();await p.keyboard.press('Meta+a');await p.keyboard.insertText(code);await p.getByRole('button',{name:'실행',exact:true}).click()}
async function waitText(text){await p.waitForFunction(text=>document.querySelector('.pgs-console pre')?.textContent.includes(text),text)}
const frame=async()=>await(await p.locator('iframe[title="Python 코드 실행 화면"]').elementHandle()).contentFrame();
async function post(expression){await(await frame()).evaluate(expression=>window.python.PyRun_SimpleString('pygame.event.post('+expression+')'),expression)}
try{
 await p.goto('http://127.0.0.1:5180/dev/python-game-studio');await p.locator('.cm-content').waitFor();
 await run(source);await waitText('START_PAUSE');await p.waitForTimeout(3200);assert.doesNotMatch(await logs(),/RuntimeError|Traceback/);
 await(await frame()).locator('#canvas').click();await p.keyboard.press('Enter');await waitText('COLLISION_PAUSE');
 await p.waitForTimeout(3200);assert.doesNotMatch(await logs(),/RuntimeError|Traceback/);
 await p.screenshot({path:`${out}/collision-pause.png`});
 await p.keyboard.press('Enter');await waitText('RESUMED COLLISION_PAUSE');
 assert.equal((await p.locator('.cm-content').innerText()).trim(),source.trim());
 await post('pygame.event.Event(pygame.QUIT)');await waitText('FINISHED');
 const identity=await(await frame()).evaluate(()=>window.methodLoopQA='warm');
 await run(source);await waitText('START_PAUSE');await post('pygame.event.Event(pygame.QUIT)');await waitText('FINISHED');
 await run(source);await waitText('START_PAUSE');await p.getByRole('button',{name:'정지',exact:true}).click();
 await run('print("WARM_AFTER_PAUSE")');await waitText('WARM_AFTER_PAUSE');assert.equal(await(await frame()).evaluate(()=>window.methodLoopQA),identity);
 await writeFile(`${out}/checks.json`,JSON.stringify({startPauseBeyondWatchdog:true,collisionPauseBeyondWatchdog:true,enterResumes:true,quitDuringPause:true,stopAndWarmRerun:true,sourceUnchanged:true,spriteUpdateRemainsSync:true},null,2));
 console.log('PASS synchronous method chain: start/collision pause > 3s, real Enter, QUIT, stop/warm rerun, unchanged editor, sync sprite update');
}finally{await b.close()}
