/**
 * Private Problem Definition: AC-STR-PATTERN-40 (IOI 구조 신호 찾기)
 */

module.exports = {
  problemId: 'AC-STR-PATTERN-40',
  problemVersion: 1,
  entryFunction: 'count_ioi_signals',
  officialSolutionCode: `def count_ioi_signals(message):
    matches = 0
    recent = []
    for current in message:
        recent.append(current)
        if recent == ["I", "O", "I"]:
            matches = matches + 1
        recent = recent[-2:]
    return matches
`,
  alternativeSolutions: [
    `def count_ioi_signals(message):
    matches = 0
    two_back = ""
    one_back = ""
    for current in message:
        if two_back == "I" and one_back == "O" and current == "I":
            matches = matches + 1
        two_back = one_back
        one_back = current
    return matches
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'PATTERN-DROP-OVERLAP',
      misconceptionCode: 'PATTERN-DROP-OVERLAP',
      expectedMisconception: 'PATTERN-DROP-OVERLAP',
      expectedFailingGroup: 'overlapping',
      code: `def count_ioi_signals(message):
    matches = 0
    recent = []
    for current in message:
        recent.append(current)
        if recent == ["I", "O", "I"]:
            matches = matches + 1
            recent = []
        else:
            recent = recent[-2:]
    return matches
`,
    },
    {
      id: 'PATTERN-TRIM-BEFORE-CHECK',
      misconceptionCode: 'PATTERN-TRIM-BEFORE-CHECK',
      expectedMisconception: 'PATTERN-TRIM-BEFORE-CHECK',
      expectedFailingGroup: 'exact-one',
      code: `def count_ioi_signals(message):
    matches = 0
    recent = []
    for current in message:
        recent.append(current)
        recent = recent[-2:]
        if recent == ["I", "O", "I"]:
            matches = matches + 1
    return matches
`,
    },
    {
      id: 'PATTERN-COUNT-CHARACTERS',
      misconceptionCode: 'PATTERN-COUNT-CHARACTERS',
      expectedMisconception: 'PATTERN-COUNT-CHARACTERS',
      expectedFailingGroup: 'same-frequency-different-order',
      code: `def count_ioi_signals(message):
    i_count = 0
    o_count = 0
    for char in message:
        if char == "I":
            i_count = i_count + 1
        elif char == "O":
            o_count = o_count + 1
    if i_count >= 2 and o_count >= 1:
        return 1
    return 0
`,
    },
    {
      id: 'PATTERN-FIRST-WINDOW-ONLY',
      misconceptionCode: 'PATTERN-FIRST-WINDOW-ONLY',
      expectedMisconception: 'PATTERN-FIRST-WINDOW-ONLY',
      expectedFailingGroup: 'match-at-last-start',
      code: `def count_ioi_signals(message):
    first_three = []
    position = 0
    for current in message:
        if position < 3:
            first_three.append(current)
        position = position + 1
    if first_three == ["I", "O", "I"]:
        return 1
    return 0
`,
    },
  ],
  hiddenTests: [
    { inputs: { message: '' }, expected: 0, group: 'empty-or-short' },
    { inputs: { message: 'IO' }, expected: 0, group: 'empty-or-short' },
    { inputs: { message: 'IOIOIOI' }, expected: 3, group: 'overlapping' },
    { inputs: { message: 'OOOIOI' }, expected: 1, group: 'match-at-last-start' },
    { inputs: { message: 'IOIOOOIOI' }, expected: 2, group: 'separated-matches' },
    { inputs: { message: 'OII' }, expected: 0, group: 'same-frequency-different-order' },
    { inputs: { message: 'IIIII' }, expected: 0, group: 'no-match' },
    { inputs: { message: 'IOI' }, expected: 1, group: 'exact-one' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_str_pattern_40_1',
      title: '★★ 겹치는 패턴 탐색과 검사 창 유지',
      type: 'trace_understanding',
      prompt: '문자열 "IOIOI"에서 목표 패턴을 찾는 과정을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '0번 위치에서 첫 번째 "IOI"를 찾은 뒤 검사 목록을 완전히 비우지 않고 최근 2글자만 남기는 이유는 무엇일까요?',
          options: [
            { value: 'catch_overlap', label: '2번 위치에서 시작하는 겹치는 다음 "IOI"를 놓치지 않고 잡기 위해' },
            { value: 'save_memory', label: '컴퓨터 메모리를 절약하기 위해' },
          ],
          expected: 'catch_overlap',
        },
        {
          id: 'q2',
          text: '만약 "IOI"를 찾자마자 검사 목록을 완전히 비워버리면 "IOIOI"의 결과는 어떻게 될까요?',
          options: [
            { value: 'miss_second', label: '두 번째 겹치는 신호를 놓쳐서 1개로 잘못 계산된다' },
            { value: 'same_two', label: '똑같이 2개가 된다' },
          ],
          expected: 'miss_second',
        },
        {
          id: 'q3',
          text: '길이가 2인 문자열 "IO"가 주어졌을 때 결과가 0이 되는 이유는 무엇일까요?',
          options: [
            { value: 'too_short', label: '문자 개수가 3개 미만이어서 3글자 목표 패턴이 한 번도 완성되지 못하기 때문' },
            { value: 'has_error', label: '오류가 발생하기 때문' },
          ],
          expected: 'too_short',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_str_pattern_40_t1',
      title: '비콘 신호 패턴 탐색',
      description: '정수 신호 리스트(beacons)가 주어질 때, 목표 패턴 [1, 0, 1]이 겹침을 포함하여 총 몇 번 나타나는지 개수를 반환하세요.',
      contextCard: {
        title: '📋 비콘 패턴 탐색 사고 흐름',
        steps: [
          { label: '관찰', text: '신호 리스트를 한 개씩 순회하며 최근 검사 목록에 추가합니다.' },
          { label: '구분', text: '최근 검사 목록이 목표 패턴 [1, 0, 1]과 일치하는지 비교하여 발견 개수를 누적합니다.' },
          { label: '상태 갱신', text: '다음 겹침 탐색을 위해 검사 목록에서 최근 두 개의 신호만 남깁니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '자료형이 문자열에서 숫자 리스트로 바뀌었을 때 겹치는 패턴을 찾는 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_window_logic', label: '자료형만 달라졌을 뿐, 최근 항목들을 보관하는 검사 목록을 갱신하며 목표와 비교하는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_window_logic', label: '숫자 리스트는 겹치는 구간을 셀 수 없다', isCorrect: false },
        ],
        feedback: '맞아요! 리스트에서도 최근 두 원소를 유지하며 순회하면 겹치는 패턴을 정확히 셀 수 있습니다.',
      },
      entryFunction: 'count_beacon_pattern',
      starterCode: `def count_beacon_pattern(beacons):
    # beacons 리스트에서 [1, 0, 1] 패턴이 나타나는 횟수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_beacon_pattern(beacons):
    matches = 0
    recent = []
    for current in beacons:
        recent.append(current)
        if recent == [1, 0, 1]:
            matches = matches + 1
        recent = recent[-2:]
    return matches
`,
      testCases: [
        { inputs: { beacons: [1, 0, 1, 0, 1, 0, 1] }, expected: 3 },
        { inputs: { beacons: [0, 0, 1, 0, 1] }, expected: 1 },
        { inputs: { beacons: [1, 0] }, expected: 0 },
        { inputs: { beacons: [0, 1, 1, 0] }, expected: 0 },
      ],
    },
  ],
}
