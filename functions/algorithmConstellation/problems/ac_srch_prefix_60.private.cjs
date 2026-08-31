/**
 * AC-SRCH-PREFIX-60 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SRCH-PREFIX-60',
  problemVersion: 1,
  entryFunction: 'range_radiation_sums',
  // 첨자 중첩(prefix[query[1]])은 미지원이므로 인덱스로 쓸 값을 변수에 추출한다.
  officialSolutionCode: `def range_radiation_sums(levels, queries):
    prefix = [0]
    total = 0
    for level in levels:
        total = total + level
        prefix.append(total)
    result = []
    for query in queries:
        start = query[0]
        end = query[1]
        result.append(prefix[end + 1] - prefix[start])
    return result
`,
  intendedWrongFixtures: [
    {
      // 구간 끝 칸을 빠뜨리는 오개념(end + 1 미적용).
      id: 'PREFIX-EXCLUDES-END',
      expectedFailingGroup: 'full-range',
      code: `def range_radiation_sums(levels, queries):
    prefix = [0]
    total = 0
    for level in levels:
        total = total + level
        prefix.append(total)
    result = []
    for query in queries:
        start = query[0]
        end = query[1]
        result.append(prefix[end] - prefix[start])
    return result
`,
    },
    {
      // 선두 0을 두지 않는 오개념: 첫 칸부터 시작하는 구간에서 어긋난다.
      id: 'PREFIX-NO-LEADING-ZERO',
      expectedFailingGroup: 'start-at-zero',
      code: `def range_radiation_sums(levels, queries):
    prefix = []
    total = 0
    for level in levels:
        total = total + level
        prefix.append(total)
    result = []
    for query in queries:
        start = query[0]
        end = query[1]
        result.append(prefix[end] - prefix[start - 1])
    return result
`,
    },
    {
      // 구간과 상관없이 전체 합을 반환하는 오개념.
      id: 'PREFIX-RETURNS-TOTAL-FOR-EVERY-QUERY',
      expectedFailingGroup: 'single-element-range',
      code: `def range_radiation_sums(levels, queries):
    total = 0
    for level in levels:
        total = total + level
    result = []
    for query in queries:
        result.append(total)
    return result
`,
    },
    {
      // 첫 질의만 처리하고 반환하는 오개념.
      id: 'PREFIX-PROCESSES-FIRST-QUERY-ONLY',
      expectedFailingGroup: 'multiple-overlapping-ranges',
      code: `def range_radiation_sums(levels, queries):
    prefix = [0]
    total = 0
    for level in levels:
        total = total + level
        prefix.append(total)
    result = []
    for query in queries:
        start = query[0]
        end = query[1]
        result.append(prefix[end + 1] - prefix[start])
        return result
    return result
`,
    },
  ],
  hiddenTests: [
    // 첫 칸부터 시작하는 구간: 선두 0이 필요한 경계.
    { inputs: { levels: [4, 1, 6], queries: [[0, 2]] }, expected: [11], group: 'start-at-zero' },
    // 한 칸 구간.
    { inputs: { levels: [9, 2, 8], queries: [[1, 1]] }, expected: [2], group: 'single-element-range' },
    // 전체 구간: 끝 칸 포함을 검사한다.
    { inputs: { levels: [5, 5, 5], queries: [[0, 2]] }, expected: [15], group: 'full-range' },
    // 겹치는 여러 질의.
    { inputs: { levels: [1, 2, 3, 4], queries: [[0, 2], [1, 2], [0, 3]] }, expected: [6, 5, 10], group: 'multiple-overlapping-ranges' },
    // 같은 질의 반복.
    { inputs: { levels: [3, 1, 4], queries: [[0, 1], [0, 1]] }, expected: [4, 4], group: 'repeated-query' },
    // 한 칸짜리 기록.
    { inputs: { levels: [7], queries: [[0, 0]] }, expected: [7], group: 'single-level' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_srch_060_1',
      title: '누적 차 구간합 이해',
      prompt: '누적 기록으로 구간합을 구하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '구간합을 구할 때 누적 기록의 end + 1 번째 값을 쓰는 이유는 무엇일까요?',
          options: [
            { value: 'leading_zero_offset', label: '선두 0 때문에 누적 기록이 한 칸 뒤로 밀려 있어 end 칸의 합은 end + 1에 기록되어서' },
            { value: 'off_by_one_bug', label: '하나 더 세는 실수를 숨기기 위해서' },
          ],
          expected: 'leading_zero_offset',
        },
        {
          id: 'q2',
          text: '누적 기록 맨 앞에 0을 두는 이유는 무엇일까요?',
          options: [
            { value: 'empty_prefix_anchor', label: '아직 아무 칸도 더하지 않은 상태가 있어야 첫 칸부터 시작하는 구간도 뺄셈으로 구할 수 있어서' },
            { value: 'make_longer', label: '기록을 한 칸 길게 만들기 위해서' },
          ],
          expected: 'empty_prefix_anchor',
        },
        {
          id: 'q3',
          text: '겹치는 여러 질의를 매번 처음부터 더하지 않아도 되는 이유는 무엇일까요?',
          options: [
            { value: 'reuse_prefix', label: '누적 기록을 한 번 만들어 두면 질의마다 뺄셈 한 번으로 답이 나오기 때문에' },
            { value: 'queries_rare', label: '질의가 항상 하나뿐이기 때문에' },
          ],
          expected: 'reuse_prefix',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_srch_060_transfer_1',
      title: '에너지 소비 기록의 구간 합',
      description: '에너지 소비 기록(energy_log)과 구간 질의 목록(windows, 양 끝 포함)을 받아 각 구간의 합 목록을 반환합니다.',
      entryFunction: 'range_energy_sums',
      starterCode: `def range_energy_sums(energy_log, windows):
    # 각 질의 [시작, 끝] 구간의 합 목록을 반환하세요.
    pass
`,
      officialSolutionCode: `def range_energy_sums(energy_log, windows):
    prefix = [0]
    total = 0
    for usage in energy_log:
        total = total + usage
        prefix.append(total)
    result = []
    for span in windows:
        start = span[0]
        end = span[1]
        result.append(prefix[end + 1] - prefix[start])
    return result
`,
      contextCard: {
        title: '🔋 구간 에너지 합 전략',
        strategyGuide: '맨 앞에 0을 둔 누적 기록을 만든 뒤, 구간 끝의 누적값에서 구간 앞의 누적값을 빼면 각 구간의 합이 바로 나옵니다.',
      },
      thoughtCheck: {
        question: '누적 기록이 [0, 2, 6, 12]일 때 구간 [1, 2]의 합은 어떻게 구할까요?',
        options: [
          { value: 'difference', label: '12가 아니라 12 빼기 2인 10 — 두 누적값의 차다' },
          { value: 'last_value', label: '12 — 항상 마지막 누적값을 쓴다' },
        ],
        expected: 'difference',
      },
      testCases: [
        { inputs: { energy_log: [1, 1, 1, 1], windows: [[0, 3], [1, 2]] }, expected: [4, 2] },
        { inputs: { energy_log: [8, 2], windows: [[1, 1]] }, expected: [2] },
        { inputs: { energy_log: [3], windows: [[0, 0]] }, expected: [3] },
        { inputs: { energy_log: [4, 0, 4, 0, 4], windows: [[0, 4], [2, 3]] }, expected: [12, 4] },
      ],
    },
  ],
}
