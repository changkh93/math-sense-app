import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_FILTER_67 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-FILTER-67',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 67,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-SUBSET-65', 'AC-COND-RANGE-15'],
  },
  identity: {
    studentTitle: '시간 안에 할 수 있는 임무 조합',
    subtitle: '모든 임무 묶음을 만들어 보고, 총 시간이 한도 이하인 묶음만 세어 반환합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:modulo', 'operator:floor-division'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:subset-choice-state'],
    introduces: ['pattern:enumerate-then-filter'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision'],
    requiredClaims: ['VALID_SUBSET_COUNT'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '임무 [3분, 5분]과 한도 5분이 있을 때, 한도 안에 할 수 있는 묶음은 모두 몇 개일까요?',
      options: [
        { value: 'two', label: '2개 — 3분 하나, 5분 하나 (둘 다는 8분이라 불가)' },
        { value: 'three', label: '3개 — 빈 묶음도 센다' },
        { value: 'one', label: '1개 — 3분 하나만 가능하다' },
      ],
      expected: 'two',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⏳ 임무 묶음 필터판',
          description: '임무 [3, 5]의 모든 묶음을 만들어 한도 5분 이하인 것만 셉니다.',
          variables: [
            { name: 'durations', value: '[3, 5]' },
            { name: 'time_limit', value: '5' },
            { name: 'countRule', value: '빈 묶음은 제외, 한도 이하 포함', label: '셈 규칙' },
          ],
          guidance: '묶음을 만들고 나서 조건을 판정하는 두 단계 흐름을 확인하세요.',
        },
        initialState: { state: null, bundleTotal: null, valid: null },
        initialStateLabel: '시작: 선택 상태 0부터',
        initialStepTitle: '🚀 시작 (묶음 열거 + 필터)',
        initialPrompt: '묶음을 만들고, 한도 이하인 것만 셉니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 상태 0: 빈 묶음',
            operationLabel: '총 시간 0이지만 빈 묶음은 세지 않는다',
            codeSnippet: '# 빈 묶음은 개수에서 제외',
            prompt: '아무 임무도 하지 않는 묶음은 세지 않아요.',
            stateAfter: { state: 0, bundleTotal: 0, valid: false },
          },
          {
            id: 'f1',
            stepTitle: '② 상태 1: 3분 하나',
            operationLabel: '총 3 -> 한도 5 이하 -> 유효! 카운트 +1',
            codeSnippet: '# 한도 이하면 개수에 더하기',
            prompt: '유효한 묶음 하나를 셌습니다.',
            stateAfter: { state: 1, bundleTotal: 3, valid: true },
          },
          {
            id: 'f2',
            stepTitle: '③ 상태 2: 5분 하나',
            operationLabel: '총 5 -> 한도와 같아도 이하 -> 유효! 카운트 +1',
            codeSnippet: '# 한도와 같은 묶음도 포함',
            prompt: '한도 "이하"는 한도와 같은 경우도 포함해요.',
            stateAfter: { state: 2, bundleTotal: 5, valid: true },
          },
          {
            // 둘 다 담으면 초과하는 독립 실험.
            id: 'f3_over',
            stepTitle: '④ 상태 3: 둘 다 담음',
            operationLabel: '총 8 -> 한도 초과 -> 무시',
            codeSnippet: '# 한도를 넘는 묶음은 세지 않는다',
            prompt: '묶음을 만들었더라도 한도를 넘으면 세지 않습니다. 만들기와 판정은 별개 단계예요.',
            stateAfter: { state: 3, bundleTotal: 8, valid: false },
          },
        ],
        predictionPrompt: '비어 있지 않은 묶음 중 총 시간이 한도 이하인 개수를 반환하세요.',
        rulePrompt: '열거 후 필터 규칙',
        ruleStatement: '모든 묶음을 만들어 본 뒤, 비어 있지 않고 총 시간이 한도 이하인 묶음만 센다.',
      },
    },
    code: {
      entryFunction: 'count_mission_sets',
      starterCode: `def count_mission_sets(durations, time_limit):
    # 한도 이하로 할 수 있는 비어 있지 않은 묶음의 개수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { durations: [3, 5], time_limit: 5 }, expected: 2 },
      { inputs: { durations: [10, 20, 30], time_limit: 5 }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_067_1',
        title: '열거 후 필터 이해',
        prompt: '묶음을 만들고 조건으로 거르는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '빈 묶음을 개수에서 제외하는 이유는 무엇일까요?',
            options: [
              { value: 'empty_not_a_mission', label: '아무 임무도 하지 않는 묶음은 임무 조합이 아니기 때문에' },
              { value: 'always_over_limit', label: '빈 묶음은 항상 한도를 넘기 때문에' },
            ],
            expected: 'empty_not_a_mission',
          },
          {
            id: 'q2',
            text: '한도와 총 시간이 정확히 같은 묶음은 어떻게 처리할까요?',
            options: [
              { value: 'count_exact', label: '한도 "이하"이므로 유효한 묶음으로 센다' },
              { value: 'exclude_exact', label: '한도를 꽉 채웠으므로 제외한다' },
            ],
            expected: 'count_exact',
          },
          {
            id: 'q3',
            text: '묶음을 만드는 단계와 조건을 판정하는 단계를 나누면 좋은 이유는 무엇일까요?',
            options: [
              { value: 'clear_two_steps', label: '모든 후보를 놓치지 않고 만든 뒤 판정하면 조건이 복잡해도 실수가 줄기 때문에' },
              { value: 'no_reason', label: '나눠도 달라지는 것이 없기 때문에' },
            ],
            expected: 'clear_two_steps',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_067_transfer_1',
        title: '무게 제한 안의 화물 묶음',
        description: '화물 무게 목록(weights)에서 묶음의 총 무게가 제한(weight_limit) 이하인 비어 있지 않은 묶음의 개수를 세어 반환합니다.',
        entryFunction: 'count_cargo_bundles',
        starterCode: `def count_cargo_bundles(weights, weight_limit):
    # 제한 이하로 실을 수 있는 비어 있지 않은 묶음의 개수를 반환하세요.
    pass
`,
        contextCard: {
          title: '📦 화물 묶음 필터 전략',
          strategyGuide: '모든 묶음을 선택 상태로 만들어 본 뒤, 비어 있지 않고 총 무게가 제한 이하인 묶음만 센다.',
        },
        thoughtCheck: {
          question: '화물 [3, 4]와 제한 7이면 유효한 묶음은 모두 몇 개일까요?',
          options: [
            { value: 'three', label: '3개 — 3, 4, 그리고 7(정확히 제한)' },
            { value: 'two', label: '2개 — 꽉 찬 묶음은 제외한다' },
          ],
          expected: 'three',
        },
        testCases: [
          { inputs: { weights: [3, 4], weight_limit: 7 }, expected: 3 },
          { inputs: { weights: [5], weight_limit: 4 }, expected: 0 },
        ],
      },
    ],
  },
})
