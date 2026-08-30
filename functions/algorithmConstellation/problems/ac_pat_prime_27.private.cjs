/**
 * Private Problem Definition: AC-PAT-PRIME-27 (소수 탐사 순찰대)
 */

module.exports = {
  problemId: 'AC-PAT-PRIME-27',
  problemVersion: 1,
  entryFunction: 'is_prime_signal',
  officialSolutionCode: `def is_prime_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
`,
  alternativeSolutions: [
    `def is_prime_signal(number):
    if number < 2:
        return False
    d = 2
    while d < number:
        if number % d == 0:
            return False
        d = d + 1
    return True
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'PRIME-NO-BOUNDARY',
      misconceptionCode: 'MISSING-LOWER-BOUND',
      expectedMisconception: 'MISSING-LOWER-BOUND',
      expectedFailingGroup: 'below_two',
      code: `def is_prime_signal(number):
    for d in range(2, number):
        if number % d == 0:
            return False
    return True
`,
    },
    {
      id: 'PRIME-REJECT-TWO',
      misconceptionCode: 'REJECT-SMALLEST-PRIME',
      expectedMisconception: 'REJECT-SMALLEST-PRIME',
      expectedFailingGroup: 'smallest_prime',
      code: `def is_prime_signal(number):
    if number <= 2:
        return False
    for d in range(2, number):
        if number % d == 0:
            return False
    return True
`,
    },
    {
      id: 'PRIME-EVEN-ONLY',
      misconceptionCode: 'EVEN-ONLY-COMPOSITE',
      expectedMisconception: 'EVEN-ONLY-COMPOSITE',
      expectedFailingGroup: 'square_composite',
      code: `def is_prime_signal(number):
    if number < 2:
        return False
    if number == 2:
        return True
    return number % 2 != 0
`,
    },
    {
      id: 'PRIME-EARLY-TRUE',
      misconceptionCode: 'EARLY-TRUE-RETURN',
      expectedMisconception: 'EARLY-TRUE-RETURN',
      expectedFailingGroup: 'odd_composite',
      code: `def is_prime_signal(number):
    if number < 2:
        return False
    for d in range(2, number):
        if number % d == 0:
            return False
        else:
            return True
    return True
`,
    },
  ],
  hiddenTests: [
    { inputs: { number: 0 }, expected: false, group: 'below_two' },
    { inputs: { number: 1 }, expected: false, group: 'below_two' },
    { inputs: { number: 2 }, expected: true, group: 'smallest_prime' },
    { inputs: { number: 4 }, expected: false, group: 'even_composite' },
    { inputs: { number: 49 }, expected: false, group: 'square_composite' },
    { inputs: { number: 99 }, expected: false, group: 'odd_composite' },
    { inputs: { number: 121 }, expected: false, group: 'square_composite' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_prime_27_1',
      title: '★★ 0, 1, 2와 홀수 합성수 판별',
      type: 'trace_understanding',
      prompt: '0과 1이 소수가 아닌 이유와 2 및 49의 판별 과정을 확인하세요.',
      codeSnippet: `def is_prime_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True`,
      questions: [
        {
          id: 'q1',
          text: 'number=1일 때 1이 소수가 아닌 이유는 무엇일까요?',
          options: [
            { value: 'one_divisor', label: '소수는 서로 다른 2개의 약수(1과 자기자신)를 가져야 하는데 1은 약수가 1개뿐이기 때문' },
            { value: 'even_number', label: '1이 짝수이기 때문' },
            { value: 'zero_remainder', label: '0으로 나누어떨어지기 때문' },
          ],
          expected: 'one_divisor',
        },
        {
          id: 'q2',
          text: 'number=2일 때 range(2, 2)는 후보가 없는데 왜 True를 반환할까요?',
          options: [
            { value: 'no_divisors_found', label: '2 < 2를 통과하고 2 미만의 다른 약수가 존재하지 않아 정상적으로 True를 반환하기 때문' },
            { value: 'two_is_odd', label: '2가 홀수이기 때문' },
            { value: 'loop_error', label: '루프가 에러를 내기 때문' },
          ],
          expected: 'no_divisors_found',
        },
        {
          id: 'q3',
          text: '49는 홀수이지만 소수가 아닌 이유는 무엇일까요?',
          options: [
            { value: 'div_by_7', label: 'divisor=7일 때 49 % 7 == 0으로 나누어떨어지기 때문' },
            { value: 'greater_than_20', label: '20보다 큰 홀수이기 때문' },
            { value: 'div_by_2', label: '2로 나누어떨어지기 때문' },
          ],
          expected: 'div_by_7',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_prime_27_t1',
      title: '합성수(Composite) 판별기',
      description: 'number가 1보다 크고 자신 외의 다른 약수를 갖는 합성수(Composite)이면 True, 아니면(0, 1, 소수) False를 반환하세요.',
      contextCard: {
        title: '📋 합성수 판별 흐름 예시',
        steps: [
          { label: '0, 1', text: '합성수 아님 -> False' },
          { label: '소수 (예: 7)', text: '약수 없음 -> False' },
          { label: '합성수 (예: 9)', text: '3으로 나누어떨어짐 -> True' },
        ],
      },
      thoughtCheck: {
        prompt: 'number=1일 때 합성수 판별 결과는 무엇일까요?',
        options: [
          { id: 'opt_false', label: '1은 소수도 합성수도 아니므로 False', isCorrect: true },
          { id: 'opt_true', label: 'True', isCorrect: false },
        ],
        feedback: '정확합니다! 0과 1은 소수도 합성수도 아니므로 False입니다.',
      },
      entryFunction: 'is_composite_signal',
      starterCode: `def is_composite_signal(number):
    # number가 1보다 큰 합성수이면 True, 아니면 False를 반환하세요.
    pass
`,
      officialSolutionCode: `def is_composite_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
`,
      testCases: [
        { inputs: { number: 0 }, expected: false },
        { inputs: { number: 1 }, expected: false },
        { inputs: { number: 2 }, expected: false },
        { inputs: { number: 4 }, expected: true },
        { inputs: { number: 49 }, expected: true },
        { inputs: { number: 97 }, expected: false },
      ],
    },
  ],
}
