/**
 * Scaffold Graph Specification
 * Multi-tier educational support levels with fading rules (S0 ~ S5 + Rescue).
 */

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

export function getScaffoldByLevel(level, problemId = 'AC-COND-001') {
  let catalog = AC_COND_001_SCAFFOLD_CONTENT
  if (problemId === 'AC-PAT-003') catalog = AC_PAT_003_SCAFFOLD_CONTENT
  else if (problemId === 'AC-COND-002') catalog = AC_COND_002_SCAFFOLD_CONTENT
  else if (problemId === 'AC-PAT-004') catalog = AC_PAT_004_SCAFFOLD_CONTENT
  else if (problemId === 'AC-SEQ-005') catalog = AC_SEQ_005_SCAFFOLD_CONTENT
  else if (problemId === 'AC-NAV-005') catalog = AC_NAV_005_SCAFFOLD_CONTENT
  else if (problemId === 'AC-NAV-006') catalog = AC_NAV_006_SCAFFOLD_CONTENT

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
