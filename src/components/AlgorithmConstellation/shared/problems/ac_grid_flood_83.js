import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRID_FLOOD_83 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRID-FLOOD-83',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 83,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-GRID-BOUND-82', 'AC-NAV-005', 'AC-SET-MEMBERSHIP-42'],
  },
  identity: {
    studentTitle: '하나의 오염 구역 채우기',
    subtitle: 'grid와 시작 좌표 start([r, c])가 주어질 때, start와 4방향으로 연결된 열린 칸(0)들의 총 개수를 반환하세요. start가 벽(1)이면 0을 반환합니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'builtin:set', 'syntax:nested-indexing'],
    introduces: ['syntax:sequence-unpacking'],
  },
  thinkingPatterns: {
    requires: ['pattern:bounds-before-access', 'pattern:fifo-processing'],
    introduces: ['pattern:flood-fill'],
  },
  evidenceRecipe: {
    primitives: ['grid-frontier', 'container-membership'],
    requiredClaims: ['FLOOD_FILL_EXPANSION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '플러드 필(Flood Fill) 탐색에서 대각선으로 맞닿아 있는 칸은 같은 구역으로 연결될까요?',
      options: [
        {
          value: 'no',
          label: '아니다 — 상·하·좌·우 4방향으로 맞닿은 칸만 연결된다',
        },
        {
          value: 'yes',
          label: '맞다 — 대각선 칸도 같은 구역이다',
        },
      ],
      expected: 'no',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🌊 플러드 필 구역 확장 시뮬레이터',
          description: '시작점에서 출발하여 상하좌우로 연결된 열린 칸(0)들을 대기열(queue)과 방문 집합(visited)으로 확장하며 구역 크기를 계산합니다.',
          variables: [
            {
              name: 'grid',
              value: '[[0, 0], [1, 0]]',
            },
            {
              name: 'start',
              value: '[0, 0]',
            },
          ],
          guidance: '큐에 넣는 순간 visited에 추가해야 같은 칸을 중복 탐색하지 않습니다.',
        },
        initialState: {
          step: '시작',
          current: null,
          queue: ['(0, 0)'],
          visited: ['(0, 0)'],
          size: 0,
        },
        initialStateLabel: '시작: start = (0, 0) 큐 삽입',
        initialStepTitle: '탐색 시작',
        initialPrompt: '시작점 (0, 0)을 큐와 visited에 등록하고 탐색을 시작합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① (0, 0) 꺼내어 이웃 탐색',
            operationLabel: '큐 꺼내기 및 확장',
            prompt: '(0, 0)을 꺼내어 크기 1 증가. 이웃 중 (0, 1)이 열린 칸(0)이므로 큐에 추가.',
            stateAfter: {
              step: '(0, 0) 처리',
              current: [0, 0],
              queue: ['(0, 1)'],
              visited: ['(0, 0)', '(0, 1)'],
              size: 1,
            },
          },
          {
            id: 'f1',
            stepTitle: '② (0, 1) 꺼내어 이웃 탐색',
            operationLabel: '큐 꺼내기 및 확장',
            prompt: '(0, 1)을 꺼내어 크기 2 증가. 이웃 중 (1, 1)이 열린 칸(0)이므로 큐에 추가.',
            stateAfter: {
              step: '(0, 1) 처리',
              current: [0, 1],
              queue: ['(1, 1)'],
              visited: ['(0, 0)', '(0, 1)', '(1, 1)'],
              size: 2,
            },
            choicePrompt: '(1, 0)은 벽(1)입니다. 남은 (1, 1)까지 처리하면 최종 구역 크기는 얼마일까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '3 (열린 세 칸만 연결됨)',
                feedback: '맞아요. 벽(1)을 제외한 연결된 0들의 총 개수는 3이에요.',
              },
              {
                id: 'wrong',
                label: '4 (전체 칸 개수)',
                feedback: '벽(1)은 오염 구역에 포함되지 않아요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ (1, 1) 꺼내기 -> 큐 소진',
            operationLabel: '완료',
            prompt: '(1, 1)을 꺼내어 크기 3 증가. 더 이상 방문할 새 이웃이 없어 큐가 비었습니다.',
            stateAfter: {
              step: '(1, 1) 완료',
              current: [1, 1],
              queue: [],
              visited: ['(0, 0)', '(0, 1)', '(1, 1)'],
              size: 3,
            },
          },
        ],
        predictionPrompt: 'start와 연결된 열린 칸(0)들의 총 개수를 반환하세요. start가 벽이면 0을 반환합니다.',
        rulePrompt: '플러드 필 확장 규칙',
        ruleStatement: 'start가 벽이면 즉시 0 반환. 열린 칸이면 큐와 visited를 이용해 4방향으로 연결된 모든 0을 세고 반환한다.',
      },
    },
    code: {
      entryFunction: 'region_size',
      starterCode: `from collections import deque

def region_size(grid, start):
    # start 좌표(start[0], start[1])에서 시작해 연결된 열린 칸(0)의 수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          grid: [
            [0, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
          ],
          start: [0, 0],
        },
        expected: 3,
      },
      {
        inputs: {
          grid: [
            [1, 0],
            [0, 0],
          ],
          start: [0, 0],
        },
        expected: 0,
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_grid_083_1',
        title: '플러드 필 연결성 및 불변식 점검',
        prompt: '구역 탐색의 연결 조건과 방문 처리를 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '벽으로 완전히 둘러싸여 시작점과 단절된 다른 열린 칸들은 region_size 결과에 포함될까요?',
            options: [
              { value: 'no', label: '아니다 — 시작점과 4방향으로 연결된 구역만 센다' },
              { value: 'yes', label: '맞다 — 격자 안의 모든 열린 칸을 센다' },
            ],
            expected: 'no',
          },
          {
            id: 'q2',
            text: '큐에 새 좌표를 넣을 때 즉시 visited에 추가하는 이유는 무엇일까요?',
            options: [
              { value: 'prevent_duplicate', label: '다른 이웃을 탐색할 때 같은 좌표가 큐에 중복으로 들어가는 것을 막기 위해' },
              { value: 'change_grid', label: '격자의 값을 벽으로 바꾸기 위해' },
            ],
            expected: 'prevent_duplicate',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_grid_083_transfer_1',
        title: '연결된 센서 군집 크기',
        description: '센서 격자 grid에서 1은 센서, 0은 빈 공간입니다. start([r, c]) 위치의 센서와 4방향으로 연결된 센서(1)들의 총 개수를 반환하세요. start에 센서가 없으면 0을 반환합니다.',
        entryFunction: 'connected_sensor_count',
        starterCode: `from collections import deque

def connected_sensor_count(grid, start):
    # 1이 센서이고 0이 빈 공간입니다. start와 연결된 센서(1)의 총 개수를 반환하세요.
    pass
`,
        contextCard: {
          title: '📡 센서 군집 크기 탐색',
          strategyGuide: 'start 좌표의 행과 열을 변수로 추출한 뒤, 값이 1인 센서들만 4방향 플러드 필로 탐색하여 개수를 셉니다.',
        },
        thoughtCheck: {
          question: '센서 군집 탐색에서 start 위치의 값이 0(빈 공간)이라면 반환해야 하는 결과는?',
          options: [
            { value: 'zero', label: '0 (센서가 없음)' },
            { value: 'one', label: '1' },
          ],
          expected: 'zero',
        },
        testCases: [
          {
            inputs: {
              grid: [
                [1, 1, 0],
                [0, 1, 0],
                [0, 0, 1],
              ],
              start: [0, 0],
            },
            expected: 3,
          },
          {
            inputs: {
              grid: [
                [0, 1],
                [1, 0],
              ],
              start: [0, 0],
            },
            expected: 0,
          },
        ],
      },
    ],
  },
})
