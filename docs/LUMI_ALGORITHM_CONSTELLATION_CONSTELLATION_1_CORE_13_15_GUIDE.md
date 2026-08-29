# LUMI 알고리즘 성단 — 성단 1 본 항로 Core 13~15 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-COND-NOT-13`, `AC-COND-ELIF-14`, `AC-COND-RANGE-15`  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → 성단 1 Core 3종 계획 v2 → 기존 문서**  
> 핵심 원칙: 새로운 문제별 UI·Callable·저장 모델을 만들지 않고 기존 완결 학습 루프를 재사용한다.

## 1. 최종 평가

계획 v2는 세 문제의 함수명과 Fresh Transfer를 명확하게 다듬었고, 행동 기반 Judge를 유지한다는 점에서 방향이 좋다. 특히 다음은 그대로 채택할 가치가 있다.

- NOT-13의 함수명을 `is_alarm_light_on`으로 정리한 것
- ELIF-14에서 AST 형태를 강제하지 않고 Guard Return도 허용한 것
- ELIF-14의 2★를 분기 실행 순서 예측으로 강화한 것
- RANGE-15에서 정확한 두 경계를 별도 증거로 확인하는 것
- 세 문제 모두 Base와 다른 표면의 Fresh Transfer를 제공하는 것

다만 현재 코드베이스와 결합하면 다음 문제가 발생한다.

1. 기존 `ConditionTableLens`는 두 불리언 입력의 `and/or`만 처리한다. NOT, 점수 3분기, 숫자 구간에 재사용하면 모두 잘못된 AND 화면이 나온다.
2. ELIF-14와 RANGE-15는 비교 연산자를 사용하지만 계획의 선수 조건은 `AC-COND-001`뿐이다. 성단 0에서 BOUND-05를 건너뛴 학생에게 미학습 문법이 노출될 수 있다.
3. RANGE-15의 `or` 오답이 모든 값에서 참이라는 설명은 `min_temp <= max_temp` 입력 계약이 없으면 성립하지 않는다.
4. RANGE-15 Starter가 “이상이고 이하”라고 직접 말하면 문제 해결의 핵심 번역 과정을 지나치게 대신한다.
5. Published/Public/Private 집합 검증을 부분집합으로 완화하면 현 릴리스 구조에서는 고아 커널과 고아 서버 정의만 허용한다.
6. 신규 fixture 태그마다 전역 taxonomy와 matcher를 만들면 실제 소비처 없이 관리 비용만 늘어난다.

따라서 계획을 **수정 승인**한다. 아래 내용을 최종 구현 계약으로 사용한다.

## 2. 채택·수정·폐기 결정

| 계획 요소 | 결정 | 확정 기준 |
|---|---|---|
| NOT-13 논리 부정 | 채택 | 단일 상태의 입력·출력 반전을 관찰한다. |
| ELIF-14 3단계 상호 배타 분기 | 채택 | 행동 채점과 실행 순서 이해 증거를 분리한다. |
| RANGE-15 양쪽 경계 포함 | 채택 | `min_temp <= max_temp`를 입력 계약으로 고정한다. |
| 세 문제의 `condition-table` Lens | 폐기 | 기존 `StateTransitionLens`로 통일한다. |
| RANGE 전용 NumberLine Lens | 이번 단계 폐기 | 사례 프레임 5개로 경계를 표현한다. 향후 3문제 이상 재사용 시 검토한다. |
| AST로 `not`·`elif`·연산자 형태 강제 | 폐기 | 출력 행동만 Judge한다. |
| Guard Return·중첩 if 대안 풀이 | 채택 | 올바른 행동이면 통과한다. |
| 신규 Python 개념 2종 등록 | 채택 | 완전한 First Encounter 계약을 갖춘다. |
| 수명주기 부분집합 모델 | 폐기 | 현재는 Published/Public/Private 정확한 집합 일치를 유지한다. |
| 문제별 오개념 matcher 추가 | 폐기 | fixture 태그만 기록하고 범용 소비처가 생길 때 matcher를 확장한다. |
| 접근성·학생 파일럿·수동 출판 승인 | 비차단 | 자동 계약 통과 후 같은 변경에서 published 처리한다. |

## 3. 성단 1 학습 사다리

### 3.1 확정 순서

```text
11 AC-COND-001  두 조건 모두: and
 ├─ 12 AC-COND-002  둘 중 하나: or
 ├─ 13 AC-COND-NOT-13  한 상태 반전: not
 ├─ 14 AC-COND-ELIF-14  순서 있는 3단계 분기
 └─ 15 AC-COND-RANGE-15  두 경계를 and로 결합
```

13~15는 모두 Core다. RANGE-15는 이후 CLAMP-16의 선수 Anchor 역할을 유지한다.

### 3.2 확정 선수 조건

| 문제 | 선수 조건 | 이유 |
|---|---|---|
| NOT-13 | `AC-COND-001` | Boolean True/False를 이해한 뒤 단일 상태 반전을 배운다. |
| ELIF-14 | `AC-COND-001`, `AC-EXP-BOUND-05` | Boolean 판정과 `>=` 경계 비교가 모두 필요하다. |
| RANGE-15 | `AC-COND-002`, `AC-COND-ELIF-14` | `and/or` 차이, 양방향 경계 비교를 결합한다. ELIF-14가 BOUND-05와 `>=` 학습을 보장한다. |

완료 기준은 각 선수 문제의 **1★ 이상**이다. 현재 Hub의 공용 prerequisite 잠금을 그대로 사용한다. 신규 API나 Firestore 조회를 추가하지 않는다.

RANGE-15의 올바른 풀이 자체는 `or`를 사용하지 않지만, Explore와 2★에서 `and/or` 오개념을 직접 비교한다. 따라서 학생에게 처음 보는 연산자가 나타나지 않도록 AC-COND-002를 선수 조건으로 둔다.

## 4. 공통 구현 아키텍처

세 문제 모두 기존 데이터 기반 경로를 사용한다.

```text
createCapabilityPrototypeKernel
  → ObserveMode
  → ExploreMode / StateTransitionLens
  → FirstEncounterCard
  → CodeMode / Worker Runtime
  → Server Callable / Isolated Judge
  → UnderstandingCheckMode
  → TransferChallengeMode
```

추가하지 않는 것:

- `NotLens`, `ElifLens`, `NumberLineLens` 같은 문제별 컴포넌트
- 새 Firebase Callable 또는 Firestore collection
- 새 Judge 런타임 및 Python 문법 파서
- 코드 문자열·정규식·AST 형태 채점
- 문제별 별도 진도나 보상 모델

현재 공용 evaluator는 `not`, `and`, `or`, 모든 비교 연산자, chained comparison, `if/elif/else`를 이미 지원한다. 신규 런타임 작업은 필요 없다.

### 4.1 Lens 확정

Catalog와 Public Kernel의 `lensId`는 세 문제 모두 `state-transition`으로 맞춘다.

`ConditionTableLens`를 확장하지 않는다. 이 컴포넌트는 AC-COND-001/002의 2입력 진리표에 최적화되어 있고, 세 문제를 지원하도록 일반화하면 분기·수직선·단항 논리를 한 컴포넌트에 섞게 된다.

`StateTransitionLens` 프레임에는 다음 공통 필드만 사용한다.

```js
{
  id: 'stable-id',
  operationLabel: '학생용 장면 이름',
  prompt: '이 장면에서 발견할 짧은 설명',
  stateAfter: { /* 화면에 보여 줄 정규화 상태 */ },
}
```

기존 Lens가 `prompt`와 임의 상태 key/value를 표시하므로 추가 UI 개발이 필요 없다.

## 5. AC-COND-NOT-13 — 반전된 경보등

### 5.1 학습 목표

- Boolean 상태 하나를 반대로 바꾸는 규칙을 발견한다.
- `True → False`, `False → True` 두 방향을 모두 확인한다.
- 입력 상태와 출력 상태를 같은 의미로 그대로 반환하는 오류를 구분한다.

### 5.2 Public Kernel 계약

```js
curriculum: {
  constellationId: 'constellation-1',
  routeRole: 'core',
  learningRole: 'practice',
  recommendedBand: 'E',
  prerequisites: ['AC-COND-001'],
},
pythonConcepts: {
  requires: ['concept:function-body-focus', 'value:boolean'],
  introduces: ['operator:not'],
},
thinkingPatterns: {
  requires: [],
  introduces: [],
},
```

함수 계약:

```python
def is_alarm_light_on(silent_mode):
    ...
```

- `silent_mode`는 Boolean만 사용한다.
- 반환값도 Boolean이다.
- 침묵 모드가 켜지면 경보등은 꺼지고, 침묵 모드가 꺼지면 경보등은 켜진다.

Starter에는 `not`을 미리 노출하지 않는다.

```python
def is_alarm_light_on(silent_mode):
    # 앞에서 발견한 경보등 규칙을 코드로 표현하세요.
    pass
```

### 5.3 Observe·Explore

Observe:

```text
silent_mode=False일 때 경보등은 켜졌습니다.
silent_mode=True가 되면 경보등은 어떻게 될까요?
```

Explore 프레임:

1. `{ silentMode: false, alarmLightOn: true }`
2. `{ silentMode: true, alarmLightOn: false }`
3. `{ inputChanged: 'False → True', outputChanged: 'True → False' }`

규칙을 공개하기 전에는 `not` 키워드를 표시하지 않는다. Explore 완료 후 First Encounter에서 처음으로 `not` 이름과 문법을 연결한다.

### 5.4 1★ Private Judge

공식 풀이:

```python
def is_alarm_light_on(silent_mode):
    return not silent_mode
```

대안 풀이:

```python
def is_alarm_light_on(silent_mode):
    if silent_mode:
        return False
    return True
```

오답 fixture:

| Fixture | 코드 요지 | expectedFailingGroup |
|---|---|---|
| `NOT-DIRECT-RETURN` | `return silent_mode` | `silent_active` |
| `NOT-ALWAYS-TRUE` | `return True` | `silent_active` |
| `NOT-ALWAYS-FALSE` | `return False` | `silent_inactive` |

hidden tests:

- `silent_active`: `True → False`
- `silent_inactive`: `False → True`

Boolean 함수는 입력 경우가 두 개뿐이므로 같은 케이스를 여러 번 복제하지 않는다. 2개 테스트면 행동 공간을 완전히 덮으며 Judge 비용도 최소다.

### 5.5 2★ 이해 증거

1. `not True`와 `not False`의 결과는? → `False와 True`
2. `silent_mode=True`인데 경보등이 꺼지는 이유는? → `입력 상태를 반대로 뒤집는 규칙이기 때문`

두 번째 문항의 오답에는 “값이 비어 있기 때문”처럼 Python truthiness의 다른 개념을 끌어오지 않는다. 권장 오답은 “입력 상태를 그대로 사용하기 때문”이다.

### 5.6 3★ Fresh Transfer

```python
def is_hull_breached(sensor_ok):
    # 센서가 정상이라면 균열 없음(False), 정상이 아니라면 균열 있음(True)
    pass
```

- `sensor_ok=True → False`
- `sensor_ok=False → True`
- Base와 변수·이야기는 다르지만 동일한 단항 반전 사고만 요구한다.

## 6. AC-COND-ELIF-14 — 세 단계 위험 신호

### 6.1 학습 목표

- 조건이 위에서 아래로 평가된다는 점을 이해한다.
- 먼저 참이 된 분기의 결과만 선택되고 뒤 분기는 건너뛴다는 점을 확인한다.
- 넓은 조건을 먼저 두면 더 구체적인 높은 위험 분기가 가려질 수 있음을 발견한다.
- 코드 문법 형태가 아니라 3개 구간의 올바른 행동을 구현한다.

### 6.2 입력 계약

```python
def classify_hazard_level(danger_score):
    ...
```

- `danger_score`는 `0 <= danger_score <= 100`인 정수다.
- `80..100 → 'CRITICAL'`
- `50..79 → 'WARNING'`
- `0..49 → 'SAFE'`

입력 범위를 Public 문제 설명과 Private 정의 양쪽에서 동일하게 유지한다.

### 6.3 Public Kernel 계약

```js
curriculum: {
  constellationId: 'constellation-1',
  routeRole: 'core',
  learningRole: 'practice',
  recommendedBand: 'E',
  prerequisites: ['AC-COND-001', 'AC-EXP-BOUND-05'],
},
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'value:boolean',
    'operator:comparison-bound',
  ],
  introduces: ['operator:comparison-lower-bound', 'statement:elif'],
},
thinkingPatterns: {
  requires: [],
  introduces: [],
},
```

Starter의 임계값과 반환값은 문제 규칙이므로 공개해도 된다. 그러나 문법 학습 전 `elif` 골격을 완성해 주지는 않는다.

```python
def classify_hazard_level(danger_score):
    # 80 이상은 'CRITICAL', 50 이상은 'WARNING', 나머지는 'SAFE'입니다.
    pass
```

### 6.4 Observe·Explore

Observe는 코드가 아니라 실행 장면으로 시작한다.

```text
점수 90은 80 이상이면서 50 이상이기도 합니다.
그런데 결과는 하나만 선택해야 합니다. 어느 단계가 먼저여야 할까요?
```

Explore 프레임:

1. `{ score: 49, firstCheck: false, secondCheck: false, selected: 'SAFE' }`
2. `{ score: 50, firstCheck: false, secondCheck: true, selected: 'WARNING' }`
3. `{ score: 79, firstCheck: false, secondCheck: true, selected: 'WARNING' }`
4. `{ score: 80, firstCheck: true, secondCheck: 'skipped', selected: 'CRITICAL' }`
5. `{ score: 90, firstCheck: true, secondCheck: 'skipped', selected: 'CRITICAL' }`

`skipped` 상태를 명시적으로 보여 주어 첫 조건이 참이면 다음 조건을 검사하지 않는다는 증거를 만든다.

### 6.5 1★ Private Judge

공식 풀이:

```python
def classify_hazard_level(danger_score):
    if danger_score >= 80:
        return 'CRITICAL'
    elif danger_score >= 50:
        return 'WARNING'
    else:
        return 'SAFE'
```

Guard Return 대안과 중첩 if도 행동이 같으면 통과시킨다. `elif` 문자열 존재 여부를 검사하지 않는다.

오답 fixture:

| Fixture | 코드 요지 | expectedFailingGroup |
|---|---|---|
| `ELIF-ORDER-REVERSAL` | `>=50`을 `>=80`보다 먼저 반환 | `critical_boundary` |
| `ELIF-MISSING-FALLTHROUGH` | SAFE 반환 누락 | `safe_zone` |
| `ELIF-ALWAYS-WARNING` | 고정 문자열 반환 | `varied_scores` |

hidden tests:

- `critical_boundary`: `80 → CRITICAL`, `100 → CRITICAL`
- `warning_boundary`: `50 → WARNING`, `79 → WARNING`
- `safe_zone`: `0 → SAFE`, `49 → SAFE`
- `varied_scores`: `65 → WARNING`, `95 → CRITICAL`

각 경계의 바로 아래와 정확한 경계값을 반드시 포함한다. 총 8개 상수 시간 호출이면 충분하다.

### 6.6 2★ 이해 증거

1. `score=85`에서 `score>=50`을 먼저 반환하면 왜 잘못되는가? → `WARNING이 먼저 선택되어 CRITICAL 분기에 도달하지 못한다.`
2. `score=90`이고 첫 조건 `score>=80`이 참이면 다음 `elif score>=50`은? → `검사하지 않고 건너뛴다.`

첫 문항은 “85가 50보다 작다” 같은 터무니없는 오답보다 “두 조건을 모두 검사해 마지막 결과를 쓴다”처럼 실제 분기 순서 오개념을 distractor로 사용한다.

### 6.7 3★ Fresh Transfer

```python
def classify_battery_level(battery):
    # 20 미만 LOW, 70 미만 NORMAL, 나머지 FULL
    pass
```

- 입력 계약: `0 <= battery <= 100` 정수
- `0..19 → 'LOW'`
- `20..69 → 'NORMAL'`
- `70..100 → 'FULL'`
- 테스트: `0`, `19`, `20`, `69`, `70`, `100`

Base의 상한부터 검사하는 방식과 달리 하한부터 검사하도록 바꾸되, 새로운 Python 문법은 요구하지 않는다.

## 7. AC-COND-RANGE-15 — 안전 온도 구간

### 7.1 학습 목표

- 하한과 상한을 각각 판정한다.
- 두 판정이 모두 참이어야 구간 내부라는 점을 이해한다.
- 정확한 하한과 정확한 상한도 포함한다.
- 한쪽 경계만 검사하거나 `or`로 연결하는 오류를 구분한다.

### 7.2 입력 계약

```python
def is_temperature_safe(temp, min_temp, max_temp):
    ...
```

- 모든 입력은 정수다.
- 항상 `min_temp <= max_temp`다.
- 음수 온도도 허용한다.
- 반환값은 Boolean이다.
- `temp`가 닫힌 구간 `[min_temp, max_temp]`에 있으면 True다.

`min_temp <= max_temp` 계약은 `or` 오답이 사실상 항상 True가 된다는 2★ 설명을 수학적으로 보장한다.

### 7.3 Public Kernel 계약

```js
curriculum: {
  constellationId: 'constellation-1',
  routeRole: 'core',
  learningRole: 'anchor',
  recommendedBand: 'E',
  prerequisites: ['AC-COND-002', 'AC-COND-ELIF-14'],
},
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'value:boolean',
    'operator:and',
    'operator:or',
    'operator:comparison-bound',
    'operator:comparison-lower-bound',
  ],
  introduces: [],
},
thinkingPatterns: {
  requires: [],
  introduces: [],
},
```

Starter는 연산자 번역을 대신하지 않는다.

```python
def is_temperature_safe(temp, min_temp, max_temp):
    # 두 경계선 위를 포함한 안전 구간인지 판정하세요.
    pass
```

다음 표현은 Starter에서 피한다.

```text
min_temp 이상이고 max_temp 이하
>=와 <=를 and로 연결하세요
```

### 7.4 Observe·Explore

Observe:

```text
안전 구간이 10부터 30까지이고 두 경계선도 포함됩니다.
9, 10, 20, 30, 31 가운데 안전한 값은 무엇일까요?
```

Explore 프레임:

1. `{ temp: 9, lowerPassed: false, upperPassed: true, safe: false }`
2. `{ temp: 10, lowerPassed: true, upperPassed: true, safe: true, position: 'lower-boundary' }`
3. `{ temp: 20, lowerPassed: true, upperPassed: true, safe: true, position: 'inside' }`
4. `{ temp: 30, lowerPassed: true, upperPassed: true, safe: true, position: 'upper-boundary' }`
5. `{ temp: 31, lowerPassed: true, upperPassed: false, safe: false }`

별도 NumberLine 컴포넌트 없이도 아래·경계·내부·경계·위의 5장면을 순서대로 보여 주면 핵심 증거를 확보할 수 있다.

### 7.5 1★ Private Judge

공식 풀이:

```python
def is_temperature_safe(temp, min_temp, max_temp):
    return temp >= min_temp and temp <= max_temp
```

chained comparison 대안도 통과시킨다.

```python
def is_temperature_safe(temp, min_temp, max_temp):
    return min_temp <= temp <= max_temp
```

오답 fixture:

| Fixture | 코드 요지 | expectedFailingGroup |
|---|---|---|
| `RANGE-STRICT-INEQUALITY` | 양쪽 경계를 제외 | `exact_boundaries` |
| `RANGE-OR-LOGIC-BUG` | 두 비교를 `or`로 연결 | `outside_both_sides` |
| `RANGE-LOWER-ONLY` | 하한만 검사 | `upper_violation` |
| `RANGE-UPPER-ONLY` | 상한만 검사 | `lower_violation` |

hidden tests:

- `exact_boundaries`: `(10,10,30) → True`, `(30,10,30) → True`
- `zero_width_range`: `(5,5,5) → True`
- `inside`: `(20,10,30) → True`
- `upper_violation`: `(35,10,30) → False`
- `lower_violation`: `(5,10,30) → False`
- `outside_both_sides`: `(-100,0,100) → False`, `(500,0,100) → False`
- `negative_range`: `(-5,-10,-1) → True`

총 9개 상수 시간 테스트로 경계·정상·양쪽 위반·음수 구간을 모두 덮는다.

### 7.6 2★ 이해 증거

1. `min=10`, `max=30`에서 `temp=10`과 `temp=30`은? → `둘 다 포함된다.`
2. 같은 올바른 경계 순서에서 `temp>=10 or temp<=30`을 사용하면? → `모든 temp가 적어도 한 조건을 만족해 구간 밖도 True가 된다.`

“구간 밖의 모든 값도 항상 True”보다는 위처럼 전제가 포함된 설명을 사용한다.

### 7.7 3★ Fresh Transfer

```python
def is_launch_window_open(current_time, start_time, end_time):
    # 시작 시각과 종료 시각도 발사 가능 시간에 포함됩니다.
    pass
```

- 모든 입력은 같은 날의 정수 시각이며 `start_time <= end_time`이다.
- 자정을 넘는 구간은 이번 문제 범위에서 제외한다.
- 테스트에 시작 경계, 내부, 종료 경계, 양쪽 바깥을 포함한다.
- 시간 표면으로 바뀌지만 닫힌 구간 판정 외의 새 개념은 요구하지 않는다.

## 8. Python First Encounter 계약

### 8.1 `operator:not`

```js
'operator:not': {
  conceptId: 'operator:not',
  displayName: 'not (참과 거짓 반전)',
  kind: 'operator',
  canonicalFirstProblemId: 'AC-COND-NOT-13',
  why: 'Boolean 상태를 반대로 바꿀 때 사용해요.',
  tinyExample: 'not True → False\nnot False → True',
  syntaxExample: 'return not silent_mode',
  predictionCheck: {
    prompt: 'not False의 결과는 무엇일까요?',
    options: ['True', 'False'],
    expected: 'True',
  },
  protocolRepairId: 'PR-NOT-001',
}
```

### 8.2 `operator:comparison-lower-bound`

기존 `operator:comparison-bound`는 `<`, `<=`만 설명하므로 ELIF-14에서 처음 사용하는 `>`, `>=`를 별도 micro-lesson으로 등록한다. 이를 통해 BOUND-05를 완료한 학생에게 학습하지 않은 비교 방향이 갑자기 나타나는 문제를 방지한다.

```js
'operator:comparison-lower-bound': {
  conceptId: 'operator:comparison-lower-bound',
  displayName: '>, >= (아래 경계와 비교하기)',
  kind: 'operator',
  canonicalFirstProblemId: 'AC-COND-ELIF-14',
  why: '값이 아래 경계보다 큰지 또는 경계값까지 포함해 큰지 판정할 때 사용해요.',
  tinyExample: '5 >= 5 → True\n5 > 5 → False',
  syntaxExample: 'return score >= warning_line',
  predictionCheck: {
    prompt: '80 >= 80의 결과는 무엇일까요?',
    options: ['True', 'False'],
    expected: 'True',
  },
  protocolRepairId: 'PR-LOWER-BOUND-001',
}
```

### 8.3 `statement:elif`

`statement:elif`는 단어 하나가 아니라 이번 과정에서 처음 만나는 **순서 있는 if/elif/else 분기 구조** 전체를 설명한다.

```js
'statement:elif': {
  conceptId: 'statement:elif',
  displayName: 'if / elif / else (순서 있는 여러 갈래)',
  kind: 'statement',
  canonicalFirstProblemId: 'AC-COND-ELIF-14',
  why: '조건을 위에서부터 확인하고 처음 참인 한 갈래만 실행해요.',
  tinyExample: 'if score >= 80:\n    return "A"\nelif score >= 50:\n    return "B"\nelse:\n    return "C"',
  syntaxExample: 'if condition1:\n    ...\nelif condition2:\n    ...\nelse:\n    ...',
  predictionCheck: {
    prompt: '첫 if 조건이 True라면 다음 elif 조건은 검사할까요?',
    options: ['검사하지 않는다', '항상 검사한다'],
    expected: '검사하지 않는다',
  },
  protocolRepairId: 'PR-ELIF-001',
}
```

두 개념 모두 Registry의 기존 필수 필드와 canonical-first 자동 검사를 통과해야 한다.

## 9. 오개념 진단 범위

Private fixture에는 안정된 `expectedMisconception` 태그를 기록한다.

권장 태그:

- `IDENTITY-PASS-THROUGH`
- `BRANCH-ORDER-EVALUATION-ERROR`
- `MISSING-FALLTHROUGH`
- `BOUNDARY-INCLUSION-ERROR`
- `CONJUNCTION-DISJUNCTION-CONFUSION`
- `ONE-SIDED-BOUND`
- 기존 `HARDCODED-SAMPLE-RETURN`

이번 구현에서는 이 태그마다 전역 taxonomy 항목이나 정규식 matcher를 추가하지 않는다. 현재 학생 진단 엔진이 실제로 소비하지 않는 분류를 미리 늘리는 것은 개발 효율이 낮다. Judge 실패 그룹과 Scaffold 질문은 문제 정의 안에서 제공한다.

## 10. Catalog·Registry·출판 계약

### 10.1 Catalog 변경

13~15의 Catalog 항목을 다음과 같이 갱신한다.

- `status: 'published'`
- `lensId: 'state-transition'`
- 이 가이드의 정확한 prerequisites
- 기존 `routeRole`, `learningRole`, provenance 유지

Public Kernel의 `curriculum.prerequisites`와 Catalog prerequisites는 배열 순서까지 같아야 한다.

### 10.2 실행 레지스트리

다음을 같은 변경에서 함께 반영한다.

- Public 문제 파일 3개
- Public `problems/index.js` import/export/map
- Private 문제 파일 3개
- Private `problems/index.cjs` import/map
- Catalog 3개 published 전환

구현 후 현재 실행 집합은 24개가 되지만, 테스트에 숫자 `24`를 하드코딩하지 않는다.

### 10.3 집합 불변식

현재 배포 구조에서는 다음 계약을 유지한다.

```text
Published Catalog IDs = Public Kernel IDs = Private Problem IDs
```

계획의 부분집합 수명주기 모델은 별도의 CMS 또는 staging registry가 실제로 도입될 때 검토한다. 지금 완화하면 학생에게 보이지 않는 클라이언트 코드와 서버 정의가 남아 번들·유지 비용을 증가시킨다.

## 11. 저작 검증 강화

기존 검사를 유지하면서 다음을 확인한다.

- Published/Public/Private 정확한 집합 일치
- Public/Private `problemVersion`, `entryFunction`, 매개변수 배열 일치
- Catalog/Public `lensId`, prerequisites 일치
- 모든 published prerequisite가 Catalog에 존재하고 published 상태인지 확인
- prerequisite의 `catalogOrder`가 현재 문제보다 앞서는지 확인
- Python concept 필수 필드와 canonical first problem 확인
- official solution 및 alternative solutions Base 통과
- 모든 intended wrong fixture가 실패하고 지정 그룹도 실패
- Understanding question의 ID·options·expected 일치
- Transfer starter/official 함수명과 매개변수 일치
- Transfer official solution 통과

추가 권장 검사:

```text
RANGE 입력 fixture/test에서 min_temp <= max_temp
ELIF 및 battery test가 선언된 0..100 범위 안에 있음
NOT hidden test 입력 집합이 {True, False}를 정확히 덮음
```

위 도메인 검사는 범용 스키마를 확장하지 말고 신규 세 문제를 대상으로 한 작은 계약 테스트로 작성한다.

## 12. 구현 순서

한 번에 많은 파일을 고치기보다 다음 7단계로 진행한다.

1. `operator:not`, `statement:elif`를 Python concept registry에 등록한다.
2. 신규 Public Kernel 3개를 `createCapabilityPrototypeKernel`로 작성한다.
3. 신규 Private 정의 3개에 solution, alternatives, fixtures, hidden, understanding, transfer를 작성한다.
4. Public/Private registry와 Catalog를 함께 갱신해 집합 parity를 맞춘다.
5. 저작 검증기에 도메인·선수 조건 계약을 추가한다.
6. 서버 Callable 전체 생명주기 테스트를 신규 3문제로 확장한다.
7. 전체 회귀 테스트, ESLint, 프로덕션 빌드를 실행한다.

문제별 UI 구현부터 시작하지 않는다. 먼저 Public/Private 데이터 계약과 자동 검증을 완성한 뒤 기존 Shell에서 렌더링한다.

## 13. 비용·성능 기준

- NOT Base hidden tests: 정확히 2개
- ELIF Base hidden tests: 6~8개
- RANGE Base hidden tests: 8~9개
- 각 Transfer test: 4~6개
- 모든 테스트는 상수 시간 함수 호출
- intended wrong fixture당 기존 20,000 누적 스텝 상한 유지
- 새 서버 API·DB 읽기·DB 쓰기 없음
- 새 npm dependency 없음
- 새 전용 Lens 없음
- 공식 풀이, 대안 풀이, 오답 fixture 전체를 한 번의 저작 검증 프로세스에서 평가

이 범위에서는 테스트 수를 무작정 늘리는 것보다 경계·오개념 그룹을 정확히 분리하는 것이 더 중요하다.

## 14. 자동 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

`test-gate0-curriculum-contracts.mjs`는 이름을 당장 바꾸지 않아도 된다. 파일 이름 변경은 import와 package script 수정만 늘리고 학습 계약 품질에는 기여하지 않는다. 내부에 성단 1 선수 조건 및 Core/Branch 게이트 검사를 추가한다.

## 15. 완료 정의

다음 조건을 모두 만족하면 구현 완료다.

- 세 문제 모두 Observe → Explore → First Encounter → Code → 1★ → 2★ → 3★를 기존 Shell에서 완주한다.
- NOT-13은 `not`을 Explore 전에 노출하지 않는다.
- ELIF-14는 첫 참 분기 뒤의 조건이 `skipped`임을 화면과 2★에서 확인한다.
- RANGE-15는 하한·내부·상한·양쪽 바깥 사례를 모두 관찰한다.
- BOUND-05 미완료 학생에게 ELIF-14와 RANGE-15가 잠긴다.
- 대안 풀이를 AST나 문자열 검사 없이 통과시킨다.
- 신규 3개가 성단 1의 Core 완료 수에는 포함되지만 Branch로 계산되지 않는다.
- Published/Public/Private 집합 parity가 유지된다.
- 신규 API·저장 모델·런타임 기능·전용 Lens가 없다.
- 전체 자동 테스트, ESLint, 프로덕션 빌드가 통과한다.

## 16. 구현 담당 AI 금지 사항

- 세 문제에 현재 `ConditionTableLens`를 연결하지 않는다.
- 존재하지 않는 `decision-gate` Lens ID를 사용하지 않는다.
- RANGE-15만을 위한 NumberLine 컴포넌트를 새로 만들지 않는다.
- `not`, `elif`, chained comparison 문자열의 존재를 채점하지 않는다.
- 대안 풀이를 문법 형태가 다르다는 이유로 거부하지 않는다.
- Public Kernel에 hidden tests, official solution, private expected answer를 넣지 않는다.
- BOUND-05 없이 비교 연산자가 필요한 문제를 열지 않는다.
- `min_temp > max_temp` 또는 자정을 넘는 시간 구간을 이번 문제에 섞지 않는다.
- 신규 fixture 태그마다 사용되지 않는 전역 matcher를 만들지 않는다.
- 개발 편의를 이유로 Published/Public/Private 집합 검증을 약화하지 않는다.
- 기존 progress 조회로 해결되는 잠금 때문에 서버 호출을 추가하지 않는다.
