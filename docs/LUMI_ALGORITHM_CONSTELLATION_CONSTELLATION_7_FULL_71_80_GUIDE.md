# LUMI 알고리즘 성단 — 성단 7 전체 10문제(71~80) 개발 가이드 (v2)

> 작성 기준: 2026-09-03, 작업 트리 HEAD `beea19d`
> 대상: 이 문서를 받아 구현할 AI와 리뷰어
> 이번 산출물은 개발 계획이다. 이 문서 작성 중 제품 코드·테스트 코드는 변경하지 않았다.
> 구현 단위: 기존 74번 보강 + 신규 9문제 = 성단 7 전체 10문제
> 완료 목표: 성단 0~7의 80문제 + 기존 85번 = Published / Public / Private **81개 ID 집합 동등성**

> **v2 변경 요약** (독립 재검증·측정으로 보강 — 원안 구조는 유지):
>
> 1. **원안 §2.3 탐침 표 6건을 전건 독립 재검증으로 확정**: `pop()` 무인자 정상, 빈 목록 `pop()` → `null` 결함 실재, `pop(0)` 인자 무시 결함 실재, `popleft`/`append(popleft())` 정상, `appendleft` 미지원. 원안의 판단은 전부 정확했다.
> 2. **탐침 2건 추가(원안 누락)**: `deque.pop()` 무인자는 **이미 정상 동작**(78 BACK_OUT·80 잘못된 Starter의 전제), `list.insert(0, x)`는 **미지원**(→ 78의 앞 추가는 `appendleft` 외에 경로가 없음을 실증).
> 3. **Gate 7A 회귀 감사 추가 (신설 §2.4)**: 기존 콘텐츠의 `.pop()` 사용 전량(74·85 fixture)이 `while queue:` 가드 안에 있어 "빈 pop → INDEX_ERROR" 변경이 회귀 없음을 확인. `pop(index)` 사용은 기존 콘텐츠에 0건.
> 4. **71~80 공식 해법 패턴 전량 실행 측정 (신설 §5.11 측정표)**: 72·75·76(Transfer 포함)·77·79의 골격을 실측해 모두 400 step 미만 — fixture 20,000 예산에 여유. 77의 n=20 기대값 **8**(실측), 76 Transfer `[3,2,3,1,2,3] → [3,1,4,0,2,5]`(실측)을 오라클 앵커로 추가.
> 5. Gate 6R 주장의 파일 증거(테스트 라인·중복 키 라인)와 상태 확인 스탬프(72개·14 스크립트·HEAD)를 각 절에 명시.
> 6. 75의 Hidden에 빈 문자열 로봇 라벨을 배제하는 경계 규칙 추가(OUT payload `''` 규약 모호성 방지).

## 1. 방향과 범위

다음 작업은 **성단 7 ‘스택과 대기열’ 71~80번을 한 Wave로 완성**하는 것이다.

MASTER PLAN의 ‘경험 → 발견 → 개념 → 이름 → 코드’, CORE 100의 71~80 배치, INTEGRATED ROADMAP의 Stage G를 따른다. 과거 문서의 시점별 문제 개수와 미구현 목록은 현재 코드보다 우선하지 않는다.

학습 목표는 ‘어려운 자료구조를 외우기’가 아니다. **무엇을 어디에 넣고, 어느 쪽에서 꺼내며, 그 뒤에 무엇이 남는지 설명하는 것**이다. 같은 코드가 한 사례에서는 맞고 다른 사례에서는 틀리는 이유를 작은 상태 변화로 확인한다.

### 1.1 비용·공수 원칙

- 신규 React 컴포넌트, Lens, Callable API, Firestore 컬렉션, AI API: **0개**.
- 신규 9문제는 `createCapabilityPrototypeKernel`과 `state-transition`을 재사용한다.
- 기존 74번은 `fifo-queue`와 기존 함수·버전·완료 기록을 보존한다.
- 런타임은 실제 미지원인 `appendleft`와 pop 계열의 잘못된 동작만 좁게 보완한다. 새 인터프리터, deque 클래스 체계, 전체 Python 지원 프로젝트는 만들지 않는다.
- 문제마다 전용 Scaffold·오개념 엔진을 추가하지 않는다. 현행 커널 기반 지원과 `ordered-buffer` 증거를 재사용한다.
- 접근성 인증, 학생 파일럿, 출판 승인 서류를 이번 Wave의 선행 게이트로 추가하지 않는다. 대신 실행 가능한 문제·경계값·표시 계약·서버 권위 테스트는 생략하지 않는다.
- 코딩 중에는 관련 테스트만 돌리고, 통합 후 전체 스위트·lint·build를 한 번씩 수행한다. 실패하면 해당 부분을 수정한 뒤 필요한 범위를 다시 실행한다.
- 커밋·배포·기존 기록 마이그레이션은 구현 완료와 별개다. 별도 요청 없이 수행하지 않는다.

### 1.2 이번에 하지 않는 일

재귀, `itertools`, 힙, 우선순위 큐, 모노토닉 스택, 연결 리스트, 일반 클래스 선언, `rotate`, 임의 import, 대규모 입력 경쟁, 새 랭킹/감시 정책은 추가하지 않는다. 81~90 격자 항해는 다음 Wave다.

## 2. 현재 상태와 최소 선행 보완

### 2.1 확인된 상태

| 항목 | 현재 확인 결과 | 이번 조치 |
|---|---|---|
| 등록 상태 | 72개, 61~70 Public/Private 존재 및 published | 성단 6을 다시 구현하지 않는다 |
| 저작 무결성 | `test-authoring-integrity-contracts.mjs` 72개 통과 | 기준선으로 유지 |
| 커리큘럼 테스트 | `test-gate0-curriculum-contracts.mjs` 통과 | 성단 6·7 전용 단언 보강 |
| 신규 문제 상태 | 71~73, 75~80은 catalog draft, Public/Private 없음 | 9개 추가 |
| 기존 74 | `AC-NAV-005`, v1, `process_signals` | 호환 보강 |
| 성단 7 Anchor | registry에는 현재 74만 등록 | 신규 71을 추가해 71·74로 확정 |
| 렌즈 | `fifo-queue`, `state-transition` 구현됨 | 미구현 `queue-conveyor-lens` / `source-debug-lens`를 새로 만들지 않는다 |
| 테스트 명령 | 현재 전체 명령은 14개 스크립트 연결 | 과거 ‘13개 스위트’ 문구를 복사하지 않는다 |

위 두 테스트를 이 계획 작성 중 실제 재실행했다. 전체 테스트·브라우저·빌드·프로덕션 배포 상태를 이번 계획에서 검증 완료로 주장하지 않는다.

> **v2 확인 스탬프**: HEAD `beea19d`·등록 72개 단언·`test:algorithm-constellation` 14개 스크립트 연결(신규 `test-algorithm-support-accuracy.mjs` 포함, package.json 확인)·74=`AC-NAV-005`(catalogOrder 74, constellation-7, core/anchor, published, `[AC-SEQ-005]`, `fifo-queue`)·85=`AC-NAV-006`(catalogOrder 85, constellation-8, published)·성단 7 `requiredAnchors: ['AC-NAV-005']` 단일 — 위 표의 전 항목을 이 문서 검토 시점에 파일로 재확인했다. 71~80 카탈로그 초안(71은 `queue-conveyor-lens`)도 확인했다.

### 2.2 Gate 6R — 빠진 검증만 보충

현재 커리큘럼 전용 섹션은 성단 5까지이며, 서버 수명주기 테스트의 Wave 배열도 60번까지다. 전체 테스트 성공만으로 61~70의 모든 서버 학습 흐름이 검증됐다고 해석하면 안 된다.

구현 초기에 기존 테스트 파일에 다음만 추가한다.

1. 61~70의 Core 8 / Branch 2, Anchor 61·65, 선수 관계 동기화.
2. 성단 7은 성단 6 Anchor를 포함한 Core 6개로 개방; Core 5 + Branch 2는 개방하지 않음.
3. 61~70의 기존 Start → Base → Understanding → Transfer 발급 → Transfer 제출 흐름을 같은 테스트 루프에 편입.
4. 과거 ‘성단 6에 published 문제가 없다’는 테스트 주석을 현재 사실로 갱신.
5. Public/Private 인덱스의 `AC-ENUM-PAIR-01` 중복 키를 하나로 정리하되 ID나 대상 객체를 바꾸지 않음.

이 작업은 새 게이트웨이나 새 테스트 프레임워크를 만드는 일이 아니다. 성단 6 결함이 실제 재현되면 해당 계약만 수리하고, 미확인 결함을 가정하여 성단 전체를 재작성하지 않는다.

> **v2 파일 증거 (주장 전건 확인)**: gate0의 마지막 전용 섹션은 `[Test 17]`(성단 5)이며 성단 6은 개방 술어 단언만 존재(약 1023~1051행, `isConstellationUnlocked` 직접 호출) — 역할·선수 동기화 섹션은 없다. 서버 수명주기 테스트의 pid 배열은 `AC-SIM-*`/`AC-SORT-BUBBLE-57` 등 **51~60까지만** 포함(61~70 `AC-ENUM-*` 없음). 인덱스 중복 키는 실재: `functions/.../problems/index.cjs` 93·145행(`AC-ENUM-PAIR-01@v1` 2회), `src/.../problems/index.js` 86·138행(2회) — 값이 동일해 동작은 무해하나 정리 대상 맞다.

### 2.3 런타임 사전 탐침 결과

아래는 클라이언트·서버 **공유 평가기 모듈**을 Node에서 각각 실행한 결과다. 실제 브라우저 Worker 통합 결과와는 구분한다.

| 탐침 | 양쪽 실제 결과 | 판정 |
|---|---|---|
| `[A,B]`의 인자 없는 `pop()` | 꺼낸 B, 남은 `[A]` | 지원 |
| deque `[A,B]`에서 `popleft`, C append | 꺼낸 A, 남은 `[B,C]` | 지원 |
| `queue.append(queue.popleft())` | `[B,A]` | 지원. 공식 해법은 두 줄로 분리해 추적을 쉽게 한다 |
| `appendleft(A)` | `UNSUPPORTED_SYNTAX` | 78번 출판 전 최소 구현 필요 |
| 빈 목록 `pop()` | 성공 + `null` | 오류를 조용히 정상 반환값으로 바꾸는 결함 |
| `[A,B].pop(0)`에 해당하는 변수 메서드 호출 | B | 인자를 무시하고 뒤에서 꺼내는 결함 |
| **deque의 인자 없는 `pop()`** (v2 추가) | `[A,B]` → 꺼낸 B, 남은 `[A]` | **지원** — 78의 BACK_OUT과 80의 잘못된 Starter가 의존하는 전제. Gate 7A는 이 동작을 변경하지 않고 보존한다 |
| **`list.insert(0, x)`** (v2 추가) | `UNSUPPORTED_SYNTAX` | **미지원** — 78의 앞 추가를 `insert`로 우회할 수 없음이 실증됨. `appendleft` 구현이 유일한 좁은 경로라는 §6.1 범위 판단의 근거 |

양쪽 결과가 같다는 것만으로 언어 의미가 올바른 것은 아니다. Gate 7A는 위 두 오류를 ‘패리티 성공’으로 인정하지 않는다.

> **v2 확인**: 위 표 6건(+추가 2건)은 이 문서 검토 시점에 서버 평가기에서 독립 재실행해 전부 재현 확인했다.

### 2.4 Gate 7A 회귀 감사 (v2 신설 — 의미 변경의 안전성 실증)

Gate 7A는 실행 의미를 두 가지 바꾼다(빈 `pop()` → INDEX_ERROR, `pop(index)` → 명시적 거부). **기존 출판 콘텐츠 전량에 대한 사용 감사 결과:**

- 기존 문제에서 `.pop()`을 쓰는 코드는 2곳 — `ac_nav_005.private.cjs`(74의 의도된 오답 fixture, "스택 방식")와 `ac_nav_006.private.cjs`(85의 코드 심판 fixture). **둘 다 `while queue:` 가드 안**이라 빈 컨테이너에 pop하는 경로가 없다 → "빈 pop 오류" 변경의 회귀 위험 0.
- `pop(인자)`를 쓰는 기존 코드는 **0건** → 명시적 거부로 바꿔도 영향 없음.
- 두 fixture의 `while queue:` 진실성 판정은 현재 런타임에서 이미 동작 중(전체 스위트 통과)이므로 §3.2의 "학생의 `while queue:` 대안 허용"은 현행과 정합이다.
- `appendleft` 추가는 순수 신규 — 기존 동작 변경 없음.

결론: Gate 7A의 변경 범위는 기존 72개 문제·fixture에 회귀를 일으키지 않는다. 이 감사를 Gate 7A 완료 조건에 "변경 후 기존 스위트 통과"와 함께 명시한다.

## 3. 10문제 구성과 학습 순서

| 번호 | 안정 ID | 역할 | 핵심 사고 | 함수 / 반환 | Lens |
|---|---|---|---|---|---|
| 71 | `AC-STACK-BOX-71` | Core Anchor | 마지막에 넣은 것을 먼저 꺼냄 | `unpack_suits(boxes)` → 문자열 목록 | state-transition |
| 72 | `AC-STACK-PAREN-72` | Core Practice | 열린 약속과 닫힌 약속을 짝지음 | `is_signal_balanced(message)` → bool | state-transition |
| 73 | `AC-STACK-UNDO-73` | Core Practice | 가장 최근의 유효 행동만 취소 | `restore_task_history(commands)` → 정수 목록 | state-transition |
| 74 | `AC-NAV-005` | Core Anchor | 도착 순서를 지켜 처리 | `process_signals(signals)` → 문자열 목록, 기존 유지 | fifo-queue |
| 75 | `AC-QUEUE-ROBOT-75` | Core Practice | 입장과 도착이 섞인 사건 처리 | `admit_robots(events)` → 입장 완료 목록 | state-transition |
| 76 | `AC-QUEUE-ROBIN-76` | Core Practice | 한 차례 처리 후 맨 뒤로 양보 | `schedule_transmissions(stations, turns)` → 처리 순서 | state-transition |
| 77 | `AC-QUEUE-CARD-77` | Core Practice | 버리기와 뒤로 보내기를 반복 | `last_space_card(n)` → 남은 카드 번호 | state-transition |
| 78 | `AC-DEQUE-DOCK-78` | Core Practice | 앞·뒤를 구별한 네 가지 출입 | `operate_space_dock(events)` → `[퇴장목록, 남은목록]` | state-transition |
| 79 | `AC-STACK-QUEUE-79` | Branch Review | 두 번 뒤집어 FIFO를 표현 | `serve_with_two_stacks(events)` → 처리 완료 목록 | state-transition |
| 80 | `AC-QUEUE-POP-80` | Branch Review | 잘못된 출구 선택의 반례와 수리 | `repair_dispatch_order(signals, limit)` → 처리 목록 | state-transition |

71~73은 LIFO, 74~77은 FIFO, 78은 양쪽 출입을 연결한다. 79·80은 선택 심화다. 어느 Core도 79·80 완료를 요구하지 않는다.

### 3.1 선수 조건 확정

아래 표는 catalog와 Public `curriculum.prerequisites`에 동일하게 반영한다. 숫자 설명을 실제 문자열 ID 대신 저장하지 않는다.

| 번호 | prerequisite ID 목록 |
|---|---|
| 71 | `AC-SEQ-RUNNING-35`, `AC-EXP-WHILE-07` |
| 72 | `AC-STACK-BOX-71` |
| 73 | `AC-STACK-BOX-71` |
| 74 | `AC-SEQ-005` — 기존 계약 유지 |
| 75 | `AC-NAV-005` |
| 76 | `AC-QUEUE-ROBOT-75` |
| 77 | `AC-QUEUE-ROBIN-76` |
| 78 | `AC-STACK-BOX-71`, `AC-QUEUE-ROBOT-75` |
| 79 | `AC-STACK-BOX-71`, `AC-QUEUE-ROBOT-75` |
| 80 | `AC-STACK-BOX-71`, `AC-NAV-005`, `AC-CODE-FIRST-ERROR-01` |

74는 이미 서비스된 Anchor이므로 선수 조건을 불필요하게 강화하지 않는다. 이전에 while/append를 경험하지 못한 학생도 `pythonConcepts.requires`의 First Encounter·복습 설명으로 보완한다. ‘앞 번호니까 배웠을 것’이라는 추측으로 개념 안내를 삭제하지 않는다.

기존 `getMissingPrerequisites`의 완료 문제 재진입 보호, `getConstellationAccess`의 grandfathered 보호를 유지한다. 보호 근거는 기존 서버 진도여야 하며, 로컬 드래프트를 공식 완료로 승격하지 않는다.

### 3.2 Python 개념 등록

- 신규 `method:pop`: 최초 71. ‘꺼낸 값이 반환되고 원래 목록에서 사라진다’, ‘빈 목록인지 먼저 확인한다’를 함께 설명한다. 이번 공식 문법은 **인자 없는 `.pop()`**이다.
- 기존 `class:deque`, `method:popleft`: 최초 74 유지. import는 도구를 가져오는 준비 줄이지 학생에게 설명 없이 외우게 할 주문이 아니다. 빈 deque 만들기·목록으로 만들기·앞/뒤를 설명한다.
- 신규 `method:appendleft`: 최초 78. 기존 append와 반대쪽에 하나를 넣는 연산으로 소개한다.
- 기존 `method:append`, `builtin:list`, `builtin:len`, `builtin:range`, `statement:for`, `statement:while`, `statement:if`, `statement:elif`, `operator:equality`, 산술/비교 개념을 실제 해법에 맞춰 requires에 연결한다.
- `list(queue)`는 이미 등록된 `builtin:list`의 복습 설명을 활용한다. `builtin:list` 예시에 변환 설명이 부족하면 기존 카드에 한 예시만 보강한다.
- 제어 흐름의 공식 설명은 `len(buffer) > 0`처럼 명시한다. 빈 컨테이너의 truthiness를 필수 신개념으로 늘리지 않는다. 학생의 `while queue:` 대안은 계속 허용한다.
- 문자열 괄호 한 종류, 이벤트의 두 칸 목록, 정수 명령표는 각 지문에서 직접 설명한다. `.split()`, `enumerate`, 문자열 파싱, 클래스 선언을 은근히 요구하지 않는다.

새 항목도 기존 레지스트리의 why / tinyExample / syntaxExample / predictionCheck / protocolRepairId 계약을 채운다. 2★·3★ 사고 질문과 달리 First Encounter에서는 짧은 문법 예시를 보여주는 것이 정상이다.

### 3.3 사고 패턴

| 패턴 ID | 최초 문제 | 내용 |
|---|---|---|
| `pattern:lifo-processing` | 71 | 최근에 넣은 항목부터 꺼내기 |
| `pattern:bracket-matching` | 72 | 아직 짝 없는 열림을 보관하고 하나씩 연결 |
| `pattern:undo-last-action` | 73 | 가장 최근 유효 기록만 취소 |
| `pattern:fifo-processing` | 74 | 가장 먼저 기다린 항목부터 처리 |
| `pattern:queue-event-simulation` | 75 | 도착·처리 사건을 입력 순서대로 반영 |
| `pattern:round-robin` | 76 | 한 차례 처리 후 남은 일을 뒤에 대기 |
| `pattern:discard-and-rotate` | 77 | 버릴 항목과 뒤로 보낼 항목을 구별 |
| `pattern:two-ended-buffer` | 78 | 추가/제거와 앞/뒤를 따로 결정 |
| `pattern:two-stack-fifo` | 79 | 비어 있을 때만 옮겨 두 번의 역순을 활용 |

80은 기존 `pattern:first-state-divergence`와 `pattern:counterexample-search`를 requires로 재사용한다. 패턴의 최초 문제가 Branch라는 이유로 그 Branch를 Core의 필수 선수로 추가하지 않는다. 기존 패턴 카드가 개념 설명을 맡는다.

## 4. 공통 저작·평가 계약

### 4.1 문제당 최소 완결 세트

1. 한 문장 목표, 입력·출력 의미, 빈 입력·빈 제거 규칙, 작은 예시.
2. Observe 1개 예측 + Explore 약 4~7장면 + 최소 1개 상태 예측 선택.
3. 실제로 다른 오류를 구별하는 Public Base 2~3건.
4. Private Base 통상 5~6건, 의도된 오답 3~4종. 테스트 개수 자체보다 서로 다른 실패 원인을 우선한다.
5. 2★는 값/상태 예측 1개와 원인/다음 행동 질문 1개. 둘 다 정답 암기가 아니라 입력의 의미를 검증한다.
6. 3★는 아래 지정된 Transfer 1개, Public preview 2건, Private master 통상 4건. **같은 Transfer 내 preview와 master의 입력 교집합은 0건**.
7. Public/Private의 질문 ID·선택지·기대답·설명·함수 signature를 동기화한다. Private에만 공식 코드·Hidden·Transfer master를 둔다.

새 문제는 Public `assessment.understandingChallenges`, `assessment.transferChallenges`; Private `understandingChallenges`, `transferMasterSet`의 현행 계약을 사용한다. 서버 응답에서 2★ 기대답과 master testCases가 노출되지 않는 기존 경계를 유지한다.

3★의 `thoughtCheck`는 로컬 학습 안내이며 서버 2★ 이해 증거를 대체하지 않는다. 그 로컬 정답과 숨겨야 할 서버 기대답을 혼동하지 않는다.

### 4.2 사고 카드와 Scaffold

새 Transfer는 현행 UI가 읽는 아래 형태로 통일한다. 별도 스키마 변환기를 추가하지 않는다.

```text
contextCard: { title, strategyGuide }
thoughtCheck: { question, options: [{ value, label }], expected }
```

- Observe/Explore/사고 질문은 ‘앞에 기다리던 A’, ‘최근 기록 B’, ‘처리 후 남은 줄’처럼 생각의 언어를 쓴다.
- 2★ 질문·3★ contextCard/thoughtCheck에 정답 함수·루프·메서드 호출 조합을 붙이지 않는다.
- First Encounter에는 문법 예시를, Code에는 signature와 필요한 import를 제공한다. 코드 수리 문제의 잘못된 Starter는 의도적인 과제이므로 허용한다.
- 새 문제의 `ruleStatement`, `predictionPrompt`, `discoveryQuestion`, 공개 예시는 동적 S1~Rescue가 재사용할 수 있게 해당 문제에 맞게 작성한다.
- 현행 동적 S5는 구현 점검 질문이며 진짜 코드 Parsons가 아니다. ‘맞춤형 Parsons 엔진 구현 완료’라고 보고하지 않는다.
- 신규 10종의 정답 코드를 클라이언트 Scaffold에 복제하지 않는다. Rescue는 규칙·공개 예시 복습으로 사용한다. 완성 코드가 없는 것을 있다고 표시하지 않는다.

### 4.3 상태 표시

- 모든 목록의 **왼쪽=앞/바닥, 오른쪽=뒤/맨 위**를 명시한다. 스택은 오른쪽, 큐는 왼쪽에서 꺼낸다.
- 신규 문제는 `stack`, `queue`, `served`, `history`, `remaining`, `incoming`, `outgoing` 등 짧고 일관된 상태 이름을 쓴다.
- 현재 StateTransitionLens는 중첩 배열을 평평하게 보일 수 있다. 이번 문제의 Explore는 중첩 이벤트 목록 전체 대신 `operation`, `payload`, 대기 목록, 처리 목록을 각각 별도 변수로 보여준다. 이를 위해 공용 포매터 재작성에 착수하지 않는다.
- `introContext.variables[].value`에는 이미 읽기 좋게 만든 간단한 문자열을 사용한다. 객체를 `String()`에 맡겨 `[object Object]`를 표시하지 않는다.
- 독립 반례 실험은 `experimentReset: true`와 `stateBefore`를 같이 명시한다. 이전 실험의 최종 상태에서 이어지는 것처럼 만들지 않는다.
- 사전 저작 Explore 장면은 학생 코드의 실행 Trace가 아니다. 실제 Trace는 공유 평가기 이벤트를 사용한다.
- `codeSnippet`에 공식 알고리즘을 먼저 노출하지 않는다. 상태 전후를 보여 주되 학생이 다음 동작을 먼저 예상하게 한다.

### 4.4 채점과 대안 해법

1★은 반환 행동을 채점한다. pop 사용 횟수, deque 사용 여부, 변수명, AST 모양을 정답 조건으로 만들지 않는다.

특히 71은 역순 복사, 72는 균형 카운터, 74는 입력 목록 복사, 79는 일반 큐 구현도 행동이 맞으면 1★ 정답이다. 이것으로 ‘스택 구현을 입증했다’고 보고하지 않는다. 자료구조 정신 모델은 2★의 상태 예측으로 별도로 확인한다.

2★를 대안 풀이 강제 수단으로 사용하지 않는다. 학생이 짧게 풀었더라도 제시된 스택/큐 장면을 올바르게 설명하면 통과한다.

## 5. 문제별 확정 명세

아래 입출력 예시는 계약 설명용이다. 모두 그대로 Hidden에 복제하지 말고 공개용·비공개용을 나눠 저작한다. 신규 ID는 catalog의 안정 ID를 그대로 사용하고, version은 1로 시작한다.

### 5.1 71 — 우주복 박스 쌓기

- 함수: `unpack_suits(boxes)`.
- 입력: 쌓은 순서의 문자열 목록, 길이 0~16. 왼쪽이 맨 아래다. 같은 라벨도 서로 다른 박스이므로 중복을 보존한다.
- 출력: 모두 꺼내는 순서. `['A','B','C'] → ['C','B','A']`, `[] → []`.
- 공식 사고: 도착 순서대로 스택에 넣기 → 비어 있지 않은 동안 맨 위를 꺼내 기록.
- Explore: A·B 넣기 → 먼저 꺼낼 박스 예상 → B 꺼내기 → C 새로 넣기 → 다음은 C라는 상태 예측. 단순 문자열 역순 장면만 보여주지 않는다.
- 2★: `[A,B]`에서 하나를 꺼낸 뒤 C를 넣으면 다음 출력은 C, 남는 것은 `[A]`라는 점을 확인한다.
- Hidden: 빈 입력, 하나, 둘, 긴 비대칭 목록, 같은 라벨 반복.
- 오답: `LIFO-USES-FRONT`, `LIFO-SKIPS-LAST-ITEM`, `LIFO-DEDUPLICATES`, 반환값과 컨테이너를 혼동하는 fixture 중 3종 이상.
- Transfer: `unload_energy_cells(cells)` — 정수 배터리 목록을 쌓인 역순으로 반환. 길이 0~16, 값 0~99. 순서와 중복 보존을 다른 자료에 적용하는 **근접 전이**다.

### 5.2 72 — 괄호 통신 검증

- 함수: `is_signal_balanced(message)`.
- 입력: `'('`, `')'`만으로 된 문자열, 길이 0~24. 다른 문자 처리 규칙을 암묵적으로 추가하지 않는다.
- 출력: 모든 닫힘에 앞선 열림이 있고 끝에 남은 열림이 없으면 True. 빈 문자열은 True.
- 핵심 사례: `'()()' → True`, `'(())' → True`, `')(' → False`, `'(()' → False`.
- 공식 사고: 열림을 보관; 닫힘인데 보관한 열림이 없으면 실패; 하나 짝짓기; 끝의 미해결 열림 확인. 조기 return은 가능하며 break 확장은 필요 없다.
- 2★: `')('`는 최종 개수가 같아도 첫 순간에 실패한다. `'(()'`는 끝에 미해결 열림이 하나 남는다.
- Hidden: 빈 문자열, 닫힘 먼저, 열림 남음, 여러 독립 쌍, 중첩, 길이가 홀수인 입력.
- 오답: `PAREN-COUNTS-ONLY`, `PAREN-IGNORES-UNFINISHED`, `PAREN-IGNORES-EMPTY-CLOSE`, `PAREN-REJECTS-NESTING`.
- Transfer: `is_beacon_frame_valid(frame)` — `'['`, `']'` 한 종류의 프레임 짝짓기. 빈 입력·중첩·닫힘 우선 규칙 동일. 여러 종류의 괄호 매칭이나 dict 매핑은 요구하지 않는다.

### 5.3 73 — 잘못된 명령 되돌리기

- 함수: `restore_task_history(commands)`.
- 입력: 정수 목록 길이 0~24. 1~99는 작업 번호를 기록, 0은 가장 최근의 **남아 있는** 작업 하나를 취소. 취소할 작업이 없으면 아무 변화 없음.
- 출력: 남은 작업 번호를 기록 순서대로 반환.
- 예: `[4,7,0,9] → [4,9]`, `[0,5,0,0] → []`, `[3,3,0] → [3]`.
- 2★: 연속 취소는 원래 입력의 직전 원소를 지우는 것이 아니라 현재 기록의 맨 위를 지운다.
- Hidden: 취소 없음, 빈 목록에서 취소, 전부 취소, 연속 취소, 취소 후 재기록, 중복 작업.
- 오답: `UNDO-REMOVES-OLDEST`, `UNDO-REUSES-ORIGINAL-HISTORY`, `UNDO-CLEARS-ALL`, `UNDO-RECORDS-ZERO`.
- Transfer: `sum_active_charges(commands)` — 양수는 충전 기록, 0은 최근 충전 기록 취소; 남은 충전량의 합을 반환. 예 `[5,8,0,2] → 7`. 합산은 기존 누적 루프를 사용하며 `sum()`을 미설명 필수 문법으로 추가하지 않는다.

### 5.4 74 — 기존 구조 신호 대기열 보강

다음 호환 계약을 유지한다.

| 항목 | 유지값 |
|---|---|
| problemId / version | `AC-NAV-005` / `1` |
| Base | `process_signals(signals)` — 전체 도착 순서 반환 |
| Transfer ID | `AC-NAV-005-T1` |
| Transfer | `process_cargo(cargo_list)` — 전체 선적 순서 반환 |
| Understanding | `uc_nav_05_01`, 기존 q1·q2의 의미와 기대답 |
| Lens | `fifo-queue` |

보강 항목:

1. Public에 현재 Private의 이해 확인·전이 안내를 채운다. 사고 질문은 ‘가장 앞 A / 가장 뒤 C’로 재서술할 수 있지만 기존 질문 ID·기대답 의미는 바꾸지 않는다.
2. 기존 Transfer master 입력 3건은 유지 가능하다. 새 Public preview 2건은 그 입력들과 겹치지 않게 쓴다. 기존 v1을 맞추려고 무조건 master를 4개로 늘리지 않는다.
3. Private Transfer에 테스트 전용 공식 해법이 없다면 명시해 서버 전체 수명주기 검증에 쓴다. 이 코드는 Public에 넣지 않는다.
4. 신규 thinking pattern 및 `curriculum`의 역할·번호를 보강한다. 기존 Public을 팩토리로 전면 이식할 필요는 없다.
5. `QueueFifoLens.jsx`의 실제 배열 렌더링은 왼쪽 idx 0이 Front인데 상단 라벨은 왼쪽 Rear / 오른쪽 Front다. **왼쪽 출구 Front, 오른쪽 입구 Rear로 라벨을 맞춘다.** 새 애니메이션을 만들지 않는다. (v2 확인: 라벨 반전 실재 — 셀은 `idx === 0`을 Front 스타일로 강조하나 헤더는 왼쪽 `입구 (Rear)`·오른쪽 `출구 (Front)` 순으로 배치돼 있다. 수정 방향이 올바르다.)
6. navigator 안내에서 바로 완성 루프를 지시하는 설명은 의미 중심으로 다듬고, import/deque/popleft 소개는 First Encounter에 맡긴다.

기존 올바른 for 복사 풀이도 계속 통과해야 한다. 기존 별을 삭제하거나 새 2★ 설명을 이유로 재취득을 요구하지 않는다. 평가 의미 변경이 필요한 별도 아이디어는 v1에 덮어쓰지 않고 후속 버전 과제로 남긴다.

### 5.5 75 — 탐사 로봇 입장 순서

- 함수: `admit_robots(events)`.
- 입력: 길이 0~24의 두 칸 이벤트 목록. `['IN', robot]`은 뒤에 도착, `['OUT', '']`은 앞 한 명 입장. 다른 명령은 입력에 없다. OUT의 두 번째 칸은 의미 없는 빈칸이다.
- 출력: 실제 입장한 robot 라벨 목록. 빈 대기열의 OUT은 무시한다. 끝에 남은 로봇은 자동 입장시키지 않는다.
- 예: `IN A, IN B, OUT, IN C, OUT → [A,B]`, 마지막 대기열은 `[C]`.
- Explore: 초기 줄이 비어 있음 → 도착 둘 → 첫 입장 → 새 도착 → 다음 입장을 각각 보여준다.
- 2★: 먼저 기다린 B보다 새로 온 C가 먼저 입장할 수 없는 이유와 남은 줄 예측.
- Hidden: 빈 이벤트, 빈 줄 OUT, 도착만, 섞인 도착/입장, 중복 라벨, 남은 항목 존재.
- **입력 경계 (v2)**: 로봇 라벨로 빈 문자열 `''`을 사용하지 않는다. OUT payload가 `''`인 규약과 충돌해 "명령 판정은 `event[0]`만으로"라는 계약이 모호해진다.
- 오답: `QUEUE-USES-LIFO`, `QUEUE-DRAINS-AT-END`, `QUEUE-IGNORES-LATE-ARRIVAL`, 빈 OUT에 가짜 결과를 추가하는 오류.
- Transfer: `dispatch_supply_requests(events)` — `['ADD', label]` / `['SEND','']`, 출력 `[발송목록, 남은대기목록]`. 의미는 같지만 반환에서 남은 상태까지 보존해야 한다. 두 목록의 순서를 지문에 명시한다.

### 5.6 76 — 번갈아 통신하는 기지

- 함수: `schedule_transmissions(stations, turns)`.
- 입력: 서로 다른 기지 라벨 0~8개, turns는 정수 0~20.
- 규칙: 한 번에 앞 기지 하나가 통신하고 맨 뒤로 이동. 지정 횟수만큼 반복하되 기지가 없으면 결과는 빈 목록.
- 출력: 통신한 기지 순서. `[A,B,C], 5 → [A,B,C,A,B]`.
- 2★: 첫 통신 뒤 줄은 `[B,C,A]`, 통신 기회가 남았다고 A를 즉시 연속 처리하면 안 되는 이유.
- Hidden: 빈 목록+양수 turns, 0회, 한 기지, 한 바퀴 미만, 한 바퀴 초과, 정확히 여러 바퀴.
- 오답: `ROBIN-NO-REQUEUE`, `ROBIN-REQUEUE-FRONT`, `ROBIN-OFF-BY-ONE`, `ROBIN-IGNORES-TURNS`.
- Transfer: `finish_packet_batches(packet_counts)` — 인덱스가 기지 번호인 정수 목록(길이 0~6, 각 0~3). 처음 0인 기지는 대기열에 넣지 않는다. 차례마다 패킷 하나 처리, 남으면 뒤로 이동, 0이 되는 순간 기지 번호를 완료 목록에 기록한다.
- Transfer 예: `[2,1,2] → [1,0,2]`, `[0,1] → [1]`, 전부 0이면 `[]`. 총 처리 횟수는 최대 18이라 종료가 명확하다. **실측 앵커 (v2)**: `[3,2,3,1,2,3] → [3,1,4,0,2,5]` (391 step).
- Transfer 설명은 ‘대기열에는 기지 번호, 별도 목록에는 남은 패킷 수’라는 두 상태를 구별한다. 아직 2차원 객체·클래스를 요구하지 않는다. 입력 복사와 해당 위치 값 갱신은 짧은 복습 설명을 제공한다.

### 5.7 77 — 한 장씩 버리는 우주 카드

- 함수: `last_space_card(n)`.
- 입력: 정수 1~20. 카드 1~n이 앞에서 뒤로 놓인다.
- 규칙: 맨 앞 한 장을 버리고, 남은 카드가 있으면 맨 앞 한 장을 맨 뒤로 옮긴다. 한 장이면 끝.
- 출력: 마지막 카드 번호. `n=1 → 1`, `n=2 → 2`, `n=5 → 2`, `n=6 → 4`.
- 공식 사고: 남은 수가 1보다 큰 동안 ‘버리기 → 옮기기’를 구별한다. n=0은 이번 문제 입력 계약 밖이다.
- 2★: `[1,2,3,4]` 한 라운드 후 `[3,4,2]`. 옮기는 것은 새 앞 카드 2이지 이미 버린 1이 아니다.
- Hidden: 1, 2, 홀수 크기, 짝수 크기, 최대 크기 중 서로 다른 결과를 구별하는 5건 내외. **실측 앵커 (v2)**: `n=20 → 8` (377 step, 시뮬레이션 실측 — 저작 시 JS 오라클과 교차 확인). 원안 명시값 `n=1→1, 2→2, 5→2, 6→4`는 손계산으로 재확인 완료.
- 오답: `CARD-ROTATE-BEFORE-DISCARD`, `CARD-DISCARD-TWO`, `CARD-ROTATES-DISCARDED`, `CARD-STOPS-EARLY`.
- Transfer: `card_elimination_order(cards)` — 서로 다른 양수 카드 목록 길이 1~12에 같은 규칙 적용. **버린 카드 순서 뒤에 마지막 생존 카드까지 붙인 전체 순서**를 반환. `[10,20,30,40] → [10,30,20,40]`.
- 카드를 하나도 빠뜨리지 않는 종료·기록을 검증한다. 요세푸스 일반화나 점화식 설명은 필요 없다.

### 5.8 78 — 앞·뒤 출입 우주 도크

- 함수: `operate_space_dock(events)`.
- 입력: 길이 0~24의 이벤트 목록. 각 이벤트는 `[명령, 라벨]`의 두 칸이다.

| 명령 | 의미 | 라벨 |
|---|---|---|
| `FRONT_IN` | 앞에 추가 | 문자열 |
| `BACK_IN` | 뒤에 추가 | 문자열 |
| `FRONT_OUT` | 앞에서 꺼내 퇴장 기록 | `''` |
| `BACK_OUT` | 뒤에서 꺼내 퇴장 기록 | `''` |

- 빈 도크의 퇴장은 무시. 끝에 남은 항목은 강제 퇴장시키지 않는다.
- 출력: `[removed, remaining]`, 두 목록 모두 왼쪽부터 순서대로.
- 예: 뒤 A → 앞 B → 뒤 C → 앞 퇴장 → 뒤 퇴장 = `[[B,C],[A]]`.
- 2★: ‘앞/뒤’와 ‘추가/제거’를 따로 결정하는 두 축의 질문. deque를 쓰면 자동으로 FIFO라는 오개념을 막는다.
- Hidden: 네 명령 각각, 빈 퇴장, 앞뒤 혼합, 중복 라벨, 남은 목록, 빈 이벤트. 유사 입력은 합쳐 6건 내외.
- 오답: `DEQUE-SWAPS-ENDS`, `DEQUE-ALL-IN-TO-BACK`, `DEQUE-ALL-OUT-FRONT`, `DEQUE-REVERSES-REMAINDER`.
- Transfer: `operate_numeric_dock(events)` — 같은 네 명령에 정수 화물 라벨을 사용. OUT payload는 0이지만 IN의 0은 실제 화물이므로 보존한다. 출력 형식 동일. 라벨의 참/거짓으로 명령을 판정하는 실수를 구별한다.
- 앞 추가를 목록 전체 복사로 우회시키지 않는다. Gate 7A의 작은 `appendleft` 지원을 활용한다. 구현 범위가 갑자기 커지면 78의 계약을 조용히 바꾸지 말고 먼저 차이를 보고한다.

### 5.9 79 — Stack으로 Queue를 흉내 내면?

- 함수: `serve_with_two_stacks(events)`.
- 입력/출력: 75와 같은 IN/OUT 사건 계약, 길이 0~24. 처리 완료 목록 반환, 빈 OUT 무시.
- 학습용 내부 모델: 도착용 incoming, 출발용 outgoing. outgoing이 비었을 때만 incoming을 하나씩 꺼내 outgoing으로 옮긴다. outgoing이 남았으면 새 도착을 덧섞지 않는다.
- 핵심 입력: IN A, IN B, OUT, IN C, OUT, OUT → `[A,B,C]`.
- Explore: 두 스택을 각각 바닥→맨 위로 표시. 첫 OUT 뒤 incoming `[]`, outgoing `[B]`; C 도착 뒤 incoming `[C]`, outgoing `[B]`; 다음 출력은 B.
- 2★: outgoing에 B가 남았을 때 C를 옮기면 왜 C가 먼저 나가 버리는지 설명한다. ‘매번 뒤집기’가 아니라 ‘필요할 때만 옮기기’를 묻는다.
- Hidden: 도착만, 첫 배치 처리, 잔여 outgoing+새 도착, 여러 번의 이동, 빈 OUT, 같은 라벨.
- 오답: `TWO-STACKS-TRANSFER-EVERY-TIME`, `TWO-STACKS-NO-REVERSAL`, `TWO-STACKS-DROPS-NEW-ARRIVAL`, `TWO-STACKS-READS-INCOMING-FIRST`.
- Transfer: `serve_crate_requests(commands)` — 양의 정수는 화물 도착, 0은 하나 처리. 출력 `[처리목록, 남은 FIFO 목록]`. 길이 0~24. 예 `[4,8,0,6] → [[4],[8,6]]`.
- 1★/3★에 두 스택 사용을 AST로 강제하지 않는다. 2★에서 제시한 두 스택의 상태 의미를 확인한다. 분할상환 복잡도 증명이나 클래스 API 구현은 요구하지 않는다.

### 5.10 80 — pop과 popleft의 한 줄 차이

- 함수: `repair_dispatch_order(signals, limit)`.
- 입력: 문자열 목록 길이 0~16, 정수 limit 0~16. limit가 목록보다 클 수도 있다.
- 요구: 먼저 도착한 신호부터 최대 limit개 처리하여 반환.
- 잘못된 Starter: deque의 뒤쪽에서 꺼내는 실행 가능한 코드. import·빈 큐 보호·횟수 관리는 올바르게 두고 **출구 선택만** 틀리게 한다.
- 예: `[A,B,C], 2 → [A,B]`. Starter는 `[C,B]`라서 실제 Wrong Answer여야 한다.
- 2★: 서로 다른 신호 `[A,B]`에서는 첫 출력부터 차이, `[A,A]`나 한 개만으로는 잘못된 방향을 구별할 수 없음을 질문한다.
- Hidden: 빈 목록, limit 0, 한 개, 비대칭 두 개, 일부 처리, limit>길이, 중복 라벨 중 6건 내외.
- 오답: `DISPATCH-WRONG-END`, `DISPATCH-IGNORES-LIMIT`, `DISPATCH-OFF-BY-ONE`, `DISPATCH-FORCES-EMPTY-POP`.
- Transfer: `repair_recent_history(history, limit)` — 반대로 최근 기록부터 최대 limit개 복원하는 LIFO 요구. 잘못된 Starter는 앞에서 꺼낸다. `[A,B,C],2 → [C,B]`.
- Base에서 외운 ‘항상 popleft가 정답’을 Transfer에서 깨뜨린다. 두 Starter 모두 실제 반례에서 실패하고 수정한 코드가 통과하는 테스트를 둔다.

### 5.11 공식 해법 패턴 측정표 (v2 신설 — 전건 서버 평가기 실측)

71~80의 공식 해법 골격을 이 문서 검토 시점에 실행 측정했다. 구현자는 재측정 없이 예산 설계에 착수할 수 있다. (78의 `appendleft`와 Gate 7A 후의 빈 pop 오류는 구현 후 이 표에 맞춰 재확인한다.)

| 문제 | 측정 입력 | 결과 (기대와 일치) | steps |
|---|---|---|---|
| 72 괄호 균형 | 24자 완전 중첩 `'(((...)))'` | `True` | 251 |
| 75 이벤트 FIFO | 24개 이벤트 (IN 16/OUT 8) | 입장 8개·FIFO 순서 정상 | 280 |
| 76 Base 라운드 로빈 | 골격 패턴 (append(popleft()) 포함) | `[B,A]` 순환 정상 | §2.3 탐침 |
| 76 Transfer 패킷 | `[3,2,3,1,2,3]` | `[3,1,4,0,2,5]` | 391 |
| 77 카드 | `n=20` | `8` | 377 |
| 79 두 스택 | `IN A, IN B, OUT, IN C, OUT, OUT` | `[A,B,C]` | 131 |
| 71/73/80 | append·pop·가드 조합 | §2.3 탐침으로 패턴 확인 | <100 수준 |
| deque `pop()` 무인자 | `[A,B]` | `B`, 남은 `[A]` | 12 |

결론: **전 문제가 단일 실행 400 step 미만** — Hidden 6건 + fixture 4종을 합쳐도 fixture 누적 20,000 예산에 한 자릿수 비율로 여유. §6.4의 "구현 후 측정" 요구는 유지하되, 이 표가 초기 설계의 근거가 된다.

## 6. Gate 7A — 최소 런타임·증거 보완

### 6.1 변경 범위

- `runtime/sharedPythonEvaluatorCore.js`
- `functions/algorithmConstellation/sharedPythonEvaluatorCore.cjs`
- `shared/evidence/evidencePrimitives.js`
- 해당 동작을 다루는 기존 패리티/Trace/샌드박스 테스트

두 평가기는 현재 별도 ESM/CJS 파일이다. 한쪽만 고치지 않는다. 이 Wave를 모듈 시스템 통합이나 빌드 생성기 도입 프로젝트로 확장하지 않는다.

### 6.2 정확한 동작 계약

1. `appendleft(value)`는 앞에 정확히 하나를 추가하고 None을 반환한다. `append`와 마찬가지로 mutation 전/후 snapshot과 `metadata.operation: 'appendleft'`를 기록한다.
2. 인자 없는 `pop()` / `popleft()`가 빈 컨테이너에서 호출되면 명시적 `INDEX_ERROR`로 실패한다. 성공+null로 바꾸지 않는다. 제품 메시지는 ‘꺼낼 항목이 있는지 먼저 확인해 보세요’처럼 안내한다.
3. `append` / `appendleft`는 인자 하나, `pop` / `popleft`는 이번 제한 문법에서 인자 0개를 요구한다. 잘못된 개수는 조용히 무시하지 않는다.
4. **`list.pop(index)` 전체 지원은 이번 범위에서 제외**한다. 현재 `pop(0)`을 잘못 계산하는 대신 `UNSUPPORTED_SYNTAX`로 ‘현재 실행기는 위치 인자가 있는 pop을 지원하지 않으며, deque의 앞 제거를 사용할 수 있다’고 명시한다. 이는 Python 문법 자체가 틀렸다는 뜻이 아니다. 지원 한계 메시지와 오개념 진단을 구분한다.
5. 내부 list/deque가 같은 배열 표현인 현행 제한은 유지한다. 이를 완전한 Python 타입 구별로 홍보하지 않는다. 신규 공식 코드·fixture는 list에서 appendleft/popleft를 호출하지 않는다.
6. 실패 호출은 성공 mutation을 기록하지 않는다. 인자 검증은 컨테이너 변경 전에 수행한다. 일반적인 실패의 runtime-error 이벤트·자원 제한 계약을 유지한다.
7. 입력이나 메서드 이름으로 임의 JS 메서드를 호출하는 dispatch로 바꾸지 않는다. `unshift`, `shift`는 내부 구현 수단일 뿐 학생에게 열어 주는 API가 아니다.
8. **deque의 인자 없는 `pop()`은 현재 올바르게 동작한다(§2.3 v2 탐침) — 이번 변경 대상이 아니다.** 변경하는 것은 빈 컨테이너 오류화와 `pop(index)` 명시적 거부뿐이며, 그 회귀 안전성은 §2.4 감사로 확정했다. `list.insert`는 미지원 상태를 유지한다(78은 `appendleft` 경로 사용).

### 6.3 Trace·Replay·버전

- `ordered-buffer`의 operation allowlist에 `appendleft`를 추가한다. 기존 pop/popleft/append 이벤트 의미는 보존한다.
- 변수명이 `dock`, `incoming`, `outgoing`이어도 operation으로 증거를 찾는 테스트를 둔다. `queue`라는 이름에만 의존하지 않는다.
- 앞 추가/앞 제거/뒤 추가/뒤 제거 각각의 source line, before, after, 꺼낸 값의 대입 장면을 확인한다. snapshot이 이후 mutation에 같이 바뀌지 않아야 한다.
- appendleft 추가와 빈 pop 오류 수정은 실행 의미 변경이다. 기존 `interpreterVersion`을 그대로 사용하며 과거 replay와 완전 동일하다고 주장하지 않는다.
- 새 세션에 새 interpreter 식별자를 부여하고, 과거 descriptor의 재실행 가능 여부는 기존 replay 호환 검사 경로에서 확인한다. v1을 새 엔진으로 조용히 재연산하지 않는다. 저장된 과거 Trace 열람·별·진도는 유지한다.
- 현행 descriptor에 런타임 식별자가 상수로 박힌 지점이 있으므로 응답·저장 경로를 함께 찾는다. 새 API나 이중 Python 엔진을 만들 필요는 없고, 지원하지 않는 구버전 재실행을 명확히 알리는 방식으로 범위를 제한한다.

### 6.4 자원·성능

- 학생 한 실행의 현행 제한과 Judge 누적 200,000 step을 올리지 않는다.
- 저작 오답 fixture는 기존 누적 20,000 step 검사를 통과해야 한다. 오류 그룹을 확인하기 전에 예산이 끝나서 기각되는 fixture를 정상 오개념 증거로 보고하지 않는다.
- 위 입력 상한은 제안 계약이며, 신규 공식/오답/Transfer의 실제 step 수는 구현 후 측정한다. 아직 측정하지 않은 값을 ‘검증 완료’로 쓰지 않는다. **단, 초기 설계 근거는 §5.11의 사전 측정표(전 문제 400 step 미만)로 확보했다** — 구현 후 측정은 확인 절차지 탐색이 아니다.
- 최대 입력을 모든 Hidden에서 반복하지 않는다. 대표 최대 입력 하나와 원인별 작은 반례를 조합한다.
- 내부 앞 제거가 배열 이동인 현행 런타임을 큐의 엄밀한 O(1) 벤치마크로 사용하지 않는다. 이 Wave는 순서와 상태 학습이며 작은 입력으로 충분하다.
- Trace 때문에 앞/뒤 snapshot 복사가 늘어나도 이벤트/출력 상한을 유지한다. 제한 초과 후 다음 정상 실행이 복구되는 기존 Worker 테스트를 재사용한다.
- 빌드 결과의 알고리즘 chunk 원본/gzip 크기를 기준선과 함께 기록한다. 통과를 위해 임의로 크기 임계값만 높이지 않는다. 급증이 없다면 별도 lazy-loading 개편은 후속 과제로 분리한다.

## 7. 구현 파일 지도

### 7.1 신규 18개 콘텐츠 파일

아래 각 stem에 대해 Public `.js`, Private `.private.cjs` 한 개씩 만든다.

| 번호 | stem |
|---|---|
| 71 | `ac_stack_box_71` |
| 72 | `ac_stack_paren_72` |
| 73 | `ac_stack_undo_73` |
| 75 | `ac_queue_robot_75` |
| 76 | `ac_queue_robin_76` |
| 77 | `ac_queue_card_77` |
| 78 | `ac_deque_dock_78` |
| 79 | `ac_stack_queue_79` |
| 80 | `ac_queue_pop_80` |

Public 경로: `src/components/AlgorithmConstellation/shared/problems/`

Private 경로: `functions/algorithmConstellation/problems/`

공통 Public 템플릿은 현행 팩토리 기반 문제를 참고하되, 제목·관찰·이해 질문·Transfer·Scaffold 입력은 이 문서의 계약으로 작성한다. 다른 문제의 ‘스위치’, ‘최솟값’, ‘모든 조합’ 설명을 남기지 않는다.

### 7.2 수정 파일

- 기존 `ac_nav_005.js`, `ac_nav_005.private.cjs`: §5.4의 호환 보강.
- Public `problems/index.js`, Private `problems/index.cjs`: 신규 9개 등록. 기존 74 중복 등록 금지.
- `shared/catalog/algorithmEditorialCatalog.js`: 71~80 메타데이터, 신규 9개 published, 선수/Lens 정합성.
- `shared/catalog/constellationRegistry.js`: 성단 7 requiredAnchors를 정확히 71·74로.
- `shared/python/pythonConceptRegistry.js`, `shared/patterns/problemSolvingPatternRegistry.js`: 새 항목 및 필요한 복습 예시.
- `client/modes/lenses/QueueFifoLens.jsx`: 앞·뒤 라벨 정합성만 좁게 수정.
- §6 평가기·증거 파일, 아래 기존 테스트.
- replay 식별자의 실제 소유 파일은 검색으로 확정하고 식별자 변경에 필요한 부분만 수정. Judge/Callable 제출 정책을 재작성하지 않는다.

## 8. 검증 계약

### 8.1 독립 오라클

기대값을 Python 공식 해법의 복사로 생성하지 않는다. 테스트 전용 JS 기준을 사용한다.

| 문제 | 독립 기준 |
|---|---|
| 71 | 입력 복사 후 reverse |
| 72 | 문자열의 prefix 균형이 음수가 없고 최종 0 |
| 73 | 기록 배열 + 취소 연산의 참조 모델 |
| 74 | 입력의 순서 보존 복사 |
| 75 | 배열의 도착/앞 제거 참조 모델 |
| 76 Base | 인덱스 modulo로 순환 순서 생성; 빈 입력 먼저 처리 |
| 76 Transfer | 남은 패킷 표를 라운드별로 순회해 완료 순서 기록 |
| 77 | 작은 배열 시뮬레이션 + n=1,2,5,6,20 수동 기대값 (n=20→8 실측 포함, §5.7) |
| 78 | 배열의 앞/뒤 네 연산, 출력/잔여 목록을 독립 비교 |
| 79 | 두 스택을 쓰지 않는 단일 FIFO 참조 모델 |
| 80 | Base는 앞쪽 slice, Transfer는 역순 후 앞쪽 slice |

각 Public/Hidden/Transfer 예시를 오라클로 확인한다. 72는 길이 0~8의 모든 두 문자 조합을 로컬 추가 검증할 수 있다. 이것을 수백 개의 서버 Hidden test로 옮기지는 않는다. 75/78/79는 고정 seed의 짧은 사건열을 로컬 검사해도 되며 생성기 플랫폼은 만들지 않는다.

### 8.2 기존 테스트에 추가할 것

**`test-authoring-integrity-contracts.mjs`**

- 81개 ID의 정확한 집합 일치, 71~80 역할과 실제 Lens/선수 동일성.
- 신규 9종 및 보강 74의 Base/Transfer 공식 해법·대안 해법 통과.
- fixture마다 선언한 실패 그룹에서 기각. 지원하지 않는 문법 때문에 실패하는 fixture 금지.
- Preview/master 입력 중복 없음, 질문/전이 표시 동기화, 입력 도메인 상한.
- 80의 Base/Transfer Starter가 각각 의미 있는 반례에서 실제 오답임을 검사.
- 74의 기존 ID·버전·signature·대안 코드 통과 보존.
- 새 구조를 지원시키려고 10대 불변식 자체를 약화하지 않는다.

**`test-gate0-curriculum-contracts.mjs`**

- Gate 6R의 성단 6 전용 검증, 성단 7 8 Core / 2 Branch 및 Anchor 71·74.
- 성단 8 개방: Core 5 + Branch 둘은 False; Core 7이어도 Anchor 하나 누락이면 False; Anchor 둘을 포함한 Core 6은 True.
- 79·80 완료를 추가/제거해도 신규 학생의 성단 8 개방 결과는 동일.
- 71/74/75 등 필요한 선수 관계 누락/충족 사례; Core에서 이번 Branch로 향하는 필수 선수 간선 없음.
- 기존 74 완료자의 재진입 및 기존 85 완료자의 grandfathered 접근 보존.
- `isConstellationUnlocked`뿐 아니라 실제 Hub가 쓰는 `getConstellationAccess`도 검사.

**`test-server-orchestration-and-judge.mjs`**

- 61~70, 71~80을 기존 Wave 수명주기 검증에 포함. 기존 목록에 없는 대상만 추가하고 중복 호출하지 않는다.
- 목록이 너무 길어지면 catalogOrder 범위에서 ID를 얻어 기존 루프에 전달한다. 새 시나리오 DSL은 만들지 않는다.
- 동일 제출 재시도 시 보상 중복 없음, 학생 A/B attempt 혼용 거부, 완료 세션 재도전 처리, 서버 오류의 Mock 우회 금지 계약 유지.
- Transfer 응답에 필요한 contextCard/thoughtCheck만 있고 공식 코드·master 입력·서버 기대답이 없음.
- 문제별 대표 오답은 잘못된 결과 때문에 거부되는지 확인.

**`test-client-server-runtime-parity.mjs` / `test-semantic-trace-v2.mjs`**

- appendleft 순서·None 반환·인자 개수, 빈 pop/popleft, pop(index) 명시 거부.
- 인자 없는 list.pop과 deque.pop의 올바른 뒤 제거 보존.
- 신규 Base뿐 아니라 **Transfer** 공식 코드/대표 오류도 양쪽에서 비교한다. 현재 Base 중심 루프만으로 Transfer 패리티 완료라고 보고하지 않는다.
- 새 mutation의 원본 줄 번호 및 불변 before/after, `ordered-buffer` 증거 포함.
- 기존 BFS의 deque/popleft와 음수 modulo 등 기존 기능 회귀 없음.

**`test-student-sandbox-resilience.mjs` / `test-algorithm-support-accuracy.mjs`**

- 실제 Worker 경로에서 appendleft 및 실패 후 정상 코드 재실행을 확인한다. 공유 모듈의 Node 테스트와 구분해 보고한다.
- 새 10문제의 지원 6단계에 빈 내용·타 문제 설명이 없음; 공식 풀이를 잘못된 스택/큐 오개념으로 분류하지 않음.
- 메서드 미지원 오류를 학생이 FIFO를 오해했다는 진단으로 바꾸지 않음.

UI 확인은 기존 컴포넌트를 실제 렌더하거나 가벼운 로컬 확인으로 71 상태 방향, 74 Front/Rear, 78 네 명령, 79 두 스택, 80 양쪽 Starter를 표본 검사한다. 새로운 출판 승인/학생 파일럿 업무는 요구하지 않는다.

### 8.3 최종 명령과 보고

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

앞 네 명령은 개발 중 관련 구간별로, 마지막 세 명령은 최종 통합 확인으로 사용한다. 전체 스위트 직전에 동일 테스트들을 불필요하게 전부 한 번 더 돌릴 필요는 없다.

최종 보고에는 실제 실행 명령/종료 상태, 81개 ID 집합, 신규 10종의 예산 최대값과 누적값, 브라우저 Worker 검증 여부, 빌드 chunk 증감, 미검증 항목을 남긴다. ‘100%’라는 표현만으로 서로 다른 검증 범위를 합치지 않는다.

## 9. 실행 순서와 완료 조건

| 순서 | 작업 | 종료 조건 |
|---|---|---|
| Gate 6R | 성단 6 검증 공백·중복 키 정리 | 기존 72개가 서버 학습 흐름과 게이트에서도 유지 |
| Gate 7A | pop 오류·arity·appendleft·증거·버전 보완 | 작은 의미/패리티/Worker/Trace 검증 통과 |
| Gate 7B | 71~73 + 74 호환 보강 | LIFO/FIFO 두 Anchor와 빈 컨테이너 규칙 완결 |
| Gate 7C | 75~78 | 사건 처리→회전→카드→양쪽 출입 4종 완결 |
| Gate 7D | 79~80 | 두 스택 표현·출구 수리 및 전이 완결 |
| Gate 7E | 등록·게이트·회귀·최종 출판 | 81개 집합, Core8/Branch2, 전체 검증 결과 확보 |

각 묶음 안에서는 완성된 Public/Private를 함께 등록하고 catalog 상태도 같은 변경 단위로 맞춘다. 준비되지 않은 항목을 ‘개수 81’을 맞추기 위해 먼저 published로 만들지 않는다. 전체 Wave를 한 번에 검수할 수 있도록 공통 인덱스·테스트 갱신을 모아서 처리한다.

완료 체크리스트:

- [ ] 신규 9종 + 기존 74 보강, 총 10문제가 실제 학습 루프를 제공한다.
- [ ] Gate 7A 의미 변경(빈 pop 오류·pop(index) 거부) 후 기존 72개 전체 스위트가 회귀 없이 통과한다 (§2.4 감사 기준).
- [ ] 신규 문제의 fixture 누적 step이 20,000 이내임을 저작 테스트 로그로 확인한다 (§5.11 측정표 기준선 대비).
- [ ] 71의 pop, 74의 deque/popleft, 78의 appendleft가 관찰 후 설명된다.
- [ ] 72에서 성인용 다중 괄호/스택 응용으로 범위를 확대하지 않는다.
- [ ] 잘못된 pop 결과를 패리티만으로 정상 처리하지 않는다.
- [ ] 74의 기존 완료·signature·평가 의미와 85의 접근 보호를 유지한다.
- [ ] Branch는 Core 게이트에 기여하지도 필수 선수가 되지도 않는다.
- [ ] 대안 해법을 AST로 금지하지 않고 1★ 행동과 2★ 이해 증거를 구분한다.
- [ ] 공식 정답·Hidden·Transfer master를 클라이언트로 가져오지 않는다.
- [ ] 새 API·DB 구조·Lens·문제별 지원 엔진 없이 끝낸다.
- [ ] 실제 검증 범위와 남은 제한을 구분해 보고한다.

이 Wave 이후 다음 단위는 **성단 8 격자 항해 81~90**이다. 기존 85번 BFS를 보존하고 이웃·경계·연결 영역부터 쌓는다. 이번에 그 문제들 또는 재귀 엔진까지 선행 구현하지 않는다.
