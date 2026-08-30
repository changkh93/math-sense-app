/**
 * Private Problem Definition: AC-STR-COMPRESS-39 (반복 신호 압축기)
 */

module.exports = {
  problemId: 'AC-STR-COMPRESS-39',
  problemVersion: 1,
  entryFunction: 'compress_signal_runs',
  officialSolutionCode: `def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 1
    for current in signal[1:]:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
            count = 1
    groups.append([previous, count])
    return groups
`,
  alternativeSolutions: [
    `def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 0
    for current in signal:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
            count = 1
    groups.append([previous, count])
    return groups
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'RUN-GLOBAL-FREQUENCY',
      misconceptionCode: 'RUN-GLOBAL-FREQUENCY',
      expectedMisconception: 'RUN-GLOBAL-FREQUENCY',
      expectedFailingGroup: 'separated-same-symbol',
      code: `def compress_signal_runs(signal):
    seen = []
    counts = []
    for char in signal:
        if char not in seen:
            seen.append(char)
            counts.append(1)
        else:
            for i in range(len(seen)):
                if seen[i] == char:
                    counts[i] = counts[i] + 1
    groups = []
    for i in range(len(seen)):
        groups.append([seen[i], counts[i]])
    return groups
`,
    },
    {
      id: 'RUN-MISSING-FINAL',
      misconceptionCode: 'RUN-MISSING-FINAL',
      expectedMisconception: 'RUN-MISSING-FINAL',
      expectedFailingGroup: 'long-final-run',
      code: `def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 1
    for current in signal[1:]:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
            count = 1
    return groups
`,
    },
    {
      id: 'RUN-NO-RESET',
      misconceptionCode: 'RUN-NO-RESET',
      expectedMisconception: 'RUN-NO-RESET',
      expectedFailingGroup: 'reset-after-boundary',
      code: `def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 1
    for current in signal[1:]:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
    groups.append([previous, count])
    return groups
`,
    },
    {
      id: 'RUN-APPEND-EVERY-CHAR',
      misconceptionCode: 'RUN-APPEND-EVERY-CHAR',
      expectedMisconception: 'RUN-APPEND-EVERY-CHAR',
      expectedFailingGroup: 'single-run',
      code: `def compress_signal_runs(signal):
    groups = []
    for char in signal:
        groups.append([char, 1])
    return groups
`,
    },
  ],
  hiddenTests: [
    { inputs: { signal: 'AAAAA' }, expected: [['A', 5]], group: 'single-run' },
    { inputs: { signal: 'ABAB' }, expected: [['A', 1], ['B', 1], ['A', 1], ['B', 1]], group: 'alternating' },
    { inputs: { signal: 'AABA' }, expected: [['A', 2], ['B', 1], ['A', 1]], group: 'separated-same-symbol' },
    { inputs: { signal: 'K' }, expected: [['K', 1]], group: 'single-character' },
    { inputs: { signal: 'ABB' }, expected: [['A', 1], ['B', 2]], group: 'long-final-run' },
    { inputs: { signal: 'AABCC' }, expected: [['A', 2], ['B', 1], ['C', 2]], group: 'reset-after-boundary' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_str_compress_39_1',
      title: '★★ 연속 묶음과 전체 빈도의 차이',
      type: 'trace_understanding',
      prompt: '신호 "AABA"를 압축하는 흐름을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '신호 "AABA"에서 앞의 A와 맨 뒤의 A를 하나의 묶음으로 합치지 않는 이유는 무엇일까요?',
          options: [
            { value: 'keep_consecutive', label: '전체 개수를 세는 것이 아니라 연속으로 이어진 묶음 단위로 기록하기 때문' },
            { value: 'alphabet_order', label: '알파벳 순서대로 정렬해야 하기 때문' },
          ],
          expected: 'keep_consecutive',
        },
        {
          id: 'q2',
          text: '신호가 바뀌는 순간 새로운 신호로 넘어가기 전에 반드시 먼저 해야 할 일은 무엇일까요?',
          options: [
            { value: 'flush_previous', label: '지금까지 센 이전 신호와 횟수 묶음을 결과 목록에 기록한다' },
            { value: 'clear_all', label: '결과 목록을 비운다' },
          ],
          expected: 'flush_previous',
        },
        {
          id: 'q3',
          text: '모든 신호를 확인한 직후 마지막 묶음을 별도로 한 번 더 기록해야 하는 이유는 무엇일까요?',
          options: [
            { value: 'flush_last', label: '마지막 묶음은 신호가 바뀌는 경계를 만나지 못해 루프 안에서 아직 기록되지 않았기 때문' },
            { value: 'make_even', label: '전체 묶음 개수를 짝수로 맞추기 위해' },
          ],
          expected: 'flush_last',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_str_compress_39_t1',
      title: '온도 센서 연속 구간 요약',
      description: '길이 1 이상의 정수 센서 측정값 리스트(readings)가 주어질 때, 같은 온도가 연속으로 이어진 구간을 [온도, 연속 횟수] 형태의 묶음 목록으로 요약하여 반환하세요.',
      contextCard: {
        title: '📋 연속 구간 요약 사고 흐름',
        steps: [
          { label: '관찰', text: '첫 번째 측정값을 초기 기준값으로 삼고 연속 횟수를 1로 시작합니다.' },
          { label: '구분', text: '새 측정값이 이전 값과 같으면 횟수를 늘리고, 달라지면 이전 구간 묶음을 결과에 기록한 뒤 새 값으로 시작합니다.' },
          { label: '상태 갱신', text: '모든 측정값을 확인한 뒤 마지막 남은 구간 묶음까지 결과 목록에 추가합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '자료형이 문자열에서 숫자 리스트로 바뀌었을 때 연속 구간을 요약하는 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_principle', label: '자료형만 달라졌을 뿐, 이전 값과 비교하며 경계에서 묶음을 기록하고 초기화하는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_principle', label: '숫자는 크기순으로 정렬한 뒤에만 요약할 수 있다', isCorrect: false },
        ],
        feedback: '맞아요! 리스트의 원소들도 이전 항목과의 일치 여부를 대조해 동일한 방식으로 연속 묶음을 압축할 수 있습니다.',
      },
      entryFunction: 'compress_temperature_runs',
      starterCode: `def compress_temperature_runs(readings):
    # readings에는 한 개 이상의 정수가 주어집니다.
    # readings 리스트의 연속된 같은 값들을 [값, 횟수] 묶음 목록으로 요약하세요.
    pass
`,
      officialSolutionCode: `def compress_temperature_runs(readings):
    groups = []
    previous = readings[0]
    count = 1
    for current in readings[1:]:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
            count = 1
    groups.append([previous, count])
    return groups
`,
      testCases: [
        { inputs: { readings: [1, 1, 1, 3, 3] }, expected: [[1, 3], [3, 2]] },
        { inputs: { readings: [-5, -5, 0, 0, -5] }, expected: [[-5, 2], [0, 2], [-5, 1]] },
        { inputs: { readings: [7, 8, 9] }, expected: [[7, 1], [8, 1], [9, 1]] },
        { inputs: { readings: [0] }, expected: [[0, 1]] },
      ],
    },
  ],
}
