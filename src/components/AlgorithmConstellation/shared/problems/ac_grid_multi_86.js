import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GRID_MULTI_86 = createCapabilityPrototypeKernel({
  problemId: 'AC-GRID-MULTI-86',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 86,
    constellationId: 'constellation-8',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-NAV-006'],
  },
  identity: {
    studentTitle: '여러 기지에서 퍼지는 빛',
    subtitle: '격자 grid와 여러 출발점 sources([[r, c], ...])가 주어질 때, 모든 시작점에서 동시에 빛이 퍼져 모든 열린 칸(0)에 도달하는 최소 시간의 최댓값을 반환하세요. 도달하지 못하는 열린 칸이 있으면 -1을 반환합니다.',
  },
  pythonConcepts: {
    requires: ['class:deque', 'syntax:sequence-unpacking', 'syntax:nested-indexing'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:bfs-shortest-path'],
    introduces: ['pattern:multi-source-bfs'],
  },
  evidenceRecipe: {
    primitives: ['grid-frontier', 'ordered-buffer'],
    requiredClaims: ['MULTI_SOURCE_BFS_EXPANSION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '다중 시작점 BFS에서 모든 시작점(sources)의 초기 거리는 얼마로 설정하고 큐에 넣어야 할까요?',
      options: [
        {
          value: 'zero',
          label: '모두 거리 0 — 여러 지점에서 동시에 출발하므로',
        },
        {
          value: 'incremental',
          label: '순서대로 0, 1, 2... 로 다르게 설정한다',
        },
      ],
      expected: 'zero',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '💡 다중 시작점 동시 파동 시뮬레이터',
          description: '여러 광원에서 동시에 빛이 1초에 한 칸씩 퍼져나갑니다. 두 파동이 만나면 이미 도달한 칸은 다시 탐색하지 않습니다.',
          variables: [
            {
              name: 'grid',
              value: '[[0, 0, 0, 0, 0]]',
            },
            {
              name: 'sources',
              value: '[[0, 0], [0, 4]]',
            },
          ],
          guidance: '양쪽 끝에서 동시에 퍼질 때 가운데 칸(0, 2)에 빛이 닿는 데 걸리는 시간을 확인해 보세요.',
        },
        initialState: {
          step: '시작: 두 광원 거리 0 등록',
          queue: ['(0, 0)', '(0, 4)'],
          distTable: '[0, -1, -1, -1, 0]',
          currentTime: 0,
        },
        initialStateLabel: '초기 상태: t = 0',
        initialStepTitle: '동시 확산 시작',
        initialPrompt: '양 끝 (0, 0)과 (0, 4)가 거리 0으로 큐에 들어있습니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① t = 1초: 1칸씩 전진',
            operationLabel: '거리 1 이웃 확산',
            prompt: '(0, 0)에서 (0, 1)로, (0, 4)에서 (0, 3)으로 빛이 퍼져 거리 1이 됩니다.',
            stateAfter: {
              step: 't = 1초 확산',
              queue: ['(0, 1)', '(0, 3)'],
              distTable: '[0, 1, -1, 1, 0]',
              currentTime: 1,
            },
          },
          {
            id: 'f1',
            stepTitle: '② t = 2초: 중앙 (0, 2) 도달',
            operationLabel: '거리 2 이웃 확산',
            prompt: '(0, 1)과 (0, 3)에서 동시에 중앙 (0, 2)에 도달해 거리 2가 됩니다.',
            stateAfter: {
              step: 't = 2초 중앙 합류',
              queue: ['(0, 2)'],
              distTable: '[0, 1, 2, 1, 0]',
              currentTime: 2,
            },
            choicePrompt: '모든 열린 칸에 빛이 닿는 데 걸린 최대 시간은 얼마일까요?',
            expectedOptionId: 'expected',
            operationOptions: [
              {
                id: 'expected',
                label: '2초 (중앙 칸이 마지막으로 도달한 시간)',
                feedback: '맞아요. 양 끝에서 동시에 출발하여 2초 만에 전체가 채워졌어요.',
              },
              {
                id: 'wrong',
                label: '4초 (한쪽 끝에서 반대쪽 끝까지 가는 시간)',
                feedback: '두 곳에서 동시에 퍼지므로 한쪽에서만 갈 때보다 절반의 시간만 걸려요.',
              },
            ],
          },
          {
            id: 'f2',
            stepTitle: '③ 완료: 전체 도달 시간 확정',
            operationLabel: '완료',
            prompt: '모든 열린 칸의 거리 중 최댓값인 2를 반환합니다.',
            stateAfter: {
              step: '완료',
              queue: [],
              distTable: '[0, 1, 2, 1, 0]',
              currentTime: 2,
            },
          },
        ],
        predictionPrompt: '모든 열린 칸에 도달하는 최소 시간의 최댓값을 반환하세요. 도달 불가한 칸이 있으면 -1을 반환합니다.',
        rulePrompt: '다중 시작점 BFS 규칙',
        ruleStatement: '모든 sources를 거리 0으로 큐에 넣고 BFS 확산 후, 도달 못한 0이 있으면 -1, 아니면 최대 도달 시간을 반환한다.',
      },
    },
    code: {
      entryFunction: 'light_fill_time',
      starterCode: `from collections import deque

def light_fill_time(grid, sources):
    # sources의 모든 시작점을 큐에 거리 0으로 넣고 동시 확산 시간을 계산하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          grid: [[0, 0, 0, 0, 0]],
          sources: [[0, 0], [0, 4]],
        },
        expected: 2,
      },
      {
        inputs: {
          grid: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
          ],
          sources: [[0, 0]],
        },
        expected: -1,
      },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_grid_086_1',
        title: '다중 시작점 동시 확산 불변식',
        prompt: '동시 시작 원리와 도달 불가능 판정을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '여러 광원에서 동시에 빛이 출발할 때 각 시작점의 거리를 0으로 두는 이유는 무엇일까요?',
            options: [
              { value: 'same_time', label: '모든 광원이 같은 시점(0초)에 동시에 켜지기 때문' },
              { value: 'single_source', label: '광원 하나만 동작시키기 위해' },
            ],
            expected: 'same_time',
          },
          {
            id: 'q2',
            text: '벽으로 가로막혀 어떤 광원의 빛도 도달하지 못한 열린 칸이 격자에 남아있다면 반환해야 할 값은?',
            options: [
              { value: 'minus_one', label: '-1 (전체 도달 불가능)' },
              { value: 'reached_max', label: '도달한 칸들 중 최댓값' },
            ],
            expected: 'minus_one',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_grid_086_transfer_1',
        title: '비상 방송 도달 시간',
        description: '건물 격자 grid(0: 방, 1: 벽)와 비상 방송국 위치 stations([[r, c], ...])가 주어질 때, 모든 열린 방에 비상 안내가 전달되는 최소 시간(초)을 계산하세요. 도달할 수 없는 방이 있으면 -1을 반환합니다.',
        entryFunction: 'emergency_broadcast_time',
        starterCode: `from collections import deque

def emergency_broadcast_time(grid, stations):
    # 모든 방송국에서 동시에 안내가 퍼져나갈 때 전체 방에 닿는 시간을 계산하세요.
    pass
`,
        contextCard: {
          title: '📢 비상 방송 동시 전파',
          strategyGuide: '모든 방송국 좌표를 변수로 추출해 거리 0으로 큐에 넣고 동시 확산합니다. 도달하지 못한 방이 있으면 -1을 반환합니다.',
        },
        thoughtCheck: {
          question: '열린 방이 3개 있고 방송국이 그 3개 방 모두에 설치되어 있다면 방송 도달 시간은 얼마일까요?',
          options: [
            { value: 'zero', label: '0초 (시작과 동시에 모든 방에 이미 방송국이 있음)' },
            { value: 'three', label: '3초' },
          ],
          expected: 'zero',
        },
        testCases: [
          {
            inputs: {
              grid: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0],
              ],
              stations: [[0, 0], [2, 2]],
            },
            expected: 2,
          },
          {
            inputs: {
              grid: [
                [0, 1],
                [1, 0],
              ],
              stations: [[0, 0]],
            },
            expected: -1,
          },
        ],
      },
    ],
  },
})
