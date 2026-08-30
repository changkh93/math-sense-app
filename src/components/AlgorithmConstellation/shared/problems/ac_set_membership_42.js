import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SET_MEMBERSHIP_42 = createCapabilityPrototypeKernel({
  problemId: 'AC-SET-MEMBERSHIP-42',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 42,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-SET-UNIQUE-01'],
  },
  identity: {
    studentTitle: '승선 명단 확인',
    subtitle: '주어진 승객 이름이 탐사선 승선 명단(manifest)에 포함되어 있는지 판정합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:if'],
    introduces: ['operator:membership-in'],
  },
  thinkingPatterns: {
    requires: ['pattern:deduplicate-then-measure'],
    introduces: ['pattern:membership-query'],
  },
  evidenceRecipe: {
    primitives: ['container-membership', 'container-scan', 'decision'],
    requiredClaims: ['IN_MEMBERSHIP_QUERY'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "승선 명단 ['루미', '노바', '루미']가 있을 때, '노바'는 명단에 있고 '솔'은 명단에 없을까요?",
      options: [
        { value: 'nova_in_sol_not', label: '노바는 있고(True), 솔은 없다(False)' },
        { value: 'both_in', label: '둘 다 있다' },
        { value: 'neither_in', label: '둘 다 없다' },
      ],
      expected: 'nova_in_sol_not',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📋 승선 명단 포함 여부 판정',
          description: '탐사선 명단 [루미, 노바, 루미]에서 찾는 승객의 이름이 있는지 확인합니다.',
          variables: [
            { name: 'passenger', value: '"노바"', label: '찾는 승객' },
            { name: 'manifest', value: '["루미", "노바", "루미"]', label: '승선 명단' },
            { name: 'isListed', value: 'True', label: '포함 여부' },
          ],
          guidance: '찾는 승객이 명단에 있으면 True, 없으면 False로 판정되는 과정을 확인하세요.',
        },
        initialState: { passenger: null, manifest: ['루미', '노바', '루미'], isListed: null },
        initialStateLabel: '시작: 대기',
        initialStepTitle: '🚀 시작',
        initialPrompt: '승객 조회 요청을 시작합니다.',
        frames: [
          {
            id: 'f0_nova',
            stepTitle: '① 승객 "노바" 확인',
            operationLabel: '명단에 "노바"가 있음 -> True',
            codeSnippet: '# "노바"는 명단에 포함되어 있음',
            prompt: '찾는 승객 "노바"가 명단에 들어 있으므로 결과는 True가 됩니다.',
            stateAfter: { passenger: '노바', manifest: ['루미', '노바', '루미'], isListed: true },
          },
          {
            id: 'f1_sol',
            stepTitle: '② 승객 "솔" 확인',
            operationLabel: '명단에 "솔"이 없음 -> False',
            codeSnippet: '# "솔"은 명단에 없음',
            prompt: '찾는 승객 "솔"은 명단에 없으므로 결과는 False가 됩니다.',
            stateAfter: { passenger: '솔', manifest: ['루미', '노바', '루미'], isListed: false },
          },
        ],
        predictionPrompt: '찾는 승객의 포함 여부(True/False)를 반환하세요.',
        rulePrompt: '포함 여부 판정 규칙',
        ruleStatement: '찾는 항목이 명단에 들어 있으면 True, 없으면 False가 됩니다.',
      },
    },
    code: {
      entryFunction: 'is_passenger_listed',
      starterCode: `def is_passenger_listed(passenger, manifest):
    # passenger가 manifest에 포함되어 있는지 True 또는 False로 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { passenger: '노바', manifest: ['루미', '노바', '루미'] }, expected: true },
      { inputs: { passenger: '솔', manifest: ['루미', '노바'] }, expected: false },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_set_membership_42_1',
        title: '★★ 명단 포함 여부와 in 연산자',
        type: 'trace_understanding',
        prompt: '승선 명단에서 포함 여부를 판정하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '같은 승객 이름("루미")이 명단에 여러 번 적혀 있어도 "루미"의 포함 여부 결과는 어떻게 될까요?',
            options: [
              { value: 'single_true', label: '중복 횟수와 상관없이 포함되어 있으므로 True 하나이다' },
              { value: 'count_two', label: '2가 된다' },
            ],
            expected: 'single_true',
          },
          {
            id: 'q2',
            text: '빈 명단 []에서 어떤 승객을 찾아도 항상 False가 나오는 이유는 무엇일까요?',
            options: [
              { value: 'no_elements', label: '명단에 아무도 등록되어 있지 않아 어떤 승객도 포함될 수 없기 때문' },
              { value: 'error', label: '오류가 발생하기 때문' },
            ],
            expected: 'no_elements',
          },
          {
            id: 'q3',
            text: '개수를 세는 문제(len)와 포함 여부를 묻는 문제(in)의 반환값 형태는 어떻게 다를까요?',
            options: [
              { value: 'count_vs_bool', label: '개수 세기는 정수(0, 1, 2...)이고, 포함 여부는 참/거짓(True/False)이다' },
              { value: 'always_same', label: '항상 같다' },
            ],
            expected: 'count_vs_bool',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_set_membership_42_t1',
        title: '수리 부품 재고 확인',
        description: '필요한 수리 부품 코드(part)가 창고 재고 목록(inventory)에 존재하는지 True 또는 False로 반환하세요.',
        contextCard: {
          title: '📋 부품 재고 확인 사고 흐름',
          steps: [
            { label: '관찰', text: '찾으려는 부품 코드와 창고 재고 목록을 확인합니다.' },
            { label: '구분', text: '재고 목록을 바탕으로 찾는 부품이 포함되어 있는지 판정합니다.' },
            { label: '상태 갱신', text: '포함되어 있으면 True, 없으면 False를 반환합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '승객 명단에서 부품 재고로 도메인이 바뀌었을 때 포함 여부를 묻는 원리는 어떻게 될까요?',
          options: [
            { id: 'opt_same_in', label: '데이터 종류만 바뀌었을 뿐, 목록이나 집합에 특정 항목이 포함되어 있는지 판정하는 원리는 완전히 동일하다', isCorrect: true },
            { id: 'opt_diff_in', label: '부품 재고는 in 연산자로 확인할 수 없다', isCorrect: false },
          ],
          feedback: '맞아요! 목록이나 집합에서도 같은 포함 여부 규칙을 적용할 수 있습니다.',
        },
        entryFunction: 'is_part_available',
        starterCode: `def is_part_available(part, inventory):
    # part가 inventory에 포함되어 있는지 True 또는 False로 반환하세요.
    pass
`,
        testCases: [
          { inputs: { part: 'ENGINE_A', inventory: ['BOLT', 'ENGINE_A', 'NUT'] }, expected: true },
          { inputs: { part: 'BATTERY', inventory: ['BOLT', 'NUT'] }, expected: false },
        ],
      },
    ],
  },
})
