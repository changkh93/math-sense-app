# LUMI Protocol 커리큘럼·콘텐츠 명세

## 1. 커리큘럼 범위

시즌 1은 10 Acts, 약 50~65 Core Missions를 목표 범위로 둔다. 아래 표는 **61개 후보 경험**을 보여 주지만 출시 미션 수를 고정하지 않는다. 파일럿 결과에 따라 인접 경험을 합치거나 한 개념을 여러 맥락으로 분리할 수 있다.

변경해서는 안 되는 것은 정확한 개수가 아니라 다음 개념의 순서와 선수 관계다.

```text
명령
  ↓
값·변수
  ↓
world 센서·Boolean
  ↓
조건
  ↓
for
  ↓
while
  ↓
list·문자열 처리·tuple·dictionary
  ↓
함수·module
  ↓
자율 탐사
```

## 2. Core과 Extension의 기준

- `Core`: 다음 Act 이해에 필요하거나 첫 Python 과정에서 전이가 중요한 개념
- `Extension`: 본편 중 선택 가능한 강화 미션. 학습 기록에는 남지만 다음 Act의 필수 게이트는 아님
- `Advanced`: 시즌 1 이후 별도 과정

`input()`, tuple, `split()`과 `join()`은 이번 기준에서 Core에 포함한다. 다만 교재식 콘솔 예제가 아니라 월드 입력·좌표·신호 패킷이라는 필요에서 도입한다.

## 3. Act별 후보 미션

### ACT 0. AWAKENING — 긴급 재부팅

목표: 실행, 숫자 변경, 순차 실행과 문자열이 월드 행동으로 이어지는 경험을 만든다.

| ID | 경험 | 핵심 사고 개념 | 학생 코드/행동 | 해제 |
| --- | --- | --- | --- | --- |
| A0-01 | 어둠 속 신호 | 실행하면 세계가 변한다 | `lumi.wake()` RUN | RUN |
| A0-02 | 첫걸음 | 한 명령은 한 행동을 만든다 | `lumi.move(1)` | Reset |
| A0-03 | 에너지 셀 | 괄호 안의 값을 바꾸면 행동 크기가 바뀐다 | `1`을 `3`으로 수정 | 편집 토큰 강조 |
| A0-04 | 꺾인 항로 | 명령은 위에서 아래로 실행된다 | move/turn/move | Replay/Step |
| A0-05 | 첫 교신 | 따옴표 안의 글자는 하나의 문자열 값이다 | `lumi.say("...")` | 말풍선 |
| A0-06 | Field Test: 구조 비콘 | 배운 명령을 조합한다 | 부분 자유 작성 | Movement Core |

A0-01~A0-06이 첫 20~25분의 완결된 세션이다.

### ACT 1. COMMAND CORE — 명령 코어

목표: 함수 호출의 모양을 직관적으로 이해하고 숫자·출력·주석·오류를 다룬다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A1-01 | 회전 각도 | 한 명령에 필요한 값을 전달한다 | `lumi.turn(90)` |
| A1-02 | 거리 계산 | 표현식을 먼저 계산한 뒤 명령에 사용한다 | `lumi.move(2 + 3)` |
| A1-03 | 관제 기록 | Python 출력과 루미 말하기를 구분한다 | `print("READY")` |
| A1-04 | 보이지 않는 메모 | 주석은 실행되지 않는다 | `# 오른쪽 통로 확인` |
| A1-05 | 손상된 괄호 | 오류 위치와 문법 단서를 이용해 고친다 | 괄호·따옴표·철자 수정 |

Extension: 여러 인자를 받는 미래 API 맛보기는 함수 단계 전까지 보류한다.

### ACT 2. MEMORY CORE — 기억 코어

목표: 값을 이름에 저장하고, 종류를 확인하고, 변경하며, 외부 입력을 변환한다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A2-01 | 첫 기억 슬롯 | 변수는 값을 기억하는 이름이다 | `steps = 3` |
| A2-02 | 좋은 신호 이름 | 식별자는 의미 있고 규칙에 맞게 짓는다 | `target_steps` |
| A2-03 | 에너지 계산 | 대입 후 값이 바뀐다 | `energy = energy - 2` |
| A2-04 | 값의 종류 | 숫자·문자열·Boolean은 다른 자료형이다 | `type(value)` |
| A2-05 | 상태 보고 | 변수 값을 문자열 안에 표현한다 | `f"에너지 {energy}"` |
| A2-06 | 관제 입력 | 외부 문자열 입력을 숫자로 변환한다 | `int(input(...))` |

복합 대입연산자(`+=`, `-=`)는 A2-03 또는 Automation의 누적 미션에서 재노출한다.

#### `input()`의 제품 표현

콘솔 창에 프롬프트를 띄우지 않는다. 월드 위에 `CONTROL INPUT` 패널을 표시한다.

```text
관제소가 이동 칸 수를 전송합니다.

[ 4 ]  신호 전송
```

학생 코드는 실제 Python을 사용한다.

```python
steps_text = input("이동할 칸 수")
steps = int(steps_text)
lumi.move(steps)
```

학생은 다음을 함께 경험한다.

- 입력은 프로그램 밖에서 들어온다.
- `input()`의 결과는 문자열이다.
- 숫자 연산이나 이동에 쓰려면 `int()`로 변환한다.
- UI가 콘솔 모양일 필요는 없지만 Python 의미는 실제와 같아야 한다.

### ACT 3. SENSOR CORE — 센서 코어

목표: `lumi`와 `world`의 역할을 구분하고 월드 값을 읽어 판단 재료를 만든다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A3-01 | WORLD 연결 | `world`는 탐험 환경의 상태를 제공한다 | read-only 소개 |
| A3-02 | 목표까지 남은 칸 | 속성을 읽어 값을 얻는다 | `world.steps_to_target` |
| A3-03 | 안전 비교 | 비교 결과는 True/False다 | `steps <= energy` |
| A3-04 | 두 센서 결합 | `and/or/not`으로 조건을 결합한다 | `path_clear and energy > 0` |
| A3-05 | Sensor Field Test | 값이 바뀌어도 센서로 해결한다 | hidden target/input |

`world.target_distance`는 legacy alias로만 유지한다. 초급 UI와 새 콘텐츠에서는 이동 의미가 분명한 `world.steps_to_target`을 사용한다.

### ACT 4. DECISION CORE — 판단 코어

목표: 조건에 따라 일부 코드만 실행한다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A4-01 | 출발 전 점검 | `if`가 True일 때만 실행 | `if world.path_clear:` |
| A4-02 | 안전한 대안 | `else`로 두 행동 중 하나 선택 | 이동/대기 |
| A4-03 | 신호 세기 분류 | `elif`로 여러 구간 구분 | weak/normal/strong |
| A4-04 | 들여쓰기 회로 | 코드 블록의 경계를 읽고 수정 | indentation repair |
| A4-05 | 복합 안전 규칙 | 여러 Boolean을 한 판단에 사용 | energy and path |
| A4-06 | Decision Field Test | 다른 상태에서도 올바른 행동 선택 | transfer states |

중첩 조건문은 Extension으로 제공하고 Core에서는 읽기 쉬운 `elif`와 논리연산을 우선한다.

### ACT 5. AUTOMATION CORE — 자동화 코어

목표: 같은 행동을 반복 작성하는 불편을 `for/range`로 해결한다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A5-01 | 다섯 번의 수동 신호 | 반복의 필요를 느낀다 | move 5회 직접 실행 |
| A5-02 | 첫 자동 항법 | `for`가 블록을 반복한다 | `for step in range(5)` |
| A5-03 | 반복 번호 | 반복 변수 값이 매번 바뀐다 | `step` trace |
| A5-04 | 가변 항로 | 반복 횟수를 변수로 정한다 | `range(steps)` |
| A5-05 | 에너지 누적 | 반복 중 값을 누적/감소한다 | `total += value` |
| A5-06 | 격자 탐색 | 반복 안의 반복을 시각화한다 | nested loop |
| A5-07 | Automation Field Test | 숨은 거리에서도 자동화 | transfer route |

현재 `loop-calibration-01`, `loop-core-01`은 A5-02~A5-07에 재작성·재배치한다.

### ACT 6. PERSISTENCE CORE — 지속 코어

목표: 횟수를 미리 모를 때 상태가 바뀔 때까지 반복하고 안전하게 멈춘다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A6-01 | 목표가 보일 때까지 | 조건이 True인 동안 반복 | `while not world.target_detected` |
| A6-02 | 바뀌는 상태 | 반복문 안에서 종료 조건을 변화시킨다 | move/energy trace |
| A6-03 | 비상 정지 | 조건이 충족되면 즉시 반복 종료 | `break` |
| A6-04 | 잡음 건너뛰기 | 현재 반복만 건너뛴다 | `continue` |
| A6-05 | Persistence Field Test | 종료·건너뛰기를 올바르게 선택 | mixed signals |

한 번의 `charge()`로 조건이 바로 False가 되는 기존 while 충전 미션은 Core에서 제거한다. 반복 중 상태가 여러 번 변하는 장면을 사용한다.

### ACT 7. DATA CORE — 데이터 코어

목표: 여러 데이터와 구조화된 신호를 저장·해독·변경한다. tuple과 `split/join`을 실제 필요에서 배운다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A7-01 | 탐사 인벤토리 | 리스트는 순서가 있는 여러 값이다 | `samples = [...]` |
| A7-02 | 슬롯 번호 | 인덱스로 한 항목을 읽는다 | `samples[1]` |
| A7-03 | 인벤토리 변경 | 항목을 추가·제거한다 | `append`, `remove` |
| A7-04 | 표본 전체 검사 | 리스트의 각 항목을 순회한다 | `for sample in samples` |
| A7-05 | 암호 신호 해독 | 문자열을 구분자로 나눠 리스트로 만든다 | `packet.split("|")` |
| A7-06 | 항로 메시지 조립 | 문자열 목록을 하나의 문자열로 합친다 | `" → ".join(route)` |
| A7-07 | 좌표 패킷 | tuple은 함께 움직이는 고정된 값 묶음이다 | `position = (2, 3)` |
| A7-08 | 좌표 해제 | tuple unpacking으로 값을 이름에 나눈다 | `x, y = position` |
| A7-09 | 행성 상태표 | 딕셔너리는 key로 값을 찾는다 | `planet["oxygen"]` |
| A7-10 | 상태 변경과 전이 | 딕셔너리를 수정하고 다른 패킷에 적용 | update + transfer |

#### tuple 교육 범위

Core에서는 다음까지만 가르친다.

- 여러 값이 하나의 좌표/상태 묶음이 될 수 있다.
- 인덱스로 읽거나 unpacking할 수 있다.
- 리스트와 달리 항목을 직접 바꾸지 않는 고정 묶음이다.

hashability, tuple key, named tuple은 Advanced로 보낸다.

#### `split/join` 교육 범위

두 기능을 한 번에 암기시키지 않는다.

```python
packet = "ICE|IRON|WATER"
samples = packet.split("|")
```

먼저 “한 문자열 → 여러 조각”을 경험한 뒤 별도 미션에서 다음을 다룬다.

```python
route = ["BASE", "CAVE", "BEACON"]
message = " → ".join(route)
```

`str.format()`은 필수에서 제외하고 f-string을 기본 문자열 포맷으로 사용한다.

### ACT 8. ABILITY CORE — 능력 코어

목표: 코드 묶음에 이름을 붙이고 입력과 결과가 있는 재사용 가능한 능력을 만든다.

| ID | 경험 | 핵심 사고 개념 | 예시 |
| --- | --- | --- | --- |
| A8-01 | 새 능력 만들기 | `def`로 명령 묶음을 정의 | `def explore():` |
| A8-02 | 능력 실행 | 정의와 호출은 다르다 | `explore()` |
| A8-03 | 거리 받기 | 매개변수로 값을 전달 | `travel(steps)` |
| A8-04 | 센서 결과 돌려주기 | `return`은 호출 위치로 값을 돌려준다 | `return is_safe` |
| A8-05 | 함수의 기억 범위 | 지역 변수와 바깥 변수를 구분 | visual frames |
| A8-06 | 임무 분해 | prepare/rescue/navigate로 문제를 나눈다 | multiple functions |
| A8-07 | 연결의 비밀 | module과 import의 의미를 공개 | `from metasense import lumi, world` |

가변 매개변수, lambda, callback, decorator는 Advanced로 보낸다.

### FINAL. AUTONOMOUS LUMI — 자율항법

목표: 학생이 손을 떼어도 루미가 센서·판단·반복·데이터·함수를 이용해 임무를 수행한다.

| ID | 경험 | 핵심 |
| --- | --- | --- |
| F-01 | 자율 순찰 설계 | 문제를 함수와 상태로 분해 |
| F-02 | 구조 신호 선별 | list/dict/condition 결합 |
| F-03 | 입력이 바뀌는 폭풍 | 입력·센서·transfer 대응 |
| F-04 | 최종 자율 원정 | 힌트 없는 종합 Field Test |

최종 장면은 학생이 RUN한 뒤 키보드에서 손을 떼고 루미가 스스로 탐험하는 경험이어야 한다.

## 4. 별도 과정으로 이동할 내용

| 과정 | 내용 |
| --- | --- |
| Console & Environment Lab | 설치, 셸, VS Code, 여러 줄 입력, 온라인 저지 |
| Data Expedition | 파일, CSV, JSON, 표준 라이브러리, pandas |
| Algorithm Frontier | 재귀, 피보나치, 복잡도, 정렬·탐색 |
| Robot Factory | 클래스, 캡슐화, 상속, 컴포지션, 특수 메서드 |
| Python Systems | 예외 객체, custom exception, iterator, generator |

기본 `try/except`는 시즌 1 종료 뒤 짧은 Extension으로 제공할 수 있으나 자율항법의 선수 조건으로 두지 않는다.

## 5. 기존 20개 미션 재배치

| 기존 영역 | 처리 |
| --- | --- |
| 반복 자동화 2개 | Act 5로 이동하고 import 제거, Sensor 선수 조건 반영 |
| if 충전/출발 | Act 4로 단순화·재배치 |
| if 신호 선별 | list와 `for`를 요구하므로 Act 7 이후 통합 미션으로 이동 |
| 좌우 항로 `world.snapshot()` | 새 초급 콘텐츠에서 제거, Beginner API로 대체 |
| while 비콘 접근 | Act 6에서 상태 변화 Trace를 강화해 재사용 |
| while 충전 | 단계적으로 상태가 변하는 규칙으로 재작성 |
| while 수집 | 리스트 학습 이후로 이동 |
| 함수 6개 | Act 8과 Final에 난이도별 재배치 |

기존 mission ID의 의미를 바꾸어 덮어쓰지 않는다. 큰 학습 목표가 달라지면 새 ID와 새 version을 만들고 legacy mapping을 둔다.

## 6. 콘텐츠 저작 체크리스트

미션을 추가할 때 다음 질문에 모두 답해야 한다.

- 이번 미션의 새로운 핵심 사고 개념은 하나인가?
- 선수 개념과 API가 이미 체험되었는가?
- 문법이 필요한 이유를 월드에서 먼저 보여주는가?
- 학생이 실제로 편집하는 부분이 명확한가?
- 정답 문자열이 아니라 상태와 개념 증거로 평가하는가?
- 최소 한 개의 대체 풀이가 가능한가?
- transfer variant가 단순 숫자 암기를 막는가?
- Hint 1은 답이 아니라 관찰 방향을 주는가?
- 서사를 건너뛰어도 학습 목표를 이해할 수 있는가?
- 모바일/태블릿에서 입력량이 과도하지 않은가?
- 오류가 났을 때 학생이 다음 행동을 알 수 있는가?

