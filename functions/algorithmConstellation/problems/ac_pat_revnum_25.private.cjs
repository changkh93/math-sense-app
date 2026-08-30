/**
 * Private Problem Definition: AC-PAT-REVNUM-25 (뒤집힌 우주 번호)
 */

module.exports = {
  problemId: 'AC-PAT-REVNUM-25',
  problemVersion: 1,
  entryFunction: 'reverse_signal_number',
  officialSolutionCode: `def reverse_signal_number(number):
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = reversed_number * 10 + digit
        number = number // 10
    return reversed_number
`,
  alternativeSolutions: [
    `def reverse_signal_number(number):
    rev = 0
    while number > 0:
        rev = rev * 10 + (number % 10)
        number = number // 10
    return rev
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'REV-WRONG-ACCUM-ORDER',
      misconceptionCode: 'WRONG-ACCUM-ORDER',
      expectedMisconception: 'WRONG-ACCUM-ORDER',
      expectedFailingGroup: 'four_digits',
      code: `def reverse_signal_number(number):
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = digit * 10 + reversed_number
        number = number // 10
    return reversed_number
`,
    },
    {
      id: 'REV-MISSING-DIV',
      misconceptionCode: 'MISSING-STEP-UPDATE',
      expectedMisconception: 'MISSING-STEP-UPDATE',
      expectedFailingGroup: 'three_digits',
      code: `def reverse_signal_number(number):
    return number % 10
`,
    },
    {
      id: 'REV-EARLY-TERMINATION',
      misconceptionCode: 'LOOP-TERMINATION-ERROR',
      expectedMisconception: 'LOOP-TERMINATION-ERROR',
      expectedFailingGroup: 'single_digit',
      code: `def reverse_signal_number(number):
    rev = 0
    while number > 9:
        rev = rev * 10 + (number % 10)
        number = number // 10
    return rev
`,
    },
    {
      id: 'REV-ZERO-AS-EMPTY',
      misconceptionCode: 'ZERO-INPUT-BOUNDARY',
      expectedMisconception: 'ZERO-INPUT-BOUNDARY',
      expectedFailingGroup: 'zero_input',
      code: `def reverse_signal_number(number):
    if number == 0:
        return 1
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = reversed_number * 10 + digit
        number = number // 10
    return reversed_number
`,
    },
  ],
  hiddenTests: [
    { inputs: { number: 0 }, expected: 0, group: 'zero_input' },
    { inputs: { number: 7 }, expected: 7, group: 'single_digit' },
    { inputs: { number: 9900 }, expected: 99, group: 'trailing_zeros' },
    { inputs: { number: 1001 }, expected: 1001, group: 'palindrome' },
    { inputs: { number: 9876 }, expected: 6789, group: 'four_digits' },
    { inputs: { number: 5000 }, expected: 5, group: 'trailing_zeros' },
    { inputs: { number: 321 }, expected: 123, group: 'three_digits' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_revnum_25_1',
      title: '★★ reversed_number = reversed_number * 10 + digit의 의미',
      type: 'trace_understanding',
      prompt: '기존에 누적된 수에 10을 곱하고 새 digit을 더하는 이유를 확인하세요.',
      codeSnippet: `def reverse_signal_number(number):
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = reversed_number * 10 + digit
        number = number // 10
    return reversed_number`,
      questions: [
        {
          id: 'q1',
          text: 'reversed_number가 3일 때 다음 자릿수 0이 오면 3 * 10 + 0 = 30이 되는 이유는 무엇일까요?',
          options: [
            { value: 'shift_left', label: '기존에 들어온 3을 십의 자리(왼쪽)로 한 칸 밀어내기 위해 10을 곱하기 때문' },
            { value: 'add_ten', label: '단순히 10을 더하기 위해' },
            { value: 'random', label: '자리수를 없애기 위해' },
          ],
          expected: 'shift_left',
        },
        {
          id: 'q2',
          text: 'number = 1200처럼 끝에 0이 있는 수를 뒤집으면 왜 21이 될까요?',
          options: [
            { value: 'leading_zeros_drop', label: '0*10+0=0, 0*10+0=0 후 2, 1이 누적되어 앞의 0들은 자연스럽게 사라지기 때문' },
            { value: 'error', label: '0을 나눌 수 없기 때문' },
            { value: 'same', label: '1200 그대로 유지되기 때문' },
          ],
          expected: 'leading_zeros_drop',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_revnum_25_t1',
      title: '정수의 총 자릿수 계산하기',
      description: '0 이상의 정수 number가 주어질 때, number // 10을 반복하며 총 몇 자리의 숫자인지 세어 자릿수(count)를 반환하세요. (단, 0은 1자리 수입니다)',
      contextCard: {
        title: '📋 자릿수 카운팅 흐름 예시',
        steps: [
          { label: '초기 수', text: 'number = 1203 (count = 0)' },
          { label: '반복 // 10', text: '120 -> 12 -> 1 -> 0 (4번 반복)' },
          { label: '최종 자릿수', text: 'count = 4' },
        ],
      },
      thoughtCheck: {
        prompt: 'number = 0일 때 자릿수는 몇 자리일까요?',
        options: [
          { id: 'opt_1', label: '0도 숫자 한 개이므로 1자리이다', isCorrect: true },
          { id: 'opt_0', label: '0자리이다', isCorrect: false },
        ],
        feedback: '맞아요! 0은 값이 0이지만 한 자리 숫자이므로 1을 반환해야 합니다.',
      },
      entryFunction: 'count_number_digits',
      starterCode: `def count_number_digits(number):
    # 0 이상의 정수 number의 총 자릿수를 계산하여 반환하세요. (0은 1자리입니다)
    pass
`,
      officialSolutionCode: `def count_number_digits(number):
    if number == 0:
        return 1
    count = 0
    while number > 0:
        count = count + 1
        number = number // 10
    return count
`,
      testCases: [
        { inputs: { number: 7 }, expected: 1 },
        { inputs: { number: 9999 }, expected: 4 },
        { inputs: { number: 100 }, expected: 3 },
        { inputs: { number: 10 }, expected: 2 },
        { inputs: { number: 5000 }, expected: 4 },
      ],
    },
  ],
}
