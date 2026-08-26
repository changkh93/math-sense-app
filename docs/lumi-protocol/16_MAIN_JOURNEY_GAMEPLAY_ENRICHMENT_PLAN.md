# LUMI Protocol 본편 학습 여정·게임플레이 강화 계획

- 작성일: 2026-08-26
- 대상: `PYTHON LEARNING JOURNEY — 루미와 함께 배우는 Python`
- 제외: `EXTRA CHALLENGES — 객체와 자율항법 심화 도전`의 전면 개편
- 문서 성격: 제품·교육·콘텐츠·런타임 통합 설계안

## 1. 결론

현재 본편을 폐기하지 않는다. Python 개념 순서, 기존 월드 실행기, 코드 Trace, 보상·진도 체계는 유지한다. 대신 다음 세 가지를 고친다.

1. 동일한 이동 결과를 변수명만 바꾸어 반복하는 미션을 통합하거나 교체한다.
2. 각 ACT가 서로 다른 게임 시스템을 복원하도록 플레이 경험을 분리한다.
3. pygame의 핵심 사고 모델인 장면 초기화, 이미지 배치, 도형 그리기, 텍스트, 사운드, 게임 루프, 키 입력, 충돌, 적 대응을 ACT별 Python 개념과 연결한다.

학생이 배우는 것은 가짜 pygame 문법이 아니라 Python의 실제 문법이다. LUMI 전용 게임 API는 브라우저에서 안전하고 결정론적으로 실행되는 작은 교육용 계층으로 만들고, 각 미션 종료 시 pygame 대응표를 보여 준다.

## 2. 현재 중복 문제 진단

### 2.1 직접 중복

| 미션 | 현재 학습 행동 | 문제 |
| --- | --- | --- |
| 0-7 `첫 기억 슬롯` | `steps = 3`, `lumi.move(steps)` | 내부 분류부터 ACT 2이며 2-1과 사실상 동일하다. |
| 2-1 `첫 기억 슬롯` | `steps = 3`, `lumi.move(steps)` | 0-7의 재수행이다. |
| 2-2 `좋은 신호 이름` | `target_steps = 4`, `lumi.move(target_steps)` | 변수명만 바뀌고 화면 결과와 사고 과정은 같다. |

### 2.2 구조적 중복

- 많은 미션의 최종 장면이 “숫자를 정한다 → 앞으로 이동한다 → 비콘에 도착한다”로 수렴한다.
- Python 개념은 달라도 화면 변화가 루미의 위치 변화에 집중되어 학습자가 다른 능력을 익혔다고 느끼기 어렵다.
- `print`, f-string, list, 함수 같은 개념이 월드 안의 실제 게임 시스템과 충분히 연결되지 않는다.
- 장애물은 대부분 정적인 지뢰다. 시간에 따라 달라지는 위협, 반응, 선택, 방어, 추격의 긴장이 부족하다.

## 3. 개편 원칙

### 3.1 한 ACT, 한 게임 시스템

각 ACT는 Python 문법뿐 아니라 눈에 보이는 게임 시스템 하나를 복원한다.

```text
ACT 0  실행하면 세계가 깨어난다
ACT 1  화면에 장면과 오브젝트를 만든다
ACT 2  변수로 HUD와 상태를 기억한다
ACT 3  센서와 입력을 읽는다
ACT 4  충돌·공격·위험에 따라 행동을 고른다
ACT 5  별·적·효과를 for로 한꺼번에 만든다
ACT 6  while 게임 루프에서 시간이 흐르고 상태가 변한다
ACT 7  여러 오브젝트와 인벤토리를 list/dict로 관리한다
ACT 8  이동·발사·판정을 함수로 나눈다
FINAL  학생이 만든 시스템이 자율적으로 한 판을 완주한다
```

### 3.2 같은 문법을 다른 감각으로 재노출

반복 복습은 필요하지만 결과까지 같으면 안 된다.

- 첫 노출: 코드를 읽고 실행한다.
- 두 번째 노출: 값을 바꾸어 시각 결과를 바꾼다.
- 세 번째 노출: 소리·HUD·충돌·적 반응 등 다른 결과에 적용한다.
- Field Test: 정답 모양이 아니라 변형 상황에서도 작동하는지 확인한다.

### 3.3 새 API는 한 미션에 최대 1~2개

새 메서드가 나오면 다음 네 가지를 반드시 보여 준다.

1. 무엇을 하는가
2. 괄호 안에 무엇을 넣는가
3. 실행하면 화면·상태가 어떻게 바뀌는가
4. pygame에서는 어떤 개념에 대응하는가

### 3.4 전투는 “파괴”보다 “방어·정화·복구”로 표현

적은 우주 생명체가 아니라 신호 폭풍에 감염된 드론·포탑이다. 학생은 보호막, 회피, 방해 전파, 정화 펄스를 사용해 무력화하거나 복구한다. 긴장감은 유지하되 폭력적 묘사는 피한다.

## 4. 중복 미션 즉시 개편안

기존 ID의 의미를 덮어쓰지 않는다. 기존 완료 기록과 보상 거래 ID를 보호하기 위해 구 미션은 `legacy`로 숨기고 새 ID를 만든다.

### 4.1 ACT 0

ACT 0의 정식 Core는 원래 명세대로 0-1~0-6의 한 세션으로 끝낸다. 0-7~0-10은 후속 ACT의 개념 미리보기였으므로 신규 학생의 본편 진도에서 제거한다.

- 기존 완료자는 완료 기록과 광석을 그대로 유지한다.
- 신규 학생에게는 0-7을 보여 주지 않는다.
- 운영자에게만 `Legacy 미션` 필터로 남긴다.
- ACT 0 완료 조건은 0-1~0-6으로 계산한다.

### 4.2 새 ACT 2-1 — `루미 호출부호 HUD`

목표는 첫 변수이지만 이동 거리를 저장하지 않는다.

```python
pilot_name = "NOVA"
game.text.render(pilot_name, position="top-left")
```

화면 결과:

- HUD에 학생이 정한 호출부호가 네온 글자로 표시된다.
- 변수명, 문자열 값, 변수 사용을 한 장면에서 익힌다.
- `lumi.move()`를 사용하지 않으므로 0-7과 경험이 겹치지 않는다.

### 4.3 새 ACT 2-2 — `탐사선 스킨 장착`

하나의 값을 여러 곳에서 재사용하는 이유를 경험한다.

```python
ship_image = "lumi_blue"
game.screen.blit(ship_image, position=(2, 2))
game.text.render(ship_image, position="bottom")
```

화면 결과:

- `ship_image` 값에 따라 루미 외형이 바뀐다.
- 같은 변수를 이미지 배치와 HUD 표시에 두 번 사용한다.
- 좋은 변수 이름은 별도 정답 이름을 강제하기보다 코드 Trace에서 “두 곳에서 같은 값이 연결됨”으로 설명한다.

### 4.4 새 ACT 2-3 — `보호막 에너지 게이지`

기존 에너지 계산 미션의 이동 결과를 HUD 변화로 교체한다.

```python
shield = 5
shield = shield - 2
game.hud.bar("SHIELD", shield, maximum=5)
```

화면 결과는 보호막 바가 5에서 3으로 감소하는 애니메이션이다. 변수 갱신이 좌표 변화가 아니라 상태 변화로 보인다.

## 5. pygame 경험을 흡수하는 본편 설계

### 5.1 실제 pygame를 바로 실행하지 않는 이유

- 브라우저 Pyodide에 pygame/SDL 계층을 추가하면 초기 다운로드와 기기별 호환 비용이 커진다.
- 기존 LUMI Canvas, 이벤트 테이프, Trace와 별도의 렌더러가 생겨 결과 불일치가 발생하기 쉽다.
- 서버 비용은 줄일 수 있어도 학생 기기의 메모리·로딩·디버깅 비용이 커진다.

따라서 LUMI 안에 작은 `game` API를 제공하고 Python 문법과 게임 사고를 가르친다. 이후 “Pygame Bridge”에서 개념 대응을 보여 준다.

### 5.2 최소 Game API

한꺼번에 공개하지 않고 ACT 진행에 따라 해제한다.

| LUMI API | 역할 | pygame 대응 개념 | 최초 ACT |
| --- | --- | --- | --- |
| `game.init()` | 장면과 게임 상태 시작 | `pygame.init()` | ACT 1 |
| `game.quit()` | 장면 실행 종료 이벤트 | `pygame.quit()` | ACT 1 |
| `game.screen.blit(image, position)` | 이미지 배치 | `screen.blit(...)` | ACT 1 |
| `game.draw.rect(...)`, `game.draw.circle(...)` | 도형 그리기 | `pygame.draw.*` | ACT 1 |
| `game.text.render(text, position=...)` | HUD·안내문 표시 | `font.render` + `blit` | ACT 2 |
| `game.sound.play(name)` | 효과음 재생 | `pygame.mixer.Sound` | ACT 2 |
| `game.music.play(name)` | 배경음 시작 | `pygame.mixer.music` | ACT 2 |
| `game.key.pressed("RIGHT")` | 현재 키 상태 읽기 | `pygame.key.get_pressed()` | ACT 3 |
| `game.collides(a, b)` | 두 대상의 충돌 여부 | `Rect.colliderect` | ACT 4 |
| `game.running` | 게임 루프 유지 상태 | `running` 변수 | ACT 6 |
| `game.clock.tick(fps)` | 다음 논리 프레임 진행 | `Clock.tick(fps)` | ACT 6 |
| `game.frame` | 현재 논리 프레임 번호 | 시간·쿨다운 계산 | ACT 6 |

명칭은 pygame와 유사하지만 완전히 동일하다고 안내하지 않는다. 각 미션 완료 뒤 다음처럼 연결한다.

```text
LUMI에서 익힌 것: game.screen.blit(image, position)
pygame에서 만날 것: screen.blit(image, position)
공통 생각: 이미지를 화면의 특정 좌표에 배치한다.
```

## 6. ACT별 리믹스 계획

### ACT 0 — 실행과 즉각적 피드백

기존 0-1~0-6을 유지하되 장면 연출을 강화한다.

- RUN: 어두운 화면의 전원이 켜지고 음악 레이어가 시작된다.
- 숫자 수정: 추진 불꽃 길이와 이동 거리가 동시에 달라진다.
- 문자열: 루미 말풍선뿐 아니라 통신 파형이 나타난다.
- Field Test: 이동·회전·교신을 한 장면에서 완결한다.

새 Python 문법은 추가하지 않는다.

### ACT 1 — Scene Core: 함수 호출과 화면 만들기

현재 이동·출력 미션 중 일부를 다음 장면 제작 경험으로 교체한다.

1. `game.init()`으로 정비창 불 켜기
2. `blit()`으로 루미 이미지 배치하기
3. `draw.circle()`로 레이더 범위 그리기
4. `print()`와 `text.render()`의 차이 경험하기
5. 효과음을 재생하고 주석으로 한 줄 끄기
6. Field Test: 정비창 출격 화면 완성 후 루미 이동

핵심 Python은 import, 함수 호출, 인자, 순서 실행, print, 주석, 오류다.

### ACT 2 — Memory Core: 변수로 화면과 상태 연결

1. 호출부호 문자열 → HUD
2. 이미지 이름 변수 → 스킨 변경
3. 숫자 변수 갱신 → 보호막 게이지
4. `type()` → 숫자·문자열·Boolean 분류 스캐너
5. f-string → 실시간 상태 보고문
6. `input()`/`int()` → 관제소가 보낸 속도 또는 방어력 적용

같은 `move(variable)` 패턴을 반복하지 않는다.

### ACT 3 — Sensor Core: 월드와 입력 읽기

기존 센서 미션을 유지하면서 화면 경험을 바꾼다.

- 거리 센서는 레이더 빔과 숫자 계기로 표시한다.
- Boolean은 녹색/적색 램프로 표현한다.
- `game.key.pressed()`를 읽는 관찰 미션을 추가한다.
- 아직 연속 이동 코드를 요구하지 않고 키 상태가 True/False로 바뀌는 것을 Trace한다.
- Field Test는 거리, 항로 안전, 키 입력 중 두 가지를 조합한다.

### ACT 4 — Decision Core: 충돌과 적 대응

정적인 지뢰만 사용하지 않는다. 감염된 포탑이 예고선을 보낸 뒤 정해진 프레임에 펄스를 발사한다.

1. `if world.incoming_pulse:` → 보호막 켜기
2. `if/else` → 좌우 회피 또는 대기
3. `elif` → 적 신호 세기에 따라 방어 단계 선택
4. `game.collides(lumi, pulse)` → 충돌 시 경고음과 보호막 감소
5. `and/or` → 에너지와 거리 조건 결합
6. Field Test: 서로 다른 적 발사 패턴에 대응

적을 맞히는 것보다 “피하기·막기·정화하기”를 먼저 가르친다.

### ACT 5 — Automation Core: 여러 대상을 만들고 처리

- `for range`로 별 배경 또는 방어벽 타일을 여러 개 그린다.
- 반복 번호로 오브젝트 위치나 색을 바꾼다.
- 신호 여러 개를 순회해 정화한다.
- 중첩 반복으로 방어 격자·미니맵을 만든다.
- Field Test는 크기가 달라지는 방어 격자를 자동 구성한다.

루미가 한 칸씩 전진하는 미션만 연속 배치하지 않는다.

### ACT 6 — Persistence Core: 게임 루프와 시간

ACT 6이 pygame 경험의 중심이다.

```python
game.init()

while game.running:
    if world.incoming_pulse:
        lumi.shield()

    if game.key.pressed("RIGHT"):
        lumi.move(1)

    game.clock.tick(10)

game.quit()
```

학습 순서:

1. 완성 게임 루프를 Step으로 관찰한다.
2. `game.running`이 True인 동안 프레임이 반복됨을 확인한다.
3. 키 상태에 따라 연속 이동한다.
4. `game.frame`을 이용해 일정 간격으로 적이 펄스를 발사한다.
5. `break`로 긴급 종료하고 `continue`로 빈 프레임을 건너뛴다.
6. Field Test: 이동·보호막·쿨다운을 함께 제어한다.

`time.sleep()`을 Core에서 가르치지 않는다. 실제 게임 루프를 멈추고 결정론적 Replay도 깨뜨릴 수 있기 때문이다. 시간 개념은 `game.clock.tick()`과 논리 프레임으로 가르치고, pygame Bridge에서 `pygame.time.Clock`과 연결한다.

### ACT 7 — Data Core: 게임 오브젝트와 인벤토리 데이터

- list: 화면에 있는 적·탄환·광석 목록
- index: 특정 슬롯의 아이템
- append/remove: 발사체 생성·충돌 후 제거
- split/join: 관제 패킷 해독·재조립
- tuple: 좌표 `(x, y)`
- dict: 적의 이름, 에너지, 속도, 상태
- Field Test: 여러 적 데이터 중 위험도가 높은 대상을 찾아 대응

현재 5개 미션은 압축도가 높다. Core 7개와 선택 Remix 3개 정도로 나누어 한 미션이 여러 자료구조를 동시에 암기시키지 않게 한다.

### ACT 8 — Ability Core: 게임을 함수로 분해

```python
def handle_input():
    ...

def update_world():
    ...

def draw_scene():
    ...

while game.running:
    handle_input()
    update_world()
    draw_scene()
    game.clock.tick(10)
```

함수 정의, 호출, 매개변수, return, 지역 변수를 실제 게임 구조와 연결한다. ACT 8의 Field Test에서 학생이 키를 누르고 있는 동안 연속 이동하는 플레이 모드를 해제한다.

### FINAL — The Lost Light

기존 센서·판단·반복·데이터·함수 통합 목표는 유지하되, 최종 결과를 “코드가 정답을 출력함”이 아니라 45~60초짜리 플레이 가능한 미니 게임으로 만든다.

- 파동을 피하고 보호막을 관리한다.
- 구조 신호를 수집한다.
- 감염된 드론을 정화한다.
- 목적지 도착 후 `game.quit()`으로 장면을 정상 종료한다.
- 숨은 변형은 적 수, 발사 간격, 신호 위치만 바꾸고 같은 코드가 작동해야 한다.

## 7. 연속 키 이동 설계

### 7.1 두 단계로 구현

실시간 키 입력을 곧바로 기존 단일 실행 Worker에 넣으면 재현성과 디버깅이 깨진다. 다음 두 모드를 분리한다.

#### Guided Loop Mode — ACT 3~6

- 시스템이 짧은 입력 테이프를 제공한다.
- `game.key.pressed()`는 프레임마다 기록된 키 상태를 반환한다.
- 실행 결과는 항상 동일하므로 Step·Replay·Hidden Variant가 가능하다.

#### Live Pilot Mode — ACT 8·FINAL

- 학생 코드를 한 번 컴파일하고 `handle_input`, `update_world`, `draw_scene` 함수를 프레임마다 호출한다.
- 브라우저 키 상태는 프레임 시작 때 스냅샷으로 Worker에 전달한다.
- 키를 누르고 있는 동안 이동하되 프레임당 이동량과 총 프레임을 제한한다.
- 플레이가 끝나면 입력 테이프를 로컬에서 Replay할 수 있다.

### 7.2 안전 제한

- 기본 10 FPS, 최대 20 FPS
- Core 미션 최대 300 프레임
- 프레임당 명령 수 제한
- 키 입력이 없어도 자동 종료되는 미션 타이머
- 탭이 백그라운드로 가면 일시정지
- 입력 테이프는 서버에 매 프레임 저장하지 않는다.

## 8. 충돌·적·발사체 설계

### 8.1 결정론적 상태 전이

서버 물리나 고비용 물리 엔진을 만들지 않는다. 격자 또는 단순 사각형 충돌만 사용한다.

```text
enemy_aimed
enemy_pulse_fired
shield_raised
collision_detected
shield_changed
enemy_jammed
enemy_restored
```

Runtime이 상태 결과를 결정하고 Canvas는 이벤트를 재생한다. 탄환의 곡선과 폭발은 시각 효과일 뿐 판정 근거가 아니다.

### 8.2 학생용 센서·행동

초기 후보:

```python
world.enemy_detected
world.incoming_pulse
world.pulse_distance
world.enemies

lumi.shield()
lumi.dodge("left")
lumi.jam(enemy)
lumi.pulse(enemy)
```

각 API는 처음 등장하는 미션에서만 큰 설명 카드와 3~5초 상호작용 데모를 제공한다. 이후에는 “이미 배운 도구”로 접는다.

## 9. 스캐폴딩과 설명 기준

모든 신규·개편 미션은 다음 순서를 따른다.

1. 게임 상황: 학생이 왜 코드를 써야 하는가
2. 이번 Python 개념: 문법이 어떤 문제를 해결하는가
3. 새 도구 데모: 입력·출력·상태 변화를 애니메이션으로 보여 준다
4. 코드 작성 순서: 다음 줄 또는 블록에 무엇을 써야 하는지 구체적으로 안내한다
5. 완성 코드 예시: 코드 길이에 따른 제한 시간 동안 표시하고 자동으로 닫는다
6. 실행 Trace: 프레임, 키 상태, 충돌, 변수 변화를 같은 시간축에서 보여 준다
7. pygame Bridge: 개념 대응을 한 장으로 정리한다

`MISSION`, `CODE OBJECTIVE`, 내부 evaluator 키는 노출하지 않는다. “게임에서 할 일”, “코드로 만들 변화”, “성공하면 보이는 결과”처럼 학생 언어를 사용한다.

## 10. 진도·보상 호환

- 기존 미션 ID의 의미를 바꾸지 않는다.
- 새 미션은 `v2` ID를 사용한다.
- Legacy 완료·보상 기록은 삭제하거나 재지급하지 않는다.
- 기존 완료자는 다음 ACT 잠금을 유지한다.
- 새 v2 미션은 `추천 리믹스`로 다시 플레이할 수 있지만 중복 보상은 지급하지 않는다.
- 신규 학생은 v2 본편만 본다.
- 운영자 계정은 Legacy/v2 전환과 전체 미션 미리보기가 가능하다.

## 11. 비용 효율 설계

### 유지·재사용

- Pyodide Worker
- Canvas 월드
- LUMI Event Tape·Reducer·Replay
- 기존 WebAudio 효과음 합성기
- 미션 카탈로그·평가기·Hidden Variant
- 일일 학습 기록·광석 보상·Python 과정 격리

### 하지 않을 것

- pygame 전체 런타임과 SDL 번들 탑재
- 서버 실시간 물리 계산
- 매 프레임 Firestore 저장
- 적 AI를 위한 LLM 호출
- 미션마다 새 대용량 영상·음원 다운로드
- 실제 시각 효과의 좌표를 성공 판정 근거로 사용

### 저장 정책

- 프레임과 키 입력은 메모리 또는 로컬 Replay에만 저장한다.
- 서버에는 시작·완료·실패 요약, 소요 시간, 사용한 도움말 수준만 기존 방식으로 한 번 기록한다.
- 오디오·스프라이트는 ACT별 atlas로 묶고 진입 시 lazy load한다.
- 적 행동은 seed와 규칙으로 생성해 별도 서버 호출 없이 Hidden Variant를 만든다.

## 12. 구현 단계

### Phase A — 콘텐츠 중복 제거

- 0-7~0-10을 신규 학생 ACT 0 경로에서 제거
- 새 ACT 2-1~2-3 제작
- 기존 이동 중심 미션의 화면 결과 다양화
- 진도·보상 Legacy 매핑 추가

런타임 변경이 거의 없어 가장 먼저 배포할 수 있다.

### Phase B — Scene·Render·Audio API

- `game.init/quit`
- `screen.blit`, `draw.rect/circle`, `text.render`
- `sound.play`, `music.play`
- 이벤트 정규화·Canvas 재생·API 설명 카드

### Phase C — Input·Collision·Enemy

- 결정론적 입력 테이프
- 키 상태 센서
- 단순 충돌
- 적 조준·펄스·보호막·정화 이벤트
- ACT 3~5 리믹스

### Phase D — Game Loop·Live Pilot

- 논리 clock과 frame
- 제한된 게임 루프
- ACT 6 개편
- 함수 기반 Live Pilot Mode
- ACT 8·FINAL 통합

## 13. 우선 제작할 Vertical Slice

전체를 동시에 만들기 전에 다음 5개를 하나의 작은 에피소드로 구현한다.

1. ACT 1 `정비창 화면 켜기` — init, blit, draw, quit
2. ACT 2 `보호막 HUD` — 변수 갱신, text/bar, sound
3. ACT 3 `키 상태 모니터` — pressed Boolean Trace
4. ACT 4 `첫 방어 펄스` — if, collision, shield
5. ACT 6 `10초 생존 루프` — while, clock, continuous movement

이 Vertical Slice에서 다음을 학생 테스트한다.

- 이동 미션보다 재미가 실제로 높아졌는가
- 새 API 설명을 읽고 혼자 첫 줄을 작성할 수 있는가
- 키 입력과 코드 실행의 관계를 이해하는가
- Trace가 빠르거나 복잡하지 않은가
- 사운드와 적 연출이 개념 이해를 돕는가

## 14. 승인 기준

### 교육

- 인접 미션의 최종 화면 변화가 동일하지 않다.
- 한 미션의 새 Python 개념은 원칙적으로 하나다.
- 새 메서드는 사용 전에 행동·인자·결과가 설명된다.
- Field Test는 고정 숫자 복사로 통과할 수 없다.
- pygame 대응은 개념 전이를 돕되 LUMI 코드와 pygame 코드가 같다고 오해시키지 않는다.

### 제품

- RUN 후 1초 안에 첫 시각·음향 반응이 나온다.
- 키를 누르고 있는 동안 자연스럽게 연속 이동한다.
- 충돌·발사·보호막 이벤트와 Trace 순서가 일치한다.
- 모바일에서는 가상 방향키를 제공한다.
- 사운드 OFF와 모션 감소 설정을 존중한다.

### 기술·비용

- 같은 seed와 입력 테이프는 같은 Event Tape를 만든다.
- 무한 루프와 명령 폭주 제한을 유지한다.
- 플레이 중 Firestore 쓰기는 발생하지 않는다.
- 기존 ACT·보상·과정 격리 테스트가 회귀하지 않는다.
- 추가 리소스는 ACT 단위 lazy load되고 초기 LUMI 진입 번들을 과도하게 키우지 않는다.

## 15. 최종 권고

가장 먼저 해야 할 일은 적·탄환 시스템 전체가 아니라 0-7/2-1/2-2 중복 제거와 5개 Vertical Slice다. 이 작은 묶음에서 “코드를 쓰면 장면·소리·입력·위협이 바뀐다”는 감각이 검증되면 같은 시스템을 ACT 3~8에 확장한다.

이 접근은 기존 작업을 버리지 않으면서도 LUMI Protocol을 단순 문법 문제 화면에서 “학생이 Python으로 실제 게임 시스템을 복원하는 과정”으로 바꾼다.
