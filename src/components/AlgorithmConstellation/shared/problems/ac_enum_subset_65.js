import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_SUBSET_65 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-SUBSET-65',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 65,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-COMB-64', 'AC-PAT-DIGIT-24'],
  },
  identity: {
    studentTitle: '작은 장비 조합 보기',
    subtitle: '각 장비를 넣거나 뺄지의 선택 상태를 하나씩 늘려 모든 부분집합을 만듭니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:modulo', 'operator:floor-division', 'method:append'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:combination-output'],
    introduces: ['pattern:subset-choice-state'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: ['ALL_SUBSETS_IN_MASK_ORDER'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '장비 [A, B]로 만들 수 있는 부분집합은 모두 몇 개일까요?',
      options: [
        { value: 'four', label: '4개 — 빈 조합, A만, B만, A와 B' },
        { value: 'three', label: '3개 — 빈 조합은 세지 않는다' },
        { value: 'two', label: '2개 — 한 개씩만 담은 조합' },
      ],
      expected: 'four',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🎒 부분집합 관찰판',
          description: '장비 [A, B]의 선택 상태를 하나씩 늘려 네 부분집합을 만듭니다. 선택 상태는 넣거나 뺄지의 기록이에요.',
          variables: [
            { name: 'items', value: "['A', 'B']" },
            { name: 'state', value: '0, 1, 2, 3', label: '선택 상태' },
            { name: 'subset', value: '상태에 따라 달라짐', label: '만들어진 부분집합' },
          ],
          guidance: '선택 상태의 각 자리를 읽어 첫 장비부터 포함 여부를 정합니다.',
        },
        initialState: { state: null, firstItem: null, secondItem: null, subset: null },
        initialStateLabel: '시작: 선택 상태 0부터',
        initialStepTitle: '🚀 시작 (선택 상태 열거)',
        initialPrompt: '상태 0부터 3까지, 각 상태가 만드는 부분집합을 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 상태 0: 둘 다 뺌',
            operationLabel: '빈 부분집합 [] 기록',
            codeSnippet: '# 아무것도 포함하지 않은 상태도 하나의 부분집합',
            prompt: '빈 조합도 부분집합입니다. 빠뜨리면 안 돼요.',
            stateAfter: { state: 0, firstItem: '뺌', secondItem: '뺌', subset: [] },
          },
          {
            id: 'f1',
            stepTitle: '② 상태 1: A만 넣음',
            operationLabel: '[A] 기록',
            codeSnippet: '# 첫 자리가 포함 표시',
            prompt: '첫 장비만 포함한 상태예요.',
            stateAfter: { state: 1, firstItem: '넣음', secondItem: '뺌', subset: ['A'] },
          },
          {
            id: 'f2',
            stepTitle: '③ 상태 2: B만 넣음',
            operationLabel: '[B] 기록',
            codeSnippet: '# 둘째 자리만 포함 표시',
            prompt: '이번엔 둘째 장비만 포함됩니다.',
            stateAfter: { state: 2, firstItem: '뺌', secondItem: '넣음', subset: ['B'] },
          },
          {
            id: 'f3',
            stepTitle: '④ 상태 3: 둘 다 넣음',
            operationLabel: '[A, B] 기록 — 완성',
            codeSnippet: '# 모든 자리가 포함 표시',
            prompt: '상태 0부터 3까지 네 부분집합이 순서대로 완성됐습니다.',
            stateAfter: { state: 3, firstItem: '넣음', secondItem: '넣음', subset: ['A', 'B'] },
          },
        ],
        predictionPrompt: '선택 상태 0부터 끝까지 늘려가며 모든 부분집합을 순서대로 반환하세요.',
        rulePrompt: '부분집합 생성 규칙',
        ruleStatement: '포함과 제외의 선택 상태를 0부터 끝까지 하나씩 확인하며, 상태가 가리키는 항목만 모아 하나의 부분집합으로 기록한다.',
      },
    },
    code: {
      entryFunction: 'build_equipment_subsets',
      starterCode: `def build_equipment_subsets(items):
    # 모든 부분집합을 순서대로 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { items: ['A', 'B'] }, expected: [[], ['A'], ['B'], ['A', 'B']] },
      { inputs: { items: [] }, expected: [[]] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_065_1',
        title: '부분집합 생성 이해',
        prompt: '선택 상태로 부분집합을 만드는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '아무것도 담지 않은 빈 부분집합도 결과에 포함되는 이유는 무엇일까요?',
            options: [
              { value: 'empty_is_subset', label: '아무것도 선택하지 않은 것도 하나의 선택 상태이기 때문에' },
              { value: 'empty_is_error', label: '빈 조합은 실수이기 때문에' },
            ],
            expected: 'empty_is_subset',
          },
          {
            id: 'q2',
            text: '장비가 세 개면 부분집합은 몇 개일까요?',
            options: [
              { value: 'eight', label: '8개 — 항목마다 넣거나 뺄지 두 가지씩 늘어난다' },
              { value: 'six', label: '6개 — 항목 수에 두 개를 더한다' },
            ],
            expected: 'eight',
          },
          {
            id: 'q3',
            text: '선택 상태 2가 [B]를 만들었다면, 상태 3은 어떤 부분집합일까요?',
            options: [
              { value: 'both_items', label: '[A, B] — 상태가 하나 커지면 포함 자리가 바뀐다' },
              { value: 'same_as_two', label: '여전히 [B]다' },
            ],
            expected: 'both_items',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_065_transfer_1',
        title: '가능한 모든 탐사 도구 묶음',
        description: '탐사 도구 목록(tools)으로 만들 수 있는 모든 도구 묶음을 선택 상태 순서대로 반환합니다.',
        entryFunction: 'build_tool_bundles',
        starterCode: `def build_tool_bundles(tools):
    # 모든 도구 묶음을 순서대로 반환하세요.
    pass
`,
        contextCard: {
          title: '🧰 도구 묶음 생성 전략',
          strategyGuide: '도구마다 넣거나 뺄지의 선택 상태를 하나씩 늘려 가며, 상태가 가리키는 도구만 모아 묶음으로 기록합니다.',
        },
        thoughtCheck: {
          question: '도구가 하나뿐일 때 묶음은 모두 몇 개일까요?',
          options: [
            { value: 'two', label: '2개 — 빈 묶음과 도구 하나만 담은 묶음' },
            { value: 'one', label: '1개 — 빈 묶음은 세지 않는다' },
          ],
          expected: 'two',
        },
        testCases: [
          { inputs: { tools: ['망원경'] }, expected: [[], ['망원경']] },
          { inputs: { tools: ['A', 'B', 'C'] }, expected: [[], ['A'], ['B'], ['A', 'B'], ['C'], ['A', 'C'], ['B', 'C'], ['A', 'B', 'C']] },
        ],
      },
    ],
  },
})
