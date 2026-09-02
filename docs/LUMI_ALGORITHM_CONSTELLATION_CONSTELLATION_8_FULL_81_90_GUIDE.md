# LUMI 알고리즘 성단 — 성단 8 전체 10문제(81~90) 개발 가이드 (v2)

> 작성 기준: 2026-09-03 현재 작업 트리
> 대상: 후속 구현 AI 및 코드 리뷰어
> 구현 단위: 기존 85번 호환 보강 + 신규 81~84·86~90의 9문제
> 완료 목표: 성단 0~8의 catalogOrder 1~90을 모두 서비스하고, Published = Public = Private = 90개 ID 집합을 달성한다.

> **v2 변경 요약** (독립 재검증·측정으로 보강 — 원안 구조는 유지):
>
> 1. **치명적 저작 함정 신규 문서화 (§1.1 v2 표)**: "첨자 안의 첨자" — `grid[start[0]][start[1]]` 형태는 **읽기에서 NAME_ERROR, 쓰기에서 에러 없는 조용한 no-op**(값이 바뀌지 않음)로 동작한다. 원안 §1.1의 "2차원 indexing/assignment 지원"은 변수 인덱스에만 참이며, 83·86의 `start`/`sources` `[r,c]` 계약은 자연스럽게 이 함정에 걸린다(실행 실증). **공식·fixture 모두 변수 추출 관행(`r0 = start[0]`) 필수.** 성단 5 가이드에서 확립된 동일 함정의 격자 버전이다.
> 2. **Gate 7R Step 0 신설 — 성단 7 작업 트리 커밋**: 현재 성단 7 구현(평가기 의미 변경·Lens 라벨 수정 등)이 **36개 파일 미커밋 상태**다(등록 81·전체 스위트·lint 통과는 확인). 성단 5 때와 동일한 누적 방지 규칙을 명시적으로 적용한다.
> 3. **사전 측정표 신설 (§6.3)**: 원안이 Gate 8A에서 구현자에게 요구한 최대 입력 step 측정을 선제 수행했다 — 83(6×6)=4,678 / 84(6×6)=5,014 / 86(5×5)=4,940 / 89(8정점 BFS+DFS)=657 / 90(diamond)=178. 전 문제 fixture 20,000 예산 내 여유.
> 4. 원안 §1.1 탐침 표 5건은 전부 재현 확인(정확). 85 공식 해법이 진짜 `popleft` BFS임을 확인(기존 `pop()` 코드는 의도된 DFS 오답 fixture). 90의 다이아몬드 `[정상 4 / 늦은 표시 5]` 재현. 87·81·86 예시 값 검증. Test 20 번호·레지스트리 현재값(`[85]` 단일)·카탈로그 초안 lensId 확인.
> 5. §5.9에 역순 push용 안전 관행 추가(음수 step `range`·슬라이싱 역순은 미검증 — `k` 카운터 루프 사용).

## 0. 결론

다음 Wave는 **성단 8 ‘격자 항해’ 81~90번 전체**다.

학습 순서는 다음과 같이 고정한다.

```text
81 좌표와 네 이웃
  → 82 경계와 장애물
  → 83 한 연결 구역 탐색
  → 84 여러 연결 구역 세기
  → 85 가까운 칸부터 찾는 최단거리 BFS
  → 86 여러 시작점의 동시 파동
  → 87 격자가 아닌 연결표 표현
  → 88 연결표에서 도달 가능한 기지 찾기
  → 89 BFS와 DFS 순서 비교(선택)
  → 90 visited 기록 시점 수리(선택)
```

85번을 먼저 풀고 나머지 개념을 사후 설명하는 방식은 사용하지 않는다. 학생이 LUMI 안에서 학습한 개념만으로 다음 문제에 진입하도록 선수 조건을 실제 공개 순서와 맞춘다.

## 1. 현재 상태와 범위

### 1.1 기준선

- 현재 Public/Private/published 문제는 81개다. catalogOrder 1~80과 기존 85번 `AC-NAV-006`이 포함된다.
- 성단 7은 71·74를 Anchor로 하는 Core 8 + Branch 2 구조다.
- 81~84·86~90은 catalog draft이고 Public/Private 구현이 없다.
- 85번은 `AC-NAV-006`, version 1, `shortest_path(grid, start, target)`, Lens `grid-bfs`로 이미 published다.
- 현행 `GridBfsRadarLens`는 85번 전용의 고정 3×3 시각화다. 신규 문제용 범용 격자 엔진으로 확장하지 않는다.
- 공유 제한형 Python 평가기는 2차원 indexing/assignment, 중첩 목록 생성, tuple/list 좌표, set membership/add, deque, 중첩 반복, chained comparison을 이미 지원한다.

계획 작성 시 공유 평가기에서 다음 골격을 실행 확인했다.

| 패턴 | 확인 결과 |
|---|---|
| 4방향 이웃 목록 만들기 | 정상, 예 `[0,1] → [[1,1],[0,0],[0,2]]` |
| list-of-lists 인접표 만들기 | 정상 |
| graph BFS + set visited | 정상 |
| 2차원 거리표 생성 후 `dist[r][c]` 갱신 | 정상 |
| 인접 목록 역순 index 순회 | 정상 |

이는 Node에서 공유 평가기 모듈을 확인한 결과다. 실제 Worker·서버 수명주기 완료를 미리 주장하지 않는다.

> **v2 확인**: 위 5건은 이 문서 검토 시점에 독립 재실행해 전부 재현했다. 추가로 85의 공식 해법이 튜플 deque·set membership·3요소 언패킹·연쇄 비교(`0 <= nr < rows`)·변수 인덱스 연쇄 첨자를 모두 사용하는 진짜 `popleft` BFS임을 확인했다(기존 `pop()` 코드는 의도된 DFS 오답 fixture).

> **v2 치명적 저작 함정 — "첨자 안의 첨자" (변수 추출 관행 필수)**:
>
> 성단 5 가이드에서 문서화된 함정의 격자 버전임을 실행으로 재확인했다. 인덱스 위치에 첨자 식을 직접 넣으면:
>
> | 형태 | 동작 | 위험도 |
> |---|---|---|
> | 읽기 `grid[start[0]][start[1]]` | `NAME_ERROR` 즉시 실패 | 낮음 — 저작 단계에서 바로 발견 |
> | **쓰기 `dist[s[0]][s[1]] = 0`** | **에러 없이 조용히 no-op** — 값이 전혀 바뀌지 않음 | **높음 — 오류 없이 잘못된 결과 생성** |
> | `s[0] == t[0]` 비교문 | 정상 (85 현행 관행) | — |
> | `grid[nr][nc]` (인덱스가 순수 변수) | 정상 | — |
>
> **규칙**: 83·86·90-Transfer 등 `[r,c]` 목록을 받는 계약의 공식 해법·대안·fixture·Transfer 해법은 **반드시 먼저 변수로 추출**한다: `r0 = start[0]`, `c0 = start[1]` 후 `grid[r0][c0]`, `dist[sr][sc]` 사용. 85 현행 코드가 이 관행(또는 비교문·tuple 인자 관행)으로 함정을 우회하고 있어 통과 중이다. 실증: 우회 관행으로 6×6 flood fill·5×5 다중 시작점이 정상 동작(§6.3).

### 1.2 비용·공수 불변식

1. 신규 React Lens, Callable, Firestore 컬렉션, AI API, 문제별 백엔드: **0개**.
2. 신규 9문제는 `createCapabilityPrototypeKernel` + `state-transition`을 사용한다.
3. 기존 85번만 `grid-bfs`를 유지한다.
4. 미구현 `grid-radar-lens`, `source-debug-lens`를 만들지 않는다.
5. 재귀와 함수 중첩 정의를 추가하지 않는다. Flood Fill·그래프 순회는 deque 기반 반복으로 구현한다.
6. `sort`, heap, comprehension, `enumerate`, 임의 import를 필수 문법으로 요구하지 않는다.
7. 격자는 최대 6×6, 그래프는 최대 8개 정점으로 제한한다. 대회형 대입력 최적화가 아니라 상태·불변식 이해를 평가한다.
8. 접근성 승인·학생 파일럿·출판 서류를 선행 게이트로 추가하지 않는다. 실행 계약과 권위 채점은 생략하지 않는다.
9. 모든 Core는 Core/Anchor만 선수로 삼는다. 89·90 Branch가 이후 Core의 필수 선수가 되지 않는다.
10. 전체 등록 개수를 맞추기 위해 미완성 문제를 먼저 published로 바꾸지 않는다.

## 2. Gate 7R — 성단 7 마감

성단 8 작업과 성단 7 미검증 변경을 한 diff에 계속 누적하지 않는다. 성단 8 착수 전에 다음을 마감한다.

**Step 0 (v2 신설) — 성단 7 작업 트리 커밋**: 현재 성단 7 구현(평가기 의미 변경 `appendleft`/빈 pop/`pop(index)` 거부, QueueFifoLens 라벨 수정, 신규 9문제, Test 19 등)이 **36개 파일 미커밋** 상태다. 등록 81·전체 14개 스크립트·ESLint 통과는 이 문서 검토 시점에 재확인했다(빌드는 원안 기록 유지). **성단 8 파일을 하나 만들기 전에 이 트리를 별도 커밋으로 확정한다.** 성단 5 때와 동일한 규칙이다.

- 성단 7 Public/Private/Transfer/fixture의 최종 ID 집합이 81개로 일치하는지 확인한다.
- 75~79에서 Public preview와 Private Transfer master 입력이 겹치지 않는지 검사한다.
- 76·77·78·79 Transfer가 단순 명칭 교체가 아니라 가이드가 정한 상태 보존·완료 순서 과제인지 확인한다.
- 78 Base/Transfer가 `[퇴장 목록, 남은 목록]`, 79 Transfer가 `[처리 목록, 남은 FIFO 목록]`을 실제 반환하는지 확인한다.
- 80 Base와 Transfer의 잘못된 Starter가 서로 반대 방향 오류로 실제 기각되는지 확인한다.
- 런타임의 `appendleft`, 빈 pop/popleft, 인자 있는 pop 거부를 Worker·서버 모두에서 확인한다.
- 실행 의미가 바뀌었으므로 replay/interpreter 식별자를 이전 의미와 동일하다고 조용히 유지하지 않는다. 기존 Replay 열람과 진도는 보존하되 새 세션의 엔진 식별 계약을 명시한다.
- `npm run test:algorithm-constellation`, 관련 ESLint, `npm run build`의 실제 결과를 기록한다.

이 Gate에서 발견된 실패만 수정한다. 성단 7을 다시 설계하거나 새 범용 저작 시스템을 만들지 않는다.

## 3. 성단 8 커리큘럼 레지스트리

| # | 문제 ID | 역할 | 함수 계약 | Lens |
|---:|---|---|---|---|
| 81 | `AC-GRID-NEIGHBOR-81` | Core Anchor | `valid_grid_neighbors(rows, cols, r, c)` → 좌표 목록 | state-transition |
| 82 | `AC-GRID-BOUND-82` | Core Practice | `open_grid_neighbors(grid, r, c)` → 이동 가능한 좌표 목록 | state-transition |
| 83 | `AC-GRID-FLOOD-83` | Core Anchor | `region_size(grid, start)` → 연결된 열린 칸 수 | state-transition |
| 84 | `AC-GRID-ISLAND-84` | Core Practice | `count_regions(grid)` → 연결 구역 수 | state-transition |
| 85 | `AC-NAV-006` | Core Anchor | `shortest_path(grid, start, target)` → 최단 이동 수 / -1 | grid-bfs |
| 86 | `AC-GRID-MULTI-86` | Core Practice | `light_fill_time(grid, sources)` → 전체 도달 시간 / -1 | state-transition |
| 87 | `AC-GRAPH-ADJ-87` | Core Practice | `build_network(node_count, links)` → 인접 목록 | state-transition |
| 88 | `AC-GRAPH-REACH-88` | Core Practice | `reachable_stations(network, start)` → BFS 방문 순서 | state-transition |
| 89 | `AC-NAV-COMPARE-89` | Branch Review | `compare_search_orders(network, start)` → `[BFS, DFS]` | state-transition |
| 90 | `AC-NAV-VISITED-90` | Branch Review | `repair_visit_timing(network, start)` → `[방문순서, enqueue 수]` | state-transition |

완료 후 성단 8은 Core 8 + Branch 2다. `constellation-8.requiredAnchors`는 정확히 81·83·85로 설정한다. 성단 9는 세 Anchor와 Core 6/8을 만족할 때만 열린다.

### 3.1 선수 조건

| 문제 | prerequisite ID |
|---|---|
| 81 | `AC-SEQ-005`, `AC-SEQ-RUNNING-35` |
| 82 | `AC-GRID-NEIGHBOR-81`, `AC-COND-RANGE-15` |
| 83 | `AC-GRID-BOUND-82`, `AC-NAV-005`, `AC-SET-MEMBERSHIP-42` |
| 84 | `AC-GRID-FLOOD-83`, `AC-SEQ-COUNT-33` |
| 85 | `AC-GRID-FLOOD-83`, `AC-NAV-005` |
| 86 | `AC-NAV-006` |
| 87 | `AC-GRID-NEIGHBOR-81`, `AC-SEQ-RUNNING-35` |
| 88 | `AC-GRAPH-ADJ-87`, `AC-NAV-005` |
| 89 | `AC-NAV-006`, `AC-GRAPH-REACH-88`, `AC-STACK-BOX-71` |
| 90 | `AC-NAV-006`, `AC-GRAPH-REACH-88`, `AC-CODE-FIRST-ERROR-01` |

85의 ID·version·Base/Transfer signature와 기존 완료 기록은 보존한다. 아직 완료하지 않은 학생에게만 새 선수 순서를 적용하며, 기존 완료자의 재진입·성단 접근은 grandfathered 규칙을 유지한다.

### 3.2 Python 개념과 사고 패턴

Python 개념 레지스트리에 꼭 필요한 것만 추가한다.

- `syntax:nested-indexing` — `grid[r][c]`, 최초 82.
- `syntax:sequence-unpacking` — `r, c = point`, 최초 83. 기존 평가기 지원을 설명 카드로 연결한다.
- tuple은 학생에게 불변 객체 이론으로 가르치지 않는다. 좌표 두 값을 함께 담는 짧은 표현으로만 소개하며 list 좌표 대안도 행동 채점으로 허용한다.
- `builtin:set`, `method:set_add`, `operator:membership-in`, `class:deque`, `method:popleft`, `method:append`, `builtin:len`, `builtin:range`는 기존 First Encounter를 복습한다.
- 그래프는 별도 Python 클래스가 아니라 list-of-lists로 표현한다.

사고 패턴은 다음 9종을 등록한다.

| 패턴 ID | 최초 문제 | 사고 규칙 |
|---|---|---|
| `pattern:four-neighbor-enumeration` | 81 | 상·하·좌·우 후보를 같은 규칙으로 생성 |
| `pattern:bounds-before-access` | 82 | 격자 값을 읽기 전에 경계를 먼저 검사 |
| `pattern:flood-fill` | 83 | 시작점과 연결된 칸을 frontier로 끝까지 방문 |
| `pattern:connected-components` | 84 | 아직 방문하지 않은 열린 칸마다 새 탐색 시작 |
| `pattern:bfs-shortest-path` | 85 | 거리 층 순서로 퍼져 첫 도달 거리를 사용 |
| `pattern:multi-source-bfs` | 86 | 여러 시작점을 거리 0으로 함께 넣어 동시 확산 |
| `pattern:adjacency-list` | 87 | 각 정점의 직접 이웃을 목록으로 기록 |
| `pattern:graph-reachability` | 88 | frontier와 visited로 연결된 정점을 한 번씩 탐색 |
| `pattern:mark-when-enqueued` | 90 | queue에 넣는 순간 방문 표시하여 중복 예약 방지 |

89는 `pattern:bfs-shortest-path`, `pattern:graph-reachability`, 기존 `pattern:lifo-processing`을 비교한다. 새 ‘DFS 만능 패턴’을 별도 Core 개념으로 승격하지 않는다.

## 4. 공통 문제 계약

### 4.1 격자·그래프 도메인

- 격자는 0=이동 가능, 1=장애물인 비어 있지 않은 직사각형 중첩 목록이다.
- 각 격자는 1~6행, 1~6열이다. 들쭉날쭉한 행은 입력하지 않는다.
- 좌표는 `[row, col]`, 0부터 시작한다. row가 위→아래, col이 왼쪽→오른쪽으로 증가한다.
- 이웃 순서는 **위, 아래, 왼쪽, 오른쪽**으로 고정한다. 반환 순서와 그래프 방문 순서를 결정하므로 지문·Oracle·테스트가 동일해야 한다.
- 81·82의 중심 좌표는 유효 범위다. 83·85의 start/target은 유효 좌표다.
- 그래프 정점은 0~`node_count-1`; 인접 목록의 이웃 순서는 입력 links 또는 주어진 network의 순서를 유지한다.
- 87의 links는 유효한 서로 다른 두 정점의 무방향 연결이며 self-loop·중복 연결은 없다. 88~90의 network도 유효한 인접 목록으로 제공한다.

입력 검증 라이브러리를 새로 만들지는 않는다. 학생이 책임져야 할 입력과 플랫폼이 보장하는 입력을 지문에서 구분한다.

### 4.2 3-Star 완결 세트

각 문제는 다음을 가진다.

1. Observe 예측 1개.
2. Explore 4~8장면. 최소 한 장면은 결과를 보기 전 학생이 다음 좌표/queue/visited 상태를 고른다.
3. Public Base 2~3건.
4. Hidden Base 통상 5~7건과 서로 다른 오개념 fixture 3~4종.
5. 2★: 상태 예측 + 원인/불변식 질문 최소 2개.
6. Fresh Transfer 1개. Public preview 2건, Private master 통상 3~4건. 같은 Transfer 안에서 입력 중복 0건.
7. Public/Private의 challenge ID·문항·표시 문구·signature 동기화.

1★은 반환 행동을 채점한다. deque/set 사용, 변수명, AST 모양을 강제하지 않는다. 학생이 작은 입력에서 정확한 다른 해법을 작성하면 통과시킨다. 자료구조 정신 모델과 최단거리 이유는 2★로 검증한다.

### 4.3 설명과 상태 표시

- 81에서 row/col과 네 방향을 직접 경험시킨 뒤 이름을 소개한다.
- 82에서 ‘범위 확인 → 그 칸 읽기’ 순서를 시각화한다. 범위 밖 좌표를 먼저 indexing하는 코드를 예시 정답처럼 보여주지 않는다.
- queue와 visited를 동시에 표시하되 ‘현재 처리 중’, ‘이미 예약됨’, ‘아직 발견 안 됨’을 색과 문구로 구분한다.
- visited는 ‘다녀온 흔적’보다 **이미 탐색하기로 예약한 좌표**라고 설명한다. 이 표현이 90의 기록 시점과 연결된다.
- StateTransitionLens의 상태는 `current`, `queue`, `visited`, `count`, `distance`처럼 평평한 키를 사용한다. 거대한 6×6 전체 상태를 매 장면 복제하지 않는다.
- `introContext.variables[].value`는 사람이 읽을 문자열만 넣는다. `[object Object]`를 허용하지 않는다.
- 독립 반례는 `experimentReset` + `stateBefore`로 분리한다.
- Observe/Explore/2★/3★ 사고 카드에는 완성 BFS 코드를 노출하지 않는다. First Encounter와 Code 단계의 짧은 문법 예시는 허용한다.
- 신규 문제의 `contextCard`/`thoughtCheck`는 현행 UI의 `{title,strategyGuide}` 및 `{question, options[{value,label}], expected}` 형태를 사용한다.

## 5. 문제별 명세

### 5.1 81 — 격자의 이웃 신호

- `valid_grid_neighbors(rows, cols, r, c)`.
- 입력: rows/cols 1~6, `(r,c)`는 유효 좌표.
- 출력: 범위 안인 상·하·좌·우 좌표를 고정 순서로 반환.
- 예: 3×4의 `(0,1)` → `[[1,1],[0,0],[0,2]]`; 1×1 → `[]`.
- Explore: 중앙 4개, 모서리 2개, 1행 지도의 좌우만 남는 독립 실험.
- 오답: 대각선 포함, row/col 교환, 범위 밖 포함, 한 방향 누락.
- 2★: 후보 4개와 유효 이웃을 구별하고, 모서리에서 왜 2개만 남는지 설명.
- Transfer: `valid_seat_neighbors(rows, cols, seat)` — 좌석판에서 같은 네 이웃 좌표를 반환. 입력 형태만 `[r,c]`로 바뀌는 근접 전이.

### 5.2 82 — 행성판의 가장자리

- `open_grid_neighbors(grid, r, c)`.
- 중심에서 네 방향 후보를 만들고, 범위 안이면서 값이 0인 좌표만 고정 순서로 반환.
- 예: `[[0,1,0],[0,0,0]]`, `(1,1)` → `[[1,0],[1,2]]`.
- Explore는 범위 밖, 벽, 열린 칸을 서로 다른 탈락/통과 이유로 표시.
- 오답: 값 먼저 읽어 범위 오류, 벽 포함, 경계만 보고 벽 무시, 방향 순서 혼동.
- 2★: `grid[nr][nc]`를 읽기 전 무엇을 확인하는지, 0과 1의 의미 확인.
- Transfer: `safe_rover_moves(grid, position)` — 현재 로버가 한 칸 이동 가능한 좌표 목록.

### 5.3 83 — 하나의 오염 구역 채우기

- `region_size(grid, start)`.
- start가 벽이면 0. 열린 칸이면 start와 4방향으로 연결된 열린 칸의 수를 반환.
- grid 최대 5×5. 원본 grid를 바꾸지 않는다.
- **공식 해법 관행 (v2)**: `start`를 읽기 전 `r0 = start[0]`, `c0 = start[1]` 추출 후 `grid[r0][c0]` 사용 — `grid[start[0]][start[1]]`은 읽기에서 즉시 실패한다(§1.1 함정).
- Explore: queue에 넣는 순간 visited 표시 → 앞 좌표 처리 → 새 이웃 예약 → frontier 소진.
- Hidden: 한 칸, 벽 start, 모든 칸 연결, 대각선만 닿음, 좁은 통로, 분리된 다른 구역.
- 오답: 대각선 연결, 벽 통과, start만 세기, visited 없음/늦음.
- 2★: 대각선은 연결이 아님, 다른 분리 구역은 세지 않음, queue 삽입 시 visited 표시.
- Transfer: `connected_sensor_count(grid, start)` — 1이 센서이고 0이 빈칸인 반대 표기에서 연결된 센서 수. 단순 이름 변경이 아니라 통과 값이 0→1로 바뀐다.

### 5.4 84 — 떠 있는 기지의 개수

- `count_regions(grid)`.
- 값 0인 열린 칸들의 4방향 연결 구역 개수 반환. 전부 벽이면 0.
- 바깥 이중 순회에서 아직 방문하지 않은 열린 칸을 만날 때만 count 증가 후 한 번의 BFS 시작.
- Explore: 첫 구역 완전 처리 → 이미 방문한 칸 건너뜀 → 새 시작점 발견 → 두 번째 count.
- Hidden: 0구역, 1구역, 대각선 분리, 여러 작은 구역, 통로로 연결, 1행/1열.
- 오답: 열린 칸 수 반환, 대각선 합침, BFS마다 count 증가, 첫 구역에서 종료.
- 2★: 새 구역 수를 증가시키는 정확한 순간과 이미 방문한 열린 칸에서 탐색을 시작하지 않는 이유.
- Transfer: `count_signal_clusters(grid)` — 1이 신호, 0이 빈칸인 표기에서 신호 연결 군집 수.

### 5.5 85 — 기존 어둠 성운 구조 신호 보강

다음 호환 계약을 보존한다.

| 항목 | 유지값 |
|---|---|
| ID/version | `AC-NAV-006` / 1 |
| Base | `shortest_path(grid,start,target)` |
| Base 의미 | 4방향, 0 통과/1 벽, 최단 이동 수, 불가 -1 |
| Transfer ID | `AC-NAV-006-T1` |
| Transfer | `virus_spread_steps(grid,start,target)` |
| Lens | `grid-bfs` |

보강 사항:

- curriculum order/role/선수 조건과 Python/thinking pattern을 신규 체계에 맞춘다.
- 기존 완료자는 잠그지 않는다.
- Public에 2★·3★ 표시 계약을 채우고, Private Transfer에 테스트 전용 공식 해법을 둔다.
- Public preview와 master 입력을 분리한다. 기존 master 의미를 무리하게 늘리지는 않는다.
- 시작=목표, 도달 불가, 장애물 우회, 갈림길의 짧은 경로를 유지한다.
- 기존 `GridBfsRadarLens`의 고정 시각화가 kernel config와 실제 같은지를 검증한다. 범용화할 필요가 없다.
- ‘visited가 최단거리를 보장한다’고 단순화하지 않는다. FIFO 거리 층 + enqueue 시 중복 예약 방지가 함께 작동한다고 설명한다.

### 5.6 86 — 여러 기지에서 퍼지는 빛

- `light_fill_time(grid, sources)`.
- grid 최대 5×5, 열린 칸이 최소 하나 존재. sources는 1~4개의 서로 다른 열린 좌표.
- 모든 source를 거리 0으로 queue·visited에 먼저 넣고 동시에 퍼진다고 본다.
- **공식 해법 관행 (v2 — 특히 중요)**: `dist[s[0]][s[1]] = 0` 형태는 **에러 없이 조용히 무효화된다**(§1.1 함정 표). 이 문제의 거리표 초기화는 반드시 `sr = s[0]`, `sc = s[1]` 추출 후 `dist[sr][sc] = 0`으로 작성한다. 실증: 추출 관행으로 열린 5×5 양끝 source → 정답 4 정상 동작, 미추출 버전은 오답 -1.
- 모든 열린 칸에 도달하는 최소 시간의 최댓값 반환. 도달 못 한 열린 칸이 있으면 -1.
- 예: 1×5 열린 길의 sources 양끝 → 2.
- Hidden: 한 source, 양끝 source, 벽으로 단절, source가 모든 열린 칸, 서로 만나는 파동.
- 오답: source를 순차 실행해 첫 결과만 사용, source 하나만 사용, 거리 합 반환, unreachable 무시.
- 2★: 여러 source가 모두 거리 0인 이유, 두 파동이 만난 칸을 다시 예약하지 않는 이유.
- Transfer: `emergency_broadcast_time(grid, stations)` — 여러 방송국에서 모든 열린 방까지 알림이 닿는 시간.

### 5.7 87 — 친구 기지 연결표

- `build_network(node_count, links)`.
- node_count 1~8, links 0~12. 무방향, self-loop/중복 없음, endpoint 유효.
- 출력: 길이 node_count의 인접 목록. 각 link `[a,b]`를 a 쪽에 b, b 쪽에 a로 추가하며 입력 link 순서를 보존.
- 예: `4, [[0,1],[0,2],[2,3]] → [[1,2],[0],[0,3],[2]]`.
- Explore: 빈 기록표 → 0-1을 양쪽 등록 → 0-2 → 2-3. 한쪽만 기록하는 오류 비교.
- 오답: 유향 한쪽만 추가, 정점 수가 아니라 link 수만큼 생성, endpoint 자체 대신 link 저장, 마지막 link 누락.
- 2★: 무방향 연결을 두 곳에 기록하는 이유와 연결이 없는 정점도 빈 목록을 가져야 하는 이유.
- Transfer: `build_friend_groups(student_count, friendships)` — 학생 번호의 무방향 친구 인접 목록.

### 5.8 88 — 통신 가능한 기지 찾기

- `reachable_stations(network, start)`.
- 정점 1~8의 유효 인접 목록. start 유효.
- 출력: start부터 BFS로 처음 발견한 순서. 이웃은 network에 주어진 순서대로 확인.
- 연결되지 않은 정점은 결과에서 제외. 시작점은 항상 첫 항목.
- Hidden: 한 정점, 선형, 갈림길, cycle, 분리 graph, 서로 다른 neighbor order.
- 오답: 직접 이웃만 반환, visited 없이 중복, 전체 정점 반환, stack 순서 사용.
- 2★: queue와 visited의 상태, cycle에서 시작점으로 되돌아가지 않는 이유, 결과 순서가 왜 입력 이웃 순서에 의존하는지.
- Transfer: `reachable_modules(connections, start)` — 같은 연결 탐색에서 도달 가능한 모듈 수를 반환. 순서 목록 복제 대신 개수로 전이.

### 5.9 89 — BFS와 DFS가 다르게 보는 순서

- `compare_search_orders(network, start)`.
- 출력 `[bfs_order, dfs_order]`.
- BFS는 queue, DFS는 stack의 반복 구현. 재귀 없음.
- DFS도 adjacency에 적힌 첫 이웃을 먼저 방문하도록, stack에는 이웃을 **역순으로** 넣는다. 이 순서 계약을 지문에 명시한다.
- **역순 순회 관행 (v2)**: 음수 step `range`와 역방향 슬라이싱은 이 계약에서 검증되지 않았다(성단 5 가이드 §5.7과 동일 상태). 카운터 루프로 안전하게 작성한다 — 실행 검증 골격: `k = len(network[node])` 후 `while k > 0: k = k - 1; nb = network[node][k]` (8정점 657 step, §6.3). 착수 시 `range(n-1, -1, -1)`을 probe해 지원되면 그것을 써도 된다.
- 두 순서가 같은 직선 graph와 달라지는 갈림 graph를 함께 사용한다.
- 오답: DFS 이웃을 정순 push해 의도 순서 반전, 둘 다 queue, visited 공유로 두 번째 순회 누락, 직접 이웃만 비교.
- 2★: 갈림점에서 frontier의 꺼내는 쪽이 순서를 어떻게 바꾸는지, 도달 가능한 정점 집합은 같아도 방문 순서는 다를 수 있음.
- Transfer: `compare_planet_patrols(network,start)` — `[가까운 기지 우선 순서, 한 갈래 깊이 우선 순서]` 반환. 그래프 모양을 바꿔 전략 비교.

### 5.10 90 — visited를 너무 늦게 표시한 로봇

- `repair_visit_timing(network, start)`.
- 제공 Starter는 queue에서 꺼낼 때 visited 처리해 같은 정점이 여러 번 queue에 예약되는 실행 가능한 버그 코드다.
- 올바른 반환: `[visit_order, enqueue_count]`. enqueue_count는 시작점 최초 삽입을 포함한다.
- 핵심 diamond graph: `[[1,2],[0,3],[0,3],[1,2]]`, start 0 → `[[0,1,2,3],4]`. 늦은 표시 코드는 3을 중복 예약하여 count 5.
- visit_order만 비교하면 정답처럼 보일 수 있으므로 enqueue_count가 효율 오류의 객관 증거가 된다.
- Hidden: tree(차이 없음), diamond(중복), cycle, 여러 합류점, 한 정점, 분리 graph.
- 오답: dequeue 때 표시, visited 자체 없음, enqueue count에 시작 누락, 중복 pop을 visit_order에도 기록.
- 2★: 최초로 결과가 아닌 내부 예약 수가 달라지는 순간, 넣을 때 표시하는 이유, tree만으로 오류를 발견하지 못하는 이유.
- Transfer: `repair_grid_frontier(grid,start)` — start와 연결된 열린 구역에서 `[visited_count, enqueue_count]` 반환. 올바르면 두 값이 같고, 합류 경로가 있는 grid에서 늦은 기록은 enqueue_count가 커진다. Starter는 같은 타이밍 오류를 포함한다.
- 실행 시간만으로 채점하지 않는다. 결정적 반환 증거로 판단한다.

## 6. 런타임과 85번 회귀 게이트

신규 공식 골격은 이미 지원된 문법만 사용하므로 원칙적으로 평가기 기능 추가는 없다.

### 6.1 착수 전 필수 Probe

구현 AI는 Public/Private 저작 전 클라이언트 공유 모듈과 서버 모듈에서 다음을 같은 입력으로 실행한다.

1. 6×6 flood fill.
2. 5×5 다중 시작점 거리표 갱신.
3. list-of-lists 인접표 생성.
4. 8정점 BFS/iterative DFS.
5. tuple/list 좌표를 set에 넣고 membership 확인.
6. nested `grid[r][c]` 읽기·쓰기와 input mutation 격리.
7. 기존 85 공식/대안/오답 fixture.

이미 확인한 작은 골격은 다시 설계할 필요가 없지만, 최대 입력 step 수와 Worker 경로는 측정한다. 실패하면 필요한 문법 하나만 좁게 보완하고 client/server/trace test를 함께 수정한다. 평가기 전체를 확장하지 않는다.

> **v2**: 아래 Probe 1~6은 이 문서 검토 시점에 서버 평가기에서 **최대 입력으로 선제 측정 완료**했다(§6.3). 구현자는 재측정 없이 예산 설계에 착수할 수 있고, 구현 후 측정은 확인 절차로 줄어든다. Probe 7(85 회귀)은 전체 스위트가 이미 커버한다.

### 6.2 예산

- 현행 학생 실행·출력·Trace 및 Judge 누적 200,000 step 제한을 올리지 않는다.
- 각 intended wrong fixture는 기존 20,000 step 저작 예산 안에서 **정확한 실패 그룹**에 도달해야 한다.
- grid 최대 크기를 모든 Hidden에 반복하지 않는다. 경계별 작은 반례 + 최대 크기 1건을 조합한다.
- 90의 늦은 visited fixture가 기하급수적 queue 증가로 예산에 먼저 걸리지 않도록 graph를 4~6정점으로 제한한다.
- 다중 시작점과 연결 요소는 input mutation 없이 별도 distance/visited를 만든다.
- Build chunk 증가는 기준선과 비교해 기록한다. 단지 테스트 통과를 위해 임계값을 올리지 않는다.

### 6.3 사전 측정표 (v2 신설 — 전건 서버 평가기 실측)

측정 골격은 모두 §1.1의 변수 추출 관행을 적용한 공식 해법 형태다.

| 문제 | 최대 입력 | 결과 | steps |
|---|---|---|---|
| 83 flood fill | 6×6 (28칸 연결 구역) | 28 (셀 수와 일치) | 4,678 |
| 84 count_regions | 6×6 (전체 순회 + 구역별 BFS) | 구역 수 정상 | 5,014 |
| 86 다중 시작점 | 5×5 열린 그리드, 양끝 source | 4 (정답) | 4,940 |
| 89 BFS + 역순 push DFS | 8정점 갈림 그래프 | `[BFS 8개, DFS 8개]` 순서 정상 | 657 |
| 90 늦은 visited | diamond 4정점 | `[[0,1,2,3], 5]` — 가이드 예시와 일치 | 178 |
| 86 벽 단절 케이스 | 5×5 중앙 밀실 | -1 (올바른 도달 불가 판정) | 2,988 |

결론: **최대 입력 단일 실행이 모두 5,100 step 미만** — §6.2 규칙(최대 크기 Hidden 1건 + 작은 반례 조합)대로 구성하면 fixture 누적 20,000 예산에 여유. 90의 늦은-visited fixture는 그래프를 4~6정점으로 제한하는 §6.2 규칙을 지키면 중복 예약 폭주 걱정 없다.

> 참고: 위 측정 중 86의 "중앙 밀실 → -1"은 원안 Hidden 목록의 "벽으로 단절" 그룹에 그대로 쓸 수 있는 검증 케이스다.

## 7. 구현 파일 지도

### 7.1 신규 18개 문제 파일

각 stem에 Public `.js`, Private `.private.cjs`를 만든다.

```text
ac_grid_neighbor_81
ac_grid_bound_82
ac_grid_flood_83
ac_grid_island_84
ac_grid_multi_86
ac_graph_adj_87
ac_graph_reach_88
ac_nav_compare_89
ac_nav_visited_90
```

Public: `src/components/AlgorithmConstellation/shared/problems/`

Private: `functions/algorithmConstellation/problems/`

### 7.2 수정 파일

- `ac_nav_006.js`, `ac_nav_006.private.cjs`: §5.5 범위만 보강.
- Public/Private problem index: 신규 9개 등록, 기존 85 중복 금지.
- `algorithmEditorialCatalog.js`: 81~90 선수·Lens·published 동기화.
- `constellationRegistry.js`: 성단 8 Anchor 81·83·85.
- Python concept / problem pattern registry: §3.2 항목.
- 기존 저작·게이트·서버 수명주기·패리티·Trace·지원 정확성 테스트.
- 평가기 수정은 Gate 8A Probe가 실제 실패할 때만 한다.

## 8. 테스트 설계

### 8.1 독립 Oracle

| 문제 | JS 테스트 Oracle |
|---|---|
| 81 | 고정 네 delta를 filter |
| 82 | 네 delta 중 bounds + cell 0 filter |
| 83 | 별도 배열 queue의 한 component 방문 수 |
| 84 | 전체 scan + 독립 component BFS 횟수 |
| 85 | 기존 독립 shortest-distance 참조 BFS |
| 86 | 모든 source를 초기 queue에 넣은 거리표의 max / unreachable |
| 87 | node_count개의 빈 배열에 각 무방향 edge 양쪽 append |
| 88 | 배열 queue + boolean visited의 BFS 순서 |
| 89 | 독립 queue BFS + iterative stack DFS |
| 90 | enqueue 시 visited인 참조 모델의 order/count |

Python 공식 해법을 JS로 문자열 번역해 기대값을 만들지 않는다. 작은 grid는 수동 앵커 값과 Oracle 값을 함께 확인한다.

### 8.2 테스트별 추가 계약

**Authoring integrity**

- 90개 Published/Public/Private ID 정확한 집합 동등성.
- 81~90 role·prerequisite·Lens·concept·pattern parity.
- Base/Transfer 기대값을 독립 Oracle로 전수 확인.
- preview/master 입력 중복 0건.
- 모든 공식/대안 코드 통과, fixture가 선언 그룹에서 Wrong Answer 또는 의도된 domain runtime error로 실패.
- 85 기존 ID/version/Base·Transfer signature와 대안 풀이 보존.
- 90 Base/Transfer Starter가 핵심 합류 반례에서 실패.
- input grid/network가 실행 뒤 변하지 않음.

**Curriculum/Gate**

- Test 20으로 성단 8 Core 8 / Branch 2 / Anchor 81·83·85 검증.
- Core 5 + Branch 2로 성단 9가 열리지 않음.
- Core 7이어도 Anchor 하나가 없으면 열리지 않음.
- Anchor 3개를 포함한 Core 6이면 열림.
- 89·90의 완료 여부가 개방 결과를 바꾸지 않음.
- 기존 85 완료자의 grandfathered 접근과 새 학생의 81→85 순서 모두 확인.
- 실제 Hub 경로가 사용하는 `getConstellationAccess`도 단언.

**Server orchestration**

- 81~90 Start → Base → Understanding → Transfer issue → Transfer submit 전체 흐름.
- contextCard/thoughtCheck은 전달되지만 공식 코드·Hidden·master 입력·2★ 기대답은 노출되지 않음.
- UID 소유권, 멱등 제출/보상, 만료/종료 세션, AI 사용 mastery 보류, production Mock fallback 금지 회귀.
- 85의 기존 진행 레코드로 재도전 가능.

**Runtime parity / Trace / Worker**

- 신규 Base와 Transfer의 클라이언트/서버 결과·오류·step limit parity.
- nested list mutation의 before/after snapshot이 이후 변경에 오염되지 않음.
- `ordered-buffer`, `container-membership`, `grid-frontier` 증거가 변수명에만 의존하지 않음.
- enqueue 시 set.add와 queue.append 장면의 source line이 일치.
- 실제 Worker에서 최대 grid 실행 후 정상 복구.
- 기존 71~80 pop/deque와 85 BFS 공식/fixture 회귀 없음.

**학습 지원/UI 표본**

- 81의 좌표 방향, 82의 bounds-before-access, 83의 queue/visited, 85의 거리 파동, 90의 중복 예약 장면을 렌더 확인.
- 신규 10문제 S1~Rescue가 비어 있거나 이전 문제 도메인을 말하지 않음.
- 미지원 문법 오류를 학생의 BFS 오개념으로 오진하지 않음.
- `GridBfsRadarLens`를 범용이라고 보고하지 않음.

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

개발 중에는 관련 테스트만, 완료 시 마지막 세 명령을 사용한다. 보고서에는 실제 명령·종료 상태, 90개 집합, 최대 step/누적 step, Worker 검증 여부, chunk 증감, 미검증 항목을 분리해서 기록한다.

## 9. 실행 순서와 완료 조건

| Gate | 작업 | 완료 조건 |
|---|---|---|
| 7R | 성단 7 검증·Replay 식별 마감 | 81개 기준선이 전체 test/lint/build에서 확인됨 |
| 8A | 2D/graph 최대 입력 Probe | 추가 런타임 기능 없이 가능한지 수치 확보 |
| 8B | 81~84 | 좌표→경계→한 구역→여러 구역의 Core 사다리 완결 |
| 8C | 85 보강 + 86 | 기존 최단거리 호환과 다중 시작점 전이 완결 |
| 8D | 87~90 | graph 표현·도달·전략 비교·visited 수리 완결 |
| 8E | 등록·게이트·회귀·출판 | 90개 집합과 성단 9 개방 계약 확인 |

완료 체크리스트:

- [ ] 성단 7 작업 트리(36개 파일)를 성단 8 착수 전 별도 커밋으로 확정했다.
- [ ] 공식·대안·fixture·Transfer 코드 전체에 "첨자 안의 첨자"가 없다 (변수 추출 관행 — §1.1 함정 표).
- [ ] 신규 문제의 fixture 누적 step이 20,000 이내임을 저작 테스트 로그로 확인한다 (§6.3 기준선 대비).
- [ ] 81에서 좌표·네 이웃을 처음 경험하고 82에서 경계와 벽을 분리한다.
- [ ] 83·84가 85보다 먼저 published되고 선수 조건도 같은 순서다.
- [ ] 85의 안정 ID/version/함수/기존 진도를 보존한다.
- [ ] 86은 여러 source를 처음부터 함께 넣으며, 단일 source 반복과 구별된다.
- [ ] 87은 list-of-lists 인접표를 충분히 설명하고 새 dict/class 문법을 요구하지 않는다.
- [ ] 89·90 Branch가 Core 게이트나 다음 Core의 필수 선수가 아니다.
- [ ] 90은 실행 시간 대신 결정적 enqueue count로 중복 예약을 검증한다.
- [ ] 대안 해법을 AST로 막지 않고 1★ 행동과 2★ 정신 모델을 분리한다.
- [ ] 정답·Hidden·master data가 client bundle에 들어가지 않는다.
- [ ] 새 Lens/API/DB 구조 없이 완성한다.
- [ ] 실제 검증 범위와 남은 제한을 정직하게 보고한다.

이 Wave 다음은 성단 9의 91~100이다. 재귀·memo·greedy·Capstone은 별도 런타임 결정을 요구하므로 이번 성단 8 구현에 섞지 않는다.
