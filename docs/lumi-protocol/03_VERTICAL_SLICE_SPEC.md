# LUMI Protocol Vertical Slice 개발 명세

## 1. 목적과 범위

Vertical Slice는 첫 10개 미션을 통해 다음 제품 가설을 실제로 검증한다.

1. Turtle 경험만 있는 학생이 설명 없이 첫 RUN을 할 수 있다.
2. 코드를 실행하면 월드가 살아 움직인다는 인상을 준다.
3. UI 기능이 개념과 함께 해제되어 복잡도가 점진적으로 증가한다.
4. 코드 줄, 변수 변화와 월드 행동이 하나의 event tape에서 동기화된다.
5. import를 보이지 않고도 실제 Python 문법과 오류 줄을 정확히 보여준다.
6. 결과 성공, 개념 이해와 transfer 성공을 분리해 평가한다.

첫 6개 미션은 20~25분짜리 첫 세션이다. 10개 전체는 약 40~70분 분량이다.

## 2. 공통 UX

### 2.1 첫 미션의 기본 레이아웃

```text
┌────────────────────────────────────────────┐
│ AWAKENING · 신호를 깨워 주세요              │
├──────────────────────┬─────────────────────┤
│                      │ CODE                │
│      가까운 LUMI     │ lumi.wake()         │
│                      │                     │
│      어두운 WORLD    │          ▶ RUN      │
├──────────────────────┴─────────────────────┤
│ LUMI: 명령 신호를 기다리고 있어요.           │
└────────────────────────────────────────────┘
```

처음에는 다음을 숨긴다.

- API 목록
- Mission 탭 전체
- 좌표·방향 HUD
- raw variable JSON
- Output/Trace 탭
- 속도 조절과 타임라인
- `from metasense import ...`

### 2.2 공통 실행 상태

```text
idle → collecting_input(해당 미션만) → executing → ready_to_play → playing → paused → completed/failed
```

Python 실행 중 월드 애니메이션을 직접 시작하지 않는다. event tape와 평가 결과를 받은 뒤 playback을 시작한다.

### 2.3 공통 성공 화면

성공 화면은 월드를 덮는 큰 모달보다 하단 결과 카드와 월드 연출을 사용한다.

```text
CORE RESTORED ★★☆
루미가 구조 비콘에 도착했습니다.

[실행 다시 보기] [다음 신호]
```

Act 종료에서만 업그레이드 장착 연출을 크게 보여준다.

## 3. 미션 상세

### VS-01. 어둠 속 신호

요구사항 ID: `VS-01`, `UX-01`, `RT-01`

| 항목 | 명세 |
| --- | --- |
| 시간 | 1~2분 |
| 핵심 | RUN하면 코드가 월드 행동을 만든다 |
| 편집 모드 | 관찰 전용, 코드 수정 불가 |
| 코드 | `lumi.wake()` |
| 월드 | 어두운 정비실, 꺼진 루미를 화면 중앙에 크게 배치 |
| 학생 행동 | RUN 클릭 |
| 성공 | `finalState.rover.awake === true` |
| 보상 | `CORE ONLINE · 8%`, RUN 해제 |

Playback:

1. 코드 1줄이 cyan으로 빛난다.
2. 코드에서 루미로 짧은 명령 펄스가 이동한다.
3. 눈 → 코어 → 추진기 순서로 켜진다.
4. `LUMI` 라벨이 처음 나타난다.
5. 짧은 대사: “신호… 수신.”

필수 이벤트:

```js
line(sourceLine: 1)
command_started(action: "wake")
command_completed(action: "wake", awake: true)
```

오류 가능성이 없는 관찰 미션이므로 별은 기본 1개다. “RUN을 찾았는가”를 학습 데이터로 기록하되 성적화하지 않는다.

### VS-02. 첫걸음

요구사항 ID: `VS-02`

| 항목 | 명세 |
| --- | --- |
| 시간 | 2분 |
| 핵심 | 한 명령은 한 행동을 만든다 |
| 편집 모드 | 관찰 전용 |
| 코드 | `lumi.move(1)` |
| 월드 | `(1, 2)`에서 오른쪽 한 칸 앞에 빛나는 패드 |
| 성공 | rover가 `(2, 2)`에 도착 |
| 보상 | Reset 해제 |

Playback 중 `lumi`, `move`, `1`을 각각 길게 설명하지 않는다. 완료 후 3초짜리 Concept Lens를 한 번만 보여준다.

```text
lumi → 루미
move → 이동 명령
1 → 한 칸
```

필수 이벤트: line, command_started(move), rover_moved(path), command_completed(move).

### VS-03. 에너지 셀까지

요구사항 ID: `VS-03`, `ED-01`

| 항목 | 명세 |
| --- | --- |
| 시간 | 2~3분 |
| 핵심 | 명령에 전달하는 값을 바꾸면 행동 크기가 바뀐다 |
| 편집 모드 | 한 토큰 변경 |
| starter | `lumi.move(1)` |
| editable range | 숫자 `1`만 편집 가능하거나 시각적으로 강조 |
| 월드 | 에너지 셀이 3칸 앞에 있음 |
| 목표 | `1`을 `3`으로 바꾸고 도착 |
| 성공 | rover가 `(4, 2)`에 도착 |

첫 실패에서 “틀렸습니다”가 아니라 다음을 보여준다.

```text
루미는 1칸 이동했습니다.
에너지 셀까지 2칸이 남아 있어요.
괄호 안의 숫자를 바꿔 보세요.
```

### VS-04. 꺾인 항로

요구사항 ID: `VS-04`, `PB-01`, `MEM-01`

| 항목 | 명세 |
| --- | --- |
| 시간 | 3~4분 |
| 핵심 | Python은 기본적으로 위에서 아래로 실행된다 |
| 편집 모드 | RUN 후 순서 관찰, 두 번째 시도에 줄 순서 조정 |
| starter | 아래 코드 |
| 해제 | Replay와 이전/다음 Step |

```python
lumi.move(2)
lumi.turn(90)
lumi.move(1)
```

월드는 L자 경로로 구성한다. 실행 전 간단한 2지선다 예측을 제시한다.

```text
루미는 먼저 어디로 갈까요?
[2칸 앞으로] [먼저 회전]
```

예측은 별을 깎지 않는다. 실행 뒤 예측과 실제를 비교한다. Step을 누를 때마다 현재 줄과 현재 위치만 보여주며 아직 일반 변수 패널은 열지 않는다.

### VS-05. 첫 교신

요구사항 ID: `VS-05`

| 항목 | 명세 |
| --- | --- |
| 시간 | 2~3분 |
| 핵심 | 따옴표 안의 글자는 하나의 문자열 값이다 |
| 편집 모드 | 따옴표 안의 텍스트 변경 |
| starter | `lumi.say("신호 수신")` |
| 목표 | 지정 문구 또는 학생 문구를 말하게 함 |
| 성공 | say 명령 정상 실행 |

월드에 실제 말풍선이 나타나야 한다. 문자열의 자유 입력은 개인정보나 공개 공유가 없는 로컬 미션 표현으로만 사용한다.

의도된 오류:

```python
lumi.say("신호 수신)
```

오류 메시지는 빠진 따옴표 위치를 학생 줄 기준으로 표시한다.

### VS-06. Field Test: 구조 비콘

요구사항 ID: `VS-06`, `ASMT-01`

| 항목 | 명세 |
| --- | --- |
| 시간 | 4~6분 |
| 핵심 | move/turn/say와 순차 실행을 조합한다 |
| 편집 모드 | 코드 블록 조립 또는 부분 자유 작성 |
| 월드 | 두 구간과 한 번의 회전 뒤 구조 비콘 |
| 필수 호출 | `lumi.move`, `lumi.turn`, `lumi.say` |
| 성공 | 비콘 도착 + 도착 메시지 |
| transfer | 첫 구간 거리만 1칸 변화 |

완료 연출:

```text
MOVEMENT CORE RESTORED
```

루미에 추진기 링을 장착하고 항로 지도에서 ACT 0을 점등한다. 이것이 첫 20~25분의 종료점이다. 다음 세션을 강제로 시작하지 않는다.

### VS-07. 첫 기억 슬롯

요구사항 ID: `VS-07`, `MEM-02`

| 항목 | 명세 |
| --- | --- |
| 시간 | 4~6분 |
| 핵심 | 변수는 값을 기억하는 이름이다 |
| starter | 아래 코드 |
| 해제 | Visual Memory Core |

```python
steps = 3
lumi.move(steps)
```

Memory Core는 실행 줄과 동기화한다.

```text
LINE 1  steps  [empty] → 3
LINE 2  move가 steps의 값 3을 사용
```

첫 수정은 `steps = 4`처럼 값만 바꾸게 한다. 변수명 규칙과 자료형 용어를 한꺼번에 가르치지 않는다.

### VS-08. 남은 에너지

요구사항 ID: `VS-08`, `MEM-03`

| 항목 | 명세 |
| --- | --- |
| 시간 | 4~6분 |
| 핵심 | 오른쪽 표현식을 계산한 결과가 변수에 저장된다 |
| starter | 아래 코드 |

```python
energy = 5
energy = energy - 2
lumi.say(energy)
```

Memory Core:

```text
energy  [empty] → 5
energy  5 → 3
```

`say()`가 숫자를 표시할 수 있도록 현재 API처럼 문자열 변환을 허용한다. f-string과 자료형 변환의 정식 설명은 후속 Act에서 한다.

### VS-09. WORLD 센서

요구사항 ID: `VS-09`, `API-01`

| 항목 | 명세 |
| --- | --- |
| 시간 | 5~7분 |
| 핵심 | `world`에서 현재 환경 값을 읽는다 |
| starter | 아래 코드 |
| 해제 | Sensor Overlay |

먼저 화면에 목표까지 4칸을 시각적으로 보여주고 다음 코드를 실행한다.

```python
steps = world.steps_to_target
lumi.move(steps)
```

Sensor Overlay:

```text
TARGET → 4 STEPS → world.steps_to_target → steps
```

transfer에서는 목표를 2칸 또는 5칸으로 바꾼다. 고정 숫자로 성공한 코드는 1성은 받을 수 있지만 `SIGNAL UNDERSTOOD`와 `FIELD VERIFIED`를 받지 못한다.

### VS-10. 안전할 때만 출발

요구사항 ID: `VS-10`, `ASMT-02`

| 항목 | 명세 |
| --- | --- |
| 시간 | 6~9분 |
| 핵심 | 조건이 True일 때만 들여쓴 코드가 실행된다 |
| starter | 아래 코드 |
| 해제 | Decision Core 미리보기 |

```python
if world.path_clear:
    lumi.move(world.steps_to_target)
```

공개 상태는 길이 열려 있다. transfer 상태는 길이 막혀 있으며 이동하지 않는 것이 정답이다. 월드 성공 판정은 단순 도착만 검사하지 않고 다음을 구분한다.

- clear: 목표에 도착
- blocked: 출발 위치 유지, 충돌 명령 없음

Trace는 조건식을 평가한 결과를 보여준다.

```text
world.path_clear → False
if block → SKIPPED
```

## 4. 첫 세션 종료 기준

A0/VS-01~06 완료 후 다음을 만족해야 한다.

- 학생이 `lumi`가 조종하는 로봇의 이름이라고 설명할 수 있다.
- RUN과 Reset을 별도 안내 없이 찾는다.
- 여러 줄의 실행 순서를 Step으로 재생할 수 있다.
- 문자열의 따옴표가 빠졌을 때 오류 위치를 보고 고친다.
- move/turn/say를 조합한 작은 Field Test를 완료한다.
- 완료 화면에서 다음 미션을 선택하거나 세션을 종료할 수 있다.

## 5. Vertical Slice 데이터 수집

학생 행동을 과도한 원문 코드 장기 저장 없이 다음 수준으로 기록한다.

| 지표 | 정의 |
| --- | --- |
| Time to First Run | 미션 표시부터 첫 RUN까지 |
| Completion | 도움 포함 최종 성공 여부 |
| First-Try Success | 첫 실행에서 world goal + concept 통과 |
| Retry Count | 성공 전 실행 횟수 |
| Hint Escalation | 최대 Assistance Level |
| Transfer Success | 변형 상태 통과 여부 |
| Idle Segment | 30초 이상 행동 없는 UI 구간 |
| Voluntary Continue | 완료 후 다음 미션 선택 여부 |
| Error Recovery | 오류 발생부터 정상 실행까지 시간/실행 수 |

이 지표는 학생 개인을 공개 순위화하는 데 사용하지 않는다.

## 6. Vertical Slice 출시 게이트

- 첫 6개 미션의 도움 포함 완료율 목표: 75% 이상
- 첫 RUN 중앙값 목표: 90초 이내
- VS-03에서 편집 대상 숫자를 찾지 못해 30초 이상 정지하는 비율: 15% 미만
- VS-04에서 실행 순서를 사후 설명하는 비율: 70% 이상
- VS-09 transfer 통과율: 공개 미션 통과자의 60% 이상
- 저장 유실: 관찰 테스트에서 0건
- 런타임 빈 화면/복구 불가 오류: 실행의 2% 미만
- 교사/진행자 기술 개입 필요 학생: 20% 미만

수치는 초기 제품 게이트이며 학생 능력을 판정하는 절대 기준이 아니다. 파일럿 표본과 환경을 함께 기록한다.

