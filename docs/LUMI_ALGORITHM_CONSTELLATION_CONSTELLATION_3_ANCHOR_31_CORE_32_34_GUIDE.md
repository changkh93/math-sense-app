# LUMI 알고리즘 성단 — 성단 3 Anchor 31 계약 보정 및 Core 32~34 개발 가이드

> 문서 상태: 다음 구현 기준안  
> 변경 단위: `C3-R + C3-A`  
> 범위: 기존 `AC-SEQ-005` 보정, 신규 `AC-SEQ-MINMAX-32`, `AC-SEQ-COUNT-33`, `AC-SEQ-ADJACENT-34`  
> 선행 상태: 성단 0~2 완결, Published/Public/Private 37개 일치  
> 목표 상태: 성단 3의 31~34 학습 사다리 확보, Published/Public/Private 40개 일치

---

## 1. 결론

다음 작업은 아래 두 묶음을 하나의 변경으로 진행한다.

1. **C3-R:** 이미 출판된 Anchor 31의 선수 조건과 Public/Private 계약을 현재 표준으로 보정
2. **C3-A:** Core Practice 32~34를 순서 있는 수열 학습 사다리로 구현

이번 변경에서는 신규 Lens, 문제별 JSX, Runtime 문법, Callable, Firestore 구조를 만들지 않는다.

등록 문제는 37개에서 40개가 되지만, 이것은 **기술 레지스트리 40개 체크포인트**다. Catalog 35와 37~40은 아직 미출판이므로 성단 3 완결 또는 Wave B 교육과정 완결로 부르지 않는다.

---

## 2. 현재 구조 평가

### 2.1 Anchor 31의 장점

- 리스트 순회, 조건 선별, 누적을 한 화면에서 경험한다.
- `SequenceAccumulatorLens`가 31번의 양수 필터 합산에 정확히 맞는다.
- 빈 리스트, 전부 손상된 리스트, 혼합 리스트를 이미 다룬다.
- Public/Private 실행과 기존 3-Star 흐름이 작동한다.

### 2.2 Anchor 31의 계약 부채

현재 `AC-SEQ-005`는 초기 7개 Kernel 형식이어서 다음 불일치가 있다.

- Catalog 선수 조건이 `AC-COND-001` 하나뿐이라 리스트·for·비교를 학습하지 않은 학생도 진입할 수 있다.
- `pythonConcepts.introduces`가 리스트·for·if를 다시 소개한다고 선언하지만 각 개념의 First Encounter는 이미 성단 0에 있다.
- Public Kernel에 `curriculum`, `thinkingPatterns`, 공개 Transfer Preview가 없다.
- Private가 `version`, `intendedWrongSolutions`, `expectedFailureGroup`, `transferChallenges` 같은 레거시 이름을 사용한다.
- Private Transfer에 `officialSolutionCode`가 없어 현재 동적 수명주기 테스트에 바로 포함하기 어렵다.
- 이해 확인 질문에 명시적 선택지가 부족하다.

31을 완전히 새 factory Kernel로 다시 작성할 필요는 없다. 기존 풍부한 Shell과 전용 Lens를 보존하면서 필드만 현재 계약에 맞추는 것이 가장 낮은 비용이다.

### 2.3 32~34 Lens 판정

현재 `SequenceAccumulatorLens`는 아래 동작이 하드코딩되어 있다.

- 값이 `> 0`인지 판정
- 양수 값 자체를 `total`에 더함
- 캡슐/에너지 용어 사용

따라서 최소·최대, 조건 개수, 인접 비교에 재사용하면 화면과 실제 문제가 달라진다. 한 문제군을 위해 Lens를 범용화하지 않고, 검증된 `state-transition` 장면을 사용한다.

| 문제 | 확정 Lens | 이유 |
|---|---|---|
| 31 | `sequence-accumulator` | 기존 양수 선별 합산에 정확히 부합 |
| 32 | `state-transition` | smallest/largest 두 상태 갱신 |
| 33 | `state-transition` | 조건 결과와 count 갱신 |
| 34 | `state-transition` | previous/current 비교 순서 |

---

## 3. 최종 학습 사다리와 선수 관계

```text
성단 0 기초
  ├─ AC-CODE-FIRST-ERROR-01  (list, if)
  ├─ AC-EXP-LOOP-06          (for)
  ├─ AC-COND-ELIF-14         (>, >= 비교)
  └─ AC-EXP-BOUND-05         (<, <= 비교)
             │
             ▼
AC-SEQ-005 (31)  필터 + 값 누적 Anchor
  ├──────────────▶ AC-SEQ-MINMAX-32  첫 값으로 초기화 + 양방향 갱신
  │                       │
  │                       └──▶ AC-SEQ-ADJACENT-34  이전 값과 현재 값 비교
  │
  └── + AC-COND-RANGE-15 ─▶ AC-SEQ-COUNT-33  조건에 맞는 개수 누적
```

확정 선수 조건:

| 문제 | 선수 조건 |
|---|---|
| 31 | `AC-CODE-FIRST-ERROR-01`, `AC-EXP-LOOP-06`, `AC-COND-ELIF-14` |
| 32 | `AC-SEQ-005`, `AC-EXP-BOUND-05` |
| 33 | `AC-SEQ-005`, `AC-COND-RANGE-15` |
| 34 | `AC-SEQ-MINMAX-32`, `AC-EXP-SWAP-04` |

34는 32에서 “첫 항목으로 상태 초기화”를 회수하고, SWAP-04에서 배운 “덮어쓰기 전에 필요한 값을 사용한다”는 사고를 이전 값 갱신에 적용한다.

---

## 4. 공통 구현 원칙

### 4.1 재사용

- Public Kernel 생성: 신규 32~34는 `createCapabilityPrototypeKernel`
- 31은 기존 full Kernel 구조 유지
- Lens: 기존 `sequence-accumulator`, `state-transition`
- Evidence: 기존 8개 Primitive만 사용
- Judge/Callable/Gateway/Hub: 변경 없음
- 기존 저작·게이트·서버·패리티 테스트에 계약 추가

### 4.2 금지

- `sequence-accumulator`에 문제 ID 분기 추가
- 32~34 전용 React 컴포넌트 생성
- `min()`/`max()`를 32의 정답 문법으로 사전 노출
- 빈 리스트의 최소·최대 정의를 임의로 정하기
- 34에서 미등록 `len()`을 필수 해법으로 도입
- AST 형태 강제 채점
- Client에 Hidden 또는 authoritative Transfer 입력 복제
- 40개 도달만으로 Wave B 완결 선언

### 4.3 공통 도메인

- 리스트 최대 길이: 20
- 원소: 정수 `-100..100`
- 32와 34: 리스트 길이 `1..20`
- 33: 빈 리스트 허용, 길이 `0..20`
- 공식 Base/Transfer 각각 누적 20,000 step 이내
- Public/Hidden, Preview/Master 입력 중복 0건

---

## 5. C3-R — AC-SEQ-005 Anchor 31 계약 보정

### 5.1 Public Kernel 보정

기존 Shell, Observe, `SequenceAccumulatorLens`, Public Test는 유지한다.

추가할 curriculum:

```js
curriculum: {
  constellationId: 'constellation-3',
  routeRole: 'core',
  learningRole: 'anchor',
  recommendedBand: 'E',
  prerequisites: [
    'AC-CODE-FIRST-ERROR-01',
    'AC-EXP-LOOP-06',
    'AC-COND-ELIF-14',
  ],
}
```

Python 계약:

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'statement:for',
    'statement:if',
    'operator:comparison-lower-bound',
    'operator:assignment',
    'operator:arithmetic-state-update',
  ],
  introduces: [],
}
```

사고 패턴:

```js
thinkingPatterns: {
  requires: [],
  introduces: ['pattern:filter-accumulate'],
}
```

`pattern:filter-accumulate`를 Pattern Registry에 한 번 등록한다.

- 의미: 모든 항목을 순회하되 조건을 통과한 항목만 정해진 측정값으로 누적
- 31: 통과한 값 자체를 더함
- 33: 통과한 항목마다 1을 더함
- canonical first problem: `AC-SEQ-005`

### 5.2 이해 확인 보정

기존 Boolean 기대값을 명시적 선택지로 바꾼다.

- `-2`를 만나면 total은 유지된다.
- `[4, -2, 7, 0]`의 최종 total은 11이다.
- 개수를 세는 것과 값을 합하는 것은 다르다.

Public과 Private의 challenge ID, 질문 ID, expected 값을 동일하게 유지한다.

### 5.3 Fresh Transfer 보정

기존 `collect_crystals(ores)`를 유지하되 Public Preview와 Private Master를 분리한다.

Public Preview:

```js
[
  { inputs: { ores: [6, -2, 4] }, expected: 10 },
  { inputs: { ores: [] }, expected: 0 },
]
```

Private Master:

```js
[
  { inputs: { ores: [10, -5, 20, -1] }, expected: 30 },
  { inputs: { ores: [-1, -2, -3] }, expected: 0 },
  { inputs: { ores: [7, 7, 7] }, expected: 21 },
  { inputs: { ores: [0, 9, 0] }, expected: 9 },
]
```

Private Transfer에 `officialSolutionCode`를 추가한다. Public에는 starter와 Preview만 둔다.

### 5.4 Private 명칭 정규화

아래 이름으로 통일한다.

```text
version                  → problemVersion
intendedWrongSolutions  → intendedWrongFixtures
expectedFailureGroup    → expectedFailingGroup
transferChallenges      → transferMasterSet
```

호환 getter는 남기지 않는다. Registry의 공용 `getTransferChallenges()`가 현재/레거시 양쪽을 지원하지만 31은 이번 변경에서 현재 계약으로 정리한다.

### 5.5 Catalog 보정

31의 prerequisites를 Public curriculum과 동일하게 바꾼다. ID, catalogOrder, status, Lens, provenance는 유지한다.

---

## 6. AC-SEQ-MINMAX-32 — 가장 약한 신호와 강한 신호

### 6.1 목표

임의의 숫자나 0을 초기 최솟값·최댓값으로 사용하지 않고, **첫 항목으로 두 상태를 초기화한 뒤 한 번의 순회에서 갱신**한다.

### 6.2 함수 계약

```python
def find_signal_bounds(signals):
    # [가장 작은 값, 가장 큰 값]을 반환
```

- `signals`: 길이 `1..20`, 정수 `-100..100`
- 반환: `[smallest, largest]`
- 빈 리스트는 입력하지 않음
- `min()`, `max()` 사용 여부는 채점하지 않지만 학습 화면과 공식 해법에서는 노출하지 않음

### 6.3 Curriculum

```js
prerequisites: ['AC-SEQ-005', 'AC-EXP-BOUND-05']
pythonConcepts.requires: [
  'builtin:list',
  'statement:for',
  'statement:if',
  'operator:comparison-bound',
  'operator:comparison-lower-bound',
  'operator:assignment',
  'operator:arithmetic-state-update',
]
thinkingPatterns.introduces: ['pattern:first-item-initialization']
evidenceRecipe.primitives: ['container-scan', 'decision', 'scalar-sequence']
lensId: 'state-transition'
```

`pattern:first-item-initialization`을 Registry에 등록한다.

- 배열이 비지 않는 계약에서 첫 항목을 유효한 초기 후보로 사용
- 임의 sentinel `0`, `999`, `-999`의 도메인 의존 오류 방지
- canonical first problem: `AC-SEQ-MINMAX-32`

### 6.4 Observe/Explore

Observe:

> 신호 `[-4, -9, -2]`의 최댓값을 0으로 시작하면 어떤 문제가 생길까요?

정답: 입력에 없는 0을 최댓값이라고 잘못 반환할 수 있다.

Explore 고정 입력: `[6, 2, 9, 2]`

| frame | current | smallest | largest | 의미 |
|---|---:|---:|---:|---|
| init | 6 | 6 | 6 | 첫 항목으로 초기화 |
| scan_2 | 2 | 2 | 6 | 작은 값 갱신 |
| scan_9 | 9 | 2 | 9 | 큰 값 갱신 |
| scan_2_again | 2 | 2 | 9 | 같은 최소값, 상태 유지 |

### 6.5 Starter

```python
def find_signal_bounds(signals):
    # signals에는 하나 이상의 정수가 있습니다.
    # 가장 작은 값과 가장 큰 값을 [smallest, largest]로 반환하세요.
    pass
```

### 6.6 테스트 설계

Public:

```js
[
  { inputs: { signals: [7, -2, 5] }, expected: [-2, 7] },
  { inputs: { signals: [4] }, expected: [4, 4] },
  { inputs: { signals: [-8, -3, -10] }, expected: [-10, -3] },
]
```

Hidden 권장 그룹:

- `all_positive`: `[8, 3, 12, 1] → [1, 12]`
- `contains_zero`: `[-5, 0, 6] → [-5, 6]`
- `duplicates`: `[2, 2, 2] → [2, 2]`
- `boundary_values`: `[-100, 100, 0] → [-100, 100]`
- `descending`: `[9, 6, 3, -1] → [-1, 9]`

Wrong Fixtures:

- smallest/largest를 모두 0으로 초기화
- smallest만 갱신하고 largest를 갱신하지 않음
- largest만 반환하거나 반환 순서를 뒤집음
- 마지막 항목만 두 값으로 반환

### 6.7 이해 확인

- 첫 항목 6을 두 상태의 초기값으로 사용하는 이유
- 2를 만났을 때 smallest만 바뀌는 이유
- 9를 만났을 때 largest만 바뀌는 이유

### 6.8 Fresh Transfer

```python
def signal_span(signals):
    # 가장 큰 값과 가장 작은 값의 차이를 반환
```

- 도메인 동일, 비어 있지 않음
- 기존 두 상태를 찾은 뒤 `largest - smallest`로 전이
- Preview 2개, Private Master 4개 이상
- Preview/Master 입력 중복 금지

---

## 7. AC-SEQ-COUNT-33 — 정상 캡슐은 몇 개?

### 7.1 목표

31의 “조건을 통과한 값 자체를 더한다”에서 “조건을 통과한 항목마다 1을 더한다”로 누적 의미를 바꾼다.

### 7.2 함수 계약

```python
def count_normal_capsules(capsules, min_energy, max_energy):
    # 닫힌 구간 min_energy <= energy <= max_energy인 항목 수 반환
```

- `capsules`: 길이 `0..20`, 정수 `-100..100`
- `min_energy`, `max_energy`: `-100..100`
- 항상 `min_energy <= max_energy`
- 경계 포함
- 반환: `0..20`

### 7.3 Curriculum

```js
prerequisites: ['AC-SEQ-005', 'AC-COND-RANGE-15']
pythonConcepts.requires: [
  'builtin:list',
  'statement:for',
  'statement:if',
  'operator:and',
  'operator:comparison-bound',
  'operator:comparison-lower-bound',
  'operator:assignment',
  'operator:arithmetic-state-update',
]
thinkingPatterns.requires: ['pattern:filter-accumulate']
evidenceRecipe.primitives: ['container-scan', 'decision', 'scalar-sequence']
lensId: 'state-transition'
```

새 Python 개념과 사고 패턴을 도입하지 않는다.

### 7.4 Explore

입력: `capsules=[-2, 0, 5, 9, 12]`, 정상 범위 `0..9`

| current | 범위 포함 | count |
|---:|---|---:|
| -2 | 아니오 | 0 |
| 0 | 예, 하한 포함 | 1 |
| 5 | 예 | 2 |
| 9 | 예, 상한 포함 | 3 |
| 12 | 아니오 | 3 |

### 7.5 Public/Hidden 핵심

Public은 혼합, 양쪽 경계, 빈 리스트를 보여준다.

Hidden은 다음 오개념을 분리한다.

- `strict_boundary`: `<`/`>`를 사용하여 경계 제외
- `sum_instead_of_count`: 값을 더함
- `lower_only`: 상한을 검사하지 않음
- `wrong_initial_count`: count를 1로 시작
- `no_match`: 통과 항목 0개

### 7.6 이해 확인

- 경계값 0과 9도 포함되는 이유
- 정상 값 `[0,5,9]`의 합은 14지만 개수는 3이라는 차이
- 빈 리스트의 count가 0인 이유

### 7.7 Fresh Transfer

```python
def count_alerts(readings, alert_threshold):
    # reading >= alert_threshold인 항목 수 반환
```

범위 조건을 단일 하한 경보 조건으로 바꾸어 전이한다. Base 입력과 다른 리스트를 사용한다.

---

## 8. AC-SEQ-ADJACENT-34 — 어제보다 세진 신호

### 8.1 목표

각 값을 고정 기준이나 첫 값과만 비교하지 않고, **바로 이전 값과 현재 값을 비교한 뒤 previous를 갱신**한다.

### 8.2 함수 계약

```python
def count_signal_increases(signals):
    # 바로 이전 값보다 커진 횟수 반환
```

- `signals`: 길이 `1..20`, 정수 `-100..100`
- 첫 항목은 비교 대상이 없으므로 증가 횟수에 포함하지 않음
- 같은 값은 증가가 아님

`len()`과 index-range를 필수로 하지 않는 공식 해법:

```python
previous = signals[0]
increases = 0
for current in signals:
    if current > previous:
        increases = increases + 1
    previous = current
return increases
```

첫 회차는 `current == previous`라 증가하지 않는다.

### 8.3 Curriculum

```js
prerequisites: ['AC-SEQ-MINMAX-32', 'AC-EXP-SWAP-04']
pythonConcepts.requires: [
  'builtin:list',
  'statement:for',
  'statement:if',
  'operator:comparison-lower-bound',
  'operator:assignment',
  'operator:arithmetic-state-update',
]
thinkingPatterns.requires: [
  'pattern:first-item-initialization',
  'pattern:preserve-before-overwrite',
]
evidenceRecipe.primitives: ['container-scan', 'decision', 'scalar-sequence']
lensId: 'state-transition'
```

### 8.4 Explore

입력: `[3, 5, 4, 4, 7]`

| current | previous before | 증가? | count | previous after |
|---:|---:|---|---:|---:|
| 3 | 3 | 아니오 | 0 | 3 |
| 5 | 3 | 예 | 1 | 5 |
| 4 | 5 | 아니오 | 1 | 4 |
| 4 | 4 | 아니오 | 1 | 4 |
| 7 | 4 | 예 | 2 | 7 |

### 8.5 Public/Hidden 핵심

Public:

- 혼합 `[3,5,4,7] → 2`
- 단일 `[5] → 0`
- 같은 값 `[2,2,2] → 0`

Hidden 그룹:

- `strictly_increasing`
- `strictly_decreasing`
- `alternating`
- `duplicates_between_changes`
- `negative_values`

Wrong Fixtures:

- 모든 값을 첫 항목과 비교
- 비교 전에 `previous = current`로 덮어써 항상 0
- `current < previous`를 세어 감소 횟수 반환
- 같은 값도 증가로 계산 (`>=`)

### 8.6 이해 확인

- 비교 전에 previous를 덮어쓰면 안 되는 이유
- 같은 값이 증가가 아닌 이유
- 첫 항목이 count 대상이 아닌 이유

### 8.7 Fresh Transfer

```python
def count_temperature_drops(readings):
    # 바로 이전 측정값보다 낮아진 횟수 반환
```

상태 갱신 순서는 유지하고 비교 방향만 반대로 바꾼다.

---

## 9. 파일 변경 계획

### 9.1 신규 파일 6개

```text
src/components/AlgorithmConstellation/shared/problems/ac_seq_minmax_32.js
src/components/AlgorithmConstellation/shared/problems/ac_seq_count_33.js
src/components/AlgorithmConstellation/shared/problems/ac_seq_adjacent_34.js
functions/algorithmConstellation/problems/ac_seq_minmax_32.private.cjs
functions/algorithmConstellation/problems/ac_seq_count_33.private.cjs
functions/algorithmConstellation/problems/ac_seq_adjacent_34.private.cjs
```

### 9.2 수정 파일

```text
src/components/AlgorithmConstellation/shared/problems/ac_seq_005.js
functions/algorithmConstellation/problems/ac_seq_005.private.cjs
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

패리티 테스트가 Public Kernel을 동적으로 순회하면 ID를 수동 추가하지 않는다.

### 9.3 Catalog

- 31 prerequisites 보정
- 32~34 `status: 'published'`
- 32~34 `lensId: 'state-transition'`
- 33, 34 prerequisites를 이 문서대로 보정
- ID, catalogOrder, 역할, provenance 유지

---

## 10. 테스트 계약

### 10.1 Anchor 31 회귀

- Public curriculum과 Catalog prerequisites 일치
- Python 개념은 `requires`, `introduces: []`
- `pattern:filter-accumulate` Registry와 canonical ID 일치
- Public/Hidden 중복 0건
- Transfer Preview/Master 중복 0건
- Private가 현재 필드명만 사용
- Transfer official solution 존재 및 20,000 step 이내 통과

### 10.2 32~34 공통

- 리스트 길이와 원소 범위
- Public/Hidden, Preview/Master 비중복
- 모든 Evidence Primitive 유효
- 공식·대안 Base 및 공식 Transfer 20,000 step 이내
- Wrong Fixture가 지정 그룹에서 실패
- Catalog/Public/Private 집합 40개 일치
- Client/Server 결과 패리티

### 10.3 문제별 필수 회귀

32:

- 빈 리스트 테스트가 없음
- 음수-only 입력 포함
- singleton에서 `[x,x]`
- student-facing 텍스트와 공식 해법에 `min(`/`max(` 사전 의존 없음

33:

- `min_energy <= max_energy`
- 양쪽 경계 포함 테스트
- 빈 리스트 결과 0
- 합과 개수를 혼동하는 fixture 실패

34:

- 모든 입력 길이 1 이상
- singleton 결과 0
- same-value는 증가 아님
- 첫 값 비교 제외
- previous 갱신 순서 fixture 실패

### 10.4 커리큘럼 게이트

- 31의 세 선수 문제 중 하나라도 없으면 잠김
- 이미 31을 완료한 학생은 공용 완료 이력 예외로 계속 복습 가능
- 32는 31과 BOUND-05의 1★ 필요
- 33은 31과 RANGE-15 모두 필요
- 34는 32와 SWAP-04 모두 필요
- 성단 4 개방은 여전히 성단 3의 Core 6/8과 필수 Anchor 조건을 따른다
- 기존 Anchor 36까지 포함한 출판 Core 5개를 모두 완료해도 성단 4가 열리지 않음

---

## 11. 구현 순서

1. Pattern Registry에 두 사고 패턴 등록
2. 31 Public curriculum·개념·공개 증거 보정
3. 31 Private 계약과 Transfer 격리 보정
4. 31 표적 회귀 통과
5. 32 Public/Private 구현 및 표적 검증
6. 33 Public/Private 구현 및 표적 검증
7. 34 Public/Private 구현 및 표적 검증
8. Public/Private index 등록
9. Catalog prerequisites/Lens/status를 마지막에 전환
10. 저작 계약 → 게이트 → 서버 수명주기 → 패리티 순으로 실행
11. 전체 테스트, ESLint, 빌드

Catalog를 먼저 출판하지 않는다. 중간 집합 불일치 시간을 최소화한다.

---

## 12. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

---

## 13. 완료 조건

### Gate C3-R — Anchor 31

- [ ] 선수 조건과 First Encounter가 일치
- [ ] 기존 전용 Lens와 학생 경험 보존
- [ ] Public/Private 이해·전이 계약 동기화
- [ ] 레거시 Private 필드 제거

### Gate C3-A — Core 32~34

- [ ] 32 최소·최대, 33 조건 count, 34 인접 비교가 서로 다른 상태 갱신을 훈련
- [ ] 미학습 `min/max/len`을 필수 해법으로 사용하지 않음
- [ ] 세 문제 모두 Base·2★·Fresh Transfer 완결
- [ ] 선수 잠금과 성단 4 비개방 검증

### Gate 기술 레지스트리 40

- [ ] Published = Public = Private = 40
- [ ] 신규 문제 전용 JSX/API/Firestore 변경 0건
- [ ] 전체 테스트·ESLint·빌드 통과
- [ ] 35·37~40 미출판 상태를 명확히 유지

---

## 14. 이번 단계에서 하지 않을 일

- Core 35 누적합 리스트 구현
- String Anchor 36 재검토 또는 37 회문 구현
- Branch 39~40 구현
- `SequenceAccumulatorLens` 범용화
- `builtin:len`, `builtin:min`, `builtin:max` First Encounter 이동
- 학생 파일럿·접근성·출판 승인으로 구현 차단
- 40개 도달만으로 100개 전체 범위 재설계

다음 변경 단위는 이 구현의 회귀가 통과한 뒤 **C3-B: Core 35 + String Anchor 36 계약 보정 + Core 37**로 잡는다. 38과 Branch 39~40은 그 이후 별도 묶음으로 유지한다.
