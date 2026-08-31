import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_TRIPLE_63 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-TRIPLE-63',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 63,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-TARGET-62'],
  },
  identity: {
    studentTitle: '세 캡슐의 정확한 에너지',
    subtitle: '서로 다른 세 위치를 중복 없이 훑으며 합이 목표와 같은 첫 조합을 찾습니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:collect-all-matches'],
    introduces: ['pattern:triple-enumeration'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision'],
    requiredClaims: ['FIRST_TRIPLE_ENUMERATED'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '캡슐 [1, 2, 3, 4]에서 세 개를 골라 합이 6이 되는 조합은 있을까요?',
      options: [
        { value: 'yes_first_three', label: '있다 — (1, 2, 3)' },
        { value: 'no', label: '없다' },
        { value: 'only_two', label: '두 개만 골라야 가능하다' },
      ],
      expected: 'yes_first_three',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🧱 세 개 열거 관찰판',
          description: '캡슐 [1, 2, 3, 4]에서 합이 6인 세 위치를 찾습니다. 경계가 세 단계로 늘어나요.',
          variables: [
            { name: 'capsules', value: '[1, 2, 3, 4]' },
            { name: 'target', value: '6' },
            { name: 'orderRule', value: 'i < j < k', label: '경계 규칙' },
          ],
          guidance: '첫 위치, 그보다 뒤의 둘째, 둘째보다 뒤의 셋째 — 경계를 한 단계씩 늘립니다.',
        },
        initialState: { i: null, j: null, k: null, tripleSum: null, found: null },
        initialStateLabel: '시작: 아직 확인 전',
        initialStepTitle: '🚀 시작 (세 위치 열거)',
        initialPrompt: '경계를 단계별로 늘리며 첫 조합을 찾습니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① i = 0, j = 1, k = 2 확인',
            operationLabel: '1 + 2 + 3 = 6 -> 발견! [0, 1, 2] 반환',
            codeSnippet: '# 첫 후보 (0, 1, 2)가 곧 정답',
            prompt: '가장 앞쪽 조합부터 차례로 확인하므로 첫 후보가 정답이에요.',
            stateAfter: { i: 0, j: 1, k: 2, tripleSum: 6, found: true },
          },
          {
            id: 'f1',
            stepTitle: '② 만약 첫 후보가 아니었다면',
            operationLabel: 'k를 하나씩 뒤로, 그다음 j와 i를 이동',
            codeSnippet: '# k -> j -> i 순서로 경계 이동',
            prompt: '한 조합이 틀리면 k를 뒤로 옮기고, k가 끝에 닿으면 j와 i를 이동해요.',
            stateAfter: { i: 0, j: 1, k: 3, tripleSum: null, found: false },
          },
          {
            // 경계 규칙이 없을 때의 중복 문제를 보여주는 독립 실험.
            id: 'f2_counter',
            stepTitle: '③ 새 실험: k가 j보다 앞쪽까지 본다면?',
            experimentReset: true,
            stateBefore: { i: null, j: null, k: null, tripleSum: null, found: null },
            operationLabel: '(1, 3, 2)처럼 순서가 뒤섞인 조합도 만들어짐',
            codeSnippet: '# 새 실험: i < k < j 순서는 같은 조합의 재탕',
            prompt: 'k를 둘째 위치보다 앞쪽까지 허용하면 이미 본 조합을 다른 순서로 다시 세게 됩니다.',
            stateAfter: { i: 0, j: 2, k: 1, tripleSum: 6, found: true },
          },
        ],
        predictionPrompt: '합이 target인 첫 세 위치 [i, j, k]를 반환하고, 없으면 빈 목록을 반환하세요.',
        rulePrompt: '세 위치 열거 규칙',
        ruleStatement: '첫 위치, 그보다 뒤의 둘째, 둘째보다 뒤의 셋째로 경계를 늘려가며 확인한다. 찾으면 위치를 반환하고, 끝까지 없으면 빈 목록을 반환한다.',
      },
    },
    code: {
      entryFunction: 'find_triple_sum',
      starterCode: `def find_triple_sum(capsules, target):
    # 합이 target이 되는 첫 세 위치 [i, j, k]를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { capsules: [1, 2, 3, 4], target: 6 }, expected: [0, 1, 2] },
      { inputs: { capsules: [5, 5], target: 15 }, expected: [] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_063_1',
        title: '세 위치 열거 이해',
        prompt: '세 위치를 중복 없이 열거하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '셋째 위치 k의 확인 범위는 어디부터일까요?',
            options: [
              { value: 'after_j', label: 'j보다 뒤쪽부터 — k가 j보다 앞이면 이미 본 조합의 재탕이 된다' },
              { value: 'after_i', label: 'i보다만 뒤쪽이면 된다' },
            ],
            expected: 'after_j',
          },
          {
            id: 'q2',
            text: '캡슐이 두 개뿐이면 세 개를 고를 수 없는 이유는 무엇일까요?',
            options: [
              { value: 'need_three_positions', label: '서로 다른 세 위치가 필요한데 위치가 두 개뿐이기 때문에' },
              { value: 'values_too_small', label: '값이 작아서 합이 맞지 않기 때문에' },
            ],
            expected: 'need_three_positions',
          },
          {
            id: 'q3',
            text: '모든 조합을 확인해도 없을 때 반환할 것은 무엇일까요?',
            options: [
              { value: 'empty_list', label: '빈 목록([]) — 이 문제의 실패 표시' },
              { value: 'zero_triple', label: '[0, 0, 0] — 시작 위치를 돌려준다' },
            ],
            expected: 'empty_list',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_063_transfer_1',
        title: '목표 세기를 만드는 세 센서',
        description: '센서 목록(sensors)에서 세 개를 골라 곱이 target과 같은 첫 위치 [i, j, k]를 반환하세요. 센서 값은 작은 정수입니다.',
        entryFunction: 'find_sensor_product',
        starterCode: `def find_sensor_product(sensors, target):
    # 곱이 target이 되는 첫 세 위치 [i, j, k]를 반환하세요.
    pass
`,
        contextCard: {
          title: '✖️ 세 센서 곱 탐색 전략',
          strategyGuide: '세 위치의 경계를 한 단계씩 늘려가며 곱을 계산하고, 목표와 같은 첫 조합의 위치를 알려줍니다.',
        },
        thoughtCheck: {
          question: '센서 [2, 3, 4]에서 곱이 24인 조합은 있을까요?',
          options: [
            { value: 'yes_all_three', label: '있다 — 세 개 전부: 2 곱하기 3 곱하기 4' },
            { value: 'no', label: '없다' },
          ],
          expected: 'yes_all_three',
        },
        testCases: [
          { inputs: { sensors: [2, 3, 4], target: 24 }, expected: [0, 1, 2] },
          { inputs: { sensors: [2, 2], target: 8 }, expected: [] },
        ],
      },
    ],
  },
})
