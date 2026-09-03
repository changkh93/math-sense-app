import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRID_ISLAND_84 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRID-ISLAND-84',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 84,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-GRID-FLOOD-83', 'AC-SEQ-COUNT-33'],
  },
  identity: {
    studentTitle: '떠 있는 기지의 개수',
    subtitle: '2차원 격자 grid에서 상·하·좌·우로 연결된 열린 칸(0) 구역들의 총 개수를 반환하세요. 전부 벽(1)이면 0을 반환합니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'builtin:set', 'syntax:sequence-unpacking', 'syntax:nested-indexing'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:flood-fill'],
    introduces: ['pattern:connected-components'],
  },
  evidenceRecipe: {
    primitives: ['grid-frontier', 'container-scan'],
    requiredClaims: ['CONNECTED_COMPONENTS_COUNT'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '격자 전체를 순회하면서 구역의 개수(regions)를 1 증가시키는 정확한 순간은 언제일까요?',
      options: [
        {
          value: 'unvisited_zero',
          label: '아직 방문하지 않은 새로운 열린 칸(0)을 발견했을 때',
        },
        {
          value: 'every_zero',
          label: '값이 0인 칸을 만날 때마다 매번',
        },
      ],
      expected: 'unvisited_zero',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🏝️ 연결 구역 개수 세기 시뮬레이터',
          description: '이중 루프로 격자를 순회하다가 아직 방문하지 않은 0을 만나면 구역 수를 1 늘리고, 플러드 필로 그 구역 전체를 방문 처리합니다.',
          variables: [
            {
              name: 'grid',
              value: '[[0, 1], [1, 0]]',
            },
          ],
          guidance: '대각선으로만 맞닿아 있는 칸은 별개의 구역으로 계산됩니다.',
        },
        initialState: {
          step: '시작',
          scanPos: [0, 0],
          visitedCount: 0,
          regionCount: 0,
        },
        initialStateLabel: '시작: 격자 스캔 전',
        initialStepTitle: '격자 스캔 시작',
        initialPrompt: '(0, 0)부터 행/열 순서대로 순회합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① (0, 0) 발견: 첫 번째 구역',
            operationLabel: '새 구역 탐색',
            prompt: '(0, 0)이 미방문 0이므로 regionCount = 1. 연결된 칸 탐색 완료.',
            stateAfter: {
              step: '(0, 0) 구역 탐색',
              scanPos: [0, 0],
              visitedCount: 1,
              regionCount: 1,
            },
          },
          {
            id: 'f1',
            stepTitle: '② (0, 1), (1, 0) 통과',
            operationLabel: '벽(1) 건너뛰기',
            prompt: '(0, 1)과 (1, 0)은 벽(1)이므로 구역 탐색을 시작하지 않습니다.',
            stateAfter: {
              step: '벽 건너뛰기',
              scanPos: [1, 0],
              visitedCount: 1,
              regionCount: 1,
            },
            choicePrompt: '마지막 (1, 1) 칸도 0입니다. 대각선은 연결되지 않으므로 총 구역 수는?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '2개 (대각선 분리된 두 구역)',
                feedback: '맞아요. 대각선은 맞닿지 않으므로 독립된 두 구역이에요.',
              },
              {
                id: 'wrong',
                label: '1개 (대각선으로 연결)',
                feedback: '상하좌우 4방향만 연결되므로 대각선은 별개 구역이에요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ (1, 1) 발견: 두 번째 구역 -> 완료',
            operationLabel: '새 구역 탐색 완료',
            prompt: '(1, 1)은 미방문 0이므로 regionCount = 2로 증가. 최종 2개 구역.',
            stateAfter: {
              step: '완료',
              scanPos: [1, 1],
              visitedCount: 2,
              regionCount: 2,
            },
          },
        ],
        predictionPrompt: '4방향으로 연결된 열린 칸(0) 구역들의 총 개수를 반환하세요.',
        rulePrompt: '연결 구역 개수 규칙',
        ruleStatement: '전체 격자 순회 중 미방문 0을 만날 때마다 카운트를 1 증가시키고 해당 구역을 BFS로 모두 방문 처리한다.',
      },
    },
    code: {
      entryFunction: 'count_regions',
      starterCode: `from collections import deque

def count_regions(grid):
    # 연결된 0 구역들의 총 개수를 세어 반환하세요.
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
            [1, 1, 1],
            [0, 1, 0],
          ],
        },
        expected: 4,
      },
      {
        inputs: {
          grid: [
            [0, 0],
            [0, 0],
          ],
        },
        expected: 1,
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_grid_084_1',
        title: '연결 구역 개수 세기 불변식',
        prompt: '이미 방문한 칸의 처리와 새로운 구역 카운트 시점을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '이미 이전 구역 탐색에서 visited에 추가된 0을 바깥 순회에서 다시 만나면 어떻게 해야 할까요?',
            options: [
              { value: 'skip', label: '이미 카운트된 구역의 일부이므로 건너뛴다' },
              { value: 'increment', label: '새 구역으로 보고 다시 카운트를 1 늘린다' },
            ],
            expected: 'skip',
          },
          {
            id: 'q2',
            text: '격자의 모든 칸이 1(벽)으로 채워져 있다면 반환해야 하는 결과는 무엇일까요?',
            options: [
              { value: 'zero', label: '0 (열린 구역이 없음)' },
              { value: 'one', label: '1' },
            ],
            expected: 'zero',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_grid_084_transfer_1',
        title: '신호 송출 군집 개수 세기',
        description: '격자 grid에서 1은 신호 송출기, 0은 빈 공간입니다. 4방향으로 연결된 신호 송출기(1) 군집들의 총 개수를 반환하세요. 송출기가 하나도 없으면 0을 반환합니다.',
        entryFunction: 'count_signal_clusters',
        starterCode: `from collections import deque

def count_signal_clusters(grid):
    # 1이 신호 송출기이고 0이 빈 공간입니다. 1 군집의 총 개수를 반환하세요.
    pass
`,
        contextCard: {
          title: '📶 신호 송출 군집 탐색',
          strategyGuide: '미방문 1을 만날 때마다 군집 수를 1 늘리고, 연결된 1들을 플러드 필로 모두 방문 처리합니다.',
        },
        thoughtCheck: {
          question: '군집 탐색 중 값이 0(빈 공간)인 칸을 만나면 군집 수를 늘려야 할까요?',
          options: [
            { value: 'no', label: '아니다 — 1인 송출기만 군집으로 센다' },
            { value: 'yes', label: '맞다 — 빈 공간도 센다' },
          ],
          expected: 'no',
        },
        testCases: [
          {
            inputs: {
              grid: [
                [1, 0, 1],
                [0, 0, 0],
                [1, 1, 0],
              ],
            },
            expected: 3,
          },
          {
            inputs: {
              grid: [
                [0, 0],
                [0, 0],
              ],
            },
            expected: 0,
          },
        ],
      },
    ],
  },
})
