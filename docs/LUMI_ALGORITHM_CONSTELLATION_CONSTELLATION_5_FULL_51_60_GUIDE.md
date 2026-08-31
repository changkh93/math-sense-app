# LUMI 알고리즘 성단 — 성단 5 전체 10문제(51~60) 개발 가이드 (v2)

> 범위: 성단 5 `시뮬레이션과 탐색` 전체 10문제
>
> 구현 단위: 신규 9문제(51~55, 57~60) + 기존 `AC-SORT-MIN-01`(56) 현대화
>
> 목표 등록 수: 구현 완료 후 `Published = Public = Private = 63`
>
> **선행 의존성(명시)**: 이 Wave는 **49·50 Wave가 완료된 상태(등록 54개, 게이트 `[Test 16]` 존재)를 전제한다.** 49·50이 끝나기 전에 착수하면 총 개수 단언과 게이트 번호가 어긋난다.
>
> 핵심 원칙: **새 Lens, 새 Callable, 새 Firestore 구조, 새 런타임 문법을 만들지 않는다.** 기존 `createCapabilityPrototypeKernel`, `state-transition`, 제한형 Python Judge, 공용 저작 계약만 재사용한다.

**v2 변경 요약** (원안 대비 수정·보강 — 모든 항목은 실행 검증 또는 코드 대조로 확인):

1. **누락된 필수 수정 파일 발견**: 성단 6 개방의 "Anchor 51·54·56" 계약은 현재 레지스트리가 `requiredAnchors: ['AC-SORT-MIN-01']`(56 하나)이므로 **`constellationRegistry.js` 수정이 필요**하다. 원안 §6.3 파일 목록에 없었다 (§2.3, §6.3).
2. **런타임 함정 3종 발견·명세화** (§1.2, 전 항목 실행 검증):
   - `%`의 음수 피연산자가 **JS 나머지 동작**(`(0-1)%4 → -1`, Python은 `3`) — 52·Transfer의 좌회전은 반드시 가산 형식 `(d+3)%4` 사용
   - **리스트 결합 `[x] + list` 미지원** — 55의 벨트 구성은 38번 관행(`[요소]` 리터럴 + `.append()`)으로
   - **첨자 중첩 미지원** (`prefix[q[1] + 1]`, `prefix[q[0]]` 모두 실패) — 60은 `start = q[0]` 변수 추출 후 인덱싱 (우회법 검증 완료)
3. 이와 함께 **지원 기능 12종도 실행 검증 완료** (`//`, tuple swap, `.append()`, index 대입+`not`, 중첩 리스트 입력, 혼합 반환, `while` 이진탐색, 음수 인덱스 `belt[-1]`, 문자열 토큰 분기 등) — 구현자가 재검증 없이 착수 가능 (§1.2 표).
4. **49번 항목 프레이밍 정정**: 49는 아직 구현 전이므로 "비대칭 Judge 허점 청산"이 아니라 **49·50 가이드 명세 수정**(양 방향 빈 입력 경계)이다. 작업 내용을 명세 수정 + 구현 시 반영으로 정확화 (§1.1).
5. **Test 17의 성단 6 검증 방식 명확화**: 성단 6은 출판 미션이 없어 `getConstellationAccess(6)`는 항상 `unavailable` — 개방 판정 검증은 `isConstellationUnlocked(6, …)` 직접 호출로 (§7.4).
6. **문제별 pythonConcepts requires 표 추가** (원안 누락 — 등록된 ID만 사용하도록 검증된 ID로 명세) (§5 각 문제).
7. 56 현대화의 **테스트 의미 변경 규칙 명시**: version 유지 조건은 "추가 전용(기존 통과 풀이가 여전히 통과)" — 마스터 플랜 §19.3 정신과의 정합 근거 (§5.6).
8. 카탈로그 초안과 최종값의 **차이 표 추가** (초안 prereq/lensId가 원안 계약과 다름) (§6.4).
9. Understanding/Transfer ID 규칙, 56의 이중 `introduces` 필드 정리 등 세부 보강.

---

## 0. 결론과 구현 전략

성단 5는 10문제를 한 번에 출판한다. 다만 “10개 파일을 복사해 숫자만 바꾸는 작업”으로 만들지 않는다. 다음 세 가지 축으로 난이도를 단계적으로 올린다.

```text
51~55  상태를 명령 순서대로 갱신하는 시뮬레이션
56~58  목록을 비교·교환·탐색하는 기본 전략
59~60  이미 배운 전략을 더 효율적인 탐색·구간 질의로 재구성
```

현재 카탈로그의 `grid-radar-lens`, `cycle-timeline`, `decision-gate`, `sort-lab-lens`는 실제 `ExploreMode` Lens Registry에 등록되어 있지 않다. 그대로 사용하면 `ConditionTableLens`로 조용히 폴백하여 의도한 학습 화면이 나오지 않는다. 이번 Wave에서는 10문제 모두 검증된 `state-transition` Lens로 통일한다. (`sequence-accumulator` 초안 2건도 동일하게 교체한다. 카탈로그 초안의 lensId 분포는 §6.4 참조.)

속도를 위해 다음은 하지 않는다.

- Rover 전용 2D 보드 제작
- 나침반·시계 전용 Dial 컴포넌트 제작
- 정렬 애니메이션 전용 Sort Lab 제작
- Binary Search 전용 시각화 컴포넌트 제작
- 문제별 오개념 Matcher 10종 제작
- 성능을 이유로 AST/소스 문자열 채점 추가
- 10개 문제마다 별도 테스트 파일 생성
- **평가기 `%`의 Python 의미 변경** (음수 나머지 정렬은 별도 과제로 기록만 — §1.2)

상태 장면의 이름과 값만 바꾸어 `StateTransitionLens`를 재사용한다. 차별화는 UI 컴포넌트가 아니라 **프레임의 상태 계약, 2★ 질문, Fresh Transfer, 의도된 오답 fixture**로 만든다.

---

## 1. 착수 전 Gate 0

### 1.1 49·50 명세의 빈 입력 대칭 경계 (명세 수정 + 구현 반영)

> 정정: 49는 아직 구현 전이다. 이 항목은 "이미 있는 결함을 고치는 것"이 아니라 **49·50 개발 가이드(v2)의 명세를 보강하고, 49 구현 시 그대로 반영하는 것**이다. 작업 형태는 가이드 문서 수정이며, 성단 5 커밋에 섞지 않는다.

현재 49·50 가이드 v2는 `one-side-empty`(한 방향: `a='', b='A'`)만 명세한다. 동치 판정은 인수 순서에 비대칭인 오답(예: "첫 번째만 비었을 때 True")이 존재할 수 있으므로 **양 방향을 모두** 넣는다.

- 49·50 가이드 §5.8의 Hidden 명세에 `packet_a='A', packet_b='' -> False` 케이스 추가 (기존 `'', 'A'`와 쌍을 이룸)
- Transfer Private에도 `badges_a=['STAR'], badges_b=[] -> False` 추가
- 테스트 수를 늘리지 않으려면 Base의 `identical-order`, Transfer의 단일 항목 정상 케이스 중 하나를 교체한다
- 저작 테스트 단언은 "빈 입력 케이스 1건 존재"가 아니라 **양 방향 경계가 모두 존재**함을 검사한다

성단 5 Wave 착수 전에 가이드 문서만 수정해 두고, 49 구현(49·50 Wave)에서 반영한다. **성단 5 구현 커밋에는 포함하지 않는다.**

### 1.2 런타임 capability — 실행 검증 결과 (재검증 불필요)

성단 5 공식 해법은 다음 기존 기능만 사용한다. 아래 표는 전 항목 클라이언트·서버 공유 코어에서 **실제 실행 검증을 마친 결과**다.

**지원됨 (검증 완료):**

| 기능 | 검증에 사용한 사례 |
| --- | --- |
| `for`, `while`(복합 조건 포함), `if/elif/else` | 59 이진탐색 `while low <= high` 전체 동작 |
| `range`, `len`, 음수 인덱스 `belt[-1]` | 38번 관행, 55 유출 계산 |
| 리스트 인덱싱·**인덱스 대입**·슬라이싱 | `switches[i] = not switches[i]` (54) |
| `.append()` (`method:append` 등록됨) | 60 prefix 구축 |
| `%`, `//` (피연산자가 **음수가 아닐 때**) | 52 `(d+3)%4`, 53 `(total//60)%24` |
| tuple swap `a, b = b, a` | 56 `cargos[0], cargos[m] = cargos[m], cargos[0]` |
| `not` (Boolean 반전) | 54 토글 |
| 중첩 리스트 **입력** `[[0,1],[1,3]]` + `q[0]` 읽기 | 60 queries |
| 혼합 반환 `[스칼라, 리스트]` | 55 `[30, [5,10,20]]` |
| Boolean 리스트 입력 | 54 `[False, True, False]` |
| 문자열 토큰 분기 `c == 'MOVE'` | 51 |
| 리스트 리터럴 `[변수]` | 55 `[incoming]` 시작점 |

**미지원 — 원안 해법 스케치가 그대로는 동작하지 않는 3가지 함정:**

| 함정 | 증상 | 규칙 |
| --- | --- | --- |
| **음수 피연산자의 `%`** | `(0 - 1) % 4` → `-1` (Python은 `3`). JS 나머지 동작 | 좌회전/감소 방향은 **가산 형식**으로만: L = `(d + 3) % 4`, PREV = `(day + 6) % 7`. 공식·대안·Transfer 해법 모두 적용. 학생이 `(d-1)%4`를 쓰면 이 샌드박스에서는 오답이 되지만 이는 평가기 의미 정렬 문제로 별도 기록(§9.5) |
| **리스트 결합 `[x] + list`** | `[incoming] + belt[:n-1]` → NAME_ERROR | 새 리스트는 **`[요소]` 리터럴로 시작해 `.append()`로 쌓는다** (38번 공식 해법과 동일 관행) |
| **첨자 중첩** | `prefix[q[1] + 1]`, `prefix[q[0]]` → NAME_ERROR (첨자 안의 첨자) | **인덱스로 쓸 값은 먼저 변수에 추출**한다: `start = q[0]`, `end = q[1]` 후 `prefix[end + 1]` (검증된 우회법) |

구현 중 위 함정에 걸리면 evaluator를 확장하지 않는다. 위 우회 관행으로 표현한다. 그 외의 문법이 동작하지 않으면 같은 사고를 기존 문법으로 표현할 수 있는지 먼저 확인하고, 정말 대체가 불가능할 때만 Wave를 멈추고 별도 런타임 변경을 검토한다.

### 1.3 56번 기존 계약 보존

`AC-SORT-MIN-01`은 이미 출판되어 있으므로 다음은 유지한다.

```text
problemId: AC-SORT-MIN-01
problemVersion: 1
catalogOrder: 56
entryFunction: sort_cargo_step
transferChallengeId: tc_sort_056_transfer_1
```

진도 호환성을 위해 ID·버전을 올리지 않는다. Public/Private 학습 계약과 테스트만 현재 10대 저작 불변식 수준으로 보강한다.

**version 유지의 정당성 조건 (마스터 플랜 §19.3 "test 의미 변경은 version 증가"와의 정합):** 테스트 변경은 **추가 전용**이어야 한다 — 현행 공식 해법과, 이미 통과한 학생 풀이가 여전히 통과해야 한다. 기존 Hidden을 삭제·변경하지 않고 새 그룹만 추가하며, 구현 시 "현행 private 정의의 hiddenTests가 새 hiddenTests의 부분집합"을 확인한다. 이 조건이 깨지면 version을 올리고 진도 마이그레이션을 별도 설계한다.

---

## 2. 성단 5 학습 순서와 개방 계약

### 2.1 전체 구성

카탈로그 초안의 `routeRole`/`learningRole`는 아래 표와 **이미 일치함을 확인했다** (§6.4의 초안 덤프 참조). 이번 Wave에서 바꾸는 것은 `status`, `lensId`, `prerequisites`뿐이다.

| 순서 | problemId | 역할 | 핵심 사고 | Lens |
|---:|---|---|---|---|
| 51 | `AC-SIM-ROVER-51` | Core / Anchor | 명령에 따른 위치·방향 상태 갱신 | `state-transition` |
| 52 | `AC-SIM-COMPASS-52` | Core / Practice | 순환 방향과 경계 감싸기 | `state-transition` |
| 53 | `AC-SIM-CLOCK-53` | Core / Practice | 단위 올림과 하루 순환 정규화 | `state-transition` |
| 54 | `AC-SIM-SWITCH-54` | Core / Anchor | 선택된 인덱스의 Boolean 상태 반전 | `state-transition` |
| 55 | `AC-SIM-BELT-55` | Core / Practice | 고정 길이 상태 이동·유입·유출 | `state-transition` |
| 56 | `AC-SORT-MIN-01` | Core / Anchor | 최소 위치 선택 후 1회 교환 | `state-transition` |
| 57 | `AC-SORT-BUBBLE-57` | Core / Practice | 인접 비교·교환 1회 통과 | `state-transition` |
| 58 | `AC-SRCH-LINEAR-58` | Core / Practice | 앞에서부터 첫 일치 위치 탐색 | `state-transition` |
| 59 | `AC-SRCH-BINARY-59` | Branch / Review | 정렬된 구간을 절반씩 축소 | `state-transition` |
| 60 | `AC-SRCH-PREFIX-60` | Branch / Review | 누적 기록 두 개의 차로 구간합 계산 | `state-transition` |

### 2.2 선수 조건

선수 조건은 “유사한 제목”이 아니라 실제 해법에서 사용하는 사고·문법을 기준으로 한다. 아래 최종값은 **카탈로그 초안과 다르므로(§6.4) 카탈로그 수정이 필요하다.** 모든 선수 ID는 published 상태임을 확인했다.

| 문제 | prerequisites (최종) | 카탈로그 초안 | 이유 |
|---|---|---|---|
| 51 | `AC-SEQ-005`, `AC-PAT-003`, `AC-COND-ELIF-14` | `[AC-SEQ-005]` | 명령 목록 순회, 문자열 동치, 여러 상태 분기 |
| 52 | `AC-SIM-ROVER-51`, `AC-PAT-003` | `[AC-SIM-ROVER-51]` | 방향 상태와 modulo 순환 |
| 53 | `AC-SIM-COMPASS-52`, `AC-PAT-DIGIT-24` | `[AC-PAT-003]` | 순환 정규화, `//`와 `%` |
| 54 | `AC-SEQ-005`, `AC-COND-NOT-13` | `[AC-COND-001]` | 명령 목록 순회, Boolean 반전 |
| 55 | `AC-SEQ-ROTATE-38` | `[AC-SEQ-005]` | 경계 항목 분리와 상대 순서 보존 |
| 56 | `AC-SEQ-MINMAX-32`, `AC-EXP-SWAP-04` | `[AC-SEQ-005]` | 최소값 스캔, 덮어쓰기 전 값 보존·교환 |
| 57 | `AC-SORT-MIN-01` | (동일) | 비교·교환을 반복하는 정렬 사고 |
| 58 | `AC-SEQ-005`, `AC-PAT-003` | `[AC-SEQ-005]` | 목록 순회와 동치 비교 |
| 59 | `AC-SRCH-LINEAR-58`, `AC-EXP-WHILE-07`, `AC-PAT-DIGIT-24` | `[AC-SRCH-LINEAR-58]` | 탐색 의미, 종료 조건, 중간 위치 계산 |
| 60 | `AC-SEQ-RUNNING-35`, `AC-EXP-BOUND-05` | `[AC-SEQ-RUNNING-35]` | 누적 상태 목록과 구간 경계 |

Core 문제는 이전 성단 Branch를 선수 조건으로 요구하지 않는다. 특히 54번이 `AC-COND-TOGGLE-19`(성단 1 Branch)에 의존하지 않도록 한다 — 위 표의 `AC-COND-NOT-13`(성단 1 Core) 선택이 그 구현이다.

> 선수 강화 주의: 51·53·54·56·58·60의 선수가 초안보다 늘어난다. 이미 이 문제들을 완료한 학생은 없으므로(모두 draft) 소급 영향은 없다. 단 56은 published이며 선수가 `[AC-SEQ-005]` → 2개로 늘어난다. `getMissingPrerequisites`는 "이미 완료한 문제는 선수 변화에 관계없이 열어둔다"(completed-set 우선)이므로 기존 완료 학생의 재접근은 안전하다. 신규 학생은 MINMAX-32·SWAP-04를 먼저 거치게 되는데, 둘 모두 성단 3 Core라 성단 4 통과 학생에게 자연 충족된다.

### 2.3 성단 6 개방 — 레지스트리 수정 필요 (v2 신설)

현재 레지스트리 `constellation-5`의 값:

```text
requiredAnchors: ['AC-SORT-MIN-01']        # 56 하나뿐 — 원안 계약과 불일치
minimumCoreToUnlockNext: 6                  # 원안 계약과 일치 ✅
```

원안의 "필수 Anchor 51, 54, 56" 계약을 고정하려면 **`constellationRegistry.js`를 수정해야 한다** (원안 §6.3 파일 목록에 누락됨):

```js
// src/components/AlgorithmConstellation/shared/catalog/constellationRegistry.js
requiredAnchors: ['AC-SIM-ROVER-51', 'AC-SIM-SWITCH-54', 'AC-SORT-MIN-01'],
```

- 성단 6은 아직 출판 미션이 없어 이 강화가 현재 학생에게 영향을 주지 않는다(성단 6 접근 자체가 `unavailable`).
- 성단 6 엔트리(`constellation-6 · 가능성 연구소`)는 레지스트리에 이미 존재한다 — 새 성단 정의는 만들지 않는다.

성단 6은 다음 조건으로만 열린다.

```text
필수 Anchor 51, 54, 56 모두 완료
그리고 성단 5 Core 8개 중 6개 이상 완료
```

59·60 Branch 완료는 Core 6/8을 대신하지도, 개방을 막지도 않는다.

---

## 3. 공통 저작 계약

### 3.1 문제별 산출물

각 신규 문제는 정확히 다음 두 파일을 만든다.

```text
src/components/AlgorithmConstellation/shared/problems/<problem>.js
functions/algorithmConstellation/problems/<problem>.private.cjs
```

56번은 두 기존 파일을 수정한다. 신규 React 컴포넌트나 API 파일은 만들지 않는다.

### 3.2 Public Kernel 공통 요구

모든 문제는 다음을 포함한다.

- `createCapabilityPrototypeKernel()` 사용
- `problemVersion: 1`
- Observe 객관식 1개
- `state-transition` Explore 3~6 프레임 (반례·독립 실험 프레임은 `experimentReset` + `stateBefore` 쌍으로 분리 — 47·48·49에서 확립된 규칙)
- Public Test 2~3건
- 2★ Understanding Challenge 3문항 (challengeId 규칙: `uc_sim_051_1` … `uc_srch_060_1` / 56은 기존 ID 유지 또는 `uc_sort_056_1`)
- Public Fresh Transfer Preview Test 2건 (transferChallengeId 규칙: `tc_sim_051_transfer_1` … / 56은 기존 `tc_sort_056_transfer_1` 유지)
- 사고 패턴 `requires`/`introduces`
- pythonConcepts는 §5 각 문서의 검증된 ID 표를 사용
- 등록된 Evidence Primitive만 사용 (`decision`, `scalar-sequence`, `container-scan`, `container-membership`, `ordered-buffer`, `enumeration`, `source-debug` 등 기존 등록분)

### 3.3 Private Definition 공통 요구

- 공식 해법 1개 (§1.2의 3대 함정 회피 관행 적용)
- 의미 있는 대안 풀이가 있을 때만 `alternativeSolutions` (예: 56 tuple swap vs temp 교환, 58 `while` vs `for`)
- intended wrong fixture 4종
- Hidden Test 5~6건
- Transfer Private Test 4~5건
- Public/Private Understanding 및 Transfer 메타데이터 완전 동기화
- Public Preview와 Private Master 입력 중복 0건

### 3.4 테스트 수 예산

10문제를 한 번에 만들더라도 테스트를 무작정 늘리지 않는다.

```text
Public Base: 2~3
Hidden Base: 5~6
Public Transfer Preview: 2
Private Transfer Master: 4~5
Wrong Fixture: 4
Understanding: 3문항
```

같은 오답을 잡는 숫자만 바꾼 테스트는 추가하지 않는다.

### 3.5 Syntax Leak

Observe·Explore·사고 패턴 카드·2★ 질문·Transfer Context는 전략을 설명하되 제출 가능한 완성 코드를 제공하지 않는다. 56·57의 swap 문법은 First Encounter 이후에만 이름과 문법을 연결한다.

---

## 4. 사고 패턴 레지스트리

`problemSolvingPatternRegistry.js`에 아래 10개를 등록한다. 기존 10필드 계약(`conceptId, patternId, displayName, kind, canonicalFirstProblemId, why, tinyExample, syntaxExample, predictionCheck, protocolRepairId`)을 그대로 사용하고 별도 레지스트리를 만들지 않는다. **저작 테스트의 Pattern Card Syntax Leak 하드코딩 목록에도 10종을 추가한다.**

| Pattern ID | Canonical 문제 | 학생용 사고 언어 |
|---|---|---|
| `pattern:command-state-machine` | 51 | 명령 하나마다 현재 상태를 다음 상태로 바꾸기 |
| `pattern:cyclic-state-wrap` | 52 | 끝을 지나면 순환의 반대편으로 돌아오기 |
| `pattern:unit-carry-normalization` | 53 | 작은 단위가 기준에 닿으면 큰 단위로 올리기 |
| `pattern:indexed-toggle-update` | 54 | 명령이 가리킨 칸만 반전하기 |
| `pattern:fixed-length-shift` | 55 | 하나가 들어오면 하나가 나가며 길이 유지하기 |
| `pattern:select-extreme-and-swap` | 56 | 가장 작은 위치를 기억한 뒤 한 번 교환하기 |
| `pattern:adjacent-swap-pass` | 57 | 이웃을 비교하며 큰 값을 한 칸씩 뒤로 보내기 |
| `pattern:first-match-linear-search` | 58 | 앞에서부터 확인하고 첫 일치에서 멈추기 |
| `pattern:interval-halving-search` | 59 | 중간값과 비교해 불가능한 절반 버리기 |
| `pattern:prefix-difference-query` | 60 | 두 누적 기록의 차로 사이 구간 구하기 |

각 패턴의 `syntaxExample`은 코드가 아니라 주석형 사고 절차로 쓴다. `def`, `for`, `if`, `while`, `return`, 구체적 인덱스 식을 넣지 않는다.

### 4.1 Python Concept Registry 정리

56번의 현재 정의는 `builtin:min`과 `syntax:swap`을 동시에 소개하지만(커널 34행 `introduces: ['builtin:min', 'syntax:swap']`) 공식 해법은 `min()`을 사용하지 않는다. 새 알고리즘과 새 문법을 동시에 두 개 소개하는 것도 Core 100 원칙에 맞지 않는다.

- 56은 `syntax:swap`만 소개한다.
- `builtin:min`은 56의 `pythonConcepts`에서 제거한다. **커널 20행의 메타 필드 `introduces: { concept: 'selection-step', pythonTool: 'builtin:min' }`에도 남아 있으므로 함께 정리한다.**
- 저장소 전체 검색 결과 `builtin:min` 참조는 56 커널과 레지스트리 카드뿐임을 확인했다. 다른 참조가 추가로 발견되지 않으면 `PYTHON_CONCEPT_REGISTRY`의 미사용 카드를 삭제한다.
- 학생이 자발적으로 `min()`을 사용한 올바른 풀이를 Judge가 거부하지는 않는다.
- temp 변수를 이용한 교환 대안 풀이도 계속 통과시킨다.

---

## 5. 문제별 구현 명세

> 각 문제의 `pythonConcepts.requires`는 아래에 명세한다 (모두 등록된 ID — 검증 완료). `introduces`는 원안대로 신규 등록하지 않는다(사고 패턴으로만 소개).

## 5.1 AC-SIM-ROVER-51 — 로버의 방향 명령

### 계약

```text
entryFunction: run_rover_commands(start_pos, commands)
direction: 1 = 오른쪽, -1 = 왼쪽
command: "MOVE" 또는 "TURN"
return: [final_pos, final_direction]
domain: -20 <= start_pos <= 20, 0 <= len(commands) <= 12
```

명령 순서가 결과를 바꾸는 1차원 상태 머신으로 설계한다. 2D 네 방향은 52번에서 다룬다.

공식 해법 골격 (검증 완료 — §1.2 검증 G):

```python
def run_rover_commands(start_pos, commands):
    pos = start_pos
    direction = 1
    for command in commands:
        if command == "MOVE":
            pos = pos + direction
        else:
            direction = direction * -1
    return [pos, direction]
```

pythonConcepts requires:

```js
['builtin:list', 'statement:for', 'statement:if', 'operator:equality', 'operator:arithmetic-state-update']
```

대표 흐름:

```text
start=0, direction=1
MOVE -> pos=1
TURN -> direction=-1 (위치는 그대로)
MOVE -> pos=0
MOVE -> pos=-1
결과 [-1, -1]
```

Public Test:

```text
(0, [MOVE, TURN, MOVE, MOVE]) -> [-1, -1]
(5, []) -> [5, 1]
```

Hidden 그룹:

- `move-only`
- `turn-before-move`
- `double-turn-restores-direction`
- `mixed-order`
- `empty-commands`
- `negative-start`

Wrong Fixture:

- `ROVER-ALWAYS-MOVES-RIGHT`
- `ROVER-TURN-MOVES-POSITION`
- `ROVER-RESETS-DIRECTION-EACH-STEP`
- `ROVER-RETURNS-POSITION-ONLY` (반환을 `pos`만으로 — `mixed-order` 등에서 값 불일치)

2★는 TURN이 위치를 바꾸지 않는 이유, 두 번 TURN하면 원래 방향인 이유, 명령 순서가 중요한 이유를 묻는다.

Fresh Transfer:

```text
entryFunction: run_probe_commands(start_level, commands)
tokens: "STEP", "FLIP"
return: [final_level, final_direction]
```

Explore 프레임: `pos`, `direction`, `commandIndex`, `currentCommand`를 상태로 보여준다. 각 명령을 한 프레임씩 진행하고 4개 명령을 한 프레임으로 압축하지 않는다.

## 5.2 AC-SIM-COMPASS-52 — 네 방향 우주 나침반

### 계약

```text
entryFunction: rotate_compass(start_direction, commands)
0=N, 1=E, 2=S, 3=W
command: "R" 또는 "L"
return: final direction 0..3
domain: start_direction 0..3, commands length 0..12
```

공식 전략 — **좌회전은 반드시 가산 형식** (§1.2 함정 1: `(d-1)%4`는 음수 피연산자에서 JS 나머지 동작):

```text
R: (direction + 1) % 4
L: (direction + 3) % 4      # 왼쪽 한 칸 = 오른쪽 세 칸
```

공식 해법 골격 (검증 완료 — §1.2 검증 B):

```python
def rotate_compass(start_direction, commands):
    direction = start_direction
    for command in commands:
        if command == "R":
            direction = (direction + 1) % 4
        else:
            direction = (direction + 3) % 4
    return direction
```

pythonConcepts requires:

```js
['builtin:list', 'statement:for', 'statement:if', 'operator:equality', 'operator:modulo']
```

Public Test:

```text
(0, [R, R, L]) -> 1
(3, [R]) -> 0
```

Hidden 그룹 (경계 위주):

- `empty-turns`
- `right-wrap` (3에서 R → 0)
- `left-wrap` (0에서 L → 3) — **공식 해법·fixture 모두 가산 형식으로 통과시킨다**
- `four-turn-cycle`
- `mixed-turns`
- `multiple-cycles`

Wrong Fixture:

- `COMPASS-NO-WRAP` (3+1=4 그대로 반환)
- `COMPASS-LEFT-SAME-AS-RIGHT`
- `COMPASS-USES-LAST-COMMAND-ONLY`
- `COMPASS-COUNTS-RIGHT-ONLY`

> fixture 작성 주의: "좌회전 감산" 오개념 fixture(`(d-1)%4`)는 0에서 L일 때 이 샌드박스에서 `-1`을 반환해 `left-wrap`에서 값 불일치로 기각된다 — 의도한 그룹에서 기각되므로 Invariant 5b(문법 크래시 아님)도 통과하고 유효하다. 다만 오답 "원리"가 감산 자체가 아니라 음수 미처리로 보이지 않게 하려면, fixture는 `if direction == 0: direction = 3 else: direction = direction - 1` 형태의 "경계 하드코딩 빠뜨림"으로 작성하는 편이 교육적으로 더 깨끗하다 (0에서 L을 처리 안 해 `-1`·`4` 등을 반환).

Fresh Transfer는 7일 주기 요일 이동으로 바꾼다.

```text
entryFunction: shift_weekday(start_day, moves)
0..6, tokens NEXT/PREV
PREV = (day + 6) % 7   # 감산 금지 (§1.2 함정 1)
```

Explore는 `directionBefore`, `command`, `rawDirection`, `wrappedDirection`을 보여준다. 첫 경계 통과 장면을 반드시 포함한다.

## 5.3 AC-SIM-CLOCK-53 — 우주 시계 맞추기

### 계약

```text
entryFunction: adjust_space_clock(hour, minute, add_minutes)
input: hour 0..23, minute 0..59, add_minutes 0..1500
return: [new_hour, new_minute]
```

공식 Oracle (검증 완료 — §1.2 검증 C; 전 과정 피연산자가 음수가 아니므로 `%` 함정 무관):

```text
total = hour * 60 + minute + add_minutes
new_hour = (total // 60) % 24
new_minute = total % 60
```

pythonConcepts requires:

```js
['operator:floor-division', 'operator:modulo', 'operator:arithmetic-state-update']
```

Public Test:

```text
(23, 50, 20) -> [0, 10]
(10, 5, 0) -> [10, 5]
```

Hidden 그룹:

- `exact-hour-carry` (59+1)
- `multi-hour-carry`
- `day-wrap` (23:50 + 20)
- `minute-boundary`
- `zero-addition`
- `full-day-equivalent` (+1440)

Wrong Fixture:

- `CLOCK-MINUTES-WITHOUT-CARRY`
- `CLOCK-HOUR-WITHOUT-DAY-WRAP`
- `CLOCK-CARRY-ONLY-ON-GREATER-THAN-60` (==60 경계 미처리)
- `CLOCK-ADDS-MINUTES-DIRECTLY-TO-HOUR`

Fresh Transfer:

```text
entryFunction: adjust_mission_timer(minute, second, add_seconds)
minute/second는 0..59, 결과도 60분 시계로 정규화
```

2★는 59+1, 23:50+20, `%`가 남은 작은 단위를 만드는 이유를 확인한다.

## 5.4 AC-SIM-SWITCH-54 — 꺼졌다 켜지는 행성 스위치

### 계약

```text
entryFunction: toggle_planet_switches(switches, commands)
switches: Boolean list, length 1..8
commands: 유효한 0-based index list, length 0..12
return: commands를 순서대로 적용한 Boolean list
```

공식 해법 골격 (검증 완료 — §1.2 검증 6, `switches[i] = not switches[i]`):

```python
def toggle_planet_switches(switches, commands):
    for index in commands:
        switches[index] = not switches[index]
    return switches
```

> 반환은 입력 리스트를 제자리 갱신한 것을 반환한다. 실행기가 함수 인자를 복제해 전달하므로(구현 확인됨) 외부 오염 우려는 없으며, Public/Hidden expected는 최종 상태 리스트와 값 동치로 판정된다.

pythonConcepts requires:

```js
['builtin:list', 'statement:for', 'operator:not']
```

Public Test:

```text
([False, True, False], [0, 2, 0]) -> [False, True, True]
([True, False], []) -> [True, False]
```

Hidden 그룹:

- `same-index-twice`
- `all-indices-once`
- `single-switch`
- `mixed-repeated-indices`
- `empty-commands`
- `initially-all-on`

Wrong Fixture:

- `SWITCH-SETS-TRUE-INSTEAD-OF-TOGGLE`
- `SWITCH-TOGGLES-ALL-EACH-COMMAND`
- `SWITCH-REUSES-INITIAL-STATE` (명령 무시)
- `SWITCH-USES-COMMAND-PARITY-ONLY` (명령 값 대신 개수 홀짝)

Fresh Transfer:

```text
entryFunction: apply_light_commands(lights, commands, panel_locked)
panel_locked가 True면 원본 상태 유지, False면 해당 인덱스만 반전
```

Explore는 선택된 인덱스와 그 칸의 전/후 값만 강조한다. 전체 목록이 바뀐 것처럼 설명하지 않는다.

## 5.5 AC-SIM-BELT-55 — 화물 벨트 한 칸 이동

### 계약

```text
entryFunction: advance_cargo_belt(belt, incoming)
belt: non-empty list, length 1..8
return: [outgoing, new_belt]
new_belt 길이는 항상 원래 belt 길이와 같음
```

한 칸 이동 규칙:

```text
[10, 20, 30], incoming=5
outgoing=30
new_belt=[5, 10, 20]
return [30, [5, 10, 20]]
```

공식 해법 골격 (검증 완료 — §1.2 검증 A; **리스트 결합 `[x] + list` 미지원이므로 38번 관행 사용**):

```python
def advance_cargo_belt(belt, incoming):
    outgoing = belt[-1]
    new_belt = [incoming]
    for i in range(len(belt) - 1):
        new_belt.append(belt[i])
    return [outgoing, new_belt]
```

pythonConcepts requires:

```js
['builtin:list', 'builtin:range', 'statement:for', 'method:append', 'syntax:slicing']
```

Public Test:

```text
([10,20,30], 5) -> [30, [5,10,20]]
([7], 9) -> [7, [9]]
```

Hidden 그룹:

- `normal-shift`
- `single-slot`
- `duplicate-values`
- `zero-incoming`
- `negative-values`
- `length-invariant` (길이 보존 — 8칸 최대 길이 케이스)

Wrong Fixture:

- `BELT-ROTATES-OUTGOING-TO-FRONT`
- `BELT-DROPS-INCOMING`
- `BELT-EXITS-FROM-FRONT`
- `BELT-REVERSES-REMAINING`

Fresh Transfer:

```text
entryFunction: advance_signal_buffer(buffer, new_signal)
return: [delivered_signal, updated_buffer]
```

2★는 유입·유출·길이 보존·나머지 상대 순서를 각각 확인한다.

## 5.6 AC-SORT-MIN-01 — 가장 작은 화물을 앞으로

### 현대화 범위

- ID, version, entryFunction 유지
- Public Kernel을 현재 성단 3·4 문제 수준으로 보강
- `sort-lab-lens`를 `state-transition`으로 교체
- Public Understanding 3문항과 Public Transfer Preview 2건 추가
- Private Hidden 5~6건, Wrong Fixture 4종, Transfer Master 4건으로 보강 — **추가 전용** (§1.3: 기존 hiddenTests가 새 hiddenTests의 부분집합인지 구현 시 확인)
- `syntax:swap`만 새 Python 도구로 소개
- `builtin:min` 의존 제거 (커널 20행 메타 필드 포함 — §4.1)

### 계약

```text
entryFunction: sort_cargo_step(cargos)
domain: integer list length 1..8
동작: 첫 번째 최소값 위치를 찾아 index 0과 정확히 한 번 교환
return: one selection step result
```

공식 해법 골격 (검증 완료 — §1.2 검증 D, tuple swap):

```python
def sort_cargo_step(cargos):
    min_index = 0
    for i in range(len(cargos)):
        if cargos[i] < cargos[min_index]:
            min_index = i
    cargos[0], cargos[min_index] = cargos[min_index], cargos[0]
    return cargos
```

대안 풀이: temp 변수 3단계 교환 (통과 유지).

pythonConcepts requires:

```js
['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:comparison-lower-bound']
```
introduces: `['syntax:swap']`

이 문제는 전체 정렬 문제가 아니다.

```text
[7, 5, 3, 2] -> [2, 5, 3, 7]
정답이 [2, 3, 5, 7]이면 “한 단계” 계약을 위반
```

Hidden 그룹:

- `minimum-at-end`
- `minimum-already-front`
- `minimum-in-middle`
- `single-item`
- `negative-minimum`
- `first-of-duplicate-minima`

Wrong Fixture:

- `SELECTION-NO-SWAP`
- `SELECTION-FULL-SORT` (한 단계 계약 위반 — 전체 정렬 반환)
- `SELECTION-SWAPS-WITH-LAST`
- `SELECTION-SELECTS-MAXIMUM`

2★는 “스캔 중 가장 작은 위치 기억”, “한 번만 교환”, “나머지가 아직 정렬되지 않아도 됨”을 묻는다.

Fresh Transfer의 기존 계약을 유지·보강한다.

```text
entryFunction: move_max_to_end(cargos)
동작: 첫 번째 최대값 위치를 마지막 위치와 한 번 교환
```

## 5.7 AC-SORT-BUBBLE-57 — 큰 화물을 뒤로 밀기

### 계약

```text
entryFunction: bubble_cargo_pass(cargos)
domain: integer list length 0..8      # 56(1..8)과 달리 빈 리스트 포함 — 의도적
동작: 왼쪽부터 이웃한 두 값 비교, 앞이 크면 교환; 전체 목록을 한 번 통과
return: one bubble pass result
```

공식 해법 골격 (검증 완료 — §1.2 검증 E):

```python
def bubble_cargo_pass(cargos):
    for i in range(len(cargos) - 1):
        if cargos[i] > cargos[i + 1]:
            cargos[i], cargos[i + 1] = cargos[i + 1], cargos[i]
    return cargos
```

> 빈 리스트·단일 항목은 `range(-1)`/`range(0)`이 자동으로 0회 순회되어 그대로 반환된다 (검증 로직과 일치).

pythonConcepts requires:

```js
['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:comparison-lower-bound']
```
introduces: `[]` (swap은 56에서 도입됨)

```text
[5,1,4,2] -> [1,4,2,5]
```

최댓값이 맨 뒤로 가지만 전체가 반드시 정렬되지는 않는다.

Hidden 그룹:

- `reverse-order`
- `already-sorted`
- `largest-already-end`
- `duplicates`
- `single-item`
- `empty-list`

Wrong Fixture:

- `BUBBLE-NO-SWAP`
- `BUBBLE-WRONG-COMPARISON` (`<`로 비교)
- `BUBBLE-STOPS-AFTER-FIRST-SWAP`
- `BUBBLE-FULL-SORT-INSTEAD-OF-ONE-PASS`

Fresh Transfer:

```text
entryFunction: bubble_smallest_to_front(cargos)
오른쪽에서 왼쪽으로 이웃을 비교하며 작은 값을 앞으로 보내는 한 번의 통과
```

> 구현 주의: "오른쪽→왼쪽" 통과는 `range` 감소 폼(`range(n-1, 0, -1)`)이 필요할 수 있다. **음수 step `range`는 이 가이드에서 검증하지 않았다** — 착수 시 먼저 작동 확인하고, 미지원이면 색인 `j = n - 1 - i` 변환으로 우회한다 (§1.2 원칙: evaluator 확장 금지).

행동 채점만 수행한다. 학생이 다른 올바른 전략으로 동일 결과를 만들었다고 AST로 거부하지 않는다. 인접 교환 이해는 Explore와 2★가 증명한다.

## 5.8 AC-SRCH-LINEAR-58 — 정렬되지 않은 창고 탐색

### 계약

```text
entryFunction: find_first_cargo(cargos, target)
domain: integer list length 0..12
return: target의 첫 번째 index, 없으면 -1
```

pythonConcepts requires:

```js
['builtin:list', 'statement:for', 'statement:if', 'operator:equality']
```

Public Test:

```text
([8,3,8], 8) -> 0
([4,6], 5) -> -1
```

Hidden 그룹:

- `first-position`
- `middle-position`
- `last-position`
- `duplicate-first-occurrence`
- `not-found`
- `empty-list`

Wrong Fixture:

- `LINEAR-RETURNS-BOOLEAN`
- `LINEAR-RETURNS-LAST-MATCH`
- `LINEAR-DEFAULTS-TO-ZERO`
- `LINEAR-CHECKS-FIRST-ONLY`

Fresh Transfer:

```text
entryFunction: find_first_signal(signals, target)
string token list에서 첫 위치 또는 -1
```

2★는 정렬되지 않은 목록에서는 중간값만 보고 절반을 버릴 수 없는 이유, 첫 일치에서 종료하는 이유, `-1` sentinel 의미를 확인한다.

## 5.9 AC-SRCH-BINARY-59 — 절반씩 줄이는 숫자 행성

### 계약

```text
entryFunction: binary_find_planet(sorted_planets, target)
domain: 오름차순·서로 다른 integer list, length 0..31
return: target index, 없으면 -1
```

공식 전략 (검증 완료 — §1.2 검증 9, 전체 해법 실행 통과):

```python
def binary_find_planet(sorted_planets, target):
    low = 0
    high = len(sorted_planets) - 1
    while low <= high:
        mid = (low + high) // 2
        if sorted_planets[mid] == target:
            return mid
        if sorted_planets[mid] > target:
            high = mid - 1
        else:
            low = mid + 1
    return -1
```

pythonConcepts requires:

```js
['builtin:list', 'statement:while', 'statement:if', 'statement:elif', 'operator:floor-division', 'operator:equality', 'operator:comparison-lower-bound']
```

Public Test:

```text
([2,5,8,12,20], 12) -> 3
([2,5,8,12,20], 7) -> -1
```

Hidden 그룹:

- `empty-list` (low=0, high=-1 → 즉시 -1)
- `first-position`
- `last-position`
- `middle-position`
- `absent-between-values`
- `absent-outside-range`

Wrong Fixture:

- `BINARY-CHECKS-MIDDLE-ONLY`
- `BINARY-DISCARDS-WRONG-HALF` (부등호 방향 반전)
- `BINARY-RETURNS-VALUE-NOT-INDEX`
- `BINARY-EXCLUDES-HIGH-BOUNDARY` (`high = mid`로 경계 포함 누락 — `last-position`에서 미종료 또는 오답)

Fresh Transfer:

```text
entryFunction: binary_find_energy(sorted_energy, target)
다른 수치 도메인의 정렬 목록에서 index 또는 -1
```

중요: Linear Search도 행동상 정답이면 1★를 받을 수 있다. 소스 검사나 큰 입력 타임아웃으로 이진 탐색을 강제하지 않는다. “왜 절반을 버릴 수 있는가”와 low/high 갱신은 Explore·2★로 검증한다.

Explore에는 최소한 `low`, `high`, `mid`, `midValue`, `decision`을 표시하고, 찾은 경우와 없는 경우를 `experimentReset + stateBefore`로 분리한다.

## 5.10 AC-SRCH-PREFIX-60 — 여러 구간의 방사선 합

### 계약

```text
entryFunction: range_radiation_sums(levels, queries)
levels: integer list length 1..12, each 0..50
queries: [start, end] inclusive, 0 <= start <= end < len(levels)
query count: 1..6
return: 각 query의 합 list
```

```text
levels=[3,5,2,4]
queries=[[0,1],[1,3]]
return [8,11]
```

누적 기록은 맨 앞에 0을 둔다.

```text
prefix=[0,3,8,10,14]
sum(start,end)=prefix[end+1]-prefix[start]
```

공식 해법 골격 (검증 완료 — §1.2 검증 F-우회; **첨자 중첩 금지 → 변수 추출 필수**):

```python
def range_radiation_sums(levels, queries):
    prefix = [0]
    total = 0
    for level in levels:
        total = total + level
        prefix.append(total)
    result = []
    for query in queries:
        start = query[0]
        end = query[1]
        result.append(prefix[end + 1] - prefix[start])
    return result
```

pythonConcepts requires:

```js
['builtin:list', 'statement:for', 'method:append', 'operator:arithmetic-state-update']
```

Hidden 그룹:

- `start-at-zero`
- `single-element-range`
- `full-range`
- `multiple-overlapping-ranges`
- `repeated-query`
- `single-level`

Wrong Fixture:

- `PREFIX-EXCLUDES-END`
- `PREFIX-NO-LEADING-ZERO`
- `PREFIX-RETURNS-TOTAL-FOR-EVERY-QUERY`
- `PREFIX-PROCESSES-FIRST-QUERY-ONLY`

Fresh Transfer:

```text
entryFunction: range_energy_sums(energy_log, windows)
windows 역시 inclusive [start,end]
```

2★는 `end+1`을 쓰는 이유, 선두 0의 역할, 겹치는 여러 질의를 매번 처음부터 더하지 않아도 되는 이유를 묻는다.

Explore는 두 실험으로 구성한다.

1. levels를 왼쪽부터 누적하여 prefix 완성
2. query 하나를 선택해 오른쪽 누적값 - 왼쪽 누적값으로 구간합 계산 (두 실험 사이도 `experimentReset` + `stateBefore`로 분리)

---

## 6. 파일 변경 목록

### 6.1 신규 Public Kernels 9개

```text
ac_sim_rover_51.js
ac_sim_compass_52.js
ac_sim_clock_53.js
ac_sim_switch_54.js
ac_sim_belt_55.js
ac_sort_bubble_57.js
ac_srch_linear_58.js
ac_srch_binary_59.js
ac_srch_prefix_60.js
```

### 6.2 신규 Private Definitions 9개

동일 basename의 `.private.cjs` 파일을 `functions/algorithmConstellation/problems/`에 만든다.

### 6.3 수정 파일 (v2: 레지스트리 추가)

```text
src/.../shared/catalog/constellationRegistry.js      # v2 신설 — requiredAnchors [56] → [51, 54, 56] (§2.3)
src/.../shared/problems/ac_sort_min_01.js
functions/.../problems/ac_sort_min_01.private.cjs
src/.../shared/problems/index.js
functions/.../problems/index.cjs
src/.../shared/catalog/algorithmEditorialCatalog.js
src/.../shared/patterns/problemSolvingPatternRegistry.js
src/.../shared/python/pythonConceptRegistry.js       # builtin:min 카드 정리 시에만
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

### 6.4 카탈로그 초안 → 최종 차이 (전 수치 대조 완료)

카탈로그 초안의 역할(`routeRole`/`learningRole`)은 §2.1 표와 이미 일치한다. 변경이 필요한 필드만 정리하면:

| 문제 | 초안 lensId | 최종 lensId | 초안 prerequisites | 최종 prerequisites |
|---|---|---|---|---|
| 51 | `grid-radar-lens` | `state-transition` | `[SEQ-005]` | `[SEQ-005, PAT-003, COND-ELIF-14]` |
| 52 | `cycle-timeline` | `state-transition` | `[51]` | `[51, PAT-003]` |
| 53 | `cycle-timeline` | `state-transition` | `[PAT-003]` | `[52, PAT-DIGIT-24]` |
| 54 | `decision-gate` | `state-transition` | `[COND-001]` | `[SEQ-005, COND-NOT-13]` |
| 55 | `sequence-accumulator` | `state-transition` | `[SEQ-005]` | `[SEQ-ROTATE-38]` |
| 56 | `sort-lab-lens` | `state-transition` | `[SEQ-005]` | `[SEQ-MINMAX-32, EXP-SWAP-04]` |
| 57 | `sort-lab-lens` | `state-transition` | (동일) | (동일) |
| 58 | `sort-lab-lens` | `state-transition` | `[SEQ-005]` | `[SEQ-005, PAT-003]` |
| 59 | `sort-lab-lens` | `state-transition` | `[58]` | `[58, EXP-WHILE-07, PAT-DIGIT-24]` |
| 60 | `sequence-accumulator` | `state-transition` | `[RUNNING-35]` | `[RUNNING-35, EXP-BOUND-05]` |

- 51~55, 57~60: `status: 'draft' → 'published'`
- 56의 `entrySupport: 'embedded-foundation'`과 stable ID 유지
- 선수 조건은 §2.2와 Public Kernel `curriculum.prerequisites`가 완전 일치 (게이트 계약이 양쪽을 대조함)

---

## 7. 테스트 설계

## 7.1 Authoring Integrity — 성단 5 공통 계약

기존 `c4ProblemIds` 패턴(41~48 하드코딩 배열 + 공통 루프)을 그대로 따라 `c5ProblemIds` 배열을 51~60 정확한 카탈로그 순서로 추가한다. 각 문제에 다음을 공통 적용한다.

- Public/Hidden 입력 중복 0건
- Public/Private Understanding deep equality
- Public/Private Transfer 메타데이터 deep equality
- Public Transfer Preview/Private Master 입력 중복 0건
- 등록된 Evidence Primitive만 사용
- 공식 Base/Transfer 누적 20,000 step 이내
- 공식·대안 풀이 통과
- wrong fixture가 선언 그룹에서 오답으로 기각
- fixture 문법·보안 오류 크래시 0건 (Invariant 5b)
- `state-transition` 프레임 ID 중복 0건
- 새 실험 프레임은 `experimentReset`과 `stateBefore`를 함께 사용
- Pattern Card syntax leak 0건 (신규 10종을 검사 목록에 추가)
- **공식 해법·대안·Transfer 해법에 음수 피연산자 modulo 없음** (§1.2 함정 1 — 구현 리뷰 항목)

등록 문제 수 단언은 `54 -> 63`으로 변경한다. 56은 이미 등록되어 있으므로 10개를 더한 64가 아니다. **이 단언은 49·50 Wave가 끝난 뒤의 값이다** (착수 시점 확인 필수).

## 7.2 독립 JS Oracle

공식 Python 코드를 번역하지 말고 다음 간단 Oracle을 사용한다.

| 문제 | 독립 Oracle |
|---|---|
| 51 | 명령 reducer로 `(pos,direction)` 갱신 |
| 52 | R=+1, L=+3 합계를 `% 4`로 정규화 (JS에서도 피연산자가 항상 음수가 아니게 유지) |
| 53 | 총 minute로 변환 후 24시간 분해 |
| 54 | JS 배열 복사 후 명령 index의 Boolean 반전 |
| 55 | `outgoing=last`, `[incoming, ...belt.slice(0,-1)]` |
| 56 | 첫 최소 index를 찾아 복사본의 0과 교환 |
| 57 | 복사본에 왼쪽→오른쪽 인접 교환 1회 |
| 58 | `indexOf(target)` |
| 59 | 정답 값은 `indexOf(target)`; Trace 전략은 2★에서 검증 |
| 60 | 각 query에 `levels.slice(start,end+1)` 합산 (JS reduce 등 자유 형식) |

## 7.3 도메인 검사

- 모든 명령 token은 허용 집합에 포함
- Index command와 query 경계는 유효 범위
- 59 입력은 엄격 오름차순이며 중복 없음
- 60 query는 inclusive이고 `start <= end`
- expected 반환 타입과 중첩 구조 검사
- 대칭 계약이 있는 Transfer는 양 방향 경계를 모두 검사
- 56 추가 전용 규칙: 현행 private hiddenTests ⊆ 새 hiddenTests

## 7.4 Gate `[Test 17]` — 성단 5 커리큘럼

> 번호 전제: `[Test 16]`은 49·50 Wave에서 추가된다. 이 Wave 착수 시점에 Test 16이 없다면 49·50이 아직 끝나지 않은 것이다 (선행 의존성 확인).

> **검증 API 주의 (v2)**: 성단 6은 출판 미션이 없어 `getConstellationAccess(6, …)`는 언제나 `mode: 'unavailable'`을 반환한다(출판 0개 조기 반환 — 구현 확인). 개방 **조건** 검증은 `isConstellationUnlocked(6, completed, catalog)`를 직접 호출해야 하며, 이 함수는 성단 6의 출판 여부와 무관하게 성단 5의 Anchor/Core 완료만 본다 (구현 확인 완료).

검증 항목:

1. 성단 5 Published ID가 정확히 51~60의 10개
2. Core 8 + Branch 2
3. Anchor가 정확히 51, 54, 56 (레지스트리 `requiredAnchors` 포함 — §2.3 수정 반영)
4. §2.2 선수 조건 일치 (카탈로그 ↔ 커널)
5. 선수 미완료/완료 잠금 전이
6. Core 5개 + Branch 2개로는 `isConstellationUnlocked(6) === false`
7. Anchor 하나가 빠진 Core 7개로도 `false`
8. Anchor 전부 + Core 6개면 `true`
9. Core 8개 완료 후 Branch 추가가 개방 상태를 바꾸지 않음 (`true` 유지)
10. 56 완료 학생(기존)이 선수 강화 후에도 56 재접근 가능 (completed-set 우선 규칙 회귀)

## 7.5 Server Lifecycle

기존 전체 수명주기 배열에 51~60을 추가한다. 56이 기존 프로토타입 테스트에 포함되어 있어도, 이번 Wave의 Public/Private 3-Star 계약을 확인하기 위해 수명주기 목록에는 포함한다.

별도 검증:

- 56의 기존 stable ID/version으로 재도전 가능
- 59 empty/first/last/absent 모두 권위 채점
- 60 중첩 query input 및 list output 직렬화
- 각 문제 대표 wrong fixture 1종 서버 기각

## 7.6 Runtime Parity

Public/Private index 등록만 하면 기존 패리티 매트릭스가 자동 순회한다. 신규 Matrix를 만들지 않는다.

특히 확인할 기능 (§1.2에서 서버측 검증 완료 — 패리티 테스트가 클라이언트측을 자동 대조):

- 54 list index mutation
- 55 nested list return
- 56·57 swap
- 59 `while`, `//`, low/high 경계
- 60 nested input list와 prefix list

> 원안의 "57 negative-step `range` Transfer" 항목은 §5.7의 검증되지 않은 기능이므로 착수 시 먼저 probe하고, 미지원 시 색인 변환 우회로 전환한다. 이 항목은 Gate 0의 capability probe 목록에 포함한다.

---

## 8. 구현 순서

10개를 한 번에 출판하되 실패 원인을 좁히기 위해 다음 순서를 지킨다.

```text
Gate 0  49·50 가이드 대칭 경계 명세 수정(문서) + 성단 5 런타임 capability probe
        (probe 항목: §1.2 지원 표 재확인 + 감소 step range — 모두 이 가이드에서 사전 검증했으므로 probe는 확인 수준)
  ↓
Gate A  패턴 10종 등록 + 레지스트리 requiredAnchors 수정 + Catalog prerequisites/lens/status 동기화
  ↓
Gate B  51~55 Public/Private 구현
  ↓
Gate C  56 현대화 + 57~60 Public/Private 구현
  ↓
Gate D  Public/Private index 등록 + Catalog 51~60 published
  ↓
Gate E  Authoring Oracle·도메인·총 개수 63 검증
  ↓
Gate F  Curriculum [Test 17] + Server Lifecycle 확장
  ↓
Gate G  전체 스위트·ESLint·프로덕션 빌드
```

Gate B가 통과하기 전에 Gate C 문제를 디버깅하지 않는다. 단, 최종 출판은 10개를 함께 한다.

---

## 9. 개발·비용 효율성 규칙

### 9.1 이번 Wave에서 허용되는 공통화

- `createCapabilityPrototypeKernel`
- 기존 Public/Private index
- 기존 Authoring 공통 루프 (`c4ProblemIds` → `c5ProblemIds` 패턴)
- `StateTransitionLens`
- 공용 Oracle helper 몇 개 (`inputKey`, array clone 등)

### 9.2 이번 Wave에서 만들지 않을 추상화

- `createSimulationProblem()` 같은 두 번째 문제 팩토리
- 문제별 Test Runner
- Lens Config 전용 DSL
- 문제 10개를 자동 생성하는 AI 저작 파이프라인
- sort/search 전용 Firestore progress 구조

반복이 보이더라도 10문제의 학습 계약이 안정된 뒤 공통화한다. 구현 중간 추상화는 디버깅 범위만 넓힌다.

### 9.3 Judge 비용

- 모든 Base/Transfer 공식 해법은 누적 20,000 step 이하 (§1.2 검증 해법들은 모두 훨씬 미달)
- 59의 list 길이는 최대 31
- 60의 levels 최대 12, queries 최대 6
- Bubble pass는 목록 한 번만 통과
- 성능 비교를 위해 수천 개 입력을 Hidden Test에 넣지 않음

### 9.4 번들 크기

현재 `AlgorithmConstellationHub` chunk가 이미 500kB 경고 기준을 넘었다. 이번 Wave에서 lazy-loading 구조까지 함께 만들면 작업 범위가 크게 늘어나므로 다음처럼 처리한다.

- Wave 전후 minified/gzip chunk 크기만 기록
- 빌드 실패가 아니면 이번 출판을 막지 않음
- Wave 완료 후 Hub chunk가 650kB 이상이거나 gzip이 Wave 전 대비 25% 이상 증가하면 별도 성단 단위 lazy-loading 작업을 계획
- 문제별 dynamic import를 이번 구현자가 즉흥적으로 추가하지 않음

### 9.5 평가기 `%` 의미 정렬 — 이 Wave에서 완료 (v2.1 정정)

이 샌드박스의 `%`는 원래 음수 피연산자에서 JS 나머지 동작을 했다. 실제 Python의 `%`는 항상 제수의 부호를 따르는 비음수 나머지를 반환한다. 원안은 이 정렬을 별도 과제로 기록만 남기고 저작물을 가산 형식으로 회피하는 전략이었으나, **리뷰 P1에 따라 이 Wave에서 평가기를 Python 의미로 정렬했다**(`sharedPythonEvaluatorCore`의 `%`를 floor 기반으로 변경, Client/Server 동기 사본 동일 적용). 정렬 후에는 `(d - 1) % 4` 같은 Python 문법상 정당한 감산 풀이도 정상 통과하며, 패리티 테스트에 음수 피연산자 나머지 매트릭스([Matrix 7])가 추가되어 두 사본의 의미 일치가 고정된다. 52·Transfer의 공식 해법은 여전히 가산 형식을 유지하지만 이제 교육적 선택일 뿐 강제 사항이 아니다.

---

## 10. 최종 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

통과 기준:

```text
Published = Public = Private = 63
성단 5 = Core 8 + Branch 2
Anchor(레지스트리 requiredAnchors 포함) = 51, 54, 56
공식/대안/Transfer 100% 통과
wrong fixture 선언 그룹 기각 100%
Client/Server parity 100%
새 Runtime/API/Firestore/Lens 0건
ESLint error/warning 0건
Build success
```

---

## 11. 구현 완료 체크리스트

- [ ] 49·50 가이드의 빈 입력 대칭 경계 명세가 수정됐다 (양 방향, Base/Transfer).
- [ ] 이 Wave 착수 시 등록 수 54·`[Test 16]` 존재를 확인했다 (선행 의존성).
- [ ] 51~60 모두 실제 등록된 `state-transition` Lens를 사용한다.
- [ ] 신규 Public 9개, 신규 Private 9개, 56 Public/Private 현대화가 완료됐다.
- [ ] 56의 ID/version/function/transfer ID가 유지됐고, hidden 변경이 추가 전용임을 확인했다.
- [ ] `constellationRegistry.js`의 성단 5 `requiredAnchors`가 51·54·56으로 수정됐다.
- [ ] 신규 Python 문법이나 런타임 capability가 없다.
- [ ] 공식·대안·Transfer 해법에 음수 피연산자 modulo가 없다 (가산 형식 사용).
- [ ] 55의 벨트 구성이 `[요소]` 리터럴 + `.append()` 관행을 따른다.
- [ ] 60의 query 인덱스가 변수 추출 후 사용된다 (첨자 중첩 없음).
- [ ] 56은 `syntax:swap` 하나만 소개하고 `builtin:min` 의존(메타 필드 포함)을 제거했다.
- [ ] 사고 패턴 10종이 10필드 계약과 syntax-leak 검사를 통과한다.
- [ ] 문제별 Understanding 3문항, Preview 2건, Hidden 5~6건, Transfer Master 4~5건 예산을 지킨다.
- [ ] Public/Hidden 및 Preview/Master 입력 중복이 없다.
- [ ] 59는 Linear Search 풀이를 소스 검사로 거부하지 않는다.
- [ ] 60은 inclusive query와 선두 0 prefix 정신 모델을 일관되게 사용한다.
- [ ] `[Test 17]`이 `isConstellationUnlocked` 기반으로 Anchor + Core 6/8 + Branch 비차단을 검증한다.
- [ ] 총 등록 수가 정확히 63이다.
- [ ] 전체 테스트·ESLint·Build가 통과한다.

---

## 12. 다른 AI에게 전달할 구현 지시문

> 이 문서를 기준으로 성단 5의 51~60 전체를 한 Wave로 구현하라. **착수 전에 등록 수 54와 `[Test 16]` 존재를 확인하라 — 없으면 49·50 Wave가 선행된다.** 신규 9문제와 기존 56 현대화를 수행하되 새 Lens, Callable, Firestore, evaluator 문법, 문제 팩토리를 만들지 마라. 모든 문제는 `createCapabilityPrototypeKernel`과 `state-transition`을 사용하라. 해법은 §1.2의 세 함정 규칙을 지켜라: 좌회전은 `(d+3)%4` 가산 형식, 리스트 결합 대신 `[요소]`+`append()`, 첨자 중첩 대신 변수 추출. `constellationRegistry.js`의 성단 5 requiredAnchors를 51·54·56으로 수정하는 것을 잊지 마라. 51~55와 56~60을 두 내부 배치로 구현한 뒤 10개를 함께 출판하라. 행동 기반 Judge를 유지하고 Binary Search나 Bubble Sort의 소스 형태를 검사하지 마라. Public/Private 동기화, 독립 JS Oracle, 오답 fixture 그룹, Anchor 51·54·56 및 Core 6/8 게이트(`isConstellationUnlocked` 기반)를 자동 테스트로 고정하라. 최종 등록 수는 63이며 전체 테스트·ESLint·Build가 통과해야 한다.
