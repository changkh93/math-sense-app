## 이 코드가 놓인 수업

**게임 프로젝트 → 완성 (21 ~ 30) → pause_game 및 reset_game**에서 가져온 ‘1단계: 전체 구조와 필수 이름 익히기’ 코드입니다. 단원 전체를 요약하는 대신 이 단계가 담당하는 작업을 한 가지씩 읽습니다. 코드 속 이름·점수·예시 자료는 교재의 연습 데이터이며 실제 학생의 기록이나 성과를 소개하는 자료가 아닙니다.

학습 목표는 코드를 그대로 입력하는 데서 멈추지 않고, 어떤 값이 준비되고 어떤 조건에서 결과가 달라지는지를 설명하는 것입니다. 다음 질문에 먼저 답을 적고 코드와 대조해 보세요.

> 조건 `event.type == pygame.QUIT`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?

## 원본 코드와 핵심 줄

```python
import pygame
import random

pygame.init()

WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 700

window_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption('몬스터 잡기 게임')

FPS = 60
clock = pygame.time.Clock()

class Game():
    def __init__(self, player, monster_group):
        pass

    def update(self):
        pass

    def draw(self):
        pass

    def check_collision(self):
        pass

    def choose_new_wanted(self):
        pass

    def start_new_round(self):
        pass

    def pause_game(self, main_text, sub_text):
        pass

    def reset_game(self):
        pass

class Player(pygame.sprite.Sprite):
    def __init__(self):
        pass

    def update(self):
        pass

    def reset(self):
        pass

    def safe_zone(self):
        pass

class Monster(pygame.sprite.Sprite):
    def __init__(self, x, y, image, monster_type):
        pass

    def update(self):
        pass

my_player_group = pygame.sprite.Group()
my_player = Player()
my_player_group.add(my_player)

my_monster_group = pygame.sprite.Group()

my_game = Game(my_player, my_monster_group)
my_game.pause_game('Monster Collecting', "Press 'Enter' to begin")

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
```

아래 행 번호는 위 코드 블록의 첫 줄을 1행으로 셉니다. 긴 예제에서는 주요 문장 10개까지 짚었습니다. 함수 안의 줄은 함수를 호출할 때 실행되므로, 행 번호 순서와 실제 실행 순서가 항상 같은 것은 아닙니다.

- **4행**: `pygame.init()`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.
- **6행**: `WINDOW_WIDTH`에 `1200`의 값을 저장합니다.
- **7행**: `WINDOW_HEIGHT`에 `700`의 값을 저장합니다.
- **9행**: `window_surface`에 `pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))`의 값을 저장합니다.
- **10행**: `pygame.display.set_caption('몬스터 잡기 게임')`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.
- **12행**: `FPS`에 `60`의 값을 저장합니다.
- **13행**: `clock`에 `pygame.time.Clock()`의 값을 저장합니다.
- **15행**: `Game` 클래스에 상태와 행동을 묶습니다. 이 이름으로 만든 객체의 값은 객체마다 달라질 수 있습니다.
- **16행**: `__init__(self, player, monster_group)` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다.
- **19행**: `update(self)` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다.

## 실행 전에 준비할 것과 확인 결과

이 예제는 **앞 단계 코드 또는 별도 실행 환경이 필요한 코드 읽기 자료**입니다. 문법은 확인했지만 이 블록만의 완성 프로그램 실행은 확인하지 않았습니다. 확인한 실행 조건: 별도 환경 필요: pygame. Pygame 프로젝트의 이미지·폰트·소리 파일과 클래스 정의는 원래 프로젝트에서 함께 준비하세요.

## 결과를 이해하는 확인 활동

### 게임 화면의 좌표 범위

창 크기는 (가로, 세로) 순서입니다. 보통 왼쪽 위가 (0,0)이고 x는 오른쪽, y는 아래쪽으로 증가합니다. 화면 크기를 바꾸면 객체의 시작 위치와 경계 조건도 함께 검토해야 합니다.

**확인 활동:** 가로와 세로 값을 서로 바꾸었을 때 창의 비율과 중앙 좌표가 어떻게 달라질지 계산해 보세요.

### 프레임 속도를 제한하는 이유

Clock.tick은 루프가 지나치게 빠르게 돌지 않도록 제한합니다. 프레임마다 고정 거리만 움직이면 FPS 설정에 따라 초당 이동 거리가 달라질 수 있습니다. 시간차 기반 이동과 고정 프레임 이동을 섞지 않습니다.

**확인 활동:** FPS와 한 프레임 이동량을 기록하고, 1초 동안 예상한 이동 거리와 실제 이동을 비교하세요.

### 창 닫기 사건도 읽어야 합니다

이벤트 큐를 매 프레임 읽어야 창 닫기나 키 입력을 처리할 수 있습니다. 화면을 그리는 코드만 반복하는 것과 사용자의 사건을 받아 게임 상태를 바꾸는 것은 별개의 작업입니다.

**확인 활동:** 프로젝트에서 창 닫기를 실행해 반복이 끝나는지 확인하세요. 중첩 반복이 있다면 break가 어느 반복을 끝내는지도 짚으세요.

## 한 번 바꾸고, 이유를 남기기

1. 원래 코드의 복사본을 준비하고 바꾸려는 줄을 하나 고릅니다. 위 확인 활동에 제시한 입력·조건·설정 중 하나만 선택하세요.
2. 바꾸기 전에 예상 결과를 한 문장으로 적습니다. 오류가 예상된다면 오류가 날 이유와 위치도 적어 둡니다.
3. 필요한 실행 환경과 앞 단계 정의를 준비한 뒤 실행합니다. 원본과 수정본을 번갈아 보면서 값·문자·그림 중 무엇이 달라졌는지 기록합니다.
4. ‘작동했다’ 대신 **바꾼 줄 → 관찰한 결과 → 그렇게 된 이유**를 남깁니다. 예상과 다르면 마지막 오류 메시지와 관련된 줄을 함께 가져와 질문합니다.

이 글의 확인 질문은 **조건 `event.type == pygame.QUIT`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?** 입니다. 보호자는 정답을 먼저 알려주기보다 아이가 실제 변수나 조건을 짚어 설명하는지 들어보세요. 어려워하면 단원 전체를 다시 시키기보다 위 핵심 줄 중 막힌 한 줄로 범위를 좁힙니다.

[같은 과정의 코드 노트 목록](/python/guides/courses/games/)에서 앞뒤 단계를 이어 볼 수 있습니다. 실행 환경이나 시작 단계가 궁금하면 [파이썬 과정 안내](/python)를 확인하세요.
