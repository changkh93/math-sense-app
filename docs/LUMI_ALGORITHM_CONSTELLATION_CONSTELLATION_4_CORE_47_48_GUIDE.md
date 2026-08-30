# LUMI 알고리즘 성단 — 성단 4 본 항로 Core 47·48 개발 가이드

> 범위: `AC-DICT-TWOSUM-47`, `AC-DICT-ONESHOT-48`
>
> 목표: 같은 “두 수의 합” 문제를 **뒤쪽에서 반복 확인하는 전략**과 **한 번 지나가며 기억하는 전략**으로 연속 경험하게 한다.
>
> 구현 원칙: 새 런타임·Lens·React 컴포넌트·Callable·Firestore 구조를 만들지 않는다. 기존 `state-transition` Lens, Set membership, `set.add`, slicing과 Public/Private Kernel 계약만 재사용한다.

---

## 1. 계획 평가와 핵심 결정

성단 4의 현재 학습 사다리는 다음과 같다.

```text
41 고유 항목 기록(Set)
42 포함 여부 확인
43 공통 항목을 Set에 기억
44 항목별 빈도표(Dictionary)
45 기록값 중 최댓값의 주인 선택
46 이름표별 상태 갱신
```

47·48은 자료구조 문법을 하나 더 늘리는 Wave가 아니다. 이미 배운 포함 여부와 기억 공간을 이용해 **탐색 횟수를 줄이는 이유**를 발견하는 Wave다.

```text
47 현재 캡슐과 짝이 될 값을 계산하고, 뒤쪽 목록에서 반복 확인한다.
48 지금까지 본 값을 Set에 기억하고, 각 캡슐을 한 번씩 지나가며 짝을 확인한다.
```

### 1.1 원안에서 수정할 부분

카탈로그 초안은 47을 `all pairs`, 48을 `dict lookup`으로 설명한다. 이를 그대로 구현하지 않는다.

1. 중첩 반복을 47에서 새로 가르치면, 61번의 제한된 완전탐색 First Encounter보다 먼저 미학습 구조가 등장한다.
2. 현재 R2 Dictionary는 안전하고 단순한 문자열 key 계약이다. 숫자 에너지를 Dictionary key로 사용하려면 숫자 key 의미와 직렬화 계약을 추가해야 한다.
3. 이 문제는 key→value 저장보다 “이미 본 값이 있는가?”만 필요하므로 Set이 더 알맞다.
4. AST 검사나 큰 입력 시간 제한으로 특정 풀이를 강제하면 대안 풀이를 부당하게 탈락시키고 Judge 비용도 커진다.

따라서 다음처럼 확정한다.

| 항목 | 최종 결정 |
| --- | --- |
| 47 탐색 방식 | 중첩 반복 대신 `needed in energies[i + 1:]`로 뒤쪽 반복 확인 |
| 48 기억 구조 | 숫자 값을 안전하게 저장할 수 있는 기존 Set 사용 |
| 기존 problemId | 진도 호환을 위해 그대로 유지 |
| Lens | 두 문제 모두 `state-transition` |
| 복잡도 강제 | AST 검사·대형 성능 테스트·전용 step budget 모두 사용하지 않음 |
| 전략 이해 증거 | 2★ 질문과 Trace 상태 변화로 확인 |
| 서버 비용 | 작은 결정적 테스트만 사용 |

`AC-DICT-*` ID는 이미 배포 전 카탈로그 계약에 포함된 안정 ID이므로 이름을 바꾸지 않는다. 대신 카탈로그의 `adaptationNotes`를 실제 전략과 맞춘다.

---

## 2. 학습 계약

### 2.1 공통 도메인

두 문제는 같은 행동 계약을 사용한다.

```text
입력: 정수 에너지 목록 energies, 목표 합 target
출력: 서로 다른 두 위치의 에너지를 더해 target을 만들 수 있으면 True, 아니면 False
```

도메인 제한:

```text
0 <= len(energies) <= 20
-50 <= energy <= 50
-100 <= target <= 100
```

음수와 0을 일부 테스트에 포함해 “큰 양수 두 개 찾기”로 오해하지 않게 한다. 동일한 값 두 개가 필요할 때는 실제로 캡슐도 두 개 있어야 한다.

```text
[5], target=10    → False
[5, 5], target=10 → True
```

### 2.2 두 전략의 차이

```text
47 반복 확인
현재 값 → 필요한 짝 계산 → 아직 보지 않은 뒤쪽 목록에서 확인

48 기억하며 확인
현재 값 → 필요한 짝 계산 → 지금까지 기억한 Set에서 확인 → 현재 값 기억
```

학생에게 `O(n²)`, `O(n)` 표기를 필수 용어로 요구하지 않는다. 다음 언어를 사용한다.

- 47: 목록이 길어지면 같은 뒤쪽 구간을 여러 번 다시 살핀다.
- 48: 각 캡슐을 한 번씩 지나가며 이전 값은 기억 공간에서 확인한다.

### 2.3 채점 정직성

1★와 3★는 반환 행동을 채점한다. 올바른 중첩 반복, suffix membership, Set 기억 방식은 모두 통과할 수 있다.

48의 “한 번 확인” 전략 이해는 2★에서 다음 증거로 확인한다.

- 필요한 짝을 먼저 계산한다.
- 현재 값을 기억하기 전에 필요한 짝이 과거 기억에 있는지 확인한다.
- 한 개뿐인 `[5]`를 두 번 사용하지 않는다.
- 매 단계가 끝난 뒤 기억 Set이 어떻게 변하는지 예측한다.

특정 코드 문자열, AST 모양, 실행 시간만으로 마스터리를 판정하지 않는다.

---

## 3. 선수 관계와 출판 순서

### 3.1 47번

```js
prerequisites: [
  'AC-DICT-STOCK-46',
  'AC-STR-REVERSE-01',
]
```

- 46 완료로 성단 4의 기록표 기초를 먼저 마친다.
- 36에서 배운 slicing을 재사용한다.
- 46의 선행 체인을 통해 목록 순회와 membership 기초도 이미 이수했다.

### 3.2 48번

```js
prerequisites: [
  'AC-DICT-TWOSUM-47',
  'AC-SET-INTERSECT-43',
]
```

- 47의 반복 확인 전략을 먼저 경험해야 전략 비교가 가능하다.
- 43에서 `set.add`를 학습한 뒤 기억 Set을 사용한다.

### 3.3 성단 개방 계약

47·48은 모두 Core다. 완성 후 성단 4는 `8/8 Core`가 된다.

기존 전역 정책은 유지한다.

```text
Core 5/8 → 성단 5 잠금
Core 6/8 + required anchor 41 → 성단 5 개방
Core 8/8 → 성단 4 본 항로 완전 정복 표시
```

47·48을 성단 5 개방의 추가 필수 조건으로 만들지 않는다. 기존에 개방한 학생의 진도를 다시 잠그면 안 된다.

---

## 4. 사고 패턴 레지스트리

수정 파일:

```text
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
```

### 4.1 47 — complement search

```js
'pattern:complement-search'
```

권장 표시명:

```text
목표에서 현재 값을 빼 필요한 짝 찾기
```

핵심 설명:

```text
두 수의 합을 바로 모두 계산하려 하지 않고,
target - current로 현재 값에 필요한 짝을 먼저 정한다.
```

### 4.2 48 — remember then query

```js
'pattern:remember-then-query'
```

권장 표시명:

```text
지나온 값을 기억하고 필요한 짝 확인하기
```

핵심 설명:

```text
현재 값과 짝이 되는 값이 과거 기억에 있는지 먼저 확인하고,
없으면 현재 값을 다음 단계를 위해 기억한다.
```

패턴 카드의 `tinyExample`, `syntaxExample`, `predictionCheck`에는 완성 코드 조각을 넣지 않는다. `def`, `for`, `if`, `return`, `.add(`를 직접 제시하지 않고 상태 변화 언어를 사용한다.

Python Concept Registry에는 새 항목을 추가하지 않는다.

---

## 5. AC-DICT-TWOSUM-47 — 목표 에너지의 두 캡슐

### 5.1 Public Kernel

신규 파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_twosum_47.js
```

핵심 계약:

```js
problemId: 'AC-DICT-TWOSUM-47'
problemVersion: 1
entryFunction: 'has_energy_pair'
routeRole: 'core'
learningRole: 'practice'
lensId: 'state-transition'
```

Python 개념:

```js
requires: [
  'builtin:list',
  'builtin:len',
  'builtin:range',
  'statement:for',
  'statement:if',
  'operator:membership-in',
  'syntax:slicing',
]
introduces: []
```

사고 패턴:

```js
requires: ['pattern:membership-query']
introduces: ['pattern:complement-search']
```

Evidence Recipe:

```js
primitives: [
  'container-scan',
  'container-membership',
  'decision',
  'scalar-sequence',
]
requiredClaims: ['COMPLEMENT_SEARCH_WITH_DISTINCT_POSITIONS']
```

### 5.2 공식 해법

```python
def has_energy_pair(energies, target):
    for i in range(len(energies)):
        needed = target - energies[i]
        if needed in energies[i + 1:]:
            return True
    return False
```

이 해법은 중첩 반복 문법을 새로 노출하지 않으면서, 현재 위치 뒤쪽만 확인해 같은 캡슐 재사용을 막는다.

### 5.3 Observe·Explore

관찰 예시:

```text
energies = [4, 1, 8, 6], target = 10
```

프레임:

1. 현재 4 → 필요한 짝 6 → 뒤쪽 `[1, 8, 6]`에 있음
2. 서로 다른 두 위치의 4와 6을 사용 가능
3. 결과 `True`

반례 프레임:

```text
energies = [5], target = 10
```

현재 값 5와 필요한 값 5가 같아도 뒤쪽에 두 번째 5가 없으므로 `False`다.

### 5.4 Public Tests

```js
[
  { inputs: { energies: [2, 7, 11], target: 9 }, expected: true },
  { inputs: { energies: [1, 2, 4], target: 8 }, expected: false },
]
```

### 5.5 2★ 이해 확인

반드시 확인할 내용:

1. `needed = target - current`의 의미
2. 뒤쪽 구간만 확인하는 이유
3. `[5]`, target 10이 False인 이유
4. 멀리 떨어진 두 값도 짝이 될 수 있음

정답 코드나 slicing 표현을 질문에 직접 노출하지 않는다.

### 5.6 Fresh Transfer

```text
title: 제한 무게를 맞추는 두 화물
entryFunction: has_cargo_pair
inputs: weights, capacity
output: 서로 다른 두 화물의 무게 합이 capacity이면 bool
```

Public Preview 2건과 Private Master 5건은 입력이 겹치지 않아야 한다.

### 5.7 Private Definition

신규 파일:

```text
functions/algorithmConstellation/problems/ac_dict_twosum_47.private.cjs
```

Hidden Test 그룹:

| group | 입력 의도 |
| --- | --- |
| `separated-pair` | 서로 떨어진 위치에서만 짝 성립 |
| `duplicate-values` | `[5, 5]`, target 10은 True |
| `single-self-reuse` | `[5]`, target 10은 False |
| `later-pair` | 첫 항목과 무관한 뒤쪽 두 항목이 정답 |
| `zero-and-negative` | 0·음수 포함 |
| `no-pair` | 가능한 짝 없음 |

Intended Wrong Fixtures:

| id | 오류 | expectedFailingGroup |
| --- | --- | --- |
| `PAIR-REUSES-SAME-CAPSULE` | 전체 목록에서 필요한 값을 찾아 현재 위치를 재사용 | `single-self-reuse` |
| `PAIR-ADJACENT-ONLY` | 이웃한 두 캡슐만 검사 | `separated-pair` |
| `PAIR-FIRST-CAPSULE-ONLY` | 첫 캡슐과의 짝만 검사 | `later-pair` |
| `PAIR-RETURNS-SUM` | bool 대신 계산된 합 반환 | `duplicate-values` |

---

## 6. AC-DICT-ONESHOT-48 — 한 번만 확인하는 에너지 탐지기

### 6.1 Public Kernel

신규 파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_oneshot_48.js
```

핵심 계약:

```js
problemId: 'AC-DICT-ONESHOT-48'
problemVersion: 1
entryFunction: 'detect_energy_pair_once'
routeRole: 'core'
learningRole: 'anchor'
lensId: 'state-transition'
```

Python 개념:

```js
requires: [
  'builtin:list',
  'builtin:set',
  'method:set_add',
  'statement:for',
  'statement:if',
  'operator:membership-in',
]
introduces: []
```

사고 패턴:

```js
requires: ['pattern:complement-search']
introduces: ['pattern:remember-then-query']
```

Evidence Recipe:

```js
primitives: [
  'container-scan',
  'container-membership',
  'decision',
  'scalar-sequence',
]
requiredClaims: ['ONE_PASS_REMEMBER_THEN_QUERY']
```

### 6.2 공식 해법

```python
def detect_energy_pair_once(energies, target):
    seen = set()
    for energy in energies:
        needed = target - energy
        if needed in seen:
            return True
        seen.add(energy)
    return False
```

검사 후 기억 순서가 핵심이다. 현재 값을 먼저 기억하면 `[5]`, target 10에서 같은 캡슐을 두 번 사용했다고 잘못 판단할 수 있다.

### 6.3 Observe·Explore

관찰 예시:

```text
energies = [3, 8, 2, 7], target = 9
```

상태 프레임:

| 현재 값 | 필요한 짝 | 확인 전 seen | 결과 | 확인 후 seen |
| ---: | ---: | --- | --- | --- |
| 3 | 6 | `{}` | 없음 | `{3}` |
| 8 | 1 | `{3}` | 없음 | `{3, 8}` |
| 2 | 7 | `{3, 8}` | 없음 | `{3, 8, 2}` |
| 7 | 2 | `{3, 8, 2}` | 있음 | True 반환 |

47의 동일 입력 프레임과 나란히 설명하되 새 비교 UI는 만들지 않는다. Explore 설명 카드에서 “뒤쪽을 다시 확인”과 “지나온 값을 기억”을 문장으로 비교한다.

### 6.4 Public Tests

```js
[
  { inputs: { energies: [3, 8, 2, 7], target: 9 }, expected: true },
  { inputs: { energies: [6, 1, 4], target: 20 }, expected: false },
]
```

### 6.5 2★ 이해 확인

필수 질문:

1. 현재 값을 기억하기 전에 필요한 짝을 확인하는 이유
2. `seen`에는 미래 값이 아니라 이미 지나온 값만 들어간다는 점
3. `[5]`, target 10에서 확인 순서를 뒤집으면 생기는 오류
4. 각 캡슐을 지나간 뒤 `seen` 상태 예측
5. 47과 비교해 목록 뒤쪽을 반복해서 다시 살피지 않는다는 점

### 6.6 Fresh Transfer

```text
title: 합동 구조 시간을 만드는 두 신호
entryFunction: can_combine_rescue_times_once
inputs: times, required_time
output: 서로 다른 두 신호 시간의 합이 required_time이면 bool
```

도메인은 같되 이야기와 입력값은 Base 및 Public Preview와 겹치지 않게 한다.

### 6.7 Private Definition

신규 파일:

```text
functions/algorithmConstellation/problems/ac_dict_oneshot_48.private.cjs
```

Hidden Test 그룹:

| group | 입력 의도 |
| --- | --- |
| `late-complement` | 필요한 짝이 여러 단계 전 seen에 존재 |
| `duplicate-values` | 두 번째 동일 값에서 성공 |
| `single-self-reuse` | 하나뿐인 값을 재사용하면 안 됨 |
| `reset-memory` | 여러 단계를 기억해야 성공 |
| `zero-and-negative` | 0·음수 포함 |
| `no-pair` | 끝까지 짝 없음 |

Intended Wrong Fixtures:

| id | 오류 | expectedFailingGroup |
| --- | --- | --- |
| `ONESHOT-ADDS-BEFORE-CHECK` | 현재 값을 먼저 기억해 같은 위치 재사용 | `single-self-reuse` |
| `ONESHOT-NEVER-REMEMBERS` | 확인만 하고 현재 값을 저장하지 않음 | `late-complement` |
| `ONESHOT-RESETS-SEEN` | 매 반복마다 기억 공간을 비움 | `reset-memory` |
| `ONESHOT-LAST-VALUE-ONLY` | 직전 값 하나만 기억 | `late-complement` |

---

## 7. 등록과 카탈로그 변경

수정 파일:

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
```

카탈로그 최종값:

```js
// 47
status: 'published'
prerequisites: ['AC-DICT-STOCK-46', 'AC-STR-REVERSE-01']
lensId: 'state-transition'
provenance.adaptationNotes: '필요한 짝을 계산하고 뒤쪽 구간에서 반복 확인'

// 48
status: 'published'
prerequisites: ['AC-DICT-TWOSUM-47', 'AC-SET-INTERSECT-43']
lensId: 'state-transition'
provenance.adaptationNotes: 'Set에 지나온 값을 기억하는 단일 순회 전략'
```

`sourcePlatform: 'PAI'`, `rightsStatus: 'reference-only'`는 유지하되 원문의 제목·문장·예제·테스트를 복제하지 않는다.

완료 후 등록 집합:

```text
Published = Public = Private = 52개
```

---

## 8. 테스트 계획

### 8.1 저작 무결성

수정:

```text
scripts/test-authoring-integrity-contracts.mjs
```

검증:

- 47·48 problemId/version/entryFunction
- Public/Private Understanding 및 Transfer 계약 동기화
- Public Preview와 Private Master 입력 중복 0건
- 두 신규 사고 패턴 등록과 canonical first problem
- 설명 카드 Syntax Leak 0건
- `Published = Public = Private = 52`

### 8.2 독립 Oracle

테스트 Oracle은 공식 풀이를 복사하지 않고 JS의 작은 이중 반복으로 작성한다.

```js
function hasDistinctPair(values, target) {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] + values[j] === target) return true
    }
  }
  return false
}
```

이 Oracle로 Base·Hidden·Transfer의 모든 expected를 검증한다.

### 8.3 커리큘럼과 게이트

수정:

```text
scripts/test-gate0-curriculum-contracts.mjs
```

`Test 16` 검증:

- 47은 46과 36을 완료하기 전 잠김
- 48은 47과 43을 완료하기 전 잠김
- 성단 4 Published Core가 정확히 8개
- 기존 `Core 6/8 + Anchor 41` 성단 5 개방 계약 유지
- 47·48 미완료 학생의 이미 열린 성단 5를 다시 잠그지 않음

### 8.4 서버 수명주기

수정:

```text
scripts/test-server-orchestration-and-judge.mjs
```

검증:

- 두 공식 해법 Base 1★ 통과
- Understanding 2★ 통과
- Fresh Transfer 3★ 통과
- 대표 오답 fixture가 지정 실패 그룹에서 기각
- 보상 멱등성과 진도 기록 기존 계약 유지

### 8.5 런타임 패리티

기존 전체 자동 순회를 재사용한다.

```text
scripts/test-client-server-runtime-parity.mjs
```

추가 런타임 기능이 없으므로 별도 Matrix를 만들지 않는다. 52개 전체 공식 해법과 오답 fixture 패리티에 자동 포함되면 충분하다.

### 8.6 비용 보호

- Base/Hidden 각각 작은 입력만 사용한다.
- 입력 길이는 최대 20으로 제한한다.
- 성능을 증명하기 위한 수백·수천 길이 테스트를 만들지 않는다.
- AST 분석, wall-clock 판정, 문제별 step budget을 추가하지 않는다.
- Firestore 읽기·쓰기와 Callable 종류를 늘리지 않는다.

---

## 9. 권장 구현 순서

```text
Gate A — 사고 패턴 2종 등록
  ↓
Gate B — 47 Public/Private + 독립 Oracle
  ↓
Gate C — 48 Public/Private + 검사/기억 순서 반례
  ↓
Gate D — Public/Private index 및 Catalog published 동기화
  ↓
Gate E — 저작·게이트·서버 수명주기 테스트
  ↓
Gate F — 전체 테스트·ESLint·프로덕션 빌드
```

한 Gate가 실패하면 다음 Gate로 넘어가지 않는다. 다만 접근성 별도 심사, 학생 파일럿, 수동 출판 승인 증거는 이번 Wave의 차단 조건으로 사용하지 않는다.

---

## 10. 완료 조건

```text
[ ] 신규 런타임/API/UI/Firestore 구조 0건
[ ] 47은 미학습 중첩 반복 없이 suffix membership로 설명
[ ] 48은 기존 Set과 set.add만 사용
[ ] 같은 캡슐 재사용 반례를 두 문제 모두 검증
[ ] 48의 확인 → 기억 순서를 2★에서 검증
[ ] AST·성능 강제 없이 행동 기반 대안 풀이 허용
[ ] Base/Public/Hidden/Transfer 기대값 독립 Oracle 일치
[ ] Public Preview와 Private Master 입력 중복 0건
[ ] 47·48 선수 조건 잠금 계약 통과
[ ] 기존 성단 5 개방 정책 유지
[ ] Published = Public = Private = 52
[ ] npm run test:algorithm-constellation 통과
[ ] ESLint 0 errors / 0 warnings
[ ] npm run build 성공
```

---

## 11. 다음 Wave

이 Gate를 통과한 뒤 성단 4의 선택 항로를 별도 Wave로 구현한다.

```text
49 같은 문자로 된 통신 패킷 — 두 빈도표의 구조적 동치
50 빈도표 오류 찾기 — 초기화·증가·마지막 항목 누락 Code Review
```

49·50은 Branch이므로 성단 5 개방 수치에 영향을 주지 않는다. 47·48과 동시에 구현하지 않아 검토 범위와 실패 원인을 작게 유지한다.
