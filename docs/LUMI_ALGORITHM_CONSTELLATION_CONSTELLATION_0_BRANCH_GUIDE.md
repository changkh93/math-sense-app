# LUMI 알고리즘 성단 — 성단 0 선택 항로 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-EXP-EQUIV-09`, `AC-EXP-REVERSE-10` 및 공용 선수 조건 잠금  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → 선택 항로 계획 v2 → 기존 문서**  
> 원칙: 별도 엔진·문제별 UI·신규 서버 API 없이 기존 학습 루프를 재사용한다.

## 1. 최종 평가

계획 v2의 방향은 좋다. 두 문제 모두 새로운 Python 문법을 가르치지 않고, 성단 0에서 배운 상태 변화와 절차 읽기를 **동치성 검증**과 **블랙박스 역공학**으로 확장한다. Branch를 성단 1 개방 조건에서 제외한 것도 적절하다.

다만 그대로 구현하면 다음 불일치가 생긴다.

1. EQUIV-09는 “분배 전개 형태를 작성”하라고 하면서 `(pos + boost) * 2`도 정답으로 인정한다. 행동 채점과 학습 목표가 어긋난다.
2. “가장 작은 반례”와 “`pos > 0`인 모든 경우”라는 설명은 입력 영역을 명시하지 않으면 수학적으로 불완전하다.
3. 두 Branch의 현재 Catalog 선수 조건은 `AC-CODE-FIRST-ERROR-01` 하나뿐이라 필요한 Core 학습 없이도 노출될 수 있다.
4. 현재 Hub는 성단 잠금만 처리하고 개별 문제의 `prerequisites`를 잠그지 않는다. Catalog에 선수 조건만 적어도 학습 순서는 강제되지 않는다.
5. 저작 집합을 `published ⊆ public ⊆ private`로 완화하면 미출판 커널과 서버 정의가 본 번들·레지스트리에 남아 고아 콘텐츠와 유지 비용이 늘어난다.
6. 새 오개념 코드를 많이 등록해도 현재 범용 matcher가 소비하지 않으므로, 당장 학생 진단 품질은 오르지 않고 관리 항목만 증가한다.

따라서 계획을 **수정 승인**한다. 아래 계약을 최종 구현 기준으로 사용한다.

## 2. 채택·수정·폐기 결정

| 계획 요소 | 결정 | 확정 기준 |
|---|---|---|
| EQUIV-09 분배법칙·반례 탐색 | 채택 | 코드의 행동 동치와 개념 증거를 분리한다. |
| `expand_equivalent_route(pos, boost)` | 채택 | Base Judge는 출력 행동만 채점한다. |
| 괄호식 대안 풀이 허용 | 채택 | AST 형태 강제는 추가하지 않는다. |
| “분배 전개 형태 작성”을 1★ 필수 목표로 사용 | 폐기 | 전개 이해는 Explore와 2★에서 증명한다. |
| REVERSE-10의 선형 가설 공간 명시 | 채택 | 입력 영역과 관측 범위를 함께 명시한다. |
| `apply_robot_rule(signal)` | 채택 | 단일 정수 입력·반환 계약을 유지한다. |
| `pattern:counterexample-search` | 채택 | 완전한 공용 패턴 레지스트리 계약으로 1회 등록한다. |
| 두 Branch를 성단 1 게이트에 포함 | 폐기 | 기존 Anchor 3종 + Core 6/8을 유지한다. |
| 개별 문제 선수 조건 잠금 | 채택 | Hub에서 한 번만 범용 구현한다. 서버 호출은 추가하지 않는다. |
| `published ⊆ public ⊆ private` 완화 | 폐기 | 현재 단계에서는 Published/Public/Private 정확한 집합 일치를 유지한다. |
| 문제별 Lens·Callable·저장소 추가 | 폐기 | 기존 `StateTransitionLens`와 7대 Callable을 재사용한다. |
| 접근성·파일럿·수동 출판 승인 | 비차단 | 자동 계약 통과 후 바로 published 처리한다. |

## 3. 학습 위치와 개방 규칙

### 3.1 성단 0 구조

```text
Core 01~08: 사고 탐사 면허 본 항로
  ├─ EQUIV-09: 절차 동치와 반례 탐색
  └─ REVERSE-10: 입출력으로 숨은 2단계 규칙 복원
```

두 문제는 Review 성격의 선택 항로이며 서로를 선수 조건으로 요구하지 않는다. 한 Branch를 하지 않았다고 다른 Branch를 막지 않는다.

### 3.2 확정 선수 조건

| 문제 | 선수 조건 | 이유 |
|---|---|---|
| EQUIV-09 | `AC-EXP-STEP-03`, `AC-EXP-BOUND-05`, `AC-CODE-FIRST-ERROR-01` | 단계 조립, 경계·반례 비교, 틀린 코드 판별 경험이 모두 필요하다. |
| REVERSE-10 | `AC-EXP-VAR-02`, `AC-EXP-STEP-03` | 입력에 따른 상태 변화와 2단계 절차 분해가 필요하다. |

완료 기준은 각 선수 문제의 **1★ 이상**이다. 2★·3★를 선수 조건으로 요구하지 않는다. 이는 학습 순서를 지키면서 불필요한 진입 마찰을 줄인다.

### 3.3 Hub의 범용 잠금

현재 로드하는 `progressMap`과 Catalog `prerequisites`만 사용한다. 새 Callable이나 Firestore 읽기를 만들지 않는다.

공용 판정 규칙:

```text
missionUnlocked = prerequisites.every(id => completedProblemIds.has(id))
```

카드 동작:

- 잠긴 문제는 실행 버튼을 비활성화한다.
- “먼저 완료할 항로”로 미완료 선수 문제의 학생용 제목을 표시한다.
- `prerequisites`가 빈 문제와 이미 완료한 문제는 기존 동작을 유지한다.
- 이 규칙은 EQUIV/REVERSE 전용 조건문이 아니라 모든 published 문제에 적용한다.
- Branch 완료는 성단 1 개방 계산의 Core 완료 수에 포함하지 않는다.

이 한 번의 공용 개선으로 이후 Core 100 전체의 뜬금없는 선행 개념 노출도 함께 방지할 수 있다.

## 4. 공통 구현 아키텍처

두 문제 모두 다음 기존 경로를 그대로 사용한다.

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

- 새 React Lens 또는 문제별 Mode
- 새 Firebase Callable
- 새 Firestore collection/document shape
- 새 Judge 런타임 또는 Python 기능
- AST 기반 표현식 형태 채점
- 문제별 AI 진단 로직

`StateTransitionLens`는 임의의 key/value 상태를 이미 표시할 수 있으므로 `routeA`, `routeB`, `input`, `output`, `delta`를 프레임 상태로 제공하면 충분하다.

## 5. AC-EXP-EQUIV-09 — 두 코드, 같은 항로?

### 5.1 진짜 학습 목표

- 같은 결과를 내는 서로 다른 절차 표현을 비교한다.
- 몇 개의 예시가 같다는 사실과 “모든 허용 입력에서 같다”는 주장을 구분한다.
- 항상 같지 않은 후보는 작은 반례로 깨뜨린다.
- 곱셈 우선순위 때문에 괄호 유무가 결과를 바꿀 수 있음을 설명한다.

### 5.2 입력·출력 계약

```python
def expand_equivalent_route(pos, boost):
    ...
```

- `pos`, `boost`: `0 <= value <= 50`인 정수
- 반환값: `(pos + boost) * 2`와 같은 정수 결과
- 공식 풀이: `pos * 2 + boost * 2`
- 대안 풀이: `(pos + boost) * 2`

Base 1★는 **행동 동치**를 증명한다. 학생이 전개식을 실제로 이해했는지는 Explore와 2★가 증명한다. 코드 문자열이나 AST를 검사해 전개 형태를 강제하지 않는다. 이 방식이 대안 풀이를 존중하고 Judge 복잡도와 유지 비용을 최소화한다.

### 5.3 Public Kernel

```js
curriculum: {
  constellationId: 'constellation-0',
  routeRole: 'branch',
  learningRole: 'review',
  recommendedBand: 'E',
  prerequisites: [
    'AC-EXP-STEP-03',
    'AC-EXP-BOUND-05',
    'AC-CODE-FIRST-ERROR-01',
  ],
},
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'operator:arithmetic-state-update',
  ],
  introduces: [],
},
thinkingPatterns: {
  requires: [],
  introduces: ['pattern:counterexample-search'],
},
```

Catalog와 Kernel의 `lensId`는 모두 `state-transition`으로 맞춘다.

### 5.4 Observe·Explore

Observe에서는 한 입력만 보고 “항상 같다”고 결론 내리지 않도록 세 표현을 함께 비교한다.

```text
A: (pos + boost) * 2
B: pos * 2 + boost * 2
C: pos + boost * 2
```

`StateTransitionLens` 권장 프레임:

1. `{ pos: 0, boost: 5, routeA: 10, routeB: 10, routeC: 10 }`
2. `{ pos: 1, boost: 0, routeA: 2, routeB: 2, routeC: 1 }`
3. `{ pos: 3, boost: 4, routeA: 14, routeB: 14, routeC: 11 }`

첫 장면에서는 우연히 A와 C가 같고, 두 번째 장면에서 작은 반례가 드러나야 한다. 이 순서가 “예시 하나의 일치 ≠ 항상 동치”를 보여준다.

Starter는 전개식을 직접 요구하지 않는다.

```python
def expand_equivalent_route(pos, boost):
    # 묶어서 두 배 한 항로와 같은 도착값을 반환하세요.
    pass
```

### 5.5 2★ 이해 증거

문항은 최소 두 개로 유지한다.

1. `pos=2`, `boost=3`일 때 A와 C의 결과는? → `10과 8`
2. 허용 입력 중 A와 C가 처음 달라지는 작은 반례는? → `pos=1, boost=0`

“`pos > 0`인 모든 경우”를 정답으로 사용할 경우 반드시 비음수 입력 영역을 같은 화면에 명시한다. 더 명확한 기본안은 구체적인 `(1, 0)` 반례를 선택하게 하는 것이다.

### 5.6 Private Judge 계약

오답 fixture와 실패 그룹을 일대일로 분리한다.

| Fixture | 코드 요지 | expectedFailingGroup |
|---|---|---|
| `EQUIV-PRECEDENCE-BUG` | `pos + boost * 2` | `precedence_counterexample` |
| `EQUIV-MISSING-FACTOR` | `pos * 2 + boost` | `each_term_factor` |
| `EQUIV-HARDCODED-SAMPLE` | 고정값 반환 | `varied_inputs` |

권장 hidden tests:

- `precedence_counterexample`: `(1, 0) → 2`, `(3, 4) → 14`
- `each_term_factor`: `(0, 5) → 10`
- `zero_boost`: `(5, 0) → 10`
- `varied_inputs`: `(10, 20) → 60`, `(7, 8) → 30`

서로 다른 오개념을 모두 `precedence_counterexample`로 묶지 않는다. 실패 그룹은 fixture가 의도한 오류를 실제로 고립시켜야 한다.

### 5.7 Fresh Transfer

```python
def expand_three_signals(a, b, c):
    # (a + b + c) * 2와 같은 결과를 반환하세요.
    pass
```

- 입력은 `0..50` 정수로 제한한다.
- 공식 풀이는 `a * 2 + b * 2 + c * 2`로 둔다.
- `(a + b + c) * 2`도 행동상 올바르므로 통과시킨다.
- 최소 4개 test case에 `0`과 서로 다른 세 값을 포함한다.

## 6. AC-EXP-REVERSE-10 — 숨은 로봇의 규칙

### 6.1 진짜 학습 목표

- 출력의 일정한 증가량에서 배율을 찾는다.
- 입력이 0일 때의 출력에서 시작 보정값을 찾는다.
- 두 단서를 결합해 `입력 × 배율 + 보정값` 형태의 규칙을 복원한다.
- 관측하지 않은 새 입력에도 같은 규칙을 적용한다.

### 6.2 가설 공간과 입력 계약

문제 시작 시 다음 범위만 공개한다.

```text
로봇은 입력에 일정한 정수 배율을 곱한 뒤,
일정한 정수 보정값을 더하는 두 단계 규칙을 사용합니다.
```

- `signal`: `0 <= signal <= 100`인 정수
- 배율과 보정값도 정수
- 관측 데이터: `0→3`, `1→5`, `2→7`, `3→9`
- 복원 규칙: `signal * 2 + 3`

가설 공간을 제한하되 `2`와 `3`이라는 답은 관찰 전에 알려주지 않는다.

### 6.3 Public Kernel

```js
curriculum: {
  constellationId: 'constellation-0',
  routeRole: 'branch',
  learningRole: 'review',
  recommendedBand: 'E',
  prerequisites: ['AC-EXP-VAR-02', 'AC-EXP-STEP-03'],
},
pythonConcepts: {
  requires: [
    'concept:function-body-focus',
    'operator:arithmetic-state-update',
  ],
  introduces: [],
},
thinkingPatterns: {
  requires: ['pattern:procedure-decomposition'],
  introduces: [],
},
```

Catalog와 Kernel `lensId`는 `state-transition`으로 통일한다.

### 6.4 Observe·Explore

`StateTransitionLens` 권장 상태:

```text
초기: input=0, output=3
frame 1: input=1, output=5, inputDelta=1, outputDelta=2
frame 2: input=2, output=7, inputDelta=1, outputDelta=2
frame 3: input=3, output=9, inputDelta=1, outputDelta=2
```

발견 순서는 다음을 지킨다.

1. 출력 증가량 `+2`를 먼저 찾는다.
2. 입력 `0`의 출력 `3`을 보정값으로 해석한다.
3. 마지막에만 전체 규칙을 공개한다.

Starter:

```python
def apply_robot_rule(signal):
    # 관측에서 찾은 배율과 시작 보정값을 사용하세요.
    pass
```

### 6.5 2★ 이해 증거

1. 입력이 1 늘 때 출력은 얼마나 늘어나는가? → `2`
2. 입력이 0일 때 출력이 3인 것은 어느 부분을 보여주는가? → `시작 보정값 +3`

단순히 새 입력의 출력 하나만 묻지 않는다. 증가량과 보정값을 분리해 확인해야 역공학 증거가 된다.

### 6.6 Private Judge 계약

| Fixture | 코드 요지 | expectedFailingGroup |
|---|---|---|
| `REVERSE-ADD-ONLY` | `signal + 3` | `slope_sensitive` |
| `REVERSE-MULT-ONLY` | `signal * 2` | `zero_input` |
| `REVERSE-HARDCODED-SAMPLE` | 고정값 반환 | `varied_signals` |

권장 hidden tests:

- `zero_input`: `0 → 3`
- `slope_sensitive`: `1 → 5`, `2 → 7`
- `varied_signals`: `4 → 11`, `7 → 17`
- `large_signals`: `10 → 23`, `50 → 103`

테스트는 모두 정수·단일 함수 호출로 유지하므로 별도 런타임 기능이나 높은 실행 예산이 필요 없다.

### 6.7 Fresh Transfer

관측값에 입력 0을 포함해 오프셋 추론을 불필요하게 어렵게 만들지 않는다.

```text
level 0 → 1
level 1 → 4
level 2 → 7
level 3 → 10
```

```python
def apply_drone_energy(level):
    pass
```

정답 규칙은 `level * 3 + 1`이다. 테스트에는 `level=0`, 관측 범위 내부 값, 관측하지 않은 큰 값을 모두 포함한다.

## 7. 반례 탐색 패턴 레지스트리

`problemSolvingPatternRegistry.js`에 다음 필드를 모두 갖춘 항목을 한 번만 추가한다.

```js
'pattern:counterexample-search': {
  conceptId: 'pattern:counterexample-search',
  patternId: 'pattern:counterexample-search',
  displayName: '작은 반례로 항상인지 확인하기',
  kind: 'algorithm-pattern',
  canonicalFirstProblemId: 'AC-EXP-EQUIV-09',
  why: '몇 번 맞는 것만으로 항상 같다고 할 수 없어요. 서로 달라지는 작은 입력 하나를 찾으면 항상 같다는 주장을 검증할 수 있어요.',
  tinyExample: '(x + 1) * 2와 x + 2는 x=0에서는 같지만 x=1에서는 달라요.',
  syntaxExample: '# 작은 값 0, 1, 경계값을 차례로 비교',
  predictionCheck: {
    prompt: '두 식이 항상 같다는 주장을 깨뜨리는 가장 강한 증거는 무엇일까요?',
    options: ['서로 다른 결과가 나오는 입력 하나', '같은 결과가 나오는 입력 하나'],
    expected: '서로 다른 결과가 나오는 입력 하나',
  },
  protocolRepairId: 'PR-COUNTEREXAMPLE-001',
}
```

주의: 위 `tinyExample`은 산술적으로 정확해야 한다. 구현 시 예시는 `(x + 1) * 2`와 `x + 2`가 `x=0`에서 모두 2, `x=1`에서 4와 3이 되는지 계약 테스트로 확인하거나 더 단순한 검증된 예시를 사용한다.

## 8. 오개념·진단 범위

Private fixture의 `expectedMisconception`은 우선 회귀 테스트와 저작 의도를 위한 안정된 태그로 사용한다. 이번 범위에서 이 태그마다 새 matcher나 UI 문구를 만들지 않는다.

권장 태그:

- `OPERATOR-PRECEDENCE-CONFUSION`
- `PARTIAL-DISTRIBUTION`
- `CONSTANT-OFFSET-ONLY`
- `MULTIPLICATION-ONLY`
- 기존 `HARDCODED-SAMPLE-RETURN`

태그를 전역 taxonomy에 추가하는 것은 범용 matcher 또는 리포트가 실제로 소비할 때로 미룬다. 사용되지 않는 분류 체계를 미리 확장하지 않는다.

## 9. Catalog·Registry·출판 계약

### 9.1 Catalog 변경

두 항목 모두 다음을 반영한다.

- `status: 'published'`
- `lensId: 'state-transition'`
- 이 가이드의 선수 조건 배열
- `routeRole: 'branch'`, `learningRole: 'review'` 유지

REVERSE-10은 일반적인 블랙박스 아이디어만 참고하고 문제 문장·수치·캐릭터·테스트를 독자 작성한다. 외부 문제의 원문이나 고유 데이터를 복사하지 않는다. provenance는 실제 저작 경위에 맞춰 유지하되, `reference-only`가 실행을 막는 별도 승인 게이트는 이번 단계에 만들지 않는다.

### 9.2 집합 불변식

현재 릴리스 모델에서는 다음 강한 계약을 유지한다.

```text
Published Catalog IDs = Public Kernel IDs = Private Problem IDs
```

Catalog의 나머지 79개 draft는 메타데이터만 존재할 수 있다. 그러나 Public/Private 실행 레지스트리에 들어간 문제는 같은 변경에서 published까지 완결한다.

향후 별도 CMS·스테이징 배포가 생길 때만 lifecycle 부분집합 모델을 도입한다. 지금 완화하면 번들 고아 코드와 서버 고아 정의를 허용할 뿐 개발 속도를 높이지 않는다.

## 10. 구현 순서

작업을 다음 6개 원자 단계로 진행한다.

1. `pattern:counterexample-search`를 공용 패턴 레지스트리에 추가한다.
2. 두 Public Kernel을 `createCapabilityPrototypeKernel` 기반으로 작성한다.
3. 두 Private 정의에 solution, fixtures, hidden, understanding, transfer를 작성한다.
4. Public/Private registry와 Catalog를 한 번에 갱신해 21개 집합 parity를 맞춘다.
5. Hub에 범용 prerequisite 잠금과 미완료 선수 제목 표시를 추가한다.
6. 계약 테스트를 보강하고 전체 회귀 검증을 실행한다.

문제별 전용 컴포넌트보다 데이터 계약을 먼저 작성한다. 기존 UI로 표현되지 않는 요소가 있으면 새 Lens를 만들기 전에 상태 key/value 프레임으로 표현 가능한지 먼저 확인한다.

## 11. 자동 검증 계약

### 11.1 Authoring Integrity

기존 검사에 다음을 추가하거나 유지한다.

- Published/Public/Private ID 집합 정확한 일치: 구현 후 21개
- Public/Private `problemVersion`, `entryFunction`, 매개변수 배열 일치
- Catalog/Public `lensId`, `prerequisites` 일치
- 새 pattern의 필수 First Encounter 필드와 canonical first problem 일치
- 공식 풀이와 모든 대안 풀이 Base 통과
- 각 intended wrong fixture 실패 및 지정 그룹 실패
- Transfer starter/official 함수명·매개변수 일치
- Transfer 공식 풀이 통과

고정 숫자 `21` 자체를 assertion하지 않는다. 집합 parity의 결과 로그로만 현재 개수를 확인한다.

### 11.2 성단 0 커리큘럼 계약

- EQUIV/REVERSE가 `routeRole: branch`인지 확인
- 두 Branch를 완료해도 성단 1 Core 6/8 계산이 변하지 않는지 확인
- 선수 문제 미완료 시 카드가 잠기는 순수 helper 테스트
- 모든 선수 문제 1★ 완료 시 카드가 열리는 테스트
- Branch 간 상호 선수 조건이 없음을 확인

### 11.3 비용 상한

- intended wrong fixture당 기존 `20,000` 누적 스텝 상한 유지
- 각 Base hidden test는 상수 시간 함수 호출만 사용
- Base hidden test는 문제당 6~8개로 제한
- Transfer test는 4~6개로 제한
- 새 네트워크 요청, 새 저장 쓰기, 새 analytics event를 만들지 않음

### 11.4 실행 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

## 12. 완료 정의

다음 조건을 모두 만족하면 성단 0 선택 항로 구현을 완료로 본다.

- 두 문제의 Observe → Explore → Code → 1★ → 2★ → Fresh Transfer 3★ 경로가 기존 Shell에서 동작한다.
- 학생이 필요한 Core를 학습하지 않은 상태에서는 Branch 카드가 잠긴다.
- EQUIV-09가 행동 동치와 개념 이해를 서로 다른 증거로 평가한다.
- REVERSE-10이 증가량과 시작값을 각각 확인한다.
- 두 Branch 완료 여부가 성단 1 개방 조건에 영향을 주지 않는다.
- Published/Public/Private 집합 parity가 유지된다.
- 신규 서버 API·저장소·문제별 UI·AST 채점이 없다.
- 전체 자동 테스트, ESLint, 프로덕션 빌드가 통과한다.

## 13. 구현 담당 AI에게 전달할 금지 사항

- 계획에 없던 새 Python 문법을 Starter나 Transfer에 넣지 않는다.
- `source-debug-lens`를 그대로 두거나 새 전용 Lens를 만들지 않는다.
- 분배 전개 모양을 강제하기 위한 코드 문자열·정규식·AST 채점을 추가하지 않는다.
- Branch를 성단 1 개방 점수에 포함하지 않는다.
- 두 Branch를 서로의 필수 선수 조건으로 연결하지 않는다.
- Public Kernel에 hidden test, official solution, expected answer를 넣지 않는다.
- 개발 편의를 이유로 Published/Public/Private 집합 검증을 약화하지 않는다.
- 현재 progress 조회로 해결 가능한 prerequisite 잠금 때문에 서버 호출을 추가하지 않는다.

