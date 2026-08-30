/**
 * Private Problem Definition: AC-PAT-DIVISOR-26 (운석의 약수 센서)
 */

module.exports = {
  problemId: 'AC-PAT-DIVISOR-26',
  problemVersion: 1,
  entryFunction: 'count_divisors',
  officialSolutionCode: `def count_divisors(number):
    count = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            count = count + 1
    return count
`,
  alternativeSolutions: [
    `def count_divisors(number):
    ans = 0
    c = 1
    while c <= number:
        if number % c == 0:
            ans = ans + 1
        c = c + 1
    return ans
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'DIV-EXCLUDE-SELF',
      misconceptionCode: 'EXCLUDE-SELF-DIVISOR',
      expectedMisconception: 'EXCLUDE-SELF-DIVISOR',
      expectedFailingGroup: 'small_prime',
      code: `def count_divisors(number):
    count = 0
    for c in range(1, number):
        if number % c == 0:
            count = count + 1
    return count
`,
    },
    {
      id: 'DIV-EXCLUDE-ONE',
      misconceptionCode: 'EXCLUDE-ONE',
      expectedMisconception: 'EXCLUDE-ONE',
      expectedFailingGroup: 'identity_one',
      code: `def count_divisors(number):
    count = 0
    for c in range(2, number + 1):
        if number % c == 0:
            count = count + 1
    return count
`,
    },
    {
      id: 'DIV-COUNT-ALL-CANDIDATES',
      misconceptionCode: 'UNCONDITIONAL-COUNT',
      expectedMisconception: 'UNCONDITIONAL-COUNT',
      expectedFailingGroup: 'composite',
      code: `def count_divisors(number):
    count = 0
    for c in range(1, number + 1):
        count = count + 1
    return count
`,
    },
    {
      id: 'DIV-RETURN-SUM',
      misconceptionCode: 'SUM-INSTEAD-OF-COUNT',
      expectedMisconception: 'SUM-INSTEAD-OF-COUNT',
      expectedFailingGroup: 'small_square',
      code: `def count_divisors(number):
    total = 0
    for c in range(1, number + 1):
        if number % c == 0:
            total = total + c
    return total
`,
    },
  ],
  hiddenTests: [
    { inputs: { number: 1 }, expected: 1, group: 'identity_one' },
    { inputs: { number: 2 }, expected: 2, group: 'small_prime' },
    { inputs: { number: 4 }, expected: 3, group: 'small_square' },
    { inputs: { number: 8 }, expected: 4, group: 'composite' },
    { inputs: { number: 10 }, expected: 4, group: 'composite' },
    { inputs: { number: 25 }, expected: 3, group: 'square_number' },
    { inputs: { number: 36 }, expected: 9, group: 'many_divisors' },
    { inputs: { number: 100 }, expected: 9, group: 'upper_bound' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_divisor_26_1',
      title: '★★ 1의 약수 개수와 range 범위',
      type: 'trace_understanding',
      prompt: '1의 약수와 제곱수 9의 약수 후보 탐색 과정을 확인하세요.',
      codeSnippet: `def count_divisors(number):
    count = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            count = count + 1
    return count`,
      questions: [
        {
          id: 'q1',
          text: 'number=1일 때 range(1, 2)는 후보 1을 검사하여 약수 개수 몇 개를 반환할까요?',
          options: [
            { value: '1', label: '1개 (1의 약수는 1 하나뿐)' },
            { value: '2', label: '2개' },
            { value: '0', label: '0개' },
          ],
          expected: '1',
        },
        {
          id: 'q2',
          text: 'for candidate in range(1, number + 1)에서 왜 range의 끝값에 + 1을 붙일까요?',
          options: [
            { value: 'include_self', label: 'range는 끝값을 포함하지 않으므로, 자기 자신(number)까지 검사하기 위해' },
            { value: 'extra_one', label: '약수를 1개 더 세기 위해' },
            { value: 'syntax', label: '파이썬 문법상 필수이기 때문' },
          ],
          expected: 'include_self',
        },
        {
          id: 'q3',
          text: 'number=9의 약수는 1, 3, 9입니다. 가운데 약수 3을 두 번 세지 않는 이유는 무엇일까요?',
          options: [
            { value: 'one_candidate_once', label: 'candidate=3은 반복에서 한 번만 등장하므로 약수 3도 한 번만 세기 때문' },
            { value: 'skip_square_root', label: '제곱수에서는 가운데 약수를 검사하지 않기 때문' },
            { value: 'count_twice', label: '실제로는 3을 두 번 세어 약수가 4개이기 때문' },
          ],
          expected: 'one_candidate_once',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_divisor_26_t1',
      title: '약수의 총합 구하기',
      description: '1부터 number까지의 약수를 모두 찾아, 약수의 개수가 아니라 모든 약수를 더한 총합(sum)을 반환하세요.',
      contextCard: {
        title: '📋 약수의 합 계산 흐름 예시',
        steps: [
          { label: '대상 수', text: 'number = 6' },
          { label: '약수 목록', text: '1, 2, 3, 6' },
          { label: '약수의 총합', text: '1 + 2 + 3 + 6 = 12' },
        ],
      },
      thoughtCheck: {
        prompt: 'number=6일 때 약수들의 합은 얼마일까요?',
        options: [
          { id: 'opt_12', label: '1 + 2 + 3 + 6 = 12', isCorrect: true },
          { id: 'opt_4', label: '개수인 4', isCorrect: false },
        ],
        feedback: '맞아요! 나누어떨어질 때마다 candidate 값을 total에 누적하면 12가 됩니다.',
      },
      entryFunction: 'sum_divisors',
      starterCode: `def sum_divisors(number):
    # 1부터 number까지의 약수를 모두 더한 총합을 반환하세요.
    pass
`,
      officialSolutionCode: `def sum_divisors(number):
    total = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            total = total + candidate
    return total
`,
      testCases: [
        { inputs: { number: 1 }, expected: 1 },
        { inputs: { number: 8 }, expected: 15 },
        { inputs: { number: 10 }, expected: 18 },
        { inputs: { number: 12 }, expected: 28 },
        { inputs: { number: 25 }, expected: 31 },
      ],
    },
  ],
}
