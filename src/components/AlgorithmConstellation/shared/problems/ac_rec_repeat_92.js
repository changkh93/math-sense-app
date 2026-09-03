import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_REC_REPEAT_92 = createCapabilityPrototypeKernel({
  problemId: 'AC-REC-REPEAT-92',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 92,
    constellationId: 'constellation-9',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EX',
    prerequisites: ['AC-REC-BASE-91'],
  },
  identity: {
    studentTitle: '같은 계산을 또 했다',
    subtitle: '나이브하게 스스로를 두 번 부르는 방식으로 n번째 답을 구할 때, 작은 문제를 여는 총 횟수를 계산하여 반환하세요.',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'builtin:range', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:shrinking-structure'],
    introduces: ['pattern:repeat-cost-awareness'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer', 'indexed-table'],
    requiredClaims: ['REPEAT_COST_COMPUTATION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '기억표 없이 f(4)를 펼치면 f(2)는 몇 번이나 중복 계산될까요?',
      options: [
        {
          value: 'three_times',
          label: '3번 — 왼쪽 가지와 오른쪽 가지에서 여러 번 펼쳐지기 때문',
        },
        {
          value: 'once',
          label: '1번만 계산된다',
        },
      ],
      expected: 'three_times',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🌳 중복 호출 비용 관측기',
          description: '기억하지 않고 작은 문제를 부를 때 발생하는 호출 횟수를 점화식(work[i] = work[i-1] + work[i-2] + 1)으로 추적합니다.',
          variables: [
            { name: 'n', label: '목표 크기', value: '5' },
            { name: 'work', label: '크기별 호출 횟수 표', value: '[1, 1]' },
          ],
        },
        predictionPrompt: '크기 2의 호출 횟수는 이전 두 단계의 횟수(1 + 1)에 자기 자신(1)을 더해 몇 번이 될까요?',
        rulePrompt: '각 단계를 열 때 발생하는 비용은 이전 단계들과 어떤 관계가 있나요?',
        ruleStatement: '작은 문제들의 비용 합에 자기 자신을 여는 비용 1이 더해져 호출 횟수가 기하급수적으로 증가합니다.',
      },
      frames: [
        {
          id: 'step_seed',
          label: '기본 호출 횟수',
          explanation: '0과 1은 즉시 답을 얻으므로 호출 횟수는 각각 1번입니다 (work = [1, 1]).',
          stateBefore: { n: 1, count: 1 },
          stateAfter: { n: 1, count: 1 },
        },
        {
          id: 'step_n_2',
          label: '크기 2의 호출 횟수',
          explanation: 'work[1] + work[0] + 1 = 1 + 1 + 1 = 3번이 됩니다.',
          stateBefore: { n: 1, count: 1 },
          stateAfter: { n: 2, count: 3 },
          operationOptions: [
            { id: 'work_add_one', label: 'work.append(work[1] + work[0] + 1)' },
            { id: 'work_only_sum', label: 'work.append(work[1] + work[0])' },
          ],
          expectedOptionId: 'work_add_one',
        },
        {
          id: 'step_n_3',
          label: '크기 3의 호출 횟수',
          explanation: 'work[2] + work[1] + 1 = 3 + 1 + 1 = 5번으로 불어납니다.',
          stateBefore: { n: 2, count: 3 },
          stateAfter: { n: 3, count: 5 },
        },
        {
          id: 'step_n_5',
          label: '크기 5의 호출 횟수',
          explanation: '크기 5는 15번의 호출이 발생하여 작은 문제들이 걷잡을 수 없이 반복됨을 보여줍니다.',
          stateBefore: { n: 3, count: 5 },
          stateAfter: { n: 5, count: 15 },
        },
      ],
    },
    code: {
      entryFunction: 'count_repeat_work',
      starterCode: `def count_repeat_work(n):
    # 나이브 분해로 n의 답을 구할 때 작은 문제를 여는 총 횟수를 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'call_tree_growth',
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
        expected: 3,
      },
      {
        inputs: { n: 5 },
        expected: 15,
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_rec_092_1',
        title: '반복 호출 비용의 증가',
        prompt: '기억하지 않는 단순 분해의 비용 특성을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '크기 5일 때 호출 수가 15번으로 불어나는 근본적인 이유는?',
            options: [
              { value: 'redundant_subtree', label: '이미 해결한 하위 문제들이 가지마다 중복으로 다시 계산되기 때문' },
              { value: 'calculation_error', label: '계산 공식이 틀렸기 때문' },
            ],
            expected: 'redundant_subtree',
          },
          {
            id: 'q2',
            text: '만약 구한 답을 표에 저장하고 꺼내 쓴다면 n=25를 구할 때 필요한 계산 횟수는 대략 몇 번일까요?',
            options: [
              { value: 'linear_n', label: '25번 안팎 (각 칸을 한 번씩만 채움)' },
              { value: 'huge_repeat', label: '24만 번 이상' },
            ],
            expected: 'linear_n',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_rec_092_transfer_1',
        title: '두 갈래 탐사의 중복 방문 수',
        description: '두 갈래로 뻗어나가는 탐사 경로에서 단계 spans가 주어질 때, 같은 지점을 반복 방문하는 총 횟수를 점화 관계를 통해 계산하여 반환하세요.',
        entryFunction: 'count_duplicate_visits',
        starterCode: `def count_duplicate_visits(spans):
    # spans 단계에서의 총 방문 횟수를 반환하세요.
    pass
`,
        contextCard: {
          title: '🌲 갈래길 탐사 비용',
          strategyGuide: 'spans가 0이나 1이면 1번, 그 이후는 work[i-1] + work[i-2] + 1로 누적 계산합니다.',
        },
        thoughtCheck: {
          question: 'spans가 3일 때의 총 방문 횟수는?',
          options: [
            { value: 'ans_5', label: '5회 (3 + 1 + 1)' },
            { value: 'ans_4', label: '4회' },
          ],
          expected: 'ans_5',
        },
        testCases: [
          {
            inputs: { spans: 1 },
            expected: 1,
          },
          {
            inputs: { spans: 2 },
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
