# LUMI 알고리즘 성단 Core 100 교약·콘텐춰 설계

> 대상: 초등생 4학년∼중학 3학년 중, MetaSense Python 심화·Python 수학 과정 수료자  
> 목적: 성인요 콛딩테스트가 아니라 학생이 “사고 경험 → 규칙 발견 → 코드 → 설명 → 새 상황 전이”를 반복하는 연령 적합형 100문제 과정을 완성한다.

---

## 1. 결론

Core 100은 “인터넷의 좋은 문제 100개”가 아니라, 검증된 문제의 **사고 원형**을 MetaSense 학습 커널로 재저작한 교육과정이어야 한다.

최종 구성은 다음으로 고정한다.

| 구분 | 문제 수 | 역할 |
| --- | ---: | --- |
| 본 항로 Core | 76 | 선수 개념과 필수 사고력 형성 |
| 선택 항로 Branch | 20 | 코드 심판, 역공학, 반례, 심화 |
| 프로젝트 Capstone | 4 | 여러 개념 중 적절한 전략을 선택·설명 |
| **합계** | **100** | |

100개를 모두 필수로 풀게 하지 않는다. 학생은 각 성단의 Core 8개 중 6개 이상의 성취 증거를 만들면 다음 성단으로 이동하고, Branch는 취향과 준비도에 따라 선택한다.

---

## 2. 대상 학생과 난이도 상한

### 2.1 선수 조건

- Python 기본 문법, 함수, 조건문, 반복문, list 기초를 학습했다.
- Python 수학 과정의 나머지, 소수, 약수, 좌표, 규칙성 활동을 수료했다.
- 성인 취업 코딩테스트 준비나 경시대회 상위 알고리즘은 목표가 아니다.

### 2.2 핵심 관문

| 항목 | Explorer 권장 | Navigator 권장 | Core 100 절대 상한 |
| --- | --- | --- | --- |
| 읽기 | 5문장 이내 + 그림 | 10문장 이내 | 불필요한 세계관 독해 금지 |
| 코드 | 핵심 8∼18줄 | 핵심 12∼30줄 | 표준 해법 35 논리 줄 초과 금지 |
| 데이터 | 손으로 추적 가능 | 작은 표·격자 | 개념 이해보다 성능 트릭이 중심인 크기 금지 |
| 학습 시간 | 10∼18분 | 15∼25분 | 일반 문제 30분 초과 금지 |
| 새 개념 | 1개 | 1개 | 새 알고리즘 + 새 문법 동시 도입 금지 |
| 시각 추적 | 12∼24 장면 | 12∼30 장면 | 핵심 상태가 시각화되지 않으면 출판 금지 |

### 2.3 Core 100에서 제외하는 성인·경시형 영역

다음은 향후 `Deep Space Lab` 선택 과정으로 보내고 Core 100에서는 뺀다.

- Dijkstra, Floyd–Warshall, Bellman–Ford 등 가중 최단 경로
- 위상 정렬, Union-Find, MST
- Trie, Segment Tree, Fenwick Tree
- 단조 스택, 변형 슬라이딩 윈도우
- 비트 트릭과 비트마스크 DP
- N-Queen·Sudoku 완전 풀이와 같은 고강도 백트래킹
- 2차원 이상 복합 DP, 복잡한 구간 최적화
- Linked List 포인터 조작, BST 구축·직렬화

여기서 제외은 “영원히 가르치지 않는다”가 아니라, 현재 학습자의 인지 비용과 교육 목표에 맞지 않는다는 뜻이다.

---

## 3. 소스 분석과 채택 정책

### 3.1 소스별 역할

| 소스 | 채택할 장점 | 그대로 가져오지 않을 것 |
| --- | --- | --- |
| [JUNGOL Python/Intermediate](https://jungol.co.kr/problem) | 한국어 학습 순서, 조건·반복·문자열·리스트·재귀·DFS/BFS 원형 | 입출력 형식, 문장, 예제, 정답 코드 복제 |
| [Python Algorithm Interview 저장소](https://github.com/onlybooks/python-algorithm-interview) | 문자열, 배열, 스택·큐, 해시, 그래프의 검증된 사고 원형 | 성인 인터뷰 난이도, LeetCode 문장·테스트, 풀이 코드 |
| [USACO Guide Bronze](https://usaco.guide/bronze) | simulation, complete search, sorting, set/map의 단계적 구성 | 대회용 대입력·성능 중심 제약 |
| [Bebras Task Examples](https://www.bebras.org/task-examples) | 연령별 짧은 관찰, 패턴, 추상화, 블랙박스 문제 | 특정 문제의 문장·이미지 복제 |
| [CS Unplugged Searching](https://www.csunplugged.org/en/topics/searching-algorithms/) | 8∼10세도 가능한 선형 탐색→정렬된 탐색→절반 탐색 경험 | 활동지 자체 복제 |
| [Code.org CS Discoveries](https://code.org/en-US/curriculum/computer-science-discoveries) | 6∼10학년 대상 손으로 실험·제작·반성 중심 구성 | 앱·웹 제작 범위의 과도한 확장 |

### 3.2 저작권·출처 원칙

`python-algorithm-interview` 저장소에는 확인 시점에 명시적 LICENSE 파일이 보이지 않았다. GitHub도 라이선스가 없으면 기본 저작권이 적용되어 복제·배포·파생작 권한이 자동으로 생기지 않는다고 안내한다. 따라서 모든 소스는 **reference-only**를 기본값으로 두고, 사고 원형만 연구한다. [GitHub 라이선스 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

편집 카탈로그에는 다음을 필수로 저장한다.

```js
provenance: {
  sourceType: 'original | inspired | licensed-adaptation',
  sourcePlatform: 'JUNGOL | PAI | USACO | Bebras | CSUnplugged | internal',
  sourceUrl: 'https://...',
  sourceProblemId: null,
  rightsStatus: 'reference-only | permission-pending | licensed',
  copiedStatement: false,
  copiedExamples: false,
  copiedSolution: false,
  transformationNotes: [],
  reviewedBy: null,
}
```

---

## 4. Core 100 전체 구성

역할 표시:

- `A`: Anchor. 관찰→조작→코드→이해→전이의 완전한 10단계 커널
- `P`: Practice. 기존 Lens와 전이 generator를 재사용하는 짧은 본 항로
- `R`: Review. 코드 심판, 블랙박스, 반례 찾기 중심의 선택 항로
- `C`: Capstone. 복수 전략을 선택하고 설명하는 프로젝트

### 성단 0. 사고 탐사 면허 — 1∼10

| # | 역할 | 학생용 제목 | 핵심 사고 | 주 미션 |
| ---: | :---: | --- | --- | --- |
| 1 | A | 루미의 세 명령 | 순차 실행, 상태 추적 | 카드 배열·Trace |
| 2 | P | 사라진 변수 값 | 대입과 값 변화 | 결과 예측 |
| 3 | P | 빠진 명령 한 장 | 절차 분해 | Parsons |
| 4 | P | 바뀌어 버린 두 화물 | swap, 임시 저장 | 조작 |
| 5 | P | 경계선의 탐사선 | `<`와 `<=` | 반례 예측 |
| 6 | A | 네 번 반복한 신호 | for 반복 Trace | Time-Travel |
| 7 | P | 멈출 줄 아는 로버 | while, 종료 조건 | 상태 조작 |
| 8 | A | 오류가 시작된 한 순간 | 최초 오류 원인 | 코드 심판 |
| 9 | R | 두 코드, 같은 항로? | 동치성 판단 | 블랙박스 |
| 10 | R | 숨은 로봇의 규칙 | 입출력 역공학 | Reverse |

### 성단 1. 조건과 상태 — 11∼20

| # | 역할 | 학생용 제목 | 핵심 사고 | 현재 커널·출처 원형 |
| ---: | :---: | --- | --- | --- |
| 11 | A | 두 개의 안전 스위치 | and | `AC-COND-001` |
| 12 | P | 우주 구명정 승선 규칙 | or | `AC-COND-002` |
| 13 | P | 반전된 경보등 | not | 자체 원형 |
| 14 | P | 세 단계 위험 신호 | if/elif/else | JUNGOL 선택제어 계열 |
| 15 | A | 안전 온도 구간 | 구간 판정, and | 수학 부등식 |
| 16 | P | 최대 출력 제한기 | min/max 사고 | 자체 원형 |
| 17 | P | 탐사 등급 분류기 | 순서 있는 분기 | JUNGOL 조건문 계열 |
| 18 | P | 문을 열지 말지 심판하라 | 복합 조건 분해 | Bebras 판단 원형 |
| 19 | R | 꺼졌다 켜지는 기지 | Boolean toggle | 코드 심판 |
| 20 | R | 조건의 순서가 바꾸는 결과 | 분기 우선순위 | 반례 찾기 |

### 성단 2. 수학 패턴 — 21∼30

| # | 역할 | 학생용 제목 | 핵심 사고 | 수학 연결 |
| ---: | :---: | --- | --- | --- |
| 21 | A | 얼어붙은 신호 다리 | 주기, modulo | `AC-PAT-003` |
| 22 | P | 회전하는 우주 등대 | 주기 안의 구간 | `AC-PAT-004` |
| 23 | P | 홀수·짝수 비콘 | `% 2` | 배수·나머지 |
| 24 | P | 숫자 유성의 자릿수 신호 | 자릿수 분해 | 10진법 |
| 25 | P | 뒤집힌 우주 번호 | 자릿수 누적 | 나눗셈·나머지 |
| 26 | A | 운석의 약수 센서 | 작은 범위 완전 탐색 | 약수 |
| 27 | P | 소수 탐사 순찰대 | 약수 유무, 경계 | 소수 |
| 28 | P | 두 톱니바퀴의 공통 박자 | 반복 감소 | 최대공약수 |
| 29 | R | 다음 우주 캘린더 | 주기 일반화 | 큰 수 Transfer |
| 30 | R | 잘못 만든 소수 판별기 | 1·자신 경계 | 코드 심판 |

### 성단 3. 수열과 문자열 — 31∼40

| # | 역할 | 학생용 제목 | 핵심 사고 | 원형 |
| ---: | :---: | --- | --- | --- |
| 31 | A | 에너지 캡슐 선별 수거 | filter + accumulator | `AC-SEQ-005` |
| 32 | P | 가장 약한 신호와 강한 신호 | min/max scan | JUNGOL list 계열 |
| 33 | P | 정상 캡슐은 몇 개? | conditional count | 자체 원형 |
| 34 | P | 어제보다 세진 신호 | 인접 값 비교 | USACO Bronze simulation |
| 35 | P | 항해 일지의 누적 에너지 | running total | 수학 누적합 |
| 36 | A | 뒤집힌 구조 메시지 | reverse traversal | PAI Reverse String 원형 |
| 37 | P | 거울 통신 | palindrome | PAI Valid Palindrome 원형 |
| 38 | P | 화물 한 칸씩 밀기 | rotate | list 시뮬레이션 |
| 39 | R | 반복 신호 압축기 | run-length 사고 | 코드 완성 |
| 40 | R | IOI 구조 신호 찾기 | 부분 패턴 scan | JUNGOL 문자열 찾기 원형 |

### 성단 4. 집합과 기록표 — 41∼50

| # | 역할 | 학생용 제목 | 핵심 사고 | 새 Python 도구 |
| ---: | :---: | --- | --- | --- |
| 41 | A | 서로 다른 광물은 몇 종? | 중복 제거 | set |
| 42 | P | 승선 명단 확인 | membership | `in` |
| 43 | P | 두 기지가 공통으로 가진 부품 | intersection | set 연산 전 손으로 구성 |
| 44 | A | 신호 빈도표 | key→count | dict |
| 45 | P | 가장 많이 온 신호 | argmax over counts | dict traversal |
| 46 | P | 화물 재고 장부 | update·lookup | dict |
| 47 | P | 목표 에너지의 두 캡슐 | all pairs | PAI Two Sum 사고 원형 |
| 48 | A | 한 번만 확인하는 에너지 탐지기 | 기억하며 찾기 | dict lookup |
| 49 | R | 같은 문자로 된 통신 패킷 | frequency equivalence | Anagram 원형 |
| 50 | R | 빈도표 오류 찾기 | initialization/update 오개념 | 코드 심판 |

### 성단 5. 시뮬레이션과 탐색 — 51∼60

| # | 역할 | 학생용 제목 | 핵심 사고 | Lens |
| ---: | :---: | --- | --- | --- |
| 51 | A | 로버의 방향 명령 | position + direction state | Rover Board |
| 52 | P | 네 방향 우주 나침반 | cyclic direction | Direction Dial |
| 53 | P | 우주 시계 맞추기 | carry·modulo | Clock Dial |
| 54 | A | 꺼졌다 켜지는 행성 스위치 | repeated toggle | Switch Board |
| 55 | P | 화물 벨트 한 칸 이동 | array simulation | Cargo Belt |
| 56 | A | 가장 작은 화물을 앞으로 | selection sort 발견 | Sort Lab |
| 57 | P | 큰 화물을 뒤로 밀기 | bubble sort trace | Sort Lab |
| 58 | P | 정렬되지 않은 창고 탐색 | linear search | Search Beam |
| 59 | R | 절반씩 줄이는 숫자 행성 | binary search | CS Unplugged 원형 |
| 60 | R | 여러 구간의 방사선 합 | prefix sum | 수학 누적합 Transfer |

### 성단 6. 가능성 연구소 — 61∼70

| # | 역할 | 학생용 제목 | 핵심 사고 | 탐색 상한 |
| ---: | :---: | --- | --- | --- |
| 61 | A | 두 탐사 지점 모두 비교하기 | all pairs | 최대 10개 |
| 62 | P | 목표 합을 만드는 두 캡슐 | pair enumeration | 최대 20개 |
| 63 | P | 세 캡슐의 정확한 에너지 | triple enumeration | 최대 12개 |
| 64 | P | 센서 두 개 고르기 | combinations of 2 | 최대 8개 |
| 65 | A | 작은 장비 조합 보기 | subset 트리 | 최대 6개 |
| 66 | P | 통신 키패드 문자 조합 | choice tree | 3칸 이하 |
| 67 | P | 시간 안에 할 수 있는 임무 조합 | constraint filter | 최대 8개 |
| 68 | P | 한도 안의 최고 장비 세트 | enumerate + best-so-far | 최대 8개 |
| 69 | R | 중복 탐색을 줄여라 | pruning 직관 | 코드 심판 |
| 70 | R | 세 자릿수 암호 추리 | black-box constraints | 000∼999 시각 축소 |

### 성단 7. 스택과 대기열 — 71∼80

| # | 역할 | 학생용 제목 | 핵심 사고 | 자료구조 |
| ---: | :---: | --- | --- | --- |
| 71 | A | 우주복 박스 쌓기 | last-in-first-out | stack |
| 72 | P | 괄호 통신 검증 | matching | stack, PAI Valid Parentheses 원형 |
| 73 | P | 잘못된 명령 되돌리기 | undo | stack |
| 74 | A | 구조 신호 대기열 | first-in-first-out | `AC-NAV-005` |
| 75 | P | 탐사 로봇 입장 순서 | enqueue/dequeue | queue |
| 76 | P | 번갈아 통신하는 기지 | round-robin | deque |
| 77 | P | 한 장씩 버리는 우주 카드 | queue simulation | deque |
| 78 | P | 앞·뒤 출입 우주 도크 | two-ended operations | deque |
| 79 | R | Stack으로 Queue를 흉내 내면? | representation evaluation | 코드 심판 |
| 80 | R | pop과 popleft의 한 줄 차이 | LIFO/FIFO 오개념 | 반례 |

### 성단 8. 격자 항해 — 81∼90

| # | 역할 | 학생용 제목 | 핵심 사고 | 시각 모델 |
| ---: | :---: | --- | --- | --- |
| 81 | A | 격자의 이웃 신호 | row/col, 4-neighbor | Grid Radar |
| 82 | P | 행성판의 가장자리 | 2D boundary | Grid Lens |
| 83 | A | 하나의 오염 구역 채우기 | flood fill | Wave Lens |
| 84 | P | 떠 있는 기지의 개수 | connected components | Number of Islands 사고 원형 |
| 85 | A | 어둠 성운 구조 신호 | BFS shortest path | `AC-NAV-006` |
| 86 | P | 여러 기지에서 퍼지는 빛 | multi-source BFS 경험 | 작은 8×8 격자 |
| 87 | P | 친구 기지 연결표 | adjacency list | 그래프 표현 |
| 88 | P | 통신 가능한 기지 찾기 | reachability | DFS 또는 BFS |
| 89 | R | BFS와 DFS가 다르게 보는 순서 | strategy comparison | 두 실행 트레이스 |
| 90 | R | visited를 너무 늦게 표시한 로봇 | duplicate visit | 코드 심판 |

### 성단 9. 전략과 기억 — 91∼100

| # | 역할 | 학생용 제목 | 핵심 사고 | 난이도 제한 |
| ---: | :---: | --- | --- | --- |
| 91 | A | 작아지는 구조 문제 | recursion, base case | 깊이 10 이하 |
| 92 | P | 같은 계산을 또 했다 | repeated subproblem | 작은 Fibonacci 비교 |
| 93 | A | 계단을 오르는 방법 | memoization→1D DP | n ≤ 20 시각화 |
| 94 | P | 가장 많은 탐사 임무 선택 | interval greedy 직관 | 8개 이하 |
| 95 | R | 눈앞의 최선이 실패하는 동전 | greedy counterexample | 반례 1개 설명 |
| 96 | R | 연속 에너지 구간의 최고점 | best-so-far state | 공식 외우기 금지 |
| 97 | C | 외계 언어 해독기 | string + dict + validation | 자유 추가 규칙 1개 |
| 98 | C | 우주 화물 관제소 | simulation + queue + priority rule | 작은 이벤트 20개 |
| 99 | C | 구조 드론 지휘소 | grid + BFS + state review | 10×10 이하 |
| 100 | C | 자율 탐사 로버 | strategy selection + explanation | 가중치 그래프·고급 DP 금지 |

---

## 5. 연령에 맞게 제시하는 방법

100개의 초등·중등 버전을 별도로 만들지 않는다. 하나의 사고 커널을 유지하고 세 개의 Shell만 바꾸다.

| 요소 | Explorer | Navigator | PRO |
| --- | --- | --- | --- |
| 문제 제시 | 장면·버튼·객체 | 작은 표·격자·함수 시그니처 | 간결한 표준 문제문 |
| 첫 행동 | 터치·드래그·예측 | 예제 추적·짧은 계획 | 독립 계획 |
| 코드 | Parsons→부분 코드→자율 | 스타터 + 빈 본문 | 함수 시그니처만 제공 |
| 설명 | 어떤 장면에서 바뀌었는지 | 규칙과 반례 | 정확성·비용 비교 |

PRO는 성인용 고난도를 뜻하지 않는다. **같은 난이도의 사고를 더 적은 지원으로 수행하는 Shell**이다.

---

## 6. 100개를 현실적으로 제작하는 콘텐츠 등급

100개 모두에 전용 JSX, 전용 Lens, 전용 오개념 로직을 만들면 실패한다. 문제 역할에 따라 제작 밀도를 다르게 한다.

| 유형 | 수 | 학습 루프 | 제작 원칙 |
| --- | ---: | --- | --- |
| Anchor | 24 | 완전한 10단계 | 성단당 2∼3개만 정밀 제작 |
| Practice | 52 | 관찰·코드·피드백 중심 5∼7단계 | 공용 Lens·진단 템플릿 재사용 |
| Review | 20 | 코드 심판·반례·역공학 | 새 실행 엔진 없이 대표 오답과 장면 재사용 |
| Capstone | 4 | 40∼90분 프로젝트 | 자유 확장 1개 + 전략 설명 |

### 6.1 공용 Lens 10종

1. Truth Table / Decision Gate
2. Sequence Trace / Accumulator Belt
3. Cycle Timeline / Clock Dial
4. String Scanner
5. Set·Frequency Board
6. Sort Lab / Search Beam
7. Combination Tree
8. Stack·Queue Conveyor
9. Grid Radar / BFS Wave
10. Recursion·Memory Ladder

Lens 신규 제작은 “기존 10종으로 핵심 상태를 표현할 수 없다”는 리뷰를 통과한 경우에만 허용한다.

---

## 7. Problem Kernel 저작 계약

현재 Kernel에 아래 편집 메타데이터를 추가하되, 출처·권리 정보와 정답 특징은 클라이언트 번들에 넣지 않는다.

```js
curriculum: {
  catalogOrder: 11,
  constellationId: 'condition-state',
  routeRole: 'anchor | practice | review | capstone',
  recommendedBand: 'E | EN | N | NP',
  estimatedMinutes: { explorer: 15, navigator: 20, pro: 20 },
  prerequisites: ['AC-COND-001'],
  introduces: { concept: 'interval-condition', pythonTool: null },
  capabilityRequirements: ['boolean', 'comparison', 'trace.decision'],
  lensId: 'decision-gate',
  transferTemplateId: 'interval-condition-v1',
}
```

ID와 화면 순서는 분리한다. 이미 출판된 `AC-COND-001`, `AC-PAT-003`, `AC-NAV-006` 등의 ID는 Progress·Replay 호환성을 위해 바꾸지 않고 `catalogOrder`만 부여한다.

### 7.1 출판 전 필수 증거

| 등급 | 대표 오답 | Understanding | Transfer | 파일럿 |
| --- | ---: | ---: | ---: | --- |
| Anchor | 4개 이상 | 2종 | Fresh 1종 | 학생 5∼8명 |
| Practice | 3개 이상 | 1종 | 공용 generator 1종 | 학생 3∼5명 |
| Review | 표적 오답 2개 | 반례 선택 | 다음 문제가 자연 Transfer | 전문가 리뷰 |
| Capstone | 실패 전략 5개 | 전략 설명 rubric | 자유 확장 | 학생 8∼12명 |

---

## 8. 현재 코드베이스와의 Capability Gap

현재 공통 Restricted Evaluator는 조건, 나머지, list 순회, deque, 작은 BFS를 실행할 수 있다. 그러나 Core 100 전체를 지원하기에는 다음이 부족하다.

| Capability Pack | 필요 영역 | 해당 문제 | 선행 검증 |
| --- | --- | --- | --- |
| R1 Sequence | `range`, string indexing/slicing, safe string methods | 24∼40 | client/server parity |
| R2 Records | dict literal/update/get, set operations | 41∼50 | mutation·missing-key semantics |
| R3 Search | `sorted`, simple helper functions | 51∼60 | stable deterministic semantics |
| R4 Choice | nested enumeration, bounded recursion | 61∼70, 91∼93 | recursion depth·step budget |
| R5 Trace | stack/queue/grid/recursion semantic events | 71∼100 | source line↔world event parity |

### 8.1 중요한 기술 의사결정

100문제를 위해 regex 기반 Python subset을 무제한 확장하는 것은 오히려 개발 비용을 키운다. R1∼R2 스파이크 후 다음 기준으로 한 번만 결정한다.

- 공식·대안·의도된 오답 95% 이상이 동일 해석 규칙에서 실행되는가?
- 새 Python 문법 하나를 추가할 때 client/server/test 수정이 3개 이하인가?
- Python 의미 차이로 인한 오판을 parity test가 막는가?

세 기준 중 하나라도 반복 실패하면 커스텀 해석기 확장을 멈추고, 고정된 Python runtime을 사용하는 Worker·Judge 구조로 이전한다. 이 결정은 40문제 이후가 아니라 **20문제 이전**에 끝내야 한다.

---

## 9. 제작 파이프라인

### 9.1 300개 원형 조사 → 100개 선정

1. JUNGOL 140개, PAI 50개, USACO Bronze 40개, Bebras·CS Unplugged 40개, MetaSense 자체 30개를 편집 후보로 등록한다.
2. 문장이 아니라 `concept fingerprint`를 기록한다.
3. 아래 100점 rubric으로 채점하고 75점 미만은 제외한다.
4. 같은 fingerprint가 3개 이상 겹치면 가장 시각화·전이가 좋은 원형만 남긴다.

| 평가 축 | 배점 |
| --- | ---: |
| 연령·선수과정 적합성 | 25 |
| 핵심 개념 1개로의 격리 | 20 |
| 조작·Trace 시각화 가능성 | 15 |
| 단순 숫자 교체가 아닌 Transfer 가능성 | 15 |
| 대표 오개념 진단 가능성 | 10 |
| Python 수학·심화 과정 연결성 | 10 |
| 권리·출처 위험 | 5 |

### 9.2 문제 1개의 제작 순서

```text
원형 선정
  → 핵심 불변성 1문장
  → 선수 개념·Python 도구 확인
  → 작은 우주(small world) 설계
  → 대표 오답·경계 사례
  → Observe/Explore Lens 매핑
  → Public/Diagnostic/Hidden test group
  → Understanding evidence
  → Fresh Transfer
  → Explorer/Navigator/PRO copy
  → 저작권·PII·카피 검수
  → 자동 검증
  → 학생 파일럿
```

### 9.3 전이 제작 비용 절감

각 문제의 Transfer를 수작업 100개로 만들지 않는다. 성단별 2∼3개, 총 24개 정도의 **Transfer Generator Family**를 만들고 입력 세계·함수 이름·경계 사례를 안전하게 변형한다. Anchor는 Fresh Generator를 사용하고, Practice는 다음 문제 자체가 자연스러운 Transfer가 되게 쌍을 짓는다.

---

## 10. 개발 Wave와 중단 관문

### Wave 0 — Catalog·Runtime Decision (0→7개 기준선)

- 현재 7개 Kernel을 Core 100에 매핑한다.
- Authoring Catalog schema와 provenance review를 먼저 고정한다.
- R1·R2 capability spike로 해석기 지속/이전을 결정한다.

**Gate 0:** ID 호환성, 권리 로그, client/server parity, Lens registry가 고정되지 않으면 신규 문제를 만들지 않는다.

### Wave A — 20개

- 성단 0∼2와 수열 Anchor를 우선 제작한다.
- 핵심 엔진: condition, loop, modulo, sequence trace.
- 공용 Lens 5종을 완성한다.

**Gate A:** 학생 8명 이상의 중앙 첫 의미 있는 행동 90초 이내, 중앙 완료 25분 이내.

### Wave B — 40개

- string, set, dict까지 확장한다.
- 100문제 전체의 저작 속도를 이 시점에 재추정한다.

**Gate B:** 신규 Practice 하나를 추가하는 데 전용 JSX가 필요하거나 1.5 인일을 넘으면 Renderer·Authoring schema를 먼저 개선한다.

### Wave C — 60개

- simulation, sorting, search, prefix sum까지 정규 초·중등 과정을 완성한다.
- 이 시점에 첫 커리큘럼 인증을 발급할 수 있다.

**Gate C:** 문제별 정답률이 아니라 힌트 없이 다시 푸는 독립 귀환 증거를 확인한다.

### Wave D — 80개

- bounded complete search, stack, queue를 추가한다.
- Review 미션을 최소 14개 확보한다.

**Gate D:** 재귀·격자 전에 Queue/FIFO, visited, 좌표 오개념이 충분히 축적되었는지 검사한다.

### Wave E — 96 + 4 Capstone

- flood fill, BFS, bounded recursion, memoization, simple greedy를 추가한다.
- 최종 4개 프로젝트를 신규 엔진 없이 기존 Lens 조합으로 구성한다.

**Gate E:** 고급 알고리즘을 추가해야만 Capstone이 어려워지는 설계라면 폐기한다. 난이도는 알고리즘 지식이 아니라 분해·선택·검증에서 나와야 한다.

---

## 11. 검증 설계

### 11.1 자동 검증

- Public Kernel schema, deep freeze, private field leak
- official/alternative solution pass
- intended wrong fixture가 정해진 failure group에서 fail
- client/server evaluator parity
- cumulative step·output·source length budget
- Transfer generator determinism·freshness·difficulty bound
- Trace event의 source line·state diff·world diff 정합성
- Explorer/Navigator/PRO가 같은 핵심 판정 함수와 테스트를 공유하는지
- provenance 필수 필드와 copied flags

### 11.2 학생 파일럿 지표

| 지표 | 목표 |
| --- | --- |
| First Meaningful Action | 중앙값 90초 이내 |
| 첫 Run 전 이탈 | 10% 미만 |
| 일반 문제 중앙 완료 | Explorer 18분, Navigator 25분 이내 |
| 힌트 후 수정 성공 | 60% 이상 |
| 3∼7일 독립 귀환 | Anchor 70% 이상 |
| “왜 그런지” 설명 증거 | Anchor 완료자 80% 이상 |
| AI Prompt 사용 후 독립 재도전 | 즉시 Mastery 없음, 귀환 증거로만 복구 |

---

## 12. 비용·공수 통제 원칙

1. 100개 모두에 전용 화면을 만들지 않는다.
2. 24 Anchor에만 풀 스팩·상세 오개념·독립 귀환을 집중한다.
3. 52 Practice는 공용 Lens, 오답 family, Transfer generator를 재사용한다.
4. 20 Review는 새 실행 엔진 없이 기존 테스트·Trace를 재조합한다.
5. 이미지·애니메이션은 성단 테마 자산을 공유하고 문제별 신규 제작을 최소화한다.
6. AI는 초안·변형·테스트 후보 생성에만 쓰고, 출판은 인간 교육 검수자가 승인한다.

대략적인 제작 부하는 다음으로 예산한다.

| 유형 | 문제당 목표 공수 | 주요 부하 |
| --- | ---: | --- |
| Practice | 0.5∼1.0 인일 | Kernel·test·copy·QA |
| Review | 0.5∼1.0 인일 | 오답·반례·Trace 재구성 |
| Anchor | 2∼4 인일 | 완전 루프·Transfer·파읿럿 |
| Capstone | 5∼8 인일 | 복수 장면·rubric·파읿럿 |

즉, Core 100은 공용 저작도구와 Lens가 완성된 후에도 **약 130∼190 인일** 규모의 콘텐츠·QA 작업으로 보는 것이 현실적이다. 100개를 한 번에 계약하지 않고 각 Wave Gate에서 유지보수 비용과 학습 지표를 다시 산정한다.

---

## 13. 바로 다음 작업

코드 작업 전에 다음 세 산출물을 순서대로 확정한다.

1. **Core 100 Editorial Catalog v1**  
   위 100개에 source candidate, concept fingerprint, prerequisite, first Python tool, Lens, misconception family, transfer family, rights status를 채운다.
2. **Runtime Capability Matrix R1∼R5**  
   현재 evaluator가 각 문제의 공식·대안·오답 코드를 실행할 수 있는지 매트릭스로 검증한다.
3. **Wave A 20문제 Production Brief**  
   20개의 정확한 function signature, small world, public/hidden group, 3개 오답, Understanding, Transfer, Shell copy를 문서화한다.

이 세 문서가 완성되기 전에 100개 Kernel 코딩을 시작하지 않는다.
