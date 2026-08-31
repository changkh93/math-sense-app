import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_TARGET_62 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-TARGET-62',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 62,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-PAIR-01'],
  },
  identity: {
    studentTitle: '목표 합을 만드는 모든 두 캡슐',
    subtitle: '첫 답에서 멈추지 않고, 조건을 만족하는 모든 위치 쌍을 순서대로 모읍니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:unordered-pair-enumeration'],
    introduces: ['pattern:collect-all-matches'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'container-scan', 'decision'],
    requiredClaims: ['ALL_TARGET_PAIRS_COLLECTED'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '캡슐 [1, 4, 5, 4]에서 합이 5인 위치 쌍은 모두 몇 개일까요?',
      options: [
        { value: 'two_pairs', label: '2개 — (0,1)과 (0,3)' },
        { value: 'one_pair', label: '1개 — 하나만 찾으면 충분하다' },
        { value: 'three_pairs', label: '3개' },
      ],
      expected: 'two_pairs',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🗂️ 쌍 수집 관찰판',
          description: '캡슐 [1, 4, 5, 4]에서 합이 5인 모든 쌍을 모읍니다. 찾아도 멈추지 않아요.',
          variables: [
            { name: 'capsules', value: '[1, 4, 5, 4]' },
            { name: 'target', value: '5' },
            { name: 'matches', value: '[[0, 1], [0, 3]]', label: '지금까지 모은 쌍' },
          ],
          guidance: '조건에 맞는 후보를 만날 때마다 목록에 기록하고 끝까지 확인합니다.',
        },
        initialState: { i: null, j: null, pairSum: null, matches: [] },
        initialStateLabel: '시작: 빈 수집 목록',
        initialStepTitle: '🚀 시작 (쌍 수집)',
        initialPrompt: '쌍을 찾아도 계속 진행하며 목록을 채웁니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① i = 0, j = 1 확인',
            operationLabel: '1 + 4 = 5 -> [0, 1] 기록',
            codeSnippet: '# 조건에 맞으면 목록에 기록하고 계속',
            prompt: '첫 답을 찾았지만 여기서 멈추지 않습니다.',
            stateAfter: { i: 0, j: 1, pairSum: 5, matches: [[0, 1]] },
          },
          {
            id: 'f1',
            stepTitle: '② i = 0, j = 2 확인',
            operationLabel: '1 + 5 = 6 -> 조건 불일치, 다음',
            codeSnippet: '# 조건에 맞지 않으면 그냥 지나간다',
            prompt: '기록하지 않고 다음 짝으로 넘어갑니다.',
            stateAfter: { i: 0, j: 2, pairSum: 6, matches: [[0, 1]] },
          },
          {
            id: 'f2',
            stepTitle: '③ i = 0, j = 3 확인',
            operationLabel: '1 + 4 = 5 -> [0, 3] 기록',
            codeSnippet: '# 두 번째 답도 목록에 추가',
            prompt: '중복된 값 4라도 위치가 다르면 별개의 쌍이에요.',
            stateAfter: { i: 0, j: 3, pairSum: 5, matches: [[0, 1], [0, 3]] },
          },
          {
            // 첫 답에서 멈추는 오답과 구별되는 독립 실험: 답이 하나뿐인 입력.
            id: 'f3_single',
            stepTitle: '④ 새 실험: 답이 하나뿐인 [2, 3]',
            experimentReset: true,
            stateBefore: { i: null, j: null, pairSum: null, matches: [] },
            operationLabel: '2 + 3 = 5 -> [0, 1] 하나만 기록',
            codeSnippet: '# 새 실험: 답이 하나면 목록에 하나',
            prompt: '답이 하나뿐인 입력에서는 목록에 하나만 담깁니다. 모으는 방식은 동일해요.',
            stateAfter: { i: 0, j: 1, pairSum: 5, matches: [[0, 1]] },
          },
        ],
        predictionPrompt: '합이 target인 모든 위치 쌍 [i, j]를 순서대로 모은 목록을 반환하세요.',
        rulePrompt: '모든 답 수집 규칙',
        ruleStatement: '앞 위치보다 뒤 위치만 짝지어 모두 확인하며, 조건을 만족하는 후보를 만날 때마다 결과 목록에 기록한다.',
      },
    },
    code: {
      entryFunction: 'find_all_pair_sums',
      starterCode: `def find_all_pair_sums(capsules, target):
    # 합이 target인 모든 위치 쌍 [i, j]를 모아 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { capsules: [1, 4, 5, 4], target: 5 }, expected: [[0, 1], [0, 3]] },
      { inputs: { capsules: [2, 2, 2], target: 4 }, expected: [[0, 1], [0, 2], [1, 2]] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_062_1',
        title: '모든 답 수집 이해',
        prompt: '조건을 만족하는 모든 쌍을 모을 때의 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '첫 답을 찾은 순간 해야 할 일은 무엇일까요?',
            options: [
              { value: 'record_and_continue', label: '결과 목록에 기록하고 남은 쌍도 계속 확인한다' },
              { value: 'return_immediately', label: '그 자리에서 바로 반환하고 끝낸다' },
            ],
            expected: 'record_and_continue',
          },
          {
            id: 'q2',
            text: '같은 값이라도 위치가 다르면 별개의 쌍인 이유는 무엇일까요?',
            options: [
              { value: 'positions_matter', label: '이 문제가 모으는 것은 값이 아니라 위치 쌍이기 때문에' },
              { value: 'values_ignored', label: '값은 아무래도 상관없기 때문에' },
            ],
            expected: 'positions_matter',
          },
          {
            id: 'q3',
            text: '입력 목록이 비어 있으면 결과는 어떻게 될까요?',
            options: [
              { value: 'empty_result', label: '확인할 쌍이 없으므로 빈 목록을 반환한다' },
              { value: 'error', label: '오류가 발생한다' },
            ],
            expected: 'empty_result',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_062_transfer_1',
        title: '목표 세기를 만드는 모든 신호 쌍',
        description: '신호 세기 목록(strengths)에서 두 신호의 합이 target과 같은 모든 위치 쌍 [i, j]를 순서대로 모읍니다.',
        entryFunction: 'find_all_signal_pairs',
        starterCode: `def find_all_signal_pairs(strengths, target):
    # 합이 target인 모든 위치 쌍 [i, j]를 모아 반환하세요.
    pass
`,
        contextCard: {
          title: '📶 신호 쌍 수집 전략',
          strategyGuide: '앞 위치를 정해 뒤쪽 위치와 차례로 짝지어 세기를 더해 보고, 목표와 같은 짝을 만날 때마다 기록해 끝까지 모읍니다.',
        },
        thoughtCheck: {
          question: '세기 [4, 6, 6]에서 목표 10인 쌍은 모두 몇 개일까요?',
          options: [
            { value: 'two', label: '2개 — (0, 1)과 (0, 2)' },
            { value: 'one', label: '1개 — 같은 세기 6은 하나만 센다' },
          ],
          expected: 'two',
        },
        testCases: [
          { inputs: { strengths: [1, 9, 5, 5], target: 10 }, expected: [[0, 1], [2, 3]] },
          { inputs: { strengths: [7], target: 14 }, expected: [] },
        ],
      },
    ],
  },
})
