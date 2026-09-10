# -*- coding: utf-8 -*-
"""
gen_datalogs_content.py
Provides complete content for Data Logs 01 through 10.
"""

def get_datalog_contents():
    logs = {}
    
    # -------------------------------------------------------------
    # Data Log 01
    # -------------------------------------------------------------
    logs[1] = """# Data Log 01 — 작전 본부와 우주 방어대 비행 규칙

- 강의 대응: 원강의 51강 Preview (lecture ID: 27597170)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요: 우주 방어대란 어떤 게임인가?

아케이드 고전 명작 **스페이스 인베이더(Space Invaders)**를 현대적인 파이썬과 Pygame 코드로 직접 제작하는 프로젝트에 오신 것을 환영합니다! 우리가 만들 게임의 이름은 **우주 방어대**입니다.

동영상을 멈추고 되돌려 보는 대신, 이 **Data Log** 문서를 한 단계씩 따라가며 코드를 입력하고, 즉시 실행하여 결과를 확인하는 방식으로 게임을 완성하게 됩니다.

### 게임의 기본 규칙
1. **아군 탐사선 (Scout)**: 플레이어가 조종하는 우주선입니다. 화면 맨 아래에서 좌우 방향키(`←`, `→`)로만 이동할 수 있습니다.
2. **외계 침략 드론 (Raider)**: 11열 × 5행, 총 55기로 이루어진 거대한 편대를 이룹니다. 좌우로 행진하며 화면 끝에 닿을 때마다 방향을 바꾸고 아래로 하강합니다. 1라운드에는 10픽셀씩 하강하며, 이후 라운드마다 `10 × 라운드 번호`만큼 더 큰 폭으로 내려앉습니다.
3. **최후 방어선**: 화면 아래쪽(세로 좌표 Y=630)에 흰색 방어선이 그어져 있습니다. 적 함선이 이 선을 침범하면 경보음이 울리며 탐사선의 기체 생명이 1개 깎입니다.
4. **플라즈마 탄환 발사**:
   - 플레이어는 `스페이스바`를 눌러 청록빛 탄환(`Pulse`)을 위로 발사합니다. 화면에는 **최대 2발**까지만 동시에 존재할 수 있습니다.
   - 적 드론들도 무작위로 붉은 탄환(`RaiderPulse`)을 아래로 발사합니다. 적 탄환 역시 편대 전체에서 화면에 **최대 2발**까지만 존재할 수 있습니다.
5. **점수와 라운드**:
   - 적 드론을 1대 격추할 때마다 **100점**을 획득합니다.
   - 55기의 드론을 모두 격추하면 해당 라운드를 정복하게 되며, **1000 × 라운드 번호**의 대규모 보너스 점수가 지급되고 더 빠른 다음 편대가 출격합니다.
   - 아군의 남은 기체는 처음에 5대 주어지며, 기체가 모두 소진되어 생명이 0 이하가 되면 최종 점수가 표시되고 게임오버 화면이 유지됩니다.

---

## 2. 메타센스 게임 스튜디오 수업 준비

우리 수업은 별도의 프로그램 설치(Python, VS Code, 터미널, pip 등)가 전혀 필요하지 않습니다. 모든 과정은 여러분이 보고 계신 **메타센스 게임 스튜디오** 안에서 진행됩니다.

### 스튜디오 프로젝트 준비 순서
1. 화면 상단 메뉴에서 **내 프로젝트**를 클릭합니다.
2. 메뉴 목록에서 **[우주 방어대 수업 준비]** 버튼을 누릅니다.
3. 왼쪽 파일 목록에 다음 항목들이 나타나는지 확인합니다:
   - `main.py`: 우리가 코드를 작성할 비어 있는 메인 파일입니다.
   - `assets/`: 게임에 사용할 그림 2개, 소리 6개, 한글 폰트가 들어 있는 폴더입니다.
     - `images/scout.png` (플레이어 탐사선 이미지)
     - `images/raider.png` (외계 드론 이미지)
     - `fonts/Dohyeon.ttf` (배달의민족 도현체 한글 폰트)
     - `sounds/scout_pulse.wav` (플레이어 발사음)
     - `sounds/raider_pulse.wav` (적 드론 발사음)
     - `sounds/raider_break.wav` (적 격추 폭발음)
     - `sounds/shield_hit.wav` (플레이어 피격음)
     - `sounds/breach.wav` (방어선 침범 경보음)
     - `sounds/new_round.wav` (새 라운드 출격음)

> **주의**: 게임 스튜디오는 작성한 코드를 브라우저에 자동 저장합니다. 프로젝트를 안전하게 보관하려면 상단의 다운로드 버튼을 눌러 **.mspygame.json** 프로젝트 파일을 내려받으세요. (별도 제공되는 시작 묶음 ZIP 파일은 압축을 푼 뒤 폴더 가져오기 메뉴를 사용합니다.)

---

## 3. 단계별 실습: 01-A 첫 파이썬 코드 실행

### [01-A] Pygame 초기화와 환경 확인

- **목표**: 파이썬 인터프리터와 Pygame 엔진이 게임 스튜디오 안에서 올바르게 구동되는지 확인합니다.
- **이유**: 본격적인 그래픽 창을 띄우기 전에 라이브러리 임포트와 버전 확인을 통해 런타임 환경의 무결성을 검증합니다.
- **교체 위치**: 비어 있는 `main.py` 파일의 1번째 줄부터 입력합니다.
- **입력 코드**:
```python
import pygame

pygame.init()
print("우주 방어대 수업 준비 완료!")
print("Pygame 버전:", pygame.__version__)
```
- **줄 설명**:
  - `import pygame`: 2D 게임 개발에 필요한 Pygame 모듈 전체를 프로그램 안으로 불러옵니다.
  - `pygame.init()`: 디스플레이, 폰트, 사운드 믹서 등 Pygame 내부 엔진의 하위 모듈들을 일괄 초기화합니다.
  - `print("우주 방어대 수업 준비 완료!")`: 콘솔 출력 창에 수업 시작을 알리는 환영 문구를 출력합니다.
  - `print("Pygame 버전:", pygame.__version__)`: 현재 스튜디오에 탑재된 Pygame의 버전 정보를 콘솔에 보여줍니다.
- **여기서 실행하세요**:
  1. 에디터 상단의 초록색 **[실행 (Run)]** 버튼을 클릭합니다.
  2. 에디터 하단의 **[콘솔(터미널) 탭]**을 확인합니다.
- **관찰 결과**:
  - 콘솔 탭에 다음 두 줄의 메시지가 깨끗하게 출력됩니다:
    ```text
    우주 방어대 수업 준비 완료!
    Pygame 버전: 2.x.x
    ```
- **정상 미구현**:
  - 아직 그래픽 화면 창(`set_mode`)을 열지 않았으므로 화면 캔버스는 뜨지 않고 콘솔 글자만 나타나는 것이 정상입니다.
- **실패 진단**:
  - `NameError: name 'pygame' is not defined`: 1번째 줄의 `import pygame` 철자가 틀렸거나 누락되었습니다.
  - `SyntaxError`: 따옴표나 괄호의 짝이 맞지 않았습니다. 코드를 다시 복사하거나 오타를 교정하세요.

---

## 4. 학생 작전 점검 체크리스트
- [ ] 메타센스 게임 스튜디오에서 `assets/` 폴더 안의 이미지, 사운드, 폰트 파일이 정상적으로 존재하는지 확인했는가?
- [ ] `main.py`에 코드를 작성하고 실행 버튼을 눌러 콘솔에 환영 메시지와 버전을 출력했는가?
- [ ] 브라우저 환경에서 프로젝트를 보관하는 `.mspygame.json` 파일의 다운로드 위치를 확인했는가?
"""

    # -------------------------------------------------------------
    # Data Log 02
    # -------------------------------------------------------------
    logs[2] = """# Data Log 02 — 우리의 우주 창 열기와 5개 클래스 설계도

- 강의 대응: 원강의 52강 윈도우 생성 및 루프 (lecture ID: 27597174)
- 작성 환경: 메타센스 게임 스튜디오 (웹 브라우저)

---

## 1. 작전 개요: 그래픽 캔버스와 5대 클래스 설계도

이번 단원에서는 새까만 콘솔 창을 벗어나, 우리만의 우주가 펼쳐질 **1200 × 700 해상도의 그래픽 게임 창**을 엽니다. 또한 초당 60번씩 세상을 갱신하는 **메인 이벤트 루프**를 구축하고, 앞으로 10단원에 걸쳐 구현할 우주 방어대의 핵심 **5대 클래스(Scout, Pulse, Raider, RaiderPulse, Mission)**의 뼈대를 선언합니다.

---

## 2. 단계별 실습

### [02-A] 1200x700 게임 창 생성과 60FPS 이벤트 루프

- **목표**: 너비 1200, 높이 700 해상도의 게임 화면을 열고, 60FPS로 유지되는 이벤트 루프를 구축합니다.
- **이유**: 게임은 사용자의 조작과 움직임을 매 순간 반영해야 하므로 1초에 60번씩 반복되는 무한 루프(`while running:`)가 필요합니다.
- **교체 위치**: `main.py` 파일의 전체 내용을 아래 코드로 교체합니다.
- **입력 코드**:
```python
import pygame
import random

pygame.init()

SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 700
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('우주 방어대')

FPS = 60
clock = pygame.time.Clock()

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((9, 17, 37))
    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
```
- **줄 설명**:
  - `SCREEN_WIDTH = 1200`, `SCREEN_HEIGHT = 700`: 화면 크기를 상수로 정의합니다.
  - `screen = pygame.display.set_mode(...)`: 1200x700 픽셀 크기의 그래픽 도화지(Surface)를 생성합니다.
  - `clock = pygame.time.Clock()`: 게임 속도를 제어할 시계 객체를 생성합니다.
  - `while running:`: 사용자가 종료를 누를 때까지 끝없이 도는 게임 메인 루프입니다.
  - `for event in pygame.event.get():`: 마우스, 키보드, 창 닫기 등의 이벤트를 수집합니다.
  - `screen.fill((9, 17, 37))`: 배경 도화지를 짙은 남색(RGB: 9, 17, 37)으로 칠합니다.
  - `pygame.display.update()`: 도화지에 새로 그린 그림을 모니터 화면에 출력합니다.
  - `clock.tick(FPS)`: 1초에 정확히 60번만 돌도록 속도를 제한합니다.
- **여기서 실행하세요**:
  1. 상단의 **[실행]** 버튼을 클릭합니다.
  2. 스튜디오 우측의 게임 캔버스 화면을 확인합니다.
  3. 스튜디오 상단의 **[정지 (Stop)]** 버튼을 눌러 게임이 안전하게 종료되는지 확인합니다. (데스크톱의 독립 창 X 버튼과 브라우저의 정지 버튼을 구별하세요.)
- **관찰 결과**:
  - 게임 화면 영역에 1200×700 크기의 짙은 남색 우주 배경이 깜빡임 없이 안정적으로 열립니다.
- **정상 미구현**:
  - 아직 우주선이나 적을 그리지 않았으므로 짙은 남색 배경만 떠 있는 것이 정상입니다.
- **실패 진단**:
  - `IndentationError`: while문이나 for문 아래의 들여쓰기가 4칸으로 일치하지 않습니다. 스튜디오 에디터에서 들여쓰기를 정돈하세요.

---

### [02-B] 우주 배경 색상 변경 실험

- **목표**: `screen.fill`의 RGB 색상 값을 변경하여 화면 분위기를 바꿔봅니다.
- **이유**: RGB 튜플 색상이 게임 화면에 즉시 어떻게 렌더링되는지 체감합니다.
- **교체 위치**: `main.py`의 `screen.fill((9, 17, 37))` 줄을 교체합니다.
- **입력 코드**:
```python
    screen.fill((15, 45, 65))
```
- **줄 설명**:
  - Red(15), Green(45), Blue(65)로 청록빛이 감도는 깊은 바다 같은 우주 색상으로 바꿉니다.
- **여기서 실행하세요**:
  1. 정지 상태에서 코드를 수정하고 **[실행]**을 누릅니다.
  2. 화면 색상이 살짝 밝아진 청록빛 남색으로 변하는 것을 확인합니다.
- **관찰 결과**:
  - 배경이 짙은 남색에서 깊이감 있는 청록색으로 부드럽게 변경됩니다.
- **정상 미구현**:
  - 여전히 스프라이트는 존재하지 않습니다.
- **실패 진단**:
  - `TypeError: invalid color argument`: 튜플 괄호 `((15, 45, 65))`를 이중으로 씌우지 않았을 때 발생합니다.

---

### [02-C] 5대 클래스와 메서드 pass 뼈대 정의

- **목표**: Scout, Pulse, Raider, RaiderPulse, Mission 5개 클래스와 향후 구현할 메서드들의 pass 뼈대를 선언합니다.
- **이유**: 클래스에 메서드 시그니처 뼈대가 미리 잡혀 있어야 03단원부터 각 부품을 조립할 때 문법 오류 없이 순차적으로 채워나갈 수 있습니다.
- **교체 위치**: `clock = pygame.time.Clock()` 아래와 `running = True` 사이에 클래스 뼈대를 삽입합니다.
- **입력 코드**:
```python
# --- 클래스 설계도 ---
class Mission:
    def __init__(self, scout, raiders, scout_pulses, raider_pulses):
        pass

    def update(self):
        pass

    def draw(self):
        pass

    def shift_raiders(self):
        pass

    def check_collisions(self):
        pass

    def check_round_completion(self):
        pass

    def check_game_status(self, text, subtitle):
        pass

    def pause_game(self, text, subtitle):
        pass

    def reset_game(self):
        pass

    def restart_game(self):
        pass

    def start_new_round(self):
        pass


class Scout(pygame.sprite.Sprite):
    def __init__(self, scout_pulses):
        super().__init__()

    def update(self):
        pass

    def fire(self):
        pass

    def reset(self):
        pass


class Pulse(pygame.sprite.Sprite):
    def __init__(self, x, y, owner):
        super().__init__()

    def update(self):
        pass


class Raider(pygame.sprite.Sprite):
    def __init__(self, x, y, raider_pulses):
        super().__init__()

    def update(self):
        pass

    def fire(self):
        pass

    def reset(self):
        pass


class RaiderPulse(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()

    def update(self):
        pass
```
- **줄 설명**:
  - `class Mission`: 게임 전체 상태, 점수, 라운드, 충돌을 총괄할 사령탑 클래스입니다.
  - `class Scout`: 플레이어가 조종할 아군 탐사선 클래스입니다.
  - `class Pulse`: 아군이 발사하는 청록빛 플라즈마 탄환 클래스입니다.
  - `class Raider`: 외계 침략군 드론 편대원 클래스입니다.
  - `class RaiderPulse`: 적 드론이 아래로 발사하는 붉은 탄환 클래스입니다.
  - 각 메서드 내부의 `pass`: 코드를 아직 채우지 않았음을 나타내는 파이썬 키워드로, 문법 에러를 방지합니다.
- **여기서 실행하세요**:
  1. **[실행]** 버튼을 눌러 프로그램이 에러 없이 구동되는지 확인합니다.
- **관찰 결과**:
  - 아무런 에러 없이 청록빛 화면이 안정적으로 유지됩니다.
- **정상 미구현**:
  - 설계도(클래스)만 정의했을 뿐 인스턴스를 생성하지 않았으므로 화면에는 아직 아무것도 그려지지 않습니다.
- **실패 진단**:
  - `IndentationError: expected an indented block after function definition`: `pass`를 빼먹은 메서드가 있는지 확인하세요.

---

## 3. 학생 작전 점검 체크리스트
- [ ] 1200x700 해상도의 청록빛 게임 창이 에러 없이 실행되는가?
- [ ] 스튜디오 상단의 정지 버튼으로 안전하게 종료되는지 확인했는가?
- [ ] 5개 클래스와 메서드 pass 뼈대가 정확한 들여쓰기로 작성되었는가?
"""

    # We will write generating code for the remaining units (03 through 10)
    # in the next helper functions.
    from gen_datalogs_content_rest import append_remaining_logs
    append_remaining_logs(logs)
    
    return logs
