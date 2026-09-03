# LUMI 알고리즘 성단 — 성단 9 전체 10문제(91~100) 개발 가이드

> 작성 기준: 2026-09-03 현재 작업 트리 (성단 8 가이드 v2 검증 시점과 동일 기준선)
> 대상: 후속 구현 AI 및 코드 리뷰어
> 구현 단위: **신규 10문제 전원** (기존 문제 현대화 없음 — 91~100은 모두 catalog draft이며 구현 파일이 존재하지 않음을 확인)
> 완료 목표: **정규 과정 전체 완결.** Published = Public = Private = **100개** ID 집합, 성단 9 = Core 4 + Branch 2 + **Capstone 4**

> **실행 검증 스탬프** — 이 문서의 모든 런타임 주장은 서버 평가기에서 직접 실행해 확정했다 (§1.2, §6.2 측정표). 구현자는 재검증 없이 착수할 수 있다.

---

## 0. 결론과 핵심 설계 결정

성단 9 `전략과 기억`은 정규 과정의 마지막 성단이다. 레지스트리 부제가 말하듯 두 축이다: **메모이제이션(기억)** 과 **4대 캡스톤 프로젝트**.

```text
91  큰 문제가 같은 모양의 작은 문제로 줄어드는 구조를 발견
92  같은 작은 문제를 몇 번이나 다시 계산하는지 세어 본다
93  작은 답을 표에 저장하고 다시 꺼내 쓴다 (필수 Anchor)
94  가장 빨리 끝나는 임무부터 고르는 전략
95  눈앞의 최선이 실패하는 동전 — 표가 이긴다 (Branch)
96  누적이 손해보면 지금 값에서 다시 시작 (Branch)
97~100  배운 전략을 조합하는 4대 캡스톤
```

### 0.1 핵심 결정 — 재귀 문법 없이 재귀적 사고를 가르친다

카탈로그 초안의 91~93은 재귀 소개 문제다. 그러나 실행 검증 결과:

```text
자기 재귀 factorial(5)      → ✗ "정의되지 않은 함수입니다: f"
dict 정수 key memo[n]       → ✗ "이름표(key)는 문자열이어야 합니다: number"
```

평가기는 **자기 호출을 지원하지 않고, dict key는 문자열만 허용**한다. 이에 따라 이번 Wave는 재귀 실행 지원을 평가기에 추가하지 않고, **"재귀적 분해"를 사고 패턴으로 가르치고 구현은 상향식 기록표로 한다.** 근거:

1. **마스터 플랜 정합성**: 발견 순서 원칙(경험 → 발견 → 개념 → 이름 → 코드)과 "새 알고리즘과 새 문법을 동시에 가르치지 않는다"(CORE 100, §3.2). 초·중등에게 자기 호출 문법과 분해 사고를 동시에 주는 것은 이 원칙 위반이다. "재귀"라는 **이름은 91의 개념 카드·2★에서 소개만 한다** — "스스로를 부르는 표현도 있다; 우리는 같은 답을 기록표로 얻는다" (이름은 나중에 공개 원칙).
2. **제한형 Python 철학**: C5~C8까지 확립된 "필요한 문법만, 작게" 원칙. 상향식 표는 이미 배운 `range`, `.append()`, 리스트 인덱스만으로 완결된다 — **신규 Python 문법 0개**.
3. **개념 충실성**: 마스터 플랜 §8의 교사용 개념 "재귀적 분해·상태 재사용"의 본질은 분해와 재사용이지 호출 스택이 아니다. 92의 "반복 계산 비용" 문제는 오히려 재귀를 못 쓰기 때문에 더 순수하게 사고만 가르친다.

실행 검증으로 이 결정의 실현 가능성도 확정했다 — 상향식 계단 n=30 → 1,346,269 (350 steps), 반복 카운트 n=25 → 242,785 (325 steps) 모두 정상 동작 (§6.2).

### 0.2 실행 순서 개요

```text
Gate 8R  성단 8 마감 (커밋 + 검증 공백 확인)
Gate 9A  (측정 완료 — §6.2 표, 추가 probe 불필요)
Gate 9B  91~93 (분해 → 반복 비용 → 기록표) 사다리
Gate 9C  94~96 (탐욕 → 탐욕 실패 → 연속 최고)
Gate 9D  97~100 (4대 캡스톤)
Gate 9E  등록·게이트·통합 검증·출판 → 100개 완결
```

---

## 1. 현재 상태와 범위

### 1.1 기준선 (파일 대조 완료)

| 항목 | 상태 | 이번 조치 |
|---|---|---|
| 등록 수 | 성단 8 완료 후 90개 (저작 단언 90, `[Test 20]` 존재 시점에 착수) | 신규 10개 → 100 |
| 91~100 구현 파일 | **전무** — `src/…/problems/`, `functions/…/problems/` 모두 확인 | 10쌍 신규 작성 |
| 카탈로그 91~100 | 전부 `draft`, 역할 배정 완료 (91·93 core/anchor, 92·94 core/practice, 95·96 branch/review, 97~100 capstone) | published 전환 + 선수·Lens 정정 |
| 레지스트리 성단 9 | `전략과 기억`, core 4 / branch 2 / **capstone 4**, `requiredAnchors: ['AC-MEMO-CLIMB-01']`, `minimumCoreToUnlockNext: null` | **변경 불필요** — 마지막 성단이라 개방 다운스트림이 없고, 성단 9 자체의 접근은 성단 8 Anchor(81·83·85)+Core 6/8로 이미 결정된다 |
| 초안 lensId | `recursion-ladder-lens` ×5, `cycle-timeline`, `source-debug-lens`, `string-scanner-lens`, `queue-conveyor-lens`, `grid-radar-lens` — **전부 미등록**. 단 96의 `sequence-accumulator`는 **등록됨** | 96만 초안 유지(의미상 정확 — 누적 상태 Lens), 나머지 9문제 `state-transition` |
| Hub 캡스톤 표시 | 카드 라벨 `👑 캡스톤` 이미 지원 (routeRole 분기 확인) | ROUTE_FILTERS에 capstone 필터 추가는 **선택** — 이번 Wave 필수 아님 |

### 1.2 런타임 탐침 결과 (전건 서버 평가기 실행, 이 문서 작성 시점)

| 탐침 | 결과 | 판정 |
|---|---|---|
| 자기 재귀 `f(n-1)` | `정의되지 않은 함수` | **미지원** → §0.1 결정의 근거 |
| dict 정수 key `memo[n]` | `이름표는 문자열이어야 합니다` | **미지원** → 메모는 리스트 표로 |
| dict **문자열** key `freq[symbol]` | 정상 (97 패턴) | 지원 |
| 상향식 리스트 표 (`ways.append(ways[i-1]+ways[i-2])`) | n=30 → 1,346,269, 350 steps | 지원 |
| 2인자 `range(3, n + 1)` | 정상 | 지원 (91~96 전체의 기반) |
| 구간 탐욕 수동 스캔 (min-end 선택) | 12임무 → 6, 1,320 steps | 지원 |
| 동전 상향식 최적 표 | [1,4,5] 30 → 6, 1,918 steps | 지원 |
| Kadane | 40값 → 6, 721 steps | 지원 |
| 문자열 `+` 누적·`len(text)` | 정상 | 지원 (97) |
| `pop(k)` 위치 인자 | **명시적 거부** (Gate 7A 계약) | **금지** — 목록 중간 제거는 불리언 병행 리스트로 (99, §6.3) |
| 격자 로버 시뮬 (방향+벽) | 3×3 → 정확, 234 steps | 지원 (100) |
| 우선순위 선택 스캔 | 12화물 → 우선순위·동률·도착순 정확, 1,835 steps | 지원 (98) |
| 연쇄 BFS (가장 가까운 목표 반복) | 6×6 3목표 → 10 (정답), 9,970 steps | 지원 (99) — 예산 규칙 §6.2 |

> C8에서 확립한 **"첨자 안의 첨자" 함정**(읽기=에러, 쓰기=조용한 no-op)은 이번에도 전면 적용: `targets[k][0]` 형태는 반드시 `tr = targets[k][0]` 추출 후 사용. §6.2 측정 골격은 모두 이 관행으로 작성·검증했다.

### 1.3 비용·공수 불변식

1. 신규 React Lens, Callable, Firestore 컬렉션, AI API, 평가기 기능(재귀 포함): **0개**.
2. 신규 Python Concept: **0개** — 91~100의 공식 해법은 이미 등록된 문법만 사용한다(§1.2). 사고 패턴만 6종 신규 등록.
3. 신규 10문제는 `createCapabilityPrototypeKernel` + `state-transition` (96만 `sequence-accumulator`).
4. 격자 ≤ 6×6, 목록 ≤ 40, 동전 amount ≤ 30, 임무 ≤ 12 — 대입력 최적화가 아니라 상태·전략 이해를 평가한다.
5. 모든 Core는 Core/Anchor만 선수로 삼는다. 95·96 Branch와 캡스톤 완료가 어떤 개방의 필수 조건이 되지 않는다(성단 9가 마지막 — 다운스트림 게이트 자체가 없다).
6. 총 100개를 맞추기 위해 미완성 문제를 먼저 published로 만들지 않는다.
7. 마스터 플랜 §2.1: 캡스톤은 "정답 코드 제출"이 아니라 조합·설명 경험이다. 캡스톤 4개는 각각 §5.7~5.10의 통합 계약으로 정의하고, 범위를 부풀리지 않는다.

---

## 2. Gate 8R — 성단 8 마감

성단 8 구현이 커밋되고 다음 공백이 없음을 확인한 뒤 착수한다. 성단 5·7 때와 동일한 누적 방지 규칙이다.

**Step 0 — 커밋**: 성단 8 변경 전체를 별도 커밋으로 확정한다. 성단 9 파일을 하나 만들기 전에.

확인 항목:

- 등록 90개·`[Test 20]`(성단 8 전용 섹션) 존재·전체 스위트·ESLint·빌드 통과 기록.
- 81~90 서버 수명주기 편입 (Gate 7R에서 61~70을 넣은 패턴 반복 — 원안이 성단 8 가이드에서 요구한 것).
- 성단 8 레지스트리 Anchor가 81·83·85로 반영됐는지.
- **"첨자 안의 첨자" 저작 가드 (제안, 선택)**: 저작 테스트에 정적 검사 추가 — 공식·대안·fixture 코드에서 정규식 `\[[^\]\[]*\[` 매칭이 있으면 실패 (`grid[start[0]]` 형태 잡음, `matrix[i][j]`는 통과). C8 가이드가 남긴 함정의 재발 방지 자동화다.
- 85 현대화가 추가 전용(기존 hidden 부분집합)이었는지.

실패가 발견되면 해당 계약만 수리한다. 성단 8을 재설계하지 않는다.

---

## 3. 커리큘럼

### 3.1 구성

| # | ID | 역할 | 함수 계약 | Lens |
|---:|---|---|---|---|
| 91 | `AC-REC-BASE-91` | Core Anchor | `build_small_answers(n)` → 답 표 전체 반환 | state-transition |
| 92 | `AC-REC-REPEAT-92` | Core Practice | `count_repeat_work(n)` → 나이브 분해의 반복 계산 횟수 | state-transition |
| 93 | `AC-MEMO-CLIMB-01` | Core Anchor | `count_climb_ways(n)` → 계단 오르기 경우의 수 | state-transition |
| 94 | `AC-GREEDY-INTERVAL-94` | Core Practice | `max_missions(starts, ends)` → 선택 가능한 최대 임무 수 | state-transition |
| 95 | `AC-GREEDY-COIN-95` | Branch Review | `min_coins(coins, amount)` → 최소 동전 수 / -1 | state-transition |
| 96 | `AC-DP-MAXSUB-96` | Branch Review | `max_energy(values)` → 최대 연속 구간 합 | sequence-accumulator (등록됨) |
| 97 | `AC-CAP-DECODE-97` | Capstone | `decode_alien_signal(pairs)` → `[총길이, 빈도표, 최다심볼]` | state-transition |
| 98 | `AC-CAP-DISPATCH-98` | Capstone | `dispatch_order(priorities)` → 처리 순서(index 목록) | state-transition |
| 99 | `AC-CAP-RESCUE-99` | Capstone | `rescue_route_total(grid, start, targets)` → 총 이동 거리 | state-transition |
| 100 | `AC-CAP-AUTOROVER-100` | Capstone | `navigate_rover(grid, start, commands)` → `[r, c, 방향]` | state-transition |

Anchor: 레지스트리 현재값 `['AC-MEMO-CLIMB-01']` 유지 (§1.1 — 다운스트림 게이트가 없어 실질 무효값이므로 변경 불필요). 성단 완결 표시로 91·93을 이중 Anchor로 강화하는 것은 미관상 선택이나 권장하지 않는다(계약 최소 변경).

### 3.2 선수 조건 (카탈로그 초안 → 최종)

| # | 최종 prerequisites | 초안 | 근거 |
|---|---|---|---|
| 91 | `AC-SEQ-RUNNING-35`, `AC-PAT-003` | `[AC-SEQ-005]` | 누적 표 경험 + 점화 패턴 발견 |
| 92 | `AC-REC-BASE-91` | (동일) | 91의 분해 구조 위에 비용 관점 |
| 93 | `AC-REC-REPEAT-92` | (동일) | 반복 비용이 기록표의 동기 |
| 94 | `AC-SORT-MIN-01`, `AC-ENUM-BEST-68` | `[AC-SORT-MIN-01]` | 선택 스캔 + 최선 갱신 사고 |
| 95 | `AC-GREEDY-INTERVAL-94`, `AC-ENUM-FILTER-67` | `[94]` | 탐욕 맥락 + 전수 후보·제한 필터 |
| 96 | `AC-MEMO-CLIMB-01`, `AC-SEQ-RUNNING-35` | `[93]` | 기록표 + 누적 상태 |
| 97 | `AC-STR-COMPRESS-39`, `AC-DICT-FREQ-44` | `[STR-REVERSE-01, SET-UNIQUE-01]` | run 처리 + 빈도표 |
| 98 | `AC-NAV-005`, `AC-SORT-MIN-01` | (동일) | FIFO + 선택 스캔 |
| 99 | `AC-NAV-006`, `AC-SRCH-LINEAR-58` | `[AC-NAV-006]` | BFS + 가장 가까운 대상 선택 |
| 100 | `AC-MEMO-CLIMB-01`, `AC-NAV-006`, `AC-SIM-COMPASS-52` | `[93, AC-NAV-006]` | 기록 + 격자 + 순환 방향 |

전 항목 published Core임을 확인했다. 카탈로그와 Public `curriculum.prerequisites`에 동일하게 반영한다.

### 3.3 사고 패턴 (6종 신규 — 캡스톤은 기존 패턴 조합)

| 패턴 ID | 최초 문제 | 사고 규칙 |
|---|---|---|
| `pattern:shrinking-structure` | 91 | 큰 문제를 같은 모양의 작은 문제로 쪼개 답 조립하기 |
| `pattern:repeat-cost-awareness` | 92 | 겹치는 작은 문제가 얼마나 반복되는지 세기 |
| `pattern:reuse-table` | 93 | 작은 답을 표에 저장해 다시 계산하지 않기 |
| `pattern:greedy-earliest-end` | 94 | 가장 빨리 끝나는 선택이 다음 기회를 가장 많이 남긴다 |
| `pattern:table-over-greedy` | 95 | 눈앞의 최선이 아닌 모든 경우의 최선을 표로 기억하기 |
| `pattern:running-best-reset` | 96 | 누적을 이어가는 것이 손해면 지금 값에서 다시 시작하기 |

캡스톤 `requires` (신규 없음):

```text
97: pattern:frequency-table, pattern:run-grouping 계열(39) 재사용
98: pattern:fifo-processing, pattern:argmax-by-associated-value(45)
99: pattern:bfs-shortest-path, pattern:first-match-linear-search
100: pattern:command-state-machine, pattern:cyclic-state-wrap, pattern:bounds-before-access
```

`syntaxExample`은 주석형 사고 절차로만 작성한다(하우스 규칙).

---

## 4. 공통 문제 계약

### 4.1 도메인 규칙

- 91~93: `n`은 0~30. 92의 최댓값은 25 (예산 §6.2).
- 94: 임무 0~12개. `starts[i] < ends[i]` 보장, 시각 0~99.
- 95: 동전 2~4종의 서로 다른 양수(1~9), amount 0~30. 항상 1동전이 포함되어 -1은 발생하지 않게 저작한다(-1 반환 계약은 유지하되 Hidden에서는 다루지 않는다).
- 96: 값 1~40개, 각 -9~9. **전부 음수 케이스 필수**.
- 97: pairs 0~12개, 각 `[개수 0~9, 심볼 'A'~'Z']`. 같은 심볼 중복 등장 허용(합산이 과제).
- 98: priorities 0~12개, 값 0~9 (동률 허용 — 과제의 핵심).
- 99: 격자 1~6행×1~6열 직사각형, targets 1~4개의 유효한 열린 칸. start≠target 보장.
- 100: 격자 1~6×1~6, commands 0~24개 (`'MOVE'`/`'TURN'`). start는 유효한 열린 칸.

### 4.2 3-Star 완결 세트 (하우스 표준)

각 문제: Observe 1 / Explore 4~8장면(예측 선택 1개 이상, 독립 실험은 `experimentReset`+`stateBefore`) / Public Base 2~3 / Hidden 5~7 / fixture 4종(91~96) 또는 3~4종(캡스톤) / 2★ 3문항 / Transfer preview 2 + master 3~4 (입력 중복 0건) / Public-Private 메타데이터 완전 동기화.

### 4.3 설명·표시 규칙

- **"재귀" 이름 공개 규칙**: 91의 Explore·2★까지는 "작아지는 구조"만 쓰고, 개념 카드·ruleStatement에서 "이렇게 스스로를 부르는 표현을 재귀라고 불러요. 우리는 같은 답을 아래에서 위로 채운 표로 얻어요"로 **이름만** 연결한다. 학생이 작성하는 코드에는 자기 호출이 등장하지 않는다.
- 92는 "반복"을 눈에 보이게: 표의 두 칸을 화살표로 겹쳐 세는 장면을 Explore에 둔다.
- 93의 visited/queue가 아니라 **기록표 한 칸 한 칸이 채워지는** 장면을 상태로 보여준다 (`filledUpTo`, `table` 평평한 키 — StateTransitionLens 표시 규칙 준수).
- 94·95는 "선택의 근거"를 묻는다: 탐욕은 근거가 있을 때만 전략이다.
- 캡스톤은 §5.7~5.10의 통합 서사를 지킨다. 문제에 두 개 이상의 이전 전략이 실제로 결합되어야 한다.
- `introContext.variables[].value`는 읽기 좋은 문자열만. `[object Object]` 금지.
- Observe/Explore/2★/Transfer Context에 완성 코드·공식 점화식을 코드 형태로 노출하지 않는다.

### 4.4 행동 채점

1★은 반환 행동만 본다. 표 사용 여부·작성 순서·변수명·AST를 강제하지 않는다. 특히:

- 93: 각 칸을 매번 처음부터 다시 계산하는 O(n²) 이중 루프 풀이도 정확하면 1★ 통과 (느림의 통찰은 92·2★이 담당).
- 94: 임무를 전수 열거(C6 방식)해 최대 개수를 구해도 통과.
- 95: 완전 탐색(동전 조합 열거)도 통과 — 표가 유일한 정답 경로가 아니다.
- 98·99·100: 지시하는 처리 순서·방문 규칙 자체가 반환 계약에 포함되므로 행동으로 검증된다.

---

## 5. 문제별 명세

> 각 문제의 "측정" 값은 §6.2 표의 실측이다. 예시 값은 모두 오라클로 교차 확인했다.

### 5.1 91 — 작아지는 구조 문제 (Core Anchor)

- `build_small_answers(n)`: `table[0]=1, table[1]=1`에서 시작해 `table[i] = table[i-1] + table[i-2]`로 **표 전체**를 채워 반환.
- 예: `n=6 → [1,1,2,3,5,8,13]`, `n=0 → [1]`, `n=1 → [1]`.
- 서사: 신호 타워를 1칸 또는 2칸짜리 패널로 채우는 방법.
- Explore: 표의 0·1칸이 "씨앗"임을 먼저 경험 → 2칸은 0칸+1칸 → 3칸 예측 선택 → … → 6칸 완성. **독립 실험**: 씨앗을 `[1,2]`로 바꾸면 표 전체가 달라짐(`experimentReset`).
- Hidden: `n=0,1,2` 경계, 중간, `n=30` 1회.
- Fixtures: 씨앗 `table[0]=0`, 점화 `table[i-2]+table[i-3]`(범위 오류 아님 — 3부터 시작해 틀린 값), 표를 역순으로 반환, 마지막 칸 누락.
- 2★: 5칸의 답이 어떤 칸들로 만들어지는지 / 왜 0·1칸을 먼저 정하는지 / "재귀" 이름 소개(§4.3 규칙).
- Transfer: `signal_growth_table(days)` — 매일 어제+이틀전 성장이 더해지는 관측 기록 표 (같은 구조, 다른 서사).

### 5.2 92 — 같은 계산을 또 했다 (Core Practice)

- `count_repeat_work(n)`: 나이브하게 "스스로를 두 번 부르는" 방식으로 n의 답을 구할 때, **작은 문제를 여는 총 횟수**.
- 계약: `work[0]=1, work[1]=1`, `work[i] = work[i-1] + work[i-2] + 1`. 예: `n=2 → 3`, `n=5 → 15`, `n=25 → 242785` (실측 일치).
- 학습 포인트(메타의 아름다움): 반복 비용 자체가 같은 점화를 따른다.
- Explore: n=4의 호출 나무를 손으로 펼쳐 `fib(2)`가 3번 나오는 것을 확인 → 표로 세기.
- Hidden: `n=0,1 → 1`, `n=2 → 3`, 중간, `n=25` 1회 (325 steps).
- Fixtures: `+1` 없이 피보나치 수 반환, 씨앗 0 시작, `2*work[i-1]`, n 반환.
- 2★: 왜 횟수가 더 빨리 불어나는지 / 표로 미리 계산하면 문제를 여는 횟수가 몇 번이 되는지(n번) / 93로 이어질 동기.
- Transfer: `count_duplicate_visits(spans)` — 두 갈래로 갈라지는 탐사에서 같은 지점 재방문 횟수 (같은 점화).

### 5.3 93 — 계단을 오르는 방법 (Core Anchor, `AC-MEMO-CLIMB-01`)

- `count_climb_ways(n)`: 1칸 또는 2칸씩 오르는 방법의 수. `ways[0]=1, ways[1]=1, ways[2]=2`.
- 예: `n=3 → 3`, `n=10 → 89`, `n=30 → 1346269` (실측 일치, 350 steps).
- Explore: 92에서 본 반복을 "표에 저장하면 한 번씩만"으로 바꾸는 장면 — 같은 칸을 다시 계산하지 않는 모습.
- Hidden: `n=0,1,2` 경계, 중간, `n=30` 1회.
- Fixtures: `ways[2]=3` 오씨앗, 점화에 `ways[i-1]` 두 번, 표 없이 매번 재계산하며 마지막에 실수(값 오류), n-1 반환.
- 2★: n의 답에 필요한 칸들 / 이미 채운 칸을 다시 계산하지 않는 이유 / "기억하기(memoization)" 이름 연결.
- Transfer: `count_signal_patterns(n)` — 신호가 1칸 또는 **3칸** 점프 (`ways[i]=ways[i-1]+ways[i-3]`) — **다른 점화**로 일반화 검증.

### 5.4 94 — 가장 많은 탐사 임무 선택 (Core Practice)

- `max_missions(starts, ends)`: 겹치지 않게 선택할 수 있는 최대 임무 수.
- 지정 절차(행동 계약): `free_from=0`에서 시작, "시작이 `free_from` 이상인 미선택 임무 중 **끝이 가장 빠른 것**"을 반복 선택(동률은 낮은 index).
- 예: `[1,2,4,6]/[3,5,6,8] → 3` (임무 1,3,4... 실측: 3). 반례: 가장 빨리 시작하는/가장 긴 것을 고르면 2.
- Explore: 세 가지 선택 기준(빨리 시작/길이 짧게/빨리 끝)을 같은 입력에 적용해 비교 — 빨리 끝만 3개.
- Hidden: 0임무, 1임무, 연쇄(전부 선택), 탐욱 함정 입력, 동률, 12임무 1회 (1,320 steps).
- Fixtures: 가장 빨리 시작 선택(함정 실패), 가장 긴 임무 우선, `free_from` 갱신 누락, 첫 임무만.
- 2★: "가장 빨리 끝"이 안전한 이유(남는 시간 논리), 동률 처리 규칙.
- Transfer: `max_broadcast_slots(starts, ends)` — 방송 슬롯 선택 (같은 구조, 서사 전이).

### 5.5 95 — 눈앞의 최선이 실패하는 동전 (Branch Review)

- `min_coins(coins, amount)`: 동전 종류로 amount를 만드는 최소 개수. 상향식 표 `best[a]`.
- 예: `[1,3,4], 6 → 2` (3+3), `[1,4,5], 30 → 6` (실측 일치, 1,918 steps). 탐욕(큰 동전 우선)은 6을 `4+1+1`의 3개로 만들어 실패.
- Explore: **탐욕 경로와 표 경로를 나란히** — 6에서 갈라짐. 이 문제의 심장 장면.
- Hidden: amount 0, 1, 탐욕 실패 입력 2종(그룹 `greedy-trap`), 탐욕 성공 입력(구별), 30 1회.
- Fixtures: 큰 동전 우선 탐욕(`greedy-trap`에서 기각), `best[a-c]` 갱신 누락, INF 미교체 반환, 동전 1종만 사용.
- 2★: 탐욕이 실패하는 입력의 구조 / 표가 모든 amount의 최선을 기억하는 방식 / 91~93과의 연결.
- Transfer: `min_stamps(values, total)` — 우표 최소 장수.

### 5.6 96 — 연속 에너지 구간의 최고점 (Branch Review, Lens `sequence-accumulator`)

- `max_energy(values)`: 연속 구간 합의 최댓값 (빈 구간 없음 — 전부 음수면 최댓값 한 원소).
- Kadane: `current = max(values[i], current+values[i])`, `best` 갱신.
- 예: `[-2,1,-3,4,-1,2,1,-5,4] → 6` (실측 일치). 40값 최악 721 steps.
- Explore: `current`가 다시 시작하는 순간(-3 뒤 4)을 예측 선택으로.
- Hidden: 전부 음수(필수), 한 원소, 전체 양수, 중간 리셋, 0 포함, 40개 1회.
- Fixtures: `current`를 0으로 리셋(전부 음수에서 0 반환 — 오답), 빈 구간 허용 개념, `best` 갱신 누락, 최초 원소 고정.
- 2★: 다시 시작을 판단하는 조건 / 전부 음수에서 답이 0이 아닌 이유.
- Transfer: `max_signal_gain(readings)` — 연속 관측 이득.

### 5.7 97 — 외계 언어 해독기 (캡스톤 1)

- `decode_alien_signal(pairs)`: `[총 길이, 심볼별 총 등장 수 dict(문자열 key), 최다 심볼]` 반환. 최다 심볼 동률은 **해독 순서상 첫 등장**.
- 예: `[[3,'A'],[2,'B'],[3,'A']] → [8, {A:6, B:2}, 'A']` (실측 골격 일치, 105 steps).
- 통합: 39 run 처리 + 44 빈도표 + 66 문자열 누적.
- Hidden: 빈 pairs `[0,{},'']` 규약(**빈 입력의 최다 심볼은 `''`** — 지문에 명시), 단일 심볼, 동률, count 0, 12 pairs.
- Fixtures: 길이만 세고 빈도 무시, 중복 심볼 미합산, 최다를 마지막 등장으로, count 0을 1로.
- 2★: 중복 심볼 합산 시점 / 동률 규칙 / 빈 신호의 규약.
- Transfer: `summarize_meteor_log(pairs)` — 유성우 로그 요약 (마스터 플랜 §5.2 유성우 관측기의 축소판).

### 5.8 98 — 우주 화물 관제소 (캡스톤 2)

- `dispatch_order(priorities)`: **우선순위 큰 것 먼저, 동률은 먼저 도착(낮은 index)** 처리 순서의 index 목록.
- 예: `[0,2,4,1,3,0,2,4,1,3,0,2] → [2,7,4,9,1,6,11,3,8,0,5,10]` (실측 일치, 1,835 steps).
- 통합: 74 FIFO 대기 감각 + 45 argmax 스캔. 정렬 문법 없이 선택 반복.
- Hidden: 0화물, 1화물, 전부 동일 우선순위(순수 도착순), 계단식, 12화물.
- Fixtures: 도착순만(우선순위 무시), 동률을 역순으로, 최고 하나만 처리, 최소 우선 먼저.
- 2★: 동률에서 도착 순서가 남는 이유 / 스캔 한 번에 하나만 확정되는 구조.
- Transfer: `rescue_triage(severities)` — 부상 심한 순 + 도착순 치료 순서.

### 5.9 99 — 구조 드론 지휘소 (캡스톤 3)

- `rescue_route_total(grid, start, targets)`: 현재 위치에서 **가장 가까운 미완 목표**로 BFS 이동을 반복해, 모든 목표를 완료할 때까지의 총 거리.
- 예: 6×6 열린 격자, 시작 (0,0), 목표 [(0,2),(0,4),(5,5)] → 2+2+6 = **10** (실측 일치, 9,970 steps).
- 통합: 85 BFS + 58 최근접 선택 + 상태 관리.
- **저작 규칙(실행 실증)**: 목표 완료 처리에 `targets.pop(k)` 사용 금지(Gate 7A 위치 인자 거부) — `served` 불리언 병행 리스트로. "첨자 안의 첨자" 추출 규칙도 적용.
- Hidden: 목표 1개, 인접 목표들, 벽 우회가 필요한 배치, 벽으로 격리(불가 케이스는 계약에서 배제 — 모든 목표 도달 가능하게 저작), 6×6×3목표 1회(예산 §6.2).
- Fixtures: 맨해튼 거리 합 반환(벽 무시), 매번 원점 재시작, 목표 하나만 방문, 완료 표시 누락(같은 목표 재방문).
- 2★: 가장 가까운 목표부터가 **최적 총 거리를 보장하지 않는다**는 인식(탐욕 비판 회수!) / served 표시 시점.
- Transfer: `maintain_stations_total(grid, start, stations)` — 정비소 순회 총 거리.

### 5.10 100 — 자율 탐사 로버 (캡스톤 4, 최종)

- `navigate_rover(grid, start, commands)`: `[최종 r, 최종 c, 방향]` 반환.
- 방향: 위0 → 동1 → 남2 → 서3 (배열 `dr=[-1,0,1,0]`, `dc=[0,1,0,-1]`). `TURN` = 오른쪽 90도 `(d+1)%4`. `MOVE`: 앞 칸이 격자 안·열린 칸이면 이동, 아니면 **정지**.
- 예: 3×3 중앙 벽 격자, (0,0)에서 `MOVE,MOVE,TURN,MOVE,MOVE,MOVE` → `[2,2,2]` (실측 일치, 234 steps — 마지막 MOVE는 밖이라 정지).
- 통합: 51 명령 상태 머신 + 52 순환 방향 + C8 경계·벽 — 과정 전체의 총결산.
- Hidden: 빈 commands, TURN만, 벽 충돌 연속, 경계 모서리, 24 commands + 6×6 1회.
- Fixtures: 벽 무시(밖으로 이동), TURN이 위치 변경, 방향 갱신 누락(항상 위), 경계 밖 이동 허용.
- 2★: TURN 후 다음 MOVE 방향 예측 / 벽에서 정지하는 이유 / 위치·방향 두 상태를 함께 추적하는 경험.
- Transfer: `count_unique_cells(grid, start, commands)` → `[최종상태, 방문한 서로 다른 칸 수]` (튜플 set — C8 패턴 재사용).

---

## 6. 런타임과 예산

### 6.1 Gate 9A — 측정 완료

원안의 "착수 전 probe"는 이 문서 작성 시점에 전부 수행했다 (§1.2 표 + §6.2). 구현자가 추가로 probe할 항목은 없다. 구현 후 측정은 확인 절차다.

### 6.2 사전 측정표 (전건 서버 평가기 실측)

| 문제 | 최대 입력 | 결과 (오라클 일치) | steps |
|---|---|---|---|
| 91 표 생성 | n=30 | 1346269 | 350 |
| 92 반복 카운트 | n=25 | 242785 | 325 |
| 93 계단 | n=30 | 1346269 | 350 |
| 94 구간 탐욕 | 12임무 | 6 | 1,320 |
| 95 동전 표 | [1,4,5] amount 30 | 6 | 1,918 |
| 96 Kadane | 40값 | 6 | 721 |
| 97 디코드+빈도 | 3 pairs | [8, {A:6,B:2}] | 105 |
| 98 관제 스캔 | 12화물 | 우선·동률·도착순 정확 | 1,835 |
| 99 연쇄 BFS | 6×6, 목표 3 | 10 | **9,970** |
| 100 로버 시뮬 | 3×3, 6명령 | [2,2,2] | 234 |

예산 규칙:

- 전 문제 단일 실행 10,000 step 미만 — fixture 누적 20,000 예산에 여유. **단 99은 최대 입력(6×6×3목표) Hidden 1회만** 두고 나머지는 3~4목표·작은 격자로 조합한다(최대 1회 ≈ 예산 절반).
- 91~93의 n=30(92는 25)도 Hidden 1회 + 경계·중간 소형 조합.
- 동일 오개념을 잡는 숫자만 바꾼 테스트 금지 (하우스 규칙).

### 6.3 저작 금지 패턴 (실행 실증된 3대 규칙)

1. **"첨자 안의 첨자" 금지** — `targets[k][0]`·`start[0]`를 인덱스나 중첩 접근에 직접 쓰지 않고 변수 추출 (C8 가이드 §1.1 함정 표 계승).
2. **`pop(k)` 위치 인자 금지** — 목록 중간 제거는 불리언 병행 리스트(`served`)로 (99 실증).
3. **dict 정수 key 금지** — key는 항상 심볼 문자열(97 방식). 수치 상태는 리스트 인덱스로.

---

## 7. 구현 파일 지도

### 7.1 신규 20개 문제 파일

```text
ac_rec_base_91 / ac_rec_repeat_92 / ac_memo_climb_01 / ac_greedy_interval_94 /
ac_greedy_coin_95 / ac_dp_maxsub_96 / ac_cap_decode_97 / ac_cap_dispatch_98 /
ac_cap_rescue_99 / ac_cap_autorover_100
```

각 stem마다 Public `.js` (`src/components/AlgorithmConstellation/shared/problems/`) + Private `.private.cjs` (`functions/algorithmConstellation/problems/`).

> 파일명 주의: 93의 카탈로그 ID는 `AC-MEMO-CLIMB-01`(프로토타립 시대 서식) — stem은 `ac_memo_climb_01`로 ID를 그대로 따른다.

### 7.2 수정 파일

```text
Public/Private problem index (신규 10 등록 — 중복 키 없이: 성단 6 때의 이중 등록 교훈)
algorithmEditorialCatalog.js — 91~100 published·lensId·prerequisites (§3.1·§3.2)
problemSolvingPatternRegistry.js — 6종 + syntax-leak 검사 목록 추가
pythonConceptRegistry.js — 변경 없음 (신규 0)
constellationRegistry.js — 변경 없음 (§1.1)
scripts/test-authoring-integrity-contracts.mjs — c9ProblemIds, 총 100, (선택) 첨자 함정 정적 가드
scripts/test-gate0-curriculum-contracts.mjs — [Test 21]
scripts/test-server-orchestration-and-judge.mjs — 수명주기 91~100 편입
scripts/test-client-server-runtime-parity.mjs — 자동 순회 (등록만으로 편입)
```

---

## 8. 테스트 설계

### 8.1 독립 JS Oracle

| 문제 | JS Oracle |
|---|---|
| 91 | 루프 없이 점화 전개 배열 (하드코딩 시드 + `a[i]=a[i-1]+a[i-2]`) |
| 92 | 동일 점화의 `+1` 변형 |
| 93 | 91과 동일 Oracle, 경계값 수동 앵커(0→1, 1→1, 2→2, 10→89, 30→1346269) |
| 94 | 후보 임무 배열 복사 후 "min end ≥ free_from" 반복 제거 |
| 95 | 금액별 BFS/DP 참조 (JS 자유 구현) |
| 96 | 전체 부분합 이중 루프 최댓값 (O(n²) — 정답 동일성 검증) |
| 97 | `flatMap` 전개 + `reduce` 빈도 + 첫 등장 최다 |
| 98 | `sort((a,b) => prio[b]-prio[a] || a-b)`의 index 순서 |
| 99 | 독립 구현의 연쇄 BFS (JS 큐) |
| 100 | 방향·벽 시뮬레이션 참조 모델 |

각 문제의 Public/Hidden/Transfer 예시를 Oracle으로 전수 확인한다(하우스 규칙: Python 해법의 문자열 번역 금지).

### 8.2 테스트별 추가 계약

**Authoring**: 100개 집합 동등성 / 91~100 역할·선수·Lens parity / fixture 선언 그룹 기각 + Invariant 5b / preview-master 중복 0 / **저작 금지 패턴 3종(§6.3)의 정적 검사 추가 권장** / 공식·대안 통과 (93의 O(n²) 재계산 대안 포함).

**Curriculum `[Test 21]`**: Core 4 + Branch 2 + Capstone 4 정확성 / Anchor `AC-MEMO-CLIMB-01` / §3.2 선수 일치(카탈로그↔커널) / **캡스톤이 어떤 개방 조건에도 등장하지 않음** (minimumCoreToUnlockNext null — 성단 9는 마지막) / 기존 완료자 재진입 보호 / `getConstellationAccess` 실경로 단언.

**Server orchestration**: 91~100 전체 수명주기 / contextCard·thoughtCheck 전달 + 정답 미노출 / 멱등·소유권·Mock 우회 금지 회귀.

**Parity/Trace/Worker**: 등록으로 자동 편입 / dict(문자열 key) 반환 직렬화(97) 양쪽 일치 / 99·100 최대 입력 후 Worker 복구.

**학습 지원/UI 표본**: 91 표 채움·92 반복 강조·95 탐욕/표 갈림길·99 served 표시 장면 렌더 확인 / 신규 10문제 S1~Rescue 비어있지 않음 / `sequence-accumulator`가 96에서 의미상 작동하는지 표본 확인.

### 8.3 최종 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

보고서: 실제 명령·종료 상태, 100개 집합, 최대/누적 step, Worker 검증, chunk 증감, 미검증 항목 분리 (하우스 규칙).

---

## 9. 실행 순서와 완료 조건

| Gate | 작업 | 완료 조건 |
|---|---|---|
| 8R | 성단 8 커밋·마감 | 90개 기준선이 전체 test/lint/build에서 확인 |
| 9A | (완료 — §6.2) | — |
| 9B | 패턴 3종 등록 + 91~93 | 분해→반복→기록표 사다리 완결 |
| 9C | 패턴 3종 등록 + 94~96 | 탐욕·탐욕 실패·연속 최고 완결 |
| 9D | 97~100 캡스톤 | 4대 통합 프로젝트 완결 |
| 9E | 등록·게이트·통합·출판 | 100개 집합 + `[Test 21]` 통과 |

완료 체크리스트:

- [ ] 성단 8 트리를 착수 전 별도 커밋했다.
- [ ] 재귀 문법·신규 Python Concept·신규 평가기 기능 0건 — "재귀"는 이름 소개만(§4.3).
- [ ] 공식·대안·fixture·Transfer에 저작 금지 패턴 3종(§6.3)이 없다.
- [ ] 91→92→93이 동기 부여 순서(구조→비용→기억)로 이어진다.
- [ ] 95의 Explore가 탐욕과 표의 갈림길을 나란히 보여준다.
- [ ] 96이 `sequence-accumulator` Lens로 의미상 정확히 작동한다.
- [ ] 캡스톤 4개가 각각 둘 이상의 기존 전략을 실제로 결합한다.
- [ ] 99 최대 입력 Hidden 1회 규칙·fixture 누적 20,000 이상 0건.
- [ ] 캡스톤·Branch가 어떤 필수 선수·개방 조건에도 등장하지 않는다.
- [ ] 대안 해법(O(n²) 재계산, 전수 열거 등)을 AST로 막지 않는다.
- [ ] 정답·Hidden·master가 클라이언트 번들에 없다.
- [ ] Published = Public = Private = 100 — **정규 과정 완결**.

---

## 10. 다음 단계 — 정규 과정 이후

성단 9는 레지스트리의 마지막 성단이다(`minimumCoreToUnlockNext: null`). 100문제 완결 후의 자연스러운 후속(이번 Wave 범위 외):

- **PRO 항로**: 마스터 플랜의 백준·KOI형 전이 — stdin/stdout, 시간·메모리 공개, 부분점수. 별도 런타임·셸 설계가 필요하다.
- **재귀 실행 지원**: 성단 9의 "이름만 소개"를 넘어 실제 자기 호출을 가르치려면 평가기 확장 + 호출 스택 Lens(마스터 플랜 §8.2 recursion 렌즈)가 필요하다. PRO 항로 설계 시 함께 검토한다.
- **시즌 2 콘텐츠**: 오개념 25종 확장, Crew 공동 탐사, Arena(마스터 플랜 Phase 9~10).

이 Wave에서 위 항목을 미리 구현하지 않는다.
