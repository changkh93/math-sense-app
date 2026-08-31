/**
 * AC-SRCH-LINEAR-58 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SRCH-LINEAR-58',
  problemVersion: 1,
  entryFunction: 'find_first_cargo',
  officialSolutionCode: `def find_first_cargo(cargos, target):
    for i in range(len(cargos)):
        if cargos[i] == target:
            return i
    return -1
`,
  alternativeSolutions: [
    // for-else 대신 불리언 플래그를 쓰는 동일 전략 표현.
    `def find_first_cargo(cargos, target):
    found_index = -1
    for i in range(len(cargos)):
        if cargos[i] == target:
            found_index = i
            return found_index
    return found_index
`,
  ],
  intendedWrongFixtures: [
    {
      // 위치 대신 찾았는지 여부만 반환하는 오개념.
      id: 'LINEAR-RETURNS-BOOLEAN',
      expectedFailingGroup: 'first-position',
      code: `def find_first_cargo(cargos, target):
    for i in range(len(cargos)):
        if cargos[i] == target:
            return True
    return False
`,
    },
    {
      // 첫 위치가 아니라 마지막 위치를 돌려주는 오개념.
      id: 'LINEAR-RETURNS-LAST-MATCH',
      expectedFailingGroup: 'duplicate-first-occurrence',
      code: `def find_first_cargo(cargos, target):
    found_index = -1
    for i in range(len(cargos)):
        if cargos[i] == target:
            found_index = i
    return found_index
`,
    },
    {
      // 실패를 0으로 알려주는 오개념: 0은 실제 위치와 구분되지 않는다.
      id: 'LINEAR-DEFAULTS-TO-ZERO',
      expectedFailingGroup: 'not-found',
      code: `def find_first_cargo(cargos, target):
    for i in range(len(cargos)):
        if cargos[i] == target:
            return i
    return 0
`,
    },
    {
      // 첫 칸만 확인하고 포기하는 오개념.
      id: 'LINEAR-CHECKS-FIRST-ONLY',
      expectedFailingGroup: 'middle-position',
      code: `def find_first_cargo(cargos, target):
    if cargos[0] == target:
        return 0
    return -1
`,
    },
  ],
  hiddenTests: [
    // 첫 위치.
    { inputs: { cargos: [7, 2, 9], target: 7 }, expected: 0, group: 'first-position' },
    // 중간 위치.
    { inputs: { cargos: [1, 5, 2], target: 5 }, expected: 1, group: 'middle-position' },
    // 마지막 위치.
    { inputs: { cargos: [3, 6, 4], target: 4 }, expected: 2, group: 'last-position' },
    // 중복 값이 있을 때 첫 위치를 돌려주는지 확인한다.
    { inputs: { cargos: [2, 9, 2, 9], target: 9 }, expected: 1, group: 'duplicate-first-occurrence' },
    // 못 찾음.
    { inputs: { cargos: [10, 20], target: 30 }, expected: -1, group: 'not-found' },
    // 빈 목록.
    { inputs: { cargos: [], target: 1 }, expected: -1, group: 'empty-list' },
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
  transferMasterSet: [
    {
      transferChallengeId: 'tc_srch_058_transfer_1',
      title: '신호 목록에서 첫 일치 찾기',
      description: '문자 신호 목록(signals)에서 찾는 신호(target)가 처음 나타난 위치를 반환하고, 없으면 -1을 반환합니다.',
      entryFunction: 'find_first_signal',
      starterCode: `def find_first_signal(signals, target):
    # 처음 나타난 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
      officialSolutionCode: `def find_first_signal(signals, target):
    for i in range(len(signals)):
        if signals[i] == target:
            return i
    return -1
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
        // 마지막 위치.
        { inputs: { signals: ['A', 'B', 'C'], target: 'C' }, expected: 2 },
        // 중복 값의 첫 위치.
        { inputs: { signals: ['X', 'X'], target: 'X' }, expected: 0 },
        // 빈 목록.
        { inputs: { signals: [], target: 'A' }, expected: -1 },
        // 중간 위치.
        { inputs: { signals: ['M', 'N', 'O', 'P'], target: 'O' }, expected: 2 },
      ],
    },
  ],
}
