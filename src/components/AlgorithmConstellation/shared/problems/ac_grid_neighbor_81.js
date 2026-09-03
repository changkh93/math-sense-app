import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRID_NEIGHBOR_81 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRID-NEIGHBOR-81',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 81,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-SEQ-005', 'AC-SEQ-RUNNING-35'],
  },
  identity: {
    studentTitle: '격자의 이웃 신호',
    subtitle: 'rows, cols 크기의 격자에서 (r, c) 위치의 상·하·좌·우 네 방향 이웃 중 격자 범위 내에 있는 유효한 좌표 목록을 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'builtin:range', 'operator:comparison-bound', 'operator:and'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:four-neighbor-enumeration'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer'],
    requiredClaims: ['FOUR_NEIGHBOR_ENUMERATION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '3×3 격자의 중심인 (1, 1)에서 상·하·좌·우로 인접한 유효 이웃 좌표는 총 몇 개일까요?',
      options: [
        {
          value: '4',
          label: '4개 — 상(0,1), 하(2,1), 좌(1,0), 우(1,2) 모두 격자 안이므로',
        },
        {
          value: '2',
          label: '2개',
        },
      ],
      expected: '4',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🧭 4방향 격자 이웃 탐색기',
          description: '현재 중심 좌표에서 상, 하, 좌, 우 순서로 후보를 검사하여 격자 경계(0 <= nr < rows, 0 <= nc < cols) 안에 드는 좌표만 모읍니다.',
          variables: [
            {
              name: 'rows, cols',
              value: '3, 3',
            },
            {
              name: 'center',
              value: '(0, 0)',
            },
          ],
          guidance: '모서리나 가장자리에서는 격자 밖으로 벗어나는 후보가 생깁니다.',
        },
        initialState: {
          step: '시작',
          candidate: null,
          validNeighbors: [],
        },
        initialStateLabel: '시작: 후보 검사 전',
        initialStepTitle: '탐색 시작 (모서리 (0, 0))',
        initialPrompt: '(0, 0)에서 4방향 후보를 상, 하, 좌, 우 순서로 검사합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 상(-1, 0) 검사',
            operationLabel: '범위 검사',
            prompt: '위쪽 (-1, 0)은 행이 0 미만이므로 격자 밖입니다.',
            stateAfter: {
              step: '상(-1, 0)',
              candidate: [-1, 0],
              validNeighbors: [],
            },
          },
          {
            id: 'f1',
            stepTitle: '② 하(1, 0) 검사',
            operationLabel: '유효 이웃 추가',
            prompt: '아래쪽 (1, 0)은 0 <= 1 < 3이므로 유효합니다.',
            stateAfter: {
              step: '하(1, 0)',
              candidate: [1, 0],
              validNeighbors: [[1, 0]],
            },
            choicePrompt: '(0, 0)의 모서리에서 유효한 이웃은 최종적으로 몇 개일까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '2개 (하, 우만 격자 안)',
                feedback: '맞아요. 모서리에서는 두 방향만 범위 안에 남아요.',
              },
              {
                id: 'wrong',
                label: '4개 (모든 방향 포함)',
                feedback: '격자 밖(-1 또는 3 이상)은 유효한 좌표가 아니에요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ 좌(0, -1) 검사',
            operationLabel: '범위 검사',
            prompt: '왼쪽 (0, -1)은 열이 0 미만이므로 격자 밖입니다.',
            stateAfter: {
              step: '좌(0, -1)',
              candidate: [0, -1],
              validNeighbors: [[1, 0]],
            },
          },
          {
            id: 'f3',
            stepTitle: '④ 우(0, 1) 검사 -> 완료',
            operationLabel: '유효 이웃 추가',
            prompt: '오른쪽 (0, 1)이 추가되어 최종 [[1, 0], [0, 1]]이 완성되었습니다.',
            stateAfter: {
              step: '우(0, 1)',
              candidate: [0, 1],
              validNeighbors: [[1, 0], [0, 1]],
            },
          },
        ],
        predictionPrompt: 'rows, cols 크기의 격자에서 (r, c)의 상, 하, 좌, 우 순서 중 격자 안에 있는 좌표만 반환하세요.',
        rulePrompt: '격자 이웃 좌표 규칙',
        ruleStatement: '상(-1, 0), 하(1, 0), 좌(0, -1), 우(0, 1) 변화량을 순서대로 적용하되 0 <= nr < rows and 0 <= nc < cols 조건만 수집한다.',
      },
    },
    code: {
      entryFunction: 'valid_grid_neighbors',
      starterCode: `def valid_grid_neighbors(rows, cols, r, c):
    # 상, 하, 좌, 우 순서로 범위(0 <= nr < rows and 0 <= nc < cols) 안인 좌표 목록을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: { rows: 3, cols: 4, r: 0, c: 1 },
        expected: [[1, 1], [0, 0], [0, 2]],
      },
      {
        inputs: { rows: 1, cols: 1, r: 0, c: 0 },
        expected: [],
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_grid_081_1',
        title: '4방향 격자 이웃 좌표의 이해',
        prompt: '격자 경계와 상·하·좌·우 좌표 변화량을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '2×2 격자의 우하단 모서리 (1, 1)에서 유효한 이웃 좌표는 몇 개일까요?',
            options: [
              { value: 'two', label: '2개 — 상(0, 1)과 좌(1, 0)만 격자 안' },
              { value: 'four', label: '4개 — 모든 방향' },
            ],
            expected: 'two',
          },
          {
            id: 'q2',
            text: '격자에서 대각선 방향으로 인접한 좌표는 4방향 이웃에 포함될까요?',
            options: [
              { value: 'no', label: '아니다 — 상, 하, 좌, 우 네 방향만 포함된다' },
              { value: 'yes', label: '맞다 — 대각선도 이웃이다' },
            ],
            expected: 'no',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_grid_081_transfer_1',
        title: '좌석판의 인접 좌석 찾기',
        description: 'rows, cols 크기의 좌석 배치도에서 현재 좌석 좌표 seat([r, c])의 상, 하, 좌, 우 유효 인접 좌석 좌표 목록을 반환하세요.',
        entryFunction: 'valid_seat_neighbors',
        starterCode: `def valid_seat_neighbors(rows, cols, seat):
    # seat은 [r, c] 형태입니다. 상, 하, 좌, 우 순서로 유효한 좌석 목록을 반환하세요.
    pass
`,
        contextCard: {
          title: '💺 좌석판 인접 좌표 탐색',
          strategyGuide: 'seat에서 먼저 행과 열을 변수로 추출한 뒤, 상·하·좌·우 변화량을 적용해 경계 안에 있는 좌석을 찾습니다.',
        },
        thoughtCheck: {
          question: '좌석 좌표 seat = [0, 0]에서 위쪽 좌석을 확인하려 할 때 발생하는 상황은?',
          options: [
            { value: 'out_of_bounds', label: '행 번호가 0 미만이 되어 좌석판 밖이다' },
            { value: 'valid_seat', label: '유효한 좌석이다' },
          ],
          expected: 'out_of_bounds',
        },
        testCases: [
          {
            inputs: { rows: 2, cols: 3, seat: [0, 0] },
            expected: [[1, 0], [0, 1]],
          },
          {
            inputs: { rows: 3, cols: 3, seat: [1, 1] },
            expected: [[0, 1], [2, 1], [1, 0], [1, 2]],
          },
        ],
      },
    ],
  },
})
