# -*- coding: utf-8 -*-
"""
gen_datalogs_content_rest.py
Supplies Data Logs 03 through 10.
"""

def append_remaining_logs(logs):
    # -------------------------------------------------------------
    # Data Log 03
    # -------------------------------------------------------------
    logs[3] = """# Data Log 03 — 정찰선 출격과 그룹 연결, 정밀 경계 제어

- 강의 대응: 원강의 53강 플레이어 스프라이트 및 이동 (lecture ID: 27597177)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

우리의 우주 방어선 최전선에 아군 탐사선 **Scout**을 출격시킵니다.
Pygame의 스프라이트 그룹(Group)을 먼저 연결하여 객체 간의 통솔 체계를 잡은 뒤, Scout 이미지를 화면 하단 중앙에 띄우고, 좌우 방향키로 이동하면서 화면 밖으로 뚫고 나가지 않도록 **정밀 경계 보정(clamp)**을 구현합니다. 마지막으로 피격 시 복귀할 `reset()` 메서드를 작성하고 정상 복귀를 확인합니다.

---

## 2. 단계별 실습

### [03-A] 스프라이트 그룹 연결과 Scout 출격

- **목표**: 탄환 및 기체 스프라이트 그룹을 생성하고, Scout 인스턴스를 만들어 화면 하단 중앙(600, 700)에 출격시킵니다.
- **이유**: 개별 스프라이트를 직접 그리지 않고 그룹 단위로 관리하여 update와 draw를 한 번에 처리하는 아키텍처를 확립합니다.
- **교체 위치**: `main.py`의 Scout 클래스 `__init__`을 채우고, 클래스 정의 아래의 게임 객체 준비 구간을 작성합니다.
- **입력 코드**:
```python
# Scout 클래스 내부
class Scout(pygame.sprite.Sprite):
    def __init__(self, scout_pulses):
        super().__init__()
        self.image = pygame.image.load('assets/images/scout.png')
        self.rect = self.image.get_rect()
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.bottom = SCREEN_HEIGHT
        self.velocity = 8
        self.scout_pulses = scout_pulses
        self.lives = 5

    def update(self):
        pass

    def fire(self):
        pass

    def reset(self):
        pass

# ... (클래스 정의들 아래, running = True 위)
scout_pulses = pygame.sprite.Group()
raider_pulses = pygame.sprite.Group()

player_group = pygame.sprite.Group()
scout = Scout(scout_pulses)
player_group.add(scout)

raiders = pygame.sprite.Group()
mission = Mission(scout, raiders, scout_pulses, raider_pulses)

# 메인 루프 내부
    screen.fill((15, 45, 65))
    scout.update()
    player_group.draw(screen)
    pygame.display.update()
```
- **줄 설명**:
  - `pygame.image.load('assets/images/scout.png')`: 아군 탐사선 이미지를 로드합니다.
  - `self.rect.centerx = SCREEN_WIDTH // 2`: 우주선 중심 X 좌표를 화면 정중앙(600)에 배치합니다.
  - `self.rect.bottom = SCREEN_HEIGHT`: 우주선 바닥을 화면 맨 아래(700)에 딱 맞춥니다.
  - `player_group.add(scout)`: Scout를 플레이어 그룹에 등록하여 `player_group.draw(screen)`으로 그리게 합니다.
- **여기서 실행하세요**:
  1. **[실행]** 버튼을 누릅니다.
  2. 게임 화면 하단 중앙에 멋진 아군 우주선이 나타나는지 확인합니다.
- **관찰 결과**:
  - 화면 맨 아래 중앙에 푸른빛 아군 탐사선이 당당하게 출격해 있습니다.
- **정상 미구현**:
  - 좌우 방향키를 눌러도 아직 움직이지 않습니다. (`Scout.update`가 아직 pass이기 때문입니다.)
- **실패 진단**:
  - `FileNotFoundError: No such file or directory 'assets/images/scout.png'`: 이미지 파일 경로의 대소문자와 폴더 구조를 확인하세요.

---

### [03-B] 좌우 키보드 이동과 양쪽 경계 보정 (Clamp)

- **목표**: `pygame.key.get_pressed()`를 이용해 부드러운 연속 이동을 구현하고, 양쪽 벽(left < 0, right > SCREEN_WIDTH)을 넘지 않도록 보정합니다.
- **이유**: 단순 검사만 하고 이동하면 속도(velocity=8)에 따라 화면 밖으로 뚫고 나갈 수 있으므로, 이동 직후 경계 좌표를 강제로 고정(clamp)해야 합니다.
- **교체 위치**: `Scout` 클래스의 `def update(self): pass`를 교체합니다.
- **입력 코드**:
```python
    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.rect.x -= self.velocity
        if keys[pygame.K_RIGHT]:
            self.rect.x += self.velocity

        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH
```
- **줄 설명**:
  - `keys[pygame.K_LEFT]`: 왼쪽 방향키가 눌려 있으면 X 좌표를 velocity만큼 뺍니다.
  - `if self.rect.left < 0: self.rect.left = 0`: 기체 왼쪽 모서리가 화면 왼쪽 끝을 뚫지 못하게 0으로 고정합니다.
  - `if self.rect.right > SCREEN_WIDTH: self.rect.right = SCREEN_WIDTH`: 기체 오른쪽 모서리가 1200을 넘지 못하게 1200으로 고정합니다.
- **바꿔보기 (경계 초과 방지 시험)**:
  - `self.velocity = 7`로 잠시 바꿔 실행해보세요. 홀수 속도에서도 양쪽 벽에 닿았을 때 완벽하게 0과 1200에 멈추는 것을 확인한 뒤, 다시 `self.velocity = 8`로 복원합니다.
- **여기서 실행하세요**:
  1. 게임 화면을 마우스로 클릭하여 활성화한 뒤, 키보드 `←`, `→` 키를 꾹 눌러봅니다.
  2. 화면 맨 왼쪽과 맨 오른쪽 끝까지 밀어붙여 봅니다.
- **관찰 결과**:
  - 탐사선이 매끄럽게 좌우로 주행하며, 양쪽 벽에 부딪혀도 화면 밖으로 조금도 탈출하지 않고 깔끔하게 정지합니다.
- **정상 미구현**:
  - 스페이스바를 눌러도 탄환은 아직 발사되지 않습니다.
- **실패 진단**:
  - 키를 눌러도 움직이지 않을 때: 게임 화면 캔버스를 마우스로 한 번 클릭하여 브라우저 포커스를 맞춰주세요.

---

### [03-C] Scout 복귀 메서드 (reset) 구현 및 단위 확인

- **목표**: 피격 시 탐사선을 화면 중앙 하단으로 즉시 복귀시키는 `reset()` 메서드를 구현합니다.
- **이유**: 후반부 피격/충돌/새 라운드 전환 시 우주선을 초기 위치로 되돌리는 필수 안전 장치입니다.
- **교체 위치**: `Scout` 클래스의 `def reset(self): pass`를 교체합니다.
- **입력 코드**:
```python
    def reset(self):
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.bottom = SCREEN_HEIGHT
```
- **줄 설명**:
  - `self.rect.centerx = SCREEN_WIDTH // 2`: X축 위치를 600으로 리셋합니다.
  - `self.rect.bottom = SCREEN_HEIGHT`: Y축 바닥을 700으로 리셋합니다.
- **임시 검증 및 복원**:
  - 아직 충돌 기능이 없으므로, 메인 루프 직전에 임시로 `scout.rect.x = 100; scout.reset()`을 넣어 우주선이 100에 머무르지 않고 중앙(600)으로 복귀하는지 눈으로 확인한 뒤 임시 코드를 깨끗이 지웁니다.
- **여기서 실행하세요**:
  1. **[실행]**을 눌러 문법 오류 없이 우주선이 중앙에서 정상 대기하는지 확인합니다.
- **관찰 결과**:
  - 우주선이 화면 하단 중앙에서 완벽하게 작동합니다.
- **정상 미구현**:
  - 아직 적군이 출현하지 않았습니다.
- **실패 진단**:
  - `// 2` 대신 `/ 2`를 쓰면 float 타입이 되어 픽셀 렌더링 시 경고가 발생할 수 있습니다. 몫 연산자 `//`를 유지하세요.

---

## 3. 학생 작전 점검 체크리스트
- [ ] 하단 중앙(600, 700)에 Scout 이미지가 로드되었는가?
- [ ] 좌우 방향키로 이동 시 양쪽 끝에서 화면 밖으로 탈출하지 않는가?
- [ ] Scout.reset() 메서드가 선언되었는가?
"""

    # -------------------------------------------------------------
    # Data Log 04
    # -------------------------------------------------------------
    logs[4] = """# Data Log 04 — 플라즈마 탄환과 발사 제약

- 강의 대응: 원강의 54강 플레이어 탄환 발사 (lecture ID: 27597179)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

아군 탐사선의 공격 무기인 **플라즈마 탄환(Pulse)**을 장착합니다.
스페이스바를 눌렀을 때 발사음과 함께 청록색 탄환이 솟아오르게 만들고, 원작 아케이드의 전술적 긴장감을 구현하기 위해 화면에 **최대 2발 제한**을 겁니다. 화면 밖으로 나간 탄환을 `kill()`로 정리하지 않으면 2발 발사 후 영원히 멈추는 문제를 직접 관찰하고 해결합니다.

---

## 2. 단계별 실습

### [04-A] Pulse 스프라이트와 Scout.fire() 연결

- **목표**: 너비 4, 높이 15 크기의 청록빛 탄환 클래스를 만들고, 스페이스바 입력 시 발사되도록 연결합니다.
- **이유**: 원거리 사격을 위한 기본 투사체 시스템을 구축합니다.
- **교체 위치**: `Pulse` 클래스와 `Scout.fire()` 메서드를 구현하고, 메인 루프의 이벤트 처리에 스페이스바를 연결합니다.
- **입력 코드**:
```python
# Pulse 클래스 구현
class Pulse(pygame.sprite.Sprite):
    def __init__(self, x, y, owner):
        super().__init__()
        self.image = pygame.Surface((4, 15))
        self.image.fill((0, 255, 255))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.bottom = y
        self.velocity = 10
        self.owner = owner

    def update(self):
        self.rect.y -= self.velocity

# Scout 클래스 내부
    def fire(self):
        self.scout_pulse_sound.play()
        self.scout_pulses.add(Pulse(self.rect.centerx, self.rect.top, 'player'))

# 메인 루프 이벤트 처리
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                scout.fire()

# 메인 루프 내부
    scout_pulses.update()
    scout_pulses.draw(screen)
```
- **줄 설명**:
  - `self.image.fill((0, 255, 255))`: 고에너지 청록색 플라즈마 색상입니다.
  - `self.velocity = 10`: 우주선(8)보다 빠르게 날아가도록 속도를 10으로 설정합니다.
  - `event.key == pygame.K_SPACE`: 스페이스바를 누를 때마다 단발 사격합니다.
- **여기서 실행하세요**:
  1. **[실행]**을 누르고 스페이스바를 몇 번 눌러봅니다.
- **관찰 결과**:
  - 발사음과 함께 청록색 레이저가 우주선 총구에서 하늘 위로 솟구칩니다.
- **정상 미구현**:
  - 몇 번 쏘고 나면 탄환이 화면 위로 나간 뒤에도 메모리/그룹에 계속 남아있게 됩니다.

---

### [04-B] 2발 제한 적용과 발사 차단 버그 관찰

- **목표**: `len(self.scout_pulses) < 2` 조건을 추가하여 아군 탄환을 최대 2발로 제한합니다.
- **이유**: 무한 연사를 방지하여 한 발 한 발 신중하게 조준하는 게임 밸런스를 만듭니다.
- **교체 위치**: `Scout.fire()` 메서드에 발사 수 제한 조건을 추가합니다.
- **입력 코드**:
```python
    def fire(self):
        if len(self.scout_pulses) < 2:
            self.scout_pulse_sound.play()
            self.scout_pulses.add(Pulse(self.rect.centerx, self.rect.top, 'player'))
```
- **직접 관찰할 이상 현상**:
  - 코드를 적용하고 스페이스바를 연타해보세요.
  - 딱 2발만 발사되고, 그 뒤로는 스페이스바를 아무리 눌러도 더 이상 탄환이 단 1발도 나가지 않는 **먹통 현상**이 발생합니다!
- **원인 분석**:
  - 2발의 탄환이 화면 위 Y=0 바깥으로 나갔지만, 그룹에서 제거되지 않아 여전히 그룹의 크기(len)가 2로 유지되기 때문입니다.

---

### [04-C] 화면 밖 소멸 (kill) 처리로 연속 발사 완성

- **목표**: 탄환이 화면 상단을 벗어났을 때 `self.kill()`을 호출하여 그룹에서 완전히 제거합니다.
- **이유**: 화면 밖으로 나간 탄환을 정리해야 탄환 수가 0 또는 1로 줄어들어 새 탄환을 지속적으로 쏠 수 있습니다.
- **교체 위치**: `Pulse.update()` 메서드를 교체합니다.
- **입력 코드**:
```python
    def update(self):
        self.rect.y -= self.velocity
        if self.rect.bottom < 0:
            self.kill()
```
- **줄 설명**:
  - `if self.rect.bottom < 0:`: 탄환 꼬리(bottom)까지 화면 맨 위(Y=0)를 완전히 벗어났는지 검사합니다.
  - `self.kill()`: 자신이 속해 있는 모든 Pygame 스프라이트 그룹에서 이 탄환을 탈퇴(제거)시킵니다.
- **여기서 실행하세요**:
  1. 스튜디오 **[실행]**을 누르고 스페이스바를 자유롭게 연타해봅니다.
- **관찰 결과**:
  - 화면에 항상 최대 2발까지만 존재하며, 탄환이 하늘 위로 사라지면 즉시 다음 탄환을 쏠 수 있는 부드럽고 리드미컬한 사격이 완성됩니다!
- **정상 미구현**:
  - 아직 탄환으로 맞출 적 침략선이 없습니다.
- **실패 진단**:
  - 부등호를 `>`로 쓰면 발사 즉시 사라집니다. 화면 상단은 Y=0이므로 반드시 `< 0`이어야 합니다.

---

## 3. 학생 작전 점검 체크리스트
- [ ] 스페이스바를 누르면 발사음과 함께 청록색 탄환이 발사되는가?
- [ ] 화면에 아군 탄환이 동시에 최대 2발까지만 유지되는가?
- [ ] 탄환이 화면 상단 밖으로 나가면 정상적으로 다음 탄환을 연사할 수 있는가?
"""

    # -------------------------------------------------------------
    # Data Log 05
    # -------------------------------------------------------------
    logs[5] = """# Data Log 05 — 외계 침략선 Raider의 기동 원리

- 강의 대응: 원강의 55강 적 스프라이트 기본 (lecture ID: 27597181)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

이제 지구를 위협하는 외계 침략 드론 **Raider**의 기동 원리를 설계합니다.
이번 단원에서는 거대한 편대를 통째로 만들지 않고, **적 드론 1기의 독자적인 이동, 방향 전환, 확률 기반 하향 사격 조건, 원위치 리셋**을 정교하게 완성합니다. 화면에 아직 적이 보이지 않는 이유와, 미래 편대를 앞당겨 만들지 않고 객체 단위로 격리 검증하는 이유를 배웁니다.

---

## 2. 단계별 실습

### [05-A] Raider 클래스 속성과 기동 메커니즘 완성

- **목표**: `Raider` 클래스에 이미지 로드, 시작 좌표 보관, 이동 속도, 1/1001 조건부 사격, 시작 위치 리셋을 구현합니다.
- **이유**: 편대를 이루기 전 개별 부품의 물리 법칙과 사격 조건을 완벽히 확립해야 55기 편대 기동 시 대열이 흐트러지지 않습니다.
- **교체 위치**: `Raider` 클래스의 전체 메서드를 교체합니다.
- **입력 코드**:
```python
class Raider(pygame.sprite.Sprite):
    def __init__(self, x, y, raider_pulses):
        super().__init__()
        self.image = pygame.image.load('assets/images/raider.png')
        self.rect = self.image.get_rect()
        self.rect.topleft = (x, y)
        self.start_x = x
        self.start_y = y
        self.velocity = 2
        self.direction = 1
        self.raider_pulses = raider_pulses
        self.raider_pulse_sound = pygame.mixer.Sound('assets/sounds/raider_pulse.wav')

    def update(self):
        self.rect.x += self.velocity * self.direction
        if random.randint(0, 1000) == 1000:
            self.fire()

    def fire(self):
        pass

    def reset(self):
        self.rect.topleft = (self.start_x, self.start_y)
        self.direction = 1
```
- **줄 설명**:
  - `self.start_x = x`, `self.start_y = y`: 나중에 편대 재정렬을 위해 처음 태어난 고유 격자 위치를 기억해둡니다.
  - `self.velocity = 2`: 적기의 기본 비행 속도는 2입니다.
  - `self.direction = 1`: 1이면 우측, -1이면 좌측으로 비행합니다.
  - `random.randint(0, 1000) == 1000`: 0부터 1000까지 양 끝을 포함한 1001개의 숫자 중 하나를 뽑는 것으로, 한 프레임당 조건부 발사 확률은 정확히 **1/1001**입니다. (60FPS에서 1기가 다른 제약 없이 단독 비행할 때 평균 약 16.7초마다 1발을 발사하는 기댓값입니다.)
  - `reset(self)`: 적기를 원래의 대열 시작 위치로 되돌리고 방향도 우측(1)으로 초기화합니다.
- **여기서 실행하세요**:
  1. 스튜디오 상단의 **[실행]** 버튼을 클릭합니다.
- **관찰 결과**:
  - 에러 없이 기존의 아군 우주선과 발사 시스템이 정상 구동됩니다.
- **정상 미구현**:
  - 화면에 외계선이 아직 단 한 마리도 나타나지 않습니다.
  - **이유**: `Raider`라는 '설계도'를 작성했을 뿐, `raiders` 그룹에 적 인스턴스를 실제로 생성해서 집어넣는 코드를 아직 실행하지 않았기 때문입니다.
- **실패 진단**:
  - `AttributeError: module 'random' has no attribute 'randint'`: 파일 상단에 `import random`이 빠졌는지 확인하세요.

---

## 3. 학생 작전 점검 체크리스트
- [ ] Raider 클래스에 이미지, 속도, 방향, 시작 좌표가 정의되었는가?
- [ ] update에서 1/1001 확률 조건문이 작성되었는가?
- [ ] reset() 호출 시 시작 위치(start_x, start_y)로 복귀하는 코드가 있는가?
"""

    # -------------------------------------------------------------
    # Data Log 06
    # -------------------------------------------------------------
    logs[6] = """# Data Log 06 — 적 탄환 발사와 버그 진단

- 강의 대응: 원강의 56강 적 탄환 및 버그 수정 (lecture ID: 27597184)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

외계 드론들의 하향 사격 무기 **RaiderPulse**를 구현합니다.
55기 전체를 만들기 전에 **임시 10기 편대**를 먼저 화면에 배치하여 적 스프라이트의 모습을 확인합니다. 그 후 적 탄환이 발사되자마자 허공에서 증발하는 원강의의 실제 버그(`< SCREEN_HEIGHT`)를 직접 재현하여 눈으로 관찰하고, 올바른 부등호(`> SCREEN_HEIGHT`)로 고치는 실전 디버깅을 경험합니다.

---

## 2. 단계별 실습

### [06-A] 임시 10기 침략 드론 배치

- **목표**: 화면 상단에 10기의 Raider를 가로로 배치하여 시각적 배치를 검증합니다.
- **이유**: 대형 편대 구축 전에 작은 규모(10기)로 스프라이트와 발사를 격리 시험하기 위함입니다.
- **교체 위치**: `raiders = pygame.sprite.Group()` 바로 아래에 10기 생성 코드를 넣습니다.
- **입력 코드**:
```python
raiders = pygame.sprite.Group()
for i in range(10):
    raiders.add(Raider(100 + i * 80, 100, raider_pulses))
```
- **줄 설명**:
  - `100 + i * 80`: 가로 간격 80픽셀씩 띄워 10기를 나란히 배치합니다.
- **여기서 실행하세요**:
  1. **[실행]**을 누르고 게임 화면을 봅니다.
- **관찰 결과**:
  - 화면 상단 Y=100 높이에 10기의 붉은 외계 침략선이 일렬로 나타납니다.
- **정상 미구현**:
  - 적들이 제자리에 멈춰 있고 탄환을 쏘지 않습니다.

---

### [06-B] RaiderPulse 탄환과 Raider.fire() 구현

- **목표**: 붉은색 적 탄환 클래스를 정의하고, 적 드론이 발사음을 울리며 탄환을 아래로 쏘게 합니다.
- **교체 위치**: `RaiderPulse` 클래스와 `Raider.fire()` 메서드를 구현하고 메인 루프에 update/draw를 추가합니다.
- **입력 코드**:
```python
class RaiderPulse(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((4, 15))
        self.image.fill((255, 50, 50))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.top = y
        self.velocity = 6

    def update(self):
        self.rect.y += self.velocity
        if self.rect.top < SCREEN_HEIGHT:
            self.kill()

# Raider 클래스 내부
    def fire(self):
        if len(self.raider_pulses) < 2:
            self.raider_pulse_sound.play()
            self.raider_pulses.add(RaiderPulse(self.rect.centerx, self.rect.bottom))

# 메인 루프 내부
    raiders.update()
    raiders.draw(screen)
    raider_pulses.update()
    raider_pulses.draw(screen)
```
- **줄 설명**:
  - `self.velocity = 6`: 플레이어 탄환(10)보다 약간 느려 회피할 수 있는 속도입니다.
  - `self.rect.y += self.velocity`: 아래로 떨어지므로 Y좌표를 증가시킵니다.
  - `len(self.raider_pulses) < 2`: 편대 전체에서 화면에 최대 2발까지만 공존할 수 있습니다.

---

### [06-C] 진단용 버그 관찰과 올바른 부등호(>) 복원

- **목표**: `if self.rect.top < SCREEN_HEIGHT: self.kill()`의 부등호 버그를 관찰하고 `>`로 교정합니다.
- **이유**: 아래로 날아가는 탄환의 화면 하단 이탈 판정 원리를 명확히 이해합니다.
- **직접 관찰할 이상 현상**:
  - 06-B 코드를 실행하면 적이 총을 쏠 때 효과음은 나는데, **붉은 탄환이 발사되자마자 총구 앞에서 0.01초 만에 흔적도 없이 증발**해버립니다!
- **버그 원인**:
  - 화면 상단에서 발사된 탄환의 `top`은 약 120입니다. 120은 `SCREEN_HEIGHT(700)`보다 항상 작기 때문에(`<`), 태어나자마자 첫 프레임에 `kill()`되어 사라진 것입니다!
- **올바른 코드로 복원**:
  - `RaiderPulse.update`의 부등호를 `<`에서 `>`로 수정합니다:
```python
    def update(self):
        self.rect.y += self.velocity
        if self.rect.top > SCREEN_HEIGHT:
            self.kill()
```
- **여기서 실행하세요**:
  1. 부등호를 교정하고 **[실행]**을 누릅니다.
- **관찰 결과**:
  - 적들이 발사음을 내며 붉은 레이저 탄환을 화면 아래 끝까지 시원하게 쏘아 내리고, 화면 바닥을 벗어나면 깨끗하게 소멸되어 다음 탄환이 계속해서 발사됩니다!

---

## 3. 학생 작전 점검 체크리스트
- [ ] 임시 10기 드론이 화면 상단에 일렬로 배치되었는가?
- [ ] 적 탄환이 붉은색으로 화면 아래로 정상 비행하는가?
- [ ] `<` 부등호 버그의 원인을 이해하고 `>` SCREEN_HEIGHT로 올바르게 수정했는가?
"""

    # -------------------------------------------------------------
    # Data Log 07
    # -------------------------------------------------------------
    logs[7] = """# Data Log 07 — 사령탑 Mission과 정식 55기 편대 출격

- 강의 대응: 원강의 57~58강 게임 매니저 및 편대 생성 (lecture ID: 27597188)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

모든 스프라이트를 지휘할 중앙 사령탑 **Mission** 클래스를 구현합니다.
크로스 플랫폼 한글 깨짐을 방지하기 위해 제공된 도현체(`Dohyeon.ttf`) 폰트를 로드하고, 상단 HUD(점수, 기체 생명, 라운드)와 하단 최후 방어선(Y=630)을 화면에 그립니다. 그 후 임시 10기 코드를 깨끗이 제거하고, **11열 × 5행 총 55기**의 침략군 정식 대편대를 출격시킵니다.

---

## 2. 단계별 실습

### [07-A] Mission 초기화, 한글 폰트, HUD 및 방어선 그리기

- **목표**: Mission 클래스에 기본 상태(점수 0, 생명 5, 라운드 1, state='playing')와 폰트를 설정하고 상단 HUD와 방어선을 렌더링합니다.
- **교체 위치**: `Mission` 클래스의 `__init__`과 `draw()` 메서드를 구현합니다.
- **입력 코드**:
```python
class Mission:
    def __init__(self, scout, raiders, scout_pulses, raider_pulses):
        self.scout = scout
        self.raiders = raiders
        self.scout_pulses = scout_pulses
        self.raider_pulses = raider_pulses

        self.score = 0
        self.lives = 5
        self.round_number = 1
        self.state = 'playing'

        self.pause_main_text = ''
        self.pause_sub_text = ''

        self.font = pygame.font.Font('assets/fonts/Dohyeon.ttf', 36)
        self.sub_font = pygame.font.Font('assets/fonts/Dohyeon.ttf', 24)

        self.raider_break_sound = pygame.mixer.Sound('assets/sounds/raider_break.wav')
        self.shield_hit_sound = pygame.mixer.Sound('assets/sounds/shield_hit.wav')
        self.breach_sound = pygame.mixer.Sound('assets/sounds/breach.wav')
        self.new_round_sound = pygame.mixer.Sound('assets/sounds/new_round.wav')

    def draw(self):
        screen = pygame.display.get_surface()
        score_text = self.font.render(f'점수: {self.score}', True, (255, 255, 255))
        screen.blit(score_text, (20, 15))

        lives_text = self.font.render(f'기체: {self.lives}', True, (255, 255, 255))
        screen.blit(lives_text, (500, 15))

        round_text = self.font.render(f'라운드: {self.round_number}', True, (255, 255, 255))
        screen.blit(round_text, (1000, 15))

        pygame.draw.line(screen, (255, 255, 255), (0, 630), (SCREEN_WIDTH, 630), 2)
```
- **줄 설명**:
  - `pygame.font.Font('assets/fonts/Dohyeon.ttf', 36)`: 외부 도현체 폰트를 로드하여 OS에 상관없이 아름다운 한글을 출력합니다.
  - `pygame.draw.line(screen, (255, 255, 255), (0, 630), (SCREEN_WIDTH, 630), 2)`: Y=630에 두께 2의 흰색 최후 방어선을 긋습니다.
- **여기서 실행하세요**:
  1. 메인 루프에서 `mission.draw()`를 호출하도록 하고 **[실행]**을 누릅니다.
- **관찰 결과**:
  - 상단에 '점수: 0', '기체: 5', '라운드: 1' 한글 텍스트가 선명하게 뜨고, 하단 Y=630에 흰색 방어선이 그어집니다.

---

### [07-B] 임시 편대 삭제와 Mission.start_new_round (55기 대편대) 구현

- **목표**: 06단원의 임시 10기 루프를 삭제하고, Mission 클래스 안에 11열 5행의 55기 편대를 생성하는 `start_new_round()` 메서드를 작성합니다.
- **교체 위치**: `Mission` 클래스에 `start_new_round`를 추가하고, 준비 구간에서 임시 편대 루프를 제거하여 단일 Mission 생성 블록으로 정리합니다.
- **입력 코드**:
```python
# Mission 클래스 내부
    def start_new_round(self):
        self.raiders.empty()
        for row in range(5):
            for col in range(11):
                x = 100 + col * 80
                y = 70 + row * 60
                self.raiders.add(Raider(x, y, self.raider_pulses))

# 클래스 정의 아래 준비 구간 (임시 10기 루프를 완전히 삭제하고 아래와 같이 작성)
raiders = pygame.sprite.Group()
mission = Mission(scout, raiders, scout_pulses, raider_pulses)
```
- **줄 설명**:
  - `self.raiders.empty()`: 새 편대를 만들기 전에 이전 잔여 적들을 비웁니다.
  - `5행 × 11열`: row(0~4), col(0~10)으로 총 55기의 침략선을 반듯한 바둑판 격자로 생성합니다.
- **주의 (이중 생성 방지)**:
  - 07-A에서 작성했던 이전 임시 코드와 mission 생성 줄이 중복되지 않도록 고유한 위치를 정확히 확인하세요.

---

### [07-C] 55기 정식 출격 호출 연결

- **목표**: 게임 시작 시 `mission.start_new_round()`를 호출하여 55기 침략군을 화면에 출격시킵니다.
- **교체 위치**: `mission = Mission(...)` 바로 다음 줄에 호출 코드를 추가합니다.
- **입력 코드**:
```python
mission = Mission(scout, raiders, scout_pulses, raider_pulses)
mission.start_new_round()
```
- **여기서 실행하세요**:
  1. 스튜디오 **[실행]** 버튼을 누릅니다.
- **관찰 결과**:
  - 화면 상단에 5열 11행, 총 55기의 거대한 외계 침략선 대편대가 장관을 이루며 출격 완료합니다!
- **정상 미구현**:
  - 적 편대가 아직 좌우로 전진/하강 기동하지 않고 제자리에 있습니다. (08단원에서 편대 기동을 구현합니다.)

---

## 3. 학생 작전 점검 체크리스트
- [ ] 상단 HUD에 점수, 기체, 라운드가 선명한 한글로 출력되는가?
- [ ] 하단 Y=630에 흰색 최후 방어선이 그려졌는가?
- [ ] 11열 5행 총 55기의 침략군 대편대가 화면 상단에 정렬되었는가?
"""

    # -------------------------------------------------------------
    # Data Log 08
    # -------------------------------------------------------------
    logs[8] = """# Data Log 08 — 편대 기동과 방어선 침범

- 강의 대응: 원강의 59강 편대 이동 및 방어선 침범 (lecture ID: 27597190)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

스페이스 인베이더의 백미인 **55기 편대의 일괄 기동(shift_raiders)**을 완성합니다.
벽면에 도달했을 때 대열 전체가 일제히 반전하고 아래로 하강하는 2단계 알고리즘을 구현합니다. 하강 거리는 라운드에 비례(`10 × round_number`)합니다. 적기가 최후 방어선(Y=630)을 돌파했을 때 경보음과 생명 차감을 일으키는 로직을 구현하고, **임시 30라운드 설정**을 통해 수 분 동안 기다리지 않고 신속히 침범을 검증한 뒤 정상 복원합니다.

---

## 2. 단계별 실습

### [08-A] Mission.shift_raiders() 2단계 이동과 침범 감지

- **목표**: 벽 감지(1단계) -> 일괄 하강 및 반전(2단계) -> 방어선 침범 감지(3단계)를 구현합니다.
- **교체 위치**: `Mission` 클래스의 `shift_raiders` 메서드를 구현하고 `Mission.update`에서 호출합니다.
- **입력 코드**:
```python
class Mission:
    # ...
    def update(self):
        self.shift_raiders()

    def shift_raiders(self):
        # 1단계: 벽 도달 감지
        bounce = False
        for raider in self.raiders:
            if raider.rect.left <= 0 or raider.rect.right >= SCREEN_WIDTH:
                bounce = True
                break

        # 2단계: 일괄 하강 및 방향 반전
        if bounce:
            drop_distance = 10 * self.round_number
            for raider in self.raiders:
                raider.rect.y += drop_distance
                raider.direction *= -1

        # 3단계: 최후 방어선 침범 감지
        for raider in self.raiders:
            if raider.rect.bottom >= 630:
                self.breach_sound.play()
                self.check_game_status('방어선이 뚫렸습니다!', '계속하려면 Enter를 누르세요')
                break
```
- **줄 설명**:
  - `drop_distance = 10 * self.round_number`: 1라운드는 10픽셀, 2라운드는 20픽셀씩 성큼성큼 내려앉습니다.
  - `raider.direction *= -1`: 대열 전체의 진행 방향을 좌우 반전합니다.
  - `if raider.rect.bottom >= 630:`: 적기 바닥이 방어선(630)에 닿으면 침범 경보음을 울리고 생명 감소 루틴을 호출합니다.
  - `break`: 1프레임에 여러 적이 동시에 방어선에 닿아도 생명이 1개만 깎이도록 루프를 즉시 탈출합니다.

---

### [08-B] 빠른 방어선 침범 시험과 정상값 복원

- **목표**: 기본 1라운드 속도로 몇 분 동안 기다리지 않고, 빠른 시험값으로 침범을 즉시 확인한 뒤 안전하게 1로 복원합니다.
- **시험 방법**:
  1. `mission = Mission(...)` 아래에 임시로 `mission.round_number = 30`을 입력합니다.
  2. 게임을 **[실행]**하면 편대가 벽에 한 번 부딪히자마자 300픽셀씩 쿵쿵 내려앉아 즉시 방어선에 도달합니다.
  3. 방어선에 닿는 순간 긴급 침범 경보음(`breach_sound`)이 울리는 것을 귀로 확인합니다.
  4. 확인이 끝나면 임시 코드 `mission.round_number = 30` 줄을 **반드시 삭제하거나 1로 복원**합니다.
- **관찰 결과**:
  - 침범음이 쩌렁쩌렁 울리며 침범 로직이 정상 작동함을 10초 만에 완벽히 입증했습니다.
- **실패 진단**:
  - 시험 후 복원하지 않으면 게임이 시작하자마자 바닥으로 추락하므로 반드시 `round_number = 1`인지 확인하세요.

---

## 3. 학생 작전 점검 체크리스트
- [ ] 55기 편대가 벽에 닿을 때마다 방향을 바꾸며 단체로 하강하는가?
- [ ] 하강 거리가 `10 * round_number` 공식으로 계산되는가?
- [ ] 빠른 침범 시험 후 round_number가 정상적으로 1로 복원되었는가?
"""

    # -------------------------------------------------------------
    # Data Log 09
    # -------------------------------------------------------------
    logs[9] = """# Data Log 09 — 비상 정돈과 일시정지 상태 머신

- 강의 대응: 원강의 60강 일시정지 및 상태 머신 (lecture ID: 27597194)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

웹 브라우저 스튜디오에서 게임을 얼어붙게(Freeze) 만들지 않고 부드럽게 멈추는 **상태 머신(State Machine)** 패턴을 도입합니다.
침범이나 피격 시 잔여 탄환을 비우고 우주선을 원위치시키는 **비상 정돈(check_game_status)**을 먼저 구축하고, 반투명 검은색 오버레이 안내창과 Enter 키 재개 루틴을 연결합니다. 동기 while 루프를 절대 쓰지 않고 최상위 루프 안에서 update 실행 여부만 분기하는 원리를 마스터합니다.

---

## 2. 단계별 실습

### [09-A] check_game_status 먼저 구현, pause_game, 메인 루프 전체 교체

- **목표**: 비상 정돈(탄환 비우기/생명 차감/분기)을 먼저 작성하고, pause_game과 반투명 안내창, 상태 기반 메인 루프 전체를 교체합니다.
- **이유**: 데이터의 안전한 정돈이 먼저 선행되어야 상태 전환 후 부작용(재개 즉시 재피격)이 없습니다.
- **교체 위치**: `Mission` 클래스에 `check_game_status`, `pause_game`을 구현하고, `running = True`부터 메인 루프 전체를 교체합니다.
- **입력 코드**:
```python
# Mission 클래스 내부
    def check_game_status(self, text, subtitle):
        self.scout_pulses.empty()
        self.raider_pulses.empty()
        self.scout.reset()
        self.scout.lives -= 1
        if self.scout.lives <= 0:
            self.reset_game()
        else:
            self.pause_game(text, subtitle)

    def pause_game(self, text, subtitle):
        self.state = 'paused'
        self.pause_main_text = text
        self.pause_sub_text = subtitle

    def draw(self):
        # ... (기존 HUD 및 방어선 그리기 코드 유지)
        if self.state in ('paused', 'game_over'):
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 180))
            screen.blit(overlay, (0, 0))

            main_surf = self.font.render(self.pause_main_text, True, (255, 255, 255))
            screen.blit(main_surf, main_surf.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20)))

            sub_surf = self.sub_font.render(self.pause_sub_text, True, (200, 200, 200))
            screen.blit(sub_surf, sub_surf.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30)))

# 메인 루프 전체 교체 (running = True 부터 pygame.quit() 까지)
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE and mission.state == 'playing':
                scout.fire()

    screen.fill((15, 45, 65))

    if mission.state == 'playing':
        scout.update()
        scout_pulses.update()
        raiders.update()
        raider_pulses.update()
        mission.update()

    player_group.draw(screen)
    scout_pulses.draw(screen)
    raiders.draw(screen)
    raider_pulses.draw(screen)
    mission.draw()

    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
```
- **줄 설명**:
  - `self.scout_pulses.empty()`, `self.raider_pulses.empty()`: 재개하자마자 남은 총알에 억울하게 즉시 다시 맞는 일이 없도록 공중의 모든 탄환을 깨끗이 소거합니다.
  - `self.scout.reset()`: 플레이어 우주선을 안전한 중앙 하단으로 대피시킵니다.
  - `if mission.state == 'playing':`: update는 게임 진행 중일 때만 실행하고, 일시정지 중에는 이동/사격을 멈춥니다.
  - `draw()`는 if 분기 밖에서 **매 프레임 무조건 실행**되어 정지된 전장과 반투명 안내창을 모니터에 계속 유지합니다.

---

### [09-B] paused 상태에서 Enter 키로 게임 재개 연결

- **목표**: 일시정지 중 조작이 차단되는 것을 확인하고, Enter 키 입력 시 `state = 'playing'`으로 게임을 재개합니다.
- **교체 위치**: 메인 루프의 `pygame.KEYDOWN` 이벤트 처리에 Enter 키 분기를 추가합니다.
- **입력 코드**:
```python
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE and mission.state == 'playing':
                scout.fire()
            if event.key == pygame.K_RETURN:
                if mission.state == 'paused':
                    mission.state = 'playing'
```
- **여기서 실행하세요**:
  1. **[실행]**을 누르고 침범이 일어났을 때 반투명 정지창이 뜨는지 확인합니다.
  2. 일시정지 중에 방향키나 스페이스바를 눌러도 우주선이 움직이지 않는 것을 확인합니다.
  3. 키보드의 **[Enter]** 키를 칩니다!
- **관찰 결과**:
  - 안내창이 사라지고 공중의 탄환이 정리된 안전한 상태에서 게임이 다시 활기차게 재개됩니다!

---

## 3. 학생 작전 점검 체크리스트
- [ ] check_game_status에서 탄환을 비우고 기체를 중앙으로 리셋하는가?
- [ ] 일시정지 중 반투명 검은색 오버레이와 한글 안내 문구가 화면 중앙에 뜨는가?
- [ ] paused 상태에서 Enter를 누르면 playing으로 정상 재개되는가?
"""

    # -------------------------------------------------------------
    # Data Log 10
    # -------------------------------------------------------------
    logs[10] = """# Data Log 10 — 격추 판정과 게임 완성

- 강의 대응: 원강의 61~62강 충돌 판정, 스코어링 및 게임 완성 (lecture ID: 27597198)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요

우주 방어대 대단원의 마지막 장입니다!
충돌을 만들기 전에 **게임오버 시 최종 점수를 Enter 전까지 보존하는 리셋 시스템**을 먼저 확립합니다. 그 후 아군 탄환과 외계 드론 간의 충돌(격추음, +100점), 적 탄환 및 적 함체와 아군기 간의 피격 판정을 구현합니다. 같은 프레임에서 상태가 바뀌었을 때 후속 연산을 차단하는 **상태 가드**를 적용하고, 55기 전멸 시 **라운드 보너스(1000 × 라운드 번호)**와 함께 다음 편대를 소환하여 영원히 도전할 수 있는 완성도 높은 게임을 만듭니다.

---

## 2. 단계별 실습

### [10-A] 게임오버 최종 점수 보존(reset_game), 재시작(restart_game), Enter 분기

- **목표**: 패배 시 최종 점수를 화면에 유지하고, Enter를 누를 때만 점수 0/1라운드로 새 게임을 시작하도록 분리합니다.
- **교체 위치**: `Mission` 클래스에 `reset_game`, `restart_game`을 구현하고 메인 루프 Enter 처리를 확장합니다.
- **입력 코드**:
```python
# Mission 클래스 내부
    def reset_game(self):
        self.pause_game(f'최종 점수: {self.score}', '다시 시작하려면 Enter를 누르세요')
        self.state = 'game_over'

    def restart_game(self):
        self.score = 0
        self.round_number = 1
        self.scout.lives = 5
        self.scout_pulses.empty()
        self.raider_pulses.empty()
        self.start_new_round()

# 메인 루프 KEYDOWN 처리
            if event.key == pygame.K_RETURN:
                if mission.state == 'paused':
                    mission.state = 'playing'
                elif mission.state == 'game_over':
                    mission.restart_game()
```
- **줄 설명**:
  - `reset_game`은 최종 점수 안내 문구와 `game_over` 상태만 설정하고 즉시 반환합니다. 절대로 이 자리에서 새 라운드를 시작하여 점수를 지우지 않습니다!
  - `restart_game`은 플레이어가 Enter를 눌렀을 때 비로소 점수 0, 라운드 1, 생명 5로 초기화하고 새 55기를 출격시킵니다.
- **빠른 시험 및 복원**:
  - 메인 루프 전에 임시로 `scout.lives = 0`을 넣고 `mission.check_game_status('피격', 'Enter')`를 호출해보세요. 화면에 '최종 점수: 0'이 유지되고 Enter를 누르면 1라운드로 새 게임이 시작되는 것을 확인한 뒤 임시 코드를 삭제합니다.

---

### [10-B] Mission.check_collisions() 충돌 검사와 상태 가드

- **목표**: 아군 탄환-적 드론, 적 탄환-우주선, 적 함체-우주선의 충돌을 검사하고 점수를 부여합니다.
- **교체 위치**: `Mission.check_collisions()`를 구현하고 `Mission.update`에서 상태 가드를 적용합니다.
- **입력 코드**:
```python
# Mission 클래스 내부
    def update(self):
        self.shift_raiders()
        if self.state != 'playing':
            return
        self.check_collisions()
        if self.state != 'playing':
            return
        self.check_round_completion()

    def check_collisions(self):
        # 1. 아군 탄환과 적 드론 충돌 (동시 격추 시 킬당 100점)
        hits = pygame.sprite.groupcollide(self.scout_pulses, self.raiders, True, True)
        if hits:
            self.raider_break_sound.play()
            for hit_raiders in hits.values():
                self.score += 100 * len(hit_raiders)

        # 2. 적 탄환과 아군 우주선 충돌
        if pygame.sprite.spritecollide(self.scout, self.raider_pulses, True):
            self.shield_hit_sound.play()
            self.check_game_status('피격되었습니다!', '계속하려면 Enter를 누르세요')
            return

        # 3. 적 함체와 아군 우주선 직접 충돌
        if pygame.sprite.spritecollide(self.scout, self.raiders, False):
            self.shield_hit_sound.play()
            self.check_game_status('적과 충돌했습니다!', '계속하려면 Enter를 누르세요')
```
- **줄 설명**:
  - `if self.state != 'playing': return`: 침범이나 피격으로 이미 정지/게임오버가 되었으면 그 프레임의 후속 검사를 즉시 중단하여 상태가 덮어씌워지는 모순을 방지합니다.
  - `hits.values()`: 1발로 2기를 동시 격추해도 `len(hit_raiders)`를 곱해 정확히 200점을 가산합니다.

---

### [10-C] check_round_completion() 편대 전멸과 라운드 보너스 (게임 완성!)

- **목표**: 55기를 모두 격파했을 때 양쪽 탄환을 비우고 라운드 보너스를 지급한 뒤 더 강력해진 다음 라운드를 출격시킵니다.
- **교체 위치**: `Mission.check_round_completion()`을 구현합니다.
- **입력 코드**:
```python
# Mission 클래스 내부
    def check_round_completion(self):
        if not self.raiders:
            self.scout_pulses.empty()
            self.raider_pulses.empty()
            self.score += 1000 * self.round_number
            self.round_number += 1
            self.new_round_sound.play()
            self.start_new_round()
            self.pause_game('라운드 정복!', f'라운드 {self.round_number} 준비 - Enter를 누르세요')
```
- **줄 설명**:
  - `self.scout_pulses.empty()`, `self.raider_pulses.empty()`: 이전 라운드의 탄환이 새 라운드로 넘어가지 않도록 깨끗이 소거합니다.
  - `self.score += 1000 * self.round_number`: 증가 전 현재 라운드 번호에 비례한 정복 보너스를 지급합니다.
  - `self.start_new_round()`: 새 55기 편대를 소환하고 기체를 중앙으로 정돈합니다.
- **여기서 실행하세요**:
  1. 스튜디오 상단의 초록색 **[실행]** 버튼을 누릅니다!
  2. 스페이스바로 적들을 요격하고, 붉은 레이저를 회피하며 우주 방어대 전 과정을 플레이해보세요!
- **관찰 결과**:
  - 적 요격 시 100점과 경쾌한 폭발음!
  - 피격 시 쉴드 타격음과 함께 일시정지 안내창!
  - 55기 전멸 시 팡파르와 함께 1000점 보너스 획득 및 다음 라운드 출격!
  - 기체 소진 시 '최종 점수: XXX'가 보존되고 Enter를 누르면 새 게임 시작!

---

## 3. 학생 작전 점검 체크리스트
- [ ] 적 격추 시 100점과 폭발음이 발생하는가?
- [ ] 게임오버 시 최종 점수가 Enter 전까지 지워지지 않고 보존되는가?
- [ ] 55기 전멸 시 양쪽 탄환이 정리되고 1000*round_number 보너스가 가산되는가?
- [ ] 10유닛의 모든 코드를 완주하여 나만의 스페이스 인베이더를 완성했는가?
"""
