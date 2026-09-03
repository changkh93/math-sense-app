/** Server-only definition: AC-MEMO-CLIMB-01. */
module.exports = {
  problemId: 'AC-MEMO-CLIMB-01',
  problemVersion: 1,
  entryFunction: 'count_climb_ways',
  starterCode: `def count_climb_ways(n):
    # 1칸 또는 2칸씩 올라 n번째 계단에 도달하는 총 방법의 수를 반환하세요.
    pass
`,
  officialSolutionCode: `def count_climb_ways(n):
    if n == 0:
        return 1
    if n == 1:
        return 1
    ways = [1, 1]
    for i in range(2, n + 1):
        val = ways[i - 1] + ways[i - 2]
        ways.append(val)
    return ways[n]
`,
  alternativeSolutions: [
    `def count_climb_ways(n):
    if n <= 1:
        return 1
    prev2 = 1
    prev1 = 1
    for _ in range(2, n + 1):
        curr = prev1 + prev2
        prev2 = prev1
        prev1 = curr
    return prev1
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'SEED-THREE',
      expectedFailingGroup: 'base_seeds',
      code: `def count_climb_ways(n):
    if n == 0:
        return 1
    if n == 1:
        return 1
    ways = [1, 1, 3]
    for i in range(3, n + 1):
        val = ways[i - 1] + ways[i - 2]
        ways.append(val)
    return ways[n]
`,
    },
    {
      id: 'DOUBLE-PREV',
      expectedFailingGroup: 'additive_combination',
      code: `def count_climb_ways(n):
    if n <= 1:
        return 1
    ways = [1, 1]
    for i in range(2, n + 1):
        val = ways[i - 1] * 2
        ways.append(val)
    return ways[n]
`,
    },
    {
      id: 'RETURN-N-MINUS-ONE',
      expectedFailingGroup: 'large_scale',
      code: `def count_climb_ways(n):
    return n - 1
`,
    },
    {
      id: 'OFF-BY-ONE',
      expectedFailingGroup: 'index_boundary',
      code: `def count_climb_ways(n):
    if n <= 1:
        return 1
    ways = [1, 1]
    for i in range(2, n + 1):
        val = ways[i - 1] + ways[i - 2]
        ways.append(val)
    return ways[n - 1]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { n: 0 },
      expected: 1,
      group: 'base_seeds',
    },
    {
      inputs: { n: 1 },
      expected: 1,
      group: 'base_seeds',
    },
    {
      inputs: { n: 2 },
      expected: 2,
      group: 'base_seeds',
    },
    {
      inputs: { n: 5 },
      expected: 8,
      group: 'additive_combination',
    },
    {
      inputs: { n: 10 },
      expected: 89,
      group: 'index_boundary',
    },
    {
      inputs: { n: 30 },
      expected: 1346269,
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_memo_093_1',
      title: '메모이제이션의 핵심 이점',
      prompt: '표를 활용한 상향식 계산의 특성을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: 'n번째 계단을 오르는 방법 수를 구할 때 각 계단의 값을 단 한 번씩만 계산하는 이유는?',
          options: [
            { value: 'table_lookup', label: '이미 구한 작은 답을 표(리스트)에 넣어 두고 필요할 때 즉시 꺼내 쓰기 때문' },
            { value: 'magic_formula', label: '수학 공식이 자동으로 계산해주기 때문' },
          ],
          expected: 'table_lookup',
        },
        {
          id: 'q2',
          text: '이처럼 작은 답을 표에 저장하고 재사용하는 기법을 부르는 용어는?',
          options: [
            { value: 'memoization', label: '메모이제이션(Memoization / 동적 계획법)' },
            { value: 'random_search', label: '무작위 탐색' },
          ],
          expected: 'memoization',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_memo_093_transfer_1',
      title: '1칸 또는 3칸 도약 신호 패턴',
      description: '신호가 1칸 또는 3칸씩 전진할 수 있을 때, n번째 위치에 도달하는 서로 다른 방법의 수를 구하세요 (ways[i] = ways[i-1] + ways[i-3]).',
      entryFunction: 'count_signal_patterns',
      starterCode: `def count_signal_patterns(n):
    # 1칸 또는 3칸 전진하여 n번째 위치에 도달하는 방법 수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_signal_patterns(n):
    if n <= 2:
        return 1
    ways = [1, 1, 1]
    for i in range(3, n + 1):
        val = ways[i - 1] + ways[i - 3]
        ways.append(val)
    return ways[n]
`,
      contextCard: {
        title: '📶 3단 도약 신호',
        strategyGuide: 'n=0, 1, 2는 모두 1가지이고, 3부터는 ways[i-1] + ways[i-3]으로 표를 채워나갑니다.',
      },
      thoughtCheck: {
        question: 'n이 3일 때의 도약 방법 수는?',
        options: [
          { value: 'ans_2', label: '2가지 (1+1+1, 3)' },
          { value: 'ans_3', label: '3가지' },
        ],
        expected: 'ans_2',
      },
      testCases: [
        {
          inputs: { n: 0 },
          expected: 1,
        },
        {
          inputs: { n: 1 },
          expected: 1,
        },
        {
          inputs: { n: 2 },
          expected: 1,
        },
        {
          inputs: { n: 6 },
          expected: 6,
        },
        {
          inputs: { n: 5 },
          expected: 4,
        },
      ],
    },
  ],
}
