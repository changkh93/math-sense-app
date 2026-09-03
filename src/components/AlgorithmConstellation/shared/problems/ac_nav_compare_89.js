import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_NAV_COMPARE_89 = createCapabilityPrototypeKernel({
  problemId: 'AC-NAV-COMPARE-89',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 89,
    constellationId: 'constellation-8',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EN',
    prerequisites: ['AC-NAV-006', 'AC-GRAPH-REACH-88', 'AC-STACK-BOX-71'],
  },
  identity: {
    studentTitle: 'BFS와 DFS가 다르게 보는 순서',
    subtitle: '인접 목록 network와 시작 기지 start가 주어질 때, BFS 방문 순서와 반복형 DFS 방문 순서를 [bfs_order, dfs_order] 형태로 반환하세요. DFS에서도 첫 이웃을 먼저 방문하도록 스택에는 이웃을 역순으로 넣습니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'builtin:set', 'builtin:list', 'method:pop'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:bfs-shortest-path', 'pattern:graph-reachability', 'pattern:lifo-processing'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'container-membership'],
    requiredClaims: ['BFS_DFS_ORDER_COMPARISON'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '갈림길이 있는 그래프에서 가까운 이웃을 층별로 먼저 확인하는 BFS와 한 경로를 끝까지 먼저 파고드는 DFS의 방문 순서는 같을까요?',
      options: [
        {
          value: 'different',
          label: '다르다 — 도달 가능한 정점 집합은 같아도 방문하는 순서가 달라진다',
        },
        {
          value: 'same',
          label: '항상 동일하다',
        },
      ],
      expected: 'different',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔄 BFS 대 DFS 순회 비교기',
          description: '0번에서 1, 2 갈림길이 있고 1번에 3번이 연결된 트리에서, 큐(FIFO)를 쓰는 BFS와 스택(LIFO)을 쓰는 DFS의 순서를 비교합니다.',
          variables: [
            {
              name: 'network',
              value: '[[1, 2], [3], [], []]',
            },
            {
              name: 'start',
              value: '0',
            },
          ],
          guidance: 'DFS에서 첫 이웃(1번)을 먼저 꺼내려면 스택에 [2, 1] 순서로 역순 push해야 합니다.',
        },
        initialState: {
          step: '시작: 탐색 준비',
          bfsOrder: [],
          dfsOrder: [],
        },
        initialStateLabel: '초기 상태: 탐색 전',
        initialStepTitle: '순서 비교 시작',
        initialPrompt: '같은 그래프에서 BFS와 DFS를 각각 독립적으로 실행합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① BFS 실행 (FIFO 대기열)',
            operationLabel: 'BFS 순서 계산',
            prompt: '거리 1인 [1, 2]를 먼저 보고, 거리 2인 [3]을 보아 [0, 1, 2, 3]이 됩니다.',
            stateAfter: {
              step: 'BFS 완료',
              bfsOrder: [0, 1, 2, 3],
              dfsOrder: [],
            },
          },
          {
            id: 'f1',
            stepTitle: '② DFS 실행 (LIFO 스택)',
            operationLabel: 'DFS 순서 계산',
            prompt: '0번에서 1번을 깊이 파고들어 3번을 먼저 방문하고, 돌아와 2번을 방문하여 [0, 1, 3, 2]가 됩니다.',
            stateAfter: {
              step: 'DFS 완료',
              bfsOrder: [0, 1, 2, 3],
              dfsOrder: [0, 1, 3, 2],
            },
            choicePrompt: '갈림길 트리에서 BFS는 [0, 1, 2, 3]일 때 DFS의 결과는?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '[0, 1, 3, 2] (1의 자식 3을 2보다 먼저 방문)',
                feedback: '맞아요. DFS는 깊이 방향(1 -> 3)을 2보다 먼저 탐색해요.',
              },
              {
                id: 'wrong',
                label: '[0, 1, 2, 3] (BFS와 동일)',
                feedback: '갈림길이 있으면 깊이 우선과 너비 우선의 순서가 달라져요.',
              },
            ],
          },
        ],
        predictionPrompt: '[bfs_order, dfs_order] 형태로 두 탐색의 방문 순서를 반환하세요.',
        rulePrompt: 'BFS vs DFS 규칙',
        ruleStatement: 'BFS는 큐를 사용해 거리 순으로, DFS는 스택(이웃 역순 push)을 사용해 깊이 순으로 순회하여 두 결과를 묶어 반환한다.',
      },
    },
    code: {
      entryFunction: 'compare_search_orders',
      starterCode: `from collections import deque

def compare_search_orders(network, start):
    # [bfs_order, dfs_order]를 반환하세요. DFS는 스택에 이웃을 역순으로 넣습니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          network: [[1, 2], [3], [], []],
          start: 0,
        },
        expected: [
          [0, 1, 2, 3],
          [0, 1, 3, 2],
        ],
      },
      {
        inputs: {
          network: [[1], [2], []],
          start: 0,
        },
        expected: [
          [0, 1, 2],
          [0, 1, 2],
        ],
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_nav_089_1',
        title: 'BFS와 DFS 순서 차이 원리',
        prompt: '자료구조가 만드는 탐색 순서의 차이를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '갈림길에서 BFS와 DFS의 방문 순서가 달라지는 핵심 이유는 무엇일까요?',
            options: [
              { value: 'queue_vs_stack', label: 'BFS는 큐(선입선출)로 층별 탐색하고, DFS는 스택(후입선출)으로 깊이 탐색하기 때문' },
              { value: 'graph_change', label: '그래프의 연결선이 달라지기 때문' },
            ],
            expected: 'queue_vs_stack',
          },
          {
            id: 'q2',
            text: '일직선으로 이어진 선형 그래프(예: 0 -> 1 -> 2)에서는 BFS와 DFS의 방문 순서가 어떨까요?',
            options: [
              { value: 'identical', label: '갈림길이 없으므로 두 탐색의 방문 순서가 동일하다' },
              { value: 'always_different', label: '무조건 반대로 나온다' },
            ],
            expected: 'identical',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_nav_089_transfer_1',
        title: '행성 순찰 경로 비교',
        description: '행성 통신망 network와 출발 행성 start가 주어질 때, 가까운 기지 우선 순찰 경로(BFS)와 한 갈래 깊이 우선 순찰 경로(DFS)를 [bfs_path, dfs_path] 형태로 반환하세요.',
        entryFunction: 'compare_planet_patrols',
        starterCode: `from collections import deque

def compare_planet_patrols(network, start):
    # [bfs_path, dfs_path]를 반환하세요.
    pass
`,
        contextCard: {
          title: '🪐 행성 순찰 전략 비교',
          strategyGuide: 'BFS는 큐로 가까운 행성부터 순찰하고, DFS는 스택(이웃 역순 삽입)으로 깊이 방향 행성부터 순찰합니다.',
        },
        thoughtCheck: {
          question: '시작 행성에 연결된 이웃이 없는 외딴 행성(start)이라면 반환 결과는?',
          options: [
            { value: 'single', label: '[[start], [start]]' },
            { value: 'empty', label: '[[], []]' },
          ],
          expected: 'single',
        },
        testCases: [
          {
            inputs: {
              network: [[1, 2], [0], [0]],
              start: 0,
            },
            expected: [
              [0, 1, 2],
              [0, 1, 2],
            ],
          },
          {
            inputs: {
              network: [[1, 2], [0, 3], [0], [1]],
              start: 0,
            },
            expected: [
              [0, 1, 2, 3],
              [0, 1, 3, 2],
            ],
          },
        ],
      },
    ],
  },
})
