import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GREEDY_INTERVAL_94 = createCapabilityPrototypeKernel({
  problemId: 'AC-GREEDY-INTERVAL-94',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 94,
    constellationId: 'constellation-9',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EX',
    prerequisites: ['AC-SORT-MIN-01', 'AC-ENUM-BEST-68'],
  },
  identity: {
    studentTitle: '가장 많은 탐사 임무 선택',
    subtitle: '각 임무의 시작 시각 starts와 종료 시각 ends가 주어질 때, 시간이 겹치지 않게 수행할 수 있는 최대 임무 수를 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'operator:comparison-bound', 'operator:and'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:greedy-earliest-end'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'extreme-selection'],
    requiredClaims: ['EARLIEST_END_GREEDY_CHOICE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '겹치지 않게 가장 많은 임무를 하려면 후보 임무 중 어떤 것을 가장 먼저 선택해야 할까요?',
      options: [
        {
          value: 'earliest_end',
          label: '끝나는 시각이 가장 빠른 임무 — 그래야 뒤에 다른 임무를 할 수 있는 여유 시간이 가장 많이 남기 때문',
        },
        {
          value: 'earliest_start',
          label: '시작 시각이 가장 이른 임무',
        },
      ],
      expected: 'earliest_end',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⏱️ 탐사 임무 스케줄러',
          description: '현재 시각 이후에 시작하는 임무들 중 가장 일찍 종료되는 임무를 탐욕적으로 하나씩 확정합니다.',
          variables: [
            { name: 'free_from', label: '다음 가능 시각', value: '0' },
            { name: 'count', label: '선택된 임무 수', value: '0' },
          ],
        },
        predictionPrompt: '임무 [1~3], [2~5], [4~6], [6~8] 중 free_from=0일 때 가장 먼저 선택해야 할 임무는?',
        rulePrompt: '임무를 하나 선택할 때마다 다음 임무를 탐색하는 기준 시각 free_from은 어떻게 갱신되나요?',
        ruleStatement: '선택한 임무의 종료 시각으로 free_from을 갱신하며, 종료가 가장 빠른 임무를 우선 선택하는 것이 항상 최적입니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '초기 상태',
          explanation: '시작 시각 0부터 가능하며, 아무 임무도 선택되지 않은 상태입니다.',
          stateBefore: { free_from: 0, count: 0 },
          stateAfter: { free_from: 0, count: 0 },
        },
        {
          id: 'step_pick_first',
          label: '첫 번째 임무 선택',
          explanation: '끝나는 시각이 가장 이른 [1~3]을 선택하고 free_from을 3으로 갱신합니다.',
          stateBefore: { free_from: 0, count: 0 },
          stateAfter: { free_from: 3, count: 1 },
          operationOptions: [
            { id: 'pick_1_3', label: '종료 시각 3인 임무 선택 (free_from=3)' },
            { id: 'pick_2_5', label: '종료 시각 5인 임무 선택 (free_from=5)' },
          ],
          expectedOptionId: 'pick_1_3',
        },
        {
          id: 'step_pick_second',
          label: '두 번째 임무 선택',
          explanation: '3 이후에 시작하는 [4~6]과 [6~8] 중 끝이 빠른 [4~6]을 선택합니다 (free_from=6).',
          stateBefore: { free_from: 3, count: 1 },
          stateAfter: { free_from: 6, count: 2 },
        },
        {
          id: 'step_pick_third',
          label: '세 번째 임무 선택',
          explanation: '6 이후에 시작하는 [6~8]을 선택하여 총 3개의 임무를 수행합니다.',
          stateBefore: { free_from: 6, count: 2 },
          stateAfter: { free_from: 8, count: 3 },
        },
      ],
    },
    code: {
      entryFunction: 'max_missions',
      starterCode: `def max_missions(starts, ends):
    # 겹치지 않게 선택할 수 있는 최대 임무 수를 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'interval_greedy_scheduler',
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
          starts: [1, 2, 4, 6],
          ends: [3, 5, 6, 8],
        },
        expected: 3,
      },
      {
        inputs: {
          starts: [1, 3],
          ends: [4, 5],
        },
        expected: 1,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_greedy_094_1',
        title: '종료 시각 우선 탐욕의 정당성',
        prompt: '가장 일찍 끝나는 임무를 선택하는 이유를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '시작 시각이 가장 빠른 임무를 우선 선택했을 때 발생할 수 있는 문제는?',
            options: [
              { value: 'blocks_others', label: '매우 긴 임무 하나가 다른 짧은 임무 여러 개를 가로막을 수 있다' },
              { value: 'never_fails', label: '항상 최선의 결과가 나온다' },
            ],
            expected: 'blocks_others',
          },
          {
            id: 'q2',
            text: '임무를 하나 확정할 때마다 다음 가능 시각 free_from을 어떻게 갱신해야 할까요?',
            options: [
              { value: 'update_end', label: '방금 선택한 임무의 종료 시각으로 갱신한다' },
              { value: 'keep_zero', label: '0으로 그대로 둔다' },
            ],
            expected: 'update_end',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_greedy_094_transfer_1',
        title: '최대 방송 슬롯 배정',
        description: '각 방송 프로그램의 시작 시각과 종료 시각이 주어질 때, 시간이 겹치지 않게 송출할 수 있는 최대 프로그램 수를 구하세요.',
        entryFunction: 'max_broadcast_slots',
        starterCode: `def max_broadcast_slots(starts, ends):
    # 겹치지 않는 최대 방송 슬롯 수를 반환하세요.
    pass
`,
        contextCard: {
          title: '📻 방송 슬롯 최적화',
          strategyGuide: '현재 시각 이후에 시작하는 슬롯 중 종료 시각이 가장 빠른 것을 반복 선택합니다.',
        },
        thoughtCheck: {
          question: '슬롯 [0~10], [1~3], [4~6]이 있을 때 올바른 최대 선택 수는?',
          options: [
            { value: 'ans_2', label: '2개 ([1~3], [4~6])' },
            { value: 'ans_1', label: '1개 ([0~10])' },
          ],
          expected: 'ans_2',
        },
        testCases: [
          {
            inputs: {
              starts: [1, 2],
              ends: [3, 4],
            },
            expected: 1,
          },
          {
            inputs: {
              starts: [1, 4],
              ends: [3, 6],
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
