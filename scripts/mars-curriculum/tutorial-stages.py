from engine import *

HEADER = TUTORIAL.split('image_cache =')[0].strip()
HELPERS = TUTORIAL[TUTORIAL.index('image_cache ='):TUTORIAL.index('class Terrain')].strip()
GROUPS = TUTORIAL[TUTORIAL.index('tiles = pygame.sprite.Group()'):TUTORIAL.index('level_map =')].strip()
MAP = TUTORIAL[TUTORIAL.index('level_map ='):TUTORIAL.index('for row, cells')].strip()
MAP_NO_PLAYER = MAP[:MAP.index('level_map[5][8]')].strip()
READER = TUTORIAL[TUTORIAL.index('for row, cells'):TUTORIAL.index("background =")].strip()
READER_NO_PLAYER = READER[:READER.index('        elif kind == 9:')].strip()
BG = "background = load_image('assets/background.png', (SCREEN_WIDTH, SCREEN_HEIGHT))"
BASIC = '''running = True
while running:
    seconds = min(clock.tick(FPS) / 1000, 0.05)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    if not running:
        break
    screen.fill((15, 25, 42))
    pygame.display.update()

pygame.quit()'''
DRAW_TILES = BASIC.replace('    pygame.display.update()', '    tiles.draw(screen)\n    pygame.display.update()')
DRAW_BG = DRAW_TILES.replace('    screen.fill((15, 25, 42))', '    screen.blit(background, (0, 0))')
DRAW_PLAYER = DRAW_BG.replace('    screen.blit', '    explorers.update(seconds)\n    screen.blit').replace('    pygame.display.update()', '    explorers.draw(screen)\n    pygame.display.update()')
JUMP_LOOP = DRAW_PLAYER.replace('            running = False', '''            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            explorer.jump()''')

add(1,'화면을 먼저 열기','지도를 입력하기 전에 실행과 정지가 되는 빈 화면을 만듭니다.',
    [part('header',HEADER.replace('Vector = pygame.math.Vector2\n','')),part('loop',BASIC)],
    'set_mode는 (가로, 세로) 튜플을 받습니다. 왼쪽 위가 (0,0)이고 아래로 y가 증가합니다. QUIT은 종료 요청이며 running=False 뒤 break로 더 그리지 않습니다. tick(60)은 최대60FPS로 제한하고 경과 밀리초를 반환합니다. 1000으로 나눈 seconds는 초 단위이며 지금은 보관만 합니다. min(...,0.05)는 탭 전환 뒤 한 프레임의 시간이 지나치게 커지는 것을 막습니다.',
    '실행하면 960×640의 남색 화면이 유지됩니다. 스튜디오 정지 버튼으로 종료한 뒤 다시 실행해 보세요.',
    '탐사원, 발판, 배경 그림, 소리가 없어도 정상입니다.',
    'while 안에는 4칸, for 안에는 8칸, if 본문에는 12칸입니다. pygame.quit()을 while 안으로 들여쓰지 않습니다.')
add(1,'20행 30열의 빈 지도','960÷32=30, 640÷32=20입니다. 가로 개수와 세로 개수를 구별합니다.',
    [part('setup','level_map = [[0 for column in range(30)] for row in range(20)]')],
    '바깥 리스트의 원소 하나가 한 행입니다. 안쪽 range(30)은 열30개, 바깥 range(20)은 서로 다른 행20개를 만듭니다. 0은 빈칸이라는 약속입니다. [[0]*30]*20은 같은 행을20번 참조하므로 한 칸 변경이 여러 행에 번질 수 있어 쓰지 않습니다.',
    '실행 화면이 그대로인지 확인합니다. 아직 숫자를 그림으로 바꾸는 코드가 없습니다.',
    '변수가 만들어져도 자동으로 화면에 그려지지는 않습니다.',
    '대괄호 두 겹과 for 순서를 확인합니다. 행20개 안에 각 열30개가 있어야 합니다.')
add(1,'흙과 발판, 위험 구역 배치','아래 두 줄을 땅으로 채우고 높이가 다른 세 발판을 만듭니다.',
    [part('setup',MAP_NO_PLAYER)],
    '1은 흙,2~5는 발판,6은 지열 위험 구역입니다. [2]*10은2를10번 반복합니다. [4:12]는4~11열, 총8칸입니다. 왼쪽 끝3, 가운데4, 오른쪽 끝5를 넣습니다. [19]는20번째 행입니다. 기초 실험에서 위험 구역을 넣어 복귀 동작을 배우고, 본 게임에서는 바닥을 모두 연결합니다.',
    '실행 화면은 여전히 남색입니다. 숫자를 읽어 만든 타일은 다음 단원에서 나타납니다.',
    '지도 입력이 끝나도 그림이 없는 것이 이번 단원의 정확한 완료 상태입니다.',
    '슬라이스에 넣는 원소 수가 범위와 다르면 행 길이가 달라집니다. [3]+[4]*6+[5]는8개인지 계산하세요.')

tile_init = TUTORIAL_METHODS['Terrain']['__init__'].replace('        self.mask = pygame.mask.from_surface(self.image)\n','')
add(2,'그룹과 타일을 연결하기','그릴 타일 전체와 충돌할 발판·위험 구역을 서로 다른 그룹으로 준비합니다.',
    [part('helpers',HELPERS),part('classes',{'Terrain':{'__init__':tile_init}}),part('setup',GROUPS+'\n'+MAP_NO_PLAYER+'\n\n'+READER_NO_PLAYER),part('loop',DRAW_TILES)],
    'load_image는 경로와 크기를 키로 삼아 첫 요청에만 그림을 읽습니다. 같은 타일을 수백 번 읽는 일을 피합니다. convert_alpha는 투명도를 유지하고 smoothscale은32×32로 맞춥니다. Terrain의 super().__init__(tiles)는 현재 객체를 전체 그룹에 넣습니다. subgroup이 전달되면 발판 또는 위험 그룹에도 같은 객체를 넣습니다. 행(row)은 y, 열(column)은 x에 곱합니다. enumerate는 순번과 값을 함께 제공합니다.',
    '남색 배경 위에 금속 발판과 붉은 흙, 가운데 주황색 지열 구역이 나타납니다. 높은 세 발판의 위치도 지도와 비교하세요.',
    '탐사원과 움직임은 아직 없습니다.',
    '파일 경로는 assets/tiles/1.png처럼 소문자입니다. 전부 입력한 후 실행하세요. image나 rect가 없다는 오류라면 생성자 두 속성을 확인합니다.')
add(2,'화성 배경을 마지막에 붙이기','타일 배치가 맞는지 확인한 뒤 배경을 교체합니다.',
    [part('setup',MODEL['setup']+'\n\n'+BG),part('loop',DRAW_BG)],
    '배경은 반복문 밖에서 한 번 로드합니다. 매 프레임 배경→타일 순서로 그려야 발판이 보입니다. 배경을 마지막에 그리면 타일을 덮습니다. 화면 크기960×640에 맞춰 축소하므로 원본 이미지 해상도와 달라도 빈틈이 없습니다.',
    '화성 하늘과 절벽 앞에 이전과 같은 위치의 발판이 나타납니다.',
    '배경 그림은 충돌 대상이 아닙니다. 그림 속 절벽에 설 수는 없습니다.',
    '타일이 사라졌다면 blit(background)가 tiles.draw보다 먼저인지 확인합니다.')

initial = '''    def __init__(self, x, y, platforms, hazards):
        super().__init__()
        self.image = load_image('assets/explorer/idle/0.png', (64, 64))
        self.rect = self.image.get_rect(midbottom=(x, y))'''
classes=copy.deepcopy(MODEL['classes']);classes['Explorer']={'__init__':initial,'update':'    def update(self, seconds=1 / FPS):\n        pass'}
spawn_map=MAP_NO_PLAYER+'\nlevel_map[17][8] = 9'
add(3,'지도에서 탐사원을 생성하기','클래스 선언과 실제 객체 생성을 구분합니다. 발의 가운데를 위치 기준으로 삼습니다.',
    [part('classes',classes),part('setup',GROUPS+'\n'+spawn_map+'\n\n'+READER.replace('y + TILE_SIZE','y')+'\n\n'+BG),part('loop',DRAW_PLAYER)],
    '탐사원은64×64, 타일은32×32입니다. midbottom=(x,y)는 발의 가운데가(x,y)에 오게 합니다. 숫자9를 읽었을 때 Explorer를 만들고 explorers에 추가합니다. 그룹 update와 draw가 이제 이 객체를 방문합니다.',
    '왼쪽 아래 발판 위에 탐사원이 나타나지만 발판에서32픽셀 위에 떠 있습니다. 위치 기준 차이를 눈으로 확인하세요.',
    '아직 키를 눌러도 움직이지 않습니다. update는 pass입니다.',
    '탐사원이 없다면 지도9, 생성 분기, explorers.add, explorers.draw 네 곳을 순서대로 확인합니다.')
add(3,'발 위치와 벡터 세 개 준비','지도 칸의 윗변에서 아랫변으로 발 기준을 내린 다음 위치·속도·가속도를 보관합니다.',
    [part('header',HEADER),part('setup',MODEL['setup'].replace('Explorer(x, y, platforms','Explorer(x, y + TILE_SIZE, platforms')),method('Explorer.__init__',initial+'''
        self.position = Vector(x, y)
        self.velocity = Vector(0, 0)
        self.acceleration = Vector(0, 0)''')],
    'y+32가 지도 칸의 아랫변입니다. Vector는 pygame.math.Vector2의 짧은 이름입니다. position은 위치, velocity는 이동량, acceleration은 이동량의 변화입니다. 벡터의 x와 y를 따로 읽을 수도 있고 두 벡터를 더할 수도 있습니다. 저장만 했으므로 움직임은 아직 없습니다.',
    '탐사원이 바닥 발판 위에 놓입니다. 좌우키와 Space가 반응하지 않는지 확인하세요.',
    '이번 강의의 끝은 벡터 준비까지입니다. 이동은 다음 강의에서 연결합니다.',
    'Vector 이름 오류라면 파일 위 별칭을 확인합니다. rect와 position에 같은 기준좌표를 넣어야 합니다.')
add(4,'위치를 바로 바꾸는 이동 시험','부드러운 가속도 이동과 비교할 기준 동작을 먼저 만듭니다.',
    [body('Explorer.update','''keys = pygame.key.get_pressed()
if keys[pygame.K_LEFT]:
    self.rect.x -= 10
elif keys[pygame.K_RIGHT]:
    self.rect.x += 10''',tutorial=True)],
    'get_pressed는 현재 누르고 있는 키를 알려줍니다. rect.x를 바로 바꾸므로 누르자마자 일정 속도로 움직이고 놓는 즉시 멈춥니다. 아직 position 벡터는 사용하지 않습니다.',
    '게임 화면을 클릭하고 좌우키를 눌렀다가 놓습니다. 즉시 출발하고 즉시 정지하는 느낌을 기억하세요.',
    '화면 밖으로 나가도 아직 돌아오지 않습니다.',
    '키가 코드에 입력되면 에디터에 포커스가 있습니다. 게임 화면을 클릭하세요.')
vector_init=MODEL['classes']['Explorer']['__init__']+'''
        self.horizontal_acceleration = 2
        self.friction = 0.15'''
accel='''keys = pygame.key.get_pressed()
if keys[pygame.K_LEFT]:
    self.acceleration.x = -self.horizontal_acceleration
elif keys[pygame.K_RIGHT]:
    self.acceleration.x = self.horizontal_acceleration'''
add(4,'키 입력을 가속도로 바꾸기','위치를 바로 바꾸던 두 줄 대신 가속도를 설정합니다.',
    [method('Explorer.__init__',vector_init),body('Explorer.update',accel,tutorial=True)],
    '왼쪽은 음수, 오른쪽은 양수 가속도입니다. horizontal_acceleration=2는 기준60FPS에서 한 프레임마다 속도가2씩 변한다는 뜻입니다. 속도와 위치를 계산하는 줄이 아직 없어 가속도 값만 바뀝니다.',
    '좌우키를 눌러도 탐사원이 움직이지 않습니다. 직전 단계와 달라진 이유를 설명해 보세요.',
    '의도된 중간 단계입니다. 다음 단계에서 벡터를 위치에 반영합니다.',
    '여전히 움직인다면 rect.x를 직접 바꾸는 이전 줄이 남아 있는지 확인합니다.')
integration='''scale = min(seconds * FPS, 3)
self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
self.velocity += self.acceleration * scale
self.rect.midbottom = self.position'''
add(4,'속도와 위치에 가속도 반영','가속도→속도→위치의 관계를 실행으로 확인합니다.',
    [body('Explorer.update',accel+'\n'+integration,tutorial=True)],
    '위치에는 이전 속도×시간과 가속도×시간제곱의 절반을 더한 뒤 속도를 갱신합니다. 이미 갱신한 속도에 다시 가속도의 절반을 더하는 중복 계산을 피했습니다. seconds*FPS는 기준60FPS에 대한 시간 비율입니다. 60FPS라면 약1입니다. rect는 화면에 그릴 정수 위치, position은 소수 이동을 보존합니다.',
    '한 방향을 누르면 점점 빨라집니다. 키를 놓아도 계속 빨라져 화면 밖으로 갑니다. 정지하고 다시 실행해 시작 위치로 돌아오세요.',
    '아직 가속도 초기화와 마찰을 적용하지 않아 계속 가속됩니다.',
    '멈춰 있다면 position+=와 rect.midbottom 대입을 확인합니다. position+만 쓰면 계산 결과가 저장되지 않습니다.')
add(4,'마찰을 넣고 가속도를 매번 초기화','놓았을 때 방향이 뒤집히거나 계속 가속되는 문제를 해결합니다.',
    [body('Explorer.update','self.acceleration = Vector(0, 0)\n'+accel+'\nself.acceleration.x -= self.velocity.x * self.friction\n'+integration,tutorial=True)],
    '매 프레임 가속도를0으로 시작하고, 입력에 따른 가속도를 정한 다음 속도에 비례한 저항을 뺍니다. 속도가 양수이면 저항은 음수입니다. 키를 놓으면 입력 가속도는0이고 마찰만 남아 속력이 작아집니다. 이전 프레임의 마찰을 다음 프레임에 계속 누적하지 않는 것이 핵심입니다.',
    '오른쪽으로 달리다 놓으면 조금 미끄러진 뒤 정지합니다. 왼쪽에서도 같은지 확인하세요.',
    '중력과 화면 연결은 아직 없습니다.',
    '방향이 오락가락하면 acceleration 초기화가 update 맨 앞에 있는지 확인합니다.')

# Later tutorial stages are loaded by the entry script in the same model.
