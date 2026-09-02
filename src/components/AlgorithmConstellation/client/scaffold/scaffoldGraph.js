/**
 * Scaffold Graph Specification
 * Multi-tier educational support levels with fading rules (S0 ~ S5 + Rescue).
 */

import { getPublicKernel } from '../../shared/problems/index.js'

export const SCAFFOLD_LEVELS = Object.freeze({
  S0: 0, // Independent
  S1: 1, // Condition Scan (Emphasis on key words)
  S2: 2, // Reduced Universe / Formula Lens
  S3: 3, // Guiding Question
  S4: 4, // Route Card (Step-by-step logic flow card)
  S5: 5, // Personalized Partial Code / Parsons
  RESCUE: 6, // Recovery Lab
})

export const AC_COND_001_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 조건 스캔',
    description: '문제에서 가장 중요한 단어에 주목해 보세요.',
    content: '우주선 게이트는 **두 스위치가 모두** 켜져 있어야 합니다. "동시에" 만족해야 하는 조건을 찾아보세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 축소 우주 실험',
    description: '네 가지 스위치 조합을 직접 눌러보며 규칙을 확인하세요.',
    content: '스위치 1만 켜졌을 때(ON, OFF), 스위치 2만 켜졌을 때(OFF, ON)는 게이트가 열리지 않아야 합니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '생각을 구체화하는 질문입니다.',
    content: '질문: "만약 스위치 하나라도 OFF(False)라면, 게이트는 열려야 할까요, 닫혀야 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. 스위치 1(s1)의 상태를 확인한다.\n2. 스위치 2(s2)의 상태를 확인한다.\n3. 둘 다 참일 때만 True를 반환한다.\n4. 그 외에는 False를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '정답 표현을 복사하지 않고, 필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      '두 입력을 함께 검사하는 조건을 만든다.',
      '그 조건이 만족되면 True를 반환한다.',
      '그 밖의 경우에는 False를 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '두 조건이 모두 참이어야 할 때는 Python의 `and` 논리 연산자를 사용합니다. `def check_gate(s1, s2): return s1 and s2` 처럼 작성하면 간결하게 해결할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_COND_002_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 조건 스캔',
    description: '구명정 승선 규칙의 핵심 단어에 주목해 보세요.',
    content: '승선 카드가 있거나(has_card), 비상 승인(emergency_approved) 중 **하나라도** 만족하면 승선할 수 있습니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 축소 우주 실험',
    description: '네 가지 경우의 수를 확인하세요.',
    content: '둘 중 하나만 ON이어도 출입문이 열립니다. 둘 다 미소지(False, False)일 때만 문이 닫힙니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '대안 조건을 코드로 만드는 질문입니다.',
    content: '질문: "Python에서 둘 중 하나만 참이어도 전체가 참이 되는 논리 연산자는 무엇일까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. has_card 또는 emergency_approved가 참인지 확인한다.\n2. 둘 중 하나라도 참이면 True를 반환한다.\n3. 둘 다 거짓일 때만 False를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'has_card와 emergency_approved를 or로 결합한다.',
      '대안 조건의 참/거짓 결과를 return으로 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '둘 중 하나만 참이어도 되는 대안 조건은 Python의 `or` 연산자를 사용합니다. `def can_board(has_card, emergency_approved): return has_card or emergency_approved` 처럼 작성하면 해결할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_PAT_003_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 주기 스캔',
    description: '반복되는 시간 간격에 주목해 보세요.',
    content: '신호 다리는 **0초, 3초, 6초, 9초...** 처럼 3초마다 열립니다. 3의 배수 규칙을 찾아보세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 수식 렌즈 (Modulo %)',
    description: '나머지를 구하는 연산자를 확인하세요.',
    content: 'Python에서 나머지를 구하는 기호는 `%`입니다. `time % 3`을 계산하면 0초, 3초, 6초는 나머지가 0이 됩니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '조건을 코드로 만드는 질문입니다.',
    content: '질문: "시간(time)을 3으로 나눈 나머지(`time % 3`)가 몇과 같아야 다리가 열릴까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. time을 3으로 나눈 나머지(time % 3)를 계산한다.\n2. 나머지가 0과 같은지(== 0) 비교한다.\n3. 나머지가 0이면 True를 반환한다.\n4. 그 외에는 False를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      '현재 시간 time을 주기 3으로 나눈 나머지를 구한다.',
      '나머지가 0과 같은지 비교한다 (time % 3 == 0).',
      '조건의 참/거짓 결과를 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '3초 주기는 `time % 3 == 0` 수식으로 표현합니다. `def check_bridge(time): return time % 3 == 0` 처럼 작성하면 모든 시간에 대해 정확히 다리 개폐를 판정할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_PAT_004_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 구간 주기 스캔',
    description: '한 주기 안에서 켜져 있는 시간 범위를 확인하세요.',
    content: '등대는 **4초 주기**로 회전하며, 매 주기마다 **0초와 1초** (2초 미만) 동안 빛납니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 수식 렌즈 (구간 부등식)',
    description: '나머지와 부등호의 결합을 확인하세요.',
    content: '4로 나눈 나머지(`time % 4`)의 값은 0, 1, 2, 3이 됩니다. 이 중 0과 1은 `time % 4 < 2` 부등식으로 한 번에 표현할 수 있습니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '구간 조건을 작성하는 질문입니다.',
    content: '질문: "4로 나눈 나머지(`time % 4`)가 몇보다 작을 때( < ) 등대가 켜지나요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. time % 4로 4초 주기 내의 위치를 계산한다.\n2. 계산된 위치가 2보다 작은지(< 2) 확인한다.\n3. 2보다 작으면 True(켜짐), 아니면 False(꺼짐)를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'time % 4로 현재 주기의 시간 오프셋을 구한다.',
      '오프셋이 2 미만인지 비교한다 (time % 4 < 2).',
      '비교 결과를 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '4초 주기 중 0초, 1초 구간은 `time % 4 < 2`로 표현합니다. `def beacon_light(time): return time % 4 < 2` 처럼 작성하면 등대의 발광 구간을 판정할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_SEQ_005_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 조건 및 누적 스캔',
    description: '선별할 조건과 합산의 시작점을 확인하세요.',
    content: '정상 캡슐은 **에너지가 0보다 큰(energy > 0)** 캡슐입니다. 합을 저장할 변수(total = 0)부터 시작하세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 순회와 조건문 렌즈',
    description: 'for문과 if문의 결합 구조를 확인하세요.',
    content: '`for energy in capsules:` 로 하나씩 꺼내고, `if energy > 0:` 일 때만 `total = total + energy`로 더합니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '순회 누적 절차를 만드는 질문입니다.',
    content: '질문: "손상된 캡슐(0 이하)을 만났을 때, total 값은 변해야 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. 합을 저장할 변수 total을 0으로 초기화한다.\n2. capsules 리스트의 각 원소 energy를 하나씩 순회한다.\n3. energy > 0 이면 total에 더한다.\n4. 반복이 끝나면 total을 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'total = 0',
      'for energy in capsules:',
      '    if energy > 0:',
      '        total = total + energy',
      'return total',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '리스트 순회와 조건 누적은 for + if 패턴을 사용합니다. `def collect_energy(capsules): total = 0; for e in capsules: if e > 0: total += e; return total`로 작성할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_NAV_005_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 대기열(Queue) 스캔',
    description: '먼저 들어온 것을 먼저 꺼내는 FIFO 원리를 확인하세요.',
    content: '조난 신호는 도착 순서대로 처리해야 합니다. `collections.deque`의 `popleft()`를 사용해 맨 앞 신호를 꺼내세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · Deque 연산 렌즈',
    description: '대기열에서 원소를 꺼내는 메서드를 확인하세요.',
    content: '`queue.pop()`은 맨 뒤(스택 방식)에서 꺼내지만, `queue.popleft()`는 맨 앞(큐 방식)에서 꺼냅니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '큐 반복 처리 구조를 만드는 질문입니다.',
    content: '질문: "대기열(queue)에 원소가 남아있는 동안 계속 꺼내려면 어떤 반복문 조건을 써야 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. queue = deque(signals) 로 대기열을 만든다.\n2. processed = [] 리스트를 준비한다.\n3. while queue: 로 큐가 빌 때까지 반복한다.\n4. queue.popleft() 로 맨 앞 신호를 꺼내 processed에 추가한다.\n5. processed를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'queue = deque(signals)',
      'processed = []',
      'while queue:',
      '    processed.append(queue.popleft())',
      'return processed',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: 'FIFO 대기열은 `from collections import deque`와 `popleft()`를 사용합니다. `def process_signals(signals): q = deque(signals); res = []; while q: res.append(q.popleft()); return res`로 작성할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_NAV_006_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · BFS 최단 경로 스캔',
    description: '가까운 칸부터 파동처럼 퍼져나가는 탐색 원리를 확인하세요.',
    content: '시작점에서 상하좌우 4방향으로 1칸씩 이동하며 거리를 1씩 늘려갑니다. 가장 먼저 목표점에 도달한 순간의 거리가 최단 거리입니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · Visited 불변성 렌즈',
    description: '방문 집합(visited)의 역할을 확인하세요.',
    content: '이미 확인한 좌표를 `visited.add((nr, nc))`로 기록하지 않으면, 왔던 길을 다시 돌아가며 무한 루프에 빠집니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '이동 가능한 이웃 칸을 검사하는 질문입니다.',
    content: '질문: "다음 칸 (nr, nc)로 이동하려면 맵 범위 안이고(0 <= nr < rows), 장애물이 아니고(grid[nr][nc] == 0), 아직 방문하지 않았어야((nr, nc) not in visited) 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. queue = deque([(sr, sc, 0)]), visited = {(sr, sc)} 로 시작한다.\n2. queue.popleft() 로 현재 좌표 (r, c)와 거리 dist를 꺼낸다.\n3. (r, c) == target 이면 dist를 즉시 반환한다.\n4. 상하좌우 유효한 다음 칸을 visited에 넣고 queue에 (nr, nc, dist + 1)을 넣는다.\n5. 큐가 빌 때까지 도달하지 못하면 -1을 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'queue = deque([(sr, sc, 0)]); visited = {(sr, sc)}',
      'while queue:',
      '    r, c, dist = queue.popleft()',
      '    if (r, c) == target: return dist',
      '    # 유효한 이웃 칸을 visited에 넣고 queue에 append',
      'return -1',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '격자 BFS는 Queue와 visited 집합을 함께 사용합니다. 가까운 거리부터 순서대로 큐에서 꺼내므로 처음 목표점에 도달한 순간의 거리가 반드시 최단 거리임이 보장됩니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_LOOP_06_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 반복 및 누적 스캔',
    description: '반복 횟수와 매 회차 더해지는 에너지에 주목해 보세요.',
    content: 'times 만큼 반복하며 step_energy 씩 누적해야 합니다. 0부터 시작하는 누적 변수(energy = 0)와 정해진 횟수 반복(range(times))에 주목해 보세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 회차별 상태 렌즈',
    description: 'for문이 돌 때마다의 상태 변화를 확인하세요.',
    content: 'times=4, step_energy=2일 때:\n• 1회차: energy = 0 + 2 = 2\n• 2회차: energy = 2 + 2 = 4\n• 3회차: energy = 4 + 2 = 6\n• 4회차: energy = 6 + 2 = 8',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '반복문 코드를 작성하는 질문입니다.',
    content: '질문: "Python에서 정수 times번만큼 반복하려면 `for i in range(times):`를 어떻게 써야 할까요? (정수는 바로 for문에 쓸 수 없고 range() 함수를 거쳐야 합니다)"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. energy = 0 으로 누적 변수를 준비한다.\n2. for i in range(times): 로 times번 반복한다.\n3. 루프 본문에서 energy = energy + step_energy 로 값을 더한다.\n4. 반복이 끝나면 energy를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'energy = 0',
      'for i in range(times):',
      '    energy = energy + step_energy',
      'return energy',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '정해진 횟수 반복과 상태 누적은 for + range 패턴을 사용합니다. 정수(times)는 바로 for문에 넣을 수 없으며, `for i in range(times):` 형태로 작성해야 0부터 times-1까지 순서대로 반복하며 energy에 step_energy를 누적할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_STEP_03_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 3단계 절차 스캔',
    description: '충전, 부스트 증폭, 방어막의 3단계 흐름을 확인하세요.',
    content: '1단계 충전(charge) ➔ 2단계 증폭(boost) ➔ 3단계 방어막(shield) 순서로 에너지가 전이됩니다. 빠진 2단계 연산에 주목하세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 상태 전이 렌즈',
    description: '초기값 2에서 단계별 전이 결과를 확인하세요.',
    content: '• 1단계(충전): 2 + 3 = 5\n• 2단계(증폭): 5 * 4 = 20 (빠진 명령)\n• 3단계(방어막): 20 - 5 = 15',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '앞 단계 결과를 다음 단계로 연결하는 질문입니다.',
    content: '질문: "1단계 충전 결과가 담긴 energy 변수에 boost를 곱하여 갱신하려면 어떤 대입 연산문을 써야 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. energy = initial_energy\n2. energy = energy + charge\n3. energy = energy * boost  # 빠진 증폭 명령\n4. energy = energy - shield\n5. return energy`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'energy = initial_energy',
      'energy = energy + charge',
      'energy = energy * boost',
      'energy = energy - shield',
      'return energy',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '연속된 절차는 앞 단계의 계산 결과(energy)를 다음 단계 연산의 입력으로 계속 이어받아 갱신합니다. 빠진 2단계에는 `energy = energy * boost`를 채워 넣어야 합니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_BOUND_05_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 경계선 포함 스캔',
    description: '경계선 위의 지점(pos = limit = 10)의 안전 여부에 주목하세요.',
    content: '🛰️ 탐사 규정: 탐사선이 경계선(limit)에 닿은 위치(10)까지 안전(True)으로 판정해야 합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 비교 연산자 렌즈 (< vs <=)',
    description: '경계값(10)에서의 두 연산자 차이를 확인하세요.',
    content: '• 10 < 10 ➔ False (경계선 제외)\n• 10 <= 10 ➔ True (경계선 포함)',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '경계 포함 조건을 코드로 작성하는 질문입니다.',
    content: '질문: "current_pos가 limit 이하(작거나 같음)인지 검사하는 Python 비교 연산자 기호는 무엇일까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. current_pos와 limit의 크기를 비교한다.\n2. current_pos <= limit 비교식을 작성한다.\n3. 비교식의 참/거짓(True/False) 결과를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'return current_pos <= limit',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '경계값을 안전 구역에 포함하려면 이하(<=) 연산자를 사용합니다. `def check_within_boundary(current_pos, limit): return current_pos <= limit` 처럼 작성하면 경계선 위의 위치(10)까지 정확히 True로 판정합니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_SEQ_01_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 순차 누적 스캔',
    description: '초기 에너지와 세 번의 추가 에너지에 주목하세요.',
    content: 'initial_energy 변수에 first, second, third를 순서대로 더해 최종 에너지를 계산해야 합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 단계별 누적 렌즈',
    description: '초기값에서 3단계로 누적되는 과정을 확인하세요.',
    content: '1. energy = initial_energy\n2. energy = energy + first\n3. energy = energy + second\n4. energy = energy + third',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '순차 계산을 코드로 작성하는 질문입니다.',
    content: '질문: "변수에 값을 차례로 더해 누적하는 산술 연산자(+)를 어떻게 연결할 수 있을까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. energy = initial_energy 로 시작한다.\n2. first, second, third를 순서대로 더한다.\n3. 최종 energy 값을 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'energy = initial_energy',
      'energy = energy + first + second + third',
      'return energy',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '순차 실행은 명령문이 위에서 아래로 차례대로 실행됩니다. `def sequence_energy(initial_energy, first, second, third): return initial_energy + first + second + third` 처럼 작성하면 됩니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_VAR_02_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 변수 갱신 스캔',
    description: '변수 a, b의 값을 더해 c에 저장하는 흐름에 주목하세요.',
    content: '두 변수 a와 b의 합을 구하여 c 변수에 저장하고, 계산된 c를 반환해야 합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 대입 연산자(=) 렌즈',
    description: '우변의 계산 결과를 좌변 변수에 담는 원리를 확인하세요.',
    content: '`c = a + b`를 실행하면 우변(a + b)이 먼저 계산된 후 좌변의 변수 c에 저장됩니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '변수 정의를 코드로 작성하는 질문입니다.',
    content: '질문: "Python에서 두 값의 합을 새로운 변수 c에 할당하는 대입문은 어떻게 작성하나요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. a와 b를 더한다 (a + b).\n2. 더한 결과를 변수 c에 대입한다 (c = a + b).\n3. c를 반환한다 (return c).`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'c = a + b',
      'return c',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '변수 할당은 `c = a + b` 문법을 사용합니다. `def compute_sum(a, b): c = a + b; return c` 로 작성하면 두 입력의 합을 계산하여 반환할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_SWAP_04_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 교환(Swap) 스캔',
    description: '두 화물 상자(box_a, box_b)의 위치를 맞바꾸는 작업에 주목하세요.',
    content: 'box_a의 내용물과 box_b의 내용물을 서로 맞바꿔서 [box_b, box_a] 형태로 반환해야 합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 임시 변수 / 튜플 스왑 렌즈',
    description: '덮어쓰기 전에 값을 보관하거나 동시 대입하는 원리를 확인하세요.',
    content: '• 방법 A (임시 변수): temp = box_a; box_a = box_b; box_b = temp\n• 방법 B (동시 교환): box_a, box_b = box_b, box_a',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '두 변수의 값을 안전하게 교환하는 질문입니다.',
    content: '질문: "Python에서 두 변수의 값을 한 번에 맞바꾸려면 `box_a, box_b = box_b, box_a` 문법을 어떻게 쓸 수 있을까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. box_a와 box_b의 값을 맞바꾼다 (box_a, box_b = box_b, box_a).\n2. 교환된 결과를 리스트 [box_a, box_b]로 묶어 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'box_a, box_b = box_b, box_a',
      'return [box_a, box_b]',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: 'Python의 다중 대입(Tuple Swap)을 사용하면 임시 변수 없이도 안전하게 두 값을 바꿀 수 있습니다. `def swap_cargo(box_a, box_b): box_a, box_b = box_b, box_a; return [box_a, box_b]` 처럼 작성합니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_WHILE_07_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 종료 조건 스캔',
    description: '안전 구역(safe_zone)을 넘지 않고 멈추는 조건에 주목하세요.',
    content: '로버가 한 걸음 더 갔을 때(current_pos + stride) 안전선(safe_zone) 이하인 동안에만 전진해야 합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 조건부 반복(while) 렌즈',
    description: 'while문의 조건 평가와 전진 동작을 확인하세요.',
    content: '`while current_pos + stride <= safe_zone:` 조건을 검사하여, 다음 걸음이 안전할 때만 `current_pos = current_pos + stride`를 실행합니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '안전선 직전 정지 조건을 작성하는 질문입니다.',
    content: '질문: "다음 위치(current_pos + stride)가 safe_zone을 넘지 않아야(<=) 전진할 수 있는 while 조건을 어떻게 작성할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. while current_pos + stride <= safe_zone: 조건으로 전진 가능 여부를 확인한다.\n2. 가능하면 current_pos = current_pos + stride 로 전진한다.\n3. 더 이상 안전하게 전진할 수 없으면 루프를 종료하고 current_pos를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'while current_pos + stride <= safe_zone:',
      '    current_pos = current_pos + stride',
      'return current_pos',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '정해지지 않은 횟수의 안전 전진은 while문을 사용합니다. `def advance_safe(current_pos, stride, safe_zone): while current_pos + stride <= safe_zone: current_pos += stride; return current_pos` 로 작성합니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_EQUIV_09_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 연산 동치성 스캔',
    description: '분배법칙: (a + b) * c 와 a * c + b * c 가 같음을 확인하세요.',
    content: '두 묶음 a와 b를 먼저 더한 뒤 배율 c를 곱하는 코드를 작성하세요. 괄호의 우선순위에 주목합니다.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 괄호 연산자 우선순위 렌즈',
    description: '덧셈을 먼저 수행하기 위한 괄호 사용법을 확인하세요.',
    content: '`a + b * c`는 곱셈이 먼저 계산됩니다. 덧셈을 먼저 하려면 반드시 `(a + b) * c` 처럼 괄호를 씌워야 합니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '수식을 코드로 작성하는 질문입니다.',
    content: '질문: "Python에서 (a + b)를 먼저 계산한 후 c를 곱하여 결과를 반환하는 식은 어떻게 작성할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. a와 b를 괄호로 묶어 더한다 ((a + b)).\n2. 그 합에 c를 곱한다 ((a + b) * c).\n3. 계산 결과를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'return (a + b) * c',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '연산자 우선순위를 제어할 때는 괄호를 사용합니다. `def calculate_equivalent(a, b, c): return (a + b) * c` 처럼 작성하면 올바른 결과를 반환합니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_EXP_REVERSE_10_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 역추론 규칙 스캔',
    description: '입력과 출력 데이터 사이의 수학적 규칙을 찾아보세요.',
    content: '입력값 level이 1, 2, 3일 때 출력이 5, 8, 11로 증가하는 패턴(기울기 3, 기본값 2)을 분석하세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 일차함수(ax + b) 렌즈',
    description: '증가량과 시작값을 확인하세요.',
    content: '• level이 1 증가할 때마다 출력이 3씩 증가합니다 ➔ multiplier = 3\n• level=0 일 때의 시작값 ➔ base = 2\n• 최종 공식: level * 3 + 2',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '발견한 규칙을 코드로 표현하는 질문입니다.',
    content: '질문: "level에 배율(3)을 곱하고 기본값(2)을 더하는 공식을 return 문에 어떻게 작성할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]\n1. level * 3 으로 증가분을 계산한다.\n2. 기본값 2를 더한다 (level * 3 + 2).\n3. 계산 결과를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      'return level * 3 + 2',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '숨겨진 규칙은 `level * 3 + 2` 일차식입니다. `def deduce_energy(level): return level * 3 + 2` 로 작성하면 모든 레벨에 대한 에너지를 정확히 산출할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

function generateDynamicScaffold(problemId) {
  const kernel = getPublicKernel(problemId)
  if (!kernel) {
    return {
      S1: { level: 1, title: 'S1 · 조건 스캔', description: '문제의 핵심 단어에 주목하세요.', content: '문제의 입력 조건과 요구 결과를 확인해 보세요.', source: 'hint', answerExposure: 'none' },
      S2: { level: 2, title: 'S2 · 실험 렌즈', description: '대화형 실험실의 규칙을 확인하세요.', content: '실험실에서 확인한 입력과 출력 사이의 전이 규칙을 코드로 표현해 보세요.', source: 'hint', answerExposure: 'partial' },
      S3: { level: 3, title: 'S3 · 방향 질문', description: '생각을 구체화하는 질문입니다.', content: '질문: "목표 결과를 도출하기 위해 필요한 문법이나 연산자는 무엇일까요?"', source: 'hint', answerExposure: 'partial' },
      S4: { level: 4, title: 'S4 · 항로 절차 카드', description: '단계별 논리 흐름을 확인하세요.', content: '[절차 카드]\n1. 입력 변수 확인\n2. 규칙에 따른 상태 갱신\n3. return 문으로 반환', source: 'hint', answerExposure: 'partial' },
      S5: { level: 5, title: 'S5 · 부분 절차 배열', description: '필요한 절차 블록을 확인하세요.', parsonsBlocks: ['입력 변수를 확인한다.', '규칙에 따라 연산한다.', '결과를 반환한다.'], source: 'parsons', answerExposure: 'partial' },
      RESCUE: { level: 6, title: 'Rescue · 해설', description: '완전한 정답을 단계별로 탐구합니다.', solutionExplanation: '대화형 실험실에서 발견한 규칙을 바탕으로 함수 본문을 구성하세요.', source: 'solution-review', answerExposure: 'full' },
    }
  }

  const title = kernel.identity?.studentTitle || '탐사 미션'
  const subtitle = kernel.identity?.subtitle || '규칙을 파악하여 코드로 완성하세요.'
  const explore = kernel.modes?.explore || {}
  const lensConfig = explore.lensConfig || {}
  const intro = lensConfig.introContext || {}
  const ruleStatement = lensConfig.ruleStatement || explore.ruleStatement || subtitle
  const entryFunction = kernel.modes?.code?.entryFunction || 'solve'
  const variables = intro.variables || []
  const varDesc = variables.length > 0 ? variables.map((v) => `${v.name} (${v.label || v.value})`).join(', ') : ''

  const s1Content = intro.description
    ? `🎯 목표: ${subtitle}\n\n📋 상황 안내:\n${intro.description}${varDesc ? `\n\n📌 주요 변수: ${varDesc}` : ''}`
    : `🎯 [${title}]의 핵심 목표:\n${subtitle}${varDesc ? `\n\n📌 주요 변수: ${varDesc}` : ''}`

  const frames = lensConfig.frames || explore.frames || []
  let s2Content = ''
  if (intro.guidance) {
    s2Content = `🔍 대화형 실험실 가이드:\n${intro.guidance}`
  } else if (frames.length > 0) {
    const frameSummaries = frames.map((f, i) => `• 단계 ${i + 1} (${f.stepTitle || f.operationLabel || ''}): ${f.prompt || f.codeSnippet || ''}`)
    s2Content = `🔍 단계별 상태 변화:\n${frameSummaries.join('\n')}`
  } else {
    s2Content = `🔍 실험실 관찰:\n입력 상태가 각 연산을 거칠 때 어떻게 변화하는지 확인해 보세요.`
  }

  const s3Content = lensConfig.discoveryQuestion?.prompt || explore.predictionPrompt || lensConfig.predictionPrompt
    ? `질문: "${lensConfig.discoveryQuestion?.prompt || explore.predictionPrompt || lensConfig.predictionPrompt}"`
    : `질문: "입력값이 들어왔을 때, 어떤 연산자나 문법(if, for, while, 연산식)을 적용해야 목표 결과(${ruleStatement})에 도달할까요?"`

  const frameSteps = frames.map((f, idx) => `${idx + 1}. ${f.stepTitle || f.operationLabel || `단계 ${idx + 1}`}: ${f.prompt || f.codeSnippet || ''}`)
  const s4Content = frameSteps.length > 0
    ? `[절차 카드]\n${frameSteps.join('\n')}\n${frameSteps.length + 1}. 최종 결과를 return 문으로 반환한다.`
    : `[절차 카드]\n1. 함수 '${entryFunction}'의 매개변수를 확인한다.\n2. 규칙(${ruleStatement})에 따라 계산 또는 조건 검사를 수행한다.\n3. 계산된 최종 상태를 return 문으로 반환한다.`

  const parsonsBlocks = frames.length > 0
    ? frames.map((f) => f.codeSnippet || f.operationLabel || f.stepTitle).filter(Boolean)
    : [
        `def ${entryFunction}(...):`,
        `    # ${ruleStatement}`,
        `    return 결과`,
      ]

  const rescueExplanation = `💡 [${title}]의 핵심 규칙:\n${ruleStatement}\n\n함수 '${entryFunction}'을 작성할 때 전달된 입력값을 활용하여 위 규칙을 코드로 조립하고 return으로 반환해야 합니다.`

  return {
    S1: {
      level: 1,
      title: `S1 · 조건 스캔 (${title})`,
      description: '문제에서 가장 중요한 단어와 목표에 주목해 보세요.',
      content: s1Content,
      source: 'hint',
      answerExposure: 'none',
    },
    S2: {
      level: 2,
      title: `S2 · 상태 전이 렌즈`,
      description: '대화형 실험실에서 발견한 동작 패턴을 확인하세요.',
      content: s2Content,
      source: 'hint',
      answerExposure: 'partial',
    },
    S3: {
      level: 3,
      title: 'S3 · 방향 유도 질문',
      description: '생각을 구체화하는 질문입니다.',
      content: s3Content,
      source: 'hint',
      answerExposure: 'partial',
    },
    S4: {
      level: 4,
      title: 'S4 · 항로 절차 카드',
      description: '단계별 논리 흐름을 확인하세요.',
      content: s4Content,
      source: 'hint',
      answerExposure: 'partial',
    },
    S5: {
      level: 5,
      title: 'S5 · 부분 절차 배열 (Parsons)',
      description: '필요한 절차 블록을 순서대로 확인해 보세요.',
      parsonsBlocks,
      source: 'parsons',
      answerExposure: 'partial',
    },
    RESCUE: {
      level: 6,
      title: 'Rescue · 해설 및 복구 연구실',
      description: '핵심 규칙과 Python 구현 원리를 확인합니다.',
      solutionExplanation: rescueExplanation,
      source: 'solution-review',
      answerExposure: 'full',
    },
  }
}

export function getScaffoldByLevel(level, problemId = 'AC-COND-001') {
  let catalog = null
  if (problemId === 'AC-COND-001') catalog = AC_COND_001_SCAFFOLD_CONTENT
  else if (problemId === 'AC-COND-002') catalog = AC_COND_002_SCAFFOLD_CONTENT
  else if (problemId === 'AC-PAT-003') catalog = AC_PAT_003_SCAFFOLD_CONTENT
  else if (problemId === 'AC-PAT-004') catalog = AC_PAT_004_SCAFFOLD_CONTENT
  else if (problemId === 'AC-SEQ-005') catalog = AC_SEQ_005_SCAFFOLD_CONTENT
  else if (problemId === 'AC-NAV-005') catalog = AC_NAV_005_SCAFFOLD_CONTENT
  else if (problemId === 'AC-NAV-006') catalog = AC_NAV_006_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-SEQ-01') catalog = AC_EXP_SEQ_01_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-VAR-02') catalog = AC_EXP_VAR_02_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-STEP-03') catalog = AC_EXP_STEP_03_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-SWAP-04') catalog = AC_EXP_SWAP_04_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-BOUND-05') catalog = AC_EXP_BOUND_05_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-LOOP-06') catalog = AC_EXP_LOOP_06_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-WHILE-07') catalog = AC_EXP_WHILE_07_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-EQUIV-09') catalog = AC_EXP_EQUIV_09_SCAFFOLD_CONTENT
  else if (problemId === 'AC-EXP-REVERSE-10') catalog = AC_EXP_REVERSE_10_SCAFFOLD_CONTENT
  else catalog = generateDynamicScaffold(problemId)

  switch (level) {
    case 1: return catalog.S1
    case 2: return catalog.S2
    case 3: return catalog.S3
    case 4: return catalog.S4
    case 5: return catalog.S5
    case 6: return catalog.RESCUE
    default: return null
  }
}
