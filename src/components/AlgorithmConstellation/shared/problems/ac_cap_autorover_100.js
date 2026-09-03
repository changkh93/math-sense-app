import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_CAP_AUTOROVER_100 = createCapabilityPrototypeKernel({
  problemId: 'AC-CAP-AUTOROVER-100',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 100,
    constellationId: 'constellation-9',
    routeRole: 'capstone',
    learningRole: 'synthesis',
    recommendedBand: 'EX',
    prerequisites: ['AC-MEMO-CLIMB-01', 'AC-NAV-006', 'AC-SIM-COMPASS-52'],
  },
  identity: {
    studentTitle: '자율 탐사 로버',
    subtitle: '격자 지도 grid, 출발 좌표 start(방향 0=북쪽 시작), 주행 명령 목록 commands가 주어질 때 최종 상태 [r, c, 방향]을 반환하세요 (\'TURN\'은 오른쪽 90도 회전, \'MOVE\'는 벽이나 격자 밖이면 정지).',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'statement:elif', 'operator:modulo', 'operator:comparison-bound', 'operator:equality'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:command-state-machine', 'pattern:cyclic-state-wrap', 'pattern:bounds-before-access'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['state-machine-step', 'grid-coordinate-tuple'],
    requiredClaims: ['CAPSTONE_AUTONOMOUS_ROVER_NAVIGATION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '북쪽(0)을 바라보는 로버가 TURN 명령을 한 번 받으면 어느 방향을 바라보게 될까요?',
      options: [
        {
          value: 'east_1',
          label: '동쪽(1) — 오른쪽 90도 회전 ((0 + 1) % 4 = 1)',
        },
        {
          value: 'south_2',
          label: '남쪽(2)',
        },
      ],
      expected: 'east_1',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🤖 자율 로버 주행 관제소',
          description: '로버의 위치 좌표 (r, c)와 4방향 순환 상태(0=북, 1=동, 2=남, 3=서)를 추적하며 장애물 충돌 시 안전 정지합니다.',
          variables: [
            { name: 'start', label: '시작 위치', value: '[0, 0]' },
            { name: 'direction', label: '시작 방향', value: '0 (북쪽)' },
            { name: 'commands', label: '명령 목록', value: "['TURN', 'MOVE', 'MOVE']" },
          ],
        },
        predictionPrompt: '동쪽(1)을 향해 전진하려 할 때 앞 칸이 벽(1)이면 로버의 위치는 어떻게 될까요?',
        rulePrompt: '격자 밖이나 벽으로 이동하려는 명령이 들어왔을 때 로버는 어떻게 반응하나요?',
        ruleStatement: '경계 범위(0 <= nr < rows and 0 <= nc < cols)와 열린 칸(grid[nr][nc] == 0)을 모두 만족할 때만 이동하고, 그렇지 않으면 안전하게 정지합니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '출발선 정렬',
          explanation: '로버가 (0,0) 위치에서 북쪽(0)을 향해 대기 중입니다.',
          stateBefore: { pos: '[0, 0]', dir: 0 },
          stateAfter: { pos: '[0, 0]', dir: 0 },
        },
        {
          id: 'step_turn',
          label: 'TURN 수행',
          explanation: '오른쪽 90도 회전하여 방향이 동쪽(1)으로 변경됩니다 (위치는 0,0 유지).',
          stateBefore: { pos: '[0, 0]', dir: 0 },
          stateAfter: { pos: '[0, 0]', dir: 1 },
          operationOptions: [
            { id: 'turn_east', label: '방향을 (d + 1) % 4 로 갱신 (1)' },
            { id: 'turn_pos_change', label: '위치도 함께 변경' },
          ],
          expectedOptionId: 'turn_east',
        },
        {
          id: 'step_move_open',
          label: '열린 칸으로 MOVE',
          explanation: '동쪽(0,1)이 열린 칸이므로 위치가 (0,1)로 전진합니다.',
          stateBefore: { pos: '[0, 0]', dir: 1 },
          stateAfter: { pos: '[0, 1]', dir: 1 },
        },
        {
          id: 'step_move_wall',
          label: '벽 앞 MOVE 시도',
          explanation: '앞 칸이 벽이므로 이동하지 않고 (0,1) 위치를 유지하며 안전 정지합니다.',
          stateBefore: { pos: '[0, 1]', dir: 1 },
          stateAfter: { pos: '[0, 1]', dir: 1 },
        },
      ],
    },
    code: {
      entryFunction: 'navigate_rover',
      starterCode: `def navigate_rover(grid, start, commands):
    # 명령 목록을 차례로 수행한 후 [최종_r, 최종_c, 최종_방향]을 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'autonomous_rover_grid_sim',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: {
          grid: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ],
          start: [0, 0],
          commands: ['TURN', 'MOVE', 'MOVE'],
        },
        expected: [0, 2, 1],
      },
      {
        inputs: {
          grid: [
            [0, 0],
            [0, 0],
          ],
          start: [0, 0],
          commands: ['MOVE'],
        },
        expected: [0, 0, 0],
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_cap_100_1',
        title: '자율 주행 상태 머신 규칙',
        prompt: '위치 좌표와 방향 상태 변화 규칙을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: "서쪽(3)을 향한 상태에서 TURN 명령을 받으면 방향은 몇 번이 될까요?",
            options: [
              { value: 'north_0', label: '0번 (북쪽) — (3 + 1) % 4 = 0 으로 순환' },
              { value: 'four_4', label: '4번' },
            ],
            expected: 'north_0',
          },
          {
            id: 'q2',
            text: "MOVE 명령 시 앞 칸이 격자 밖이거나 벽일 때 올바른 로버의 행동은?",
            options: [
              { value: 'stay_in_place', label: '이동하지 않고 현재 위치에 멈춘다' },
              { value: 'reverse_dir', label: '반대 방향으로 후진한다' },
            ],
            expected: 'stay_in_place',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_cap_100_transfer_1',
        title: '로버 방문 서로 다른 칸 수',
        description: '로버가 명령들을 수행하는 동안 방문한 서로 다른 칸들의 개수를 [[최종_r, 최종_c, 최종_방향], 방문_칸_수] 형태로 반환하세요 (시작 칸 포함).',
        entryFunction: 'count_unique_cells',
        starterCode: `def count_unique_cells(grid, start, commands):
    # [[최종_r, 최종_c, 최종_방향], 방문_칸_수]를 반환하세요.
    pass
`,
        contextCard: {
          title: '🗺️ 방문 지도 기록',
          strategyGuide: '이동할 때마다 집합(visited)에 (r, c) 좌표를 추가하고 len(visited)를 함께 반환합니다.',
        },
        thoughtCheck: {
          question: '명령 없이 시작 칸 (0,0)에 그대로 멈춰 있다면 방문 칸 수는?',
          options: [
            { value: 'ans_1', label: '1개' },
            { value: 'ans_0', label: '0개' },
          ],
          expected: 'ans_1',
        },
        testCases: [
          {
            inputs: {
              grid: [[0, 0]],
              start: [0, 0],
              commands: ['TURN'],
            },
            expected: [[0, 0, 1], 1],
          },
          {
            inputs: {
              grid: [
                [0, 0],
                [0, 0],
              ],
              start: [0, 0],
              commands: ['MOVE'],
            },
            expected: [[0, 0, 0], 1],
          },
        ],
      },
    ],
  },

  scaffolding: {
    publicPolicy: {
      parsonAvailable: true,
      maxHints: 3,
    },
  },
})
