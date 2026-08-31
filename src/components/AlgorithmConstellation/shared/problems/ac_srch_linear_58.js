import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SRCH_LINEAR_58 = createCapabilityPrototypeKernel({
  problemId: 'AC-SRCH-LINEAR-58',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 58,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005', 'AC-PAT-003'],
  },
  identity: {
    studentTitle: '정렬되지 않은 창고 탐색',
    subtitle: '정렬되지 않은 목록을 앞에서부터 하나씩 확인해 처음 나타난 위치를 찾습니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'operator:equality'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:membership-query'],
    introduces: ['pattern:first-match-linear-search'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'container-membership', 'decision'],
    requiredClaims: ['FIRST_MATCH_LINEAR_SEARCH'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '창고 목록 [8, 3, 8]에서 화물 8을 찾으면 몇 번 위치를 알려줄까요?',
      options: [
        { value: 'index_zero', label: '0 — 처음 나타난 바로 그 위치' },
        { value: 'index_two', label: '2 — 마지막에 나타난 위치' },
        { value: 'both', label: '0과 2 — 나타난 모든 위치' },
      ],
      expected: 'index_zero',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 창고 순차 탐색판',
          description: '정렬되지 않은 목록은 가운데만 보고 절반을 버릴 수 없어요. 앞에서부터 한 칸씩 확인합니다.',
          variables: [
            { name: 'cargos', value: '[4, 8, 8, 2]', label: '창고 목록' },
            { name: 'target', value: '8', label: '찾는 화물' },
            { name: 'sentinel', value: '-1 (못 찾음)', label: '실패 표시' },
          ],
          guidance: '찾는 순간 바로 멈추고 그 위치를 알려줍니다. 뒤쪽은 더 볼 필요가 없어요.',
        },
        initialState: { checkedIndex: null, checkedValue: null, target: 8, found: null },
        initialStateLabel: '시작: 아직 아무 칸도 확인 전',
        initialStepTitle: '🚀 시작 (앞에서부터)',
        initialPrompt: '한 칸씩 확인하며 찾는 순간 멈추는 흐름을 관찰합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 위치 0 확인: 4',
            operationLabel: '4는 8이 아님 -> 다음 칸으로',
            codeSnippet: '# 일치하지 않으면 계속 진행',
            prompt: '첫 칸은 아니에요. 아직 멈추지 않습니다.',
            stateAfter: { checkedIndex: 0, checkedValue: 4, target: 8, found: false },
          },
          {
            id: 'f1',
            stepTitle: '② 위치 1 확인: 8',
            operationLabel: '8 == 8 -> 발견! 즉시 멈추고 1 반환',
            codeSnippet: '# 첫 일치에서 바로 위치 반환',
            prompt: '첫 일치를 찾았으므로 뒤쪽은 확인하지 않아요. 같은 8이 더 있어도 처음 위치가 답입니다.',
            stateAfter: { checkedIndex: 1, checkedValue: 8, target: 8, found: true },
          },
          {
            // 끝까지 없는 경우의 독립 실험: -1 sentinel을 확인한다.
            id: 'f2_not_found',
            stepTitle: '③ 새 실험: [4, 6]에서 5 찾기',
            experimentReset: true,
            stateBefore: { checkedIndex: null, checkedValue: null, target: 5, found: null },
            operationLabel: '끝까지 확인했지만 5가 없음 -> -1 반환',
            codeSnippet: '# 새 실험: 끝까지 없으면 -1',
            prompt: '끝까지 확인해도 없으면 실패를 알리는 약속된 값 -1을 돌려줍니다.',
            stateAfter: { checkedIndex: 1, checkedValue: 6, target: 5, found: false },
          },
        ],
        predictionPrompt: '찾는 값이 처음 나타난 위치를 반환하고, 없으면 -1을 반환하세요.',
        rulePrompt: '첫 일치 순차 탐색 규칙',
        ruleStatement: '앞에서부터 한 칸씩 확인해 처음 일치하는 순간 그 위치를 알려주고, 끝까지 없으면 -1을 알려준다.',
      },
    },
    code: {
      entryFunction: 'find_first_cargo',
      starterCode: `def find_first_cargo(cargos, target):
    # 처음 나타난 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { cargos: [8, 3, 8], target: 8 }, expected: 0 },
      { inputs: { cargos: [4, 6], target: 5 }, expected: -1 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_srch_058_1',
        title: '첫 일치 순차 탐색 이해',
        prompt: '정렬되지 않은 목록에서의 탐색 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '정렬되지 않은 목록에서는 가운데 값만 보고 절반을 버릴 수 없는 이유는 무엇일까요?',
            options: [
              { value: 'no_order_info', label: '정렬되어 있지 않으면 가운데 값과의 크기 비교가 어느 쪽에 있는지 알려주지 않기 때문에' },
              { value: 'too_slow', label: '절반 버리기가 너무 느리기 때문에' },
            ],
            expected: 'no_order_info',
          },
          {
            id: 'q2',
            text: '같은 값이 여러 개일 때 첫 일치에서 멈추는 이유는 무엇일까요?',
            options: [
              { value: 'first_is_answer', label: '구하려는 것이 처음 나타난 위치이므로 뒤를 볼 필요가 없기 때문에' },
              { value: 'later_are_wrong', label: '뒤에 나온 같은 값은 다른 값이기 때문에' },
            ],
            expected: 'first_is_answer',
          },
          {
            id: 'q3',
            text: '찾지 못했을 때 -1을 돌려주는 약속의 장점은 무엇일까요?',
            options: [
              { value: 'valid_sentinel', label: '-1은 실제 위치로 쓸 수 없는 값이라 실패를 확실히 구분할 수 있어서' },
              { value: 'zero_sentinel', label: '0이 실패라는 뜻이기도 해서' },
            ],
            expected: 'valid_sentinel',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_srch_058_transfer_1',
        title: '신호 목록에서 첫 일치 찾기',
        description: '문자 신호 목록(signals)에서 찾는 신호(target)가 처음 나타난 위치를 반환하고, 없으면 -1을 반환합니다.',
        entryFunction: 'find_first_signal',
        starterCode: `def find_first_signal(signals, target):
    # 처음 나타난 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
        contextCard: {
          title: '📻 신호 위치 찾기 전략',
          strategyGuide: '목록을 앞에서부터 하나씩 확인해 처음 일치하는 위치를 알려주고, 끝까지 없으면 못 찾았다는 표시를 돌려줍니다.',
        },
        thoughtCheck: {
          question: '빈 목록([])에서 아무 신호나 찾으면 결과는 어떻게 될까요?',
          options: [
            { value: 'minus_one', label: '-1 — 확인할 칸이 없으므로 바로 실패 표시다' },
            { value: 'zero', label: '0 — 첫 위치를 돌려준다' },
          ],
          expected: 'minus_one',
        },
        testCases: [
          { inputs: { signals: ['RED', 'BLUE', 'RED'], target: 'RED' }, expected: 0 },
          { inputs: { signals: ['GREEN'], target: 'YELLOW' }, expected: -1 },
        ],
      },
    ],
  },
})
