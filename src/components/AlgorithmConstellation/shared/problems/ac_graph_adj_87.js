import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRAPH_ADJ_87 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRAPH-ADJ-87',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 87,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-GRID-NEIGHBOR-81', 'AC-SEQ-RUNNING-35'],
  },
  identity: {
    studentTitle: '친구 기지 연결표',
    subtitle: '기지 개수 node_count와 무방향 연결 목록 links([[u, v], ...])가 주어질 때, 각 기지별 이웃 번호들을 담은 길이 node_count의 인접 목록을 구성하여 반환하세요.',
  },
  pythonConcepts: {
    requires: ['syntax:sequence-unpacking', 'statement:for', 'method:append'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:four-neighbor-enumeration'],
    introduces: ['pattern:adjacency-list'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'container-scan'],
    requiredClaims: ['ADJACENCY_LIST_CONSTRUCTION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '무방향 그래프에서 기지 A와 B 사이에 통신선이 연결될 때([A, B]), 인접 목록에는 어떻게 기록해야 할까요?',
      options: [
        {
          value: 'both',
          label: 'A의 이웃 목록에 B를 추가하고, B의 이웃 목록에도 A를 추가한다',
        },
        {
          value: 'one_side',
          label: 'A의 목록에만 B를 추가한다',
        },
      ],
      expected: 'both',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔗 인접 목록 그래프 구성기',
          description: '정점 수만큼의 빈 목록을 먼저 만든 뒤, 주어진 양방향 연결선을 하나씩 읽어 양쪽 정점의 목록에 상대방 정점을 추가합니다.',
          variables: [
            {
              name: 'node_count',
              value: '4',
            },
            {
              name: 'links',
              value: '[[0, 1], [0, 2], [2, 3]]',
            },
          ],
          guidance: '아무 연결도 없는 외딴 기지도 크기 유지를 위해 빈 목록([])을 유지해야 합니다.',
        },
        initialState: {
          step: '시작: 빈 목록 4개 준비',
          currentLink: null,
          network: [[], [], [], []],
        },
        initialStateLabel: '초기 상태: 4개의 빈 목록',
        initialStepTitle: '연결선 등록 시작',
        initialPrompt: '정점 0, 1, 2, 3을 위한 빈 목록을 준비합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① [0, 1] 연결',
            operationLabel: '양방향 추가',
            prompt: '0번에 1 추가, 1번에 0 추가.',
            stateAfter: {
              step: '[0, 1] 처리',
              currentLink: [0, 1],
              network: [[1], [0], [], []],
            },
          },
          {
            id: 'f1',
            stepTitle: '② [0, 2] 연결',
            operationLabel: '양방향 추가',
            prompt: '0번에 2 추가, 2번에 0 추가.',
            stateAfter: {
              step: '[0, 2] 처리',
              currentLink: [0, 2],
              network: [[1, 2], [0], [0], []],
            },
            choicePrompt: '마지막으로 [2, 3]을 추가하면 2번 기지의 이웃 목록은 어떻게 될까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '[0, 3] (0과 3이 순서대로 연결됨)',
                feedback: '맞아요. 기존 이웃 0 뒤에 새 이웃 3이 추가돼요.',
              },
              {
                id: 'wrong',
                label: '[3] (이전 이웃이 덮어써짐)',
                feedback: '이웃 목록은 추가(append)되므로 이전 연결이 사라지지 않아요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ [2, 3] 연결 -> 완료',
            operationLabel: '양방향 추가 완료',
            prompt: '2번에 3, 3번에 2가 추가되어 최종 [[1, 2], [0], [0, 3], [2]]가 완성되었습니다.',
            stateAfter: {
              step: '완료',
              currentLink: [2, 3],
              network: [[1, 2], [0], [0, 3], [2]],
            },
          },
        ],
        predictionPrompt: 'node_count 길이의 인접 목록을 구성하여 반환하세요.',
        rulePrompt: '인접 목록 구성 규칙',
        ruleStatement: 'node_count개의 빈 목록을 생성하고 각 [u, v]마다 network[u].append(v)와 network[v].append(u)를 수행한다.',
      },
    },
    code: {
      entryFunction: 'build_network',
      starterCode: `def build_network(node_count, links):
    # node_count개의 빈 목록을 준비하고, links의 연결을 양방향으로 기록하여 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          node_count: 4,
          links: [
            [0, 1],
            [0, 2],
            [2, 3],
          ],
        },
        expected: [[1, 2], [0], [0, 3], [2]],
      },
      {
        inputs: {
          node_count: 3,
          links: [],
        },
        expected: [[], [], []],
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_graph_087_1',
        title: '인접 목록의 양방향성과 구조 이해',
        prompt: '인접 목록 표현의 핵심 규칙을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '연결선이 하나도 없는 고립된 기지의 경우 인접 목록에서 어떤 값을 가져야 할까요?',
            options: [
              { value: 'empty_list', label: '빈 목록([])을 가져야 전체 기지 번호 순서가 유지된다' },
              { value: 'omit', label: '인접 목록에서 아예 생략한다' },
            ],
            expected: 'empty_list',
          },
          {
            id: 'q2',
            text: '무방향 연결 [u, v]가 주어졌을 때 u 쪽에만 v를 기록하면 어떤 문제가 발생할까요?',
            options: [
              { value: 'one_way', label: 'v에서 u로 되돌아가는 연결을 탐색할 수 없게 된다' },
              { value: 'no_problem', label: '아무 문제도 생기지 않는다' },
            ],
            expected: 'one_way',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_graph_087_transfer_1',
        title: '학생 친구 관계망 구성하기',
        description: '학생 수 student_count와 서로 친구 관계인 쌍 friendships([[a, b], ...])가 주어질 때, 각 학생 번호(0부터 시작)의 친구 번호 목록을 담은 인접 목록을 구성하여 반환하세요.',
        entryFunction: 'build_friend_groups',
        starterCode: `def build_friend_groups(student_count, friendships):
    # 각 학생 번호별 친구 목록을 담은 길이 student_count의 인접 목록을 반환하세요.
    pass
`,
        contextCard: {
          title: '👥 친구 관계망 인접 목록',
          strategyGuide: 'student_count 크기의 빈 목록을 만들고, 친구 쌍 [a, b]에 대해 a와 b 양쪽에 서로를 추가합니다.',
        },
        thoughtCheck: {
          question: '학생 수가 5명인데 친구 관계가 전혀 없다면 반환해야 하는 결과는?',
          options: [
            { value: 'five_empty', label: '[[], [], [], [], []] (5개의 빈 목록)' },
            { value: 'empty', label: '[]' },
          ],
          expected: 'five_empty',
        },
        testCases: [
          {
            inputs: {
              student_count: 3,
              friendships: [
                [0, 1],
                [1, 2],
              ],
            },
            expected: [[1], [0, 2], [1]],
          },
          {
            inputs: {
              student_count: 2,
              friendships: [[0, 1]],
            },
            expected: [[1], [0]],
          },
        ],
      },
    ],
  },
})
