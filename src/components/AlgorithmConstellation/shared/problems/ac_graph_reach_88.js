import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRAPH_REACH_88 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRAPH-REACH-88',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 88,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-GRAPH-ADJ-87', 'AC-NAV-005'],
  },
  identity: {
    studentTitle: '통신 가능한 기지 찾기',
    subtitle: '인접 목록 network와 시작 기지 start가 주어질 때, BFS로 처음 방문하는 순서대로 도달 가능한 모든 기지 번호 목록을 반환하세요. 이웃은 network에 기록된 순서대로 탐색합니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'builtin:set'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:adjacency-list', 'pattern:fifo-processing'],
    introduces: ['pattern:graph-reachability'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'container-membership'],
    requiredClaims: ['GRAPH_BFS_REACHABILITY'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '네트워크에 순환(사이클)이 존재할 때 무한 반복에 빠지지 않고 모든 기지를 한 번씩만 탐색하기 위해 필요한 것은?',
      options: [
        {
          value: 'visited_set',
          label: '이미 예약/방문한 기지를 기록하는 visited 집합',
        },
        {
          value: 'step_counter',
          label: '단순한 스텝 카운터 변수',
        },
      ],
      expected: 'visited_set',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🛰️ 그래프 BFS 도달성 탐색기',
          description: '시작 정점을 큐와 visited에 등록하고, 큐에서 하나씩 꺼내며 인접한 미방문 이웃들을 순서대로 큐에 추가합니다.',
          variables: [
            {
              name: 'network',
              value: '[[1, 2], [0, 3], [0], [1]]',
            },
            {
              name: 'start',
              value: '0',
            },
          ],
          guidance: '0번 기지에서 출발해 연결된 모든 기지를 차례로 방문하는 순서를 확인하세요.',
        },
        initialState: {
          step: '시작: start = 0 등록',
          queue: [0],
          visited: [0],
          order: [],
        },
        initialStateLabel: '초기 상태: 큐에 [0]',
        initialStepTitle: 'BFS 순회 시작',
        initialPrompt: '시작점 0을 큐와 visited에 넣고 탐색을 시작합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 꺼내기 -> 이웃 1, 2 예약',
            operationLabel: '큐 팝 및 이웃 탐색',
            prompt: '0번 처리: order에 0 추가. 이웃 [1, 2]를 큐와 visited에 등록.',
            stateAfter: {
              step: '0번 처리',
              queue: [1, 2],
              visited: [0, 1, 2],
              order: [0],
            },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 꺼내기 -> 이웃 3 예약',
            operationLabel: '큐 팝 및 이웃 탐색',
            prompt: '1번 처리: order에 1 추가. 이웃 중 0은 이미 방문, 3을 큐에 등록.',
            stateAfter: {
              step: '1번 처리',
              queue: [2, 3],
              visited: [0, 1, 2, 3],
              order: [0, 1],
            },
            choicePrompt: '다음으로 큐에서 나오는 정점은 2번입니다. 2번의 이웃 [0]은 이미 방문했으므로 order는?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '[0, 1, 2] (2번이 추가되고 새 이웃은 없음)',
                feedback: '맞아요. 2번의 이웃 0은 이미 visited에 있으므로 큐에 넣지 않아요.',
              },
              {
                id: 'wrong',
                label: '[0, 1, 2, 0] (0번을 다시 방문)',
                feedback: '이미 방문한 정점은 다시 방문하지 않아요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 및 3번 처리 -> 완료',
            operationLabel: '완료',
            prompt: '2번과 3번이 순서대로 나와 최종 [0, 1, 2, 3] 순서가 완성되었습니다.',
            stateAfter: {
              step: '완료',
              queue: [],
              visited: [0, 1, 2, 3],
              order: [0, 1, 2, 3],
            },
          },
        ],
        predictionPrompt: 'start부터 BFS로 도달 가능한 모든 기지 번호를 방문 순서대로 반환하세요.',
        rulePrompt: '그래프 BFS 탐색 규칙',
        ruleStatement: 'start를 큐와 visited에 넣고, 큐에서 꺼낸 정점의 미방문 이웃들을 순서대로 큐와 visited에 추가하며 order를 기록한다.',
      },
    },
    code: {
      entryFunction: 'reachable_stations',
      starterCode: `from collections import deque

def reachable_stations(network, start):
    # network의 start에서 출발해 BFS로 도달 가능한 기지 번호 목록을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          network: [[1, 2], [0, 3], [0], [1]],
          start: 0,
        },
        expected: [0, 1, 2, 3],
      },
      {
        inputs: {
          network: [[], []],
          start: 0,
        },
        expected: [0],
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_graph_088_1',
        title: '그래프 도달성과 BFS 순서 원리',
        prompt: '그래프 탐색 순서와 분리된 그래프의 처리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '어떤 기지가 start와 전혀 연결되어 있지 않다면 그 기지는 반환 결과에 포함될까요?',
            options: [
              { value: 'no', label: '아니다 — 도달 가능한 기지만 결과에 포함된다' },
              { value: 'yes', label: '맞다 — 전체 기지가 모두 포함된다' },
            ],
            expected: 'no',
          },
          {
            id: 'q2',
            text: 'BFS 탐색 결과에서 방문 순서가 결정되는 기준은 무엇일까요?',
            options: [
              { value: 'distance_and_list_order', label: '시작점으로부터의 거리 순서 및 인접 목록에 적힌 이웃 순서' },
              { value: 'node_number_sorted', label: '기지 번호의 오름차순' },
            ],
            expected: 'distance_and_list_order',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_graph_088_transfer_1',
        title: '통신 가능한 모듈 수 세기',
        description: '우주선의 모듈 연결망 connections(인접 목록)과 시작 모듈 start가 주어질 때, start에서 통신 신호가 도달할 수 있는 총 모듈 수(시작 모듈 포함)를 반환하세요.',
        entryFunction: 'reachable_modules',
        starterCode: `from collections import deque

def reachable_modules(connections, start):
    # 도달 가능한 모듈의 총 개수(정수)를 반환하세요.
    pass
`,
        contextCard: {
          title: '🛰️ 통신 가능 모듈 개수 계산',
          strategyGuide: 'BFS로 연결된 모든 모듈을 탐색한 뒤, 방문한 총 모듈 수(정수)를 반환합니다.',
        },
        thoughtCheck: {
          question: '시작 모듈 start에 연결된 다른 모듈이 하나도 없다면 반환해야 하는 개수는?',
          options: [
            { value: 'one', label: '1 (시작 모듈 자신 1개)' },
            { value: 'zero', label: '0' },
          ],
          expected: 'one',
        },
        testCases: [
          {
            inputs: {
              connections: [[1], [0, 2], [1], []],
              start: 0,
            },
            expected: 3,
          },
          {
            inputs: {
              connections: [[], [2], [1]],
              start: 0,
            },
            expected: 1,
          },
        ],
      },
    ],
  },
})
