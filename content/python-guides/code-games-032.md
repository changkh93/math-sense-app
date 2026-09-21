## 이 코드가 놓인 수업

**게임 프로젝트 → 완성 (21 ~ 30) → pause_game 및 reset_game**에서 가져온 ‘2단계: Player 클래스 전체 따라쓰기’ 코드입니다. 단원 전체를 요약하는 대신 이 단계가 담당하는 작업을 한 가지씩 읽습니다. 코드 속 이름·점수·예시 자료는 교재의 연습 데이터이며 실제 학생의 기록이나 성과를 소개하는 자료가 아닙니다.

학습 목표는 코드를 그대로 입력하는 데서 멈추지 않고, 어떤 값이 준비되고 어떤 조건에서 결과가 달라지는지를 설명하는 것입니다. 다음 질문에 먼저 답을 적고 코드와 대조해 보세요.

> 조건 `self.safe > 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?

## 원본 코드와 핵심 줄

```python
class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.image.load('knight.png')
        self.rect = self.image.get_rect()
        self.rect.centerx = WINDOW_WIDTH / 2
        self.rect.bottom = WINDOW_HEIGHT

        self.velocity = 8
        self.lives = 5
        self.safe = 3

        #사운드 설정
        self.catch_sound = pygame.mixer.Sound('success.mp3')
        self.die_sound = pygame.mixer.Sound('die.mp3')
        self.safe_zone_sound = pygame.mixer.Sound('safe_zone.mp3')

    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.velocity
        elif keys[pygame.K_RIGHT] and self.rect.right < WINDOW_WIDTH:
            self.rect.x += self.velocity
        elif keys[pygame.K_UP] and self.rect.top > 100:
            self.rect.y -= self.velocity
        elif keys[pygame.K_DOWN] and self.rect.bottom < WINDOW_HEIGHT - 100:
            self.rect.y += self.velocity

    def reset(self):
        self.rect.centerx = WINDOW_WIDTH / 2
        self.rect.bottom = WINDOW_HEIGHT

    def safe_zone(self):
        if self.safe > 0:
            self.safe -= 1
            self.safe_zone_sound.play()
            self.rect.bottom = WINDOW_HEIGHT
```

아래 행 번호는 위 코드 블록의 첫 줄을 1행으로 셉니다. 긴 예제에서는 주요 문장 10개까지 짚었습니다. 함수 안의 줄은 함수를 호출할 때 실행되므로, 행 번호 순서와 실제 실행 순서가 항상 같은 것은 아닙니다.

- **1행**: `Player` 클래스에 상태와 행동을 묶습니다. 이 이름으로 만든 객체의 값은 객체마다 달라질 수 있습니다.
- **2행**: `__init__(self)` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다.
- **3행**: `super().__init__()`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.
- **4행**: `self.image`에 `pygame.image.load('knight.png')`의 값을 저장합니다.
- **5행**: `self.rect`에 `self.image.get_rect()`의 값을 저장합니다.
- **6행**: `self.rect.centerx`에 `WINDOW_WIDTH / 2`의 값을 저장합니다.
- **7행**: `self.rect.bottom`에 `WINDOW_HEIGHT`의 값을 저장합니다.
- **9행**: `self.velocity`에 `8`의 값을 저장합니다.
- **10행**: `self.lives`에 `5`의 값을 저장합니다.
- **11행**: `self.safe`에 `3`의 값을 저장합니다.

## 실행 전에 준비할 것과 확인 결과

이 예제는 **앞 단계 코드 또는 별도 실행 환경이 필요한 코드 읽기 자료**입니다. 문법은 확인했지만 이 블록만의 완성 프로그램 실행은 확인하지 않았습니다. 확인한 실행 조건: 자료 파일 또는 별도 실행 환경 필요. Pygame 프로젝트의 이미지·폰트·소리 파일과 클래스 정의는 원래 프로젝트에서 함께 준비하세요.

## 결과를 이해하는 확인 활동

### 이미지 파일을 준비하는 단계

이미지 경로는 현재 실행하는 프로젝트의 폴더를 기준으로 찾습니다. 파일 이름의 대소문자나 확장자가 다르면 읽지 못합니다. convert_alpha를 쓰는 경우 디스플레이가 먼저 준비되어 있어야 합니다.

**확인 활동:** 파일을 읽는 줄과 실제 화면에 붙이는 줄을 구분하세요. 이미지 로드 성공만으로 화면에 보이는 것은 아닙니다.

### 효과음과 배경음악

소리 파일을 불러오는 작업과 재생하는 작업은 별개입니다. 같은 사건이 매 프레임 참이면 소리가 반복해서 시작될 수 있습니다. 재생을 한 번만 시작할 사건인지 계속 유지할 상태인지 구분합니다.

**확인 활동:** 볼륨을 낮춘 뒤 한 번의 사건에서 재생이 몇 번 호출되는지 먼저 출력으로 확인하세요.

### 속도가 위치를 바꾸는 순서

속도는 현재 위치가 아니라 위치의 변화량입니다. 마찰이나 중력은 속도를 바꾸며, 그 속도가 다음 위치에 반영됩니다. 경계에서 위치를 보정하는 코드와 속도를 뒤집는 코드는 역할이 다릅니다.

**확인 활동:** 한 프레임 전후의 위치와 속도를 각각 적고 어떤 대입이 먼저 일어나는지 따라가세요.

## 한 번 바꾸고, 이유를 남기기

1. 원래 코드의 복사본을 준비하고 바꾸려는 줄을 하나 고릅니다. 위 확인 활동에 제시한 입력·조건·설정 중 하나만 선택하세요.
2. 바꾸기 전에 예상 결과를 한 문장으로 적습니다. 오류가 예상된다면 오류가 날 이유와 위치도 적어 둡니다.
3. 필요한 실행 환경과 앞 단계 정의를 준비한 뒤 실행합니다. 원본과 수정본을 번갈아 보면서 값·문자·그림 중 무엇이 달라졌는지 기록합니다.
4. ‘작동했다’ 대신 **바꾼 줄 → 관찰한 결과 → 그렇게 된 이유**를 남깁니다. 예상과 다르면 마지막 오류 메시지와 관련된 줄을 함께 가져와 질문합니다.

이 글의 확인 질문은 **조건 `self.safe > 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?** 입니다. 보호자는 정답을 먼저 알려주기보다 아이가 실제 변수나 조건을 짚어 설명하는지 들어보세요. 어려워하면 단원 전체를 다시 시키기보다 위 핵심 줄 중 막힌 한 줄로 범위를 좁힙니다.

[같은 과정의 코드 노트 목록](/python/guides/courses/games/)에서 앞뒤 단계를 이어 볼 수 있습니다. 실행 환경이나 시작 단계가 궁금하면 [파이썬 과정 안내](/python)를 확인하세요.
