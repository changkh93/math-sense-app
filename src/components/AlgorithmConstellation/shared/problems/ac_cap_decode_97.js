import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_CAP_DECODE_97 = createCapabilityPrototypeKernel({
  problemId: 'AC-CAP-DECODE-97',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 97,
    constellationId: 'constellation-9',
    routeRole: 'capstone',
    learningRole: 'synthesis',
    recommendedBand: 'EX',
    prerequisites: ['AC-STR-COMPRESS-39', 'AC-DICT-FREQ-44'],
  },
  identity: {
    studentTitle: '외계 언어 해독기',
    subtitle: '압축된 신호 쌍 pairs가 주어질 때 [총 길이, 심볼별 총 등장 빈도표(문자열 key), 최다 등장 심볼]을 반환하세요 (빈 입력은 [0, {}, \'\'], 최다 심볼 동률은 첫 등장 우선).',
  },
  pythonConcepts: {
    requires: ['statement:for', 'statement:if', 'operator:equality', 'operator:membership-in'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:frequency-table', 'pattern:run-boundary-flush'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['dictionary-accumulator', 'linear-aggregation'],
    requiredClaims: ['CAPSTONE_ALIEN_SIGNAL_DECODE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '신호 쌍 [[3, \'A\'], [2, \'B\'], [3, \'A\']]에서 \'A\'의 총 등장 횟수와 최다 심볼은 무엇일까요?',
      options: [
        {
          value: 'a_six',
          label: '\'A\'는 3 + 3 = 6회 등장하며 최다 심볼이다 (총 길이 8, \'B\'는 2회)',
        },
        {
          value: 'a_three',
          label: '\'A\'는 3회 등장한다',
        },
      ],
      expected: 'a_six',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🛸 외계 통신 신호 해독기',
          description: '반복 압축된 신호 블록들을 풀면서 총 길이와 심볼별 빈도 사전을 누적하고 최다 빈도 심볼을 도출합니다.',
          variables: [
            { name: 'pairs', label: '신호 블록 목록', value: "[[3, 'A'], [2, 'B'], [3, 'A']]" },
            { name: 'freq', label: '심볼 빈도 사전', value: "{'A': 6, 'B': 2}" },
          ],
        },
        predictionPrompt: "pairs = [[2, 'X'], [2, 'Y']]일 때 빈도가 같은 두 심볼 중 최다 심볼로 선택되는 것은?",
        rulePrompt: '같은 심볼이 여러 블록에 나뉘어 들어올 때 사전에 어떻게 합산하나요?',
        ruleStatement: '동일 심볼의 개수를 누적 합산하고, 최다 심볼이 동률일 경우 신호상 먼저 등장한 심볼을 확정합니다.',
      },
      frames: [
        {
          id: 'step_init',
          label: '해독기 초기화',
          explanation: '총 길이 0, 빈 딕셔너리 {}, 첫 등장 순서 목록 []로 초기화합니다.',
          stateBefore: { total: 0, freq: '{}' },
          stateAfter: { total: 0, freq: '{}' },
        },
        {
          id: 'step_first_block',
          label: "첫 블록 [3, 'A'] 처리",
          explanation: "총 길이에 3을 더하고, 사전에 'A': 3을 기록합니다.",
          stateBefore: { total: 0, freq: '{}' },
          stateAfter: { total: 3, freq: "{'A': 3}" },
          operationOptions: [
            { id: 'add_block_a', label: "freq['A'] = freq.get('A', 0) + 3" },
            { id: 'skip_block', label: "다음 블록으로 넘어가기" },
          ],
          expectedOptionId: 'add_block_a',
        },
        {
          id: 'step_second_block',
          label: "두 번째 블록 [2, 'B'] 처리",
          explanation: "총 길이 5, 사전에 'B': 2가 추가됩니다.",
          stateBefore: { total: 3, freq: "{'A': 3}" },
          stateAfter: { total: 5, freq: "{'A': 3, 'B': 2}" },
        },
        {
          id: 'step_merge_block',
          label: "세 번째 블록 [3, 'A'] 합산",
          explanation: "이미 존재하는 'A'의 빈도 3에 3을 더해 6이 되며, 최종 최다 심볼은 'A'가 됩니다.",
          stateBefore: { total: 5, freq: "{'A': 3, 'B': 2}" },
          stateAfter: { total: 8, freq: "{'A': 6, 'B': 2}", best: "'A'" },
        },
      ],
    },
    code: {
      entryFunction: 'decode_alien_signal',
      starterCode: `def decode_alien_signal(pairs):
    # [총_길이, 심볼별_등장_빈도표, 최다_심볼]을 반환하세요.
    pass
`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'alien_signal_decoder',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 10000,
      maxOutputBytes: 4096,
    },
  },

  assessment: {
    publicTests: [
      {
        inputs: { pairs: [[3, 'A'], [2, 'B'], [3, 'A']] },
        expected: [8, { A: 6, B: 2 }, 'A'],
      },
      {
        inputs: { pairs: [[5, 'Z']] },
        expected: [5, { Z: 5 }, 'Z'],
      },
    ],
    rubric: {
      discoveryStar: 'observe_and_explore_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
    understandingChallenges: [
      {
        challengeId: 'uc_cap_097_1',
        title: '외계 신호 해독 통합 원리',
        prompt: '신호 복원과 빈도 요약의 규칙을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: "입력이 빈 목록 []일 때 반환해야 하는 규약 값은 무엇인가요?",
            options: [
              { value: 'empty_spec', label: "[0, {}, '']" },
              { value: 'none_spec', label: "None" },
            ],
            expected: 'empty_spec',
          },
          {
            id: 'q2',
            text: "두 심볼의 총 등장 횟수가 동일할 때 최다 심볼을 결정하는 기준은?",
            options: [
              { value: 'first_seen', label: '해독 순서상 먼저 등장한 심볼' },
              { value: 'alphabetical', label: '알파벳 역순' },
            ],
            expected: 'first_seen',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_cap_097_transfer_1',
        title: '유성우 관측 로그 요약',
        description: '유성우 관측 쌍 pairs([[개수, 타입], ...])가 주어질 때 [총 유성 수, 타입별 유성 수 사전, 최다 관측 타입]을 반환하세요.',
        entryFunction: 'summarize_meteor_log',
        starterCode: `def summarize_meteor_log(pairs):
    # [총_유성_수, 타입별_유성_수_사전, 최다_타입]을 반환하세요.
    pass
`,
        contextCard: {
          title: '🌠 유성우 집계',
          strategyGuide: '동일 유성 타입을 합산하고 첫 등장 순서를 기억하여 동률 시 첫 번째 타입을 선택합니다.',
        },
        thoughtCheck: {
          question: "[[2, 'ALPHA'], [2, 'BETA']]의 최다 타입은?",
          options: [
            { value: 'ans_alpha', label: "'ALPHA' (먼저 관측됨)" },
            { value: 'ans_beta', label: "'BETA'" },
          ],
          expected: 'ans_alpha',
        },
        testCases: [
          {
            inputs: { pairs: [[2, 'A']] },
            expected: [2, { A: 2 }, 'A'],
          },
          {
            inputs: { pairs: [[3, 'ALPHA'], [3, 'BETA']] },
            expected: [6, { ALPHA: 3, BETA: 3 }, 'ALPHA'],
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
