/** Server-only definition: AC-REC-REPEAT-92. */
module.exports = {
  problemId: 'AC-REC-REPEAT-92',
  problemVersion: 1,
  entryFunction: 'count_repeat_work',
  starterCode: `def count_repeat_work(n):
    # 나이브 분해로 n의 답을 구할 때 작은 문제를 여는 총 횟수를 반환하세요.
    pass
`,
  officialSolutionCode: `def count_repeat_work(n):
    if n == 0:
        return 1
    if n == 1:
        return 1
    work = [1, 1]
    for i in range(2, n + 1):
        val = work[i - 1] + work[i - 2] + 1
        work.append(val)
    return work[n]
`,
  alternativeSolutions: [
    `def count_repeat_work(n):
    if n <= 1:
        return 1
    a = 1
    b = 1
    for _ in range(2, n + 1):
        c = a + b + 1
        a = b
        b = c
    return b
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'FIBONACCI-ONLY',
      expectedFailingGroup: 'self_counting',
      code: `def count_repeat_work(n):
    if n <= 1:
        return 1
    work = [1, 1]
    for i in range(2, n + 1):
        val = work[i - 1] + work[i - 2]
        work.append(val)
    return work[n]
`,
    },
    {
      id: 'SEED-ZERO',
      expectedFailingGroup: 'base_seeds',
      code: `def count_repeat_work(n):
    if n == 0:
        return 0
    if n == 1:
        return 0
    work = [0, 0]
    for i in range(2, n + 1):
        val = work[i - 1] + work[i - 2] + 1
        work.append(val)
    return work[n]
`,
    },
    {
      id: 'DOUBLE-PREV',
      expectedFailingGroup: 'branch_cost',
      code: `def count_repeat_work(n):
    if n <= 1:
        return 1
    work = [1, 1]
    for i in range(2, n + 1):
        val = 2 * work[i - 1]
        work.append(val)
    return work[n]
`,
    },
    {
      id: 'RETURN-N',
      expectedFailingGroup: 'growth_curve',
      code: `def count_repeat_work(n):
    return n
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
      inputs: { n: 3 },
      expected: 5,
      group: 'self_counting',
    },
    {
      inputs: { n: 4 },
      expected: 9,
      group: 'branch_cost',
    },
    {
      inputs: { n: 8 },
      expected: 67,
      group: 'growth_curve',
    },
    {
      inputs: { n: 25 },
      expected: 242785,
      group: 'growth_curve',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_rec_092_1',
      title: '반복 호출 비용의 증가',
      prompt: '기억하지 않는 단순 분해의 비용 특성을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '크기 5일 때 호출 수가 15번으로 불어나는 근본적인 이유는?',
          options: [
            { value: 'redundant_subtree', label: '이미 해결한 하위 문제들이 가지마다 중복으로 다시 계산되기 때문' },
            { value: 'calculation_error', label: '계산 공식이 틀렸기 때문' },
          ],
          expected: 'redundant_subtree',
        },
        {
          id: 'q2',
          text: '만약 구한 답을 표에 저장하고 꺼내 쓴다면 n=25를 구할 때 필요한 계산 횟수는 대략 몇 번일까요?',
          options: [
            { value: 'linear_n', label: '25번 안팎 (각 칸을 한 번씩만 채움)' },
            { value: 'huge_repeat', label: '24만 번 이상' },
          ],
          expected: 'linear_n',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_rec_092_transfer_1',
      title: '두 갈래 탐사의 중복 방문 수',
      description: '두 갈래로 뻗어나가는 탐사 경로에서 단계 spans가 주어질 때, 같은 지점을 반복 방문하는 총 횟수를 점화 관계를 통해 계산하여 반환하세요.',
      entryFunction: 'count_duplicate_visits',
      starterCode: `def count_duplicate_visits(spans):
    # spans 단계에서의 총 방문 횟수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_duplicate_visits(spans):
    if spans == 0:
        return 1
    if spans == 1:
        return 1
    work = [1, 1]
    for i in range(2, spans + 1):
        val = work[i - 1] + work[i - 2] + 1
        work.append(val)
    return work[spans]
`,
      contextCard: {
        title: '🌲 갈래길 탐사 비용',
        strategyGuide: 'spans가 0이나 1이면 1번, 그 이후는 work[i-1] + work[i-2] + 1로 누적 계산합니다.',
      },
      thoughtCheck: {
        question: 'spans가 3일 때의 총 방문 횟수는?',
        options: [
          { value: 'ans_5', label: '5회 (3 + 1 + 1)' },
          { value: 'ans_4', label: '4회' },
        ],
        expected: 'ans_5',
      },
      testCases: [
        {
          inputs: { spans: 0 },
          expected: 1,
        },
        {
          inputs: { spans: 3 },
          expected: 5,
        },
        {
          inputs: { spans: 6 },
          expected: 25,
        },
      ],
    },
  ],
}
