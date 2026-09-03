import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_GREEDY_COIN_95 = createCapabilityPrototypeKernel({
  problemId: 'AC-GREEDY-COIN-95',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 95,
    constellationId: 'constellation-9',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EX',
    prerequisites: ['AC-GREEDY-INTERVAL-94', 'AC-ENUM-FILTER-67'],
  },
  identity: {
    studentTitle: '눈앞의 최선이 실패하는 동전',
    subtitle: '동전의 종류 coins와 목표 금액 amount가 주어질 때, amount를 만드는 최소 동전 개수를 구하세요 (불가능하면 -1).',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'operator:comparison-bound', 'builtin:range'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:greedy-earliest-end'],
    introduces: ['pattern:table-over-greedy'],
  },
  evidenceRecipe: {
    primitives: ['indexed-table', 'extreme-selection'],
    requiredClaims: ['DP_OVER_GREEDY_COIN_CHOICE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '동전 종류가 [1, 3, 4]일 때 6원을 만드는 가장 적은 동전 수는 몇 개일까요?',
      options: [
        {
          value: '2',
          label: '2개 (3원 + 3원) — 가장 큰 4원을 먼저 고르면 4+1+1로 3개가 되어 실패',
        },
        {
          value: '3',
          label: '3개 (4원 + 1원 + 1원)',
        },
      ],
      expected: '2',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🪙 동전 교환 최적표',
          description: '큰 동전을 무조건 고르는 탐욕 경로와 모든 작은 금액의 최선을 저장하는 표 경로의 차이를 확인합니다.',
          variables: [
            { name: 'amount', label: '목표 금액', value: '6' },
            { name: 'coins', label: '동전 종류', value: '[1, 3, 4]' },
            { name: 'dp', label: '금액별 최소 동전 수', value: '[0, 1, 2, 1, 1, 2, 2]' },
          ],
        },
        predictionPrompt: 'dp[6]을 채울 때 dp[6-1], dp[6-3], dp[6-4] 중 1을 더했을 때 가장 작은 값은?',
        rulePrompt: '눈앞의 가장 큰 동전만 고르는 방식이 실패할 때 표는 어떻게 진짜 최적을 찾나요?',
        ruleStatement: '표는 이전의 모든 가능성을 점검하여 dp[a] = min(dp[a - c] + 1)로 빈틈없는 최적을 보장합니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '0원 초기화',
          explanation: '0원은 동전 0개로 만들 수 있으므로 dp[0] = 0에서 출발합니다.',
          stateBefore: { amount: 0, coins_used: 0 },
          stateAfter: { amount: 0, coins_used: 0 },
        },
        {
          id: 'step_divergence',
          label: '6원에서의 갈림길',
          explanation: '탐욕 경로는 4원을 골라 남은 2원을 1+1로 채워 3개가 되지만, 표는 dp[6-3]+1 = dp[3]+1 = 1+1 = 2개를 발견합니다.',
          stateBefore: { greedy_result: 3, dp_result: null },
          stateAfter: { greedy_result: 3, dp_result: 2 },
          operationOptions: [
            { id: 'choose_dp_best', label: '표를 참조하여 2개(3+3) 선택' },
            { id: 'choose_greedy', label: '가장 큰 4원 선택 (4+1+1 = 3개)' },
          ],
          expectedOptionId: 'choose_dp_best',
        },
        {
          id: 'step_complete',
          label: '전체 금액 최적표 완성',
          explanation: '0원부터 6원까지의 최적표 dp = [0, 1, 2, 1, 1, 2, 2]가 완성되어 최종 2가 도출됩니다.',
          stateBefore: { greedy_result: 3, dp_result: 2 },
          stateAfter: { best_answer: 2 },
        },
      ],
    },
    code: {
      entryFunction: 'min_coins',
      starterCode: `def min_coins(coins, amount):
    # 주어진 동전으로 amount를 만드는 최소 동전 수를 반환하세요 (불가능 시 -1).
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'coin_change_dp_table',
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
          coins: [1, 3, 4],
          amount: 6,
        },
        expected: 2,
      },
      {
        inputs: {
          coins: [1, 2, 5],
          amount: 11,
        },
        expected: 3,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_greedy_095_1',
        title: '탐욕 알고리즘의 실패와 DP의 보장',
        prompt: '동전 문제에서 탐욕과 표 기반 접근의 차이를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '동전 [1, 3, 4]에서 6원을 만들 때 큰 동전 우선 탐욕이 실패하는 이유는?',
            options: [
              { value: 'local_optimal_trap', label: '눈앞의 가장 큰 4원을 고르면 남은 2원을 채우는 데 비효율적인 동전 2개가 추가되기 때문' },
              { value: 'no_answer', label: '6원을 만드는 방법이 없기 때문' },
            ],
            expected: 'local_optimal_trap',
          },
          {
            id: 'q2',
            text: '상향식 표(dp)가 항상 최소 동전 수를 보장할 수 있는 이유는?',
            options: [
              { value: 'check_all_coins', label: '각 금액마다 사용할 수 있는 모든 동전을 시험하여 가장 작은 값을 선택하기 때문' },
              { value: 'always_greedy', label: '동전을 무작위로 섞어서 고르기 때문' },
            ],
            expected: 'check_all_coins',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_greedy_095_transfer_1',
        title: '우표 최소 장수 붙이기',
        description: '우표 액면가 values와 목표 요금 total이 주어질 때, total을 정확히 맞추는 최소 우표 장수를 구하세요.',
        entryFunction: 'min_stamps',
        starterCode: `def min_stamps(values, total):
    # 최소 우표 장수를 반환하세요 (불가능 시 -1).
    pass
`,
        contextCard: {
          title: '📮 우표 요금 계산',
          strategyGuide: 'dp[0]=0에서 출발하여 각 요금 t마다 모든 우표 v에 대해 dp[t-v]+1의 최솟값을 기록합니다.',
        },
        thoughtCheck: {
          question: '우표 [1, 4, 5]로 8원을 만들 때 최소 우표 수는?',
          options: [
            { value: 'ans_2', label: '2장 (4 + 4)' },
            { value: 'ans_4', label: '4장 (5 + 1 + 1 + 1)' },
          ],
          expected: 'ans_2',
        },
        testCases: [
          {
            inputs: {
              values: [1, 3],
              total: 4,
            },
            expected: 2,
          },
          {
            inputs: {
              values: [1, 4, 5],
              total: 6,
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
