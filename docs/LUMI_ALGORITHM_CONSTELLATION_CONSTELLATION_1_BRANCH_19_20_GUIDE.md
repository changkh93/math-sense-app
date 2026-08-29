# LUMI 알고리즘 성단 — 성단 1 선택 항로 Branch 19~20 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-COND-TOGGLE-19`, `AC-COND-ORDER-20`  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → Branch 19~20 계획 v2 → 기존 문서**  
> 핵심 원칙: 성단 1에서 배운 도구를 새로운 사고 과제로 결합하되, 새 UI·Callable·저장 구조를 만들지 않는다.

## 1. 최종 평가

계획 v2의 큰 방향은 좋다.

- TOGGLE-19는 `for + if + not + 상태 갱신`을 결합해 단발성 조건 판정을 시간에 따른 상태 추적으로 확장한다.
- ORDER-20은 GRADE-17의 조건 우선순위를 코드 비교와 반례 탐색으로 한 단계 높인다.
- 두 문제를 Branch로 분리해 성단 2 진입을 막지 않는 것도 적절하다.

그러나 계획 그대로 구현하면 다음 문제가 발생한다.

1. TOGGLE-19가 요구하는 `container:list-iteration`은 현재 Python Concept Registry에 없는 ID다.
2. `AC-EXP-LOOP-06`은 `range()` 반복을 다루며 리스트 자체를 처음 소개하지 않는다. TOGGLE의 Boolean 리스트를 설명 없이 사용하면 학생에게 새 자료형이 갑자기 등장할 수 있다.
3. TOGGLE Transfer의 `cmd == 1`은 등록되지 않은 비교 문법 `==`를 새로 요구한다. “미학습 문법 의존성 차단”이라는 계획의 목적과 반대다.
4. 계획의 `mixed_actions` 두 테스트는 `action`과 무관하게 매번 반전하는 오답도 우연히 정답이 된다. 따라서 `TOGGLE-UNCONDITIONAL-FLIP` fixture가 지정 그룹에서 실패하지 않는다.
5. ORDER-20의 Base를 Code A와 Code B 전체 소스로 비교한 뒤 정답 함수를 작성하게 하면 학생이 Code A를 그대로 복사할 수 있다.
6. ORDER-20의 방사선 Fresh Transfer는 GRADE-17의 Fresh Transfer와 함수명·도메인·전략이 거의 동일하다. 새로운 전이 증거가 아니다.
7. ORDER Hidden 9개는 같은 구간 안의 중복 행동을 반복한다. 정확도를 유지하면서 6개 핵심 경계로 줄일 수 있다.
8. `published ⊆ public/private`와 `Published = Public = Private`를 동시에 적은 상태 계약은 모순이다. 현재 릴리스 구조에서는 정확한 ID 집합 동등성을 유지해야 한다.

따라서 계획을 **수정 승인**한다. 아래 내용을 최종 구현 계약으로 사용한다.

## 2. 채택·수정·폐기 결정

| 계획 요소 | 결정 | 최종 기준 |
|---|---|---|
| TOGGLE의 누적 Boolean 상태 추적 | 채택 | 항상 `현재 상태`를 기준으로 다음 상태를 계산한다. |
| `for + if + not` 결합 | 채택 | 모두 선행 문제에서 학습한 뒤 진입한다. |
| `container:list-iteration` 개념 ID | 폐기 | 기존 `builtin:list`, `statement:for`를 사용한다. |
| 정수 명령 `1/0` Transfer | 폐기 | 미학습 `==` 대신 Boolean 명령과 안전 잠금을 결합한다. |
| 무조건 반전 fixture | 채택·수정 | 실제로 실패하는 혼합 신호를 사용한다. |
| ORDER의 반례 탐색 | 채택 | `pattern:counterexample-search`를 재사용한다. |
| Code A 전체 정답 노출 | 폐기 | 정책 기준과 버그가 있는 Code B만 제공해 수리하게 한다. |
| ORDER의 방사선 Transfer | 폐기 | GRADE-17과 중복되지 않는 통신 지연 코드 수리로 교체한다. |
| ORDER Hidden 9개 | 축소 | 3구간의 경계·극값 6개로 검증한다. |
| 문제별 Lens·Mode·Callable | 폐기 | 기존 `StateTransitionLens`와 공용 학습 루프를 재사용한다. |
| AST·코드 문자열 정답 강제 | 폐기 | 반환 행동만 채점한다. |
| 부분집합 출판 수명주기 | 폐기 | Published/Public/Private 정확한 ID 집합 동등성을 유지한다. |
| Branch를 성단 2 개방 수에 포함 | 폐기 | Core 6/8 계산과 완전히 분리한다. |

## 3. 학습 위치와 선수 조건

```text
성단 1 Core 11~18
  ├─ Branch 19: 반복되는 신호에 따라 현재 상태를 누적 갱신
  └─ Branch 20: 겹치는 분기 코드의 버그를 반례로 발견하고 수리
```

두 Branch는 서로 독립적이다. TOGGLE-19를 완료하지 않아도 ORDER-20을 열 수 있고, 두 문제 모두 성단 2 개방 조건에 포함하지 않는다.

### 3.1 확정 선수 조건

| 문제 | 선수 조건 | 이유 |
|---|---|---|
| TOGGLE-19 | `AC-EXP-LOOP-06`, `AC-CODE-FIRST-ERROR-01`, `AC-COND-NOT-13` | 반복 상태 갱신, 리스트·if, Boolean 반전을 모두 보장한다. |
| ORDER-20 | `AC-COND-GRADE-17` | `elif`, 경계 비교, 처음 참인 분기에서 종료되는 실행 모델을 이미 이수했다. |

TOGGLE에 `AC-CODE-FIRST-ERROR-01`을 명시하는 이유는 그 문제가 현재 `builtin:list`와 `statement:if`의 정규 최초 경험이기 때문이다. 성단 개방 Anchor가 간접적으로 완료를 보장하더라도, 문제 자체의 선수 계약을 독립적으로 완전하게 유지한다.

ORDER는 `AC-COND-ELIF-14`를 중복 기재하지 않는다. GRADE-17의 선수 관계가 이미 ELIF-14 이수를 보장한다.

선수 완료 기준은 기존과 동일하게 1★ 이상이다. Hub의 공용 `progressMap`과 prerequisite 잠금만 사용하며 추가 Firestore 조회를 만들지 않는다.

## 4. 공통 구현 아키텍처

```text
createCapabilityPrototypeKernel
  → ObserveMode
  → ExploreMode / StateTransitionLens
  → FirstEncounterCard(필요한 기존 개념·패턴 복구)
  → CodeMode / Student Sandbox
  → Existing Callable / Isolated Judge
  → UnderstandingCheckMode
  → TransferChallengeMode
  → Existing Progress Ledger
```

추가하지 않는 것:

- `ToggleLens`, `CounterexampleCompareLens`
- 문제별 React Mode와 CSS
- 신규 Firebase Callable 또는 Firestore collection
- 신규 Python 문법 지원
- 문제별 오개념 matcher
- Branch 전용 별·보상·진도 구조

두 문제의 Catalog와 Public Kernel `lensId`는 모두 `state-transition`으로 통일한다.

### 4.1 행동 채점 원칙

- 함수명과 매개변수는 프로토콜로 검증한다.
- 반환값과 상태 계산 결과만 채점한다.
- Guard Return, `if/else`, 동등한 Boolean 표현 등 대안 풀이를 허용한다.
- TOGGLE에서 `count(True) % 2`처럼 행동이 같은 풀이도 통과시킨다. 특정 반복문 형태를 AST로 강제하지 않는다.
- ORDER에서 중첩 `if`, 연속 Guard Return 등 행동이 같으면 통과시킨다.

1★가 행동 정확성을, Explore와 2★가 의도한 사고 과정을 증명한다.

## 5. AC-COND-TOGGLE-19 — 꺼졌다 켜지는 기지

### 5.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-COND-TOGGLE-19` |
| Catalog order | `19` |
| 역할 | `Branch / Review` |
| 함수 | `toggle_base_power(initial_power, toggle_actions)` |
| 선수 조건 | `['AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01', 'AC-COND-NOT-13']` |
| Lens | `state-transition` |
| 입력 | Boolean, Boolean 리스트 길이 `0..20` |
| 반환 | 모든 신호 처리 후 Boolean 상태 |

공식 기준 구현:

```python
def toggle_base_power(initial_power, toggle_actions):
    power = initial_power
    for action in toggle_actions:
        if action:
            power = not power
    return power
```

### 5.2 Python·사고 계약

```js
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'operator:assignment',
    'builtin:list',
    'statement:for',
    'statement:if',
    'value:boolean',
    'operator:not',
    'operator:and',
  ],
  introduces: [],
}
```

`operator:and`는 Base가 아니라 Fresh Transfer의 안전 잠금 조건에서 회수된다. 선행 `AC-COND-NOT-13 → AC-COND-001` 관계로 이미 학습된 개념이다.

새 전역 사고 패턴을 등록하지 않는다.

```js
thinkingPatterns: { requires: [], introduces: [] }
evidenceRecipe: {
  primitives: ['container-scan', 'scalar-sequence', 'decision'],
  requiredClaims: [
    'toggle-uses-current-state',
    'false-action-preserves-state',
    'repeated-toggles-accumulate',
  ],
}
```

### 5.3 Observe·Explore

Observe:

> 전원이 꺼진 기지에서 토글 신호가 세 번 들어오면 최종 전원은 어떻게 될까요?

정답: `켜진다(True)`.

Explore의 `initialState`와 frame을 중복하지 않는다.

```js
initialState: {
  power: false,
  processedActions: 0,
  status: '신호 처리 전',
}
```

| frame | action | 이전 → 이후 | 관찰 초점 |
|---|---|---|---|
| 1 | `True` | `False → True` | 현재 상태 반전 |
| 2 | `False` | `True → True` | 상태 보존 |
| 3 | `True` | `True → False` | 바뀐 현재 상태를 다시 반전 |
| 4 | `False` | `False → False` | 상태 보존 |

확정 문구:

- `predictionPrompt`: 다음 신호를 처리한 뒤 현재 전원 상태가 어떻게 달라질지 예측해 보세요.
- `rulePrompt`: 참 신호와 거짓 신호가 현재 상태에 각각 어떤 영향을 주는지 찾아보세요.
- `ruleStatement`: 참 신호를 만나면 현재 상태를 반전하고, 거짓 신호를 만나면 현재 상태를 그대로 유지합니다.

Starter:

```python
def toggle_base_power(initial_power, toggle_actions):
    # 신호를 순서대로 처리해 기지의 최종 전원 상태를 반환하세요.
    pass
```

Starter에 `power = not power`를 제공하지 않는다. 이것이 학생이 발견해야 할 핵심 상태 갱신이다.

### 5.4 Public·Hidden 테스트

Public은 핵심 상태를 빠르게 확인하는 4개로 구성한다.

- `(False, []) → False`
- `(False, [True]) → True`
- `(False, [True, False]) → True`
- `(True, [True, True]) → True`

Hidden은 Public과 입력을 중복하지 않고 다음 8개를 사용한다.

- `no_action`: `(True, []) → True`
- `single_toggle`: `(True, [True]) → False`
- `preserve_only`: `(False, [False, False]) → False`, `(True, [False]) → True`
- `mixed_actions`: `(False, [True, False, False]) → True`, `(True, [False, True, False, False]) → False`
- `multiple_toggles`: `(False, [True, True]) → False`, `(True, [True, True, True, True]) → True`

중요: 혼합 신호의 **리스트 길이 parity**와 **True 개수 parity**가 달라야 무조건 반전 오답을 잡을 수 있다.

### 5.5 의도된 오답

| Fixture | 잘못된 행동 | 오개념 | 실패 그룹 |
|---|---|---|---|
| `TOGGLE-REUSE-INITIAL-STATE` | 매번 `not initial_power` 사용 | `STATE-UPDATE-FROM-STALE-VALUE` | `multiple_toggles` |
| `TOGGLE-NO-STATE-UPDATE` | 초기 상태 그대로 반환 | `MISSING-STATE-MUTATION` | `single_toggle` |
| `TOGGLE-UNCONDITIONAL-FLIP` | False 신호에서도 반전 | `UNCONDITIONAL-STATE-MUTATION` | `mixed_actions` |

저작 테스트는 fixture가 단순히 전체 실패하는지만 보지 말고 지정된 그룹에서 실제로 실패하는지 검증한다.

### 5.6 2★ 이해 증거

1. `False`에서 True 신호를 두 번 처리하면 왜 다시 `False`가 되는지 묻는다.
2. `power = not initial_power`가 두 번째 이후의 반전을 잃어버리는 이유를 묻는다.

정답 코드 문자열이 아니라 “이전 회차 결과가 다음 회차 입력 상태가 된다”는 정신 모델을 확인한다.

### 5.7 3★ Fresh Transfer — 안전 잠금이 있는 차폐막

정수 명령을 사용하지 않는다. Boolean 명령 리스트에 안전 잠금 상태를 추가한다.

```python
def toggle_shield_status(shield_on, commands, controls_locked):
    status = shield_on
    for command in commands:
        if command and not controls_locked:
            status = not status
    return status
```

입력 계약:

- `shield_on`, `controls_locked`: Boolean
- `commands`: Boolean 리스트, 길이 `0..20`
- 잠겨 있으면 모든 토글 명령을 무시한다.

테스트:

- `(False, [True, False, True], False) → False`
- `(True, [True, True, True], False) → False`
- `(False, [True], True) → False`
- `(True, [True, False], True) → True`
- `(True, [], False) → True`

Base의 반복 반전에 `and/not`으로 제어 조건을 결합하므로 단순 변수명 치환보다 강한 전이 증거가 된다. 새 문법은 없다.

## 6. AC-COND-ORDER-20 — 조건의 순서가 바꾸는 결과

### 6.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-COND-ORDER-20` |
| Catalog order | `20` |
| 역할 | `Branch / Review` |
| 함수 | `apply_discount_priority(amount)` |
| 선수 조건 | `['AC-COND-GRADE-17']` |
| Lens | `state-transition` |
| 입력 | 정수 `0..10000` |
| 반환 | 할인액 `0`, `100`, `300` |

정책:

- `amount >= 1000`: `300`
- 그보다 작고 `amount >= 500`: `100`
- 나머지: `0`

공식 기준 구현:

```python
def apply_discount_priority(amount):
    if amount >= 1000:
        return 300
    elif amount >= 500:
        return 100
    return 0
```

### 6.2 Code Review 문제로 차별화

정답 Code A 전체를 먼저 보여주지 않는다. 학생에게는 정책표와 다음 버그 코드만 제공한다.

```python
def apply_discount_priority(amount):
    if amount >= 500:
        return 100
    elif amount >= 1000:
        return 300
    return 0
```

이 코드는 600에서는 우연히 맞지만 1000 이상에서는 상위 혜택을 잃는다. 학생은 반례를 관찰한 뒤 Starter에 들어 있는 이 코드를 직접 수리한다.

이 설계는 GRADE-17의 빈 함수 작성과 달리 다음 능력을 평가한다.

- 기존 코드 읽기
- 정책과 실행 결과 비교
- 반례로 버그 재현
- 최소 수정으로 조건 순서 복구

### 6.3 Python·사고 계약

```js
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'value:boolean',
    'operator:comparison-lower-bound',
    'statement:elif',
  ],
  introduces: [],
}

thinkingPatterns: {
  requires: ['pattern:counterexample-search'],
  introduces: [],
}

evidenceRecipe: {
  primitives: ['source-debug', 'decision'],
  requiredClaims: [
    'matching-samples-do-not-prove-equivalence',
    'first-counterexample-at-overlap-boundary',
    'narrower-threshold-must-run-first',
  ],
}
```

학생이 성단 0 Branch EQUIV-09를 선택하지 않았더라도 First Encounter 공용 복구 카드가 `pattern:counterexample-search`를 설명한다. EQUIV-09 자체를 선수 문제로 강제하지 않는다.

### 6.4 Observe·Explore

Observe는 “600에서 맞았으니 항상 맞는가?”를 묻는다.

- 정책상 600 할인: 100
- 버그 코드 결과: 100
- 질문: 한 사례가 같으면 모든 금액에서도 항상 맞을까?
- 정답: 아니다. 겹치는 상위 구간에서 반례가 생길 수 있다.

Explore:

| amount | 정책 결과 | 버그 코드 | 판정 |
|---:|---:|---:|---|
| 200 | 0 | 0 | 일치 |
| 600 | 100 | 100 | 일치 |
| 999 | 100 | 100 | 일치 |
| 1000 | 300 | 100 | 첫 경계 반례 |
| 1200 | 300 | 100 | 상위 구간 불일치 |

확정 문구:

- `predictionPrompt`: 몇 개의 금액에서 결과가 같다는 사실만으로 이 코드가 항상 맞다고 말할 수 있을까요?
- `rulePrompt`: 두 조건을 동시에 만족하기 시작하는 경계값에서 버그 코드의 결과를 확인해 보세요.
- `ruleStatement`: 조건이 겹치면 더 좁고 높은 기준을 먼저 검사해야 하며, 첫 반례는 겹침이 시작되는 경계에서 찾을 수 있습니다.

Starter는 버그 코드 자체다.

```python
def apply_discount_priority(amount):
    # 아래 코드는 1000 이상 금액에서 상위 할인을 놓칩니다. 최소한으로 고쳐 보세요.
    if amount >= 500:
        return 100
    elif amount >= 1000:
        return 300
    return 0
```

### 6.5 Public·Hidden 테스트

Public:

- `200 → 0`
- `600 → 100`
- `1200 → 300`

Hidden은 구간별 핵심 6개만 사용한다.

- `high_tier_discounts`: `1000 → 300`, `10000 → 300`
- `mid_tier_discounts`: `500 → 100`, `999 → 100`
- `no_discount_range`: `0 → 0`, `499 → 0`

Public과 Hidden 입력은 중복하지 않는다. 각 구간의 정확한 경계와 극값을 서버에서 검증하므로 같은 행동의 1200, 1500 등을 추가할 필요가 없다.

### 6.6 의도된 오답

| Fixture | 잘못된 행동 | 오개념 | 실패 그룹 |
|---|---|---|---|
| `ORDER-REVERSED-BRANCH` | 500 이상을 먼저 검사 | `BRANCH-ORDER-EVALUATION-ERROR` | `high_tier_discounts` |
| `ORDER-MISSING-FALLTHROUGH` | 기본 0 반환 누락 | `MISSING-FALLTHROUGH` | `no_discount_range` |
| `ORDER-ALWAYS-300` | 항상 300 반환 | `HARDCODED-SAMPLE-RETURN` | `mid_tier_discounts` |
| `ORDER-STRICT-BOUNDARY` | `>`로 경계를 제외 | `BOUNDARY-INCLUSION-ERROR` | `high_tier_discounts` |

`ORDER-STRICT-BOUNDARY`는 정확히 1000과 500에서 실패하게 구성한다. 별도 전역 taxonomy나 matcher는 추가하지 않고 fixture 증거로만 보존한다.

### 6.7 2★ 이해 증거

1. 1200이 500 이상 분기에 먼저 걸리면 왜 100을 반환하고 종료되는지 묻는다.
2. 허용 입력에서 두 코드가 처음 달라지는 최소 경계값이 왜 1000인지 묻는다.

계획의 “1000 이상 영역” 이해와 구체적인 “첫 반례 1000”을 분리해 확인한다.

### 6.8 3★ Fresh Transfer — 통신 지연 분류 코드 수리

GRADE-17의 방사선 문제를 재사용하지 않는다. 다른 방향의 상한 조건과 버그 수리를 결합한다.

정책:

- 지연 시간이 5 이하: `CLEAR`
- 20 이하: `SLOW`
- 그 외: `LOST`

학생에게 제공되는 버그 Starter:

```python
def classify_signal_delay(delay):
    # 작은 지연을 먼저 구분하지 못하는 버그를 고쳐 보세요.
    if delay <= 20:
        return 'SLOW'
    elif delay <= 5:
        return 'CLEAR'
    return 'LOST'
```

공식 기준:

```python
def classify_signal_delay(delay):
    if delay <= 5:
        return 'CLEAR'
    elif delay <= 20:
        return 'SLOW'
    return 'LOST'
```

입력 계약: 정수 `0 <= delay <= 100`.

테스트:

- `0`, `5` → `CLEAR`
- `6`, `20` → `SLOW`
- `21`, `100` → `LOST`

Base의 `>=` 내림차순을 외우는 것으로는 풀 수 없고, `<=`에서는 더 작은 상한부터 검사해야 한다는 포섭 관계를 다시 판단해야 한다.

## 7. Catalog·출판·게이트 계약

### 7.1 Catalog 최종값

TOGGLE-19:

```js
{
  problemId: 'AC-COND-TOGGLE-19',
  catalogOrder: 19,
  constellationId: 'constellation-1',
  routeRole: 'branch',
  learningRole: 'review',
  status: 'published',
  prerequisites: [
    'AC-EXP-LOOP-06',
    'AC-CODE-FIRST-ERROR-01',
    'AC-COND-NOT-13',
  ],
  lensId: 'state-transition',
}
```

ORDER-20:

```js
{
  problemId: 'AC-COND-ORDER-20',
  catalogOrder: 20,
  constellationId: 'constellation-1',
  routeRole: 'branch',
  learningRole: 'review',
  status: 'published',
  prerequisites: ['AC-COND-GRADE-17'],
  lensId: 'state-transition',
}
```

기존 provenance는 유지한다.

### 7.2 출판 집합 불변식

현재 구조에서는 다음을 유지한다.

```text
Published problem ID set
  == Public Kernel problem ID set
  == Private Definition problem ID set
```

`29`라는 숫자를 assertion에 하드코딩하지 않는다. 세 집합의 양방향 차집합이 모두 비어 있는지 검증한다. 문제 수는 성공 로그에만 동적으로 표시한다.

### 7.3 성단 개방 격리

- TOGGLE과 ORDER는 `routeRole: 'branch'`다.
- 완료해도 성단 1의 Core 완료 수가 증가하지 않는다.
- 미완료여도 성단 2 개방을 막지 않는다.
- 별과 마스터리는 일반 문제처럼 기록하되 개방 계산에서만 제외한다.
- 문제별 예외 조건을 Hub에 추가하지 않는다. 기존 `routeRole === 'core'` 필터를 사용한다.

## 8. 파일별 구현 지시

### 8.1 Public Kernel

생성:

- `src/components/AlgorithmConstellation/shared/problems/ac_cond_toggle_19.js`
- `src/components/AlgorithmConstellation/shared/problems/ac_cond_order_20.js`

수정:

- `src/components/AlgorithmConstellation/shared/problems/index.js`
- `src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js`

`problemSolvingPatternRegistry.js`는 수정하지 않는다. ORDER는 기존 `pattern:counterexample-search`를 `requires`로 참조한다.

### 8.2 Private Definition

생성:

- `functions/algorithmConstellation/problems/ac_cond_toggle_19.private.cjs`
- `functions/algorithmConstellation/problems/ac_cond_order_20.private.cjs`

수정:

- `functions/algorithmConstellation/problems/index.cjs`

각 Private Definition은 기존 구조만 사용한다.

- `officialSolutionCode`
- `alternativeSolutions`
- `intendedWrongFixtures`
- `hiddenTests`
- `understandingChallenges`
- `transferMasterSet`

신규 Judge 코드나 문제별 evaluator를 만들지 않는다.

## 9. 자동 검증 계약

### 9.1 저작 무결성

`test-authoring-integrity-contracts.mjs`에 다음을 추가한다.

TOGGLE:

- 입력 리스트 길이 `0..20`
- `initial_power`와 모든 action이 실제 Boolean
- Public/Hidden 입력 중복 없음
- `container:list-iteration`, `operator:equality` 같은 미등록 개념 ID가 없음
- `TOGGLE-REUSE-INITIAL-STATE`가 `multiple_toggles`에서 실패
- `TOGGLE-UNCONDITIONAL-FLIP`이 `mixed_actions`에서 실패
- Transfer 입력도 Boolean만 사용
- 잠금 True/False와 빈 명령을 모두 검증

ORDER:

- Base 입력 정수 `0..10000`
- Hidden 정확히 6개
- 필수 경계 `0, 499, 500, 999, 1000, 10000`
- Starter가 실제로 Judge를 통과하지 못함
- `thinkingPatterns.requires`에 `pattern:counterexample-search` 존재
- Transfer가 GRADE-17의 `classify_radiation_danger`를 재사용하지 않음
- Transfer 입력 정수 `0..100`, 필수 경계 `0, 5, 6, 20, 21, 100`

공통:

- Published/Public/Private 동적 ID 집합 동등성
- Lens 프레임 ID와 상태 고유성
- `predictionPrompt`, `rulePrompt`, `ruleStatement` 존재

### 9.2 커리큘럼·게이트

`test-gate0-curriculum-contracts.mjs`에 다음을 추가한다.

- 두 문제 모두 `routeRole: 'branch'`, `learningRole: 'review'`
- TOGGLE 정확한 선수 조건 3개
- ORDER 선수 조건은 GRADE-17 하나
- 선수 미완료 시 잠김, 1★ 완료 시 열림
- 두 Branch를 완료해도 Core 완료 수가 증가하지 않음
- 두 Branch가 미완료여도 기존 Core 6/8과 Anchor 조건만 충족하면 성단 2가 열림

### 9.3 Judge·Callable

- 두 공식 Base 풀이 통과
- 모든 intended wrong fixture가 지정 그룹에서 실패
- 2★ 정답·오답 분리
- Transfer 공식 풀이 통과
- 버그 Starter 자체는 Transfer를 통과하지 못함
- 기존 Callable 생명주기와 멱등 보상 통과

## 10. 구현 순서와 비용 통제

### Step 1 — 실패 계약부터 추가

- 선수 조건
- 미등록 개념 금지
- fixture 지정 그룹 실패
- Branch 게이트 격리
- ORDER Transfer 중복 방지

### Step 2 — TOGGLE 세로 완성

- Public Kernel
- Private Definition
- Index 등록
- 단독 저작·Judge 테스트

### Step 3 — ORDER 세로 완성

- 버그 Starter 기반 Public Kernel
- Private Definition
- Index 등록
- 단독 저작·Judge 테스트

### Step 4 — Catalog 출판과 전체 회귀

- 두 Catalog 항목 `published`
- 동적 집합 parity
- Curriculum gate
- Callable lifecycle
- 전체 테스트, ESLint, build

한 번에 두 문제의 모든 파일을 만든 뒤 디버깅하지 않는다. 문제 하나를 Public → Private → 테스트 순으로 완결하면 계약 오류의 원인을 좁게 유지할 수 있다.

### 실행 순서

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

## 11. 완료 정의

- [ ] TOGGLE은 리스트·for·if·not을 모두 사전 학습한 학생에게만 열린다.
- [ ] TOGGLE의 각 회차는 최초 상태가 아니라 직전 상태를 사용한다.
- [ ] 무조건 반전 오답이 `mixed_actions`에서 실제로 실패한다.
- [ ] Transfer에 `==`나 다른 미학습 문법이 없다.
- [ ] ORDER는 정답 코드를 복사하는 문제가 아니라 버그 코드를 반례로 수리하는 문제다.
- [ ] ORDER의 첫 반례 1000과 불일치 영역을 설명할 수 있다.
- [ ] ORDER Transfer는 GRADE-17 방사선 문제를 재사용하지 않는다.
- [ ] 두 문제 모두 기존 Lens·Callable·Judge·Ledger만 사용한다.
- [ ] Branch 완료 여부가 성단 2 개방에 영향을 주지 않는다.
- [ ] Published/Public/Private ID 집합이 정확히 같다.
- [ ] 전체 자동 테스트, ESLint, Production build가 통과한다.

## 12. 후속 구현 AI에게 전달할 핵심 지시

> TOGGLE-19에서는 미등록 `container:list-iteration`이나 새 `==` 문법을 추가하지 말고, 기존 `builtin:list`, `for`, `if`, `not`, `and`만 재사용하라. 혼합 신호 테스트는 전체 길이와 True 개수의 parity가 달라야 무조건 반전 오답을 잡는다. ORDER-20은 정답 Code A를 먼저 노출하지 말고 버그가 있는 Starter를 반례로 수리하게 하라. GRADE-17의 방사선 Transfer를 복제하지 말고 통신 지연 분류의 반대 방향 경계를 사용하라. 새 UI·API·저장 모델·AST 채점은 만들지 말며, 두 Branch는 성단 개방 Core 계산에서 제외하라.
