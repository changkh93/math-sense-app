# LUMI 알고리즘 성단 — 성단 2 선택 항로 Branch 29~30 구현 계획 및 개발 가이드

> 문서 상태: 구현 기준안
> 범위: `AC-PAT-CALENDAR-29`, `AC-PAT-PRIME-REV-30`
> 선행 상태: 성단 2 Core 21~28 출판 완료, Published/Public/Private 35개 일치
> 목표 상태: 성단 2의 8 Core + 2 Branch 완결, Published/Public/Private 37개 일치
> 우선순위: 최신 사용자 결정 → 이 문서 → `CONSTELLATION_2_NEXT_IMPLEMENTATION_PLAN` → MASTER/CORE 100

> 구현 리뷰 보정: 현재 `pattern-timeline` UI는 신호 다리·등대 의미에 특화되어 시작 요일 offset을 표현하지 못한다. `CALENDAR-29`는 신규 UI를 만들지 않고 기존 `state-transition`의 5개 장면을 사용한다. 이 보정이 아래의 초기 Lens 표기보다 우선한다.

---

## 1. 결론

다음 변경 단위는 **C2-C Branch 29~30 두 문제만**으로 한다.

- 29번은 이미 배운 `%`를 큰 수와 시작 offset에 일반화한다.
- 30번은 이미 배운 소수 판별을 새로 가르치지 않고, 경계 반례로 버그를 찾아 고친다.
- 새 Python 개념, 새 Lens, 새 API, 새 Firestore 문서, 새 전용 UI는 만들지 않는다.
- Branch는 성단 3 개방의 Core 6/8 계산에 포함하지 않는다.

두 문제는 선택 항로이지만 단순 보너스 문제가 아니다. 성단 2의 핵심 사고를 각각 **일반화**와 **비평·수리**로 회수하는 종결 미션이다.

---

## 2. 기존 계획 평가와 필수 보정

### 2.1 채택하는 방향

1. `CALENDAR-29`의 `(start_day + days_later) % 7` 모델
2. `PRIME-REV-30`의 `number=1` 첫 반례 탐색
3. 기존 `state-transition` Lens 재사용
4. 기존 `pattern:counterexample-search` 재사용
5. 공개 Preview와 서버 권위 테스트의 물리적 분리
6. 기존 저작·게이트·서버 수명주기 테스트에 계약 추가

### 2.2 반드시 보정할 부분

#### A. 29번의 번호 체계 고정

요일과 좌석은 자연어만으로 0-based/1-based가 혼동되기 쉽다.

- 요일: `0=월, 1=화, ..., 6=일`
- 회전 좌석: `0`부터 `seat_count - 1`
- `days_later=0`, `moves=0`이면 시작 위치를 그대로 반환

이 계약은 Briefing, Observe, starter 주석, 테스트에 모두 같은 문장으로 표현한다.

#### B. 30번 Fresh Transfer의 실제 버그 성립

다음 일반 구현은 이미 0과 1을 `False`로 반환하므로 수리 문제가 아니다.

```python
def is_composite_number(number):
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
```

따라서 전이 Starter는 아래처럼 **0과 1을 합성수라고 잘못 분류하는 명시적 버그**를 가져야 한다.

```python
def is_composite_number(number):
    if number < 2:
        return True  # 버그: 0과 1은 소수도 합성수도 아님
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
```

학생은 `number < 2`의 반환값을 `False`로 수리한다. 이는 Base의 코드를 복사하는 과제가 아니라, “소수가 아니다”와 “합성수다”가 0·1에서 동치가 아님을 확인하는 전이 증거다.

---

## 3. 성단 2 최종 학습 사다리

| 순서 | 문제 | 역할 | 회수하는 사고 |
|---:|---|---|---|
| 21 | PAT-003 | Core Anchor | 나머지와 고정 주기 |
| 22 | PAT-004 | Core Practice | 주기 안의 구간 |
| 23 | EVEN-23 | Core Practice | `% 2` 분류 |
| 24 | DIGIT-24 | Core Practice | 10진 자릿수 분해 |
| 25 | REVNUM-25 | Core Practice | 자릿수 누적 |
| 26 | DIVISOR-26 | Core Anchor | 후보 전수 검사 |
| 27 | PRIME-27 | Core Practice | 소수 경계와 약수 유무 |
| 28 | GCD-28 | Core Practice | 반복 감소와 상태 보존 |
| 29 | CALENDAR-29 | Branch Review | 시작점이 있는 큰 주기 일반화 |
| 30 | PRIME-REV-30 | Branch Review | 경계 반례로 코드 비평·수리 |

선수 관계:

```text
AC-PAT-003 ───────────────▶ AC-PAT-CALENDAR-29

AC-PAT-PRIME-27 ─┐
                 ├────────▶ AC-PAT-PRIME-REV-30
AC-CODE-FIRST-ERROR-01 ────┘
```

Branch 29와 30 사이에는 선수 관계를 두지 않는다. 서로 독립적인 선택 항로다.

---

## 4. 공통 구현 원칙

### 4.1 재사용 항목

- Public Kernel: `createCapabilityPrototypeKernel`
- Lens: `state-transition`
- Evidence Primitive: 기존 8종만 사용
- Student Runtime/Judge/Callable/Gateway: 변경 없음
- Hub 선수 잠금과 Branch 표시: 기존 공용 로직 사용
- 테스트 runner: 기존 파일에 계약 추가

### 4.2 금지 항목

- 신규 `cycle-timeline` Lens 생성
- 신규 Python concept/pattern 등록
- 문제별 React 컴포넌트 생성
- 클라이언트에 hidden/authoritative transfer test 복제
- AST 형태 강제 채점
- 29번을 반복문으로만 풀도록 강제
- 30번 전체 코드를 빈칸에서 다시 작성하게 만들기
- Branch 완료를 성단 3 개방 조건에 포함

### 4.3 공통 학습 계약

- 행동 기반 채점
- Public/Hidden 입력 중복 0건
- Transfer Preview/Private Master 입력 중복 0건
- Base와 Transfer 공식 풀이 각각 누적 20,000 step 이내
- 이해 확인은 코드 제출 결과와 분리된 객관식 micro-evidence
- Fresh Transfer에는 `contextCard`, `thoughtCheck`, 최소 2개 공개 Preview 제공

---

## 5. AC-PAT-CALENDAR-29 — 다음 우주 캘린더

### 5.1 학습 목표

고정된 0 시작 주기 `time % cycle`을, 임의의 시작 위치가 있는 주기 `(start + move) % cycle`로 일반화한다.

새 문법을 가르치는 문제가 아니다. `+`, `%`, 함수 반환을 이미 학습했다는 전제에서 수학적 모델링에 집중한다.

### 5.2 Kernel 계약

```js
problemId: 'AC-PAT-CALENDAR-29'
problemVersion: 1
routeRole: 'branch'
learningRole: 'review'
recommendedBand: 'E'
prerequisites: ['AC-PAT-003']
lensId: 'state-transition'
```

Python 개념:

```js
requires: [
  'concept:function-body-focus',
  'operator:arithmetic-state-update',
  'operator:modulo',
]
introduces: []
```

사고 패턴은 새로 등록하지 않는다.

Evidence:

```js
primitives: ['scalar-sequence']
requiredClaims: [
  'zero-move-keeps-start',
  'start-offset-is-added-before-cycle-wrap',
  'large-move-reduces-to-cycle-remainder',
]
```

### 5.3 함수·도메인 계약

```python
def calendar_day(start_day, days_later):
    # 0=월, 1=화, ..., 6=일
    # days_later=0이면 start_day를 그대로 반환
```

- `start_day`: 정수 `0..6`
- `days_later`: 정수 `0..1_000_000`
- 반환: 정수 `0..6`
- 정답 행동: `(start_day + days_later) % 7`

요일 이름 문자열을 반환하지 않는다. 불필요한 리스트·인덱싱 개념을 끌어오지 않기 위해 숫자 상태만 사용한다.

### 5.4 Observe

권장 질문:

> 수요일(2)에서 0일 뒤는 수요일입니다. 5일 뒤는 월요일(0)입니다. 시작 요일이 0이 아닐 때도 `days_later % 7`만 반환하면 될까요?

선택지:

- 아니다. 시작 요일을 더한 뒤 7로 감싸야 한다. — 정답
- 맞다. 이동한 날 수의 나머지만 있으면 된다.
- 항상 시작 요일을 반환한다.

### 5.5 Explore — `state-transition`

고정 예시는 `start_day=2`로 한다.

| frame | 이동 | 계산 전 | 계산 후 | 의미 |
|---|---:|---:|---:|---|
| start | 0 | `2 + 0` | `2` | 0일 뒤는 시작 유지 |
| move_1 | 1 | `2 + 1` | `3` | 한 칸 이동 |
| move_4 | 4 | `2 + 4` | `6` | 주기 끝 도착 |
| wrap_5 | 5 | `2 + 5` | `0` | 7에서 0으로 감싸기 |
| large_12 | 12 | `2 + 12` | `0` | 큰 이동도 같은 나머지 상태 |

필수 문장:

> 먼저 시작 위치와 이동량을 더하고, 그 결과를 주기 길이로 나눈 나머지가 최종 위치입니다.

### 5.6 Code Starter

```python
def calendar_day(start_day, days_later):
    # 0=월, 1=화, ..., 6=일입니다.
    # 0일 뒤에는 시작 요일이 그대로여야 합니다.
    pass
```

Starter에 완성식을 노출하지 않는다.

### 5.7 Public Tests

```js
[
  { inputs: { start_day: 2, days_later: 0 }, expected: 2 },
  { inputs: { start_day: 2, days_later: 5 }, expected: 0 },
  { inputs: { start_day: 5, days_later: 9 }, expected: 0 },
]
```

공개 테스트는 시작 유지, 첫 wrap, 한 주를 넘는 이동을 보여준다.

### 5.8 Private Hidden Tests

권장 최소 집합:

| 입력 | 기대 | 그룹 |
|---|---:|---|
| `(0, 0)` | 0 | `zero_move` |
| `(6, 1)` | 0 | `wrap_boundary` |
| `(4, 7)` | 4 | `full_cycle` |
| `(1, 13)` | 0 | `large_move` |
| `(2, 1_000_000)` | 3 | `large_move` |

Public 입력과 중복시키지 않는다.

### 5.9 Intended Wrong Fixtures

1. 시작 offset 누락

```python
def calendar_day(start_day, days_later):
    return days_later % 7
```

- 실패 그룹: `zero_move`
- 오개념: `PERIOD-MISSING-START-OFFSET`

2. wrap 누락

```python
def calendar_day(start_day, days_later):
    return start_day + days_later
```

- 실패 그룹: `wrap_boundary`
- 오개념: `PERIOD-MISSING-WRAP`

3. 하루 off-by-one

```python
def calendar_day(start_day, days_later):
    return (start_day + days_later + 1) % 7
```

- 실패 그룹: `zero_move`
- 오개념: `PERIOD-OFF-BY-ONE`

4. 시작 위치 차감

```python
def calendar_day(start_day, days_later):
    return (days_later - start_day) % 7
```

- 실패 그룹: `large_move`
- 오개념: `PERIOD-OFFSET-DIRECTION`

### 5.10 2★ 이해 확인

Q1. `start_day=4`, `days_later=0`의 결과가 4인 이유는?

- 이동하지 않았으므로 시작 위치가 유지된다. — 정답
- 모든 0일 이동은 요일 0이 된다.

Q2. `start_day=3`, `days_later=1_000_000`처럼 큰 수도 빠르게 처리할 수 있는 이유는?

- 7칸마다 같은 상태로 돌아오므로 나머지만 필요하다. — 정답
- 백만 번 반복해야만 정확하다.

### 5.11 Fresh Transfer

```python
def rotated_seat(start, moves, seat_count):
    # 좌석 번호는 0부터 seat_count - 1까지입니다.
```

도메인:

- `seat_count`: `2..20`
- `start`: `0..seat_count-1`
- `moves`: `0..1_000_000`
- 반환: `0..seat_count-1`
- 정답 행동: `(start + moves) % seat_count`

Public Preview:

```js
[
  { inputs: { start: 1, moves: 0, seat_count: 5 }, expected: 1 },
  { inputs: { start: 4, moves: 3, seat_count: 5 }, expected: 2 },
]
```

Private Master:

```js
[
  { inputs: { start: 0, moves: 20, seat_count: 4 }, expected: 0 },
  { inputs: { start: 6, moves: 1, seat_count: 7 }, expected: 0 },
  { inputs: { start: 2, moves: 1_000_000, seat_count: 9 }, expected: 3 },
  { inputs: { start: 11, moves: 37, seat_count: 12 }, expected: 0 },
]
```

`thoughtCheck`는 “고정된 7 대신 어떤 값을 주기 길이로 사용했는가?”를 묻는다.

---

## 6. AC-PAT-PRIME-REV-30 — 잘못 만든 소수 판별기

### 6.1 학습 목표

몇 개의 정상 사례가 맞는다는 사실만으로 코드가 옳다고 결론 내리지 않고, 정의의 경계인 `0`, `1`, `2`를 검사하여 첫 반례를 찾고 최소 수정한다.

소수 판별 알고리즘을 새로 만드는 문제가 아니다. Base는 버그 Starter를 수리하는 Code Review 미션이어야 한다.

### 6.2 Kernel 계약

```js
problemId: 'AC-PAT-PRIME-REV-30'
problemVersion: 1
routeRole: 'branch'
learningRole: 'review'
recommendedBand: 'E'
prerequisites: ['AC-PAT-PRIME-27', 'AC-CODE-FIRST-ERROR-01']
lensId: 'state-transition'
```

Python 개념:

```js
requires: [
  'concept:function-body-focus',
  'operator:modulo',
  'operator:equality',
  'operator:comparison-bound',
  'builtin:range',
  'statement:for',
  'statement:if',
]
introduces: []
```

Thinking Pattern:

```js
requires: ['pattern:counterexample-search']
introduces: []
```

Evidence:

```js
primitives: ['source-debug', 'decision']
requiredClaims: [
  'empty-loop-can-hide-boundary-bug',
  'one-is-first-counterexample',
  'boundary-guard-precedes-divisor-loop',
]
```

### 6.3 함수·도메인 계약

```python
def is_prime_number(number):
```

- `number`: 정수 `0..200`
- 반환: Boolean
- `0`, `1`: `False`
- `2`: `True`
- AST 모양은 검사하지 않는다.

### 6.4 버그 Starter

```python
def is_prime_number(number):
    # 몇몇 수에서는 맞지만, 아주 작은 수에서 문제가 생깁니다.
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
```

주석에 `0`, `1`, 정답 guard를 직접 쓰지 않는다. 학생이 Observe/Explore에서 반례를 찾게 한다.

### 6.5 Observe

먼저 `2`, `3`, `4`만 보여준다.

- 2 → True, 정답
- 3 → True, 정답
- 4 → False, 정답

질문:

> 세 입력에서 맞았습니다. 이 코드가 모든 `0..200`에서 맞다고 결론 내려도 될까요?

정답: 아니다. 정의가 달라지는 작은 경계값도 확인해야 한다.

### 6.6 Explore — `state-transition`

| frame | 입력 | loop 후보 | 버그 출력 | 실제 정답 | 상태 |
|---|---:|---|---|---|---|
| case_4 | 4 | 2에서 나누어짐 | False | False | 일치 |
| case_3 | 3 | 2만 검사 | True | True | 일치 |
| case_2 | 2 | 빈 반복 | True | True | 우연히 일치 |
| case_1 | 1 | 빈 반복 | True | False | 첫 반례 |
| case_0 | 0 | 빈 반복 | True | False | 같은 경계 버그 |

핵심 설명:

> 반복문이 한 번도 실행되지 않으면 마지막 `return True`로 바로 이동합니다. 2에서는 우연히 맞지만 1에서는 소수 정의와 충돌합니다.

### 6.7 Public Tests

```js
[
  { inputs: { number: 1 }, expected: false },
  { inputs: { number: 2 }, expected: true },
  { inputs: { number: 9 }, expected: false },
  { inputs: { number: 11 }, expected: true },
]
```

### 6.8 Private Hidden Tests

| 입력 | 기대 | 그룹 |
|---:|---|---|
| 0 | False | `low_boundary` |
| 3 | True | `small_prime` |
| 4 | False | `small_composite` |
| 49 | False | `square_composite` |
| 97 | True | `large_prime` |
| 200 | False | `large_composite` |

Public 입력과 중복시키지 않는다.

### 6.9 Intended Wrong Fixtures

1. 원본 버그 그대로

- 실패 그룹: `low_boundary`
- 오개념: `PRIME-MISSING-LOW-BOUNDARY`

2. 2까지 거부

```python
if number <= 2:
    return False
```

- 공개 2에서 실패
- 오개념: `PRIME-TWO-BOUNDARY`

3. 첫 후보만 검사

```python
for divisor in range(2, number):
    return number % divisor != 0
```

- 실패 그룹: `square_composite` 또는 별도 odd composite 입력
- 오개념: `PRIME-EARLY-RETURN`

4. 결과 반전

- 합성수에서 True, 소수에서 False
- 오개념: `PRIME-BOOLEAN-INVERSION`

각 fixture가 지정 그룹에서 실제 실패하는지는 권위 Judge로 검증한다.

### 6.10 2★ 이해 확인

Q1. `number=1`에서 반복문이 실행되지 않은 뒤 어떤 줄로 이동하는가?

- 마지막 `return True` — 정답
- `return False`

Q2. 2도 반복문이 비어 있는데 결과가 맞는 이유는?

- 2는 소수이므로 마지막 True가 우연히 정의와 일치한다. — 정답
- 빈 반복은 항상 오류를 발생시킨다.

Q3. 가장 작은 수정 위치는?

- 반복 전에 `number < 2`를 처리한다. — 정답
- 반복 안에서 1로 나누어본다.

### 6.11 Fresh Transfer — 합성수 코드 수리

학생용 정의를 명시한다.

> 합성수는 1보다 크고, 1과 자기 자신 이외의 약수를 가진 수입니다. 0과 1은 소수도 합성수도 아닙니다.

Starter:

```python
def is_composite_number(number):
    if number < 2:
        return True  # 이 경계 판단을 검토하세요.
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
```

Public Preview:

```js
[
  { inputs: { number: 1 }, expected: false },
  { inputs: { number: 6 }, expected: true },
]
```

Private Master:

```js
[
  { inputs: { number: 0 }, expected: false },
  { inputs: { number: 2 }, expected: false },
  { inputs: { number: 4 }, expected: true },
  { inputs: { number: 17 }, expected: false },
  { inputs: { number: 49 }, expected: true },
]
```

`thoughtCheck`:

> “소수가 아니다”와 “합성수다”가 같은 뜻이 아닌 입력은 무엇인가?

정답 증거: `0과 1`.

---

## 7. 파일 변경 계획

### 7.1 새 파일 4개

```text
src/components/AlgorithmConstellation/shared/problems/ac_pat_calendar_29.js
src/components/AlgorithmConstellation/shared/problems/ac_pat_prime_review_30.js
functions/algorithmConstellation/problems/ac_pat_calendar_29.private.cjs
functions/algorithmConstellation/problems/ac_pat_prime_review_30.private.cjs
```

파일명은 기존 NEXT PLAN의 `prime_review`를 유지한다. Catalog ID의 `PRIME-REV`와 파일명의 `prime_review`를 혼용해 새 변형을 만들지 않는다.

### 7.2 수정 파일

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

필요 시 기존 패리티 테스트의 동적 Public Kernel 순회로 자동 포함되는지 먼저 확인한다. 자동 포함된다면 별도 ID 목록을 추가하지 않는다.

### 7.3 Catalog 변경

두 항목의 아래 필드만 출판 상태로 전환한다.

```js
status: 'published'
```

ID, `catalogOrder`, `routeRole`, 선수 조건, provenance는 유지한다. `CALENDAR-29`의 Lens만 구현 리뷰에 따라 `state-transition`으로 보정한다.

---

## 8. 테스트 추가 계획

### 8.1 Authoring Integrity

기존 `test-authoring-integrity-contracts.mjs`의 C2 섹션에 추가한다.

- CALENDAR Base 전체 입력: `start_day 0..6`, `days_later 0..1_000_000`
- CALENDAR Transfer: `seat_count 2..20`, `start < seat_count`, `moves 0..1_000_000`
- PRIME-REV Base/Transfer: `number 0..200`
- Public/Hidden 중복 0건
- Preview/Master 중복 0건
- 지원되는 Evidence Primitive만 사용
- official Base/Transfer 각각 20,000 step 이내 통과
- intended wrong fixture가 지정 그룹에서 실패
- Published/Public/Private 동적 집합 정확히 37개

### 8.2 Curriculum & Gate

기존 `test-gate0-curriculum-contracts.mjs`에 추가한다.

- 29 선수: `AC-PAT-003`
- 30 선수: `AC-PAT-PRIME-27`, `AC-CODE-FIRST-ERROR-01`
- 두 문제 `routeRole === 'branch'`
- 두 문제 미완료여도 성단 3 개방 Core count는 변하지 않음
- 선수 문제 1★ 미만이면 Hub 잠금
- 선수 문제 1★ 이상이면 해당 Branch만 개방

### 8.3 Server Lifecycle

기존 동적 출판 문제 수명주기 목록에 29, 30을 포함한다.

- start attempt
- Base 제출
- understanding evidence 제출
- transfer challenge 발급
- transfer 제출
- 3★/진도 기록

새 Callable 테스트 파일은 만들지 않는다.

### 8.4 Runtime Parity

- Calendar 큰 수 `%` 결과
- Prime의 빈 `range(2, 0/1/2)`와 early return
- Client Worker와 Server Judge 결과 일치

동적 순회가 이미 37개를 포함하면 별도 케이스를 중복 추가하지 않는다.

---

## 9. 권장 구현 순서

1. 29 Public Kernel 작성
2. 29 Private Definition 작성
3. 29 단독 공식/오답 fixture 실행 확인
4. 30 Public Kernel 작성
5. 30 Private Definition 작성
6. 30 Base와 Transfer가 서로 다른 반환 의미를 갖는지 검증
7. Public/Private index 등록
8. Catalog 두 항목 `published` 전환
9. 기존 세 테스트 파일에 C2-C 계약 추가
10. 표적 테스트 실행
11. 전체 테스트, ESLint, 빌드 실행

Catalog를 먼저 `published`로 바꾸지 않는다. Public/Private 등록이 끝난 뒤 마지막에 전환하여 중간 상태의 집합 불일치를 줄인다.

---

## 10. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

검증 중 실패하면 전체 테스트를 반복하기 전에 가장 가까운 표적 테스트부터 수정한다.

---

## 11. 완료 조건

### Gate C2-C-1 — 콘텐츠

- [ ] 29, 30의 Observe → Explore → Code → 2★ → Fresh Transfer가 모두 존재
- [ ] 학생 설명에 미학습 개념을 전제로 한 표현이 없음
- [ ] 29의 0-based 계약이 모든 화면에서 일관됨
- [ ] 30의 Base와 Transfer 버그가 실제로 성립함

### Gate C2-C-2 — 채점

- [ ] Public/Hidden 및 Preview/Master 입력 중복 0건
- [ ] 각 intended wrong fixture가 목표 그룹에서 실패
- [ ] 공식 Base/Transfer가 각각 20,000 step 이내 통과
- [ ] 클라이언트와 서버 결과 패리티 유지

### Gate C2-C-3 — 커리큘럼

- [ ] 선수 잠금 정상 동작
- [ ] Branch가 Core 6/8 및 성단 3 게이트에 영향 없음
- [ ] 성단 2가 8 Core + 2 Branch로 완결

### Gate C2-C-4 — 구조·비용

- [ ] Published = Public = Private = 37개
- [ ] 신규 Lens/API/Firestore/전용 UI 0건
- [ ] 전체 테스트, ESLint, 빌드 통과

---

## 12. 이번 단계에서 하지 않을 일

- 성단 3 문제 32~40 구현
- 성단 3 기존 Anchor 31의 계약 변경
- 신규 오개념 엔진 또는 AI API 연결
- 전역 Evidence Primitive 정리
- 번들 구조 개편
- 접근성 파일럿·출판 승인 절차 추가

성단 2 Branch 29~30이 완결된 후 다음 변경 단위는 **성단 3의 현재 Anchor 31 계약 점검과 신규 Core 32~34의 세부 가이드 작성**이다. 성단 2 작업에 성단 3 코드를 섞지 않는다.
