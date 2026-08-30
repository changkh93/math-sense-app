import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SEQ_MINMAX_32 = createCapabilityPrototypeKernel({
  problemId: 'AC-SEQ-MINMAX-32',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-SEQ-005', 'AC-EXP-BOUND-05'],
  },
  identity: {
    studentTitle: '가장 약한 신호와 강한 신호',
    subtitle: '신호들을 한 번씩 확인해 가장 약한 신호와 강한 신호를 함께 찾습니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'operator:comparison-bound',
      'operator:comparison-lower-bound',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:first-item-initialization'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: [
      'first-item-initializes-bounds',
      'single-pass-updates-both-bounds',
      'negative-values-preserve-relative-bounds',
    ],
  },
  modes: {
    observe: {
      prompt: '음수로만 이루어진 신호 리스트 [-4, -9, -2]의 최댓값을 찾을 때, 초기값을 0으로 시작하면 어떤 문제가 생길까요?',
      expected: 'zero_fails_negative',
      options: [
        { value: 'zero_fails_negative', label: '리스트에 없는 0을 최댓값이라고 잘못 판단하여 틀린 결과가 나온다.' },
        { value: 'no_issue', label: '아무런 문제없이 올바른 최댓값 -2를 찾는다.' },
        { value: 'always_zero', label: '모든 리스트의 최댓값은 항상 0이어야 한다.' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📡 최소·최대 신호 동시 탐색실',
          description: '신호 리스트 [6, 2, 9, 2]에서 첫 번째 값으로 시작하여 최솟값과 최댓값을 동시에 갱신하는 과정을 추적합니다.',
          variables: [
            { name: 'smallest', value: '6', label: '현재 최솟값' },
            { name: 'largest', value: '6', label: '현재 최댓값' },
          ],
          guidance: '첫 항목으로 초기화한 뒤 각 항목을 만나며 어떻게 갱신되는지 확인하세요.',
        },
        initialState: { current: null, smallest: null, largest: null },
        initialStateLabel: '시작: 첫 항목 초기화 대기',
        initialStepTitle: '🚀 시작 (첫 항목 초기화)',
        initialPrompt: '신호 리스트 [6, 2, 9, 2]의 첫 번째 값인 6으로 smallest와 largest를 초기화합니다.',
        frames: [
          {
            id: 'init',
            stepTitle: '① 첫 항목 6으로 초기화',
            operationLabel: 'smallest = 6, largest = 6',
            codeSnippet: 'smallest = signals[0]\nlargest = signals[0]',
            prompt: '첫 번째 값 6이 지금까지 본 가장 작고 가장 큰 값입니다.',
            stateAfter: { current: 6, smallest: 6, largest: 6 },
          },
          {
            id: 'scan_2',
            stepTitle: '② 두 번째 신호 2 검사',
            operationLabel: '2 < smallest -> smallest = 2',
            codeSnippet: 'if s < smallest:\n    smallest = s  # 2로 갱신',
            prompt: '2는 6보다 작으므로 최솟값 smallest가 2로 갱신됩니다.',
            stateAfter: { current: 2, smallest: 2, largest: 6 },
          },
          {
            id: 'scan_9',
            stepTitle: '③ 세 번째 신호 9 검사',
            operationLabel: '9 > largest -> largest = 9',
            codeSnippet: 'if s > largest:\n    largest = s  # 9로 갱신',
            prompt: '9는 6보다 크므로 최댓값 largest가 9로 갱신됩니다.',
            stateAfter: { current: 9, smallest: 2, largest: 9 },
          },
          {
            id: 'scan_2_again',
            stepTitle: '④ 네 번째 신호 2 검사',
            operationLabel: '2 == smallest -> 상태 유지',
            codeSnippet: '# 2는 기존 범위 [2, 9] 내부 -> 유지',
            prompt: '2는 최솟값(2)과 같고 최댓값(9)보다 작으므로 두 상태 모두 그대로 유지됩니다.',
            stateAfter: { current: 2, smallest: 2, largest: 9 },
          },
        ],
        predictionPrompt: '최종 최솟값과 최댓값을 [smallest, largest] 리스트로 반환하세요.',
        rulePrompt: '첫 항목 기준 최소·최대 탐색 규칙',
        ruleStatement: '비어 있지 않은 리스트는 첫 항목으로 smallest와 largest를 시작한 뒤, 루프에서 더 작은 값과 더 큰 값을 만나면 각각 갱신합니다.',
      },
    },
    code: {
      entryFunction: 'find_signal_bounds',
      starterCode: `def find_signal_bounds(signals):
    # signals에는 하나 이상의 정수가 주어집니다.
    # 가장 작은 값과 가장 큰 값을 [smallest, largest] 형태로 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signals: [7, -2, 5] }, expected: [-2, 7] },
      { inputs: { signals: [4] }, expected: [4, 4] },
      { inputs: { signals: [-8, -3, -10] }, expected: [-10, -3] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_seq_minmax_32_1',
        title: '★★ 첫 항목 초기화와 양방향 갱신 원리',
        type: 'trace_understanding',
        prompt: '신호 리스트 [6, 2, 9, 2]에서 최소·최대 탐색 과정을 확인하세요.',
        codeSnippet: `def find_signal_bounds(signals):
    smallest = signals[0]
    largest = signals[0]
    for s in signals:
        if s < smallest:
            smallest = s
        if s > largest:
            largest = s
    return [smallest, largest]`,
        questions: [
          {
            id: 'q1',
            text: '임의의 숫자(예: 0이나 999) 대신 signals[0]으로 초기화하는 이유는 무엇일까요?',
            options: [
              { value: 'valid_candidate', label: '리스트에 실제로 존재하는 유효한 첫 번째 값을 기준 삼아 음수나 큰 수도 안전하게 처리하기 위해' },
              { value: 'syntax_error', label: '0으로 초기화하면 문법 에러가 발생하기 때문' },
              { value: 'only_first', label: '항상 첫 번째 값이 정답이기 때문' },
            ],
            expected: 'valid_candidate',
          },
          {
            id: 'q2',
            text: 'signals = [6, 2, 9, 2] 순회 중 2를 만났을 때 smallest만 바뀌고 largest는 바뀌지 않는 이유는?',
            options: [
              { value: 'only_smaller', label: '2는 현재 smallest(6)보다 작지만 largest(6)보다는 크지 않기 때문' },
              { value: 'largest_fixed', label: 'largest는 한 번 정해지면 바꿀 수 없기 때문' },
            ],
            expected: 'only_smaller',
          },
          {
            id: 'q3',
            text: '원소가 1개인 signals = [4]일 때 반환 결과는 무엇일까요?',
            options: [
              { value: 'both_four', label: '[4, 4] (유일한 원소가 최솟값이자 최댓값)' },
              { value: 'zero_four', label: '[0, 4]' },
              { value: 'error_single', label: '원소가 부족하여 에러' },
            ],
            expected: 'both_four',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_seq_minmax_32_t1',
        title: '신호 진폭(가장 큰 값과 가장 작은 값의 차이) 계산',
        description: '신호 리스트 signals(길이 1 이상)에서 가장 큰 값과 가장 작은 값의 차이(largest - smallest)를 반환하세요.',
        contextCard: {
          title: '📋 신호 진폭 계산 흐름',
          steps: [
            { label: '유효한 기준 세우기', text: '입력 안에 실제로 있는 값으로 두 경계 후보를 시작하세요.' },
            { label: '두 경계 갱신', text: '각 신호가 지금까지의 경계 바깥에 있는지 살펴보세요.' },
            { label: '경계 사이 거리', text: '모든 신호를 확인한 뒤 두 경계가 얼마나 떨어져 있는지 구하세요.' },
          ],
        },
        thoughtCheck: {
          prompt: '[smallest, largest]를 구한 뒤 진폭을 계산하려면 어떤 연산을 해야 할까요?',
          options: [
            { id: 'opt_sub', label: 'largest에서 smallest를 뺀다 (largest - smallest)', isCorrect: true },
            { id: 'opt_add', label: '두 값을 더한다 (largest + smallest)', isCorrect: false },
          ],
          feedback: '맞아요! 가장 큰 값과 가장 작은 값의 차이이므로 largest - smallest를 반환합니다.',
        },
        entryFunction: 'signal_span',
        starterCode: `def signal_span(signals):
    # signals에서 가장 큰 값과 가장 작은 값의 차이를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { signals: [10, 2, 8] }, expected: 8 },
          { inputs: { signals: [5] }, expected: 0 },
        ],
      },
    ],
  },
})
