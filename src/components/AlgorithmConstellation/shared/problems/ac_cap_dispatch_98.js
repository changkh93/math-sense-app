import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_CAP_DISPATCH_98 = createCapabilityPrototypeKernel({
  problemId: 'AC-CAP-DISPATCH-98',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 98,
    constellationId: 'constellation-9',
    routeRole: 'capstone',
    learningRole: 'synthesis',
    recommendedBand: 'EX',
    prerequisites: ['AC-NAV-005', 'AC-SORT-MIN-01'],
  },
  identity: {
    studentTitle: '우주 화물 관제소',
    subtitle: '도착한 화물들의 우선순위 priorities가 주어질 때, 높은 우선순위 먼저, 동률일 경우 먼저 도착한(낮은 인덱스) 순서대로 처리하는 인덱스 목록을 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'operator:comparison-bound', 'builtin:range'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:fifo-processing', 'pattern:argmax-by-associated-value'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'stable-tie-selection'],
    requiredClaims: ['CAPSTONE_CARGO_DISPATCH_ORDER'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '화물 우선순위 [1, 5, 2, 5, 3]에서 1순위와 2순위로 처리되어야 하는 화물 인덱스는?',
      options: [
        {
          value: 'idx_1_then_3',
          label: '인덱스 1 다음 인덱스 3 — 둘 다 최고 우선순위 5이지만 1번이 먼저 도착했기 때문',
        },
        {
          value: 'idx_3_then_1',
          label: '인덱스 3 다음 인덱스 1',
        },
      ],
      expected: 'idx_1_then_3',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🛰️ 화물 도크 관제 시스템',
          description: '남은 화물 중 우선순위가 가장 높고 도착이 빠른 화물을 하나씩 골라 출항 대기열에 배치합니다.',
          variables: [
            { name: 'priorities', label: '화물 우선순위', value: '[1, 5, 2, 5, 3]' },
            { name: 'order', label: '처리 순서', value: '[1, 3, 4, 2, 0]' },
          ],
        },
        predictionPrompt: '아직 처리되지 않은 화물 중 최고 우선순위가 동률일 때 어떤 화물이 먼저 선택되나요?',
        rulePrompt: '선택된 화물을 중복 선택하지 않고 동률을 안정적으로 처리하는 규칙은 무엇인가요?',
        ruleStatement: 'used 목록으로 처리 여부를 기록하고, 엄격한 초과(>) 비교를 통해 동률 시 항상 먼저 도착한 낮은 인덱스를 보존합니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '도크 대기 상태',
          explanation: '모든 화물이 미처리 상태(used = [False, ...])이며 결과 순서 목록은 비어있습니다.',
          stateBefore: { count: 0, order: '[]' },
          stateAfter: { count: 0, order: '[]' },
        },
        {
          id: 'step_pick_first_five',
          label: '첫 번째 5 우선순위 화물 출항',
          explanation: '인덱스 1과 3 중 먼저 도착한 인덱스 1을 선택하여 order에 추가합니다.',
          stateBefore: { count: 0, order: '[]' },
          stateAfter: { count: 1, order: '[1]' },
          operationOptions: [
            { id: 'pick_idx_1', label: '인덱스 1 선택 (동률 중 앞선 순서)' },
            { id: 'pick_idx_3', label: '인덱스 3 선택' },
          ],
          expectedOptionId: 'pick_idx_1',
        },
        {
          id: 'step_pick_second_five',
          label: '두 번째 5 우선순위 화물 출항',
          explanation: '남은 화물 중 최고 우선순위인 인덱스 3을 선택합니다.',
          stateBefore: { count: 1, order: '[1]' },
          stateAfter: { count: 2, order: '[1, 3]' },
        },
        {
          id: 'step_complete',
          label: '전체 화물 출항 순서 완성',
          explanation: '이어서 3(인덱스 4), 2(인덱스 2), 1(인덱스 0) 순으로 처리되어 [1, 3, 4, 2, 0]이 확정됩니다.',
          stateBefore: { count: 2, order: '[1, 3]' },
          stateAfter: { count: 5, order: '[1, 3, 4, 2, 0]' },
        },
      ],
    },
    code: {
      entryFunction: 'dispatch_order',
      starterCode: `def dispatch_order(priorities):
    # 높은 우선순위 먼저, 동률은 먼저 도착한 순서대로 인덱스 목록을 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'cargo_priority_dispatch',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: { priorities: [1, 5, 2, 5, 3] },
        expected: [1, 3, 4, 2, 0],
      },
      {
        inputs: { priorities: [3, 1, 2] },
        expected: [0, 2, 1],
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_cap_098_1',
        title: '우선순위 동률 처리와 관제 원리',
        prompt: '화물 처리 우선순위 규칙을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '화물들의 우선순위가 모두 동일할 때(예: [3, 3, 3]) 반환되어야 하는 순서는?',
            options: [
              { value: 'fifo_order', label: '[0, 1, 2] (먼저 도착한 순서 그대로)' },
              { value: 'reverse_order', label: '[2, 1, 0]' },
            ],
            expected: 'fifo_order',
          },
          {
            id: 'q2',
            text: '스캔 과정에서 이미 출항한 화물을 다시 선택하지 않기 위해 사용하는 기법은?',
            options: [
              { value: 'used_array', label: '각 화물의 처리 여부를 기록하는 used 불리언 목록' },
              { value: 'del_keyword', label: '화물 목록을 매번 지우기' },
            ],
            expected: 'used_array',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_cap_098_transfer_1',
        title: '구급 응급도 분류 순서',
        description: '환자들의 응급도 severities(높을수록 응급)가 도착 순서대로 주어질 때, 치료받을 환자 인덱스 순서를 구하세요 (동률은 먼저 도착한 환자 우선).',
        entryFunction: 'rescue_triage',
        starterCode: `def rescue_triage(severities):
    # 응급도 순(동률 시 도착순) 인덱스 목록을 반환하세요.
    pass
`,
        contextCard: {
          title: '🏥 응급도 관제',
          strategyGuide: '미치료 환자 중 응급도가 가장 높고 인덱스가 가장 낮은 환자를 한 명씩 선별합니다.',
        },
        thoughtCheck: {
          question: '응급도 [2, 4, 4]의 치료 순서는?',
          options: [
            { value: 'ans_1_2_0', label: '[1, 2, 0]' },
            { value: 'ans_2_1_0', label: '[2, 1, 0]' },
          ],
          expected: 'ans_1_2_0',
        },
        testCases: [
          {
            inputs: { severities: [3, 1] },
            expected: [0, 1],
          },
          {
            inputs: { severities: [2, 4, 4] },
            expected: [1, 2, 0],
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
