# LUMI 알고리즘 성단 — 성단 0 본 항로 완결 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-EXP-STEP-03`, `AC-EXP-BOUND-05`, `AC-EXP-WHILE-07`과 성단 1 개방 게이트  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → 성단 0 본 항로 완결 계획 v2 → 기존 문서**

## 1. 최종 평가

계획 v2는 이전 가환성 결함을 인식하고, `while`의 첫 진입 난도를 낮추며, 성단 0의 여덟 Core를 학습 사다리로 완성한다는 점에서 방향이 좋다. 다만 현재 상태로 구현하면 다음 문제가 발생한다.

1. STEP-03의 수식이 SEQ-01과 사실상 같아 별도 문제의 학습 가치가 약하다.
2. STEP-03과 BOUND-05의 Starter/설명에 정답 표현이 직접 포함돼 있다.
3. 계획은 필수 Anchor를 3종으로 정의하지만 현재 `constellationRegistry.js`는 SEQ-01 하나만 요구한다.
4. Catalog의 `decision-gate`, `cycle-timeline` Lens는 현재 Explore registry에 등록되어 있지 않다.
5. `WHILE-NO-UPDATE` fixture는 큰 스텝 예산을 모두 소진할 수 있어 반복 테스트 비용을 불필요하게 높인다.
6. Fresh Transfer 일부가 Base에서 배우지 않은 비교 방향이나 불명확한 함수 계약을 요구한다.

따라서 **조건부 승인**한다. 새 엔진이나 문제별 UI를 추가하지 않고, 아래 보정안을 적용하여 구현한다.

### 채택·수정·폐기 결정

| 계획 요소 | 결정 | 구현 기준 |
|---|---|---|
| 성단 0의 8 Core + 2 Branch 구조 | 채택 | 이번 범위는 Core 3개뿐이다. Branch 2개는 후속이다. |
| STEP-03 비가환 절차 | 수정 채택 | 계산식보다 ‘빠진 단계 선택·배치’ 경험이 중심이어야 한다. |
| BOUND-05 경계 반례 | 채택 | 문제 문구와 Starter에서 `이하`, `<=`를 사전 노출하지 않는다. |
| WHILE-07 step=1 기본 문제 | 채택 | 입력 계약은 `start_pos <= target_pos`로 제한한다. |
| 가변 step을 Transfer로 이동 | 수정 채택 | `step >= 1` 계약과 반환 의미를 명시한다. |
| `decision-gate`, `cycle-timeline` 신규 Lens | 폐기 | 기존 `state-transition`에 선택형 프레임만 추가한다. |
| Anchor 3종 + Core 6/8 게이트 | 채택 | Registry와 테스트를 함께 변경한다. 기존 진입 학생은 보호한다. |
| 19개라는 고정 개수 검증 | 폐기 | Public/Private/Published 집합 동등성으로 검증한다. |
| 접근성·파일럿 승인 | 출판 비차단 | 자동 계약 검증 통과 후 즉시 `published`로 전환한다. |

## 2. 확정 학습 사다리

성단 0 Core의 최종 순서는 다음과 같다.

```text
01 SEQ      순서대로 실행하기
 └─ 02 VAR  시간에 따라 상태가 덮어써짐
     ├─ 03 STEP  절차를 나누고 빠진 단계 조립
     ├─ 04 SWAP  덮어쓰기 전 정보 보존
     ├─ 05 BOUND 경계 반례 판정
     └─ 06 LOOP  정해진 횟수만큼 상태 누적
          └─ 07 WHILE 조건이 참인 동안 갱신하고 종료
01 SEQ ──────── 08 FIRST ERROR 최초 오류 순간 찾기
```

이번 구현 후 성단 0에는 8개의 published Core가 생긴다. Branch인 EQUIV-09와 REVERSE-10은 성단 1 개방 조건에 포함하지 않는다.

## 3. 개발 효율성을 위한 공통 아키텍처

### 3.1 새 문제별 컴포넌트를 만들지 않는다

세 문제 모두 다음 공용 경로를 사용한다.

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

새 Callable, Firestore collection, 진도 모델, 별 시스템, 별도 Judge를 만들지 않는다.

### 3.2 StateTransitionLens에 선택형 프레임만 추가

STEP과 BOUND를 위해 별도 `MissingStepLens`, `DecisionGateLens`를 만들지 않는다. 기존 프레임 계약에 선택형 프레임을 한 번 확장한다.

```js
{
  id: 'missing_boost',
  prompt: '두 단계 사이에 들어갈 명령을 선택하세요.',
  operationOptions: [
    {
      id: 'multiply_boost',
      label: 'energy = energy * boost',
      stateAfter: { energy: 20 },
    },
    {
      id: 'add_shield',
      label: 'energy = energy + shield',
      stateAfter: { energy: 9 },
    },
    {
      id: 'reset_energy',
      label: 'energy = 0',
      stateAfter: { energy: 0 },
    },
  ],
  expectedOptionId: 'multiply_boost',
}
```

렌즈 동작:

- 일반 frame은 현재 Wave A처럼 ‘예상 후 결과 확인’으로 진행한다.
- `operationOptions`가 있는 frame은 선택 전 결과를 보여주지 않는다.
- 오답 선택은 짧은 상태 결과만 보여주고 다시 고르게 한다.
- 정답 선택 후에만 다음 frame이 열린다.
- 완성 코드를 자동으로 Editor에 삽입하지 않는다.
- 선택 증거에는 `frameId`, `selectedOptionId`, `attemptCount`만 기록한다.

이 확장은 이후 Parsons, 경계 선택, 조건식 선택 문제에도 재사용할 수 있다.

### 3.3 Catalog와 Kernel Lens 일치

신규 3개 문제의 Catalog `lensId`와 Public Kernel `modes.explore.lensId`는 모두 `state-transition`으로 맞춘다.

현재 존재하지 않는 다음 ID는 사용하지 않는다.

```text
decision-gate
cycle-timeline
```

저작 검증기에 Catalog와 Public Kernel의 lensId parity 검사를 추가한다.

## 4. 문제별 확정 구현 스펙

## 4.1 AC-EXP-STEP-03 — 빠진 명령 한 장

### 학습 목표

정답 수식을 한 번 더 계산하는 문제가 아니라 다음을 훈련한다.

- 전체 절차를 작은 단계로 나눈다.
- 앞 단계의 출력 상태와 다음 단계의 입력 상태를 연결한다.
- 누락된 한 단계를 후보 중에서 찾고 올바른 위치에 놓는다.

### 선수·학습 지원

```js
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'operator:assignment',
    'operator:arithmetic-state-update',
  ],
  introduces: [],
},
thinkingPatterns: {
  requires: [],
  introduces: ['pattern:procedure-decomposition'],
},
```

`pattern:procedure-decomposition`을 문제 해결 패턴 레지스트리에 등록한다. Python 문법 레지스트리에 넣지 않는다.

### 함수 계약

```python
def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    energy = energy * boost
    energy = energy - shield
    return energy
```

입력 계약:

- `boost >= 2`
- 공개·비공개 테스트는 정수만 사용
- 정성적 설명이 필요한 경우 `charge >= 0`, `shield >= 0`도 유지

### Starter Code

빠진 연산을 주석으로 직접 알려주지 않는다.

```python
def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    # 앞뒤 상태를 연결하는 한 명령이 빠져 있어요.
    energy = energy - shield
    return energy
```

다음 문구는 금지한다.

```text
boost 곱하기를 채우세요
energy = energy * boost를 넣으세요
```

### Explore

`StateTransitionLens`의 선택형 frame을 사용한다.

1. `initial_energy` 상태 공개
2. `+ charge` 결과를 예상 후 확인
3. 세 후보 중 빠진 중간 명령 선택
4. `- shield` 결과를 예상 후 확인
5. “각 단계의 결과가 다음 단계의 출발 상태”라는 규칙 확인

### 이해 증거

“정상보다 부족하다” 같은 정성 답은 입력에 따라 달라질 수 있으므로 사용하지 않는다.

예:

```text
initial=2, charge=3, boost=4, shield=5
1) 빠진 명령까지 실행한 직후 energy는? → 20
2) 빠진 명령을 생략한 최종 energy는? → 0
```

두 질문 모두 data-driven options를 사용한다.

### 오답 fixture

- `STEP-OMIT-MIDDLE`
  - expectedMisconception: `STEP-OMISSION`
  - expectedFailingGroup: `boost_sensitive`
- `STEP-REVERSE-ORDER`
  - expectedMisconception: `PROCEDURAL-ORDER-REVERSAL`
  - expectedFailingGroup: `boost_sensitive`
- `STEP-HARDCODED-SAMPLE`
  - expectedMisconception: `HARDCODED-SAMPLE-RETURN`
  - expectedFailingGroup: `varied_parameters`

히든 그룹:

- `boost_sensitive`
- `zero_initial`
- `no_shield_cost`
- `varied_parameters`

각 그룹은 최소 1개, 전체 hidden test는 최소 5개를 권장한다. 하드코딩 기각용 그룹은 공개 예시와 다른 값을 사용한다.

### Fresh Transfer

Base의 변수명만 바꾸되 동일한 완성식을 복제하지 않는다.

```python
def calibrate_scan_signal(raw_signal, noise, gain, offset):
    signal = raw_signal
    signal = signal - noise
    signal = signal * gain
    signal = signal + offset
    return signal
```

사용하는 Python 도구는 동일하지만 연산 순서가 `빼기 → 곱하기 → 더하기`로 바뀐다. Starter에는 함수 시그니처와 서술만 제공한다.

## 4.2 AC-EXP-BOUND-05 — 경계선의 탐사선

### 학습 목표

경계보다 작은 값과 경계와 같은 값을 별도 사례로 보고, 경계 포함 여부가 연산자 선택을 바꾼다는 것을 발견한다.

### 선수·학습 지원

```js
pythonConcepts: {
  requires: ['concept:function-body-focus'],
  introduces: ['operator:comparison-bound'],
},
thinkingPatterns: {
  requires: [],
  introduces: [],
},
```

`operator:comparison-bound` First Encounter는 `<`와 `<=`의 차이만 다룬다. 이번 단계에서 `>`, `>=`까지 한꺼번에 확장하지 않는다.

### 함수 계약

```python
def check_within_boundary(current_pos, limit):
    return current_pos <= limit
```

### 문제·Starter 문구

정답 연산자를 자연어로 노출하지 않는다.

권장:

```python
def check_within_boundary(current_pos, limit):
    # 경계선 위의 위치도 안전 구역에 포함되는 규칙을 코드로 표현하세요.
    return False
```

금지:

```text
limit 이하인지 확인하세요
<=를 사용하세요
```

“경계선 위도 포함된다”는 규칙은 문제 상황이고, 이를 `<` 또는 `<=`로 번역하는 것이 학생 과제다.

### Observe·Explore

Observe에서 먼저 다음 세 사례의 결과를 예측한다.

```text
current_pos=9, limit=10   → 안전
current_pos=10, limit=10  → 안전
current_pos=11, limit=10  → 범위 밖
```

초기 화면에서 연산자 이름과 정답을 표시하지 않는다. Explore의 선택형 frame에서 `<`와 `<=`를 비교하고, 정확히 같은 경계 반례에서 차이를 확인한다.

### 이해 증거

한 질문에 두 값을 합친 모호한 응답보다 두 개의 독립 질문을 사용한다.

```text
10 <= 10의 결과는? → True
10 < 10의 결과는?  → False
```

### 오답 fixture

- `BOUND-STRICT-LESS-THAN` → `exact_boundary`
- `BOUND-INVERTED-DIRECTION` → `strictly_inside`
- `BOUND-ALWAYS-TRUE` → `strictly_outside`

히든 그룹:

- `exact_boundary`: 최소 3개
- `strictly_inside`: 최소 2개
- `strictly_outside`: 최소 2개
- `zero_limit`: `(0,0)`, `(1,0)` 포함

### Fresh Transfer

`oxygen_level >= safe_threshold`는 아직 배우지 않은 `>=` 방향을 요구하므로 사용하지 않는다.

대신 동일한 `<=` 의미를 유지한다.

```python
def check_oxygen_usage_safe(oxygen_used, usage_limit):
    return oxygen_used <= usage_limit
```

경계값 `oxygen_used == usage_limit`을 반드시 테스트한다.

## 4.3 AC-EXP-WHILE-07 — 멈출 줄 아는 로버

### 학습 목표

학생이 다음 두 질문에 답할 수 있어야 한다.

1. 어떤 조건일 때 다음 회차를 실행하는가?
2. 본문에서 어떤 상태가 바뀌어야 결국 조건이 False가 되는가?

### 선수·학습 지원

```js
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'operator:assignment',
    'operator:arithmetic-state-update',
    'operator:comparison-bound',
  ],
  introduces: ['statement:while'],
},
thinkingPatterns: {
  requires: [],
  introduces: [],
},
```

WHILE-07은 BOUND-05의 `<` 비교를 사용하므로 Catalog prerequisite에 `AC-EXP-BOUND-05`도 추가한다.

권장 선수 관계:

```js
prerequisites: ['AC-EXP-LOOP-06', 'AC-EXP-BOUND-05']
```

### 함수·입력 계약

```python
def advance_until_target(start_pos, target_pos):
    pos = start_pos
    while pos < target_pos:
        pos = pos + 1
    return pos
```

입력 계약:

```text
start_pos <= target_pos
정수 입력만 사용
```

계약 밖 입력을 억지로 Base hidden test에 넣지 않는다.

### Explore

기존 `StateTransitionLens`로 다음을 보여준다.

```text
초기 pos=1, target=4
1회차 직후 pos=2, 다음 조건 True
2회차 직후 pos=3, 다음 조건 True
3회차 직후 pos=4, 다음 조건 False → 종료
```

마지막 frame은 “pos가 얼마인가?”보다 “다음 회차를 실행하는가?”를 먼저 예측하게 한다.

### 이해 증거

```text
start=1, target=4
1) 2회차 직후 pos는? → 3
2) 그 직후 pos < target의 결과는? → True
```

### 정확성 판정 원칙

`return target_pos`처럼 결과가 정확한 대안은 1★에서 통과시킨다. 소스 문자열에서 `while` 존재 여부를 검사하지 않는다. 반복과 종료 조건의 이해는 Explore 및 2★ 증거로 확인한다.

### 오답 fixture와 테스트 순서

- `WHILE-NO-UPDATE`
  - expectedMisconception: `WHILE-INFINITE-LOOP`
  - expectedFailingGroup: `single_step`
- `WHILE-OFF-BY-ONE-OVERSHOOT`
  - expectedMisconception: `WHILE-OVERSHOOT-BOUND`
  - expectedFailingGroup: `single_step`
- `WHILE-RETURN-INITIAL`
  - expectedMisconception: `NO-STATE-UPDATE`
  - expectedFailingGroup: `single_step`

히든 테스트는 비용과 진단 정확성을 위해 다음 순서로 둔다.

1. `already_at_target`
2. `single_step`
3. `distance_travel`
4. `zero_start`

무한 루프 fixture는 첫 positive-distance 입력인 `single_step`에서 스텝 한도로 종료된다. 실행되지 않은 뒤쪽 그룹을 expected group으로 지정하지 않는다.

### Fresh Transfer

```python
def advance_with_step(start_pos, target_pos, step):
    pos = start_pos
    while pos + step <= target_pos:
        pos = pos + step
    return pos
```

입력 계약:

```text
start_pos <= target_pos
step >= 1
반환값은 target을 넘지 않고 도달 가능한 가장 먼 위치
```

Transfer test에는 다음을 포함한다.

- 정확히 target에 도착
- step으로 나누어떨어지지 않아 target 직전에서 종료
- start와 target이 같음
- step이 남은 거리보다 큼

`step=0`은 계약 밖이므로 테스트하지 않는다.

## 5. 개방 게이트 구현 가이드

### 5.1 Registry 변경

현재 성단 0의 `requiredAnchors`는 SEQ-01 하나뿐이다. 계획과 맞게 다음 세 문제로 변경한다.

```js
requiredAnchors: [
  'AC-EXP-SEQ-01',
  'AC-EXP-LOOP-06',
  'AC-CODE-FIRST-ERROR-01',
],
minimumCoreToUnlockNext: 6,
```

임계값을 8로 올리지 않는다. 학생은 Anchor 3개를 반드시 완료하고 나머지 Practice 중 일부를 선택할 수 있어야 한다.

### 5.2 기존 early-access 학생 보호

이번 출판으로 gate가 `early-access`에서 `gated`로 전환된다. 이미 성단 1 문제를 시작하거나 완료한 학생을 갑자기 잠그지 않는다.

`getConstellationAccess()`에서 다음 규칙을 먼저 적용한다.

```text
현재 성단의 published 문제를 하나라도 완료한 학생
→ accessible: true
→ mode: 'grandfathered'
```

새로 진입하는 학생에게만 Anchor 3종 + Core 6/8을 적용한다. 별도 Firestore migration은 필요하지 않으며, 기존 `completedProblemIds`만 사용한다.

### 5.3 게이트 테스트

최소 다음 사례를 검증한다.

| 사례 | 결과 |
|---|---|
| Anchor 3종 + Core 6개 | 개방 |
| Core 8개지만 LOOP 미완료 | 잠김 |
| Anchor 3종 완료지만 Core 5개 | 잠김 |
| Anchor 3종 + Core 8개 | 개방 |
| 기존 성단 1 완료 기록 있음 | grandfathered 개방 |
| Branch 완료만 추가 | Core 개수에 포함하지 않음 |

## 6. 저작 검증기 개선

### 6.1 고정 개수 대신 집합 정합성

다음과 같은 검사를 사용하지 않는다.

```js
assert.ok(registeredProblemIds.length >= 19)
```

대신 다음 집합을 비교한다.

```text
published catalog problem IDs
== public kernel IDs
== private registered problem IDs
```

단, 명시적으로 개발 중인 prototype을 허용해야 한다면 별도 allowlist를 둔다. 숫자 하드코딩은 다음 Wave마다 수정해야 하므로 제거한다.

### 6.2 신규 필수 검증

- Public/Private `problemId`, version, entryFunction parity
- Catalog/Public prerequisite parity
- Catalog/Public lensId parity
- 모든 prerequisite가 더 작은 catalogOrder를 가짐
- 신규 개념·패턴의 canonical first problem이 가장 이른 참조 문제와 일치
- Official 및 alternative solution 통과
- intended wrong fixture가 지정 그룹에서 실패
- Understanding의 `expected`가 Callable 공개 응답에 없음
- Transfer `starterCode` 존재 및 함수 시그니처 일치
- Transfer 공식 풀이가 실제 격리 Judge 통과
- 세 문제의 full Callable lifecycle 통과

### 6.3 무한 루프 검증 비용 제한

Authoring validator에서 intended wrong fixture를 확인할 때 전체 200,000 step 예산을 매번 사용할 필요가 없다.

```js
evaluateBaseSubmission(problemId, version, fixture.code, {
  maxCumulativeSteps: 20_000,
})
```

공식 제출 경로의 200,000 step 상한은 유지한다. 낮은 예산은 저작 fixture 회귀 테스트에만 사용한다.

### 6.4 Worker 복구 테스트

브라우저 E2E 도구를 새로 도입하지 않는다. `createAlgorithmRuntimeAdapter()`에 선택적 `workerFactory`를 주입할 수 있게 만들어 다음을 fake worker로 검증한다.

1. 첫 Worker가 응답하지 않음
2. hard timeout 후 `terminate()` 호출
3. Worker 재생성
4. 직후 정상 코드 요청 성공

이 방식은 실제 브라우저 자동화보다 빠르고 CI 비용이 낮다. 실제 evaluator의 while step limit는 기존 client/server parity 테스트에서 별도로 검증한다.

## 7. 구현 순서

### Phase C0 — 공용 계약 보강

1. `StateTransitionLens`에 optional choice frame을 추가한다.
2. Lens 선택 증거 스키마를 기존 Explore evidence 안에 유지한다.
3. 저작 검증기에 Catalog/Public lens 및 prerequisite parity를 추가한다.
4. Worker adapter에 테스트용 `workerFactory` 주입점을 추가한다.

### Phase C1 — 학습 지원 등록

1. `pattern:procedure-decomposition`
2. `operator:comparison-bound`
3. `statement:while`

각 레지스트리 항목은 First Encounter 필수 필드를 완성한다. 새로운 UI는 만들지 않는다.

### Phase C2 — STEP-03

1. Public Kernel
2. Private Definition
3. 선택형 상태 전이 Explore
4. 수치형 Understanding 2문항
5. 다른 연산 순서의 Fresh Transfer

### Phase C3 — BOUND-05

1. 경계 반례 Observe
2. `<`/`<=` 선택 frame
3. 경계 그룹 중심 hidden tests
4. `<=`만 재사용하는 Fresh Transfer

### Phase C4 — WHILE-07

1. step=1 Base
2. while First Encounter
3. 종료 시점 상태 전이 Explore
4. 무한 루프·off-by-one fixture
5. 가변 step Fresh Transfer

### Phase C5 — Gate 전환 및 출판

1. requiredAnchors 3종 적용
2. grandfathered access 적용
3. 게이트 회귀 테스트
4. 신규 3개 catalog status를 `published`로 변경

모든 자동 검증이 통과하면 prototype이나 pilot 상태에 머물지 않고 즉시 공개한다.

## 8. 예상 파일 변경 범위

### 신규

```text
src/components/AlgorithmConstellation/shared/problems/ac_exp_step_03.js
src/components/AlgorithmConstellation/shared/problems/ac_exp_bound_05.js
src/components/AlgorithmConstellation/shared/problems/ac_exp_while_07.js
functions/algorithmConstellation/problems/ac_exp_step_03.private.cjs
functions/algorithmConstellation/problems/ac_exp_bound_05.private.cjs
functions/algorithmConstellation/problems/ac_exp_while_07.private.cjs
```

### 수정

```text
src/components/AlgorithmConstellation/client/modes/lenses/StateTransitionLens.jsx
src/components/AlgorithmConstellation/shared/problems/index.js
src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/shared/catalog/constellationRegistry.js
src/components/AlgorithmConstellation/runtime/algorithmRuntimeAdapter.js
functions/algorithmConstellation/problems/index.cjs
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-student-sandbox-resilience.mjs
scripts/test-server-orchestration-and-judge.mjs
```

새 dependency, 새 Firebase Callable, 새 collection은 추가하지 않는다.

## 9. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-student-sandbox-resilience.mjs
node scripts/test-server-orchestration-and-judge.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

## 10. Definition of Done

다음 조건이 모두 충족되어야 완료다.

1. STEP-03은 학생이 후보 중 누락 단계를 선택해야 Explore를 완료할 수 있다.
2. STEP-03과 BOUND-05의 문제·Starter에 정답 연산이 직접 노출되지 않는다.
3. BOUND-05는 `pos == limit` 반례를 독립적으로 평가한다.
4. WHILE-07은 이미 도착, 1회 이동, 여러 회 이동에서 정확히 종료한다.
5. WHILE 무한 루프가 client Worker와 server Judge 모두에서 제한되고 이후 실행이 복구된다.
6. 세 문제 모두 Base → Understanding → Transfer → Complete를 권위 Callable로 완주한다.
7. Public/Private/Catalog/Lens/Prerequisite 계약이 자동 검증된다.
8. 성단 1은 Anchor 3종 + Core 6/8에서 열리고 기존 진입 학생은 유지된다.
9. 기존 16개 문제의 판정·진도·전이 흐름이 회귀하지 않는다.
10. 전체 테스트, lint, build가 통과한 뒤 세 문제가 `published` 상태다.

## 11. 구현 AI 금지사항

- 세 문제마다 별도 Shell, CodeMode, TracePlayer, Judge를 만들지 않는다.
- 존재하지 않는 lensId를 Catalog나 Kernel에 등록하지 않는다.
- STEP Starter에 빠진 명령을 그대로 적지 않는다.
- BOUND 문제에서 “이하”와 `<=`를 동시에 보여주지 않는다.
- WHILE 정답 여부를 소스 문자열의 `while` 존재로 판정하지 않는다.
- `step=0`, `start>target` 같은 계약 밖 입력으로 Base 난도를 올리지 않는다.
- Transfer에서 아직 학습하지 않은 `>=` 같은 비교 도구를 몰래 요구하지 않는다.
- 무한 루프 fixture마다 프로덕션 전체 step 예산을 소진하지 않는다.
- 문제 수 증가에 맞춰 `16 → 19`처럼 테스트 상수를 계속 수정하지 않는다.
- 기존 early-access 학생의 성단 1 접근을 갑자기 회수하지 않는다.

이번 단계의 성공 기준은 단순히 문제 세 개를 추가하는 것이 아니다. **선택형 상태 전이 프레임, 집합 기반 출판 검증, 안정적인 게이트 전환**을 완성하여 다음 Core 문제들도 같은 계약으로 빠르게 출판할 수 있게 만드는 것이다.
