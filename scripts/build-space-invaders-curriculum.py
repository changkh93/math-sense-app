"""Build student documents and checkpoints from the SAME reviewed edit operations."""
import ast
import copy
import json
from pathlib import Path
import textwrap
from curriculum_teaching import annotate, teaching_block, COMMENT_GUIDE
from curriculum_prediction_prompts import prediction, continuity
from curriculum_document_overrides import preserve_live_edits

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'content/space-invaders'
REF = (OUT / 'reference-final.py').read_text()
TREE = ast.parse(REF)
METHODS = {}
for cls in TREE.body:
    if isinstance(cls, ast.ClassDef):
        for fn in cls.body:
            if isinstance(fn, ast.FunctionDef):
                METHODS[f'{cls.name}.{fn.name}'] = '\n'.join(REF.splitlines()[fn.lineno-1:fn.end_lineno])

# Corrections to the accepted runtime are kept in this source of truth.
METHODS['Mission.restart_game'] += "\n        self.state = 'playing'"
METHODS['Raider.__init__'] = METHODS['Raider.__init__'].replace(
    "        self.image = pygame.transform.smoothscale(\n            pygame.image.load('assets/raider.png').convert_alpha(), (56, 48)\n        )",
    "        if not hasattr(Raider, 'shared_image'):\n            Raider.shared_image = pygame.transform.smoothscale(\n                pygame.image.load('assets/raider.png').convert_alpha(), (56, 48)\n            )\n            Raider.shared_shoot_sound = pygame.mixer.Sound('assets/raider_pulse.ogg')\n        self.image = Raider.shared_image"
).replace("self.shoot_sound = pygame.mixer.Sound('assets/raider_pulse.ogg')", "self.shoot_sound = Raider.shared_shoot_sound")

HEADER = REF[:REF.index('# --- 클래스 설계도 ---')].rstrip()
GROUPS = REF[REF.index('# --- 스프라이트 그룹 및 객체 생성 ---'):REF.index('running = True')].rstrip()
GROUPS = GROUPS.replace('\nmission.start_new_round()', '')
FINAL_LOOP = REF[REF.index('running = True'):].strip().replace("    screen.fill((9, 17, 37))", "    if not running:\n        break\n\n    screen.fill((9, 17, 37))")
BASIC_LOOP = '''running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    if not running:
        break

    screen.fill((9, 17, 37))
    pygame.display.update()
    clock.tick(FPS)

pygame.quit()'''
WIRED_LOOP = BASIC_LOOP.replace('    pygame.display.update()', '''    scouts.update()
    raiders.update()
    scout_pulses.update()
    raider_pulses.update()
    mission.update()

    scouts.draw(screen)
    raiders.draw(screen)
    scout_pulses.draw(screen)
    raider_pulses.draw(screen)
    mission.draw()

    pygame.display.update()''')
FIRE_LOOP = WIRED_LOOP.replace('            running = False', '''            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                scout.fire()''')
STATE_LOOP = FINAL_LOOP.replace("                if mission.state == 'game_over':\n                    mission.restart_game()\n                elif mission.state == 'paused':", "                if mission.state == 'paused':")
MODEL = {'intro': '', 'classes': {}, 'setup': '', 'loop': ''}
STEPS = []
TITLES = ['출격 규칙과 게임 스튜디오 준비','화면과 게임 루프, 다섯 설계도','탐사선 표시와 좌우 이동','아군 탄환과 두 발 제한','적의 설계도와 무작위 발사 조건','임시 편대와 적 탄환','Mission과 한글 HUD, 정식 편대','편대 반전과 방어선 침범','전장 정돈과 일시정지','게임오버, 충돌, 다음 라운드']
LECTURES = ['27597170','27597174','27597176','27597182','27597186','27597190','27597194','27597200','27597202','27597204']

def source(m):
    chunks = [m['intro']]
    for name, methods in m['classes'].items():
        base = '' if name == 'Mission' else '(pygame.sprite.Sprite)'
        chunks.append(f'class {name}{base}:\n' + '\n\n'.join(methods.values()))
    chunks += [m['setup'], m['loop']]
    return '\n\n'.join(s for s in chunks if s).rstrip()+'\n'

def method(name, code=None):
    return ('method', name, METHODS[name] if code is None else textwrap.dedent(code).rstrip() if not code.startswith('    ') else code.rstrip())

def body(name, lines):
    signature = METHODS[name].splitlines()[0]
    return method(name, signature+'\n'+textwrap.indent(textwrap.dedent(lines).strip(), '        '))

def add(sid, title, reason, changes, explanation, observation, normal, diagnosis, experiment=None):
    before = copy.deepcopy(MODEL)
    edits = []
    for kind, key, val in changes:
        if kind == 'method':
            cls, fn = key.split('.')
            old = MODEL['classes'][cls].get(fn, '')
            MODEL['classes'][cls][fn] = val
        else:
            old = MODEL[key]
            MODEL[key] = val
        edits.append({'kind': kind, 'key': key, 'before': copy.deepcopy(old), 'after': copy.deepcopy(val)})
    result = source(MODEL)
    ast.parse(result)
    STEPS.append(dict(id=sid,title=title,reason=reason,edits=edits,explanation=explanation,
        observation=observation,normal=normal,diagnosis=diagnosis,experiment=experiment,
        previous=STEPS[-1]['id'] if STEPS else None,source=result))

def component(key,val): return ('component',key,val)

def exp(code, observation): return {'code':textwrap.dedent(code).strip(),'observation':observation}

add('01-A','빈 프로젝트에서 Pygame 확인하기','먼저 코드를 입력할 자리와 출력 위치를 확인합니다. 창을 만들기 전에도 print는 실행될까요?',
    [component('intro','import pygame\n\npygame.init()\nprint("우주 방어대 수업 준비 완료!")\nprint("Pygame 버전:", pygame.__version__)')],
    'import pygame은 게임 도구 모음을 불러옵니다. pygame.init()은 표시·소리 등 모듈을 초기화합니다. print의 따옴표 안은 출력할 글이고, pygame.__version__은 준비된 라이브러리 버전입니다. 밑줄은 앞뒤 두 개씩입니다.',
    '콘솔에 수업 준비 완료 문구와 실제 Pygame 버전이 한 번씩 나옵니다. 이 코드는 출력 후 끝납니다.',
    '아직 display.set_mode를 작성하지 않아 게임 화면은 만들지 않았습니다.',
    'pygame을 못 찾으면 import 철자를 확인합니다. SyntaxError이면 따옴표와 괄호 짝을 확인합니다. 출력이 안 보이면 콘솔 영역을 펼칩니다.')
add('02-A','1200×700 화면과 반복문 열기','화면을 한 번 만들고 끝내면 게임이 계속 움직일 수 없습니다. 입력→배경→화면 반영을 반복할 루프를 먼저 만듭니다.',
    [component('intro',HEADER),component('loop',BASIC_LOOP)],
    'set_mode는 (가로, 세로) 튜플을 받습니다. 화면 왼쪽 위가 (0,0), 오른쪽으로 x, 아래로 y가 증가합니다. running은 반복 여부입니다. event.get()은 모인 입력을 꺼냅니다. QUIT을 받으면 False로 바꾸고 break로 반복을 빠져나옵니다. fill은 이전 프레임을 남색으로 덮고 display.update는 그린 내용을 표시합니다. tick(60)은 초당 최대60회로 제한합니다. 실제 처리 속도가 느리면60보다 낮아질 수 있습니다. pygame.quit()은 while 밖에 둡니다.',
    '남색 화면이 유지됩니다. 스튜디오 정지를 누르면 실행이 끝나고 다시 실행하면 같은 화면이 열립니다.',
    '우주선·적·점수·효과음은 아직 없습니다. 웹 스튜디오 정지는 실행기를 멈추는 버튼입니다. QUIT은 Pygame 종료 이벤트를 처리하는 코드이며 별도 데스크톱 창의 X를 찾을 필요는 없습니다.',
    '창이 바로 끝나면 while 들여쓰기와 pygame.quit 위치를 확인합니다. 배경이 보이지 않으면 fill과 display.update가 while 안인지 확인합니다.')
add('02-B','배경색을 직접 바꿔 보기','RGB 세 값 중 어떤 값을 높이면 화면이 밝아질지 예측합니다. 작은 변경을 실행으로 확인하는 연습입니다.',
    [component('loop',BASIC_LOOP.replace('(9, 17, 37)','(15, 45, 65)'))],
    'RGB는 빨강·초록·파랑의 세기이며 각각0~255입니다. 이번에는 세 값 모두 높여 더 밝은 남청색을 만듭니다. 다음 단계에서는 원래 남색으로 되돌립니다.',
    '이전보다 밝아진 남청색 배경이 나타납니다. 다른 기능은 변하지 않습니다.',
    '도형이 없어도 색상 실험에는 문제가 없습니다.',
    '색이 그대로면 정지 후 수정했는지, 현재 실행 파일이 main.py인지 확인합니다.')
skeleton = {}
for cls in ['Mission','Scout','Raider','ScoutPulse','RaiderPulse']:
    skeleton[cls] = {}
    for key, code in METHODS.items():
        if key.startswith(cls+'.') and key != 'Mission.restart_game':
            skeleton[cls][key.split('.')[1]] = code.splitlines()[0]+'\n        pass'
add('02-C','다섯 클래스에 빈 메서드 마련하기','화면이 열린 뒤 앞으로 맡길 역할의 이름을 정합니다. 설계도를 선언하면 물체도 바로 나타날까요?',
    [component('loop',BASIC_LOOP),component('classes',skeleton)],
    'Mission은 전체 규칙, Scout는 아군, Raider는 적, 두 Pulse는 탄환입니다. __init__은 생성 준비, update는 움직임, draw는 HUD 표시, fire는 발사, reset은 위치 복원입니다. self는 그 객체 자신입니다. 메서드 아래 pass는 아직 아무 일도 하지 않는다는 뜻입니다. 빈 본문 대신 pass를 넣어 문법을 지킵니다. Sprite를 상속한 네 클래스는 Pygame Group에 담아 update와 draw를 함께 처리할 수 있습니다. 이때 모든 기능을 외울 필요는 없고 실제 구현할 단원에서 다시 설명합니다.',
    '원래 남색 배경이 유지되고 오류 없이 실행됩니다.',
    '클래스 정의만 했으므로 화면 변화가 없습니다. 객체 생성과 그룹 연결은03에서 합니다.',
    'def는 class 안4칸, pass는 def 안8칸입니다. __init__ 밑줄을 빠뜨리지 않습니다.')
add('03-A','그룹 연결을 먼저 쓰고 탐사선 표시하기','양쪽 탄환 그룹→아군 그룹/객체→빈 적 그룹→Mission 객체 순서로 연결합니다. 아직 image가 없으므로 아래 세 편집을 모두 마친 다음 실행합니다.',
    [component('setup',GROUPS),component('loop',WIRED_LOOP),method('Scout.__init__')],
    'Group은 여러 Sprite를 담습니다. Scout(scout_pulses)는 탄환을 넣을 같은 그룹을 전달합니다. 먼저 그룹과 update/draw 연결을 쓰고, 마지막으로 Scout 생성자를 채워 실제 실행이 가능하게 만듭니다. super().__init__은 Sprite 내부를 준비합니다. image.load로 원본을 읽고 convert_alpha로 투명을 유지합니다. smoothscale은64×64로 줄입니다. get_rect는 이미지 크기의 위치 상자입니다. centerx=600, bottom=700이면 아래 중앙입니다. lives5, velocity8은 생명과 프레임당 이동거리입니다. self.pulses는 전달한 그룹의 참조입니다. 소리는 지금 로드하지만 발사는04에서 연결합니다. 빈 적/탄환 그룹의 update·draw는 표시할 것이 없어도 호출할 수 있습니다.',
    '아래 중앙에 흰색·청록색 탐사선이 한 대 보입니다.',
    '방향키와 스페이스는 아직 반응하지 않습니다. Mission 메서드와 Scout.update/fire는 pass입니다.',
    'Sprite 내부 속성 오류는 super().__init__을, image/rect 오류는 생성자 편집 완료를 확인합니다. 안 보이면 fill 뒤 draw인지 확인합니다. 에셋 경로는 assets/scout.png입니다.')
add('03-B','누르는 동안 움직이고 경계를 보정하기','키를 한 번 누른 순간과 계속 누른 상태는 다릅니다. 위치를 먼저 옮긴 뒤 경계를 확인하면 속도를 바꾸어도 밖으로 나가지 않습니다.',
    [method('Scout.update')],
    'get_pressed는 현재 누른 키를 알려줍니다. 왼쪽은 x에서8을 빼고 오른쪽은8을 더합니다. 이동 전 조건만 검사하면 x=1에서8을 뺐을 때-7이 됩니다. 마지막 두 if가 left를0 이상, right를1200 이하로 되돌립니다. 각 if 본문은12칸입니다. 상수와 키 이름은 대문자입니다.',
    '게임 화면을 클릭하고 왼쪽/오른쪽을 길게 누릅니다. 기체가 연속 이동하고 양쪽 끝에서 화면 안에 머뭅니다.',
    '위아래 방향키로는 이동하지 않습니다. 아직 탄환은 없습니다.',
    '키가 에디터에 입력되면 게임 화면을 클릭합니다. 이동 시 NameError면 K_LEFT/K_RIGHT 철자를 확인합니다. 경계를 넘으면 보정 if가 update 안에서 이동 뒤인지 봅니다.',
    exp('scout.velocity = 7','양쪽 끝까지 이동해도 화면 밖으로 나가지 않습니다. 임시 줄 제거 후 속도는 생성자의8로 돌아갑니다.'))
add('03-C','reset으로 중앙 복귀 확인하기','피격됐을 때 새 객체를 만드는 대신 위치만 복원하려고 합니다. 좌우로만 움직이는 기체는 어떤 좌표만 되돌리면 될까요?',
    [method('Scout.reset')],
    'centerx를 화면 폭의 절반으로 돌립니다. bottom은 이동 코드에서 바뀌지 않아 그대로700입니다. reset을 정의한 것과 실제 호출한 것은 다릅니다. 아래 임시 호출로 결과를 확인합니다.',
    '일반 실행에서는 기존 이동이 유지됩니다. 아래 시험에서는 콘솔600과 중앙에 놓인 기체를 확인합니다.',
    '피격 시 자동 reset은09에서 연결합니다.',
    '시험 후100이 나오면 reset() 호출의 괄호와 들여쓰기를 확인합니다. reset을 클래스 밖 함수로 쓰지 않습니다.',
    exp('scout.rect.x = 100\nscout.reset()\nprint("복귀 중심:", scout.rect.centerx)','콘솔: 복귀 중심: 600. 기체는 아래 중앙입니다. 시험3줄을 제거합니다.'))
add('04-A','아군 탄환을 만들고 발사 연결하기','탄환을 생성해 그룹에 등록하고 위로 움직입니다. 발사 함수와 키 입력은 서로 어떻게 연결될까요?',
    [method('ScoutPulse.__init__'),body('ScoutPulse.update','self.rect.y -= self.velocity'),body('Scout.fire',"self.shoot_sound.play()\nScoutPulse(self.rect.centerx, self.rect.top, self.pulses)"),component('loop',FIRE_LOOP)],
    'Surface((4,16),SRCALPHA)는 투명도를 지원하는 작은 표면입니다. fill의 청록색으로 탄환을 칠합니다. centerx/centery는 전달한 포구 좌표, velocity10은 이동거리입니다. pulse_group.add(self)가 생성된 탄환을 그룹에 넣습니다. y를 빼면 위로 이동합니다. KEYDOWN의 SPACE에서 scout.fire를 한 번 호출합니다. fire는 소리를 재생하고 ScoutPulse를 만듭니다.03에서 연결한 그룹 update/draw가 새 탄환에도 적용됩니다.',
    '화면을 클릭하고 스페이스를 여러 번 누릅니다. 청록색 탄환이 기체 위에서 위쪽으로 이동하며 발사음이 납니다.',
    '탄환 수 제한과 화면 밖 정리가 아직 없습니다. 적도 없어 충돌은 볼 수 없습니다.',
    '소리만 나면 pulse_group.add(self)와 그룹 draw를 확인합니다. 탄환이 아래로 가면 y의 부호를 확인합니다. 키를 꾹 누르는 자동 연사는 이 수업의 기본 조작이 아닙니다.')
add('04-B','두 발 제한의 빈틈 관찰하기','화면에 보이는 탄환 수와 그룹에 남은 탄환 수는 같을까요? 일부러 정리를 연결하기 전에 차이를 확인합니다.',
    [method('Scout.fire')],
    'len(self.pulses)는 이 그룹의 객체 수입니다.2보다 작을 때만 소리와 생성을 모두 실행합니다. 화면 밖으로 이동한 객체도 그룹에서 제거하지 않았다면 계속 셉니다.',
    '스페이스 두 번을 누르고 탄환이 위로 사라질 때까지 기다립니다. 다시 눌러도 발사되지 않습니다.',
    '이 단계의 의도된 문제입니다. 다음 단계에서 kill을 연결하면 다시 발사됩니다.',
    '세 발 이상 나오면 조건 아래 소리와 생성 줄의 들여쓰기를 봅니다. 첫 두 발도 없으면 이전 단계 발사 연결을 확인합니다.')
add('04-C','화면 밖 탄환을 그룹에서 제거하기','탄환 전체가 화면 위로 나갔는지 판정합니다. top과 bottom 중 어느 값으로 검사해야 끝부분까지 나간 것을 알 수 있을까요?',
    [method('ScoutPulse.update')],
    'bottom<0이면 탄환의 맨 아래까지 화면 위에 있습니다. kill은 이 Sprite를 모든 소속 그룹에서 제거합니다. 객체를 참조하는 모든 변수를 지우거나 메모리를 무조건 즉시 해제한다는 뜻은 아닙니다. 그룹 수가 줄어 발사 조건이 다시 참이 됩니다.',
    '두 발 발사→화면 위로 소멸→다시 두 발 발사를 반복할 수 있습니다.',
    '두 발이 아직 화면 안에 있으면 세 번째 입력은 무시됩니다.',
    '계속 막히면 kill의 괄호와 bottom<0을 확인합니다. 발사하자마자 사라지면 bottom>0으로 쓰지 않았는지 확인합니다.')
add('05-A','적의 생성·이동·복원 설계도 작성하기','적도 Sprite이지만 각자 시작 위치와 방향을 기억해야 합니다. 실제 편대 생성은 다음 단원입니다. 이번에는 설계도를 작은 메서드 세 개로 채웁니다.',
    [method('Raider.__init__'),method('Raider.update'),method('Raider.reset')],
    'x/y는 전달받은 시작 좌표, velocity는 이동거리입니다. hasattr(Raider, "shared_image")는 클래스에 공용 그림이 준비됐는지 검사합니다. 첫 적만 그림·소리를 로드해 Raider.shared_image/shared_shoot_sound에 저장하고 이후 적은 같은 자료를 참조합니다.55기마다 고해상도 그림을 다시 읽고 축소하지 않아 새 편대 준비를 줄입니다. 각 적의 rect는 따로 만들어 위치는 공유하지 않습니다. 이미지56×48의 rect.topleft에 좌표를 넣고 starting_x/y에도 별도로 기억합니다. direction=1은 오른쪽, -1은 왼쪽입니다. direction*velocity로 두 방향을 같은 식으로 처리합니다. randint(0,1000)은 양끝 포함1001가지이고 >999는1000 하나만 선택하므로 확률1/1001입니다. 한 적·60FPS·탄환 제한이 없다는 가정에서 평균 대기시간은 약16.7초이며 고정 주기가 아닙니다. 모든 적이 같은 pulses 그룹을 참조해 총3발을 제한합니다. fire는 아직 pass라 소리 호출 외 탄환 생성은06에서 완성합니다. reset은 시작좌표와 오른쪽 방향을 복원합니다.',
    '실행해도 아군만 나타납니다. 기존 좌우 이동과 발사가 유지됩니다.',
    'Raider 객체를 아직 생성하지 않아 적이 없는 것이 정상입니다. 설계도 작성만으로 이미지가 나타나지는 않습니다.',
    '이미지 경로는 assets/raider.png, 발사음은 assets/raider_pulse.ogg입니다. 방향 식에 곱하기를 빠뜨리지 않습니다. 무작위 함수를 사용하므로 파일 위 import random이 필요합니다.')
add('06-A','임시 열 마리 편대부터 확인하기','적 탄환을 만들기 전에 적 객체가 실제로 생성되고 움직이는지 확인합니다. 한 줄의 좌표 간격을 먼저 예측합니다.',
    [component('setup',GROUPS.replace('\nmission =', '\nfor i in range(10):\n    raiders.add(Raider(64 + i * 64, 100, 2, raider_pulses))\n\nmission ='))],
    'range(10)의 i는0~9입니다. x는64,128,...640이고 y는100입니다. 속도2를 전달합니다. 객체를 raiders에 넣으면 기존 update/draw 연결로 이동과 표시가 시작됩니다. Mission은 여전히 pass입니다.',
    '보라색 적10기가 한 줄로 오른쪽 이동합니다. 발사 조건에 따라 소리가 날 수 있습니다.',
    '적 탄환은 아직 없고, 편대는 화면 끝을 넘어갑니다. 반전은08에서 작성합니다.',
    '적이 하나뿐이면 add가 for 안4칸인지 확인합니다. 생성 인수는 x,y,속도,탄환그룹의 네 개입니다.')
add('06-B','적 탄환의 하강과 발사 연결하기','아군과 반대로 아래로 움직이는 탄환을 만듭니다. 먼저 정리 없이 하강 자체를 확인합니다.',
    [method('RaiderPulse.__init__'),body('RaiderPulse.update','self.rect.y += self.velocity'),method('Raider.fire')],
    '적 탄환은 산호색(255,92,124)이고4×16입니다. y+=10이면 아래로 이동합니다. Raider.fire는 적의 centerx와 bottom에서 RaiderPulse를 만듭니다. 적의 공통 그룹에 추가되어 총3발 제한을 공유합니다.',
    '잠시 관찰하면 산호색 탄환이 적 아래에서 아래쪽으로 내려갑니다. 스페이스를 누르면 아군 탄환은 반대로 올라갑니다.',
    '아직 화면 밖 정리가 없으므로 적 탄환3개가 생성된 뒤에는 새 탄환이 막힐 수 있습니다. 탄환끼리 또는 캐릭터와 충돌하지 않습니다.',
    '확률이라 즉시 발사가 보장되지 않습니다. 확실하게 시험하려면 아래 임시 발사 호출을 사용합니다. 탄환색과 이동 부호를 확인합니다.',
    exp('raiders.sprites()[0].fire()','실행 직후 첫 적 아래에 산호색 탄환이 나타납니다. 시험 줄을 제거합니다.'))
add('06-C','비교 연산 오류를 직접 관찰하기','화면 아래를 벗어난 탄환을 정리하려다가 부등호를 반대로 쓴 경우입니다. top=150일 때150<700은 참일까요?',
    [body('RaiderPulse.update','self.rect.y += self.velocity\nif self.rect.top < SCREEN_HEIGHT:\n    self.kill()')],
    '이번 코드는 진단용 오류입니다. 아직 화면 안에 있는 탄환의 top도700보다 작으므로 첫 update에서 제거됩니다. 소리가 나도 탄환이 안 보이는 원인을 좌표로 찾습니다.',
    '아래 임시 발사를 넣어도 적 탄환이 유지되지 않습니다.150<700이 참이므로 즉시 제거되기 때문입니다.',
    '이 오류를 완성 코드로 남기지 않습니다. 바로 다음06-D에서 고칩니다.',
    '아군 탄환까지 안 보이면 잘못된 클래스의 update를 바꿨을 수 있습니다. RaiderPulse.update만 수정합니다.',
    exp('raiders.sprites()[0].fire()','첫 프레임에서 적 탄환이 사라집니다. 시험 줄은 제거하고06-D로 진행합니다.'))
add('06-D','올바른 아래 경계로 수정하기','탄환의 맨 위도700보다 커졌을 때에만 화면 전체를 벗어났습니다.',
    [method('RaiderPulse.update')],
    'top>SCREEN_HEIGHT로 고칩니다. 아군은 bottom<0, 적은 top>700으로 전체 이탈을 검사합니다. 두 경우 모두 움직인 뒤 판정합니다.',
    '산호색 탄환이 아래 끝까지 내려간 뒤 사라지고, 이후 다시 발사됩니다. 아군과 적의 탄환은 서로 반대 방향으로 이동합니다.',
    '적이 끝을 넘어가거나 탄환이 캐릭터를 통과하는 것은 아직 정상입니다.',
    '탄환3발 후 멈추면 kill이 올바른 if 안인지 확인합니다. 필요하면 임시 발사 호출로 무작위 대기와 코드 오류를 구별합니다.')

# Mission construction is intentionally introduced after the sprites.
init7 = METHODS['Mission.__init__'].replace("\n        self.state = 'playing'\n        self.pause_main_text = ''\n        self.pause_sub_text = ''\n", '')
add('07-A','Mission에 규칙의 값과 참조 보관하기','스프라이트들이 움직이므로 이제 전체 게임 규칙을 연결합니다. 점수는 어떤 객체 한 곳에서 관리하면 좋을까요?',
    [method('Mission.__init__',init7),body('Mission.update','self.shift_raiders()\nself.check_collisions()\nself.check_round_completion()')],
    'round_number1과 score0을 Mission에 둡니다. 기체 생명은 Scout.lives 한 곳에 있고 Mission.scout으로 읽습니다. 같은 그룹 참조를 받아 나중에 정리와 충돌을 처리합니다. 소리4개와 DoHyeon-Regular.ttf를 초기화할 때 로드합니다. update는 반전·충돌·완료 메서드를 순서대로 호출하지만 지금 세 메서드는 pass입니다.',
    '기존 임시10기와 양쪽 탄환이 그대로 작동합니다. 아직 글자가 보이지 않습니다.',
    '폰트를 로드하는 것과 글자를 그리는 것은 다릅니다. HUD는 다음 단계입니다.',
    '파일을 못 찾으면 assets 바로 아래 경로인지 확인합니다. assets/fonts나 assets/sounds 폴더를 새로 만들지 않습니다. 폰트28은 글자 크기입니다.')
score_draw = '''score_text = self.font.render(f'점수: {self.score}', True, (240, 246, 255))
score_rect = score_text.get_rect(centerx=SCREEN_WIDTH // 2, top=10)
screen.blit(score_text, score_rect)'''
add('07-B','한글 점수 한 줄부터 표시하기','폰트→글자 표면→위치 상자→화면 복사의 순서를 익힙니다.',
    [body('Mission.draw',score_draw)],
    'font.render는 문자열을 이미지처럼 그릴 표면으로 만듭니다. f 문자열의 {self.score}에는 현재 값0이 들어갑니다. True는 글자 경계를 부드럽게 처리합니다. get_rect(centerx=600,top=10)으로 위 중앙에 배치하고 blit으로 화면에 복사합니다. 제공된 한글 폰트를 함께 로드하므로 운영체제 기본 폰트에 의존하지 않습니다.',
    '상단 중앙에 점수: 0이 보입니다. 아래 시험을 하면1200으로 바뀝니다.',
    '적을 맞혀도 점수가 아직 오르지 않습니다. 충돌은10에서 작성합니다.',
    '네모가 보이면 기본 Font(None,...)로 바꾸지 않았는지 확인합니다. 폰트에 없는 특수문자 대신 한글과 ASCII 하이픈을 사용합니다.',
    exp('mission.score = 1200','상단 점수: 1200. 임시 줄을 제거하면 다시0으로 시작합니다.'))
full_draw = METHODS['Mission.draw'].split("\n        if self.state in")[0]
add('07-C','라운드·기체와 방어선 표시하기','점수 한 줄의 패턴을 왼쪽과 오른쪽에도 적용합니다. 방어선은 화면 높이에서100을 뺀 곳입니다.',
    [method('Mission.draw',full_draw)],
    '라운드는 topleft=(20,10), 기체는 top right가(1180,10)이 되도록 정렬합니다. 생명은 self.scout.lives를 읽습니다. draw.line의 앞 두 좌표가 시작점과 끝점, 마지막3이 두께입니다. 위 구분선은 y50, 붉은 방어선은 y600입니다.',
    '왼쪽 라운드1, 중앙 점수0, 오른쪽 남은 기체5가 보입니다. y50과 y600에 두 선이 그려집니다.',
    '선을 그렸다고 침범 판정이 생기지는 않습니다.08에서 구현합니다.',
    '기체 수가 오류이면 Mission.lives를 새로 만들지 말고 self.scout.lives를 사용합니다. draw를 fill 앞에 두면 글자가 지워집니다.')
round7 = METHODS['Mission.start_new_round'].replace('        self.scout_pulses.empty()\n        self.raider_pulses.empty()\n        self.scout.reset()\n','')
add('07-D','11열×5행 편대 생성 메서드 작성하기','한 줄 배치를 두 겹 반복문으로 확장합니다. i=2,j=1일 때 위치는 어디일까요?',
    [method('Mission.start_new_round',round7)],
    '바깥 i는0~10, 안쪽 j는0~4로55번 생성합니다. 좌표는64+i*64,64+j*64이며 예시는(192,128)입니다. 가로64 간격에 폭56이므로 사이8픽셀이 남습니다. 속도에 round_number를 전달합니다. 생성 후 출격음을 재생하고 pause_game을 호출하지만 아직 pause는 pass입니다.',
    '현재는 메서드를 정의했을 뿐이라 임시10기가 그대로 보입니다. 다음 단계에서 초기화 구간을 교체해 정식 편대를 호출합니다.',
    '정식55기가 아직 나타나지 않는 것이 정상입니다.',
    'Raider 인수는 좌표 두 개, 속도, 탄환그룹 총4개입니다. add는 안쪽 for 안12칸입니다.')
add('07-E','임시 편대를 제거하고 정식 편대 호출하기','두 편대가 함께 생기지 않도록 준비 구간 전체를 확인합니다. Mission 객체도 한 번만 만듭니다.',
    [component('setup',GROUPS+'\nmission.start_new_round()')],
    'setup 전체를 교체하므로 이전 for range(10)은 남기지 않습니다. 그룹과 아군 생성은 그대로이고 Mission 생성 바로 뒤에서 start_new_round를 한 번 호출합니다. 메서드는 이미 정의돼 있어 호출할 수 있습니다.',
    '출격음과 함께11열5행의55기가 보이고 오른쪽으로 이동합니다. 임시10기는 없습니다.',
    '아직 화면 끝을 넘어가며 일시정지하지 않습니다.',
    '65기가 보이면 임시 루프가 남았는지,110기면 start_new_round를 두 번 호출했는지 확인합니다. 아래 시험에서55가 출력돼야 합니다.',
    exp('print("편대 수:", len(raiders))','콘솔: 편대 수: 55. 출력 줄 제거 후 계속합니다.'))
shift8 = METHODS['Mission.shift_raiders'].replace('            breach = False\n','')
shift8 = shift8[:shift8.index('                if raider.rect.bottom')].rstrip()
add('08-A','전체 편대를 함께 반전시키기','경계 도달 여부를 먼저 모두 조사하고, 그 결과로 전체를 움직입니다. 각 적이 따로 방향을 바꾸면 배열은 어떻게 될까요?',
    [method('Mission.shift_raiders',shift8)],
    'shift=False로 시작해 한 기라도 left<=0 또는 right>=1200이면 True로 둡니다. 그 뒤 별도 반복문으로 모두 y를10×라운드만큼 늘리고 direction에-1을 곱합니다. 마지막 x 보정으로 경계에서 한 걸음 떨어져 다음 프레임에 같은 경계를 다시 감지하는 일을 줄입니다. 첫 적을 조사하자마자 전체를 움직이지 않고 조사와 이동을 분리합니다.',
    '편대가 오른쪽 끝에 닿으면 모두 아래10픽셀로 내려오고 왼쪽으로 움직입니다. 왼쪽 끝에서도 함께 반전합니다.',
    '아직 방어선을 넘어도 생명이 줄지 않습니다.',
    '일부 적만 반전하면 두 번째 for가 첫 번째 for 안에 들어갔는지 확인합니다. 즉시 계속 내려가면 경계 보정 줄을 확인합니다.',
    exp('for raider in raiders:\n    raider.rect.x += 440','시작 직후 오른쪽 경계에 닿아 전체가 한 번 반전합니다. 시험2줄을 제거합니다.'))
add('08-B','침범을 한 번의 사건으로 처리하기','한 번의 하강에서 여러 적이 선을 넘더라도 생명을 여러 번 빼면 안 됩니다. 감지용 변수를 먼저 모읍니다.',
    [method('Mission.shift_raiders')],
    'breach=False에서 시작하고 내려온 적의 bottom>=600이면 True로 둡니다. 생명 차감과 소리는 for 바깥에서 한 번 실행합니다. check_game_status로 후속 정리를 맡기지만 아직 pass입니다. 따라서 이후 다른 경계에 닿아 다시 하강하면 생명이 또 줄 수 있습니다.',
    '아래 빠른 시험에서 침범음과 생명5→4를 확인합니다. 기본 속도로 오래 기다릴 필요가 없습니다.',
    '침범 후 위치 복원과 일시정지는09에서 구현하므로 적이 계속 이동합니다. 이 시점에 게임오버가 없는 것도 정상입니다.',
    '한 번에 생명이 여러 개 줄면 lives-=1이 for 안인지 확인합니다. 전혀 줄지 않으면 bottom과 방어선600 비교를 확인합니다.',
    exp('mission.round_number = 30\nfor raider in raiders:\n    raider.velocity = 30','한 번 하강은300픽셀입니다. 두 번째 하강 무렵 침범음과 생명 감소가 보입니다. 확인 즉시 정지하고 시험3줄을 삭제합니다. 다시 실행해 라운드1/기체5로 복원됐는지 확인합니다.'))
add('09-A','상태 확인: 탄환 정리와 위치 복원부터','침범 이후 계속 내려오는 문제를 먼저 해결합니다. pause 기능을 채우기 전에 정돈 순서를 작성합니다.',
    [method('Mission.check_game_status')],
    '양쪽 그룹 empty로 잔여 탄환을 비웁니다. Scout.reset은 중앙, 남은 Raider.reset은 각자의 시작좌표와 오른쪽 방향을 복원합니다. 생명 차감은 이미 침범 처리에 있으므로 이 함수에서 또 빼지 않습니다. lives<=0이면 reset_game, 아니면 pause_game을 호출합니다. 둘 다 아직 pass입니다.',
    '아래 시험에서 탄환 수가0으로 바뀌고 기체 중심600, 적 시작좌표로 복귀합니다. 잠깐의 정돈 후 게임은 계속 움직입니다.',
    '안내창과 Enter 대기는 아직 없습니다. 생명0 이하 전체 리셋도10에서 완성합니다.',
    '침범 한 번에2가 줄면 여기서 lives를 다시 빼지 않았는지 확인합니다. 적이 복원되지 않으면 for raider의 reset 호출을 확인합니다.',
    exp('scout.rect.x = 100\nscout.fire()\nmission.check_game_status("시험", "계속")\nprint("정돈:", len(scout_pulses), scout.rect.centerx)','콘솔: 정돈: 0 600. 시험4줄을 제거합니다.'))
add('09-B','기다리는 상태와 메인 루프 연결하기','메서드 안에 별도 무한 루프를 만들면 이 웹 실행기의 최상위 루프 양보 처리를 우회해 응답을 막을 수 있습니다. 기존 루프에서 update 실행 여부만 나눕니다.',
    [method('Mission.__init__'),method('Mission.pause_game'),method('Mission.update'),component('loop',STATE_LOOP)],
    'state는 playing/paused를 나타냅니다. pause_game은 문구와 상태를 저장하고 즉시 반환합니다. 최상위 루프에서 playing일 때만 그룹 update와 Mission.update를 실행합니다. Space도 playing만 허용하고 Enter는 paused를 해제합니다. Mission.update는 처리 중 상태가 바뀌면 return해서 같은 프레임의 다음 처리를 중단합니다. draw와 이벤트 처리는 대기 중에도 계속합니다.',
    '실행 직후 적이 움직이지 않습니다. 방향키·Space도 반응하지 않으며 Enter를 누르면 움직임이 시작됩니다.',
    '저장한 안내 문구를 아직 그리지 않았으므로 화면 중앙의 안내는 없습니다. 다음 단계에서 표시합니다.',
    '시작부터 움직이면 state가 paused로 바뀌는 start_new_round→pause_game 호출을 확인합니다. Enter가 안 되면 게임 화면 포커스와 KEYDOWN 들여쓰기를 확인합니다.')
add('09-C','반투명 안내창에 이유 표시하기','기다리는 이유가 보이지 않으면 사용자는 멈춘 줄 알 수 있습니다. 정지된 전장 위에 안내를 그립니다.',
    [method('Mission.draw')],
    'overlay는 화면 크기의 투명 표면입니다. (0,0,0,180)의 마지막 값은 불투명도이며255보다 작아 뒤 화면이 비칩니다. 전장과 HUD를 그린 다음 검은 막과 문구를 그립니다. title은 가운데보다20픽셀 위, 보조문구는30픽셀 아래입니다. game_over라는 상태의 표시도 준비하되 실제 전환은10에서 구현합니다.',
    '시작 화면에 우주 방어대 - 라운드 1과 Enter 안내가 나타납니다. 대기 중 방향키/Space는 무시되고 Enter를 누르면 안내가 사라집니다.',
    '정지 화면에서도 draw와 이벤트 처리는 계속됩니다. 게임 스튜디오 정지 버튼으로 실행을 끝낼 수 있습니다.',
    '막 뒤에도 물체가 움직이면 update 조건이 빠졌습니다. 안내가 안 보이면 Mission.draw가 다른 그룹 draw 뒤인지 확인합니다.')
add('09-D','침범 후 대기와 재개 확인하기','시작 대기와 침범 대기가 같은 함수를 쓰는지 확인합니다. 이 단계는 새 기능 추가 없이 앞 단계 통합 동작을 시험합니다.',
    [],
    '임시 설정은 첫 경계 접촉에서 방어선을 넘도록 기존 적 위치를 오른쪽·아래로 옮깁니다. starting_x/y는 바꾸지 않아 check_game_status에서 원래 편대로 돌아갑니다. Enter로 시작하면 침범→생명 감소→정돈→paused 순서가 실행됩니다.',
    'Enter로 시작하면 침범 안내와 남은 기체4가 보입니다. 두 번째 Enter로 재개하면 원래 높이의 편대가 오른쪽으로 움직입니다. 대기 중 발사하지 않습니다.',
    '아직 적 탄환에 맞아도 생명이 줄지 않습니다. 그 충돌은10에서 연결합니다.',
    '재개하자마자 침범하면 starting_y까지 바꾼 것은 아닌지 확인합니다. 시험 코드는 한 번의 시작 위치만 바꾸고 삭제해야 합니다.',
    exp('for raider in raiders:\n    raider.rect.x += 440\n    raider.rect.y += 240','첫 하강에서 맨 아래 적의 bottom이600을 넘어 침범합니다. 시험3줄 제거 후 라운드1/기체5로 새로 시작합니다.'))
add('10-A','최종 점수 유지와 Enter 새 게임','충돌을 연결하기 전에 생명이 없어졌을 때의 경로를 만듭니다. 최종 점수를 그리기도 전에 새 라운드를 호출하면 문구가 덮이므로 두 동작을 나눕니다.',
    [method('Mission.reset_game'),method('Mission.restart_game'),component('loop',FINAL_LOOP)],
    'reset_game은 최종 점수 문구와 game_over만 설정합니다. restart_game은 Enter를 눌렀을 때 점수0/라운드1/생명5, 그룹/기체 위치를 초기화하고 새 편대를 만듭니다. start_new_round가 paused를 설정하므로 마지막 state=playing으로 Enter 한 번에 새 게임을 시작합니다. 일반 paused의 Enter는 초기화 없이 계속합니다. QUIT은 반복을 다시 True로 만들지 않습니다.',
    '아래 시험에서 최종 점수700이 Enter 전까지 남습니다. Space/방향키는 무시됩니다. Enter 한 번으로 점수0/라운드1/기체5/새55기가 움직입니다.',
    '아직 충돌과 전멸 판정이 없으므로 시험은 check_game_status를 직접 호출합니다.',
    '최종점수 대신 라운드 안내가 나오면 reset_game에서 새 라운드를 호출하지 않았는지 확인합니다. Enter 두 번이 필요하면 restart_game 마지막 state를 확인합니다.',
    exp('mission.score = 700\nscout.lives = 0\nmission.check_game_status("시험", "Enter")','최종 점수: 700 유지→Enter 한 번→새 게임. 시험3줄을 지우고 다시 실행합니다.'))
collide_enemy = METHODS['Mission.check_collisions'].split('\n        if pygame.sprite.spritecollide')[0]
add('10-B','아군 탄환과 적의 충돌·점수','충돌 후 제거할 그룹과 점수를 정합니다. 탄환 한 발이 적 둘과 겹치면 점수를 한 번만 더해도 될까요?',
    [method('Mission.check_collisions',collide_enemy)],
    'groupcollide(아군탄환,적,True,True)는 겹친 양쪽 Sprite를 소속 그룹에서 제거합니다. 결과 딕셔너리의 각 값은 그 탄환이 맞힌 적 목록입니다. 목록 길이에100을 곱해 실제 격추 수만큼 더합니다. 결과가 있을 때만 격추음을 냅니다. 사각형 Rect 기준 충돌이며 투명 이미지 윤곽 그대로의 픽셀 판정은 아닙니다.',
    'Enter로 시작하고 적을 향해 발사합니다. 맞은 적과 탄환이 사라지고 적 한 기당100점이 증가합니다. 파편 애니메이션은 없습니다.',
    '적 탄환이 아군을 통과하는 것은 아직 정상입니다.',
    '명중해도 그대로면 check_collisions가 Mission.update에 연결됐는지 확인합니다. 항상100만 늘면 killed_raiders 길이 계산을 확인합니다.',
    exp('target = raiders.sprites()[0]\nshot = ScoutPulse(target.rect.centerx, target.rect.centery, scout_pulses)\nmission.check_collisions()\nprint("격추:", mission.score, len(raiders))','콘솔: 격추: 100 54. 시험4줄을 제거하고 정상 게임으로 돌아갑니다.'))
add('10-C','적 탄환 피격과 상태 전환','적 탄환을 맞으면 생명을 줄이고09의 정돈 경로로 보냅니다. 여러 탄환이 같은 프레임에 겹쳤을 때 생명은 몇 개 줄까요?',
    [method('Mission.check_collisions')],
    'spritecollide는 기체 하나와 적 탄환 그룹을 비교합니다. True로 충돌한 탄환을 제거합니다. 결과 목록이 비어 있지 않을 때 if 본문이 한 번 실행되므로 같은 검사에서 여러 탄환에 맞아도 생명은1만 줄어듭니다. 피격음→생명감소→check_game_status로 정돈하고 대기/게임오버를 정합니다. Mission.update의 return 검사가 이 상태 전환을 보호합니다.',
    '아래 시험에서 기체5→4, 피격 안내, 탄환 정리, 중앙 복귀를 확인합니다. Enter로 재개합니다.',
    '적을 모두 없애도 다음 라운드는 아직 시작하지 않습니다.',
    '피격 후 생명이2씩 줄면 check_game_status에서 다시 차감하지 않는지 확인합니다. 대기 중에도 새 발사가 되면 이벤트의 playing 조건을 확인합니다.',
    exp('RaiderPulse(scout.rect.centerx, scout.rect.centery, raider_pulses)\nmission.check_collisions()','남은 기체4와 피격 안내가 나타납니다. 시험2줄을 제거합니다.'))
add('10-D','현재 라운드 보너스와 새 편대','마지막으로 전멸 조건을 연결합니다.2라운드를 끝냈을 때 번호를 먼저3으로 올리면 보너스가 얼마로 잘못 계산될까요?',
    [method('Mission.start_new_round'),method('Mission.check_round_completion')],
    '빈 Group은 거짓으로 판단되므로 if not self.raiders가 전멸 조건입니다. 증가 전 round_number로1000×현재라운드 보너스를 더한 뒤 번호를1 올립니다. 새 라운드 시작에서는 양쪽 잔여탄환을 비우고 아군을 중앙으로 돌립니다. 이후55기, 라운드별 속도, 출격음, 시작 대기를 준비합니다. Mission.update는 충돌에서 상태가 바뀌면 여기까지 진행하지 않습니다.',
    '아래 시험에서 점수100→2100, 라운드2→3, 적55, 양쪽탄환0, 새 라운드 안내를 확인합니다. Enter로 다음 편대를 시작합니다.',
    '라운드가 높을수록 속도와 하강 폭이 커집니다. 시험은 복원해야 정상1라운드에서 시작합니다.',
    '보너스가3000이면 번호를 올린 뒤 계산한 것입니다. 새 라운드에 탄환이 남으면 start_new_round 첫 정리 줄을 확인합니다.',
    exp('mission.score = 100\nmission.round_number = 2\nScoutPulse(200, 300, scout_pulses)\nRaiderPulse(200, 300, raider_pulses)\nraiders.empty()\nmission.state = "playing"\nmission.check_round_completion()\nprint("다음:", mission.score, mission.round_number, len(raiders), len(scout_pulses), len(raider_pulses))','콘솔: 다음: 2100 3 55 0 0. 시험8줄을 삭제하고 다시 실행해0점/1라운드/5기체를 확인합니다.'))
add('10-E','동시 사건과 완성 게임 점검','마지막 적 격추와 마지막 생명 피격이 같은 프레임에 생기면 무엇을 보여야 할까요? 최종점수100과 게임오버를 유지하고 라운드 보너스로 덮지 않는지 확인합니다.',
    [],
    '검사 순서는 경계→아군 명중→적 탄환 피격→라운드 완료입니다. 피격으로 game_over가 되면 update가 return하므로 다음 라운드로 넘어가지 않습니다. 마지막 적의100점은 이미 반영돼 최종점수에 남습니다. 남은 생명이 있다면 피격 대기를 먼저 거쳐 Enter 후 전멸 판정을 진행합니다.',
    '아래 시험에서는 최종 점수100이 보이고 라운드1을 유지합니다. Enter 한 번이면0점/1라운드/5기체/55기로 다시 시작합니다. 시험 코드를 지운 뒤 정상 조작과 스튜디오 정지→재실행을 확인합니다.',
    '이제 기본 제작은 완성됐습니다. 배경음악·파편 애니메이션·온라인 점수판은 이 게임에 포함하지 않았습니다.',
    '최종점수1100이나 라운드2가 보이면 Mission.update의 상태 검사를 확인합니다. 반복 실행 때 편대가 쌓이면 setup의 한 번 생성과 restart_game의 raiders.empty를 확인합니다.',
    exp('raiders.empty()\nscout.lives = 1\nmission.score = 0\nraider = Raider(100, 100, 1, raider_pulses)\nraiders.add(raider)\nScoutPulse(raider.rect.centerx, raider.rect.centery, scout_pulses)\nRaiderPulse(scout.rect.centerx, scout.rect.centery, raider_pulses)\nmission.state = "playing"\nmission.update()','최종 점수100, 생명0, 게임오버 유지. Enter 새 게임을 확인한 뒤 시험9줄을 전부 제거합니다.'))


def block(code): return teaching_block(code)

def edit_text(edit):
    kind,key,old,new = [edit[k] for k in ['kind','key','before','after']]
    if kind == 'method':
        cls,fn = key.split('.')
        how = f'`class {cls}` 안의 `def {fn}`부터 그 메서드 본문 끝까지 **전체 교체**합니다. 다음 def나 다음 class는 지우지 않습니다.' if old else f'`class {cls}`의 마지막 메서드 아래, 다음 class 직전에 **새 메서드로 추가**합니다.'
        return how+' def 앞4칸, 본문 앞8칸을 유지합니다.\n\n'+block(new)
    if key == 'classes':
        full = source({'intro':'','classes':new,'setup':'','loop':''}).strip()
        return '`clock = pygame.time.Clock()` 바로 아래, `running = True` 바로 위에 아래 설계도를 **추가**합니다.\n\n'+block(full)
    where = {'intro':'파일 맨 위부터 `clock = pygame.time.Clock()`까지의 준비 코드(첫 단원은 빈 파일 전체)',
      'setup':'다섯 클래스가 끝난 뒤부터 `running = True` 직전까지의 그룹·객체 준비 구간',
      'loop':'`running = True`부터 파일 마지막 `pygame.quit()`까지의 메인 루프 전체'}[key]
    if key == 'intro' and old and 'clock' not in old:
        where='파일 맨 위의 기존 준비 코드 전체(이전 print 두 줄 포함)'
    return f'{where}를 **{"교체" if old else "추가"}**합니다. 아래 코드를 다른 함수나 클래스 안에 넣지 않습니다.\n\n'+block(new)

RULES = '''우주 방어대는 아래쪽의 탐사선으로 적 편대를 막는 게임입니다. 방향키 ←/→로 이동하고 Space를 한 번 누를 때 한 발을 쏩니다. 아군 탄환은 동시에2발, 적 탄환은 전체3발까지입니다. 한 라운드는11열×5행55기이고, 적 한 기당100점, 전멸 보너스는1000×현재 라운드입니다. 기체는5개로 시작합니다. 피격 또는 방어선 침범은 생명1 감소이며0 이하일 때 최종점수를 보여줍니다. 편대는 벽에서 반전하고10×라운드 픽셀 내려옵니다. 화면은1200×700이며 붉은 방어선의 y좌표는600입니다. Enter는 시작/재개, 게임오버에서는 새 게임입니다.

파이썬 → **게임 스튜디오** → **내 프로젝트** → **우주 방어대 수업 준비**를 누릅니다. 빈 main.py, assets의 이미지2개·OGG 소리6개·DoHyeon-Regular.ttf, asset_credits.py가 있는지 확인합니다. 수업 준비는 새 프로젝트를 만들므로 매 단원 다시 누르지 않습니다. 같은 프로젝트의 main.py를 계속 고칩니다.

[빈 시작 프로젝트 백업](/space-invaders/space-invaders-starter.mspygame.json)은 내 프로젝트 → 백업 파일 복원으로 열 수 있습니다. [시작 ZIP](/space-invaders/space-invaders-starter.zip)은 압축을 푼 후 프로젝트 가져오기로 폴더를 선택합니다. 스튜디오 상단 프로젝트 다운로드 버튼은 .mspygame.json 백업을 저장합니다. 자동 저장은 같은 기기·브라우저의 초안 저장이므로 수업 후 백업도 보관합니다.

[에셋 출처와 이용 안내](/space-invaders/ASSETS.md), [폰트 라이선스](/space-invaders/OFL-DoHyeon.txt)를 함께 제공합니다. 그림·소리는 새로 제작했고, 한글 폰트는 라이선스와 함께 제공하는 도현체입니다.
'''

for sub in ['data-log','checkpoints','experiments']: (OUT/sub).mkdir(exist_ok=True)
manifest={'title':'우주 방어대 - Space Invaders','version':3,'regionId':'reg_python_game_project','units':[],'steps':[]}
for n,title in enumerate(TITLES,1):
    unit_steps=[s for s in STEPS if s['id'].startswith(f'{n:02}-')]
    intro=RULES if n==1 else f'이전 단원의 마지막 main.py에서 이어갑니다. 이번 단원은 **{title}**입니다. 에셋 경로와 프로젝트를 유지하고, 아래 순서대로 작은 기능을 추가합니다.'
    md=f'# Data Log {n:02} - {title}\n\n원강의 {n+50}강의 제작 순서에 대응합니다. [강의 위치](https://www.udemy.com/course/the-art-of-doing-video-game-creation-with-python-and-pygame/learn/lecture/{LECTURES[n-1]})는 순서 참고용이며 이 문서만으로 실습합니다.\n\n'+intro
    md+='\n\n[게임 스튜디오 열기](/python-game-studio) · 내 프로젝트 → 우주 방어대 단계 비교·수업 자료에서 누적 코드나 임시 시험을 별도 프로젝트로 열 수 있습니다.\n\n## 입력과 실행 약속\n\n각 단계에서 먼저 정지를 누르고 main.py를 수정합니다. 여러 편집이 있으면 전부 마친 후 실행합니다. 실행 후 게임 화면을 클릭해야 키 입력이 게임에 전달됩니다. 코드는 왼쪽 공백까지 입력하며, 잘 모르겠는 이름은 바로 아래 설명에서 확인합니다. 단계 파일은 직접 작성한 코드와 비교·복구할 때 사용합니다.\n'
    md += '\n' + COMMENT_GUIDE + '\n'
    for s in unit_steps:
        md+=f"\n## {s['id']} - {s['title']}\n\n{s['reason']}\n\n"
        md += continuity(s) + prediction('space-invaders', s) + '### main.py 수정 위치와 입력 코드\n\n'
        if not s['edits']:md+='정식 코드는 이전 단계 그대로입니다. 아래 임시 시험으로 연결된 동작을 확인합니다.\n'
        for i,e in enumerate(s['edits'],1):md+=f'**편집 {i}.** '+edit_text(e)+'\n\n'
        md+='### 코드가 하는 일\n\n'+s['explanation']+'\n\n### 여기서 실행하세요\n\n정지 → 위 코드 수정 → 실행 → 게임 화면 클릭 순서로 진행합니다.\n\n'+s['observation']+'\n\n**이 시점의 정상 상태:** '+s['normal']+'\n\n**예상과 다를 때:** '+s['diagnosis']+'\n'
        if s['experiment']:
            e=s['experiment'];md+='\n### 잠깐 바꿔 보고 원래 상태로 복원하기\n\n정지한 뒤 `running = True` 바로 위에 다음 시험 코드만 추가합니다. 들여쓰기 없이 시작하며 for 본문만4칸입니다. 클래스/메서드 안에 넣지 않습니다.\n\n'+block(e['code'])+'\n\n실행하고 화면을 클릭합니다. '+e['observation']+'\n\n**복원:** 정지 → 방금 추가한 시험 블록 전체 삭제 → 다시 실행합니다. 이 시험 블록은 다음 단계의 정식 코드에 포함하지 않습니다.\n'
            experiment_source=annotate(s['source']).replace('running = True',e['code']+'\n\nrunning = True',1)
            (OUT/'experiments'/f"{s['id']}.py").write_text(experiment_source)
        md+=f"\n[이 단계 누적 코드 {s['id']}.py](/space-invaders/checkpoints/{s['id']}.py)와 비교할 수 있습니다.\n"
        (OUT/'checkpoints'/f"{s['id']}.py").write_text(annotate(s['source']))
        manifest['steps'].append({k:v for k,v in s.items() if k not in ['source','edits']})
    md+='\n## 제작 후 복습\n\n- [ ] 각 실행 지점의 화면·숫자·조작을 직접 확인했습니다.\n- [ ] 임시 시험 코드를 제거하고 프로젝트 백업을 저장했습니다.\n- [ ] Code Trace에서 이 단원의 핵심 패턴을 다시 입력합니다.\n- [ ] Field Test 10문항으로 결과 예측과 오류 원인을 확인합니다.\n- [ ] Quiz Battle의 출제 범위에서 **현재 유닛만**을 선택해 이 단원의 10문항으로 복습합니다. 기본값인 이전 과정 전체를 선택하면 다른 게임 프로젝트의 앞선 과정도 포함됩니다.\n'
    if n==10:md+='\n[전체 수업 자료 ZIP](/space-invaders/space-invaders-course.zip)과 [완성 게임 백업](/space-invaders/space-invaders-final.mspygame.json)은 비교·복구용입니다. 처음부터 완성본을 열기보다 직접 만든 main.py를 먼저 백업하세요.\n'
    (OUT/'data-log'/f'{n:02}.md').write_text(preserve_live_edits('space-invaders', n, md))
    manifest['units'].append({'unitKey':f'si{n:02}','title':title,'lectureId':LECTURES[n-1],'steps':[s['id'] for s in unit_steps]})
(OUT/'checkpoints/final-main.py').write_text(annotate(STEPS[-1]['source']))
manifest['totalSteps']=len(STEPS)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(OUT/'edits.json').write_text(json.dumps({'initial':{'intro':'','classes':{},'setup':'','loop':''},'steps':[{k:s[k] for k in ['id','previous','edits']} for s in STEPS]},ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(STEPS)} cumulative steps, {len(TITLES)} Data Logs, {sum(bool(s["experiment"]) for s in STEPS)} reproducible experiments.')
