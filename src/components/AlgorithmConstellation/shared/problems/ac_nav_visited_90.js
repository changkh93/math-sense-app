import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_NAV_VISITED_90 = createCapabilityPrototypeKernel({
  problemId: 'AC-NAV-VISITED-90',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 90,
    constellationId: 'constellation-8',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EN',
    prerequisites: ['AC-NAV-006', 'AC-GRAPH-REACH-88', 'AC-CODE-FIRST-ERROR-01'],
  },
  identity: {
    studentTitle: 'visited를 너무 늦게 표시한 로봇',
    subtitle: '큐에서 꺼낼 때 방문 표시하여 중복 예약이 발생하는 버그 코드를 수리하세요. 방문 순서와 큐에 원소를 넣은 총 횟수(start 최초 삽입 포함)를 [visit_order, enqueue_count] 형태로 반환해야 합니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'builtin:set'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:bfs-shortest-path'],
    introduces: ['pattern:mark-when-enqueued'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'container-membership'],
    requiredClaims: ['MARK_WHEN_ENQUEUED_REPAIR'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '다이아몬드 형태 그래프(합류 경로 존재)에서 방문 표시(visited.add)를 큐에 넣을 때(append) 하지 않고 꺼낼 때(popleft) 하면 어떤 비효율이 생길까요?',
      options: [
        {
          value: 'duplicate_queue',
          label: '합류 지점 정점이 아직 꺼내지지 않은 동안 다른 경로에서 또 큐에 중복 삽입된다',
        },
        {
          value: 'order_reversed',
          label: '방문 순서가 반대로 뒤집힌다',
        },
      ],
      expected: 'duplicate_queue',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⏱️ visited 기록 시점 수리 시뮬레이터',
          description: '0번에서 1과 2로 갈라졌다가 3번에서 다시 만나는 다이아몬드 그래프입니다. 큐에서 꺼낼 때 방문 표시하면 3번이 큐에 두 번 들어갑니다.',
          variables: [
            {
              name: 'network',
              value: '[[1, 2], [0, 3], [0, 3], [1, 2]]',
            },
            {
              name: 'start',
              value: '0',
            },
          ],
          guidance: '큐에 넣는 순간 바로 visited에 추가하면 중복 예약을 막을 수 있습니다.',
        },
        initialState: {
          step: '시작: 0번 큐 삽입 (enqueue_count = 1)',
          queue: [0],
          visited: [0],
          order: [],
          enqueueCount: 1,
        },
        initialStateLabel: '초기 상태: 올바른 등록',
        initialStepTitle: '탐색 진행',
        initialPrompt: '0번을 큐와 visited에 등록하고 시작합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 처리: 1과 2 즉시 방문 표시 후 큐 삽입',
            operationLabel: '즉시 방문 표시',
            prompt: '1과 2를 큐에 넣으면서 즉시 visited에 추가 (enqueue_count = 3).',
            stateAfter: {
              step: '0번 처리',
              queue: [1, 2],
              visited: [0, 1, 2],
              order: [0],
              enqueueCount: 3,
            },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 처리: 3번 즉시 방문 표시 후 큐 삽입',
            operationLabel: '3번 중복 예약 방지',
            prompt: '1번을 꺼내고 이웃 3을 visited에 추가하며 큐에 삽입 (enqueue_count = 4).',
            stateAfter: {
              step: '1번 처리',
              queue: [2, 3],
              visited: [0, 1, 2, 3],
              order: [0, 1],
              enqueueCount: 4,
            },
            choicePrompt: '다음으로 2번을 꺼냈을 때, 3번이 이미 visited에 있으므로 큐에 다시 들어갈까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '들어가지 않는다 (중복 차단 성공, count 유지)',
                feedback: '맞아요. 넣는 순간 표시했기 때문에 3번이 중복 삽입되지 않아요.',
              },
              {
                id: 'wrong',
                label: '다시 들어간다 (count 5로 증가)',
                feedback: '꺼낼 때 표시하면 다시 들어가지만, 넣을 때 표시하면 차단돼요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ 완료: [order, count] 반환',
            operationLabel: '완료',
            prompt: '최종 [[0, 1, 2, 3], 4]가 반환됩니다.',
            stateAfter: {
              step: '완료',
              queue: [],
              visited: [0, 1, 2, 3],
              order: [0, 1, 2, 3],
              enqueueCount: 4,
            },
          },
        ],
        predictionPrompt: '올바르게 수리하여 [visit_order, enqueue_count]를 반환하세요.',
        rulePrompt: 'Mark-When-Enqueued 수리 규칙',
        ruleStatement: '큐에서 꺼낼 때가 아니라 큐에 넣을 때 visited.add를 수행하여 중복 큐 삽입을 방지한다.',
      },
    },
    code: {
      entryFunction: 'repair_visit_timing',
      starterCode: `from collections import deque

def repair_visit_timing(network, start):
    # 아래 코드는 큐에서 꺼낼 때 visited를 처리하는 버그가 있습니다.
    # 큐에 넣을 때 visited를 처리하도록 수리하여 [visit_order, enqueue_count]를 반환하세요.
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
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          network: [
            [1, 2],
            [0, 3],
            [0, 3],
            [1, 2],
          ],
          start: 0,
        },
        expected: [[0, 1, 2, 3], 4],
      },
      {
        inputs: {
          network: [[1], [0]],
          start: 0,
        },
        expected: [[0, 1], 2],
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
    transferChallenges: [
      {
        transferChallengeId: 'tc_nav_090_transfer_1',
        title: '격자 프론티어 중복 방문 수리',
        description: '격자 grid(0: 통과, 1: 벽)와 시작 위치 start([r, c])가 주어질 때, 연결된 열린 구역을 BFS로 탐색하며 [visited_count, enqueue_count]를 반환하도록 수리하세요. 올바르게 수리하면 두 값이 일치합니다.',
        entryFunction: 'repair_grid_frontier',
        starterCode: `from collections import deque

def repair_grid_frontier(grid, start):
    # 아래 코드는 큐에서 꺼낼 때 visited를 기록해 중복 큐 삽입이 일어납니다.
    # 큐에 넣을 때 visited를 기록하도록 수리하세요.
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
                [0, 0],
                [0, 0],
              ],
              start: [0, 0],
            },
            expected: [4, 4],
          },
          {
            inputs: {
              grid: [[0, 0, 0]],
              start: [0, 0],
            },
            expected: [3, 3],
          },
        ],
      },
    ],
  },
})
