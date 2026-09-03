/** Server-only definition: AC-REC-BASE-91. */
module.exports = {
  problemId: 'AC-REC-BASE-91',
  problemVersion: 1,
  entryFunction: 'build_small_answers',
  starterCode: `def build_small_answers(n):
    # 0칸부터 n칸 크기까지 각 높이를 채우는 방법의 수를 담은 표 전체를 반환하세요.
    pass
`,
  officialSolutionCode: `def build_small_answers(n):
    if n == 0:
        return [1]
    table = [1, 1]
    for i in range(2, n + 1):
        val = table[i - 1] + table[i - 2]
        table.append(val)
    return table
`,
  alternativeSolutions: [
    `def build_small_answers(n):
    res = [1]
    if n > 0:
        res.append(1)
        for idx in range(2, n + 1):
            res.append(res[idx - 1] + res[idx - 2])
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'SEED-ZERO',
      expectedFailingGroup: 'base_seeds',
      code: `def build_small_answers(n):
    if n == 0:
        return [0]
    table = [0, 1]
    for i in range(2, n + 1):
        val = table[i - 1] + table[i - 2]
        table.append(val)
    return table
`,
    },
    {
      id: 'FORMULA-OFFSET',
      expectedFailingGroup: 'formula_relation',
      code: `def build_small_answers(n):
    if n == 0:
        return [1]
    table = [1, 1]
    for i in range(2, n + 1):
        val = table[i - 1] + table[i - 2] + 1
        table.append(val)
    return table
`,
    },
    {
      id: 'REVERSE-TABLE',
      expectedFailingGroup: 'order_sequence',
      code: `def build_small_answers(n):
    if n == 0:
        return [1]
    table = [1, 1]
    for i in range(2, n + 1):
        val = table[i - 1] + table[i - 2]
        table.append(val)
    rev = []
    k = len(table)
    while k > 0:
        k = k - 1
        rev.append(table[k])
    return rev
`,
    },
    {
      id: 'OMIT-LAST',
      expectedFailingGroup: 'length_coverage',
      code: `def build_small_answers(n):
    if n == 0:
        return []
    table = [1, 1]
    for i in range(2, n):
        val = table[i - 1] + table[i - 2]
        table.append(val)
    return table
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { n: 0 },
      expected: [1],
      group: 'base_seeds',
    },
    {
      inputs: { n: 1 },
      expected: [1, 1],
      group: 'base_seeds',
    },
    {
      inputs: { n: 3 },
      expected: [1, 1, 2, 3],
      group: 'formula_relation',
    },
    {
      inputs: { n: 5 },
      expected: [1, 1, 2, 3, 5, 8],
      group: 'order_sequence',
    },
    {
      inputs: { n: 10 },
      expected: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      group: 'length_coverage',
    },
    {
      inputs: { n: 30 },
      expected: [
        1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
        89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765,
        10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040,
        1346269,
      ],
      group: 'length_coverage',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_rec_091_1',
      title: '작아지는 구조의 조립 원리',
      prompt: '큰 문제가 작은 문제들로 분해되는 구조를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '높이 5칸의 답 table[5]를 구하기 위해 직접 더해야 하는 두 칸은 무엇일까요?',
          options: [
            { value: 'prev_two', label: 'table[4]와 table[3]' },
            { value: 'first_two', label: 'table[0]과 table[1]' },
          ],
          expected: 'prev_two',
        },
        {
          id: 'q2',
          text: '표의 0번째 칸과 1번째 칸(씨앗)을 미리 정해 두어야 하는 이유는 무엇일까요?',
          options: [
            { value: 'base_case', label: '더 작은 문제로 쪼갤 수 없는 가장 단순한 기본 상태이기 때문' },
            { value: 'no_reason', label: '규칙상 아무 값이나 채워야 하기 때문' },
          ],
          expected: 'base_case',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_rec_091_transfer_1',
      title: '신호 성장 관측 표',
      description: '일수 days(0 이상)가 주어질 때, 0일부터 days일까지 매일 어제와 그저께의 크기가 더해져 자라나는 신호 크기 목록 전체를 반환하세요.',
      entryFunction: 'signal_growth_table',
      starterCode: `def signal_growth_table(days):
    # 0일부터 days일까지의 신호 크기 목록을 반환하세요.
    pass
`,
      officialSolutionCode: `def signal_growth_table(days):
    if days == 0:
        return [1]
    table = [1, 1]
    for i in range(2, days + 1):
        val = table[i - 1] + table[i - 2]
        table.append(val)
    return table
`,
      contextCard: {
        title: '📡 신호 성장 추적',
        strategyGuide: '0일(1)과 1일(1)의 씨앗을 먼저 놓고, 2일부터 days일까지 이전 두 날의 값을 더해 표에 append합니다.',
      },
      thoughtCheck: {
        question: 'days가 0일 때 반환되어야 하는 목록의 길이는?',
        options: [
          { value: 'len_1', label: '길이 1의 [1]' },
          { value: 'len_0', label: '빈 목록 []' },
        ],
        expected: 'len_1',
      },
      testCases: [
        {
          inputs: { days: 0 },
          expected: [1],
        },
        {
          inputs: { days: 4 },
          expected: [1, 1, 2, 3, 5],
        },
        {
          inputs: { days: 7 },
          expected: [1, 1, 2, 3, 5, 8, 13, 21],
        },
      ],
    },
  ],
}
