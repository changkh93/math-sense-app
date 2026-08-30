/**
 * Private Problem Definition: AC-SEQ-ADJACENT-34 (어제보다 세진 신호)
 */

module.exports = {
  problemId: 'AC-SEQ-ADJACENT-34',
  problemVersion: 1,
  entryFunction: 'count_signal_increases',
  officialSolutionCode: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    for current in signals:
        if current > previous:
            increases = increases + 1
        previous = current
    return increases
`,
  alternativeSolutions: [
    `def count_signal_increases(signals):
    prev = signals[0]
    cnt = 0
    for x in signals:
        if x > prev:
            cnt += 1
        prev = x
    return cnt
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ADJACENT-COMPARE-FIRST-ONLY',
      misconceptionCode: 'SEQ-COMPARE-FIRST-ONLY',
      expectedMisconception: 'SEQ-COMPARE-FIRST-ONLY',
      expectedFailingGroup: 'alternating',
      code: `def count_signal_increases(signals):
    first = signals[0]
    increases = 0
    for current in signals:
        if current > first:
            increases = increases + 1
    return increases
`,
    },
    {
      id: 'ADJACENT-PREV-OVERWRITE-EARLY',
      misconceptionCode: 'SEQ-PREV-OVERWRITE-EARLY',
      expectedMisconception: 'SEQ-PREV-OVERWRITE-EARLY',
      expectedFailingGroup: 'strictly_increasing',
      code: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    for current in signals:
        previous = current
        if current > previous:
            increases = increases + 1
    return increases
`,
    },
    {
      id: 'ADJACENT-COUNT-DROPS-INSTEAD',
      misconceptionCode: 'SEQ-INVERTED-COMPARISON',
      expectedMisconception: 'SEQ-INVERTED-COMPARISON',
      expectedFailingGroup: 'strictly_increasing',
      code: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    for current in signals:
        if current < previous:
            increases = increases + 1
        previous = current
    return increases
`,
    },
    {
      id: 'ADJACENT-EQUAL-AS-INCREASE',
      misconceptionCode: 'SEQ-NONSTRICT-INCREASE',
      expectedMisconception: 'SEQ-NONSTRICT-INCREASE',
      expectedFailingGroup: 'duplicates_between_changes',
      code: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    started = False
    for current in signals:
        if started and current >= previous:
            increases = increases + 1
        previous = current
        started = True
    return increases
`,
    },
  ],
  hiddenTests: [
    { inputs: { signals: [1, 3, 5, 7, 9] }, expected: 4, group: 'strictly_increasing' },
    { inputs: { signals: [9, 7, 5, 3, 1] }, expected: 0, group: 'strictly_decreasing' },
    { inputs: { signals: [1, 5, 2, 8, 3] }, expected: 2, group: 'alternating' },
    { inputs: { signals: [2, 4, 4, 6] }, expected: 2, group: 'duplicates_between_changes' },
    { inputs: { signals: [-10, -5, -8, 0] }, expected: 2, group: 'negative_values' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_seq_adjacent_34_1',
      title: '★★ 인접 비교와 덮어쓰기 순서 원리',
      type: 'trace_understanding',
      prompt: '신호 리스트 [3, 5, 4, 4, 7]에서 인접 비교 과정을 확인하세요.',
      codeSnippet: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    for current in signals:
        if current > previous:
            increases = increases + 1
        previous = current
    return increases`,
      questions: [
        {
          id: 'q1',
          text: 'if current > previous 비교 전에 previous = current 를 먼저 실행하면 어떤 문제가 생길까요?',
          options: [
            { value: 'prev_overwritten', label: '비교할 때 항상 current == previous가 되어 증가 횟수가 항상 0이 된다' },
            { value: 'double_count', label: '모든 숫자가 2번씩 카운트된다' },
          ],
          expected: 'prev_overwritten',
        },
        {
          id: 'q2',
          text: '[4, 4]처럼 바로 이전 값과 같은 값이 연속으로 나오면 증가 횟수에 포함될까요?',
          options: [
            { value: 'equal_not_increase', label: '포함되지 않는다 (strictly greater > 일 때만 증가)' },
            { value: 'equal_is_increase', label: '포함된다' },
          ],
          expected: 'equal_not_increase',
        },
        {
          id: 'q3',
          text: '원소가 1개인 signals = [5]의 증가 횟수가 0인 이유는 무엇일까요?',
          options: [
            { value: 'no_previous_element', label: '비교할 이전 원소가 없으므로 증가가 발생할 수 없기 때문' },
            { value: 'zero_is_error', label: '에러가 발생해야 하기 때문' },
          ],
          expected: 'no_previous_element',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_seq_adjacent_34_t1',
      title: '기온 하강 횟수 측정',
      description: '기온 측정값 리스트(readings, 길이 1 이상)에서 바로 이전 측정값보다 기온이 낮아진(current < previous) 횟수를 반환하세요.',
      contextCard: {
        title: '📋 기온 하강 횟수 측정 흐름',
        steps: [
          { label: '첫 기준 기억', text: '첫 측정값을 다음 값과 비교할 기준으로 기억하세요.' },
          { label: '먼저 비교', text: '현재 측정값이 바로 전 측정값보다 낮아졌는지 먼저 살펴보세요.' },
          { label: '그다음 이동', text: '판단과 기록을 마친 뒤 현재 값을 다음 비교의 기준으로 옮기세요.' },
        ],
      },
      thoughtCheck: {
        prompt: '증가 횟수에서 하강 횟수로 바뀔 때 변경해야 하는 핵심 부분은 어디일까요?',
        options: [
          { id: 'opt_cond_less', label: '비교 조건만 current < previous (하강)로 바꾼다', isCorrect: true },
          { id: 'opt_prev_init', label: 'previous를 0으로 바꾼다', isCorrect: false },
        ],
        feedback: '맞아요! 비교 조건만 < 로 바뀌고, 이전값 보존 후 덮어쓰는 구조는 동일합니다.',
      },
      entryFunction: 'count_temperature_drops',
      starterCode: `def count_temperature_drops(readings):
    # 바로 이전 측정값보다 낮아진 횟수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_temperature_drops(readings):
    previous = readings[0]
    drops = 0
    for current in readings:
        if current < previous:
            drops = drops + 1
        previous = current
    return drops
`,
      testCases: [
        { inputs: { readings: [30, 25, 20, 15] }, expected: 3 },
        { inputs: { readings: [10, 20, 15, 25, 10] }, expected: 2 },
        { inputs: { readings: [22, 22, 22] }, expected: 0 },
        { inputs: { readings: [-5, -10, -8, -15] }, expected: 2 },
      ],
    },
  ],
}
