# LUMI 알고리즘 성단 — 성단 2 본 항로 Core 26~28 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-PAT-DIVISOR-26`, `AC-PAT-PRIME-27`, `AC-PAT-GCD-28`  
> 선행 상태: C2-R 및 C2-A 완료, Published/Public/Private 32개 동적 집합 일치  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → 성단 2 NEXT IMPLEMENTATION PLAN → 기존 문서**  
> 핵심 원칙: 새 UI·Lens·Callable·저장 구조 없이 기존 데이터 기반 학습 루프에 세 문제를 추가한다.

## 1. 최종 평가

상위 계획의 `약수 → 소수 → 최대공약수` 순서는 초등·중등 학생에게 적절하다.

- 약수 문제에서 작은 후보를 모두 확인하는 탐색을 경험한다.
- 소수 문제에서 약수 탐색을 Boolean 판정으로 바꾼다.
- 최대공약수 문제에서 두 수의 상태를 반복적으로 줄이되 공통 성질이 유지되는 불변식을 경험한다.

성인 알고리즘 과정처럼 제곱근 최적화, 에라토스테네스의 체, 재귀 유클리드 알고리즘, 시간복잡도 증명을 요구하지 않는 방향도 그대로 채택한다.

다만 구현 전에 다음 사항을 보완한다.

1. `GCD-28`의 Fresh Transfer `reduce_ratio(a, b)`는 `//`, 리스트 반환, 원래 값 보존을 사용한다. 기존 선수 조건만으로는 이 전략이 보장되지 않으므로 `AC-PAT-DIGIT-24`와 `AC-EXP-SWAP-04`를 추가한다.
2. 26번에서 `1`, 27번에서 `0·1·2`, 28번에서 같은 수와 서로소는 서버 Hidden Test에 반드시 포함한다. 핵심 경계를 Public에만 두면 해당 경계에서 틀리는 코드가 1★를 통과할 수 있다.
3. Public Transfer의 `testCases`는 로컬 미리보기용 2개만 둔다. 서버 `transferMasterSet.testCases`는 다른 입력 4~6개를 사용해 공개 입력 하드코딩을 방지한다.
4. 세 문제 모두 기존 `state-transition` Lens로 충분하다. 후보 표, 소수 판정기, 톱니바퀴 전용 JSX를 만들지 않는다.
5. `candidate-filtering`, `prime-test`, `euclidean-gcd` 같은 전역 사고 패턴은 이번 단계에서 등록하지 않는다. 재사용 사례가 더 분명해질 때 승격하고 현재는 `requiredClaims`로 표현한다.
6. 특정 `for`, `while`, `%` 구현 형태를 AST로 강제하지 않는다. 행동이 같은 대안 풀이는 통과시킨다.
7. 총 문제 수 `35`를 테스트에 하드코딩하지 않는다. Published/Public/Private 문제 ID의 동적 집합 동등성을 계속 사용한다.

따라서 C2-B 계획은 **수정 승인**한다. 아래 내용을 최종 구현 계약으로 사용한다.

## 2. 채택·수정·폐기 결정

| 계획 요소 | 결정 | 최종 기준 |
|---|---|---|
| 26 약수 후보 전수 검사 | 채택 | `1..number`의 작은 유한 공간을 모두 확인한다. |
| 27 소수 판별 | 채택 | `0..200`, 제곱근 최적화 없이 구현한다. |
| 28 반복 감산 GCD | 채택 | 양수 `1..100`, 재귀·`math.gcd` 없이 설명한다. |
| GCD 선수 `DIVISOR-26`, `WHILE-07` | 수정 | `DIGIT-24`, `SWAP-04`도 추가한다. |
| 문제별 전용 Lens | 폐기 | 기존 `state-transition`을 재사용한다. |
| 전역 사고 패턴 3종 추가 | 보류 | `evidenceRecipe.requiredClaims`로 관리한다. |
| `sqrt`, 체, 재귀 유클리드 | 폐기 | 중등 심화 전 별도 Branch에서만 검토한다. |
| Public/Private 동일 Transfer 입력 | 폐기 | 미리보기와 권위 입력을 완전히 분리한다. |
| 코드 형태 기반 채점 | 폐기 | 반환 행동으로만 평가한다. |
| 별도 파일럿·출판 승인 | 비차단 | 자동 계약 통과와 동시에 `published` 처리한다. |

## 3. 성단 2 학습 사다리

```text
21 PAT-003       나머지로 반복 주기 발견
22 PAT-004       한 주기 안의 활성 구간 판정
23 EVEN          % 2로 두 상태 분류
24 DIGIT         //와 %로 자릿수 분해
25 REVNUM        자릿수를 반복 추출·누적
26 DIVISOR       후보를 모두 검사하고 조건부 집계
27 PRIME         약수 존재 여부로 수의 성질 판정
28 GCD           두 수를 줄여도 유지되는 공통 성질 추적
```

이 순서는 “수학 공식을 외우는 과정”이 아니라 다음 사고 이동을 만든다.

```text
반복 규칙 관찰
  → 후보 공간 만들기
  → 조건에 맞는 후보만 선택하기
  → 선택 결과를 개수/Boolean으로 표현하기
  → 반복 상태 변화 속 불변식 찾기
```

### 3.1 확정 선수 조건

| 문제 | 선수 조건 | 이유 |
|---|---|---|
| DIVISOR-26 | `AC-PAT-003`, `AC-EXP-LOOP-06`, `AC-CODE-FIRST-ERROR-01` | `%`, `==`, `for`, `range`, `if`, 누적 count가 필요하다. |
| PRIME-27 | `AC-PAT-DIVISOR-26`, `AC-EXP-BOUND-05` | 약수 탐색과 `< 2` 경계 처리가 필요하다. |
| GCD-28 | `AC-PAT-DIVISOR-26`, `AC-EXP-WHILE-07`, `AC-PAT-DIGIT-24`, `AC-EXP-SWAP-04` | 반복 종료, `!=`, Transfer의 `//`, 리스트, 원본 보존 전략이 필요하다. |

Catalog와 Public Kernel의 `curriculum.prerequisites`는 정확히 같은 배열을 사용한다.

### 3.2 Python 개념 계약

이번 묶음에서 새 Python 개념은 도입하지 않는다.

#### DIVISOR-26 requires

```js
[
  'concept:function-body-focus',
  'statement:for',
  'builtin:range',
  'operator:modulo',
  'operator:equality',
  'statement:if',
  'operator:assignment',
  'operator:arithmetic-state-update',
]
```

#### PRIME-27 requires

DIVISOR-26의 개념에 아래 경계 비교를 포함한다.

```js
[
  'concept:function-body-focus',
  'statement:for',
  'builtin:range',
  'operator:modulo',
  'operator:equality',
  'statement:if',
  'operator:comparison-bound',
]
```

#### GCD-28 requires

Base와 Fresh Transfer 전체에 필요한 개념을 선언한다.

```js
[
  'concept:function-body-focus',
  'statement:while',
  'statement:if',
  'operator:equality',
  'operator:comparison-lower-bound',
  'operator:assignment',
  'operator:arithmetic-state-update',
  'operator:floor-division',
  'builtin:list',
]
```

`operator:equality`는 `==`와 `!=`를 함께 설명하는 PAT-003 개념을 회수한다. `operator:floor-division`은 DIGIT-24에서 이미 학습했다.

사고 패턴은 DIVISOR와 PRIME에서 새로 등록하지 않는다. GCD-28만 기존 항목을 회수한다.

```js
thinkingPatterns: {
  requires: ['pattern:preserve-before-overwrite'],
  introduces: [],
}
```

Base에서 인자를 직접 줄이는 올바른 풀이도 통과시키되, Fresh Transfer에서 원래 비율을 보존하는 이유를 기존 패턴과 연결한다.

## 4. 공통 구현 아키텍처

세 문제 모두 다음 기존 경로만 사용한다.

```text
createCapabilityPrototypeKernel
  → ObserveMode
  → ExploreMode / StateTransitionLens
  → CodeMode / existing Worker Sandbox
  → existing Callable / Isolated Judge
  → UnderstandingCheckMode
  → TransferChallengeMode
  → existing Progress Ledger
```

추가하지 않는 것:

- `DivisorLens`, `PrimeLens`, `GcdLens`
- 문제별 React 컴포넌트와 CSS
- 신규 Firebase Callable 또는 Firestore collection
- 신규 Python 실행기나 AST 채점기
- 문제별 오개념 matcher
- 신규 공용 Kernel factory
- 문제 수에 비례하는 Hub 조건문

### 4.1 공용 Public Kernel 형태

기존 `createCapabilityPrototypeKernel()`을 사용한다.

```js
createCapabilityPrototypeKernel({
  problemId,
  problemVersion: 1,
  curriculum,
  identity,
  pythonConcepts,
  thinkingPatterns, // DIVISOR/PRIME은 빈 배열, GCD는 기존 보존 패턴 requires
  evidenceRecipe,
  modes: {
    observe,
    explore: { lensId: 'state-transition', lensConfig },
    code,
  },
  assessment: {
    publicTests,
    understandingChallenges,
    transferChallenges,
  },
})
```

### 4.2 StateTransition Lens 계약

각 프레임은 기존 공용 필드만 사용한다.

```js
{
  id: 'stable-frame-id',
  stepTitle: '학생용 단계 이름',
  operationLabel: '이번 상태 변화',
  codeSnippet: '필요할 때만 한두 줄',
  prompt: '이번 장면의 핵심 질문',
  stateAfter: {
    // 원시값, 후보, 판정, 누적값
  },
}
```

장면 수를 늘리기 위한 중복 프레임은 만들지 않는다. 한 화면에서 이해하기 어려운 긴 표는 `introContext`와 4~7개의 대표 상태로 압축한다.

### 4.3 행동 기반 Judge 계약

- 함수명과 인자 개수만 프로토콜로 확인한다.
- 반환값이 모든 Hidden Test에서 맞는지로 평가한다.
- Guard Return, flag 변수, 중첩 조건 등 의미가 같은 풀이를 허용한다.
- `number % candidate == 0` 같은 특정 문자열을 요구하지 않는다.
- 숨은 입력값과 기대값은 학생 응답에 노출하지 않는다.
- 실패 응답은 `group` 단위 요약만 사용한다.

## 5. AC-PAT-DIVISOR-26 — 운석의 약수 센서

### 5.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-PAT-DIVISOR-26` |
| Catalog order | `26` |
| 역할 | `Core / Anchor` |
| 함수 | `count_divisors(number)` |
| 입력 | 정수 `1..100` |
| 반환 | 양의 약수의 개수 |
| 선수 | `AC-PAT-003`, `AC-EXP-LOOP-06`, `AC-CODE-FIRST-ERROR-01` |
| Lens | `state-transition` |
| 새 문법·패턴 | 없음 |

공식 기준 구현:

```python
def count_divisors(number):
    count = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            count = count + 1
    return count
```

`number + 1`은 `range`의 끝값이 포함되지 않는다는 기존 LOOP-06 지식을 회수한다.

### 5.2 Observe·Explore

Observe 질문은 `12`의 후보 중 실제 약수 `1, 2, 3, 4, 6, 12`를 찾아 개수 6을 예측하게 한다.

Explore는 `number=12`를 사용하고 다음 상태를 보여 준다.

| 프레임 | candidate | 나머지 | 약수인가 | count |
|---|---:|---:|---|---:|
| start | - | - | - | 0 |
| c1 | 1 | 0 | 예 | 1 |
| c2 | 2 | 0 | 예 | 2 |
| c3 | 3 | 0 | 예 | 3 |
| c4 | 4 | 0 | 예 | 4 |
| c5 | 5 | 2 | 아니오 | 4 |
| summary | 6~12 | - | 6, 12만 추가 | 6 |

마지막 프레임은 후보 7~11이 count를 바꾸지 않았음을 문장으로 설명한다. 실제 실행을 생략한 것처럼 표현하지 말고 “차례로 검사했지만 나머지가 0이 아니었다”고 명시한다.

`ruleStatement`:

> 1부터 number까지 모든 후보를 차례로 확인하고, 나누어떨어질 때만 count를 1 늘립니다.

### 5.3 Base 테스트

Public 4개:

```text
6  → 4
7  → 2
9  → 3
12 → 6
```

Hidden 8개:

| 입력 | 기대 | 그룹 |
|---:|---:|---|
| 1 | 1 | `identity_one` |
| 2 | 2 | `small_prime` |
| 4 | 3 | `small_square` |
| 8 | 4 | `composite` |
| 10 | 4 | `composite` |
| 25 | 3 | `square_number` |
| 36 | 9 | `many_divisors` |
| 100 | 9 | `upper_bound` |

Public과 Hidden 입력은 겹치지 않는다.

### 5.4 필수 오답 fixture

1. `range(1, number)`로 자기 자신을 검사하지 않음 → `small_prime`
2. `range(2, number + 1)`로 1을 누락 → `identity_one`
3. 조건 없이 매 후보마다 count 증가 → `composite`
4. 약수의 합을 반환 → `small_square`

오개념 이름과 실패 그룹은 별개다. `expectedFailingGroup`에는 반드시 Hidden table에 존재하는 위 group 이름을 사용한다.

각 fixture는 `expectedFailingGroup`이 실제 Hidden group과 일치해야 한다.

### 5.5 2★ 이해 증거

최소 2문항:

1. `1`의 약수가 왜 1 하나뿐인지 설명한다.
2. `9`의 제곱근 3을 두 번 세지 않고 후보 3을 한 번만 검사하는 이유를 확인한다.
3. 선택적으로 `range(1, number + 1)`에서 `+1`이 필요한 이유를 묻는다.

정답 옵션의 위치는 고정하지 않고 기존 결정적 셔플을 사용한다.

### 5.6 Fresh Transfer

```python
def sum_divisors(number):
    total = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            total = total + candidate
    return total
```

같은 후보 탐색을 유지하되 누적 목표를 “개수”에서 “합”으로 바꾼다.

Public preview 2개:

```text
6 → 12
7 → 8
```

Private authoritative 5개:

```text
1 → 1
8 → 15
10 → 18
12 → 28
25 → 31
```

## 6. AC-PAT-PRIME-27 — 소수 탐사 순찰대

### 6.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-PAT-PRIME-27` |
| Catalog order | `27` |
| 역할 | `Core / Practice` |
| 함수 | `is_prime_signal(number)` |
| 입력 | 정수 `0..200` |
| 반환 | 소수이면 Boolean `True`, 아니면 `False` |
| 선수 | `AC-PAT-DIVISOR-26`, `AC-EXP-BOUND-05` |
| Lens | `state-transition` |
| 새 문법·패턴 | 없음 |

공식 기준 구현:

```python
def is_prime_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
```

`sqrt`, `break`, 보조 함수, 체는 학습 자료에 사용하지 않는다. 학생이 지원 문법 안에서 다른 올바른 풀이를 제출하면 행동 채점으로 통과시킨다.

### 6.2 Observe·Explore

Observe는 `9`의 후보 `2, 3, ...` 가운데 3에서 나누어떨어지므로 소수가 아님을 예측하게 한다.

Explore는 `number=9`를 사용한다.

| 프레임 | 상태 |
|---|---|
| boundary | `9 < 2 → False`, 탐색 계속 |
| divisor_2 | `9 % 2 = 1`, 아직 반례 없음 |
| divisor_3 | `9 % 3 = 0`, 약수 반례 발견 |
| return_false | 합성수이므로 `False` 반환 |

별도 요약 카드에서 `0`, `1`, `2`를 비교한다.

- 0과 1: 소수가 아니므로 반복 전에 False
- 2: 2부터 2 전까지 후보가 없지만 경계 검사를 통과했으므로 True

`ruleStatement`:

> 2보다 작은 수는 소수가 아니며, 2부터 자기 자신 전까지 나누어떨어지는 후보가 하나라도 있으면 소수가 아닙니다.

### 6.3 Base 테스트

Public 4개:

```text
3  → True
12 → False
25 → False
97 → True
```

Hidden 7개:

| 입력 | 기대 | 그룹 |
|---:|---|---|
| 0 | False | `below_two` |
| 1 | False | `below_two` |
| 2 | True | `smallest_prime` |
| 4 | False | `even_composite` |
| 49 | False | `square_composite` |
| 99 | False | `odd_composite` |
| 121 | False | `square_composite` |

### 6.4 필수 오답 fixture

1. `< 2` 경계 처리 없음 → 0과 1을 True로 판정 → `below_two`
2. `number <= 2`를 모두 False로 처리 → `smallest_prime`
3. 짝수만 확인 → 49 또는 121 실패 → `square_composite`
4. 첫 번째 나누어지지 않는 후보에서 즉시 True 반환 → `square_composite`

### 6.5 2★ 이해 증거

최소 3문항:

1. 1은 약수가 하나뿐이므로 왜 소수가 아닌가?
2. 2는 검사할 내부 후보가 없는데 왜 True가 되는가?
3. 49는 홀수이지만 7로 나누어떨어지므로 왜 합성수인가?

“홀수이면 소수”라는 오개념을 반드시 반례로 교정한다.

### 6.6 Fresh Transfer

```python
def is_composite_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
```

Base의 반환 의미를 반대로 바꾸되 0과 1은 여전히 False라는 경계를 유지한다.

Public preview:

```text
9 → True
7 → False
```

Private authoritative:

```text
0 → False
1 → False
2 → False
4 → True
49 → True
97 → False
```

## 7. AC-PAT-GCD-28 — 두 톱니바퀴의 공통 박자

### 7.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-PAT-GCD-28` |
| Catalog order | `28` |
| 역할 | `Core / Practice` |
| 함수 | `greatest_common_rhythm(a, b)` |
| 입력 | 양의 정수 `1..100` 두 개 |
| 반환 | 최대공약수 |
| 선수 | `DIVISOR-26`, `WHILE-07`, `DIGIT-24`, `SWAP-04` |
| Lens | `state-transition` |
| 새 문법·패턴 | 없음 |

공식 기준 구현:

```python
def greatest_common_rhythm(a, b):
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a
```

학생에게는 “큰 수에서 작은 수를 빼도 두 수의 공약수는 유지된다”는 의미를 먼저 경험하게 한다. `math.gcd`, 재귀, 나머지 유클리드 알고리즘은 설명하지 않는다.

### 7.2 Observe·Explore

Observe는 `(48, 18)`의 공통 약수와 반복 감산 결과를 연결한다.

Explore 상태:

| 프레임 | a | b | 변화 |
|---|---:|---:|---|
| start | 48 | 18 | 시작 |
| subtract_1 | 30 | 18 | 큰 수 48에서 18 제거 |
| subtract_2 | 12 | 18 | 큰 수 30에서 18 제거 |
| subtract_3 | 12 | 6 | 큰 수 18에서 12 제거 |
| meet | 6 | 6 | 두 수가 같아져 종료 |

각 프레임에는 공통 약수 1, 2, 3, 6이 계속 유지된다는 짧은 안내를 포함한다.

`ruleStatement`:

> 큰 수에서 작은 수를 반복해서 빼도 공통으로 나누어지는 성질은 유지되며, 두 수가 같아진 값이 최대공약수입니다.

### 7.3 Base 테스트

Public 4개:

```text
(12, 8) → 4
(7, 5)  → 1
(9, 9)  → 9
(20, 5) → 5
```

Hidden 6개:

| 입력 | 기대 | 그룹 |
|---|---:|---|
| `(1, 1)` | 1 | `same_value` |
| `(100, 1)` | 1 | `long_reduction` |
| `(48, 18)` | 6 | `shared_factor` |
| `(81, 27)` | 27 | `exact_multiple` |
| `(17, 13)` | 1 | `coprime` |
| `(84, 30)` | 6 | `shared_factor` |
| `(18, 48)` | 6 | `reversed_inputs` |

### 7.4 필수 오답 fixture

1. 두 수가 다를 때 반복하지 않고 한 번만 뺌 → `shared_factor`
2. `while a == b`로 종료 조건을 반대로 작성 → `shared_factor`
3. 단순히 더 작은 수를 반환 → `coprime` 또는 `shared_factor`
4. `while a > b`만 사용해 b가 더 큰 경우를 갱신하지 않음 → `reversed_inputs`

오답 fixture가 무한 반복으로 20,000 step을 모두 소모하지 않도록 구성한다. Step-limit 검증은 공용 Sandbox 테스트가 담당한다.

### 7.5 2★ 이해 증거

최소 3문항:

1. 48과 18에서 48−18을 해도 공약수 6이 유지되는 이유
2. 두 수가 같아졌을 때 더 반복하지 않는 이유
3. `(9, 9)`는 반복 없이 바로 9를 반환해야 하는 이유

### 7.6 Fresh Transfer

원래 입력을 보존한 뒤 같은 반복 감산으로 GCD를 구하고 비율을 단순화한다.

```python
def reduce_ratio(a, b):
    original_a = a
    original_b = b
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    gcd = a
    return [original_a // gcd, original_b // gcd]
```

이 Transfer 때문에 `DIGIT-24`와 `SWAP-04`를 선수로 추가한다. 학생이 원래 값을 다른 방식으로 안전하게 보존해도 행동이 같으면 통과한다.

Public preview:

```text
(12, 8) → [3, 2]
(15, 5) → [3, 1]
```

Private authoritative:

```text
(8, 12)   → [2, 3]
(21, 14)  → [3, 2]
(7, 5)    → [7, 5]
(100, 25) → [4, 1]
(9, 9)    → [1, 1]
```

## 8. 파일 변경 범위

### 8.1 신규 Public Kernel 3개

```text
src/components/AlgorithmConstellation/shared/problems/ac_pat_divisor_26.js
src/components/AlgorithmConstellation/shared/problems/ac_pat_prime_27.js
src/components/AlgorithmConstellation/shared/problems/ac_pat_gcd_28.js
```

### 8.2 신규 Private Definition 3개

```text
functions/algorithmConstellation/problems/ac_pat_divisor_26.private.cjs
functions/algorithmConstellation/problems/ac_pat_prime_27.private.cjs
functions/algorithmConstellation/problems/ac_pat_gcd_28.private.cjs
```

### 8.3 수정 파일

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

`test-client-server-runtime-parity.mjs`는 이미 `PUBLIC_KERNELS` 전체를 동적으로 순회하므로 신규 ID 하드코딩이 필요 없다. 새 공용 UI 파일, Concept Registry, Pattern Registry는 수정하지 않는다.

## 9. 구현 순서

### Step 1 — Catalog 계약 보정

- 26~28의 선수 조건을 이 가이드대로 확정한다.
- `lensId: 'state-transition'`을 유지한다.
- 아직 Kernel이 없으므로 이 단계만 따로 커밋하거나 테스트하지 않는다.

### Step 2 — DIVISOR-26 수직 절편

- Public Kernel과 Private Definition을 함께 만든다.
- Public/Hidden/Transfer 격리를 검증한다.
- 단독 저작 무결성 테스트를 통과시킨다.

### Step 3 — PRIME-27 수직 절편

- DIVISOR가 등록된 상태에서 추가한다.
- 0, 1, 2, 홀수 제곱수 경계를 반드시 검증한다.

### Step 4 — GCD-28 수직 절편

- 반복 감산과 Transfer 원본 보존을 구현한다.
- 최악 입력 `(100, 1)`이 누적 Step 예산 안에서 통과하는지 확인한다.

### Step 5 — Registry·Catalog 출판

- Public/Private index에 세 문제를 등록한다.
- Catalog 26~28을 같은 변경에서 `published`로 전환한다.
- Published/Public/Private 동적 집합 동등성을 확인한다.

### Step 6 — 회귀 테스트 보강

- 기존 테스트 파일에 C2-B 계약만 추가한다.
- C2-B 전용 새 테스트 runner를 만들지 않는다.

## 10. 자동 검증 계약

### 10.1 Authoring integrity

기존 동적 검증에 다음을 추가한다.

- 세 문제의 Catalog/Public 선수 배열 일치
- Public/Hidden Base 입력 중복 0건
- Public preview/Private authoritative Transfer 입력 중복 0건
- DIVISOR 입력 `1..100`
- PRIME 입력 `0..200`
- GCD 두 입력 모두 `1..100`
- DIVISOR Hidden에 `1`
- PRIME Hidden에 `0`, `1`, `2`, 제곱 합성수
- GCD Hidden에 같은 수, 서로소, 배수, `(100,1)`
- 모든 official solution과 intended wrong fixture 판정
- 모든 Transfer official solution 판정
- C2-B official Base와 Transfer가 각각 누적 20,000 step 안에서 통과

### 10.2 Runtime parity

현재 `test-client-server-runtime-parity.mjs`가 35개 전체 Public Kernel을 동적으로 순회하게 둔다.

이번 묶음에서 자동으로 추가 검증되는 표현:

- `for candidate in range(1, number + 1)`
- 반복문 안의 `%`와 `==`
- 조기 `return False`
- `while a != b`
- 조건에 따른 두 변수 반복 갱신
- `//`를 사용한 리스트 반환

별도 Matrix를 복제하지 않는다.

### 10.3 Callable lifecycle

`test-server-orchestration-and-judge.mjs`의 출판 문제 생명주기 목록에 다음 ID만 추가한다.

```text
AC-PAT-DIVISOR-26
AC-PAT-PRIME-27
AC-PAT-GCD-28
```

각 문제에 대해 다음 흐름을 검증한다.

```text
startAttempt
→ official Base 제출 / 1★
→ 서버 발급 Understanding 정답 / 2★
→ 서명된 Transfer 발급
→ private official Transfer 제출 / 3★
→ progress mastered
```

### 10.4 성단 3 개방 Gate

C2-B 완료 후 성단 2는 출판된 Core 8개를 갖게 되어 성단 3의 `early-access`가 종료되고 strict gate가 시작된다.

필수 회귀:

1. Anchor `AC-PAT-003` 없이 Core 6개 완료 → 잠김
2. Anchor 포함 Core 5개 완료 → 잠김
3. Anchor 포함 Core 6개 완료 → 열림
4. 성단 3 기존 완료 기록이 있는 학생 → `grandfathered`
5. C2-C의 Branch 29~30은 이후 추가되어도 Core count에 포함되지 않음

총 출판 문제 수를 숫자로 비교하지 말고 Catalog 역할과 ID 집합으로 계산한다.

## 11. 개발·실행 비용 통제

### 11.1 테스트 예산

| 문제 | Public Base | Hidden Base | Public Transfer preview | Private Transfer |
|---|---:|---:|---:|---:|
| DIVISOR-26 Anchor | 4 | 8 | 2 | 5 |
| PRIME-27 Practice | 4 | 7 | 2 | 6 |
| GCD-28 Practice | 4 | 7 | 2 | 5 |

제시한 입력만으로 핵심 분류를 증명할 수 있으므로 더 늘리지 않는다.

### 11.2 Runtime 비용

- DIVISOR: 최대 후보 100개
- PRIME: 최대 후보 198개
- GCD: 최악 `(100,1)`에서 99회 감산
- 문제당 누적 Judge step은 20,000 이하를 목표로 한다.
- 입력 생성기, 랜덤 대형 테스트, 성능 벤치마크를 만들지 않는다.

### 11.3 개발 비용

- 문제별 JSX 0개
- 신규 Callable 0개
- 신규 Firestore 문서 유형 0개
- 신규 Lens 0개
- 신규 Concept/Pattern Registry 항목 0개
- 신규 테스트 실행 파일 0개

3문제의 작은 데이터 중복은 명시적으로 유지한다. 아직 세 문제의 구조가 완전히 같지 않으므로 성급한 문제 생성기나 테스트 생성기를 만들지 않는다.

## 12. 실행 명령

좁은 검증부터 실행한다.

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-client-server-runtime-parity.mjs
node scripts/test-server-orchestration-and-judge.mjs
```

통과 후 전체 검증을 실행한다.

```bash
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation \
  scripts/test-authoring-integrity-contracts.mjs \
  scripts/test-gate0-curriculum-contracts.mjs \
  scripts/test-client-server-runtime-parity.mjs \
  scripts/test-server-orchestration-and-judge.mjs
npm run build
```

## 13. 완료 Gate

### Gate C2-B-1 — 커리큘럼

- [ ] 26→27의 약수 탐색 재사용 관계가 분명하다.
- [ ] 26의 `if` 선수로 CODE-FIRST-ERROR-01이 직접 선언된다.
- [ ] 28의 Transfer 선수로 DIGIT-24와 SWAP-04가 추가된다.
- [ ] 28이 기존 `pattern:preserve-before-overwrite`를 requires로 회수한다.
- [ ] 미학습 Python 개념과 사고 전략이 없다.
- [ ] Catalog와 Public Kernel 선수 배열이 일치한다.

### Gate C2-B-2 — 학습 경험

- [ ] DIVISOR가 `1`과 제곱수 경계를 설명한다.
- [ ] PRIME이 `0`, `1`, `2`, 홀수 제곱 합성수를 구분한다.
- [ ] GCD가 감산 중 공약수 불변식을 시각화한다.
- [ ] Base와 Transfer가 단순 변수명 교체가 아니다.

### Gate C2-B-3 — 채점 무결성

- [ ] Public/Hidden Base 입력 중복이 없다.
- [ ] Public/Private Transfer 입력 중복이 없다.
- [ ] 핵심 경계가 서버 Hidden에 존재한다.
- [ ] 모든 wrong fixture가 지정 group에서 실패한다.
- [ ] Hidden 입력과 정답이 Callable 응답·클라이언트 번들에 노출되지 않는다.

### Gate C2-B-4 — 비용·품질

- [ ] 세 문제 모두 20,000 step 예산 안에서 통과한다.
- [ ] Published/Public/Private 동적 ID 집합이 일치한다.
- [ ] 등록된 전체 Kernel의 브라우저/서버 parity가 동적으로 통과한다.
- [ ] 성단 3 strict gate와 grandfathered 접근이 검증된다.
- [ ] ESLint 0 error/0 warning, 프로덕션 빌드 성공이다.

## 14. 구현 담당 AI에게 전달할 최종 작업 지시

```text
이 문서의 범위는 C2-B Core 26~28뿐이다.

1. DIVISOR-26, PRIME-27, GCD-28 Public/Private Vertical Slice를 구현한다.
2. 기존 createCapabilityPrototypeKernel과 state-transition Lens만 사용한다.
3. DIVISOR-26 선수에 CODE-FIRST-ERROR-01을 포함한다.
4. GCD-28 선수에 DIGIT-24와 SWAP-04를 포함하고 기존 보존 패턴을 requires로 선언한다.
5. Public preview 입력과 Private authoritative 입력을 겹치지 않게 한다.
6. Catalog 26~28과 Public/Private index를 같은 변경에서 published 상태로 맞춘다.
7. 기존 테스트 파일만 확장하고 새 테스트 runner는 만들지 않는다.
8. 모든 회귀와 빌드가 통과하면 작업을 종료한다.

C2-C Branch 29~30, 신규 UI, 신규 Lens, 신규 API는 구현하지 않는다.
```

## 15. 다음 단계

C2-B가 완료되면 출판 문제는 동적 집합 기준 35개가 되고, 성단 2 Core 8개가 완성된다. 그다음 변경 단위는 C2-C Branch 29~30뿐이다.

C2-C에서는 다음 두 가지를 별도 가이드로 다룬다.

- 큰 수와 시작 offset을 포함하는 Calendar 주기 전이
- 0과 1 경계를 놓친 소수 판별 코드를 반례로 수리하는 Code Review

C2-B 검증 전에 C2-C 파일을 미리 만들지 않는다.
