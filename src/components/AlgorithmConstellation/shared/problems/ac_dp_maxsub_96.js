import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DP_MAXSUB_96 = createCapabilityPrototypeKernel({
  problemId: 'AC-DP-MAXSUB-96',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 96,
    constellationId: 'constellation-9',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EX',
    prerequisites: ['AC-MEMO-CLIMB-01', 'AC-SEQ-RUNNING-35'],
  },
  identity: {
    studentTitle: '연속 에너지 구간의 최고점',
    subtitle: '에너지 측정치 목록 values가 주어질 때, 연속된 부분 구간의 합 중 최댓값을 구하여 반환하세요 (빈 구간은 없으며 모두 음수이면 최댓값 한 원소).',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'builtin:range', 'operator:comparison-bound'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:reuse-table'],
    introduces: ['pattern:running-best-reset'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'extreme-selection'],
    requiredClaims: ['KADANE_RUNNING_BEST_RESET'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '연속 에너지 구간의 합을 구할 때 이전 누적합이 -5이고 현재 숫자가 4라면 어떻게 하는 것이 유리할까요?',
      options: [
        {
          value: 'reset_to_current',
          label: '-5를 버리고 4부터 새로 시작하는 것이 유리하다 (-5 + 4 = -1보다 4가 더 크기 때문)',
        },
        {
          value: 'keep_accumulating',
          label: '-5에 4를 계속 누적하는 것이 유리하다',
        },
      ],
      expected: 'reset_to_current',
    },
    explore: {
      lensId: 'sequence-accumulator',
      lensConfig: {
        sampleStream: [-2, 1, -3, 4, -1, 2, 1, -5, 4],
        filterPredicate: 'cur + val > val',
        accumulatorVar: 'best',
      },
      allowedManipulations: ['step_capsule_pointer'],
    },
    code: {
      entryFunction: 'max_energy',
      starterCode: `def max_energy(values):
    # 연속된 부분 구간의 합 중 최댓값을 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'energy_subarray_stream',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: { values: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expected: 6,
      },
      {
        inputs: { values: [5, 4, -1, 7, 8] },
        expected: 23,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_dp_096_1',
        title: '구간 리셋과 카데인 알고리즘',
        prompt: '이전 누적을 버리고 새로 출발하는 기준을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '모든 원소가 음수(예: [-5, -2, -8])일 때 올바른 최댓값은 무엇일까요?',
            options: [
              { value: 'max_negative', label: '-2 (빈 구간이 허용되지 않으므로 가장 큰 음수 한 원소)' },
              { value: 'zero', label: '0' },
            ],
            expected: 'max_negative',
          },
          {
            id: 'q2',
            text: '현재 원소를 더해 누적을 이어갈지, 현재 원소부터 새로 시작할지 결정하는 기준은?',
            options: [
              { value: 'current_plus_v_vs_v', label: '이전 누적에 현재 값을 더한 결과(cur + v)가 현재 값(v)보다 큰지 비교' },
              { value: 'check_sign', label: '현재 값이 양수인지 음수인지 여부만 확인' },
            ],
            expected: 'current_plus_v_vs_v',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_dp_096_transfer_1',
        title: '연속 관측 신호 이득',
        description: '연속 관측치 readings가 주어질 때, 연속된 구간에서의 최대 누적 신호 이득을 구하세요.',
        entryFunction: 'max_signal_gain',
        starterCode: `def max_signal_gain(readings):
    # 연속 구간의 최대 신호 이득을 반환하세요.
    pass
`,
        contextCard: {
          title: '📶 연속 이득 최고점',
          strategyGuide: 'cur = max(v, cur + v)로 각 원소에서의 최고 연속합을 구하며 전체 최고 기록(best)을 갱신합니다.',
        },
        thoughtCheck: {
          question: '관측치 [-3, -1, -4]에서 최대 신호 이득은?',
          options: [
            { value: 'ans_minus_1', label: '-1' },
            { value: 'ans_0', label: '0' },
          ],
          expected: 'ans_minus_1',
        },
        testCases: [
          {
            inputs: { readings: [1, -2, 3] },
            expected: 3,
          },
          {
            inputs: { readings: [1, -2, 3, 5, -1, 2] },
            expected: 9,
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
