/**
 * Server-only Private Problem Definition for AC-CODE-FIRST-ERROR-01
 */

module.exports = {
  problemId: 'AC-CODE-FIRST-ERROR-01',
  problemVersion: 1,
  entryFunction: 'find_first_error',
  officialSolutionCode: `def find_first_error(logs, threshold):
    for i in range(len(logs)):
        if logs[i] < threshold:
            return i
    return -1
`,
  alternativeSolutions: [
    `def find_first_error(logs, threshold):
    idx = 0
    while idx < len(logs):
        if logs[idx] < threshold:
            return idx
        idx += 1
    return -1
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'returns_value_instead_of_index',
      code: `def find_first_error(logs, threshold):
    for val in logs:
        if val < threshold:
            return val
    return -1
`,
      expectedFailingGroup: 'negative_value_present',
    },
    {
      label: 'always_returns_last_error',
      code: `def find_first_error(logs, threshold):
    last = -1
    for i in range(len(logs)):
        if logs[i] < threshold:
            last = i
    return last
`,
      expectedFailingGroup: 'multiple_errors',
    },
  ],
  hiddenTests: [
    { inputs: { logs: [100, 200, 50, -1, 30], threshold: 0 }, expected: 3, group: 'negative_value_present' },
    { inputs: { logs: [10, 5, 2, 8], threshold: 5 }, expected: 2, group: 'threshold_boundary' },
    { inputs: { logs: [10, -5, -20, 30], threshold: 0 }, expected: 1, group: 'multiple_errors' },
    { inputs: { logs: [10, 20, 30], threshold: 5 }, expected: -1, group: 'no_error_present' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_code_008_1',
      prompt: '신호 리스트 [10, 20, 5, -1, 30]에서 0 미만의 오류 신호가 처음 발생한 인덱스는 어디일까요?',
      questions: [
        {
          id: 'q1',
          text: '0 미만의 최초 오류 인덱스는?',
          options: [
            { value: '3', label: '3' },
            { value: '-1', label: '-1' },
            { value: '2', label: '2' },
          ],
          expected: '3',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_code_008_transfer_1',
      title: '과부하 경고 최초 인덱스',
      description: '기준치 threshold를 초과한 최초의 인덱스를 반환하세요.',
      entryFunction: 'find_first_overload',
      starterCode: 'def find_first_overload(loads, threshold):\n    pass\n',
      officialSolutionCode: `def find_first_overload(loads, threshold):
    for i in range(len(loads)):
        if loads[i] > threshold:
            return i
    return -1
`,
      testCases: [
        { inputs: { loads: [50, 70, 120, 80], threshold: 100 }, expected: 2 },
        { inputs: { loads: [10, 20, 30], threshold: 50 }, expected: -1 },
      ],
    },
  ],
}
