/** Server-only definition: AC-NAV-VISITED-90. */
module.exports = {
  problemId: 'AC-NAV-VISITED-90',
  problemVersion: 1,
  entryFunction: 'repair_visit_timing',
  starterCode: `from collections import deque

def repair_visit_timing(network, start):
    queue = deque([start])
    visited = set()
    order = []
    enqueue_count = 1
    while len(queue) > 0:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            order.append(node)
            for nb in network[node]:
                if nb not in visited:
                    queue.append(nb)
                    enqueue_count = enqueue_count + 1
    return [order, enqueue_count]
`,
  officialSolutionCode: `from collections import deque

def repair_visit_timing(network, start):
    queue = deque([start])
    visited = {start}
    order = []
    enqueue_count = 1
    while len(queue) > 0:
        node = queue.popleft()
        order.append(node)
        for nb in network[node]:
            if nb not in visited:
                visited.add(nb)
                queue.append(nb)
                enqueue_count = enqueue_count + 1
    return [order, enqueue_count]
`,
  alternativeSolutions: [
    `from collections import deque

def repair_visit_timing(network, start):
    q = deque()
    q.append(start)
    seen = set([start])
    visited_order = []
    enqueued = 1
    while len(q) > 0:
        u = q.popleft()
        visited_order.append(u)
        for v in network[u]:
            if v not in seen:
                seen.add(v)
                q.append(v)
                enqueued += 1
    return [visited_order, enqueued]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'TIMING-LEAVES-BUGGY-STARTER',
      expectedFailingGroup: 'diamond_confluence',
      code: `from collections import deque

def repair_visit_timing(network, start):
    queue = deque([start])
    visited = set()
    order = []
    enqueue_count = 1
    while len(queue) > 0:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            order.append(node)
            for nb in network[node]:
                if nb not in visited:
                    queue.append(nb)
                    enqueue_count = enqueue_count + 1
    return [order, enqueue_count]
`,
    },
    {
      id: 'TIMING-NO-VISITED',
      expectedFailingGroup: 'diamond_confluence',
      code: `from collections import deque

def repair_visit_timing(network, start):
    queue = deque([start])
    order = []
    enqueue_count = 1
    while len(queue) > 0 and len(order) < 10:
        node = queue.popleft()
        order.append(node)
        for nb in network[node]:
            queue.append(nb)
            enqueue_count = enqueue_count + 1
    return [order, enqueue_count]
`,
    },
    {
      id: 'TIMING-OMITS-START-ENQUEUE',
      expectedFailingGroup: 'start_count',
      code: `from collections import deque

def repair_visit_timing(network, start):
    queue = deque([start])
    visited = {start}
    order = []
    enqueue_count = 0
    while len(queue) > 0:
        node = queue.popleft()
        order.append(node)
        for nb in network[node]:
            if nb not in visited:
                visited.add(nb)
                queue.append(nb)
                enqueue_count = enqueue_count + 1
    return [order, enqueue_count]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        network: [
          [1, 2],
          [0, 3],
          [0, 3],
          [1, 2, 4],
          [3],
        ],
        start: 0,
      },
      expected: [[0, 1, 2, 3, 4], 5],
      group: 'diamond_confluence',
    },
    {
      inputs: {
        network: [[]],
        start: 0,
      },
      expected: [[0], 1],
      group: 'start_count',
    },
    {
      inputs: {
        network: [[1, 2], [0], [0]],
        start: 0,
      },
      expected: [[0, 1, 2], 3],
      group: 'start_count',
    },
    {
      inputs: {
        network: [[1, 2], [3], [3], []],
        start: 0,
      },
      expected: [[0, 1, 2, 3], 4],
      group: 'diamond_confluence',
    },
    {
      inputs: {
        network: [[1], [2], []],
        start: 0,
      },
      expected: [[0, 1, 2], 3],
      group: 'start_count',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_nav_090_1',
      title: 'visited 기록 시점의 중요성',
      prompt: '큐 삽입 시점과 추출 시점의 차이를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '단순한 트리 구조(합류 경로 없음)에서는 visited를 꺼낼 때 기록해도 enqueue_count에 차이가 생기지 않는 이유는?',
          options: [
            { value: 'single_path', label: '모든 정점으로 향하는 경로가 오직 하나뿐이어서 중복 발견될 일이 없기 때문' },
            { value: 'tree_special', label: '트리는 큐를 쓰지 않기 때문' },
          ],
          expected: 'single_path',
        },
        {
          id: 'q2',
          text: '다이아몬드 그래프에서 늦게 기록한 버그 코드가 count 5를 반환하는 구체적인 원인은?',
          options: [
            { value: 'join_node_twice', label: '합류점 3번이 1번과 2번 두 경로에서 각각 큐에 들어가기 때문' },
            { value: 'start_node_twice', label: '0번이 두 번 들어가기 때문' },
          ],
          expected: 'join_node_twice',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_nav_090_transfer_1',
      title: '격자 프론티어 중복 방문 수리',
      description: '격자 grid(0: 통과, 1: 벽)와 시작 위치 start([r, c])가 주어질 때, 연결된 열린 구역을 BFS로 탐색하며 [visited_count, enqueue_count]를 반환하도록 수리하세요. 올바르게 수리하면 두 값이 일치합니다.',
      entryFunction: 'repair_grid_frontier',
      starterCode: `from collections import deque

def repair_grid_frontier(grid, start):
    r0 = start[0]
    c0 = start[1]
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = set()
    enqueue_count = 1
    while len(queue) > 0:
        r, c = queue.popleft()
        if (r, c) not in visited:
            visited.add((r, c))
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr = r + dr
                nc = c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                    if (nr, nc) not in visited:
                        queue.append((nr, nc))
                        enqueue_count = enqueue_count + 1
    return [len(visited), enqueue_count]
`,
      officialSolutionCode: `from collections import deque

def repair_grid_frontier(grid, start):
    r0 = start[0]
    c0 = start[1]
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = {(r0, c0)}
    enqueue_count = 1
    while len(queue) > 0:
        r, c = queue.popleft()
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))
                    enqueue_count = enqueue_count + 1
    return [len(visited), enqueue_count]
`,
      contextCard: {
        title: '🌐 격자 프론티어 수리',
        strategyGuide: 'start를 변수로 추출해 넣는 순간 visited에 추가하고, 이웃을 큐에 append할 때 즉시 visited.add하여 중복 예약을 차단합니다.',
      },
      thoughtCheck: {
        question: '2x2 열린 격자에서 올바르게 수리된 코드의 [visited_count, enqueue_count]는?',
        options: [
          { value: 'equal', label: '[4, 4] (두 값이 일치)' },
          { value: 'greater', label: '[4, 6] (중복 삽입 발생)' },
        ],
        expected: 'equal',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [0, 0, 0],
              [0, 0, 0],
            ],
            start: [0, 0],
          },
          expected: [6, 6],
        },
        {
          inputs: {
            grid: [
              [0, 1, 0],
              [0, 0, 0],
            ],
            start: [0, 0],
          },
          expected: [5, 5],
        },
        {
          inputs: {
            grid: [[0]],
            start: [0, 0],
          },
          expected: [1, 1],
        },
      ],
    },
  ],
}
