import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_KEYPAD_66 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-KEYPAD-66',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 66,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-SUBSET-65', 'AC-STR-COMPRESS-39'],
  },
  identity: {
    studentTitle: '통신 키패드 문자 조합',
    subtitle: '각 자리에서 글자를 하나씩 고른 모든 문자열을 만듭니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'method:append'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:subset-choice-state'],
    introduces: ['pattern:choice-frontier-expansion'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'ordered-buffer'],
    requiredClaims: ['FRONTIER_EXPANSION_COMPLETE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "첫 자리 [A, B], 둘째 자리 [1, 2]인 키패드로 만들 수 있는 문자열은 모두 몇 개일까요?",
      options: [
        { value: 'four', label: '4개 — A1, A2, B1, B2' },
        { value: 'two', label: '2개 — A1, B2' },
        { value: 'six', label: '6개' },
      ],
      expected: 'four',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⌨️ 키패드 조합 관찰판',
          description: "첫 자리 [A, B], 둘째 자리 [1, 2]의 모든 조합을 만듭니다. 지금까지의 후보 목록을 'frontier'라고 불러요.",
          variables: [
            { name: 'groups', value: "[[A, B], [1, 2]]" },
            { name: 'codes', value: "['A1', 'A2', 'B1', 'B2']", label: '최종 조합' },
            { name: 'frontierRule', value: '자리마다 후보 전체 교체', label: '확장 규칙' },
          ],
          guidance: '지금까지 만든 후보 하나하나에 다음 자리의 글자를 붙여 새 후보를 만듭니다.',
        },
        initialState: { stage: null, frontier: null, newFrontier: null },
        initialStateLabel: "시작: 빈 문자열 하나가 유일한 후보",
        initialStepTitle: '🚀 시작 (frontier 확장)',
        initialPrompt: '자리마다 frontier가 어떻게 늘어나는지 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: "① 시작: 빈 문자열 ['']",
            operationLabel: '빈 문자열이 유일한 시작 후보',
            codeSnippet: "# codes = ['']",
            prompt: '아무 글자도 없는 상태에서 출발합니다.',
            stateAfter: { stage: 0, frontier: [''], newFrontier: null },
          },
          {
            id: 'f1',
            stepTitle: "② 첫 자리 확장: A, B 붙이기",
            operationLabel: "frontier가 ['A', 'B']로 교체",
            codeSnippet: '# 각 후보에 첫 자리 글자를 붙여 새 목록 생성',
            prompt: '후보 하나에 글자 두 개를 붙여 후보가 두 개로 늘어났어요.',
            stateAfter: { stage: 1, frontier: ['A', 'B'], newFrontier: null },
          },
          {
            id: 'f2',
            stepTitle: "③ 둘째 자리 확장: 1, 2 붙이기",
            operationLabel: "A1, A2, B1, B2 — 네 개로 교체",
            codeSnippet: '# 각 후보마다 둘째 자리 글자를 붙이기',
            prompt: '두 후보 각각에 글자 두 개를 붙여 네 개가 됐습니다. 모든 자리를 지나면 완성!',
            stateAfter: { stage: 2, frontier: ['A1', 'A2', 'B1', 'B2'], newFrontier: null },
          },
          {
            // 하나뿐인 자리만 있는 독립 실험.
            id: 'f3_single_group',
            stepTitle: '④ 새 실험: 자리가 하나뿐인 [X]',
            experimentReset: true,
            stateBefore: { stage: null, frontier: null, newFrontier: null },
            operationLabel: "확장 한 번으로 ['X'] 완성",
            codeSnippet: '# 새 실험: 자리 하나면 한 번의 확장',
            prompt: '자리가 하나면 빈 문자열에 글자를 붙인 결과가 곧 최종 조합입니다.',
            stateAfter: { stage: 1, frontier: ['X'], newFrontier: null },
          },
        ],
        predictionPrompt: '각 자리에서 글자를 하나씩 고른 모든 문자열을 반환하세요.',
        rulePrompt: 'frontier 확장 규칙',
        ruleStatement: '빈 후보에서 출발해, 각 자리마다 지금까지의 모든 후보에 선택지를 하나씩 붙인 새 목록으로 후보를 교체한다.',
      },
    },
    code: {
      entryFunction: 'build_keypad_codes',
      starterCode: `def build_keypad_codes(groups):
    # 각 자리에서 하나씩 고른 모든 문자열을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { groups: [['A', 'B'], ['1', '2']] }, expected: ['A1', 'A2', 'B1', 'B2'] },
      { inputs: { groups: [['X']] }, expected: ['X'] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_066_1',
        title: 'frontier 확장 이해',
        prompt: '자리마다 후보를 확장하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '후보 3개에 선택지가 2개인 자리를 붙이면 후보는 몇 개가 될까요?',
            options: [
              { value: 'six', label: '6개 — 후보 하나하나에 선택지를 하나씩 붙인다' },
              { value: 'five', label: '5개 — 후보에 선택지를 더한다' },
            ],
            expected: 'six',
          },
          {
            id: 'q2',
            text: '새 자리를 확장할 때 이전 frontier를 지우고 새 목록으로 교체하는 이유는 무엇일까요?',
            options: [
              { value: 'replace_stage', label: '그 자리까지의 후보만이 다음 자리의 출발점이기 때문에' },
              { value: 'save_memory', label: '목록 길이를 줄이기 위해' },
            ],
            expected: 'replace_stage',
          },
          {
            id: 'q3',
            text: '자리가 하나뿐이면 어떻게 될까요?',
            options: [
              { value: 'one_expansion', label: '빈 문자열에 글자를 한 번 붙인 결과가 곧 최종 조합이다' },
              { value: 'no_codes', label: '조합을 만들 수 없다' },
            ],
            expected: 'one_expansion',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_066_transfer_1',
        title: '로봇 부품 옵션 조합',
        description: '로봇 부품의 옵션 그룹 목록(option_groups)에서 각 그룹의 옵션을 하나씩 고른 모든 조합 문자열을 만듭니다.',
        entryFunction: 'build_robot_configs',
        starterCode: `def build_robot_configs(option_groups):
    # 각 그룹에서 하나씩 고른 모든 조합 문자열을 반환하세요.
    pass
`,
        contextCard: {
          title: '🤖 부품 조합 생성 전략',
          strategyGuide: '빈 후보에서 출발해 그룹마다 지금까지의 후보마다 옵션을 하나씩 붙이고, 새 후보 목록으로 교체해 다음 그룹으로 넘어갑니다.',
        },
        thoughtCheck: {
          question: "옵션 [적, 청]과 [소, 대]로 만들 수 있는 조합은 모두 몇 개일까요?",
          options: [
            { value: 'four', label: '4개 — 적소, 적대, 청소, 청대' },
            { value: 'three', label: '3개' },
          ],
          expected: 'four',
        },
        testCases: [
          { inputs: { option_groups: [['적', '청'], ['소', '대']] }, expected: ['적소', '적대', '청소', '청대'] },
          { inputs: { option_groups: [['수동']] }, expected: ['수동'] },
        ],
      },
    ],
  },
})
