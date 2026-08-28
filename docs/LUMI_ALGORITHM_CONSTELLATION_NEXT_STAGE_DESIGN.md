# LUMI 알고리즘 성단 — 다음 단계 상세 설계

> Phase 0.5 Hardening → Phase 1 최소 실행 엔진 → Phase 2 `AC-COND-001` 완결 Vertical Slice

- 문서 상태: 구현 전 설계 기준안
- 작성일: 2026-08-28
- 상위 문서: `docs/LUMI_ALGORITHM_CONSTELLATION_MASTER_PLAN.md`
- 적용 범위: 알고리즘 성단의 보안 경계, 실행 엔진, 저장 모델, 첫 문제의 학습 흐름
- 제외 범위: 실제 코드 작성, 12문제 확장, BFS/Data Lens, 외부 AI API 연동, 정식 Arena 출시

---

## 1. 결론

다음 단계는 UI 기능 확장이 아니라 **권위 경계와 실행 증거를 먼저 완성하는 것**이다.

현재의 계약·UI 초안은 유지하되, 아래 순서를 고정한다.

```text
Phase 0.5R — 신뢰 경계 복구
  → Phase 1A — 학생 RUN Sandbox
  → Phase 1B — 서버 SUBMIT Judge·저장
  → Phase 1C — Replay·Trace 증거
  → Phase 2 — AC-COND-001 완결 학습 루프
  → 이후 Phase 3 Scaffold / Phase 6 AI Coach / Phase 7 Arena
```

가장 중요한 제품 규칙은 다음 세 문장이다.

1. 브라우저는 빠르게 보여주지만 최종 성취를 판정하지 않는다.
2. 서버는 학생이 보낸 결과가 아니라 학생 코드와 서버 증거를 다시 검증한다.
3. AI 도움은 학습을 막지 않지만 랭킹과 독립 Mastery를 즉시 확정하지 않는다.

---

## 2. 현재 기준선과 처리 결정

| 현재 요소 | 판단 | 다음 단계 처리 |
| --- | --- | --- |
| Public Problem Kernel | 유지 | 학생 번들에 안전한 필드만 허용 |
| `functions/algorithmConstellation/privateProblemCatalog.cjs` | 방향 채택 | Functions 배포 단위 안에서만 접근 |
| Client가 Functions Judge 모듈을 직접 import | 폐기 | Firebase Callable Gateway로 교체 |
| `execFileSync('python3')` Judge | 폐기 | 배포 환경에 고정된 단일 Sandbox Runtime 사용 |
| Python을 JavaScript `new Function`으로 바꾸는 fallback | 즉시 금지 | Judge 장애 시 실패 폐쇄, 성취 미부여 |
| Sandbox limit/guard 유틸 | 유지 | 실제 Worker 계측과 terminate/recreate에 연결 |
| AI Prompt Builder·확인 Modal | 보류 유지 | Trace와 서버 Assistance 기록 완성 뒤 활성화 |
| Vertical Slice UI | 프로토타입으로 유지 | 서버 상태·FSM 계약에 맞춰 재연결 |
| Bundle 문자열 검사 | 보강 | import 경계, production bundle, sourcemap까지 검사 |
| 로컬 객체 기반 Progress | 폐기 | 서버 transaction 기반 저장으로 교체 |

### 2.1 다음 단계에서 절대 허용하지 않는 것

- `src/`에서 `functions/algorithmConstellation/**` 직접 import
- 클라이언트가 `stars`, `rankEligible`, `masteryStatus`, `variantSeed`, `userId`, 서버 timestamp를 결정
- 클라이언트가 public/hidden test 전체나 expected output을 서버로 전달
- Judge가 실행 실패 시 더 약한 evaluator로 자동 fallback
- Shared Kernel에 정답 코드, 대표 풀이, 오답 fixture, hidden/transfer expected 포함
- AI Prompt 복사 뒤 같은 문제를 즉시 다시 제출해 독립 Mastery 회복
- UI 탭 이동만으로 학습 상태 또는 증거가 완료 처리됨

---

## 3. 목표 시스템 구조

```text
┌──────────────────────────── Browser ────────────────────────────┐
│ Public Kernel                                                    │
│ Mission Shell / FSM                                              │
│ Student Runtime Client ── Web Worker + pinned Pyodide            │
│ Public RUN / Student Trace / Timeline / Prompt Preview           │
│ Submission Gateway ── Firebase Callable SDK                      │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Auth + App Check + attemptId
┌──────────────────────────────▼───────────────────────────────────┐
│ Firebase Callable Orchestrator                                   │
│ startAttempt / recordAssistance / submitBase / submitEvidence    │
│ issueTransfer / submitTransfer / getProgress                     │
│ - 인증 UID 결합                                                  │
│ - 요청 크기·상태 전이·멱등성 검증                                │
│ - Firestore transaction                                          │
│ - HMAC variant seed·challenge token                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │ server-to-server authenticated call
┌──────────────────────────────▼───────────────────────────────────┐
│ Isolated Judge Runtime                                           │
│ Private Problem Catalog / Hidden Tests / Transfer Master Set      │
│ pinned Python runtime / no network / resource caps / no fallback │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Browser의 책임

- 학생이 읽을 문제·스토리·starter code 표시
- Public Test를 이용한 빠른 RUN
- Student Trace 생성과 Time-Travel 표시
- 힌트·Parsons·AI Prompt 복사 요청 전송
- 서버가 반환한 최소 결과를 표시

Browser가 하지 않는 일:

- Hidden Test 실행
- 별·랭킹·Mastery 확정
- Fresh Transfer 선택
- 보상 지급
- Assistance 기록 삭제·수정

### 3.2 Callable Orchestrator의 책임

- `context.auth.uid`를 유일한 사용자 식별자로 사용
- Attempt 상태 머신을 서버에서 검증
- Private Problem Catalog version 확인
- Judge 요청 생성 및 결과 검증
- Attempt event journal 기록
- Progress·보상·귀환 예약 transaction
- 클라이언트에 최소 결과만 반환

### 3.3 Judge Runtime의 책임

- 제출된 Python source를 고정된 동일 runtime에서 실행
- 서버가 선택한 public/hidden/transfer case만 사용
- 시간·step·출력·메모리·import·network 제한
- 각 test를 깨끗한 process 또는 격리 context에서 실행
- 결과를 test group 단위로만 Orchestrator에 반환

---

## 4. Public/Private Problem 계약

### 4.1 Public Kernel

브라우저 번들에 포함 가능하다.

```text
identity
learning.objective / thinkingSkills / concepts / prerequisites
shells.explorer / navigator / pro
modes.observe / explore / code.starterCode
runtime.publicLimits / worldModel
assessment.publicTests
assessment.hiddenTestsRef       # opaque reference only
assessment.transferFamily       # 이름만, 실제 문제·expected 없음
scaffolding.publicPolicy
```

금지 필드:

```text
solutionCode
officialSolutionCode
canonicalStrategy
alternativeStrategies
intendedWrongSolutions.code
hiddenTests
transferMasterSet
secretMatcher
rewardPolicy internals
```

### 4.2 Private Definition

Functions/Judge 배포물 안에만 존재한다.

```text
problemId + problemVersion
entrypoint schema
official and alternative solution fixtures
hidden test groups
transfer challenge templates and expected values
misconception mutation fixtures
judge limits
generatorVersion
publish metadata and checksum
```

### 4.3 버전 규칙

- 키는 반드시 `(problemId, problemVersion)` 복합키다.
- 요청 version이 없으면 최신 버전으로 암묵 대체하지 않는다.
- 존재하지 않는 version은 `FAILED_PRECONDITION`으로 종료한다.
- 출판 후 test 의미가 바뀌면 version을 증가시킨다.
- Attempt에는 시작 시점의 모든 runtime version과 private definition checksum을 고정한다.

---

## 5. 서버 API 계약

모든 API는 Firebase Callable을 기준으로 한다. 입력의 `userId`는 무시하는 것이 아니라 **아예 받지 않는다**.

### 5.1 `startAlgorithmAttempt`

입력:

```json
{
  "problemId": "AC-COND-001",
  "problemVersion": 1,
  "shell": "explorer",
  "intent": "learn"
}
```

서버 처리:

- 인증·App Check 확인
- 문제 version과 학생 진입 조건 확인
- HMAC 기반 variant seed 생성
- attempt session 생성
- replay descriptor 고정

반환:

```json
{
  "attemptId": "opaque-id",
  "attemptToken": "short-lived-signed-token",
  "publicVariant": {},
  "replayDescriptor": {},
  "policy": {
    "rankMode": "learn",
    "assistanceAllowed": true
  },
  "expiresAt": 0
}
```

### 5.2 `recordAlgorithmAssistance`

입력:

```json
{
  "attemptId": "opaque-id",
  "eventId": "client-generated-idempotency-id",
  "source": "hint | parsons | micro-repair | external-ai",
  "stage": "problem-reading | strategy | implementation | debugging",
  "scaffoldLevel": 0,
  "answerExposure": "none | partial | full | unknown"
}
```

서버 처리:

- Attempt 소유권과 진행 상태 확인
- eventId 중복이면 기존 결과 반환
- Assistance event append-only 기록
- `external-ai`이면 즉시 `rankEligible=false`, `masteryEligible=false`

AI Prompt 복사는 이 API가 성공한 뒤에만 clipboard를 실행한다. 서버 기록 실패 시 Prompt 원문을 공개하지 않는다.

### 5.3 `submitAlgorithmBase`

입력:

```json
{
  "attemptId": "opaque-id",
  "submissionId": "idempotency-id",
  "code": "student Python source",
  "clientRunEvidence": {
    "codeHash": "sha256",
    "studentTraceHash": "sha256",
    "runtimeVersion": "pinned-version"
  }
}
```

서버가 자체적으로 가져오는 정보:

- UID, problem/version, variant seed
- public/hidden tests
- runtime limits
- Assistance·AI·integrity history

반환:

```json
{
  "status": "passed | failed | judge_unavailable",
  "resultStar": true,
  "testGroups": [
    { "group": "single_active", "passed": 1, "total": 2 }
  ],
  "diagnosticCodeCandidates": ["COND-AND-OR-01"],
  "nextAction": "understanding_check"
}
```

반환 금지:

- Hidden input·expected·actual 원문
- Private source line·harness·stack trace
- 전체 private test 개수와 식별 가능한 test ID

### 5.4 `submitUnderstandingEvidence`

- 서버가 발급한 `challengeId`에 대한 학생 응답만 받는다.
- challenge의 정답, 유형, 만료 상태는 서버가 확인한다.
- Observe 단계의 예측은 학습 데이터로 보존하지만 Star 2는 제출 직후 발급한 fresh micro-evidence로 최종 확인한다.

### 5.5 `issueTransferChallenge`

- Star 1과 Star 2가 충족된 Attempt에만 발급한다.
- 같은 base 코드에 매개변수만 붙인 자동 변환 코드를 만들지 않는다.
- 학생에게 새 스토리, 함수 signature, 공개 예제만 제공한다.
- challenge token은 attemptId, transferFamily, variant, expiry에 서명한다.

### 5.6 `submitAlgorithmTransfer`

- 학생이 별도로 작성한 transfer code를 서버 Judge가 평가한다.
- 성공 시 Star 3 후보가 된다.
- AI 도움·integrity·귀환 조건에 따라 `mastered` 또는 `pending_independent_return`을 서버가 결정한다.

### 5.7 `getAlgorithmProgress`

- 학생: 본인 progress와 귀환 일정
- 연결 학부모·교사: 요약 지표만
- source code, hidden 결과, 세부 integrity event는 기본 반환하지 않는다.

---

## 6. Student RUN Sandbox 설계

기존 `PythonRuntimeClient`의 Worker timeout·terminate·recreate 구조를 재사용하되 알고리즘 성단 전용 adapter를 둔다.

### 6.1 생명주기

```text
UNLOADED → BOOTING → READY → RUNNING
                         ├─ SUCCESS → READY
                         ├─ USER_ERROR → READY
                         └─ LIMIT/CRASH → TERMINATING → RECREATING → READY
```

- Pyodide boot 시간과 학생 코드 실행 시간을 분리 측정한다.
- timeout 시 현재 요청만 reject하는 것으로 끝내지 않고 Worker를 반드시 폐기한다.
- 복구 뒤 학생의 편집 코드와 공개 RUN history는 UI에서 유지한다.
- 이전 실행의 Python globals와 virtual FS가 다음 실행에 남지 않게 한다.

### 6.2 실제로 강제할 제한

| 영역 | 강제 지점 | 초과 시 |
| --- | --- | --- |
| wall-clock | Worker client timer | Worker terminate/recreate |
| step | AST instrumentation `_lumi_tick(line)` | `MAX_STEPS` |
| stdout | write 시 byte counter | 출력 중단·친절한 오류 |
| raw event | event emitter | trace 종료 또는 실행 중단 |
| meaningful event | projector | 압축·truncated marker |
| import | AST preflight + restricted importer | `IMPORT_DENIED` |
| memory | serialization cap + runtime/container cap | Worker 폐기 |
| recursion | recursion limit | `MAX_RECURSION` |
| JS bridge | Pyodide capability 미노출 | 접근 불가 |
| network | fetch/socket module 제거·차단 | `NETWORK_DENIED` |

### 6.3 AST 계측 원칙

- `for`, `while`, 함수 진입, 조건 평가에 tick을 삽입한다.
- 학생 source line을 보존하도록 line mapping을 별도 유지한다.
- harness/prelude line은 Student Trace에서 제외한다.
- instrumentation 결과는 학생에게 다시 source code처럼 보여주지 않는다.
- AST parse 실패는 Syntax Error로 반환하고 Judge 오류로 취급하지 않는다.

### 6.4 Sandbox fixture

반드시 자동 검증할 코드:

- `while True` 무한 루프
- 무한 출력 및 한글 multi-byte 경계 출력
- `list(range(10**9))`
- 깊은 재귀
- `import os`, `sys`, `socket`, `js`, 동적 import
- file open/read/write
- exception으로 private harness 탐색
- 이전 실행 globals 탈취
- timeout 직후 정상 코드 재실행

---

## 7. Authoritative Judge 설계

### 7.1 Runtime 결정

Judge에는 단일 runtime만 사용한다.

권장 구조:

```text
Firebase Callable Orchestrator
  → 인증된 내부 Judge Service
  → pinned Python/WASM runtime in disposable worker
```

첫 시즌에는 브라우저와 서버 모두 같은 Python·interpreter version을 고정한다. 서버에서 Python 실행이 불가능하면 JavaScript 번역 fallback을 사용하지 않고 `JUDGE_UNAVAILABLE`을 반환한다.

### 7.2 격리 원칙

- 제출마다 깨끗한 disposable context
- network capability 없음
- read-only base filesystem + 최소 임시 메모리
- OS command·subprocess·thread 금지
- source length, AST size, argument/result serialization cap
- 각 test 독립 실행 또는 state reset
- timeout·memory breach는 해당 submission을 실패 처리하고 runner 폐기

### 7.3 결과 정책

오류를 다음처럼 분리한다.

| 코드 | 의미 | 학생 표시 | 별 처리 |
| --- | --- | --- | --- |
| `SYNTAX_ERROR` | 학생 문법 오류 | 학생 line 중심 안내 | 미부여 |
| `RUNTIME_ERROR` | 학생 실행 오류 | 안전한 요약 | 미부여 |
| `WRONG_RESULT` | test group 실패 | group 의미만 | 미부여 |
| `LIMIT_EXCEEDED` | 시간·step·출력 초과 | 개선 질문 | 미부여 |
| `JUDGE_UNAVAILABLE` | 서버 장애 | 잠시 뒤 재시도 | 기존 성취 보존 |
| `CONTRACT_MISMATCH` | version/runtime 불일치 | 새 시도 안내 | 판정 없음 |

Judge 장애는 학생 오답으로 기록하지 않는다.

---

## 8. Replay·Trace 계약

### 8.1 Canonical Event

모든 계층에서 필드명을 하나로 고정한다.

```json
{
  "stepIndex": 12,
  "eventType": "condition_eval",
  "sourceLine": 4,
  "stateDiff": {},
  "worldDiff": {},
  "metadata": {}
}
```

- `type`과 `eventType`을 혼용하지 않는다.
- wall-clock timestamp는 재생 순서의 근거로 사용하지 않는다.
- `stepIndex`는 실행 순서, `sceneIndex`는 학습 장면 순서다.

### 8.2 3-Tier Projection

```text
Normalized Raw Event
  → Meaningful Event
  → Learning Scene
```

- 반복은 첫 값·마지막 값·횟수·step range를 보존한다.
- 오류, 조건 분기, world action, 자료구조 push/pop은 필수 장면이다.
- 장면이 30개를 넘으면 중요도와 구간 균형으로 줄인다.
- meaningful event가 충분한데 핵심 장면이 12개 미만이면 비어 있는 구간에서 보충한다.
- 원래 meaningful event 자체가 12개 미만이면 허위 장면을 만들지 않는다.
- checkpoint는 기본 25 meaningful steps마다 만들고 임의 seek 시 diff를 재적용한다.

### 8.3 Replay Descriptor

고정 필드:

```text
problemId / problemVersion
attemptFamilyId / variantSeed / generatorVersion
codeHash / initialWorldStateHash
runtimeVersion / interpreterVersion / traceSchemaVersion
privateDefinitionChecksum
```

- 런타임 필드는 호출자 데이터로 덮어쓸 수 없다.
- 서버 제출 시 descriptor hash를 Attempt에 기록한다.
- 같은 descriptor와 code에서 normalized trace hash가 동일해야 한다.

---

## 9. 저장 모델과 보상 Transaction

### 9.1 컬렉션

```text
algorithmAttemptSessions/{attemptId}                  # 서버 전용, 진행 중 orchestration
users/{uid}/algorithmAttempts/{attemptId}              # 완료된 불변 요약
users/{uid}/algorithmAttempts/{attemptId}/events/{id}  # append-only evidence journal
users/{uid}/algorithmProgress/{problemId}              # 가변 요약
algorithmRewardLedger/{idempotencyKey}                 # 서버 전용 보상 원장
algorithmReturnQueue/{returnId}                        # 서버 전용 독립 귀환 예약
```

### 9.2 Attempt Session 상태

```text
STARTED
→ BASE_SUBMITTED
→ BASE_PASSED
→ UNDERSTANDING_PASSED
→ TRANSFER_ISSUED
→ TRANSFER_SUBMITTED
→ FINALIZED
```

예외 상태:

```text
EXPIRED / ABANDONED / JUDGE_RETRYABLE / INTEGRITY_TERMINATED
```

서버 transaction은 이전 상태와 허용 transition을 비교한다. 클라이언트가 단계를 건너뛴 요청은 거부한다.

### 9.3 완료 Attempt 불변 필드

```text
attemptId / uid / problemId / problemVersion
intent / shell / variant descriptor
codeHash / optional retainedCodeRef
assistanceSummary / aiResearchSummary / integritySummary
star evidence / rank eligibility / mastery eligibility
misconception evidence
runtime and replay versions
startedAt / finalizedAt as server timestamps
```

중첩 객체는 정규화된 새 객체로 저장한다. JavaScript `Object.freeze`를 데이터 불변성의 근거로 사용하지 않는다.

### 9.4 Firestore Rules

- 위 알고리즘 컬렉션은 클라이언트 write를 전부 금지한다.
- 학생은 자신의 progress와 완료 Attempt 요약만 읽는다.
- 연결 학부모는 progress 요약을 읽을 수 있지만 source code와 integrity event는 읽지 못한다.
- 교사·운영자 세부 접근은 별도 claim과 감사 로그를 요구한다.

### 9.5 보상

하나의 Firestore transaction에서 다음을 함께 처리한다.

1. 완료 Attempt 생성
2. Progress 갱신
3. idempotency ledger 확인·생성
4. Exploration 또는 Mastery 보상 반영
5. 필요 시 Independent Return 예약

AI 도움 시:

- Exploration 경험·기본 광석: 유지 가능
- 해당 Attempt의 랭킹 점수: 0 또는 rank 제외
- Mastery 보상: 보류
- 기존에 이미 획득한 보상: 회수하지 않음

---

## 10. AI 사고 코치와 화면 무결성

### 10.1 AI Prompt 복사 흐름

```text
학생이 AI 사고 코치 선택
→ 영향 안내 Modal
→ 학생 확인
→ 서버 recordAlgorithmAssistance 성공
→ 현재 학생 코드·Public Error·Student Trace만 sanitization
→ Prompt 공개 및 clipboard 복사
→ Attempt가 AI_RESEARCH로 표시
```

Prompt에는 다음만 포함한다.

- 문제의 공개 제목과 공개 학습 목표
- 학생이 현재 작성한 코드
- Public Test 오류 요약
- Student Trace의 안전한 요약
- 규칙 기반 오개념 후보와 근거
- 정답 금지·질문·작은 실험 요청

Prompt에 포함하지 않는다.

- 이름, UID, 학교, 학급
- Hidden input·expected·group 내부명
- 서버 stack·harness
- 공식 풀이·canonical strategy
- 다른 학생 코드

### 10.2 도움을 벌점으로만 보지 않는 정책

학생 문구는 “감점”보다 다음 의미를 분명히 한다.

> 이번 탐사는 AI 연구 기록으로 남고 탐사 경험은 유지돼요. 랭킹과 독립 마스터 인증은 새 문제를 스스로 다시 해결한 뒤 열립니다.

내부 정책은 엄격하게 적용한다.

- 복사 확인 즉시 rank 제외
- Mastery 보류
- 최소 24시간 뒤 새 seed의 Independent Return
- 같은 codeHash 재사용 금지
- Assistance 0~1, fresh micro-evidence, fresh transfer 통과 필요

### 10.3 모드별 화면 보호

| 모드 | 화면 전환 | 복사·붙여넣기 | 정책 |
| --- | --- | --- | --- |
| Learn | 허용 | 코드 편집 paste 허용, AI Coach는 명시 기록 | 학습 지속 우선 |
| AI Research | 허용 | Prompt copy·외부 답 paste 허용 및 기록 | 비랭킹·Mastery 보류 |
| Independent Return | sustained blur 기록 | copy 제한, paste 금지 | soft integrity + 확인 문제 |
| Arena/Field Test | fullscreen 필수 | copy/cut/paste/contextmenu/print/capture 차단 | 1회 잠금, 3회 종료 |

기존 `quizFocusGuard`의 sustained blur 로직은 공통 `FocusIntegrityGuard`로 추출하되, Learn 모드에 Arena 규칙을 강제하지 않는다.

---

## 11. `AC-COND-001` 완결 UX

### 11.1 학생 흐름

#### 1단계 — 임무 브리핑

- Explorer: 두 안전 스위치와 우주선 게이트
- Navigator: 보안 격벽과 상태 조합
- PRO: 짧은 함수 계약
- 학습 목표는 동일하고 읽기량과 용어만 달라진다.

학생 행동: “게이트가 열릴 조건”을 한 문장으로 말하거나 선택한다.

#### 2단계 — 먼저 예측하기

- `(ON, OFF)`와 `(ON, ON)` 두 장면을 먼저 예측한다.
- 정오표시보다 “왜?” 한 문장을 짧게 선택하게 한다.
- 이 결과는 초기 mental model evidence이며 Star 2 최종 판정과 구분한다.

#### 3단계 — 직접 조작하기

- 두 스위치를 자유롭게 바꿔 네 조합을 관찰한다.
- 예측과 달랐던 조합을 자동 표시한다.
- 학생이 “하나라도”와 “둘 다”의 차이를 말로 발견하게 한다.

#### 4단계 — Python으로 표현하기

- starter function만 제공한다.
- `Run`은 브라우저 Public Test와 Student Trace를 실행한다.
- 첫 실행 전 결과 예측을 한 번 받는다.

#### 5단계 — 실패를 추적하기

- 실패 input을 그대로 정답처럼 강조하지 않는다.
- 조건 평가 순간, 두 변수값, 반환값을 타임라인으로 보여준다.
- “어느 순간 생각과 달라졌나요?”를 먼저 묻는다.

#### 6단계 — 필요한 만큼 도움받기

```text
L0 작은 실험 제안
L1 조건을 말로 다시 나누기
L2 Parsons 구조 배열
L3 부분 코드
L4 풀이 비교·복구 학습
```

도움은 별을 깎지 않지만 Assistance Evidence와 독립 귀환 정책에 반영한다.

#### 7단계 — 서버 제출

- 서버가 base code를 다시 실행한다.
- 학생에게는 성공 여부와 의미 있는 test group 요약만 보여준다.
- Star 1 획득 후 fresh understanding check로 이동한다.

#### 8단계 — 이해 확인

- 제출에 사용하지 않은 새 조합 또는 작은 반례를 제시한다.
- 코드 실행 전에 결과와 이유를 고른다.
- 통과하면 Star 2를 획득한다.

#### 9단계 — Fresh Transfer

- 예: 세 개의 연료 밸브 또는 정상 신호와 비상 차단 스위치
- 기존 코드를 자동 변환하지 않는다.
- 학생이 새 function을 직접 완성한다.
- 서버 검증 성공 시 Star 3 후보가 된다.

#### 10단계 — 완료와 귀환

- 독립 해결: `mastered`
- 도움 또는 AI Research: `pending_independent_return`
- 완료 화면은 문제 수보다 “어떤 도움으로 어디까지 스스로 왔는가”를 보여준다.

### 11.2 실패 피드백 예시

나쁜 피드백:

> `(True, False)`에서 expected false인데 true가 나왔습니다.

권장 피드백:

> 한 스위치만 켜진 두 상황에서 게이트 판단이 예상과 달랐어요. “둘 다 켜짐”과 “하나라도 켜짐”을 코드가 어떻게 구분하고 있는지 살펴보세요.

### 11.3 완료 화면 정보 우선순위

1. 별 3개의 의미
2. 이번에 스스로 한 부분
3. 사용한 도움과 다음에는 줄여볼 한 단계
4. 독립 귀환 날짜
5. 랭킹·보상 자격

ASI 숫자는 학생의 능력 점수가 아니라 성장 추세로만 표시한다.

---

## 12. Mission FSM

클라이언트 탭 상태와 서버 Attempt 상태를 구분한다.

### 12.1 Client Experience State

```text
BOOTSTRAP
→ BRIEFING
→ OBSERVE_PREDICT
→ EXPLORE
→ CODE_EDIT
→ LOCAL_RUNNING
   ├─ LOCAL_FAILED → TRACE_REVIEW → CODE_EDIT
   └─ LOCAL_PASSED → BASE_SUBMITTING
→ BASE_RESULT
→ UNDERSTANDING_CHECK
→ TRANSFER_CHALLENGE
→ FINALIZING
→ COMPLETE | PENDING_RETURN
```

지원 상태는 별도 parallel state로 둔다.

```text
assistance: NONE | HINT | PARSONS | REPAIR | AI_RESEARCH
integrity: NORMAL | SOFT_FLAGGED | LOCKED | TERMINATED
runtime: COLD | BOOTING | READY | RUNNING | RECOVERING | ERROR
```

### 12.2 Transition 규칙

- 임의 탭 이동은 화면만 바꾸며 서버 증거를 생성하지 않는다.
- `BASE_RESULT`는 서버 응답으로만 진입한다.
- `UNDERSTANDING_CHECK` challengeId 없이 Star 2를 만들 수 없다.
- `TRANSFER_CHALLENGE` token 없이 Star 3를 만들 수 없다.
- 새로고침 후 서버 session 상태를 읽어 동일 단계로 복구한다.
- 중복 제출은 submissionId로 같은 결과를 반환한다.

---

## 13. 검증 전략

### 13.1 보안 경계

- `src/**`에서 `functions/**` import 시 CI 실패
- production JS와 sourcemap에서 private marker 검색
- Vite dev URL로 private catalog 접근 불가 확인
- Functions 배포 package에 private catalog 포함 확인
- Callable 응답 snapshot에 hidden input·expected·stack 부재 확인

### 13.2 악의적 요청

- forged userId, stars, rankEligible, timestamp 무시/거부
- forged problem version·variant seed·challengeId 거부
- 다른 학생 attemptId 제출 거부
- expired/replayed token 거부
- duplicate submissionId 멱등 처리
- 과도한 source size와 payload 거부

### 13.3 Sandbox

- 무한 루프 1.5초 내 중단
- 출력 폭주 byte 단위 중단
- memory/import/network/filesystem fixture 차단
- timeout 뒤 다음 정상 RUN 성공
- server Judge에도 동일한 제한 fixture 적용
- Judge 장애 시 정답/오답 판정이 아닌 retryable 상태 확인

### 13.4 Replay

- 동일 code/version/seed의 normalized event hash 동일
- eventType 정규화 snapshot
- 40개 이상 event에서 핵심 condition/error 장면 보존
- 장면 수 목표와 checkpoint seek 일치
- 어느 playhead에서도 world와 memory state 동일

### 13.5 교육 평가

- 공식 풀이와 최소 3개 대안 풀이 통과
- 의도된 오답 최소 5개가 목표 group에서 실패
- 단순 hardcoding이 Fresh Transfer에서 실패
- 초등 3~4, 초등 5~6, 중등 1~2 각 2명 관찰
- 첫 의미 행동, 첫 Run까지 시간, 실패 뒤 재시도 여부 기록

### 13.6 AI·무결성

- Prompt에 실제 현재 코드가 포함되고 starter code로 대체되지 않음
- PII·hidden·server stack sanitization
- 서버 기록 전 Prompt가 노출되지 않음
- AI copy 뒤 rank와 Mastery 보류
- 즉시 재제출로 독립 자격 회복 불가
- Independent Return과 Arena의 focus 정책 분리

---

## 14. 구현 순서와 산출물

### Gate A — Phase 0.5R: 신뢰 경계

산출물:

- Public/Private Kernel schema 확정
- 클라이언트의 Functions 직접 import 제거 설계
- Callable API request/response schema
- HMAC seed·challenge token 계약
- Firestore collections·rules 설계
- client dependency·bundle leak 검사 설계

완료 기준:

- Client가 private module을 참조하는 경로 0개
- 클라이언트가 성취 필드를 임의 생성할 경로 0개
- 버전 불일치가 실패 폐쇄됨

### Gate B — Phase 1A: Student Runtime

산출물:

- 알고리즘 Runtime Adapter
- AST step/import 계측 명세
- Worker recovery와 canonical event schema
- Sandbox fixture matrix

완료 기준:

- 무한 루프·출력·import·memory fixture 통과
- timeout 뒤 Worker 복구
- 동일 실행 Trace 결정성 확인

### Gate C — Phase 1B: Server Judge·저장

산출물:

- Callable Orchestrator
- 격리 Judge Runtime
- Attempt event journal·Progress transaction
- 보상 idempotency ledger

완료 기준:

- 서버가 학생 code를 직접 재실행
- private test가 응답·bundle·trace에 없음
- 중복 제출·동시 요청에도 보상 1회

### Gate D — Phase 1C: Replay·Learning Trace

산출물:

- Raw→Meaningful→Learning projector
- checkpoint·seek·trace hash
- Trace 오류 탐색 UI contract

완료 기준:

- key scene 유실 없음
- world/memory/code line 동기화
- 300 meaningful event에서 UI freeze 없음

### Gate E — Phase 2: `AC-COND-001`

산출물:

- 3 Shell 공통 Kernel
- Observe→Explore→Code→Trace→Submit→Understanding→Transfer→Return
- 도움 기록과 완료 화면
- 새로고침·저장 실패 복구

완료 기준:

- 문제 이해부터 저장까지 하나의 실제 서버 루프 완결
- 도움·AI·독립 해결의 상태가 정책대로 구분
- 학생 관찰에서 치명적 오해와 조작 혼란 해소

---

## 15. Phase 2 동안 의도적으로 하지 않을 것

- BFS, Queue, Graph Lens
- 문제 자동 생성 Authoring Engine
- AI API 직접 연결
- 전체 랭킹 시즌과 공식 Arena
- 정답 생성형 오개념 진단
- 복잡한 경제·상점 보상
- 12개 문제 동시 제작

첫 문제의 실제 실행·판정·저장·귀환이 완결되기 전에는 콘텐츠 수를 늘리지 않는다.

---

## 16. 최종 승인 체크리스트

다음 질문에 모두 “예”라고 답할 때 Phase 3로 이동한다.

- 학생 번들 어디에도 정답·hidden·transfer expected가 없는가?
- 브라우저를 조작해도 별·랭킹·Mastery·보상을 만들 수 없는가?
- Judge는 실제 Python을 하나의 고정 runtime에서 실행하는가?
- Sandbox가 선언값이 아니라 무한 루프와 자원 폭주를 실제로 끊는가?
- Judge 장애가 학생 오답으로 기록되지 않는가?
- 동일 실행을 정확히 재생하고 오류 직전으로 돌아갈 수 있는가?
- AI Prompt 복사가 서버 Assistance Evidence로 남는가?
- AI 도움 뒤 Exploration은 유지하면서 독립 Mastery는 보류되는가?
- Fresh Transfer가 기존 code 자동 변환이 아닌 새로운 학생 해결인가?
- 초등 저학년과 중학생이 같은 사고 목표를 서로 다른 언어 밀도로 경험하는가?

이 설계의 성공 기준은 화면 수가 아니라 다음 한 문장이다.

> 학생이 도움을 받아 다시 일어날 수 있고, 서버는 그 학생이 나중에 스스로 해결했음을 신뢰할 수 있는 증거로 확인한다.
