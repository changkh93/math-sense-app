import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_CAP_RESCUE_99 = createCapabilityPrototypeKernel({
  problemId: 'AC-CAP-RESCUE-99',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 99,
    constellationId: 'constellation-9',
    routeRole: 'capstone',
    learningRole: 'synthesis',
    recommendedBand: 'EX',
    prerequisites: ['AC-NAV-006', 'AC-SRCH-LINEAR-58'],
  },
  identity: {
    studentTitle: '구조 드론 지휘소',
    subtitle: '격자 지도 grid, 출발 좌표 start, 구조 대상 좌표 목록 targets가 주어질 때, 현재 위치에서 가장 가까운 미구조 지점으로 차례로 이동하며 모든 대상을 구조하는 총 이동 거리를 구하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'statement:while', 'operator:comparison-bound', 'syntax:sequence-unpacking'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:bfs-shortest-path', 'pattern:first-match-linear-search'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['fifo-queue', 'grid-coordinate-tuple'],
    requiredClaims: ['CAPSTONE_RESCUE_ROUTE_BFS'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '출발점 (0,0)에서 목표 [(0,2), (0,4)]로 이동할 때, 가장 가까운 목표부터 순차 방문하면 총 거리는 얼마일까요?',
      options: [
        {
          value: 'dist_4',
          label: '4칸 — (0,0)→(0,2) 2칸 + (0,2)→(0,4) 2칸',
        },
        {
          value: 'dist_6',
          label: '6칸',
        },
      ],
      expected: 'dist_4',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🚁 구조 드론 연쇄 항로 관제',
          description: '현재 위치에서 4방향 BFS로 가장 가까운 미구조 목표를 탐색하고, 도달 시 served 표시 후 해당 위치에서 다음 목표를 탐색합니다.',
          variables: [
            { name: 'start', label: '출발 위치', value: '[0, 0]' },
            { name: 'targets', label: '구조 대상', value: '[[0, 2], [0, 4]]' },
            { name: 'served', label: '구조 완료 여부', value: '[False, False]' },
          ],
        },
        predictionPrompt: '첫 번째 목표 [0, 2]에 도달했을 때 다음 출발 위치(cur_r, cur_c)는 어떻게 갱신되나요?',
        rulePrompt: '구조를 완료한 목표를 중복 방문하지 않고 다음 목표로 이동하는 규칙은 무엇인가요?',
        ruleStatement: '도달한 목표를 served = True로 완료 처리하고, 해당 목표 위치를 새 출발점으로 삼아 다음 가장 가까운 목표를 탐색합니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '기지 출항 준비',
          explanation: '드론이 (0,0)에 위치하며, 모든 목표는 미구조 상태(served = [False, False])입니다.',
          stateBefore: { pos: '[0, 0]', total_dist: 0 },
          stateAfter: { pos: '[0, 0]', total_dist: 0 },
        },
        {
          id: 'step_reach_first',
          label: '첫 번째 목표 (0,2) 구조 완료',
          explanation: '거리 2칸을 이동해 첫 목표를 구조하고, served[0] = True 처리 후 드론 위치를 (0,2)로 갱신합니다.',
          stateBefore: { pos: '[0, 0]', total_dist: 0 },
          stateAfter: { pos: '[0, 2]', total_dist: 2 },
          operationOptions: [
            { id: 'serve_first', label: '첫 목표 served 기록 및 위치 갱신' },
            { id: 'stay_origin', label: '원점에서 다시 탐색' },
          ],
          expectedOptionId: 'serve_first',
        },
        {
          id: 'step_reach_second',
          label: '두 번째 목표 (0,4) 구조 완료',
          explanation: '(0,2)에서 (0,4)로 2칸 추가 이동하여 모든 목표를 완료하고 총 이동 거리 4를 확정합니다.',
          stateBefore: { pos: '[0, 2]', total_dist: 2 },
          stateAfter: { pos: '[0, 4]', total_dist: 4 },
        },
      ],
    },
    code: {
      entryFunction: 'rescue_route_total',
      starterCode: `from collections import deque

def rescue_route_total(grid, start, targets):
    # 현재 위치에서 가장 가까운 미완 목표로 이동하는 과정을 반복해 총 이동 거리를 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'drone_rescue_grid_bfs',
    limits: {
      maxExecutionMs: 2500,
      maxSteps: 30000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: {
          grid: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
          ],
          start: [0, 0],
          targets: [[0, 2], [0, 4]],
        },
        expected: 4,
      },
      {
        inputs: {
          grid: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ],
          start: [0, 0],
          targets: [[2, 2]],
        },
        expected: 4,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_cap_099_1',
        title: '연쇄 BFS와 탐욕 선택의 특성',
        prompt: '가장 가까운 목표를 순차 방문하는 전략의 특성을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '가장 가까운 목표부터 방문하는 방식이 전체 가능한 모든 경로 중 수학적으로 절대적인 최적 거리를 항상 보장할까요?',
            options: [
              { value: 'greedy_not_always_global', label: '아니다 — 눈앞의 최단 선택이 나중에 더 먼 이동을 초래할 수도 있는 탐욕적 근사 전략이다' },
              { value: 'always_global', label: '항상 우주 최고의 최단 경로를 보장한다' },
            ],
            expected: 'greedy_not_always_global',
          },
          {
            id: 'q2',
            text: '이미 구조한 목표를 대기열 탐색 대상에서 제외하기 위해 관리하는 방법은?',
            options: [
              { value: 'served_list', label: '각 목표의 완료 여부를 기록하는 served 불리언 목록' },
              { value: 'ignore', label: '특별히 기록하지 않는다' },
            ],
            expected: 'served_list',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_cap_099_transfer_1',
        title: '정비소 순회 점검 총 거리',
        description: '기지 지도 grid, 점검 시작점 start, 정비소 좌표 stations가 주어질 때, 가장 가까운 정비소부터 순서대로 모두 순회 점검하는 총 이동 거리를 구하세요.',
        entryFunction: 'maintain_stations_total',
        starterCode: `from collections import deque

def maintain_stations_total(grid, start, stations):
    # 가장 가까운 미점검 정비소로 연쇄 이동하는 총 이동 거리를 반환하세요.
    pass
`,
        contextCard: {
          title: '🔧 정비소 순회 점검',
          strategyGuide: '현재 정비소에서 BFS로 가장 가까운 미점검 정비소를 찾아 이동하고 완료 표시를 남깁니다.',
        },
        thoughtCheck: {
          question: '정비소가 1곳일 때의 총 이동 거리는?',
          options: [
            { value: 'single_bfs', label: '시작점에서 해당 정비소까지의 BFS 최단 거리' },
            { value: 'zero_dist', label: '0' },
          ],
          expected: 'single_bfs',
        },
        testCases: [
          {
            inputs: {
              grid: [
                [0, 0],
                [0, 0],
              ],
              start: [0, 0],
              stations: [[0, 1]],
            },
            expected: 1,
          },
          {
            inputs: {
              grid: [
                [0, 0, 0],
                [0, 0, 0],
              ],
              start: [0, 0],
              stations: [[0, 2]],
            },
            expected: 2,
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
