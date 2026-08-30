# LUMI 알고리즘 성단 — 성단 4 Anchor 41 · Core 42~43 개발 가이드

> 범위: `AC-SET-UNIQUE-01` 계약 보정, `AC-SET-MEMBERSHIP-42`·`AC-SET-INTERSECT-43` 신규 구현
>
> 목표: 중복 제거 → 포함 여부 → 공통 항목 구성으로 이어지는 첫 번째 Set 학습 사다리를 완결한다.
>
> 구현 원칙: 기존 제한형 Python의 `set`, `len`, `in`, `.add()`만 사용하며 새 Lens·API·Firestore·runtime 기능은 만들지 않는다.

---

## 1. 계획 평가와 이번 Wave 범위

성단 4는 41~43의 Set 영역과 44~50의 Dictionary 영역으로 나뉜다. 한 번에 10문제를 구현하면 다음 문제가 생긴다.

- 학생이 Set을 충분히 경험하기 전에 Dictionary가 등장한다.
- `dict` 생성·키 갱신·누락 키 처리·순회 계약을 한 Wave에서 동시에 확정해야 한다.
- 기존 41번의 불완전한 계약이 이후 문제에 그대로 전파된다.

따라서 이번 Wave는 **41 보정 + 42·43 신규 구현**으로 제한한다. 44의 Dictionary Anchor는 다음 Wave에서 별도 설계한다.

### 현재 41번에서 반드시 고칠 문제

`AC-SET-UNIQUE-01`은 이미 출판됐지만 초기 프로토타입 계약에 머물러 있다.

1. `set-frequency-lens`는 실제 Lens Registry에 존재하지 않아 Condition Lens로 잘못 fallback된다.
2. Public Kernel에 2★ 이해 확인과 Preview Transfer가 없다.
3. `len()`을 공식 해법과 이해 확인에서 사용하지만 Concept Registry에 등록되어 있지 않다.
4. `.add()`를 41에서 소개하지만 공식 핵심 해법에는 필요하지 않아 한 문제에서 새 개념이 과도하게 늘어난다.
5. Public/Private의 현대 저작 계약과 Syntax Leak·Transfer 격리 검사가 적용되지 않는다.

41의 ID와 `problemVersion: 1`은 유지한다. 함수 계약도 바꾸지 않아 기존 진도와 완료 기록을 보존한다.

### 승인 판단

- 41 Public/Private 현대화: 필수
- 42·43 신규 구현: 승인
- `builtin:len`, `operator:membership-in` First Encounter 등록: 승인
- `method:set_add` 최초 문제를 43으로 이동: 승인
- 신규 사고 패턴 3종: 승인
- 신규 Set 전용 JSX Lens: 불승인
- Dictionary runtime/개념 추가: 이번 Wave에서 제외
- 학생 파일럿·접근성·별도 출판 심사: 구현 Gate에서 제외

---

## 2. 최종 학습 사다리

```text
41 중복된 목록을 집합으로 바꾸고 서로 다른 종류 수 측정
   새 도구: set(), len()
   사고: 중복 제거 후 측정

41 → 42 한 항목이 명단에 포함되어 있는지 True/False 판정
        새 도구: in
        사고: 포함 여부 질의

41 + 42 → 43 한 기지의 항목을 보며 다른 기지에도 있는 항목만 집합에 기록
             새 도구: set.add()
             사고: membership로 교집합 구성
```

Catalog 선수 조건은 다음으로 확정한다.

```js
// 41: 기존 계약 유지
prerequisites: ['AC-SEQ-005']

// 42
prerequisites: ['AC-SET-UNIQUE-01']

// 43: 42의 membership를 실제로 사용하므로 기존 초안에서 보강
prerequisites: ['AC-SET-MEMBERSHIP-42']
```

학생이 학습하지 않은 개념은 이미 안다고 가정하지 않는다.

---

## 3. Concept Registry 정합성

### 3.1 `builtin:len` 신규 등록

```text
conceptId: builtin:len
표시명: len() — 항목 개수 재기
canonicalFirstProblemId: AC-SET-UNIQUE-01
```

First Encounter는 Set에 앞서 알지 않아도 이해되도록 목록 예시를 사용한다.

```text
why: 목록·문자열·집합 안에 항목이 몇 개 있는지 숫자로 알려줘요.
tinyExample: len(["A", "B", "C"]) → 3
prediction: len([5, 5, 9, 1])은? → 4
```

`len()`은 runtime에 이미 존재하므로 evaluator 변경은 하지 않는다.

### 3.2 `operator:membership-in` 신규 등록

```text
conceptId: operator:membership-in
표시명: in — 안에 들어 있는지 확인하기
canonicalFirstProblemId: AC-SET-MEMBERSHIP-42
```

```text
why: 찾는 값이 목록이나 집합 안에 있으면 True, 없으면 False가 돼요.
tinyExample: "B" in {"A", "B"} → True
prediction: "C" in {"A", "B"}는? → False
```

이번 Wave에서는 `not in`을 별도 신규 개념으로 요구하지 않는다. 대안 풀이로 제출되면 행동 채점상 허용할 수 있지만 Starter와 공식 해법의 필수 도구로 만들지 않는다.

### 3.3 `.add()` 최초 문제 이동

기존 `method:set_add.canonicalFirstProblemId`를 다음처럼 변경한다.

```text
기존: AC-SET-UNIQUE-01
변경: AC-SET-INTERSECT-43
```

41의 `pythonConcepts.introduces`에서는 `method:set_add`를 제거하고, 43에서 소개한다. `.add()` 카드의 예측 문항은 41에서 배운 `len()`을 사용할 수 있다.

---

## 4. 사고 패턴 Registry

### 4.1 41 — 중복 제거 후 측정

```text
patternId: pattern:deduplicate-then-measure
canonicalFirstProblemId: AC-SET-UNIQUE-01
표시명: 겹친 항목을 하나로 모은 뒤 재기
```

작은 예시는 코드가 아니라 다음 상태 변화로 표현한다.

```text
[철, 철, 얼음, 철] → {철, 얼음} → 서로 다른 종류 2
```

### 4.2 42 — 포함 여부 질의

```text
patternId: pattern:membership-query
canonicalFirstProblemId: AC-SET-MEMBERSHIP-42
표시명: 기록 안에 찾는 항목이 있는지 묻기
```

### 4.3 43 — 포함 여부로 공통 집합 구성

```text
patternId: pattern:intersection-by-membership
canonicalFirstProblemId: AC-SET-INTERSECT-43
표시명: 다른 목록에도 있는 항목만 공통 기록에 추가하기
```

Pattern Card의 `tinyExample`과 `syntaxExample`에는 현재 문제의 완성 `for/if/return` 해법을 넣지 않는다. 관찰 → 구분 → 상태 갱신 언어만 사용한다.

---

## 5. 공통 구현 불변조건

- `createCapabilityPrototypeKernel` 재사용
- 41의 ID, 함수명, 버전, 기존 완료 이력 보존
- 41~43 모두 `lensId: 'state-transition'`
- Public에는 공개 테스트와 Preview Transfer만 포함
- Private에 공식·대안 해법, 오답 Fixture, Hidden/Transfer Master Set 저장
- Public/Private의 2★ 및 학생 공개 Transfer 메타데이터 동기화
- Public Base와 Hidden 입력 중복 0건
- Preview Transfer와 Authoritative Transfer 입력 중복 0건
- 행동 결과로 채점하고 특정 AST 또는 `set()` 사용을 강제하지 않음
- 학생 안내 영역에 완성 코드 조각 노출 금지
- 문제별 Hidden 4~6개, Transfer Master 3~4개
- Base/Transfer 공식 해법 각각 누적 20,000 step 이내
- 신규 React 컴포넌트, API, Firestore, Worker/runtime 변경 0건

학생 공개 Transfer 동기화 필드:

```text
transferChallengeId, title, description, contextCard,
thoughtCheck, entryFunction, starterCode
```

분리 필드:

```text
Public Preview testCases
Private Authoritative testCases + officialSolutionCode
```

---

## 6. AC-SET-UNIQUE-01 — 서로 다른 광물은 몇 종?

### 6.1 보존 계약

```js
problemId: 'AC-SET-UNIQUE-01'
problemVersion: 1
entryFunction: 'count_unique_minerals'
routeRole: 'core'
learningRole: 'anchor'
prerequisites: ['AC-SEQ-005']
lensId: 'state-transition'
```

입력·출력:

```text
minerals: 길이 0~20의 짧은 문자열 목록
return: 서로 다른 문자열의 개수
```

기존 `count_unique_minerals(minerals)` 행동 계약과 문제 ID는 변경하지 않는다.

### 6.2 개념과 사고 패턴

```js
pythonConcepts: {
  requires: ['builtin:list'],
  introduces: ['builtin:set', 'builtin:len'],
}

thinkingPatterns: {
  requires: [],
  introduces: ['pattern:deduplicate-then-measure'],
}
```

### 6.3 Observe·Explore

Observe:

```text
[철, 철, 얼음, 철, 수정]에서 서로 다른 종류는 몇 개인가?
```

Explore는 `state-transition` 프레임을 사용한다.

| 장면 | 도착 광물 | 집합 상태 | 종류 수 |
|---|---|---|---:|
| 시작 | - | `[]` | 0 |
| 1 | 철 | `[철]` | 1 |
| 2 | 철 | `[철]` | 1 |
| 3 | 얼음 | `[철, 얼음]` | 2 |
| 4 | 수정 | `[철, 얼음, 수정]` | 3 |

Kernel 프레임 데이터에서는 실제 Set 객체 대신 직렬화 가능한 배열로 집합 상태를 표현한다.

### 6.4 Starter와 Private 해법

Starter:

```python
def count_unique_minerals(minerals):
    # 겹친 광물 이름을 하나로 모은 뒤 종류 수를 반환하세요.
    pass
```

공식 해법:

```python
def count_unique_minerals(minerals):
    kinds = set(minerals)
    return len(kinds)
```

대안 해법은 동일한 학습 도구 안에서만 둔다.

```python
def count_unique_minerals(minerals):
    unique_minerals = set(minerals)
    return len(unique_minerals)
```

41의 허용 해법에 `.add()`, `in`, Dictionary를 넣지 않는다.

### 6.5 평가

Public:

- `['철', '철', '얼음', '수정'] → 3`
- `['금', '금', '금'] → 1`
- `[] → 0`

Hidden 그룹:

- `mixed-duplicates`
- `all-distinct`
- `single-item`
- `empty-list`
- `duplicates-separated`

오답 Fixture:

- `SET-RETURNS-TOTAL-LENGTH` → `mixed-duplicates`
- `SET-ALWAYS-ONE` → `all-distinct`
- `SET-DROPS-LAST-ITEM` → `duplicates-separated`

### 6.6 2★ 이해 확인

1. 같은 광물을 집합에 여러 번 넣어도 종류 수가 늘지 않는 이유
2. 원래 목록 길이와 서로 다른 종류 수의 차이
3. 빈 목록의 서로 다른 종류 수가 0인 이유

질문에는 `len(set(...))` 정답 표현을 직접 쓰지 않는다.

### 6.7 Fresh Transfer

```text
entryFunction: count_unique_planets
과제: 방문한 행성 코드 목록에서 서로 다른 행성 수 반환
```

Public Preview와 Private Master 입력을 분리하고 빈 목록도 Authoritative 영역에서 확인한다.

---

## 7. AC-SET-MEMBERSHIP-42 — 승선 명단 확인

### 7.1 계약

```js
problemId: 'AC-SET-MEMBERSHIP-42'
entryFunction: 'is_passenger_listed'
routeRole: 'core'
learningRole: 'practice'
prerequisites: ['AC-SET-UNIQUE-01']
lensId: 'state-transition'
```

입력·출력:

```text
passenger: 찾을 승객 코드 문자열
manifest: 길이 0~20의 승객 코드 문자열 목록
return: 명단에 있으면 True, 없으면 False
```

중복된 이름은 결과를 바꾸지 않는다.

### 7.2 개념과 사고 패턴

```js
pythonConcepts: {
  requires: ['builtin:list', 'builtin:set', 'statement:if'],
  introduces: ['operator:membership-in'],
}

thinkingPatterns: {
  requires: ['pattern:deduplicate-then-measure'],
  introduces: ['pattern:membership-query'],
}
```

41 패턴을 `requires`로 두되 “개수를 재기”를 다시 요구하지 않는다. 핵심은 집합 상태에 질문을 던져 Boolean으로 판정하는 것이다.

### 7.3 Observe·Explore

Observe는 다음 두 명단을 비교한다.

```text
manifest = [루미, 노바, 루미]
찾는 승객 = 노바 → 있음
찾는 승객 = 솔 → 없음
```

Explore 프레임:

```text
명단을 고유 이름 상태로 정리
→ 찾는 이름을 제시
→ 포함 여부 True/False 결정
```

완성 `in` 식은 First Encounter 전에 Explore에 노출하지 않는다.

### 7.4 Starter와 Private 해법

```python
def is_passenger_listed(passenger, manifest):
    # 승객이 명단에 있는지 True 또는 False로 반환하세요.
    pass
```

공식 해법은 Trace에서 객관적인 분기 증거가 남도록 작성한다.

```python
def is_passenger_listed(passenger, manifest):
    known_passengers = set(manifest)
    if passenger in known_passengers:
        return True
    return False
```

다음과 같은 행동 동치 해법도 인정한다.

```python
def is_passenger_listed(passenger, manifest):
    return passenger in manifest
```

### 7.5 평가

Public:

- `노바, [루미, 노바, 루미] → True`
- `솔, [루미, 노바] → False`
- `루미, [] → False`

Hidden 그룹:

- `present-first`
- `present-last`
- `absent`
- `empty-manifest`
- `duplicate-does-not-change-result`

오답 Fixture:

- `MEMBERSHIP-FIRST-ONLY` → `present-last`
- `MEMBERSHIP-INVERTED` → `present-first`
- `MEMBERSHIP-NONEMPTY-MEANS-TRUE` → `absent`

### 7.6 2★ 이해 확인

1. 같은 승객이 여러 번 기록되어도 포함 여부가 True 하나인 이유
2. 빈 명단에서는 어떤 승객을 찾아도 False인 이유
3. 개수를 세는 문제와 포함 여부를 묻는 문제의 차이

### 7.7 Fresh Transfer

```text
entryFunction: is_part_available
과제: 수리 부품 코드가 창고 목록에 있는지 판정
```

Base의 승객 이름을 단순 치환하지 않고 “명단 확인 → 재고 확인”으로 도메인을 이동한다.

---

## 8. AC-SET-INTERSECT-43 — 두 기지가 공통으로 가진 부품

### 8.1 계약

Set 자체를 반환하면 현재 Judge에서 Set과 배열의 순서·표현 계약이 불필요하게 복잡해진다. 따라서 **서로 다른 공통 부품의 개수**를 반환한다.

```js
problemId: 'AC-SET-INTERSECT-43'
entryFunction: 'count_common_parts'
routeRole: 'core'
learningRole: 'practice'
prerequisites: ['AC-SET-MEMBERSHIP-42']
lensId: 'state-transition'
```

입력·출력:

```text
base_a, base_b: 각각 길이 0~15의 부품 코드 문자열 목록
return: 두 목록에 모두 존재하는 서로 다른 부품 종류 수
```

예:

```text
base_a = [A, A, B, C]
base_b = [A, C, D]
return 2  # A, C
```

### 8.2 개념과 사고 패턴

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'builtin:set',
    'builtin:len',
    'statement:for',
    'statement:if',
    'operator:membership-in',
  ],
  introduces: ['method:set_add'],
}

thinkingPatterns: {
  requires: ['pattern:membership-query'],
  introduces: ['pattern:intersection-by-membership'],
}
```

### 8.3 Observe·Explore

두 기지의 부품 카드를 양쪽에 배치한다. 학생은 A 기지의 카드를 하나씩 보며 B 기지에도 있는지 판단하고 공통 보관함 상태를 갱신한다.

| 확인 항목 | B에도 있음 | 공통 보관함 |
|---|---|---|
| A | 예 | `[A]` |
| A | 예 | `[A]` |
| B | 아니오 | `[A]` |
| C | 예 | `[A, C]` |

두 번째 A가 공통 보관함 크기를 늘리지 않는 장면이 핵심이다.

### 8.4 Starter와 Private 해법

```python
def count_common_parts(base_a, base_b):
    # 두 기지에 모두 있는 서로 다른 부품 종류 수를 반환하세요.
    pass
```

공식 해법:

```python
def count_common_parts(base_a, base_b):
    common = set()
    for part in base_a:
        if part in base_b:
            common.add(part)
    return len(common)
```

대안 해법은 `base_b`를 순회하며 `base_a`에 포함되는지 확인하는 대칭 풀이를 둔다. Set 교집합 연산자 `&`는 아직 소개하지 않는다.

### 8.5 평가

Public:

- `[A, A, B, C], [A, C, D] → 2`
- `[X, Y], [A, B] → 0`
- `[], [A] → 0`

Hidden 그룹:

- `duplicate-common-item`
- `all-common`
- `no-common`
- `one-side-empty`
- `order-independent-count`

오답 Fixture:

- `INTERSECTION-COUNTS-DUPLICATES` → `duplicate-common-item`
- `INTERSECTION-USES-UNION` → `no-common`
- `INTERSECTION-FIRST-MATCH-ONLY` → `all-common`
- `INTERSECTION-SAME-POSITION-ONLY` → `order-independent-count`

### 8.6 2★ 이해 확인

1. 공통 부품은 반드시 두 기지 모두에 있어야 하는 이유
2. A가 두 번 나와도 공통 종류 수는 한 번만 증가하는 이유
3. 두 입력의 순서를 바꿔도 공통 종류 수가 같은 이유

### 8.7 Fresh Transfer

```text
entryFunction: count_shared_badges
과제: 두 탐사팀이 모두 보유한 서로 다른 배지 종류 수 반환
```

문자열 목록이라는 표현은 유지하되 부품 재고에서 학생 성취 배지로 의미 영역을 이동한다.

---

## 9. 파일별 작업 목록

### 수정

```text
src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
src/components/AlgorithmConstellation/shared/problems/ac_set_unique_01.js
functions/algorithmConstellation/problems/ac_set_unique_01.private.cjs
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

### 신규

```text
src/components/AlgorithmConstellation/shared/problems/ac_set_membership_42.js
src/components/AlgorithmConstellation/shared/problems/ac_set_intersect_43.js
functions/algorithmConstellation/problems/ac_set_membership_42.private.cjs
functions/algorithmConstellation/problems/ac_set_intersect_43.private.cjs
```

### 수정하지 않을 영역

```text
src/components/AlgorithmConstellation/runtime/**
functions/algorithmConstellation/sharedPythonEvaluatorCore.cjs
src/components/AlgorithmConstellation/client/modes/**
Gateway / Callable / Progress Ledger
firestore.rules
```

---

## 10. 테스트 설계

### 10.1 저작·등록 무결성

- Published/Public/Private 집합이 정확히 47개로 일치
- 41 ID·version·entryFunction 보존
- 41~43 Lens가 모두 `state-transition`
- Public에 Hidden·Private 공식 해법 없음
- Public/Private 2★ 및 공개 Transfer 메타데이터 동기화
- Preview/Authoritative 입력 중복 0건
- 공식·대안 해법 통과, 모든 오답 Fixture가 지정 그룹에서 실패
- Pattern Card·Observe·Explore·평가 안내에 완성 해법 Syntax Leak 없음

### 10.2 개념 순서

- `builtin:set` 최초 참조 41
- `builtin:len` 최초 참조 41
- `operator:membership-in` 최초 참조 42
- `method:set_add` 최초 참조 43
- 41은 `.add()` 또는 `in`을 요구하지 않음
- 42는 `.add()`를 요구하지 않음
- 43에서 처음 `.add()` First Encounter가 표시됨

### 10.3 독립 기대값 Oracle

- 41: `new Set(minerals).size`
- 42: `manifest.includes(passenger)`
- 43: `new Set(baseA.filter(x => baseB.includes(x))).size`

테스트 데이터의 `expected`를 위 Oracle로 다시 검증한다.

### 10.4 커리큘럼 게이트

- 42는 41을 1★ 이상 완료해야 열림
- 43은 42를 1★ 이상 완료해야 열림
- 성단 4에는 41~43 Core 3개만 published
- Core 3/8 상태에서 성단 5는 잠김
- 기존 성단 4 진입 조건은 회귀하지 않음
- 41의 기존 완료자는 보정 후에도 완료 상태 유지

### 10.5 서버·패리티

42·43 각각 긍정 3-Star 수명주기 1회와 대표 오답 1개만 서버 경로에서 검증한다. 41은 기존 프로토타입 회귀와 새 Public/Private 계약만 검사한다.

기존 패리티 스크립트가 모든 `PUBLIC_KERNELS`를 동적으로 순회하므로 별도의 47개 하드코딩 목록은 추가하지 않는다.

---

## 11. 구현 순서

1. 현재 runtime에서 41~43 공식 해법 표적 실행 확인
2. Concept Registry에 `builtin:len`, `operator:membership-in` 추가
3. `method:set_add` 최초 문제를 43으로 이동
4. Pattern Registry 3종 추가
5. 41 Public/Private를 version 1 상태로 보정
6. 41 저작·기존 완료 호환성 표적 테스트
7. 42 Public/Private 구현 및 표적 테스트
8. 43 Public/Private 구현 및 표적 테스트
9. Public/Private index에 42·43 등록
10. Catalog 41 Lens 보정, 43 선수 조건 보강
11. Published/Public/Private 임시 동등성 확인
12. 42·43 status를 마지막에 `published`로 전환
13. 게이트·서버·패리티 전체 검증
14. ESLint와 프로덕션 빌드

41은 이미 출판된 문제이므로 개발 중 임시 `draft`로 되돌리지 않는다. 수정 브랜치에서 Public/Private 계약을 함께 완성한 뒤 배포한다.

---

## 12. 비용·개발 효율 기준

| 항목 | 허용 증가 |
|---|---:|
| Cloud Functions 종류 | 0 |
| Firestore 컬렉션/문서 | 0 |
| 실시간 Listener | 0 |
| Worker/runtime 기능 | 0 |
| React/Lens 컴포넌트 | 0 |
| Python 개념 Registry | 2 신규 + 1 최초 위치 이동 |
| 사고 패턴 Registry | 3 |
| Public Kernel | 2 신규 + 1 보정 |
| Private Definition | 2 신규 + 1 보정 |

Set 전용 시각화 컴포넌트를 만드는 대신 `state-transition` 데이터 프레임으로 집합 상태를 배열처럼 보여준다. 이 결정으로 문제별 UI 개발과 회귀 비용을 제거한다.

---

## 13. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation scripts/test-authoring-integrity-contracts.mjs scripts/test-gate0-curriculum-contracts.mjs
npm run build
```

표적 테스트가 통과하기 전에 전체 스위트를 반복 실행하지 않는다.

---

## 14. 완료 조건

### Gate C4-A41 — Set Anchor 복구

- [ ] 41 ID·version·함수 계약 보존
- [ ] 존재하지 않는 Lens 제거
- [ ] `set()`과 `len()` First Encounter 제공
- [ ] 2★·Fresh Transfer Public/Private 계약 완결
- [ ] 기존 완료 이력 호환

### Gate C4-C42 — Membership

- [ ] `in` First Encounter가 42에서 표시
- [ ] present/absent/empty/duplicate 경계 검증
- [ ] 부품 재고 Fresh Transfer 통과

### Gate C4-C43 — Intersection

- [ ] `.add()` First Encounter가 43에서 표시
- [ ] 중복 공통 항목을 한 종류로 계산
- [ ] 입력 순서 교환에도 공통 종류 수 동일
- [ ] 팀 배지 Fresh Transfer 통과

### Gate Wave 완료

- [ ] 성단 4 Core 41~43 published
- [ ] Published = Public = Private = 47
- [ ] 성단 5는 잠금 유지
- [ ] 신규 JSX/API/Firestore/runtime 변경 0건
- [ ] 전체 테스트·ESLint·빌드 통과

---

## 15. 이번 단계에서 하지 않을 일

- 44~50 Dictionary 문제 구현
- Dictionary literal·키 대입·`.get()` 개념 등록
- Set 교집합 연산자 `&`, `.intersection()` 도입
- Set 자체를 반환하는 Judge 계약
- 정렬된 출력 또는 `sorted()` 의존
- Set 전용 Lens 신규 개발
- Runtime·Sandbox 확장
- AI 자동 힌트·채점 API 추가

다음 Wave는 이 Gate가 끝난 뒤 44 Dictionary Anchor와 45·46의 빈도·재고 갱신 계약을 설계한다.
