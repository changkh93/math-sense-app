/**
 * Private Problem Definition: AC-PAT-PRIME-REV-30 (잘못 만든 소수 판별기)
 */

module.exports = {
  problemId: 'AC-PAT-PRIME-REV-30',
  problemVersion: 1,
  entryFunction: 'is_prime_number',
  officialSolutionCode: `def is_prime_number(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
`,
  alternativeSolutions: [
    `def is_prime_number(number):
    if number <= 1:
        return False
    for d in range(2, number):
        if number % d == 0:
            return False
    return True
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'PRIME-REV-BUGGY-STARTER',
      misconceptionCode: 'PRIME-MISSING-LOW-BOUNDARY',
      expectedMisconception: 'PRIME-MISSING-LOW-BOUNDARY',
      expectedFailingGroup: 'low_boundary',
      code: `def is_prime_number(number):
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
`,
    },
    {
      id: 'PRIME-REV-REJECT-TWO',
      misconceptionCode: 'PRIME-TWO-BOUNDARY',
      expectedMisconception: 'PRIME-TWO-BOUNDARY',
      expectedFailingGroup: 'small_prime',
      code: `def is_prime_number(number):
    if number <= 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
`,
    },
    {
      id: 'PRIME-REV-EARLY-RETURN',
      misconceptionCode: 'PRIME-EARLY-RETURN',
      expectedMisconception: 'PRIME-EARLY-RETURN',
      expectedFailingGroup: 'square_composite',
      code: `def is_prime_number(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        return number % divisor != 0
    return True
`,
    },
    {
      id: 'PRIME-REV-BOOLEAN-INVERSION',
      misconceptionCode: 'PRIME-BOOLEAN-INVERSION',
      expectedMisconception: 'PRIME-BOOLEAN-INVERSION',
      expectedFailingGroup: 'small_composite',
      code: `def is_prime_number(number):
    if number < 2:
        return True
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
`,
    },
  ],
  hiddenTests: [
    { inputs: { number: 0 }, expected: false, group: 'low_boundary' },
    { inputs: { number: 2 }, expected: true, group: 'small_prime' },
    { inputs: { number: 3 }, expected: true, group: 'small_prime' },
    { inputs: { number: 4 }, expected: false, group: 'small_composite' },
    { inputs: { number: 49 }, expected: false, group: 'square_composite' },
    { inputs: { number: 97 }, expected: true, group: 'large_prime' },
    { inputs: { number: 200 }, expected: false, group: 'large_composite' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_prime_review_30_1',
      title: '★★ 빈 루프의 위험성과 경계 수리',
      type: 'trace_understanding',
      prompt: '1에서 빈 루프가 실행된 후 이동하는 코드 줄과 최소 수리 위치를 확인하세요.',
      codeSnippet: `def is_prime_number(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True`,
      questions: [
        {
          id: 'q1',
          text: 'number=1일 때 수리 전 코드에서 range(2, 1)이 한 번도 실행되지 않으면 어떤 줄로 이동할까요?',
          options: [
            { value: 'final_return_true', label: '루프 바깥의 마지막 return True 줄로 이동하여 잘못된 True를 반환' },
            { value: 'return_false', label: 'return False로 이동' },
            { value: 'error', label: '에러가 발생' },
          ],
          expected: 'final_return_true',
        },
        {
          id: 'q2',
          text: 'number=2도 루프가 실행되지 않는데 왜 수리 전 코드에서 우연히 정답(True)이 나왔을까요?',
          options: [
            { value: 'two_is_prime', label: '2는 실제로 소수이므로 마지막 return True가 우연히 수학적 정의와 일치했기 때문' },
            { value: 'loop_ran_once', label: '루프가 1번 실행되었기 때문' },
            { value: 'two_is_even', label: '2가 짝수이기 때문' },
          ],
          expected: 'two_is_prime',
        },
        {
          id: 'q3',
          text: '이 버그를 고치기 위한 가장 단순하고 안전한 최소 수리 방법은 무엇일까요?',
          options: [
            { value: 'guard_before_loop', label: '루프를 시작하기 전에 if number < 2: return False 로 경계를 먼저 처리한다' },
            { value: 'mod_by_one', label: '루프 안에서 1로 나누어본다' },
            { value: 'return_all_false', label: '항상 False를 반환한다' },
          ],
          expected: 'guard_before_loop',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_prime_review_30_t1',
      title: '합성수 판별기 경계 버그 수리',
      description: '합성수는 1보다 크고 자신 외의 약수를 가진 수입니다 (0과 1은 소수도 합성수도 아닙니다). 0과 1을 합성수(True)로 잘못 판단하는 아래 스타터 코드의 경계 버그를 수리하세요.',
      contextCard: {
        title: '📋 합성수 경계 수리 흐름 예시',
        steps: [
          { label: '관찰', text: '현재 코드는 0과 1을 합성수라고 판정합니다.' },
          { label: '정의 확인', text: '0과 1은 소수도 합성수도 아닙니다.' },
          { label: '수리 질문', text: '반복 전에 실행되는 경계 분기의 반환 의미를 다시 검토하세요.' },
        ],
      },
      thoughtCheck: {
        prompt: '“소수가 아니다”와 “합성수다”가 서로 다른 뜻이 되는 입력값은 무엇일까요?',
        options: [
          { id: 'opt_0_1', label: '0과 1 (소수도 아니고 합성수도 아님)', isCorrect: true },
          { id: 'opt_4_9', label: '4와 9', isCorrect: false },
        ],
        feedback: '정확합니다! 0과 1은 소수도 합성수도 아니므로 합성수 판별기에서도 False를 반환해야 합니다.',
      },
      entryFunction: 'is_composite_number',
      starterCode: `def is_composite_number(number):
    if number < 2:
        return True  # 이 경계 판단을 검토하세요.
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
`,
      officialSolutionCode: `def is_composite_number(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
`,
      testCases: [
        { inputs: { number: 0 }, expected: false },
        { inputs: { number: 2 }, expected: false },
        { inputs: { number: 4 }, expected: true },
        { inputs: { number: 17 }, expected: false },
        { inputs: { number: 49 }, expected: true },
      ],
    },
  ],
}
