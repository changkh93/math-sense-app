/**
 * Private Problem Definition: AC-PAT-DIGIT-24 (숫자 유성의 자릿수 신호)
 */

module.exports = {
  problemId: 'AC-PAT-DIGIT-24',
  problemVersion: 1,
  entryFunction: 'decode_three_digit_signal',
  officialSolutionCode: `def decode_three_digit_signal(number):
    hundreds = number // 100
    tens = (number // 10) % 10
    ones = number % 10
    return [hundreds, tens, ones]
`,
  alternativeSolutions: [
    `def decode_three_digit_signal(number):
    return [number // 100, (number // 10) % 10, number % 10]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'DIGIT-REVERSED-ORDER',
      misconceptionCode: 'REVERSED-DIGIT-ORDER',
      expectedMisconception: 'REVERSED-DIGIT-ORDER',
      expectedFailingGroup: 'distinct_digits',
      code: `def decode_three_digit_signal(number):
    return [number % 10, (number // 10) % 10, number // 100]
`,
    },
    {
      id: 'DIGIT-TENS-WITHOUT-MOD',
      misconceptionCode: 'TENS-UNMASKED',
      expectedMisconception: 'TENS-UNMASKED',
      expectedFailingGroup: 'distinct_digits',
      code: `def decode_three_digit_signal(number):
    return [number // 100, number // 10, number % 10]
`,
    },
    {
      id: 'DIGIT-TENS-MOD-100',
      misconceptionCode: 'TENS-WRONG-MOD',
      expectedMisconception: 'TENS-WRONG-MOD',
      expectedFailingGroup: 'distinct_digits',
      code: `def decode_three_digit_signal(number):
    return [number // 100, number % 100, number % 10]
`,
    },
  ],
  hiddenTests: [
    { inputs: { number: 105 }, expected: [1, 0, 5], group: 'zero_middle' },
    { inputs: { number: 420 }, expected: [4, 2, 0], group: 'zero_end' },
    { inputs: { number: 999 }, expected: [9, 9, 9], group: 'all_nines' },
    { inputs: { number: 307 }, expected: [3, 0, 7], group: 'zero_middle' },
    { inputs: { number: 880 }, expected: [8, 8, 0], group: 'zero_end' },
    { inputs: { number: 256 }, expected: [2, 5, 6], group: 'distinct_digits' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_digit_24_1',
      title: '★★ 십의 자리는 왜 (number // 10) % 10일까?',
      type: 'trace_understanding',
      prompt: '472에서 10으로 나눈 몫과 나머지가 어떻게 십의 자리를 걸러내는지 확인하세요.',
      codeSnippet: `def decode_three_digit_signal(number):
    hundreds = number // 100
    tens = (number // 10) % 10
    ones = number % 10
    return [hundreds, tens, ones]`,
      questions: [
        {
          id: 'q1',
          text: 'number=472일 때, number // 10의 결과(47)에서 % 10을 계산하면 십의 자리인 7이 나오는 이유는 무엇일까요?',
          options: [
            { value: 'drop_ones_then_mod', label: '// 10으로 일의 자리(2)를 버린 뒤, 47의 끝자리(7)를 % 10으로 추출하기 때문' },
            { value: 'random_math', label: '100을 10으로 나누었기 때문' },
            { value: 'hundreds_mod', label: '백의 자리 4를 더했기 때문' },
          ],
          expected: 'drop_ones_then_mod',
        },
        {
          id: 'q2',
          text: 'number=307처럼 십의 자리가 0인 경우, (307 // 10) % 10의 계산 결과는 무엇일까요?',
          options: [
            { value: '0', label: '30 % 10의 결과인 0 (0 자릿수 정상 추출)' },
            { value: '3', label: '3' },
            { value: '7', label: '7' },
          ],
          expected: '0',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_digit_24_t1',
      title: '세 자리 수의 자릿수 합산',
      description: '세 자리 수 number의 백의 자리, 십의 자리, 일의 자릿수를 모두 더한 총합을 반환하세요.',
      contextCard: {
        title: '📋 자릿수 합산 흐름 예시',
        steps: [
          { label: '세 자리 수', text: 'number = 472' },
          { label: '자릿수 분해', text: '4, 7, 2' },
          { label: '자릿수 합', text: '4 + 7 + 2 = 13' },
        ],
      },
      thoughtCheck: {
        prompt: 'number=105일 때 자릿수의 합은 얼마일까요?',
        options: [
          { id: 'opt_6', label: '1 + 0 + 5 = 6', isCorrect: true },
          { id: 'opt_15', label: '1 + 5 = 15', isCorrect: false },
        ],
        feedback: '정확합니다! 중간 0도 포함하여 1 + 0 + 5 = 6이 됩니다.',
      },
      entryFunction: 'sum_three_digit_signal',
      starterCode: `def sum_three_digit_signal(number):
    # 세 자리 수 number의 각 자릿수(백, 십, 일)를 분해하여 모두 더한 값을 반환하세요.
    pass
`,
      officialSolutionCode: `def sum_three_digit_signal(number):
    return number // 100 + (number // 10) % 10 + number % 10
`,
      testCases: [
        { inputs: { number: 999 }, expected: 27 },
        { inputs: { number: 100 }, expected: 1 },
        { inputs: { number: 420 }, expected: 6 },
        { inputs: { number: 307 }, expected: 10 },
        { inputs: { number: 880 }, expected: 16 },
      ],
    },
  ],
}
