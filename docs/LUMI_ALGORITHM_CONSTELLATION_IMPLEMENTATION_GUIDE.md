# LUMI 알고리즘 성단 — MASTER PLAN × CORE 100 구현 가이드

> 문서 상태: 구현 착수 기준 v1  
> 상위 기준: `LUMI_ALGORITHM_CONSTELLATION_MASTER_PLAN.md`  
> 실행 순서: `LUMI_ALGORITHM_CONSTELLATION_INTEGRATED_ROADMAP.md`  
> 콘텐츠 범위: `LUMI_ALGORITHM_CONSTELLATION_CORE_100_PLAN.md`

## 1. 종합 평가와 승인 결정

제안된 구현 계획은 방향이 정확하며 **조건부 승인(GO)** 한다. 특히 다음 구조는 유지한다.

```text
학생 코드
  → Semantic Runtime Trace
  → Neutral Learning Evidence
  → 진단 / Scaffold / Time-Travel / 외부 AI 프롬프트
  → 이해·전이 증거
```

다만 모든 Component를 한 번에 구현하지 않는다. 다음 7개 조건을 계획에 반영한 뒤 Gate 단위로 진행한다.

1. `76 Core + 20 Branch + 4 Capstone`의 성단별 배치를 고정한다.
2. 다음 성단 개방은 `필수 Anchor + Core 6/8`로 판정한다.
3. Python 새 도구의 최초 등장을 Registry와 micro-check로 관리한다.
4. Trace v2에 `statementId`, `sourceSpan`, frame 정보를 포함하고 Runtime Event와 Learning Scene을 분리한다.
5. 문제 Family별 거대 Adapter 대신 조합 가능한 Evidence Primitive를 사용한다.
6. Catalog에 출판 상태, 의미 기반 stable ID, 세분화된 provenance를 둔다.
7. First Encounter, 오염 방지, Catalog/Judge parity, Unlock, Bundle leak 검사를 필수화한다.

### 1.1 제안 계획의 채택·수정·보류

| 제안 | 결정 | 구현 지침 |
|---|---|---|
| Semantic Trace v2 | 채택 | 기존 7개에서 먼저 검증하고 신규 커널보다 앞서 완료 |
| 5대 Family Evidence Adapter | 구조 수정 | 8개 Evidence Primitive와 문제별 조합 Recipe로 변경 |
| `core100Catalog.js` | 명칭·계약 수정 | `algorithmEditorialCatalog.js`; 100개 중 Core는 76개뿐임 |
| 100개 메타데이터 등록 | 채택·순서 조정 | 계약 골격을 먼저 만들고, 전체 draft 등록은 Trace/Evidence Gate 뒤 수행 |
| 신규 5개 커널 | 채택 | 일괄 구현 금지. `CODE → STR → SET → SORT → ENUM` 순차 Gate |
| 숫자 포함 신규 ID | 폐기 | 의미 기반 stable ID 사용, 순서는 `catalogOrder`만 담당 |
| 10개 성단 탭 | 관리자용만 채택 | 학생은 현재 성단 중심 지도와 앞·뒤 성단을 사용 |
| Core 6/8 개방 | 수정 | 필수 Anchor 완료 조건 추가, 성단 0~8에만 적용 |
| `rightsStatus: reference-only` 고정 | 폐기 | original/inspired/licensed-adaptation을 문제별 기록 |
| Client/Server evaluator 동시 수동 수정 | 폐기 | ESM을 원본으로 두고 CJS를 생성; 생성물 직접 편집 금지 |
| 100개 전체 Hub 노출 | 폐기 | 학생은 `published`만 진입, 미래 항목은 제한된 coming-soon 정보만 표시 |

---

## 2. 구현 불변조건

다음 조건은 일정이나 편의 때문에 완화하지 않는다.

### 2.1 학습 불변조건

- 경험 → 발견 → 개념 → 이름 → 코드의 순서를 지킨다.
- 새 Python 도구를 설명 없이 먼저 사용시키지 않는다.
- Trace는 정답 애니메이션이 아니라 학생 코드의 실제 실행 증거다.
- AI 프롬프트는 완성 코드나 히든 테스트를 포함하지 않는다.
- 별과 Mastery는 서버 권위 증거만으로 확정한다.
- Branch를 하지 않아도 Core 과정과 Capstone에 접근할 수 있다.

### 2.2 기술 불변조건

- 기존 7개 `problemId`와 저장된 진도 키를 변경하지 않는다.
- `problemId`는 영구 식별자이고 `catalogOrder`는 변경 가능한 편집 순서다.
- Public Kernel과 Editorial Catalog에는 히든 입력·정답·전이 master를 두지 않는다.
- Runtime Event, Meaningful Event, Learning Scene의 index를 혼용하지 않는다.
- ESM evaluator만 직접 편집하고 CJS는 동기화 스크립트가 생성한다.
- Judge 장애나 계약 불일치는 실패 폐쇄한다.
- 신규 Practice 때문에 Shell·Judge 엔진·Hub에 문제 ID 분기를 추가하지 않는다.

### 2.3 비용 불변조건

- Anchor만 완전한 10단계 경험을 가진다.
- Practice는 공용 Lens, Evidence Recipe, Scaffold Template을 재사용한다.
- 신규 bespoke Lens는 기존 Lens 조합으로 학습 목표를 표현할 수 없다는 설계 검토를 통과해야 한다.
- 대형 저작 UI보다 Schema + CLI Validator + Preview를 먼저 만든다.

---

## 3. 목표 아키텍처

```text
Public Kernel ───────────────┐
Editorial Catalog ──────────┼─→ Mission Resolver → MissionShell
Python Concept Registry ────┘                         │
                                                      ▼
Student Worker → Semantic Trace v2 → Meaningful Projector → Learning Scene
                         │                                  │
                         ▼                                  ▼
                Evidence Primitive Builder ─────────→ Lens Adapter
                         │
            ┌────────────┼────────────┬───────────────┐
            ▼            ▼            ▼               ▼
     Misconception   Scaffold     Understanding   AI Prompt Builder
       Matcher       Selector       Evidence       (optional consumer)

Student submission → Callable Orchestrator → Private Catalog → Judge
                                               │
                                               ▼
                                      Immutable Evidence Ledger
```

Editorial Catalog는 “무엇이 존재하고 어디에 놓이는가”를 관리한다. Public Kernel은 “학생이 어떤 학습 경험을 하는가”를 관리한다. Private Definition은 “서버가 무엇으로 판정하는가”를 관리한다. 세 책임을 합치지 않는다.

---

## 4. Gate 0 — 계약과 기준선 동결

새 실행 기능을 만들기 전에 완료한다.

### 4.1 정확한 100문제 배치

| 성단 | Core | Branch | Capstone | 합계 | 다음 성단 개방 |
|---|---:|---:|---:|---:|---|
| 성단 0~8, 각 성단 | 8 | 2 | 0 | 10 | 필수 Anchor 전체 + Core 6개 이상 |
| 성단 9 | 4 | 2 | 4 | 10 | 최종 성단 전용 완료 계약 |
| 합계 | 76 | 20 | 4 | 100 | - |

성단 9 진입은 성단 8의 unlock policy를 통과하면 가능하다. 4개 Capstone은 각 Capstone의 Core prerequisite만 충족하면 열리며 Branch 완료를 요구하지 않는다.

### 4.2 식별자 정책

기존 ID는 유지한다.

- `AC-COND-001`
- `AC-COND-002`
- `AC-PAT-003`
- `AC-PAT-004`
- `AC-SEQ-005`
- `AC-NAV-005`
- `AC-NAV-006`

신규 ID에는 순서 번호를 넣지 않는다.

| 원형 | stable problemId | catalogOrder |
|---|---|---:|
| 최초 오류 식별 | `AC-CODE-FIRST-ERROR-01` | 8 |
| 문자열 역순 | `AC-STR-REVERSE-01` | 36 |
| Set 중복 제거 | `AC-SET-UNIQUE-01` | 41 |
| 최소값 선택 과정 | `AC-SORT-MIN-01` | 56 |
| 두 지점 조합 열거 | `AC-ENUM-PAIR-01` | 61 |

파일명은 ID의 소문자 snake case를 따른다. 예: `ac_str_reverse_01.js`.

### 4.3 역할을 두 축으로 분리

`routeRole`과 `learningRole`을 하나의 필드에 섞지 않는다.

```js
{
  routeRole: 'core',       // core | branch | capstone
  learningRole: 'anchor',  // anchor | practice | review | capstone
}
```

### 4.4 출판 상태

```text
draft → prototype → pilot → published → archived
```

- `draft`: 메타데이터만 있음
- `prototype`: Kernel과 private fixture가 있으나 학생 노출 금지
- `pilot`: 명시적으로 허용된 파일럿 사용자만 접근
- `published`: 일반 학생 Hub에 표시 및 진입 가능
- `archived`: 신규 진입 금지, 기존 증거는 보존

### 4.5 Gate 0 산출물

- Trace Event v2 계약 파일
- Learning Evidence v1 계약 파일
- Editorial Catalog Schema v1
- Python Concept Registry Schema v1
- Unlock Policy v1
- 기존 7개 Release Matrix
- ESM → CJS 생성 정책

### 4.6 Gate 0 완료 조건

- 76/20/4 합계와 성단별 분포 자동 검증
- stable ID와 catalogOrder 중복 0건
- unlock graph와 prerequisite graph 순환 0건
- CJS 파일에 generated header가 있고 직접 수정 감지
- 기존 7개 ID·버전·진도 키 회귀 없음

---

## 5. Gate 1 — Semantic Trace v2

### 5.1 범위

먼저 기존 7개에만 적용한다. 신규 5개 커널과 100개 Catalog UI는 이 Gate가 끝날 때까지 구현하지 않는다.

### 5.2 Canonical Runtime Event 계약

```js
{
  traceSchemaVersion: 2,
  eventId: 'evt_000042',
  runtimeStepIndex: 42,
  eventType: 'assignment',

  statementId: 'stmt_fn1_07',
  sourceSpan: {
    startLine: 4,
    startColumn: 5,
    endLine: 6,
    endColumn: 2,
  },

  frame: {
    frameId: 'frame_01',
    functionName: 'check_gate',
    callDepth: 0,
  },

  stateDiff: [
    {
      kind: 'write',
      path: 'total',
      objectId: null,
      before: 3,
      after: 7,
    },
  ],

  worldDiff: {},
  metadata: {},
}
```

필수 이벤트:

- `statement-enter`
- `assignment`
- `branch-decision`
- `loop-iteration`
- `container-mutation`
- `function-return`
- `runtime-error`
- `trace-truncated`

### 5.3 호환성 규칙

- v2 Normalizer는 기존 v1의 `sourceLine`, object 형태 `stateDiff`를 읽을 수 있다.
- v2 Event는 파생 필드로 `sourceLine = sourceSpan.startLine`을 제공할 수 있으나 권위 위치는 `sourceSpan`이다.
- Replay Descriptor의 `traceSchemaVersion`을 2로 올린다.
- 기존 저장 Trace는 v1로 재생하고 새 Trace를 v1로 다시 저장하지 않는다.
- `runtimeStepIndex`, `meaningfulIndex`, `sceneIndex`는 서로 다른 필드다. Projection 과정에서 앞 단계 index를 덮어쓰지 않는다.

### 5.4 이벤트 방출 규칙

| 이벤트 | 방출 시점 | 필수 metadata |
|---|---|---|
| statement-enter | AST statement 실행 직전 | 원본 statement kind |
| assignment | RHS 계산 후 LHS 기록 직후 | target path |
| branch-decision | 조건 계산 직후, body 진입 전 | 조건 결과, 선택 branch |
| loop-iteration | 각 반복 body 진입 직전 | iteration index, 현재 item의 축약값 |
| container-mutation | 지원 mutation 성공 직후 | operation, objectId, path |
| function-return | 반환값 확정 직후 | 축약된 반환값 |
| runtime-error | 안전한 오류 변환 직전 | error code, statementId |

### 5.5 Container mutation MVP

공식 지원:

- list `append`, `pop`
- deque `append`, `popleft`
- set `add`
- dict key assignment
- list/grid index assignment

이번 범위에서 제외:

- 임의 사용자 객체
- 복잡한 alias graph의 학생용 시각화
- slice mutation
- 정렬 중 내부 swap 전체 기록

Runtime 내부에는 동일 객체를 구분할 `objectId`를 둔다. alias가 있어도 같은 mutation을 변수별로 중복 기록하지 않는다. UI는 초기에 대표 변수명 하나와 “같은 상자를 가리키는 이름” 안내만 선택적으로 표시한다.

### 5.6 값 안전·비용 제한

- Event 값은 깊이·항목 수·문자 수를 제한해 snapshot한다.
- 전체 객체 복사 대신 diff를 우선한다.
- max raw event 도달 시 `trace-truncated` 1건을 남기고 추가 방출을 중단한다.
- 히든 Judge는 학생용 semantic trace를 반환하지 않는다.
- token, seed 원문, hidden input, official expected value는 metadata에 넣지 않는다.

### 5.7 3계층 Projection

```text
Semantic Runtime Events: 최대 1,500
  → Meaningful Projector: 최대 300
  → Learning Scene: Explorer 8~15, Navigator 12~30
```

`statement-enter`를 전부 학생 장면으로 표시하지 않는다.

Meaningful 선별 우선순위:

1. 첫 오류 발생 전후
2. branch 결과가 바뀌는 순간
3. 변수의 방향·부호·최댓값/최솟값이 바뀌는 순간
4. container 크기 또는 frontier가 바뀌는 순간
5. loop의 첫 회·대표 변화·마지막 회
6. function return

### 5.8 UI 동기화

새 공용 UI 단위:

- `TraceTimeline.jsx`: 장면 이동과 키보드 scrubber
- `SourceSpanHighlighter.jsx`: 단일 줄·다중 줄 강조
- `VariableWatchTable.jsx`: 현재 장면 기준 before/after
- `TraceSceneController.js`: 선택 scene의 단일 source of truth

Lens는 `scene`을 직접 해석하지 않고 Lens Adapter가 만든 view model을 받는다.

```js
const viewModel = lensAdapter.toViewModel({
  scene,
  accumulatedState,
  kernel,
})
```

CodeMode가 문제 ID별 Trace 렌더링 분기를 갖지 않도록 한다.

### 5.9 Source of truth

- 직접 수정: `runtime/sharedPythonEvaluatorCore.js`
- 생성: `functions/algorithmConstellation/sharedPythonEvaluatorCore.cjs`
- 생성 명령: `node scripts/sync-shared-evaluator-core.mjs`
- CI는 생성 전후 diff가 있으면 실패한다.
- `.cjs`의 수동 변경은 허용하지 않는다.

### 5.10 Gate 1 테스트

- 다중 줄 `if`의 정확한 `sourceSpan`
- 한 줄의 여러 statement 구분
- nested function의 `frameId/callDepth`
- assignment before/after 일치
- 100회 loop의 Runtime Event와 Learning Scene 압축
- list/deque/set/dict/index mutation
- alias objectId 안정성
- truncation 뒤 replay hash 결정성
- client/server parity
- 기존 v1 Trace 재생

### 5.11 Gate 1 완료 조건

- `AC-COND-001`, `AC-SEQ-005`, `AC-NAV-006`에서 코드·변수·Lens가 동일 장면을 가리킨다.
- 학생이 값이 처음 잘못된 장면을 뒤로 이동해 찾을 수 있다.
- 기존 7개 Judge 판정과 별 증거가 변하지 않는다.
- 1,500 raw / 300 meaningful의 성능 예산을 넘지 않는다.

---

## 6. Gate 2 — Neutral Learning Evidence

### 6.1 Family Adapter 대신 Evidence Primitive

| Primitive | 대표 사용처 |
|---|---|
| `decision` | and/or, 분기 |
| `scalar-sequence` | 주기, 누적값 |
| `container-scan` | list, string 순회 |
| `container-membership` | set, dict, visited |
| `ordered-buffer` | stack, queue |
| `enumeration` | 조합·완전탐색 |
| `grid-frontier` | BFS wave |
| `source-debug` | 최초 오류 위치·원인 |

한 문제는 여러 Primitive를 조합한다. 예를 들어 BFS는 `container-membership + ordered-buffer + grid-frontier`다.

### 6.2 Learning Evidence 계약

```js
{
  evidenceVersion: 1,
  evidenceId: 'ev_...',
  primitive: 'ordered-buffer',
  claim: '먼저 들어온 항목을 먼저 꺼내야 한다.',
  observations: [
    {
      sceneRef: { runtimeStepIndex: 18, statementId: 'stmt_09' },
      factCode: 'FIFO_REMOVE_FRONT',
      values: { inserted: 'A', removed: 'A' },
    },
  ],
  confidence: 'observed',
  publicSafe: true,
}
```

금지:

- AI용 문구를 Evidence에 저장
- 오개념을 학생의 확정된 속성처럼 저장
- hidden input/expected output 저장
- 문제 고유 변수명에 의존한 필수 필드

### 6.3 Evidence Recipe

각 Kernel은 필요한 Evidence 조합만 선언한다.

```js
evidenceRecipe: {
  primitives: ['ordered-buffer', 'container-membership', 'grid-frontier'],
  requiredClaims: ['FIFO_ORDER', 'VISIT_ON_ENQUEUE', 'FRONTIER_EXPANDS_BY_LEVEL'],
}
```

### 6.4 소비자 분리

```text
LearningEvidence[]
  ├─ Rule-based Misconception Matcher
  ├─ Scaffold Selector
  ├─ Understanding Check
  ├─ Lens explanation
  └─ External AI Prompt Builder
```

AI Prompt Builder는 Evidence 소비자일 뿐 권위 계층이 아니다. AI 기능을 제거해도 진단과 Scaffold가 작동해야 한다.

### 6.5 오염 방지

- `gateOpen`, `s1`, `s2` 같은 필드는 condition recipe 안에서만 허용한다.
- 알 수 없는 primitive는 condition으로 fallback하지 않고 명시적으로 `unsupported` 처리한다.
- Prompt 제목·학습 목표·장면 문구는 Kernel과 Evidence에서 가져온다.
- Prompt Builder는 문제 ID switch를 갖지 않는다.

### 6.6 Gate 2 완료 조건

- 기존 7개가 Primitive Recipe만으로 Evidence를 생성한다.
- AI Prompt를 끈 상태에서도 같은 misconception candidate와 scaffold proposal이 나온다.
- condition 문구가 PAT/SEQ/NAV 프롬프트에 섞이지 않는다.
- 모든 Prompt에서 개인정보·hidden·완성 정답 누출이 없다.

---

## 7. Gate 3 — Python First Encounter

### 7.1 Registry 계약

신규 파일 권장:

- `shared/python/pythonConceptRegistry.js`
- `shared/contracts/pythonConceptSchema.js`
- `client/scaffold/FirstEncounterCard.jsx`
- `client/scaffold/firstEncounterResolver.js`

```js
{
  conceptId: 'builtin:set',
  displayName: 'set',
  kind: 'builtin-type',
  canonicalFirstProblemId: 'AC-SET-UNIQUE-01',
  why: '중복된 값을 한 종류로 모을 때 사용해요.',
  tinyExample: ['철', '철', '얼음'],
  syntaxExample: 'kinds = set(items)',
  predictionCheck: {
    prompt: '서로 다른 종류는 몇 개일까요?',
    answerType: 'number',
    expected: 2,
  },
  protocolRepairId: 'PR-SET-001',
}
```

Kernel 계약:

```js
pythonConcepts: {
  requires: ['builtin:list', 'statement:for'],
  introduces: ['builtin:set'],
}
```

### 7.2 최초 등장 UX

```text
왜 필요한가
→ 작은 움직임 예시
→ Python 표기
→ 10초 예측 확인
→ 원래 문제 복귀
```

장문의 문서나 정답 코드를 보여주지 않는다. First Encounter 완료는 학습 지원 증거로 기록할 수 있지만 Mastery를 직접 부여하지 않는다.

### 7.3 검증 규칙

- `requires`가 앞선 Core 경로 또는 동일 문제의 First Encounter로 충족되는지 검사
- `introduces`의 Registry entry 존재 검사
- 같은 concept의 canonical first 문제 중복 검사
- 새로운 module/function/method/builtin/operator가 설명 없이 코드에 먼저 등장하는지 정적 검사
- Branch를 먼저 방문한 학생에게도 최초 Encounter가 표시되는 동적 검사

### 7.4 Gate 3 완료 조건

- `%`, slicing, `set`, `deque`, `append`, `popleft`, `range` 대표 카드가 동작한다.
- 이미 이해 확인을 마친 도구는 매번 강제로 재노출하지 않는다.
- Protocol Repair가 해당 concept의 짧은 복습으로 연결된다.

---

## 8. Gate 4 — 신규 5개 Capability 원형

한 PR에서 한 원형만 추가한다. 각 원형은 이전 원형의 엔진 변경을 전제로 삼지 않고 capability delta를 명시한다.

### 8.1 구현 순서

#### 1. `AC-CODE-FIRST-ERROR-01`

- 목표: 틀린 결과가 아니라 처음 잘못된 실행 순간을 찾기
- 검증: `source-debug`, Trace scrubber, 원인 장면 micro-evidence
- 새 Capability: code review mode
- 금지: 오류 줄 번호를 답으로 바로 제공

#### 2. `AC-STR-REVERSE-01`

- 목표: 문자열을 끝에서 처음 방향으로 순회
- 검증: `container-scan`, string indexing/range
- 재사용: Sequence Lens
- First Encounter: negative step 또는 안전한 역방향 range 중 선택한 하나만 소개

#### 3. `AC-SET-UNIQUE-01`

- 목표: 중복 제거의 필요를 경험한 뒤 set을 이름 붙임
- 검증: `container-membership`, set mutation
- First Encounter 대표 원형
- 금지: Observe 시작부터 `set(items)` 제시

#### 4. `AC-SORT-MIN-01`

- 목표: 미정렬 구간에서 최소를 골라 앞으로 옮기는 반복 전략
- 검증: scan + decision + container mutation
- 이름 공개: 경험 뒤 “선택 정렬” 명명
- 금지: 정렬 알고리즘 암기 중심 설명

#### 5. `AC-ENUM-PAIR-01`

- 목표: 가능한 두 지점 쌍을 빠짐없이 한 번씩 비교
- 검증: enumeration, nested loop, 중복 조합 방지
- 금지: 재귀 도입. R4 결정 전에는 bounded nested loop 사용

### 8.2 원형별 필수 산출물

- Public Kernel
- Private Definition
- 공식 풀이 fixture와 의도된 오답 최소 3종
- Public/Diagnostic/Hidden test group
- Evidence Recipe
- Scaffold S1~S5/Rescue 또는 역할에 맞는 축소형
- First Encounter 선언
- Understanding Evidence
- Fresh Transfer
- Lens config
- provenance record
- 접근성 copy

### 8.3 원형별 중단 관문

다음 중 하나면 다음 원형으로 넘어가지 않는다.

- MissionShell에 problemId 분기를 추가해야 함
- Judge 엔진에 problemId 분기를 추가해야 함
- Hub 배열에 수동 스타일 객체를 추가해야 함
- evaluator의 client/server 파일을 각각 수정해야 함
- Practice 성격인데 새 bespoke Lens가 필요함
- 신규 Python 문법의 parity fixture가 없음

### 8.4 Gate 4 완료 조건

- 12개 원형의 공식 풀이와 의도된 오답 판정이 서버에서 검증된다.
- 각 원형의 capability delta가 문서화된다.
- 기존 7개의 Trace, Evidence, 별, 귀환 흐름이 회귀하지 않는다.
- 12개를 기준으로 evaluator 유지 또는 Python runtime 이전 결정을 확정한다.

---

## 9. Gate 5 — Editorial Catalog 100과 Hub

### 9.1 파일과 책임

권장 파일:

- `shared/catalog/algorithmEditorialCatalog.js`
- `shared/catalog/constellationRegistry.js`
- `shared/catalog/lensRegistry.js`
- `shared/catalog/transferFamilyRegistry.js`
- `shared/contracts/editorialCatalogSchema.js`
- `shared/contracts/unlockPolicySchema.js`

Catalog는 Kernel 객체 100개를 import하지 않는다. `kernelRef`로 공개 Kernel registry와 연결한다.

### 9.2 Catalog entry

```js
{
  problemId: 'AC-SET-UNIQUE-01',
  catalogOrder: 41,
  constellationId: 'records',
  studentTitle: '서로 다른 광물은 몇 종?',

  routeRole: 'core',
  learningRole: 'anchor',
  status: 'prototype',
  kernelRef: 'AC-SET-UNIQUE-01@v1',

  fingerprint: {
    concept: 'deduplicate-by-membership',
    inputShape: 'short-token-sequence',
    transformation: 'many-to-unique',
  },

  prerequisites: ['AC-SEQ-005'],
  requiredPythonConcepts: ['builtin:list', 'statement:for'],
  introducedPythonConcepts: ['builtin:set'],
  lensIds: ['membership-board'],
  evidencePrimitives: ['container-membership'],
  transferFamilyId: 'TF-UNIQUE-CATEGORY-01',

  provenance: {
    sourceType: 'original',
    rightsStatus: 'original',
    sourcePlatform: null,
    sourceProblemId: null,
    sourceUrl: null,
    adaptationNotes: 'MetaSense original scenario and test design',
    reviewedAt: 'YYYY-MM-DD',
  },
}
```

### 9.3 provenance 허용값

```text
sourceType: original | inspired | licensed-adaptation
rightsStatus: original | reference-only | licensed | review-required
```

`reference-only`는 아이디어 조사 참고 상태이며 해당 원문의 문장·데이터·테스트를 출판 콘텐츠로 복제할 수 있다는 의미가 아니다. `review-required`는 publish를 차단한다.

### 9.4 Catalog와 Kernel의 분리

- 100개 entry는 모두 존재할 수 있다.
- Kernel은 실제 구현된 12개부터 존재한다.
- `draft` entry는 `kernelRef: null`을 허용한다.
- `prototype/pilot/published`는 유효한 Public Kernel과 Private Definition을 요구한다.
- `published`만 일반 학생의 시작 버튼을 활성화한다.

### 9.5 Unlock 계약

성단 0~8:

```js
{
  requiredAnchorIds: ['...'],
  minimumCoreCompleted: 6,
  coreProblemCount: 8,
  branchRequired: false,
}
```

판정은 서버 progress summary 또는 서버가 서명한 집계에서 수행한다. Client는 표시만 담당한다. 단일 문제를 완료했다고 전체 성단 unlock을 클라이언트가 확정하지 않는다.

### 9.6 학생 Hub

- 10개 고정 탭 대신 현재 성단 중심 지도
- 앞 성단, 현재 성단, 다음 성단을 우선 표시
- 선택한 성단 안에서 `본 항로 / 선택 항로` 필터
- Anchor/Practice/Review/Capstone badge
- `published`: 진입 가능
- `pilot`: 허용 사용자만 진입
- `draft/prototype`: 학생에게 숨김
- 미래 성단: 제목·분위기 정도만 coming soon으로 표시 가능

교사·관리자 Catalog 화면에서는 10개 성단 전체 표와 상태 필터를 허용한다.

### 9.7 Gate 5 완료 조건

- 100개 분포가 정확히 76/20/4다.
- 성단 0~8은 각각 8 Core/2 Branch, 성단 9는 4/2/4다.
- 모든 prerequisite와 requiredAnchor가 존재하고 순환이 없다.
- `published` entry는 Public Kernel·Private Judge·First Encounter·provenance 조건을 모두 충족한다.
- 기존 7개 진도는 migration 없이 같은 problemId로 보인다.
- Hub에 미구현 문제의 시작 버튼이 나타나지 않는다.

---

## 10. 자동 검증 설계

### 10.1 신규 테스트 파일 권장

| 파일 | 검증 |
|---|---|
| `test-semantic-trace-v2-contract.mjs` | event schema, sourceSpan, frame, diff, truncation |
| `test-trace-learning-projection-v2.mjs` | Runtime→Meaningful→Learning index와 압축 |
| `test-learning-evidence-contract.mjs` | Primitive/Recipe, public-safe, 소비자 독립 |
| `test-cross-problem-contamination.mjs` | 조건 전용 필드·문구가 다른 계열에 섞이지 않음 |
| `test-python-first-encounter.mjs` | 신규 Python 개념 최초 등장 누락 없음 |
| `test-editorial-catalog-integrity.mjs` | 100개, 76/20/4, order, provenance, status |
| `test-catalog-private-judge-parity.mjs` | pilot/published의 Public/Private 등록 일치 |
| `test-constellation-unlock-policy.mjs` | Anchor+6/8, Branch 비필수, Capstone 접근 |
| `test-prototype-capability-matrix.mjs` | 12개 공식/오답 fixture와 R0~R3 |
| `test-evaluator-generated-artifact.mjs` | ESM→CJS 생성물 drift 방지 |

### 10.2 기존 테스트 보강

- bundle leak: hidden tests, official solution, transfer answer, private provenance note
- client/server parity: string, set, nested loop, slicing 또는 선택한 역순 문법, range
- sandbox resilience: semantic event 폭주와 깊은 값 snapshot
- gateway contract: archived/pilot/published 접근 정책
- phase3 scaffold: Evidence Recipe 기반 선택과 First Encounter 연계

### 10.3 기기·접근성 Acceptance

최소 화면:

- iPad landscape
- Samsung 계열 10~11인치 tablet landscape
- 1366×768 laptop

확인:

- editor, Lens, Trace, Hint, Run의 동시 배치
- Timeline을 터치와 키보드로 이동
- 다중 줄 source span이 작은 화면에서도 식별 가능
- focus order와 screen reader label
- reduced motion에서 자동 재생 대신 명시적 이동
- 가상 키보드 표시 후 제출 버튼 접근

### 10.4 실행 순서

```bash
node scripts/sync-shared-evaluator-core.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

문서·Schema만 변경한 PR도 Catalog/Contract 테스트를 실행한다.

---

## 11. 구현 PR 분할

한 PR이 여러 Gate를 섞지 않도록 한다.

| PR | 범위 | Merge 조건 |
|---|---|---|
| 0 | 계약, stable ID, 76/20/4, 상태·provenance | Gate 0 테스트 |
| 1 | Trace v2 schema·normalizer·source mapping | 기존 v1 호환 |
| 2 | Runtime event emission·ESM/CJS 생성 | parity·budget |
| 3 | Meaningful/Learning projector·Trace UI | 기존 7개 대표 3종 동기화 |
| 4 | Evidence Primitive·Recipe·소비자 분리 | AI 없이 진단·Scaffold 작동 |
| 5 | Python Concept Registry·First Encounter | coverage test |
| 6 | CODE prototype | source-debug Gate |
| 7 | STR prototype | R1 Gate |
| 8 | SET prototype | R2 membership Gate |
| 9 | SORT prototype | scan/mutation Gate |
| 10 | ENUM prototype | bounded nested enumeration Gate |
| 11 | 12개 동결·Runtime ADR | 유지/이전 결정 |
| 12 | 100개 draft Catalog·Validator | integrity·rights Gate |
| 13 | 학생 Hub 지도·unlock 표시 | server authority·device QA |

PR 6~10에서 공용 엔진 수정이 필요하면 해당 변경을 먼저 독립 PR로 분리하고, 이후 원형 PR은 데이터·fixture 중심이어야 한다.

---

## 12. Definition of Done

### 12.1 이 구현 계획 전체의 완료

다음을 모두 만족해야 한다.

- 기존 7개가 실제 Semantic Trace v2를 사용한다.
- 12개 원형이 Public Kernel·Private Judge·Evidence·Transfer까지 동결된다.
- Python 새 도구가 First Encounter 없이 등장하지 않는다.
- 100개 Editorial Catalog는 76/20/4, provenance, status, prerequisite 규칙을 통과한다.
- 일반 학생은 `published` 문제만 시작할 수 있다.
- 학생 Hub는 hard-coded mission 배열이 아니라 Catalog projection을 사용한다.
- Client/Server evaluator가 하나의 원본에서 생성되고 parity를 통과한다.
- 초등·중등 파일럿 전까지 Arena·Crew·대형 교사 Dashboard가 핵심 경로를 방해하지 않는다.

### 12.2 새 문제 1개의 확장성 완료

새 Practice를 추가할 때 다음 파일을 수정하지 않아야 한다.

- `AlgorithmMissionShell.jsx`
- Judge 실행 엔진
- Time-Travel core
- Progress service
- 학생 Hub component

정상적으로 추가되는 것은 다음뿐이어야 한다.

- Public Kernel 데이터
- Private test/transfer definition
- Catalog entry
- 기존 Lens의 visual config
- Evidence Recipe
- misconception/scaffold fixture
- provenance record

### 12.3 중단 조건

다음 중 하나면 20개 Wave로 넘어가지 않는다.

- 신규 Practice 중앙 제작시간이 1.5인일 초과
- 원형마다 새 evaluator 문법 예외가 발생
- cross-problem contamination 재발
- Trace와 Judge의 실행 의미가 다름
- 12개 파일럿에서 학생이 Trace의 앞뒤 이동 의미를 이해하지 못함
- First Encounter가 문제 흐름을 과도하게 끊어 중단률을 높임
- 권리 검토 미완료 문제를 수량 목표 때문에 publish하려 함

---

## 13. 구현자가 먼저 확인할 체크리스트

### 계약

- [ ] 이번 변경은 어느 Gate에 속하는가?
- [ ] stable problemId와 catalogOrder를 혼동하지 않았는가?
- [ ] public/private 경계를 침범하지 않았는가?
- [ ] 저장된 v1 Trace와 기존 진도를 깨지 않는가?

### Trace

- [ ] 실제 AST statement에서 sourceSpan이 나오는가?
- [ ] runtimeStepIndex를 projection에서 덮어쓰지 않는가?
- [ ] 반복을 학생 장면으로 그대로 노출하지 않는가?
- [ ] 값 snapshot 크기와 event 수가 제한되는가?

### Evidence·AI

- [ ] Evidence가 문제 고유 변수명 없이도 의미를 보존하는가?
- [ ] AI를 꺼도 진단과 Scaffold가 작동하는가?
- [ ] Prompt에 정답·hidden·PII가 없는가?
- [ ] 다른 문제의 문구가 섞일 fallback이 없는가?

### 콘텐츠

- [ ] 새 Python 도구가 Registry에 있는가?
- [ ] 학생은 조작·발견 후 이름을 만나는가?
- [ ] Anchor/Practice 역할에 맞는 제작비인가?
- [ ] provenance와 adaptationNotes가 있는가?

### UI·운영

- [ ] published 상태만 일반 진입 가능한가?
- [ ] unlock은 서버 권위 결과인가?
- [ ] tablet과 keyboard에서 사용할 수 있는가?
- [ ] 장애 시 코드와 시도 증거가 보존되는가?

---

## 14. 최종 구현 순서

```text
Gate 0  계약 동결
  ↓
Gate 1  기존 7개 Semantic Trace v2
  ↓
Gate 2  Neutral Evidence Primitive
  ↓
Gate 3  Python First Encounter
  ↓
Gate 4  신규 원형 5개 순차 구현
  ↓
12개 Runtime Decision 및 동결
  ↓
Gate 5  100개 draft Catalog + 학생 Hub projection
  ↓
초등·중등 학생 파일럿
  ↓
Core 20 양산 승인
```

이 순서를 바꾸어 100개 Catalog UI나 신규 커널부터 대량 구현하지 않는다. LUMI 알고리즘 성단의 구현 성공은 문제 개수가 아니라 **Trace·Evidence·Concept·Catalog라는 공용 계약이 새 문제에서도 수정 없이 재사용되는가**로 판정한다.
