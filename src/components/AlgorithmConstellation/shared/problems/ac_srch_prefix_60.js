import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SRCH_PREFIX_60 = createCapabilityPrototypeKernel({
  problemId: 'AC-SRCH-PREFIX-60',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 60,
    constellationId: 'constellation-5',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-RUNNING-35', 'AC-EXP-BOUND-05'],
  },
  identity: {
    studentTitle: '여러 구간의 방사선 합',
    subtitle: '맨 앞에 0을 둔 누적 기록을 만든 뒤, 두 누적값의 차로 각 구간의 합을 바로 구합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'method:append', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:running-prefix-state'],
    introduces: ['pattern:prefix-difference-query'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'scalar-sequence', 'ordered-buffer'],
    requiredClaims: ['PREFIX_DIFFERENCE_QUERY'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '방사선 기록 [3, 5, 2, 4]의 누적 기록(맨 앞에 0 포함)은 어떻게 될까요?',
      options: [
        { value: 'prefix_correct', label: '[0, 3, 8, 10, 14]' },
        { value: 'no_leading_zero', label: '[3, 8, 10, 14] — 0 없이 누적' },
        { value: 'original', label: '[3, 5, 2, 4] — 원본 그대로' },
      ],
      expected: 'prefix_correct',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '☢️ 구간합 관찰판',
          description: '기록 [3, 5, 2, 4]의 누적 기록을 만든 뒤, 질의 [1, 3]의 구간합을 두 누적값의 차로 구합니다.',
          variables: [
            { name: 'levels', value: '[3, 5, 2, 4]' },
            { name: 'query', value: '[1, 3] (양 끝 포함)' },
            { name: 'diffRule', value: '오른쪽 누적 - 왼쪽 누적', label: '차 계산 규칙' },
          ],
          guidance: '질의마다 처음부터 더하지 않아도 누적 기록이 있다면 차 한 번으로 끝납니다.',
        },
        initialState: { prefix: [], position: null, total: null },
        initialStateLabel: '시작: 빈 누적 기록',
        initialStepTitle: '🚀 1번 실험: 누적 기록 만들기',
        initialPrompt: '왼쪽부터 차례로 더해 누적 기록을 완성합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 맨 앞에 0 두기',
            operationLabel: '아무것도 더하지 않은 상태 0을 기록',
            codeSnippet: '# prefix = [0]',
            prompt: '선두 0이 있으면 "첫 칸부터 시작하는 구간"도 같은 방법으로 구할 수 있어요.',
            stateAfter: { prefix: [0], position: null, total: 0 },
          },
          {
            id: 'f1',
            stepTitle: '② 첫 칸 3 누적',
            operationLabel: '0 + 3 = 3 기록',
            codeSnippet: '# prefix = [0, 3]',
            prompt: '첫 칸까지의 합이 기록됩니다.',
            stateAfter: { prefix: [0, 3], position: 0, total: 3 },
          },
          {
            id: 'f2',
            stepTitle: '③ 둘째 칸 5 누적',
            operationLabel: '3 + 5 = 8 기록',
            codeSnippet: '# prefix = [0, 3, 8]',
            prompt: '두 칸까지의 합이 기록돼요.',
            stateAfter: { prefix: [0, 3, 8], position: 1, total: 8 },
          },
          {
            id: 'f3',
            stepTitle: '④ 셋째 칸 2 누적',
            operationLabel: '8 + 2 = 10 기록',
            codeSnippet: '# prefix = [0, 3, 8, 10]',
            prompt: '세 칸까지의 합이 기록됩니다.',
            stateAfter: { prefix: [0, 3, 8, 10], position: 2, total: 10 },
          },
          {
            id: 'f4',
            stepTitle: '⑤ 넷째 칸 4 누적 — 기록 완성',
            operationLabel: '10 + 4 = 14 기록',
            codeSnippet: '# prefix = [0, 3, 8, 10, 14]',
            prompt: '누적 기록이 완성됐습니다. 이제 질의 하나를 새 실험으로 처리해요.',
            stateAfter: { prefix: [0, 3, 8, 10, 14], position: 3, total: 14 },
          },
          {
            // 질의 처리는 누적 구축과 별개 실험이다: experimentReset + stateBefore로 분리.
            id: 'f5_query',
            stepTitle: '⑥ 새 실험: 질의 [1, 3]의 구간합',
            experimentReset: true,
            stateBefore: { prefix: [], position: null, total: null },
            operationLabel: 'prefix[4] - prefix[1] = 14 - 3 = 11',
            codeSnippet: '# 두 번째~네 번째 칸의 합 = 5 + 2 + 4 = 11',
            prompt: '완성된 누적 기록을 그대로 가져와, 구간 끝의 누적값 14에서 구간 앞의 누적값 3을 빼면 11이 바로 나옵니다.',
            stateAfter: { prefix: [0, 3, 8, 10, 14], start: 1, end: 3, rangeSum: 11 },
          },
        ],
        predictionPrompt: '각 질의 [시작, 끝] 구간(양 끝 포함)의 합 목록을 반환하세요.',
        rulePrompt: '누적 차 구간합 규칙',
        ruleStatement: '맨 앞에 0을 둔 누적 기록을 만든 뒤, 구간합은 끝의 누적값에서 앞의 누적값을 빼서 구한다.',
      },
    },
    code: {
      entryFunction: 'range_radiation_sums',
      starterCode: `def range_radiation_sums(levels, queries):
    # 각 질의 [시작, 끝] 구간의 합 목록을 반환하세요.
    # 구간은 양 끝 칸을 포함합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { levels: [3, 5, 2, 4], queries: [[0, 1], [1, 3]] }, expected: [8, 11] },
      { inputs: { levels: [10], queries: [[0, 0]] }, expected: [10] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_srch_060_1',
        title: '누적 차 구간합 이해',
        prompt: '누적 기록으로 구간합을 구하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '구간합을 구할 때 누적 기록의 end + 1 번째 값을 쓰는 이유는 무엇일까요?',
            options: [
              { value: 'leading_zero_offset', label: '선두 0 때문에 누적 기록이 한 칸 뒤로 밀려 있어 end 칸의 합은 end + 1에 기록되어서' },
              { value: 'off_by_one_bug', label: '하나 더 세는 실수를 숨기기 위해서' },
            ],
            expected: 'leading_zero_offset',
          },
          {
            id: 'q2',
            text: '누적 기록 맨 앞에 0을 두는 이유는 무엇일까요?',
            options: [
              { value: 'empty_prefix_anchor', label: '아직 아무 칸도 더하지 않은 상태가 있어야 첫 칸부터 시작하는 구간도 뺄셈으로 구할 수 있어서' },
              { value: 'make_longer', label: '기록을 한 칸 길게 만들기 위해서' },
            ],
            expected: 'empty_prefix_anchor',
          },
          {
            id: 'q3',
            text: '겹치는 여러 질의를 매번 처음부터 더하지 않아도 되는 이유는 무엇일까요?',
            options: [
              { value: 'reuse_prefix', label: '누적 기록을 한 번 만들어 두면 질의마다 뺄셈 한 번으로 답이 나오기 때문에' },
              { value: 'queries_rare', label: '질의가 항상 하나뿐이기 때문에' },
            ],
            expected: 'reuse_prefix',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_srch_060_transfer_1',
        title: '에너지 소비 기록의 구간 합',
        description: '에너지 소비 기록(energy_log)과 구간 질의 목록(windows, 양 끝 포함)을 받아 각 구간의 합 목록을 반환합니다.',
        entryFunction: 'range_energy_sums',
        starterCode: `def range_energy_sums(energy_log, windows):
    # 각 질의 [시작, 끝] 구간의 합 목록을 반환하세요.
    pass
`,
        contextCard: {
          title: '🔋 구간 에너지 합 전략',
          strategyGuide: '맨 앞에 0을 둔 누적 기록을 만든 뒤, 구간 끝의 누적값에서 구간 앞의 누적값을 빼면 각 구간의 합이 바로 나옵니다.',
        },
        thoughtCheck: {
          question: '누적 기록이 [0, 2, 6, 12]일 때 구간 [1, 2]의 합은 어떻게 구할까요?',
          options: [
            { value: 'difference', label: '12가 아니라 12 빼기 2인 10 — 두 누적값의 차다' },
            { value: 'last_value', label: '12 — 항상 마지막 누적값을 쓴다' },
          ],
          expected: 'difference',
        },
        testCases: [
          { inputs: { energy_log: [2, 4, 6], windows: [[0, 1], [1, 2]] }, expected: [6, 10] },
          { inputs: { energy_log: [5], windows: [[0, 0]] }, expected: [5] },
        ],
      },
    ],
  },
})
