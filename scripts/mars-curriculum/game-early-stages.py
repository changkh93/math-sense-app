from engine import *

GH = GAME[:GAME.index('# 같은 그림')].strip()
HELP = GAME[GAME.index('# 같은 그림'):GAME.index('class Expedition:')].strip()
GS = GAME[GAME.index('all_tiles = pygame.sprite.Group()'):GAME.index('# 0 빈칸')].strip()
GM = GAME[GAME.index('# 0 빈칸'):GAME.index('for row, cells in enumerate(level_map):')].strip()
GR = GAME[GAME.index('for row, cells in enumerate(level_map):'):GAME.index('background = load_image')].strip()
GB = "background = load_image('assets/background.png', (SCREEN_WIDTH, SCREEN_HEIGHT))"
MISSION = 'mission = Expedition(explorer, robots, platforms, gates, pulses, crystals)'
TITLE = "mission.pause_game('화성 탐사대: 신호 복구', 'Enter - 시작 / 방향키 - 이동 / Space - 점프 / 위쪽키 - 펄스', 'title')"
FINAL_LOOP = GAME[GAME.index('running = True'):].strip()

def plain_loop(updates='', draws='', events=''):
    return '''running = True
while running:
    seconds = min(clock.tick(FPS) / 1000, 0.05)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
''' + (textwrap.indent(events, '        ')+'\n' if events else '') + '''    if not running:
        break
''' + (textwrap.indent(updates,'    ')+'\n' if updates else '') + '''    screen.blit(background, (0, 0))
''' + (textwrap.indent(draws,'    ')+'\n' if draws else '') + '''    pygame.display.update()

pygame.quit()'''

def setup_with(reader='', mission=False, title=False):
    return GS+'\n\n'+GM+'\n\n'+reader+'\n\n'+GB+ ('\n'+MISSION if mission else '')+ ('\n'+TITLE if title else '')

add(11,'1280×736 게임 창 열기','기초 실험과 에셋 점검을 마쳤으므로 본 게임 main.py의 골격을 새로 시작합니다.',
    [part('header',GH),part('helpers',''),part('classes',{}),part('setup',''),part('loop',BASIC.replace('screen.fill((9, 17, 37))','screen.fill((9, 17, 37))'))],
    '파일 전체를 먼저 비운 뒤 이번 단계의 준비 구간과 실행 루프만 입력해도 같습니다. 가로1280=40칸×32, 세로736=23칸×32입니다. clock.tick은 초당 최대60회로 제한합니다. pygame.QUIT 뒤 break가 있어 창을 닫은 후 그림을 그리지 않습니다. 숫자 지도는 다음 단원에서 만듭니다.',
    '실행하면 기초 실험보다 넓은 어두운 창이 나타납니다. 정지한 뒤 다시 실행해 창이 정상적으로 열리는지 확인하세요.',
    '아직 배경·지형·탐사원은 없습니다.',
    '640×360 점검 창이 남아 있으면 이전 에셋 확인 코드를 제거하고 SCREEN_WIDTH, SCREEN_HEIGHT를 확인합니다.')
add(11,'배경을 맞추고 두 설계도 선언하기','배경을 화면 크기로 맞춘 다음 게임 관리자와 타일의 이름을 먼저 정합니다.',
    [part('helpers',HELP),part('classes',skeleton(['Expedition','Terrain'])),part('setup',GB),part('loop',plain_loop())],
    'load_image는 경로와 크기를 묶어 캐시에 저장합니다. 같은 타일을200개 만들어도 파일을200번 읽지 않습니다. smoothscale은 원본과 창의 크기가 달라도 정확히 맞춥니다. Expedition은 규칙과 HUD, Terrain은 지형 한 칸을 맡습니다. pass는 나중에 채울 자리입니다. 아직 생성하지 않았으므로 빈 메서드가 실행 결과에 영향을 주지 않습니다.',
    '화성 배경이 화면 전체를 채우는지 확인합니다. 오른쪽과 아래쪽에 빈 띠가 없어야 합니다. 클래스 코드를 추가해도 화면은 그대로입니다.',
    '클래스 선언만으로 지형이 나타나지 않는 것이 정상입니다.',
    '배경이 없으면 setup에서 background를 만들었는지, 루프에서 blit했는지 확인합니다.')
add(12,'여섯 객체의 역할과 빈 메서드','규칙을 한 클래스에 몰아넣지 않고 화면 속 객체별 설계도를 먼저 준비합니다.',
    [part('classes',skeleton(['Expedition','Terrain','Explorer','Pulse','Robot','SignalSource','Crystal','Gate']))],
    'Explorer는 입력·이동·행동, Pulse는 직선 발사체, Robot은 이동·피격·재부팅, SignalSource는 중앙 장치, Crystal은 떨어지는 회수물, Gate는 같은 색 이동문입니다. __init__은 생성할 때 한 번, update는 그룹을 갱신할 때 호출됩니다. 메서드 매개변수는 앞으로 필요한 연결을 보여줍니다. 아직 객체를 만들지 않으므로 pass 상태를 유지합니다.',
    '실행 화면이 이전과 같아야 합니다. 코드에서 클래스8개와 각 역할을 찾아 소리 내어 설명해 보세요. Pulse와 Crystal의 update는 같은 이름이어도 각 객체에 속한 별개 동작입니다.',
    '탐사원과 로봇이 아직 보이지 않습니다. 이번 단원은 설계도만 작성합니다.',
    '클래스 아래 def는4칸, pass는8칸입니다. 클래스끼리 들여쓰기를 이어 붙이지 않습니다.')
add(13,'그룹과40×23 숫자 지도','그릴 대상과 충돌할 대상을 별도 그룹으로 관리하고 기지의 발판 배치를 숫자로 만듭니다.',
    [part('setup',setup_with())],
    'all_tiles는 그릴 지형, platforms는 밟을 지형입니다. 나머지 그룹은 각 객체 종류를 담습니다. [[0 for column in range(40)] for row in range(23)]은 서로 다른 행23개를 만듭니다. [0]*40을23번 같은 객체로 복제하는 실수를 피합니다. 지도는 [행][열] 순서입니다. spans의 끝값은 포함하지 않으므로(0,15)는0~14열입니다. 3은왼쪽 끝,4는중간,5는오른쪽 끝 그림입니다.6~9는 객체가 나중에 놓일 자리만 표시합니다.',
    '실행해도 배경만 보입니다. 정지하고 row21의40개 값이2인지, row22가1인지 확인합니다. row3의 가운데15~24열은 비어 있어야 합니다.',
    '지도는 데이터일 뿐입니다. 읽어서 객체를 만드는 코드를 아직 넣지 않아 발판이 보이지 않습니다.',
    '한 줄 수정이 모든 행에 반복되면 행 리스트를 공유했는지 확인합니다. 크기는23행40열입니다.')
reader_tiles = GR[:GR.index('        elif kind == 6:')]+'''        elif kind in (6, 7, 8, 9):
            pass'''
add(14,'지도를 읽는 두 겹 반복문','행과 열을 화면 좌표로 바꾸고1~5를 타일 생성자로 전달합니다.',
    [part('setup',setup_with(reader_tiles))],
    'enumerate는 번호와 내용을 함께 줍니다. 바깥 반복은row, 안쪽 반복은column입니다. x=column*32, y=row*32로 왼쪽 위 좌표를 계산합니다. 흙1은그리기 그룹만,2~5는그리기와발판 그룹 양쪽에 등록할 예정입니다. 아직 Terrain 생성자에 pass만 있어 호출해도 그림이 만들어지지 않습니다.',
    '실행하면 오류 없이 배경만 유지됩니다. 첫 바닥 타일(21행0열)의좌표가(0,672)인지 계산해 보세요.',
    '읽기 코드가 있어도 빈 생성자는 아무 일도 하지 않습니다.',
    'x와y를 바꾸면 다음 단계에서 지도가90도 돌아간 듯 보입니다. 열은x,행은y입니다.')
terrain_plain=GAME_METHODS['Terrain']['__init__'].replace('\n        self.mask = pygame.mask.from_surface(self.image)','')
add(14,'타일 생성자를 채워 지형 표시','타일 하나의 그림과 위치, 그룹 등록을 완성하고 그리기를 연결합니다.',
    [method('Terrain.__init__',terrain_plain),part('loop',plain_loop(draws='all_tiles.draw(screen)'))],
    'super().__init__(all_tiles)는 객체를 그리기 그룹에 등록합니다. image와rect는 Group.draw가 요구하는 약속입니다. platforms가 전달되었을 때만 그 그룹에도 추가합니다. 같은 객체가 여러 그룹에 들어가도 그림 파일을 복사하는 것은 아닙니다. 흙 아래쪽58픽셀은 나중에 HUD가 덮습니다.',
    '좌우의 높은 발판, 가운데 발판, 아래쪽 바닥이 나타나는지 확인합니다. 캐릭터가 설 공간과 떨어질 통로를 눈으로 따라가 보세요.',
    '6~9의 신호원·게이트·탐사원은 아직 나타나지 않습니다.',
    '타일이 원점에 모이면 get_rect(topleft=(x,y))를 확인합니다. 그룹에 들어가지 않으면 draw에 나타나지 않습니다.')
reader_source=reader_tiles.replace('        elif kind in (6, 7, 8, 9):\n            pass', '''        elif kind == 6:
            SignalSource(x, y, all_tiles)
        elif kind in (7, 8, 9):
            pass''')
add(15,'신호원의 첫 프레임 표시','중앙 장치의 생성자를 채우고 지도6에 배치합니다.',
    [method('SignalSource.__init__'),part('setup',setup_with(reader_source))],
    '64×64 그림 네 장을 읽고 첫 장을 image로 정합니다. midbottom은 발 기준 위치라 타일의 왼쪽 위 기준과 다릅니다. 지도6의(x,y)를 장치 아래 중앙으로 씁니다. 이 장치는 회전하는 시각적 표시이며 떨어지는 회수물 Crystal과는 별개입니다.',
    '화면 위쪽 가운데에 큰 신호 결정 하나가 나타납니다. 몇 초 기다려도 아직 같은 자세인지 확인합니다.',
    'update가 연결되지 않아 정지한 그림인 것이 정상입니다.',
    '그림이 없으면 지도6의분기와 super().__init__(all_tiles)를 확인합니다.')
add(15,'신호원을 회전시키기','프레임 순환 메서드와 그룹 update를 연결합니다.',
    [method('SignalSource.animate'),method('SignalSource.update'),part('loop',plain_loop('all_tiles.update(seconds)','all_tiles.draw(screen)'))],
    'seconds*6만큼 번호를 늘려 초당6프레임을 재생합니다. int는 표시할 한 장을 고르고 나머지 연산은 네 장 끝에서 처음으로 돌아갑니다. Group.update(seconds)는 각 객체의 update에 같은 seconds를 전달합니다. 정적인 타일은 기본 Sprite.update가 아무 일도 하지 않습니다.',
    '장치의 빛과 방향이 반복해서 변하는지10초 관찰합니다. 마지막 프레임까지 보이고 계속 반복되어야 합니다.',
    '아직 회수 가능한 작은 결정은 생성하지 않습니다.',
    '계속 첫 장이면 frame을 update 안에서0으로 초기화하지 않았는지 확인합니다.')
reader_gate=reader_source.replace('        elif kind in (7, 8, 9):\n            pass', '''        elif kind in (7, 8):
            Gate(x + TILE_SIZE // 2, y + TILE_SIZE, 'teal' if kind == 7 else 'violet', gates)
        elif kind == 9:
            pass''')
add(16,'두 색의 게이트를 모서리에 배치','같은 색끼리 연결될 네 문을 생성합니다.',
    [method('Gate.__init__'),part('setup',setup_with(reader_gate)),part('loop',plain_loop('all_tiles.update(seconds)','all_tiles.draw(screen)\ngates.draw(screen)'))],
    '7은teal,8은violet입니다. random.randrange로 시작 프레임을 달리하여 네 문이 완전히 같은 순간에 깜박이지 않게 합니다. x에16을 더해 타일 중앙에 두고 y에32를 더해 발 기준을 맞춥니다. 그림은72픽셀이므로 작은 타일보다 넓습니다.',
    '왼쪽 위와 오른쪽 아래가같은색,오른쪽 위와왼쪽 아래가같은색인지 확인합니다. 문이 화면 밖으로 잘리지 않아야 합니다.',
    '이동 기능은20단원에서 탐사원 충돌과 함께 붙입니다.',
    '색이 세 개 대 하나면 지도2행과20행의7,8배치를 확인합니다.')
add(16,'게이트 애니메이션 연결','게이트 그룹도 매 프레임 갱신하여 빛을 순환시킵니다.',
    [method('Gate.update'),method('Gate.animate'),part('loop',plain_loop('all_tiles.update(seconds)\ngates.update(seconds)','all_tiles.draw(screen)\ngates.draw(screen)'))],
    'gates.update와gates.draw는 각각시간변화와화면표시입니다. update만하면안보이고draw만하면정지합니다. 애니메이션 코드가 같아도 각 문은 자기 frame을 가지므로 독립적으로 움직입니다.',
    '문 네 개가 모두 빛나고 중앙 신호원도 계속 회전하는지 확인합니다.',
    '문은 아직 장식처럼 보이는 것이 정상입니다.',
    '한 문만 움직이면 그룹 전체가 아니라 마지막 gate변수만 update하지 않았는지 확인합니다.')
hud_init='''self.round_duration = 30
self.score = 0
self.round_number = 1
self.remaining = self.round_duration
self.elapsed = 0.0
self.title_font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 42)
self.hud_font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 23)'''
hud_draw=GAME_METHODS['Expedition']['draw'].split("        if self.state != 'playing':")[0].replace('{self.explorer.health}','{100}').rstrip()
hud_update='''self.elapsed += seconds
self.remaining = max(0, self.round_duration - int(self.elapsed + 1e-9))'''
hud_setup=setup_with(reader_gate)+'\nmission = Expedition(None, robots, platforms, gates, pulses, crystals)'
U='all_tiles.update(seconds)\ngates.update(seconds)'
D='all_tiles.draw(screen)\ngates.draw(screen)'
add(17,'HUD에 탐사 정보를 표시','게임 관리자 생성자에 시간·점수·폰트를 저장하고 아래쪽 정보판을 그립니다.',
    [body('Expedition.__init__',hud_init),method('Expedition.draw',hud_draw),part('setup',hud_setup),part('loop',plain_loop(U,D+'\nmission.draw()'))],
    'HUD는 점수0,에너지100,탐사1,남은시간30으로 시작합니다. 탐사원이 아직 없어서 에너지는 임시 숫자100입니다. render는 글자를 Surface로 바꾸고 get_rect의anchor로 왼쪽·오른쪽 끝을 정렬합니다. 제공 도현체를 명시하여 기기마다 한글 폰트가 달라지는 문제를 줄입니다.',
    '네 정보와 가운데 화성 탐사대 제목이 읽히는지 확인합니다. 에너지100과30초는 아직 고정 표시입니다.',
    '이번 편집에서는 시간이 줄지 않습니다.',
    '네모 글자는 assets/fonts/DoHyeon-Regular.ttf 경로를 확인합니다. SysFont로 바꾸지 마세요.')
add(17,'1초씩 줄어드는 탐사 시간','게임 관리자 update를 루프에 연결합니다.',
    [body('Expedition.update',hud_update),part('loop',plain_loop(U+'\nmission.update(seconds)',D+'\nmission.draw()'))],
    'elapsed에 초 단위 시간을 누적하고 int로 지난 정수초를 구합니다. max(0,...)는 음수 표시를 막습니다. 1e-9는1초 근처의 실수 오차 때문에30이 한 프레임 더 남는 것을 완화합니다. 프레임 번호를60으로 나누는 대신 실제 프레임 간격을 쓰지만 긴 멈춤은0.05초로 제한합니다.',
    '30→29→28로 약1초마다 감소하는지 보고30초 뒤0에서 멈추는지 확인합니다.',
    '0이 되어도 아직 다음 탐사로 넘어가지 않습니다.29단원에서 연결합니다.',
    '너무 빠르면 seconds가 밀리초인지 확인합니다. clock.tick 반환값은1000으로 나눕니다.')
explorer_init_plain=GAME_METHODS['Explorer']['__init__'].replace('\n        self.mask = pygame.mask.from_surface(self.image)','')
add(18,'탐사원의 물리값과 네 행동 프레임','생성자에 이동 설정과 달리기·대기·점프·발사 이미지를 준비합니다.',
    [method('Explorer.__init__',explorer_init_plain)],
    '가속도2,마찰0.15,중력0.8,점프속도18을 한곳에 모읍니다. 각 행동의 오른쪽4장과뒤집은왼쪽4장을(action,facing)키로 저장합니다. health는현재에너지,starting_health는회복상한입니다. position/velocity/acceleration은실수벡터,rect는표시용상자입니다. start는복귀기준이며현재위치와별개입니다. 세remaining값은연사·피해·게이트의재사용대기시간입니다. 메서드는 아직 빈칸이어도 이후에 사용할 값의 이름은 생성자에 먼저 정의합니다.',
    '실행 결과가 이전과같은지 확인합니다. 생성자는 완성했지만 지도9분기를 아직 비워두어 탐사원은 나타나지 않습니다. 코드에서 이미지·소리·벡터·그룹참조가 각각어디에저장되는지찾습니다.',
    '이번 강의가 생성자만 작성하는 순서이므로 탐사원을 미리 생성하지 않습니다.',
    '이미지 폴더는 explorer/run,idle,jump,fire입니다. 로봇의walk와혼동하지마세요.')
add(19,'지도9에 탐사원 생성','작성해 둔 생성자를 처음 호출하고 그리기 그룹에 등록합니다.',
    [part('setup',setup_with(GR)+'\nmission = Expedition(None, robots, platforms, gates, pulses, crystals)'),part('loop',plain_loop(U+'\nexplorers.update(seconds)\nmission.update(seconds)',D+'\nexplorers.draw(screen)\nmission.draw()'))],
    'Explorer(x,y+32,...)로 발을 지도 칸 아래쪽에 놓습니다.64픽셀 그림의왼쪽위에x,y를넣는것과다릅니다. explorers.add가그리기대상에등록합니다. 객체를만드는것과그룹에넣는것은별개입니다. 생성자의super에그룹을주지않았으므로명시적으로추가합니다.',
    '가운데 작은 발판 위에 탐사원이 나타나는지 확인합니다. 좌우키를 눌러도 아직 가만히 있습니다.',
    'update가 pass라 입력과 중력이 아직 적용되지 않습니다.',
    '발이32픽셀위에뜨면 y+TILE_SIZE를빠뜨렸는지확인합니다.')
add(19,'이동 메서드를 연결해 낙하 시험','update가이동·충돌·애니메이션을호출하게하고,먼저이동만채웁니다.',
    [method('Explorer.update'),method('Explorer.move')],
    '이전위치를먼저복사한뒤입력가속도와마찰을계산합니다. 위치에는이전속도와가속도의절반을더하고그다음속도를갱신합니다. move에서위치와rect를맞춥니다. 충돌메서드는아직pass여서발판을통과합니다. 아래시험은강의의중력0시험에대응합니다. 반드시복원합니다.',
    '실행하면탐사원이발판을통과해떨어집니다. 정지한뒤아래시험을추가하면좌우이동만확인할수있습니다.',
    '중력0시험전에는빠르게화면밖으로사라져도정상입니다.',
    '키를놓아도계속가속하면매프레임acceleration을새로만드는지확인합니다.',
    {'code':'explorer.gravity = 0','observe':'탐사원이떨어지지않고좌우가속과마찰만보입니다. 시험줄을삭제하면중력0.8로복원됩니다.'})
collision_base=GAME_METHODS['Explorer']['check_collisions'].split('        for gate in self.gates:')[0].rstrip()
add(20,'바닥 착지와 천장 충돌','낙하는발로,상승은머리로이전위치와현재위치를비교합니다.',
    [method('Explorer.check_collisions',collision_base),method('Explorer.jump'),part('loop',plain_loop(U+'\nexplorers.update(seconds)\nmission.update(seconds)',D+'\nexplorers.draw(screen)\nmission.draw()',"elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:\n    explorer.jump()"))],
    '낙하중에는발판윗면에발을맞추고상승중에는천장아랫면에머리를맞춥니다. 속도0과위치·rect를동시에갱신합니다. 발중심좌우12픽셀을지지폭으로써그림여백이착지를방해하지않게합니다. 원강의의겹침이풀릴때까지1픽셀씩옮기는while대신통과한면으로한번에맞춰브라우저가멈추는경우를피합니다.',
    '착지후Space로점프합니다. 위발판아래에서뛰어머리를부딪히면더올라가지않고다시떨어집니다. 공중에서Space를다시눌러도추가점프하지않아야합니다.',
    '탐사원그림은아직첫대기자세입니다.',
    '천장을통과하면velocity.y<0조건과previous_rect.top비교를확인합니다.')
add(20,'같은 색 게이트로 이동','게이트충돌과화면아래복귀를추가하고위치초기화메서드를준비합니다.',
    [method('Explorer.check_collisions'),method('Explorer.reset',GAME_METHODS['Explorer']['reset'].replace('\n        self.mask = pygame.mask.from_surface(self.image)',''))],
    '같은channel이면서자기자신이아닌문을찾습니다. 도착문의안쪽80픽셀로나와즉시반대이동하지않게하고0.4초잠금을둡니다. 좌표와rect를동기화하지않으면화면은이동했어도충돌은원래곳에서일어납니다. reset은지금화면아래복귀용이며30단원에서새게임에도재사용합니다.',
    '각모서리문에들어가대각선같은색문으로나오는지시험합니다. 도착직후다시튕겨돌아가지않아야합니다. 좌우화면연결도계속작동합니다.',
    '게이트는탐사원에게만적용됩니다. 로봇과결정에는각각나중에연결합니다.',
    '무한왕복하면도착위치80픽셀과portal_remaining을확인합니다. 같은색문은정확히두개여야합니다.')
