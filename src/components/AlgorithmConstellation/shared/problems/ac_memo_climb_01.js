import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_MEMO_CLIMB_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-MEMO-CLIMB-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 93,
    constellationId: 'constellation-9',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EX',
    prerequisites: ['AC-REC-REPEAT-92'],
  },
  identity: {
    studentTitle: '계단을 오르는 방법',
    subtitle: '1칸 또는 2칸씩 올라 n번째 계단에 도달하는 서로 다른 방법의 수를 메모이제이션(기록표)으로 구하여 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'builtin:range', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:repeat-cost-awareness'],
    introduces: ['pattern:reuse-table'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'indexed-table'],
    requiredClaims: ['MEMOIZATION_TABLE_REUSE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '계단을 1칸 또는 2칸씩 올라갈 때, 3번째 계단에 도달하는 방법은 총 몇 가지일까요?',
      options: [
        {
          value: '3',
          label: '3가지 — (1+1+1), (1+2), (2+1)',
        },
        {
          value: '4',
          label: '4가지',
        },
      ],
      expected: '3',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🪜 계단 오르기 기록표',
          description: '이전에 계산한 계단 오르기 방법의 수를 표(ways)에 보관하고, 다음 계단을 오를 때 즉시 재사용합니다.',
          variables: [
            { name: 'n', label: '목표 계단', value: '4' },
            { name: 'ways', label: '계단별 방법 수', value: '[1, 1]' },
          ],
        },
        predictionPrompt: 'ways[2] = ways[1] + ways[0] = 1 + 1 = 2일 때, 3번째 계단(ways[3])의 방법 수는?',
        rulePrompt: '이미 채운 칸을 다시 계산하지 않고 새 칸을 어떻게 완성하나요?',
        ruleStatement: '작은 문제의 답을 표에 저장하고 꺼내 쓰는 것을 메모이제이션이라고 부르며, 중복 계산을 완전히 없앱니다.',
      },
      frames: [
        {
          id: 'step_seed',
          label: '0칸과 1칸 씨앗',
          explanation: '0번째 계단(시작점) 1가지, 1번째 계단 1가지로 ways = [1, 1]이 준비됩니다.',
          stateBefore: { step: 1, ways: '[1, 1]' },
          stateAfter: { step: 1, ways: '[1, 1]' },
        },
        {
          id: 'step_2',
          label: '2번째 계단 기록',
          explanation: 'ways[1] + ways[0] = 2가지가 ways에 기록됩니다.',
          stateBefore: { step: 1, ways: '[1, 1]' },
          stateAfter: { step: 2, ways: '[1, 1, 2]' },
          operationOptions: [
            { id: 'memo_two', label: 'ways.append(ways[1] + ways[0])' },
            { id: 'memo_wrong', label: 'ways.append(ways[1] + 2)' },
          ],
          expectedOptionId: 'memo_two',
        },
        {
          id: 'step_3',
          label: '3번째 계단 기록',
          explanation: 'ways[2] + ways[1] = 2 + 1 = 3가지가 단 한 번의 덧셈으로 기록됩니다.',
          stateBefore: { step: 2, ways: '[1, 1, 2]' },
          stateAfter: { step: 3, ways: '[1, 1, 2, 3]' },
        },
        {
          id: 'step_4',
          label: '4번째 계단 완성',
          explanation: 'ways[3] + ways[2] = 3 + 2 = 5가지가 되어 최종 답 ways[4]가 반환됩니다.',
          stateBefore: { step: 3, ways: '[1, 1, 2, 3]' },
          stateAfter: { step: 4, ways: '[1, 1, 2, 3, 5]' },
        },
      ],
    },
    code: {
      entryFunction: 'count_climb_ways',
      starterCode: `def count_climb_ways(n):
    # 1칸 또는 2칸씩 올라 n번째 계단에 도달하는 총 방법의 수를 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'stair_memo_growth',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: { n: 3 },
        expected: 3,
      },
      {
        inputs: { n: 4 },
        expected: 5,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_memo_093_1',
        title: '메모이제이션의 핵심 이점',
        prompt: '표를 활용한 상향식 계산의 특성을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: 'n번째 계단을 오르는 방법 수를 구할 때 각 계단의 값을 단 한 번씩만 계산하는 이유는?',
            options: [
              { value: 'table_lookup', label: '이미 구한 작은 답을 표(리스트)에 넣어 두고 필요할 때 즉시 꺼내 쓰기 때문' },
              { value: 'magic_formula', label: '수학 공식이 자동으로 계산해주기 때문' },
            ],
            expected: 'table_lookup',
          },
          {
            id: 'q2',
            text: '이처럼 작은 답을 표에 저장하고 재사용하는 기법을 부르는 용어는?',
            options: [
              { value: 'memoization', label: '메모이제이션(Memoization / 동적 계획법)' },
              { value: 'random_search', label: '무작위 탐색' },
            ],
            expected: 'memoization',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_memo_093_transfer_1',
        title: '1칸 또는 3칸 도약 신호 패턴',
        description: '신호가 1칸 또는 3칸씩 전진할 수 있을 때, n번째 위치에 도달하는 서로 다른 방법의 수를 구하세요 (ways[i] = ways[i-1] + ways[i-3]).',
        entryFunction: 'count_signal_patterns',
        starterCode: `def count_signal_patterns(n):
    # 1칸 또는 3칸 전진하여 n번째 위치에 도달하는 방법 수를 반환하세요.
    pass
`,
        contextCard: {
          title: '📶 3단 도약 신호',
          strategyGuide: 'n=0, 1, 2는 모두 1가지이고, 3부터는 ways[i-1] + ways[i-3]으로 표를 채워나갑니다.',
        },
        thoughtCheck: {
          question: 'n이 3일 때의 도약 방법 수는?',
          options: [
            { value: 'ans_2', label: '2가지 (1+1+1, 3)' },
            { value: 'ans_3', label: '3가지' },
          ],
          expected: 'ans_2',
        },
        testCases: [
          {
            inputs: { n: 3 },
            expected: 2,
          },
          {
            inputs: { n: 4 },
            expected: 3,
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
