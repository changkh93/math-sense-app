import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_REC_BASE_91 = createCapabilityPrototypeKernel({
  problemId: 'AC-REC-BASE-91',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 91,
    constellationId: 'constellation-9',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EX',
    prerequisites: ['AC-SEQ-RUNNING-35', 'AC-PAT-003'],
  },
  identity: {
    studentTitle: '작아지는 구조의 신호 타워',
    subtitle: '신호 타워를 1칸 또는 2칸 블록으로 채울 때, 0부터 n칸 크기까지 각 높이를 채우는 방법의 수를 담은 표 전체를 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'builtin:range', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:shrinking-structure'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'indexed-table'],
    requiredClaims: ['SHRINKING_STRUCTURE_DECOMPOSITION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '신호 타워 3칸을 채우는 방법은 2칸을 채우는 방법의 수와 1칸을 채우는 방법의 수와 어떤 관계가 있을까요?',
      options: [
        {
          value: 'sum_of_previous_two',
          label: '2칸 타워에 1칸 블록을 올리는 방법과, 1칸 타워에 2칸 블록을 올리는 방법의 합이다',
        },
        {
          value: 'double_of_previous',
          label: '2칸 타워의 방법 수에 단순히 2를 곱한 것이다',
        },
      ],
      expected: 'sum_of_previous_two',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📐 신호 타워 블록 조립기',
          description: '0칸과 1칸의 기본 답(씨앗)에서 시작해 이전 두 칸의 합으로 다음 칸의 답을 조립해 나갑니다.',
          variables: [
            { name: 'n', label: '목표 높이', value: '6' },
            { name: 'table', label: '높이별 답 기록표', value: '[1, 1]' },
          ],
        },
        predictionPrompt: '높이 2칸 타워를 채우는 방법(table[2])은 이전 두 값(table[1] + table[0])을 더해 몇 가지가 될까요?',
        rulePrompt: '더 큰 높이의 답을 만들 때 이전 단계의 작은 답들을 어떻게 재활용하나요?',
        ruleStatement: '스스로를 부르는 표현을 재귀라고 부르며, 우리는 같은 원리를 아래에서 위로 작은 답들을 표로 조립하여 해결합니다.',
      },
      frames: [
        {
          id: 'step_seed',
          label: '기본 씨앗 배치',
          explanation: '높이 0칸은 아무것도 놓지 않는 1가지, 높이 1칸은 1칸 블록 1가지로 table = [1, 1]이 준비됩니다.',
          stateBefore: { height: 1, table: '[1, 1]' },
          stateAfter: { height: 1, table: '[1, 1]' },
        },
        {
          id: 'step_height_2',
          label: '높이 2칸 조립',
          explanation: 'table[1] + table[0] = 1 + 1 = 2가지 방법이 table에 추가됩니다.',
          stateBefore: { height: 1, table: '[1, 1]' },
          stateAfter: { height: 2, table: '[1, 1, 2]' },
          operationOptions: [
            { id: 'add_two', label: 'table.append(table[1] + table[0])' },
            { id: 'add_three', label: 'table.append(3)' },
          ],
          expectedOptionId: 'add_two',
        },
        {
          id: 'step_height_3',
          label: '높이 3칸 조립',
          explanation: 'table[2] + table[1] = 2 + 1 = 3가지 방법이 추가됩니다.',
          stateBefore: { height: 2, table: '[1, 1, 2]' },
          stateAfter: { height: 3, table: '[1, 1, 2, 3]' },
        },
        {
          id: 'step_complete',
          label: '높이 6칸 완성',
          explanation: '같은 방식으로 n칸까지 이어붙여 전체 표 [1, 1, 2, 3, 5, 8, 13]이 완성됩니다.',
          stateBefore: { height: 3, table: '[1, 1, 2, 3]' },
          stateAfter: { height: 6, table: '[1, 1, 2, 3, 5, 8, 13]' },
        },
      ],
    },
    code: {
      entryFunction: 'build_small_answers',
      starterCode: `def build_small_answers(n):
    # 0칸부터 n칸 크기까지 각 높이를 채우는 방법의 수를 담은 표 전체를 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'tower_block_growth',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: { n: 2 },
        expected: [1, 1, 2],
      },
      {
        inputs: { n: 6 },
        expected: [1, 1, 2, 3, 5, 8, 13],
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_rec_091_1',
        title: '작아지는 구조의 조립 원리',
        prompt: '큰 문제가 작은 문제들로 분해되는 구조를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '높이 5칸의 답 table[5]를 구하기 위해 직접 더해야 하는 두 칸은 무엇일까요?',
            options: [
              { value: 'prev_two', label: 'table[4]와 table[3]' },
              { value: 'first_two', label: 'table[0]과 table[1]' },
            ],
            expected: 'prev_two',
          },
          {
            id: 'q2',
            text: '표의 0번째 칸과 1번째 칸(씨앗)을 미리 정해 두어야 하는 이유는 무엇일까요?',
            options: [
              { value: 'base_case', label: '더 작은 문제로 쪼갤 수 없는 가장 단순한 기본 상태이기 때문' },
              { value: 'no_reason', label: '규칙상 아무 값이나 채워야 하기 때문' },
            ],
            expected: 'base_case',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_rec_091_transfer_1',
        title: '신호 성장 관측 표',
        description: '일수 days(0 이상)가 주어질 때, 0일부터 days일까지 매일 어제와 그저께의 크기가 더해져 자라나는 신호 크기 목록 전체를 반환하세요.',
        entryFunction: 'signal_growth_table',
        starterCode: `def signal_growth_table(days):
    # 0일부터 days일까지의 신호 크기 목록을 반환하세요.
    pass
`,
        contextCard: {
          title: '📡 신호 성장 추적',
          strategyGuide: '0일(1)과 1일(1)의 씨앗을 먼저 놓고, 2일부터 days일까지 이전 두 날의 값을 더해 표에 append합니다.',
        },
        thoughtCheck: {
          question: 'days가 0일 때 반환되어야 하는 목록의 길이는?',
          options: [
            { value: 'len_1', label: '길이 1의 [1]' },
            { value: 'len_0', label: '빈 목록 []' },
          ],
          expected: 'len_1',
        },
        testCases: [
          {
            inputs: { days: 2 },
            expected: [1, 1, 2],
          },
          {
            inputs: { days: 3 },
            expected: [1, 1, 2, 3],
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
