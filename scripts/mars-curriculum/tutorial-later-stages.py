from engine import *

# This file is executed in the namespace of tutorial-stages.py.
gravity_init = MODEL['classes']['Explorer']['__init__'] + '''
        self.gravity = 0.5
        self.platforms = platforms
        self.hazards = hazards
        self.start = Vector(x, y)
        self.previous_rect = self.rect.copy()
        self.grounded = False'''
move_body = 'self.previous_rect = self.rect.copy()\nself.acceleration = Vector(0, self.gravity)\n'+accel+'\nself.acceleration.x -= self.velocity.x * self.friction\n'+integration
add(5,'높은 곳에서 중력으로 떨어뜨리기','지도9를 높은 발판 위로 옮기고 y방향 가속도를 켭니다.',
    [method('Explorer.__init__',gravity_init),part('setup',GROUPS+'\n'+MAP+'\n\n'+READER+'\n\n'+BG),body('Explorer.update',move_body,tutorial=True)],
    '중력은 키를 누르지 않아도 작용하므로 acceleration의 y를 항상 gravity로 둡니다. 아래쪽이 양수여서 낙하하면 velocity.y가 증가합니다. 지도9는5행8열에 있고 발 기준 y=(5+1)*32=192입니다. 이전 위치 상자 previous_rect는 발판을 한 프레임 사이에 통과했는지 판단할 때 씁니다.',
    '탐사원이 위쪽에서 떨어지고 모든 발판을 통과합니다. 속도가 점점 빨라지는지 관찰한 뒤 정지하세요.',
    '충돌을 아직 연결하지 않았으므로 바닥을 통과해도 정상입니다.',
    '뜨거나 위로 올라가면 중력의 부호를 확인합니다. 수평키를 놓아도 y가속도는0이 되면 안 됩니다.')
landing = '''self.grounded = False
for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
    if self.rect.right <= tile.rect.left or self.rect.left >= tile.rect.right:
        continue
    if self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
        self.position.y = tile.rect.top
        self.velocity.y = 0
        self.rect.midbottom = self.position
        self.grounded = True
        break
if pygame.sprite.spritecollide(self, self.hazards, False):
    print('지열 위험 구역에 닿았습니다')'''
add(5,'발판 위에 착지시키기','발판의 윗변을 통과한 순간을 찾아 내려오는 속도를0으로 만듭니다.',
    [body('Explorer.update',move_body+'\n'+landing,tutorial=True)],
    '가로가 겹치지 않으면 continue로 건너뜁니다. 이전 발 높이와 현재 발 높이 사이에 tile.top이 있으면 착지입니다. position과 rect를 같은 프레임에 함께 고칩니다. 단순히 현재 겹침만 확인하면 빠른 낙하가 얇은 타일을 건너뛸 수 있습니다. sorted는 위쪽 발판부터 검사하고 break는 첫 착지 뒤 탐색을 끝냅니다. grounded는 발판에 서 있는지 기록합니다. 위험 구역은 지금 출력만 합니다.',
    '높은 발판에 착지합니다. 좌우로 벗어나 아래 발판으로 떨어져 보세요. 지열에 닿으면 콘솔 메시지가 나옵니다.',
    '아직 점프할 수 없고 위험 구역에서 시작점으로 돌아오지 않습니다.',
    '한 프레임씩 흔들리면 position만 바꾸고 rect를 그대로 두지 않았는지 확인합니다. 타일 전체가 아니라 platforms를 검사해야 합니다.',
    {'code':'explorer.gravity = 1.5','observe':'높은 발판에서 벗어나면 기본값보다 빠르게 낙하합니다. 시험 줄을 지운 뒤0.5의 낙하 느낌과 비교합니다.'})
add(6,'Space를 누르면 한 번 점프','누르는 동안이 아니라 누른 순간을 이벤트로 처리합니다.',
    [method('Explorer.__init__',gravity_init+'\n        self.jump_speed = 15'),body('Explorer.jump','''if self.grounded:
    self.velocity.y = -self.jump_speed
    self.grounded = False''',tutorial=True),part('loop',JUMP_LOOP),body('Explorer.update',move_body+'\n'+landing.replace('if self.previous_rect.bottom <=','if self.velocity.y >= 0 and self.previous_rect.bottom <='),tutorial=True)],
    'Space KEYDOWN이 jump를 한 번 호출합니다. grounded가 참일 때만 y속도를-15로 바꿉니다. 상승은 음수, 낙하는 양수이므로 착지 조건에 velocity.y>=0을 붙입니다. 점프와 동시에 grounded=False로 바꿔 공중에서 연속 점프하는 것을 막습니다. 기초 실험의 발판은 아래에서 통과해 위에서 착지하는 구조입니다.',
    '발판에서 Space를 누르면 위로 올라갔다가 내려옵니다. 공중에서 여러 번 눌러도 추가 점프는 없습니다. 다른 발판 아래에서 올라갈 때 윗면으로 순간 이동하지 않아야 합니다.',
    '머리를 부딪히는 천장 판정은 본 게임20에서 도입합니다.',
    '점프 직후 붙잡히면 착지 조건의 속도 부호를 확인합니다. 버튼을 길게 누르면 반복점프하는 코드를 get_pressed로 넣지 않았는지 확인하세요.')
wrap_move = move_body.replace('self.rect.midbottom = self.position','self.position.x %= SCREEN_WIDTH\nself.rect.midbottom = self.position')
restore_landing = landing.replace('if self.previous_rect.bottom <=','if self.velocity.y >= 0 and self.previous_rect.bottom <=').replace("    print('지열 위험 구역에 닿았습니다')",'''    self.position = self.start.copy()
    self.velocity = Vector(0, 0)
    self.rect.midbottom = self.position
    self.grounded = False''')
add(6,'화면 연결과 위험 구역 복귀','왼쪽과 오른쪽을 연결하고, 지열에 닿으면 시작 위치와 속도를 함께 되돌립니다.',
    [body('Explorer.update',wrap_move+'\n'+restore_landing,tutorial=True)],
    'x%960은 위치를0이상960미만으로 돌려놓습니다. -5%960은955입니다. self.start.copy()는 시작 벡터를 복사해 현재 위치로 쓰므로 이동해도 시작점이 바뀌지 않습니다. 속도도0으로 돌려놓지 않으면 복귀 직후 다시 날아갑니다.',
    '오른쪽 끝으로 달려 왼쪽에서 나오는지 확인합니다. 가운데 지열에 떨어지면 위쪽 시작 발판으로 돌아오고 멈추는지 확인합니다.',
    '화면 연결 중 몸이 양쪽 가장자리에서 잠깐 잘리는 것은 화면을 통과하는 과정입니다.',
    '복귀 위치가 계속 바뀌면 start와 position이 같은 벡터 객체가 아닌지 확인합니다. copy()가 필요합니다.')
add(6,'이동과 충돌을 메서드로 나누기','동작이 확인된 뒤에만 긴 update를 작은 역할로 분리합니다.',
    [body('Explorer.update','self.move(seconds)\nself.check_collisions()',tutorial=True),body('Explorer.move',wrap_move,tutorial=True),body('Explorer.check_collisions',restore_landing,tutorial=True)],
    'move에는 입력과 벡터 계산, check_collisions에는 착지와 복귀가 들어갑니다. update가 이 순서대로 호출합니다. 기능을 추가하는 단계가 아니라 이미 확인한 동작의 자리를 바꾸는 리팩터링입니다. 원래 update에 같은 코드가 남아 있으면 한 프레임에 두 번 이동하므로 제거해야 합니다.',
    '점프, 낙하, 화면 연결, 지열 복귀를 다시 시험합니다. 바로 이전 단계와 같은 결과여야 합니다.',
    '아직 이미지는 한 장이라 걷는 모션은 없습니다.',
    '속도가 두 배가 되면 이동 코드가 update와 move 양쪽에 남아 있는지 확인합니다.')

animated_init = TUTORIAL_METHODS['Explorer']['__init__'].replace('\n        self.mask = pygame.mask.from_surface(self.image)', '')
right_only_init = animated_init.replace("for action in ['run', 'idle']:","for action in ['run']:").replace("        self.action = 'idle'", "        self.action = 'run'").replace("self.frames[('idle', 1)][0]", "self.frames[('run', 1)][0]")
add(7,'달리기 프레임 준비와 첫 이미지','여러 프레임을 리스트에 넣고 첫 프레임을 현재 image로 선택합니다.',
    [method('Explorer.__init__',right_only_init)],
    '새 그림은 동작별0.png~3.png 네 프레임으로 제공됩니다. 원강의의8장 대신 네 장을 쓰지만 리스트와 순환 원리는 같습니다. 오른쪽 프레임을 읽고 flip(frame,True,False)로 왼쪽 프레임을 준비합니다. 같은 캐릭터라도 rect는 하나를 유지해 위치가 바뀌지 않습니다. 현재 프레임을 바꾸지 않으면 첫 그림만 보입니다.',
    '달리기 자세의 탐사원이 표시됩니다. 움직여도 아직 같은 자세인지 확인합니다.',
    '프레임을 로드한 것만으로 애니메이션이 시작되지는 않습니다.',
    '파일 이름은1부터가 아니라0부터입니다. range(4)는0,1,2,3을 만듭니다.')
animate_without_mask = TUTORIAL_METHODS['Explorer']['animate'].replace('\n        self.mask = pygame.mask.from_surface(self.image)','').rstrip()
add(7,'달리기 프레임을 순환시키기','소수 프레임 번호를 시간에 따라 늘려 네 장을 반복합니다.',
    [method('Explorer.animate',animate_without_mask),body('Explorer.update',"self.move(seconds)\nself.check_collisions()\nself.animate(self.frames[('run', 1)], seconds, 8)",tutorial=True)],
    'frame은 실수, 리스트에 넣는 int(frame)은 정수입니다. 초당8프레임이면 네 장을0.5초에 한 바퀴 돕니다. %len(frames)가 끝에서0으로 돌아오게 합니다. 모든 프레임이 같은 시간 동안 표시되며 마지막 프레임도 생략되지 않습니다.',
    '서 있어도 다리가 움직입니다. 이는 현재 항상 달리기 리스트를 재생하기 때문입니다.',
    '왼쪽 이동과 대기 자세는 다음 편집에서 선택합니다.',
    '리스트 인덱스 오류이면 int 변환과 나머지 연산을 확인합니다. 매번 frame=0을 쓰면 첫 자세에서 멈춥니다.')
move_with_facing = TUTORIAL_METHODS['Explorer']['move']
update_animation = TUTORIAL_METHODS['Explorer']['update']
add(7,'방향과 대기 상태를 구분하기','누른 키에 따라 달리기·대기 리스트를 고르고 마지막 방향을 기억합니다.',
    [method('Explorer.__init__',animated_init),method('Explorer.move',move_with_facing),method('Explorer.update',update_animation)],
    'facing은 왼쪽-1, 오른쪽1입니다. 키를 놓아도 마지막 값을 유지하므로 속도가 정확히0이어도 올바른 방향을 바라봅니다. action이 바뀔 때만 frame을0으로 돌립니다. idle은 초당4프레임, run은8프레임입니다. 움직임과 애니메이션은 서로 다른 계산입니다.',
    '오른쪽 달리기→키 놓기→왼쪽 달리기→키 놓기 순서로 시험합니다. 멈춘 방향을 바라보고 대기 자세를 유지해야 합니다.',
    '기초 실험은 별도 점프 그림 없이 달리기·대기 두 동작만 씁니다.',
    '멈추면 항상 오른쪽을 보면 velocity 부호로 facing을 덮어쓰지 않았는지 확인합니다.')
debug_loop=TUTORIAL[TUTORIAL.index('running = True'):].strip()
add(8,'상자와 실제 그림의 차이 보기','투명한 부분도 rect 안에 들어갑니다. 상자와 마스크 외곽을 함께 그려 비교합니다.',
    [method('Terrain.__init__',tutorial=True),method('Explorer.animate',tutorial=True),part('setup',MODEL['setup']+'\nshow_debug = True'),part('loop',debug_loop)],
    'from_surface(image)는 불투명한 픽셀로 마스크를 만듭니다. 정적인 타일은 한 번, 프레임이 바뀌는 탐사원은 이미지 교체 뒤 갱신합니다. outline의 좌표는 이미지 내부 좌표라 rect.x/y를 더해 화면에 그립니다. 원본 image에 선을 그리면 다음 충돌 마스크까지 오염될 수 있어 화면에만 그립니다.',
    'D키로 디버그 표시를 켜고 끕니다. 노란 상자는 여백을 포함하고 초록 외곽은 실제 탐사원 모양을 따릅니다. 걷는 동안 외곽이 같은 프레임을 따라가는지 확인하세요.',
    '진단 선은 학습용입니다. 본 게임에는 표시하지 않습니다.',
    '외곽이 왼쪽 위에만 보이면 화면 위치를 더했는지 확인합니다. 이전 자세의 선이면 image를 바꾼 뒤 mask를 갱신하세요.')
add(8,'발 지지와 정밀 충돌을 구분하기','발판의 안정성과 위험 구역의 정밀함을 각각 목적에 맞게 처리합니다.',
    [method('Explorer.check_collisions',tutorial=True)],
    '발판은 발 중심 좌우12픽셀의 일정한 지지 폭과 이전·현재 높이를 이용합니다. 팔을 펴거나 점프 자세가 바뀌어도 발판 지지가 흔들리지 않습니다. 위험 구역에는 collide_mask를 넣어 투명한 여백만 겹친 경우를 제외합니다. 원강의의 고정 오프셋+10 대신 제공한 그림의 발 기준을 맞췄습니다. 상자 판정과 픽셀 판정은 목적에 맞춰 함께 씁니다.',
    '발판 가장자리에서 실제 발이 벗어나면 떨어지는지 확인합니다. 지열 위에서 투명한 여백과 몸통이 닿을 때의 차이를 관찰하고, 복귀 후 다시 점프하세요.',
    '기초 실험 완성입니다. 다음에는 같은 원리를 별도 본 게임 프로젝트에 적용합니다.',
    '한 픽셀 떨림을 없애려고 임의로 y에10을 더하지 않습니다. position/rect 동시 보정과 발 기준 정렬을 먼저 확인합니다.')

add(9,'화성 탐사대의 완성 규칙 살펴보기','코드를 더 입력하기 전에 다음 프로젝트의 목표와 객체 역할을 정리합니다.',[],
    '방향키로 이동, Space로 점프, 위쪽키로 펄스를 발사합니다. 펄스에 맞은 로봇은 멈추고, 멈춘 로봇에 닿아 처리하면25점과 신호 결정이 생깁니다. 정지 후 기다리면 로봇이 재부팅됩니다. 결정을 탐사원이 회수하면100점과 에너지10을 얻고 최대100을 넘지 않습니다. 움직이는 로봇이 먼저 회수하면 로봇이 하나 늘어납니다. 피격은 에너지20 감소, 각 탐사는30초 생존입니다. 같은 색 게이트는 대각선 반대편으로 이어집니다.',
    '스튜디오 단계 비교에서 완성 게임을 별도 프로젝트로 열어 조작과 규칙을 관찰합니다. 먼저 기초 실험 프로젝트를 백업하세요. 완성본을 관찰한 뒤 다음 단원에서 빈 본 게임 프로젝트를 준비합니다.',
    '이 단계의 누적 코드는 완성된 기초 실험입니다. 본 게임 완성 비교는 final-main을 선택합니다.',
    '공격만으로 로봇이 제거되지 않는 것은 규칙입니다. 정지한 로봇에 직접 닿아야 합니다.')

asset_probe = '''import pygame

pygame.init()
screen = pygame.display.set_mode((640, 360))
clock = pygame.time.Clock()
font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 32)
explorer_image = pygame.image.load('assets/explorer/idle/0.png').convert_alpha()
sample_sound = pygame.mixer.Sound('assets/sounds/collect.ogg')
running = True
while running:
    clock.tick(60)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            sample_sound.play()
    if not running:
        break
    screen.fill((15, 25, 42))
    screen.blit(explorer_image, (288, 120))
    screen.blit(font.render('화성 탐사대 준비 완료', True, (110, 235, 215)), (160, 220))
    pygame.display.update()

pygame.quit()'''
add(10,'새 프로젝트에서 에셋 확인하기','기초 실험을 보존한 채 본 게임을 위한 빈 프로젝트와 폴더를 준비합니다.',
    [part('header',asset_probe[:asset_probe.index('running = True')].strip()),part('helpers',''),part('classes',{}),part('setup',''),part('loop',asset_probe[asset_probe.index('running = True'):])],
    'assets 안에 explorer, robot, tiles, gate, crystal, sounds, fonts 폴더가 있습니다. 프레임은0.png~3.png, 소리는OGG, 한글 폰트는도현체입니다. 이미지·소리는 이번 수업용으로 새로 제작했고 폰트는OFL 라이선스를 함께 제공합니다. 상대경로는 main.py가 있는 프로젝트를 기준으로 씁니다. 이 확인 코드는11에서 게임 골격으로 교체합니다.',
    '한글 준비 문구와 탐사원 그림이 보이는지 확인합니다. 게임 화면을 클릭하고 Space를 눌러 회수음을 들어 보세요. 파일 목록에서 네 프레임과 소리 파일도 확인합니다.',
    '이 코드는 에셋 점검용이며 아직 게임 규칙은 없습니다.',
    '소리가 안 나면 게임 화면을 한 번 클릭한 뒤 다시Space를 누르고 브라우저 음소거를 확인합니다. 네모 글자는 제공 폰트를 정확히 불러왔는지 확인합니다.')
