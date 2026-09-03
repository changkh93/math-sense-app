import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRID_BOUND_82 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRID-BOUND-82',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 82,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-GRID-NEIGHBOR-81', 'AC-COND-RANGE-15'],
  },
  identity: {
    studentTitle: '행성판의 가장자리',
    subtitle: 'grid와 중심 (r, c)가 주어질 때, 상·하·좌·우 네 방향 이웃 중 격자 범위 내에 있으면서 벽(1)이 아닌 열린 칸(0)인 좌표 목록을 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'operator:comparison-bound', 'operator:and'],
    introduces: ['syntax:nested-indexing'],
  },
  thinkingPatterns: {
    requires: ['pattern:four-neighbor-enumeration'],
    introduces: ['pattern:bounds-before-access'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer'],
    requiredClaims: ['BOUNDS_BEFORE_ACCESS'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '후보 칸의 값을 읽기 전에 반드시 먼저 확인해야 하는 조건은 무엇일까요?',
      options: [
        {
          value: 'bounds_first',
          label: '좌표 (nr, nc)가 격자 범위(0 <= nr < rows, 0 <= nc < cols) 안에 있는지 먼저 확인한다',
        },
        {
          value: 'value_first',
          label: '값이 0인지 먼저 확인한다',
        },
      ],
      expected: 'bounds_first',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🧱 경계 및 벽 판별 시뮬레이터',
          description: '후보 좌표가 격자 밖인지, 벽(1)인지, 이동 가능한 열린 칸(0)인지 상, 하, 좌, 우 순서로 판별합니다.',
          variables: [
            {
              name: 'grid',
              value: '[[0, 1, 0], [0, 0, 0]]',
            },
            {
              name: 'center',
              value: '(1, 1)',
            },
          ],
          guidance: '행과 열의 범위 검사를 통과한 뒤에만 해당 칸의 값을 읽어야 오류를 방지할 수 있습니다.',
        },
        initialState: {
          step: '시작',
          candidate: null,
          decision: '대기',
          openNeighbors: [],
        },
        initialStateLabel: '시작: (1, 1) 이웃 검사',
        initialStepTitle: '탐색 시작',
        initialPrompt: '(1, 1)의 상, 하, 좌, 우 이웃을 검사합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 상(0, 1) 검사: 벽 탈락',
            operationLabel: '벽 검사',
            prompt: '위쪽 (0, 1)은 격자 안이지만 0행 1열의 값이 1(벽)이므로 탈락합니다.',
            stateAfter: {
              step: '상(0, 1)',
              candidate: [0, 1],
              decision: '벽(1) 탈락',
              openNeighbors: [],
            },
          },
          {
            id: 'f1',
            stepTitle: '② 하(2, 1) 검사: 범위 탈락',
            operationLabel: '범위 검사',
            prompt: '아래쪽 (2, 1)은 행 번호가 2(전체 행 2) 이상이므로 범위 밖 탈락입니다.',
            stateAfter: {
              step: '하(2, 1)',
              candidate: [2, 1],
              decision: '범위 밖 탈락',
              openNeighbors: [],
            },
            choicePrompt: '좌(1, 0)과 우(1, 2)는 둘 다 0일 때 최종 결과는 무엇일까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '[[1, 0], [1, 2]] (열린 두 칸만 통과)',
                feedback: '맞아요. 벽(상)과 범위 밖(하)을 제외한 두 칸만 통과해요.',
              },
              {
                id: 'wrong',
                label: '[[0, 1], [1, 0], [1, 2]] (벽도 포함)',
                feedback: '벽(1)은 지나갈 수 없는 칸이므로 포함하면 안 돼요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ 좌(1, 0) 검사: 통과',
            operationLabel: '열린 칸 추가',
            prompt: '왼쪽 (1, 0)은 범위 안이고 값이 0이므로 유효합니다.',
            stateAfter: {
              step: '좌(1, 0)',
              candidate: [1, 0],
              decision: '열린 칸(0) 통과',
              openNeighbors: [[1, 0]],
            },
          },
          {
            id: 'f3',
            stepTitle: '④ 우(1, 2) 검사: 통과 -> 완료',
            operationLabel: '열린 칸 추가',
            prompt: '오른쪽 (1, 2)도 통과하여 최종 [[1, 0], [1, 2]]가 완성되었습니다.',
            stateAfter: {
              step: '우(1, 2)',
              candidate: [1, 2],
              decision: '열린 칸(0) 통과',
              openNeighbors: [[1, 0], [1, 2]],
            },
          },
        ],
        predictionPrompt: '상, 하, 좌, 우 순서로 격자 범위 안이면서 값이 0인 좌표 목록을 반환하세요.',
        rulePrompt: '열린 칸 판별 규칙',
        ruleStatement: '후보의 행과 열이 모두 범위 안인지 먼저 확인하고, 그다음 해당 칸의 값이 0인 좌표만 수집한다.',
      },
    },
    code: {
      entryFunction: 'open_grid_neighbors',
      starterCode: `def open_grid_neighbors(grid, r, c):
    # 상, 하, 좌, 우 순서로 범위 안이면서 0인 좌표 목록을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          grid: [
            [0, 1, 0],
            [0, 0, 0],
          ],
          r: 1,
          c: 1,
        },
        expected: [[1, 0], [1, 2]],
      },
      {
        inputs: {
          grid: [
            [1, 1],
            [1, 0],
          ],
          r: 1,
          c: 1,
        },
        expected: [],
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_grid_082_1',
        title: '경계 검사와 장애물 필터링 이해',
        prompt: '인덱스 접근 전 안전성 검사와 0/1의 의미를 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: 'grid[nr][nc]를 검사하는 코드를 범위 검사보다 먼저 작성하면 어떤 오류가 발생할 수 있을까요?',
            options: [
              { value: 'index_error', label: '인덱스가 범위를 벗어났을 때 IndexError가 발생한다' },
              { value: 'no_error', label: '아무 오류도 생기지 않는다' },
            ],
            expected: 'index_error',
          },
          {
            id: 'q2',
            text: '이 문제에서 벽(1)인 칸은 반환 목록에 포함되어야 할까요?',
            options: [
              { value: 'no', label: '아니다 — 열린 칸(0)만 이동할 수 있으므로 제외해야 한다' },
              { value: 'yes', label: '맞다 — 벽도 인접한 칸이므로 포함한다' },
            ],
            expected: 'no',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_grid_082_transfer_1',
        title: '안전한 로버 이동 경로',
        description: '행성 지형 grid와 현재 로버 좌표 position([r, c])가 주어질 때, 상·하·좌·우로 로버가 안전하게 한 칸 이동할 수 있는 열린 좌표(0) 목록을 반환하세요.',
        entryFunction: 'safe_rover_moves',
        starterCode: `def safe_rover_moves(grid, position):
    # position은 [r, c]입니다. 상, 하, 좌, 우 순서로 안전하게 이동 가능한 좌표를 반환하세요.
    pass
`,
        contextCard: {
          title: '🚜 로버 안전 이동 탐색',
          strategyGuide: 'position에서 행과 열을 변수로 추출한 뒤, 상·하·좌·우 후보 중 범위 안이고 암석(1)이 아닌 안전한 위치(0)만 수집합니다.',
        },
        thoughtCheck: {
          question: '로버 위치 position = [0, 0]에서 위쪽 좌표를 확인할 때 경계 검사의 결과는?',
          options: [
            { value: 'out', label: '행 번호가 음수(-1)가 되어 지형 밖이다' },
            { value: 'in', label: '정상적인 지형 내부이다' },
          ],
          expected: 'out',
        },
        testCases: [
          {
            inputs: {
              grid: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0],
              ],
              position: [1, 0],
            },
            expected: [[0, 0], [2, 0]],
          },
          {
            inputs: {
              grid: [
                [0, 1],
                [0, 0],
              ],
              position: [0, 0],
            },
            expected: [[1, 0]],
          },
        ],
      },
    ],
  },
})
