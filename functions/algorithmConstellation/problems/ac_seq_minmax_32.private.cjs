/**
 * Private Problem Definition: AC-SEQ-MINMAX-32 (가장 약한 신호와 강한 신호)
 */

module.exports = {
  problemId: 'AC-SEQ-MINMAX-32',
  problemVersion: 1,
  entryFunction: 'find_signal_bounds',
  officialSolutionCode: `def find_signal_bounds(signals):
    smallest = signals[0]
    largest = signals[0]
    for s in signals:
        if s < smallest:
            smallest = s
        if s > largest:
            largest = s
    return [smallest, largest]
`,
  alternativeSolutions: [
    `def find_signal_bounds(signals):
    mn = signals[0]
    mx = signals[0]
    for val in signals:
        if val < mn:
            mn = val
        elif val > mx:
            mx = val
    return [mn, mx]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MINMAX-INIT-ZERO',
      misconceptionCode: 'SEQ-INIT-ZERO',
      expectedMisconception: 'SEQ-INIT-ZERO',
      expectedFailingGroup: 'negative_only',
      code: `def find_signal_bounds(signals):
    smallest = 0
    largest = 0
    for s in signals:
        if s < smallest:
            smallest = s
        if s > largest:
            largest = s
    return [smallest, largest]
`,
    },
    {
      id: 'MINMAX-ONLY-SMALLEST',
      misconceptionCode: 'SEQ-UPDATE-ONE-BOUND',
      expectedMisconception: 'SEQ-UPDATE-ONE-BOUND',
      expectedFailingGroup: 'all_positive',
      code: `def find_signal_bounds(signals):
    smallest = signals[0]
    largest = signals[0]
    for s in signals:
        if s < smallest:
            smallest = s
    return [smallest, largest]
`,
    },
    {
      id: 'MINMAX-REVERSED-RETURN',
      misconceptionCode: 'SEQ-REVERSED-BOUNDS',
      expectedMisconception: 'SEQ-REVERSED-BOUNDS',
      expectedFailingGroup: 'all_positive',
      code: `def find_signal_bounds(signals):
    smallest = signals[0]
    largest = signals[0]
    for s in signals:
        if s < smallest:
            smallest = s
        if s > largest:
            largest = s
    return [largest, smallest]
`,
    },
    {
      id: 'MINMAX-LAST-ONLY',
      misconceptionCode: 'SEQ-LAST-ITEM-CONFUSION',
      expectedMisconception: 'SEQ-LAST-ITEM-CONFUSION',
      expectedFailingGroup: 'descending',
      code: `def find_signal_bounds(signals):
    return [signals[-1], signals[-1]]
`,
    },
  ],
  hiddenTests: [
    { inputs: { signals: [8, 3, 12, 1] }, expected: [1, 12], group: 'all_positive' },
    { inputs: { signals: [-20, -5, -30] }, expected: [-30, -5], group: 'negative_only' },
    { inputs: { signals: [-5, 0, 6] }, expected: [-5, 6], group: 'contains_zero' },
    { inputs: { signals: [2, 2, 2] }, expected: [2, 2], group: 'duplicates' },
    { inputs: { signals: [-100, 100, 0] }, expected: [-100, 100], group: 'boundary_values' },
    { inputs: { signals: [9, 6, 3, -1] }, expected: [-1, 9], group: 'descending' },
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
  transferMasterSet: [
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
      officialSolutionCode: `def signal_span(signals):
    smallest = signals[0]
    largest = signals[0]
    for s in signals:
        if s < smallest:
            smallest = s
        if s > largest:
            largest = s
    return largest - smallest
`,
      testCases: [
        { inputs: { signals: [8, 3, 12, 1] }, expected: 11 },
        { inputs: { signals: [-20, -5, -30] }, expected: 25 },
        { inputs: { signals: [7, 7, 7] }, expected: 0 },
        { inputs: { signals: [-100, 100] }, expected: 200 },
      ],
    },
  ],
}
