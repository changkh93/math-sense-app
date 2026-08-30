# LUMI 알고리즘 성단 — 다음 구현 작업 계획: 성단 2 수학 패턴 완결

> 대상: 다음 구현 계획을 세분화하거나 구현하는 AI/개발자  
> 범위: 성단 2 `AC-PAT-003` 및 `AC-PAT-004` 계약 보정, 신규 Core 23~28, Branch 29~30  
> 기준 문서: `MASTER_PLAN`, `INTEGRATED_ROADMAP`, `CORE_100_PLAN`, 현재 29개 출판 구현  
> 원칙: 신규 엔진보다 콘텐츠를 우선하되, 미학습 개념과 존재하지 않는 Lens를 그대로 출판하지 않는다.

## 1. 현재 상태 판정

현재까지 다음이 완료되었다.

- 성단 0: Core 8 + Branch 2 완결
- 성단 1: Core 8 + Branch 2 완결
- 성단 2: `AC-PAT-003`, `AC-PAT-004` 2개 출판
- 전체 Published/Public/Private: 29개 동적 ID 집합 일치
- 공용 Student Sandbox, Judge, Callable, Ledger, First Encounter, `StateTransitionLens`, `PatternTimelineLens` 사용 가능

따라서 다음 우선순위는 새로운 플랫폼 기능이 아니라 **성단 2 학습 사다리 완결**이다.

그러나 바로 23~30을 출판하면 안 된다. 현재 코드와 Catalog에는 다음 불일치가 있다.

1. `AC-PAT-003` 공식 풀이가 `==`를 사용하지만 `operator:equality`가 Concept Registry에 없다.
2. `AC-PAT-004` 공식 풀이가 `<`를 사용하지만 Public Kernel은 `operator:comparison-bound`를 요구하지 않는다.
3. Catalog 초안 23~30의 `cycle-timeline`은 현재 Lens Registry에 없는 ID다.
4. 숫자 자릿수 문제 24~25에 필요한 `//`는 Runtime에서 실행되지만 First Encounter 개념으로 등록되지 않았다.
5. 21~22의 Hidden Test는 Public 입력과 다수 중복되어 Judge 비용 대비 새 증거가 적다.
6. 신규 8문제를 한 변경에서 동시에 만들면 자릿수·약수·소수·GCD의 오류 원인을 분리하기 어렵다.

따라서 다음 작업은 네 단계로 나눈다.

```text
C2-R  기존 Anchor 21~22 계약 보정
  ↓
C2-A  Core 23~25: 나머지와 자릿수
  ↓
C2-B  Core 26~28: 약수·소수·최대공약수
  ↓
C2-C  Branch 29~30: 주기 일반화·소수 코드 심판
```

## 2. 범위와 비범위

### 이번 성단 2에서 구현할 것

- Python Concept 2종 보강
  - `operator:equality` (`==`, `!=`)
  - `operator:floor-division` (`//`)
- 기존 21~22의 개념·선수·테스트 계약 보정
- 신규 Public Kernel 8종과 Private Definition 8종
- Catalog·Registry·Index 연동
- 저작 무결성, 선수 DAG, Judge, Callable, Runtime parity 회귀
- 성단 3 개방 조건 `Anchor + Core 6/8` 실제 검증

### 이번 단계에서 만들지 않을 것

- `CycleTimelineLens`, `DigitLens`, `DivisorLens`, `PrimeLens`, `GcdLens`
- 새 Firebase Callable·Firestore collection
- 재귀, 제곱근 최적화, 에라토스테네스의 체
- `math.gcd`, 외부 Python module
- 문제별 오개념 matcher
- Transfer Generator 범용 엔진
- 학생 파일럿·접근성 승인에 의한 출판 지연

모든 문제는 기존 `PatternTimelineLens` 또는 `StateTransitionLens`로 표현한다.

## 3. 성단 2 최종 학습 사다리

| 순서 | 문제 | 역할 | 핵심 사고 | 새 Python 개념 |
|---:|---|---|---|---|
| 21 | 얼어붙은 신호 다리 | Anchor | 주기와 나머지 0 | `%`, `==` |
| 22 | 회전하는 우주 등대 | Practice | 주기 안의 연속 구간 | 없음 |
| 23 | 홀수·짝수 비콘 | Practice | `% 2`로 두 상태 분류 | 없음 |
| 24 | 숫자 유성의 자릿수 신호 | Practice | 10진 자릿수 분해 | `//` |
| 25 | 뒤집힌 우주 번호 | Practice | 자릿수 반복 추출·누적 | 없음 |
| 26 | 운석의 약수 센서 | Anchor | 작은 범위 완전 탐색 | 없음 |
| 27 | 소수 탐사 순찰대 | Practice | 경계와 약수 부재 판정 | 없음 |
| 28 | 두 톱니바퀴의 공통 박자 | Practice | 반복 감소와 불변 공약수 | 없음 |
| 29 | 다음 우주 캘린더 | Branch | 시작점이 있는 큰 주기 일반화 | 없음 |
| 30 | 잘못 만든 소수 판별기 | Branch | 경계 반례로 코드 수리 | 없음 |

### 3.1 난이도 상한

- 입력은 작고 유한하게 제한한다.
- 소수는 `n <= 200`, 약수는 `n <= 100`으로 제한한다.
- GCD는 반복 감산으로 충분한 `1..100` 양의 정수만 사용한다.
- 성능 최적화보다 완전 탐색, 경계, 상태 변화 설명을 평가한다.
- `sqrt`, 재귀, 함수 중첩 호출을 필수로 하지 않는다.

## 4. 선수 조건 DAG

```text
AC-PAT-003 (21)
  ├─ AC-PAT-004 (22)
  ├─ AC-PAT-EVEN-23
  ├─ AC-PAT-DIGIT-24
  │    └─ AC-PAT-REVNUM-25
  ├─ AC-PAT-DIVISOR-26
  │    ├─ AC-PAT-PRIME-27
  │    │    └─ AC-PAT-PRIME-REV-30
  │    └─ AC-PAT-GCD-28
  └─ AC-PAT-CALENDAR-29
```

확정 선수 조건:

| 문제 | prerequisites |
|---|---|
| PAT-003 | `AC-COND-001` |
| PAT-004 | `AC-PAT-003`, `AC-EXP-BOUND-05` |
| EVEN-23 | `AC-PAT-003` |
| DIGIT-24 | `AC-PAT-003`, `AC-CODE-FIRST-ERROR-01` |
| REVNUM-25 | `AC-PAT-DIGIT-24`, `AC-EXP-WHILE-07` |
| DIVISOR-26 | `AC-PAT-003`, `AC-EXP-LOOP-06` |
| PRIME-27 | `AC-PAT-DIVISOR-26`, `AC-EXP-BOUND-05` |
| GCD-28 | `AC-PAT-DIVISOR-26`, `AC-EXP-WHILE-07` |
| CALENDAR-29 | `AC-PAT-003` |
| PRIME-REV-30 | `AC-PAT-PRIME-27`, `AC-CODE-FIRST-ERROR-01` |

직접 사용하는 개념이 선수 관계의 전이 폐쇄에 이미 포함되면 중복 prerequisite를 추가하지 않는다.

## 5. C2-R — 기존 21~22 경량 계약 보정

목표는 재작성이나 UI 변경이 아니다. 이미 동작하는 문제를 현재 저작 불변식에 맞춘다.

### 5.1 Python Concept Registry

#### `operator:equality`

- 표기: `==`, `!=`
- 정규 최초 문제: `AC-PAT-003`
- 의미: 두 값이 같은지 또는 다른지 Boolean으로 판정
- 작은 예시: `7 % 3 == 1 → True`
- 예측: `8 % 4 == 0`은 True인가?

`AC-PAT-003.pythonConcepts`:

```js
{
  requires: ['concept:function-body-focus'],
  introduces: ['operator:modulo', 'operator:equality'],
}
```

#### PAT-004 비교 경계 선언

```js
pythonConcepts: {
  requires: ['operator:modulo', 'operator:comparison-bound'],
  introduces: [],
}
```

Catalog의 PAT-004 선수 조건에 `AC-EXP-BOUND-05`를 추가한다. 기존 완료 학생은 현재 공용 grandfathered/완료 보호 정책을 유지한다.

### 5.2 21~22 Hidden 비용 정리

Public과 동일한 입력을 Hidden에서 반복하지 않는다.

- PAT-003 Hidden 권장: `5, 9, 10, 15, 99, 100`
- PAT-004 Hidden 권장: `7, 8, 9, 10, 100, 101, 102`

각 그룹의 의미는 유지한다. 테스트 수를 늘리지 않고 경계·큰 수·활성 구간 증거를 남긴다.

### 5.3 하지 않을 리팩터링

- 21~22를 `createCapabilityPrototypeKernel`로 전면 변환하지 않는다.
- Private 필드명을 한꺼번에 변경하지 않는다.
- 이미 호환되는 `intendedWrongSolutions`, `transferChallenges` adapter를 제거하지 않는다.

이 작업은 기능 개선이 아니라 회귀 위험만 키운다.

## 6. C2-A — Core 23~25: 나머지와 자릿수

이 묶음이 **바로 다음 구현 작업**이다. C2-R과 C2-A까지만 한 변경 단위로 진행한다.

### 6.1 AC-PAT-EVEN-23 — 홀수·짝수 비콘

확정 함수:

```python
def is_even_beacon(signal_number):
    return signal_number % 2 == 0
```

- 입력: 정수 `0..10000`
- 반환: Boolean
- 선수: `AC-PAT-003`
- Lens: `pattern-timeline`
- 개념: `% 2` 결과가 0/1로 반복되는 두 상태 주기

Public 핵심 입력: `0, 7, 12`.

Hidden은 Public과 겹치지 않는 다음 6개면 충분하다.

- even: `2, 100, 10000`
- odd: `1, 99, 9999`

오답 fixture:

- 나머지 1을 짝수로 판정
- `% 2` 결과 자체를 반환해 Boolean 계약 위반
- 항상 True

2★:

- 0이 짝수인 이유
- 2씩 증가할 때 parity가 유지되는 이유

Fresh Transfer:

```python
def have_same_parity(a, b):
    return a % 2 == b % 2
```

두 수의 개별 짝수 판정이 아니라 **두 주기의 상태 비교**로 전이한다.

### 6.2 AC-PAT-DIGIT-24 — 숫자 유성의 자릿수 신호

`operator:floor-division`을 이 문제에서 최초 도입한다.

Concept 계약:

- 표기: `//`
- 정규 최초 문제: `AC-PAT-DIGIT-24`
- 의미: 나눗셈의 몫만 남겨 낮은 자릿수를 제거
- 예시: `472 // 10 → 47`, `472 % 10 → 2`

확정 함수:

```python
def decode_three_digit_signal(number):
    hundreds = number // 100
    tens = (number // 10) % 10
    ones = number % 10
    return [hundreds, tens, ones]
```

- 입력: 세 자리 정수 `100..999`
- 반환: 길이 3의 정수 리스트
- 선수: `AC-PAT-003`, `AC-CODE-FIRST-ERROR-01`
- Lens: `state-transition`
- 요구 개념: modulo, equality, floor-division, assignment, list

Explore 프레임:

1. `472 % 10 → 2`
2. `472 // 10 → 47`
3. `47 % 10 → 7`
4. `472 // 100 → 4`
5. `[4, 7, 2]` 조립

Hidden은 서로 다른 0 포함 위치를 검증한다.

- `105 → [1,0,5]`
- `420 → [4,2,0]`
- `999 → [9,9,9]`
- `307 → [3,0,7]`

Fresh Transfer:

```python
def sum_three_digit_signal(number):
    return number // 100 + (number // 10) % 10 + number % 10
```

리스트 조립에서 자릿수 합산으로 결과 표현을 바꾼다.

### 6.3 AC-PAT-REVNUM-25 — 뒤집힌 우주 번호

확정 함수:

```python
def reverse_signal_number(number):
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = reversed_number * 10 + digit
        number = number // 10
    return reversed_number
```

- 입력: 정수 `0..9999`
- 반환: 뒤집은 정수
- `1200 → 21`, `0 → 0`
- 선수: `AC-PAT-DIGIT-24`, `AC-EXP-WHILE-07`
- Lens: `state-transition`
- 새 개념 없음

Explore는 `1203`을 사용해 `(추출 digit, 남은 number, 누적 reversed)` 세 상태를 매 회차 표시한다.

필수 오답 fixture:

- 누적식 순서를 `digit * 10 + reversed`로 작성
- `number // 10` 갱신 누락
- `0` 입력 처리 실패
- 마지막 digit만 반환

Fresh Transfer:

```python
def count_number_digits(number):
    if number == 0:
        return 1
    count = 0
    while number > 0:
        count = count + 1
        number = number // 10
    return count
```

같은 “자릿수를 하나씩 제거” 반복을 다른 누적 목표에 적용한다.

## 7. C2-B — Core 26~28: 수의 성질

C2-A 전체 회귀 통과 후 별도 변경으로 진행한다.

### 7.1 AC-PAT-DIVISOR-26 — 운석의 약수 센서

확정 함수:

```python
def count_divisors(number):
    count = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            count = count + 1
    return count
```

- 입력: `1..100`
- 반환: 약수 개수
- 선수: PAT-003, LOOP-06
- Lens: `state-transition`
- 역할: Anchor
- 핵심: 작은 범위 후보 전수 검사와 조건부 count

경계 증거:

- `1`의 약수는 1개
- 소수는 2개
- 제곱수는 제곱근 약수를 한 번만 센다

Fresh Transfer: `sum_divisors(number)`.

### 7.2 AC-PAT-PRIME-27 — 소수 탐사 순찰대

확정 함수:

```python
def is_prime_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
```

- 입력: `0..200`
- 반환: Boolean
- 선수: DIVISOR-26, BOUND-05
- Lens: `state-transition`
- 핵심 경계: 0, 1, 2, 제곱수, 일반 합성수

성능 최적화나 `sqrt`를 요구하지 않는다.

Fresh Transfer: `is_composite_signal(number)`; `number > 1`이며 진약수가 있는지 판정한다.

### 7.3 AC-PAT-GCD-28 — 두 톱니바퀴의 공통 박자

확정 함수:

```python
def greatest_common_rhythm(a, b):
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a
```

- 입력: 양의 정수 `1..100`
- 반환: 최대공약수
- 선수: DIVISOR-26, WHILE-07
- Lens: `state-transition`
- `operator:equality`의 `!=` 회수
- 핵심 불변식: 큰 수에서 작은 수를 빼도 공약수 집합이 유지됨

Fresh Transfer:

```python
def reduce_ratio(a, b):
    # 같은 반복 감소로 gcd를 구한 뒤 [a // gcd, b // gcd] 반환
```

새 알고리즘 없이 GCD 결과를 실제 비율 단순화에 적용한다.

## 8. C2-C — Branch 29~30

### 8.1 AC-PAT-CALENDAR-29 — 다음 우주 캘린더

확정 함수:

```python
def calendar_day(start_day, days_later):
    return (start_day + days_later) % 7
```

- `start_day`: `0..6`
- `days_later`: `0..1_000_000`
- 반환: `0..6`
- 선수: PAT-003
- Lens: `pattern-timeline`
- 역할: Branch / Review
- 핵심: 0에서 시작하는 주기에서 “시작 offset이 있는 주기”로 일반화

Fresh Transfer: 임의 길이 회전 좌석 `rotated_seat(start, moves, seat_count)`.

### 8.2 AC-PAT-PRIME-REV-30 — 잘못 만든 소수 판별기

학생에게 제공하는 버그 Starter:

```python
def is_prime_number(number):
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
```

이 코드는 2에서는 맞지만 0과 1도 True로 판정한다.

- 선수: PRIME-27, CODE-FIRST-ERROR-01
- Lens: `state-transition`
- thinking pattern: `pattern:counterexample-search` requires
- 핵심 첫 반례: `number=1`
- 정답 수리: 반복 전에 `number < 2` 경계 처리

Fresh Transfer는 버그가 있는 `is_composite_number(number)`를 수리하게 한다. 0과 1이 합성수가 아니라는 경계를 다시 적용하되 반환 의미는 반대로 바뀐다.

## 9. Lens 배정

Catalog의 `cycle-timeline`은 모두 제거한다.

| 문제 | 확정 Lens |
|---|---|
| 21, 22, 23, 29 | `pattern-timeline` |
| 24, 25, 26, 27, 28, 30 | `state-transition` |

새 Lens를 만들 조건은 동일한 표현 한계가 3문제 이상에서 반복될 때뿐이다. 현재 두 기존 Lens로 충분하다.

## 10. 파일 변경 계획

### C2-R

수정:

- `shared/python/pythonConceptRegistry.js`
- `shared/problems/ac_pat_003.js`
- `shared/problems/ac_pat_004.js`
- `shared/catalog/algorithmEditorialCatalog.js`
- `functions/.../ac_pat_003.private.cjs`
- `functions/.../ac_pat_004.private.cjs`
- 저작·커리큘럼·parity 테스트

### C2-A

생성:

- `ac_pat_even_23.js` / `.private.cjs`
- `ac_pat_digit_24.js` / `.private.cjs`
- `ac_pat_revnum_25.js` / `.private.cjs`

수정:

- Public/Private index
- Catalog 23~25
- Python Concept Registry에 `operator:floor-division`
- 저작·커리큘럼·Judge·Callable·parity 테스트

### C2-B

생성:

- `ac_pat_divisor_26.js` / `.private.cjs`
- `ac_pat_prime_27.js` / `.private.cjs`
- `ac_pat_gcd_28.js` / `.private.cjs`

### C2-C

생성:

- `ac_pat_calendar_29.js` / `.private.cjs`
- `ac_pat_prime_review_30.js` / `.private.cjs`

문제별 컴포넌트, API, 저장 파일은 생성하지 않는다.

## 11. 자동 검증 계획

### 11.1 공통 출판 계약

- Published/Public/Private 동적 문제 ID 집합 동등성
- Catalog order와 ID 고유성
- 선수 DAG 순환 없음
- 모든 published prerequisite도 published 상태
- 모든 Concept/Pattern ID가 Registry에 존재
- 공식·대안 풀이 통과
- intended wrong fixture가 지정 그룹에서 실패
- Public/Hidden 입력 중복 없음
- Transfer Starter 실패, 공식 Transfer 통과

### 11.2 수학 도메인 계약

- EVEN: 0, 홀수, 짝수, 큰 수
- DIGIT: 정확히 세 자리 입력, 반환 리스트 길이 3, 0 자릿수 보존
- REVNUM: 0, 끝자리 0, 반복 상태 감소
- DIVISOR: 1, 소수, 제곱수, 일반 합성수
- PRIME: 0과 1 False, 2 True, 제곱 합성수 False
- GCD: 양수만, 같은 수, 서로소, 한 수가 다른 수의 배수
- CALENDAR: 큰 `days_later`와 시작 offset
- PRIME REVIEW: 버그 Starter가 1에서 반드시 실패

### 11.3 Runtime parity

기존 parity matrix에 다음 표현을 추가한다.

- `==`, `!=`
- `//`
- `%`와 `//` 혼합
- while 안의 자릿수 상태 갱신
- for/range 안의 modulo 판정
- 리스트 반환 `[hundreds, tens, ones]`

클라이언트 Worker와 서버 Judge가 결과와 실패 코드를 동일하게 내야 한다.

### 11.4 성단 3 개방 검증

- 성단 2 Branch 29~30은 Core count에 포함하지 않는다.
- Anchor `AC-PAT-003` 미완료 시 Core 6개를 풀어도 성단 3 잠김.
- Anchor 포함 Core 5개 + Branch 2개는 잠김.
- Anchor 포함 Core 6개는 Branch 완료 여부와 무관하게 열림.
- 기존 성단 3 진행 학생은 grandfathered 접근 유지.

## 12. 개발·실행 비용 통제

### 문제당 테스트 예산

- Public: 3~4개
- Hidden Practice: 5~7개
- Hidden Anchor: 7~9개
- Transfer: 4~6개
- Boolean 전 공간처럼 유한 완전 검사가 가능한 경우만 예외

Public과 Hidden에 같은 입력을 복제하지 않는다.

### 구현 비용 기준

- Practice 하나에 전용 JSX가 필요하면 구현을 중단하고 데이터 표현을 다시 설계한다.
- 신규 공용 추상화는 최소 3문제에서 같은 중복이 확인된 뒤 만든다.
- Private Definition의 작은 반복은 성급한 생성기보다 명시적 데이터가 안전하다.
- 성단 2 전체를 한 PR/변경으로 묶지 않는다.
- C2-A가 통과하기 전 C2-B 파일을 만들지 않는다.

### 출판 수치

현재 29개에서 다음과 같이 증가한다.

```text
C2-R: 29개 유지
C2-A 완료: 32개
C2-B 완료: 35개
C2-C 완료: 37개
```

성단 2 완결은 37개 시점이다. 이것을 Wave B 40개 완료라고 부르지 않는다. 이후 성단 3의 다음 3개가 출판되어야 40개 Gate에 도달한다.

## 13. 실행 순서

각 묶음에서 다음 순서를 반복한다.

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-client-server-runtime-parity.mjs
node scripts/test-server-orchestration-and-judge.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

먼저 좁은 계약 테스트를 실행하고, 통과한 뒤에만 전체 스위트와 빌드를 수행한다.

## 14. 단계별 완료 Gate

### Gate C2-R

- [ ] `operator:equality`가 PAT-003에서 정식 도입된다.
- [ ] PAT-004가 `<` 개념과 BOUND-05 선수를 선언한다.
- [ ] 21~22 Public/Hidden 중복이 제거된다.
- [ ] 기존 학생 진도와 문제 ID가 보존된다.

### Gate C2-A

- [ ] 23~25에 미학습 문법이 없다.
- [ ] `//` First Encounter가 DIGIT-24에서 완결된다.
- [ ] 0, 중간 0 자릿수, 끝자리 0 경계를 모두 검증한다.
- [ ] 신규 Lens·API·저장 구조가 없다.

### Gate C2-B

- [ ] 약수 → 소수 → GCD의 개념 순서가 보인다.
- [ ] 0, 1, 2와 제곱수 소수 오개념을 잡는다.
- [ ] 작은 입력 제한으로 누적 Step 예산을 안정적으로 지킨다.

### Gate C2-C

- [ ] Branch가 성단 3 개방에 영향을 주지 않는다.
- [ ] Calendar가 큰 수 주기 일반화를 증명한다.
- [ ] Prime Review는 정답 복사가 아니라 경계 반례 수리 과제다.
- [ ] 성단 2의 10문제가 모두 완결된다.

## 15. 바로 다음 구현 작업

다음 구현 담당 AI에게는 **C2-R + C2-A만** 맡긴다.

```text
1. PAT-003/PAT-004 개념·선수·Hidden 계약 보정
2. operator:equality, operator:floor-division First Encounter 등록
3. EVEN-23, DIGIT-24, REVNUM-25 Public/Private Vertical Slice
4. Catalog/Index 출판
5. Runtime parity와 전체 회귀
```

C2-B와 C2-C는 이 문서의 계약을 유지하되 C2-A 검증 결과를 확인한 뒤 별도 개발 가이드로 세분화한다. 이 순서가 가장 적은 공수로 성단 2를 체계적으로 확장하면서, 자릿수 연산과 Runtime 문제를 약수·소수 문제에 복제하는 위험을 막는다.
