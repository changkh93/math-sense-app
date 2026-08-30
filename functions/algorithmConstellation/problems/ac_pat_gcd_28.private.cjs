/**
 * Private Problem Definition: AC-PAT-GCD-28 (두 톱니바퀴의 공통 박자)
 */

module.exports = {
  problemId: 'AC-PAT-GCD-28',
  problemVersion: 1,
  entryFunction: 'greatest_common_rhythm',
  officialSolutionCode: `def greatest_common_rhythm(a, b):
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a
`,
  alternativeSolutions: [
    `def greatest_common_rhythm(a, b):
    x = a
    y = b
    while x != y:
        if x > y:
            x = x - y
        else:
            y = y - x
    return x
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'GCD-SINGLE-SUBTRACT',
      misconceptionCode: 'SINGLE-STEP-SUBTRACTION',
      expectedMisconception: 'SINGLE-STEP-SUBTRACTION',
      expectedFailingGroup: 'shared_factor',
      code: `def greatest_common_rhythm(a, b):
    if a > b:
        return a - b
    elif b > a:
        return b - a
    return a
`,
    },
    {
      id: 'GCD-WRONG-LOOP-COND',
      misconceptionCode: 'INVERTED-LOOP-CONDITION',
      expectedMisconception: 'INVERTED-LOOP-CONDITION',
      expectedFailingGroup: 'shared_factor',
      code: `def greatest_common_rhythm(a, b):
    while a == b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a
`,
    },
    {
      id: 'GCD-RETURN-MIN',
      misconceptionCode: 'MIN-INSTEAD-OF-GCD',
      expectedMisconception: 'MIN-INSTEAD-OF-GCD',
      expectedFailingGroup: 'coprime',
      code: `def greatest_common_rhythm(a, b):
    if a < b:
        return a
    return b
`,
    },
    {
      id: 'GCD-ONE-WAY-SUBTRACT',
      misconceptionCode: 'ASYMMETRIC-SUBTRACTION',
      expectedMisconception: 'ASYMMETRIC-SUBTRACTION',
      expectedFailingGroup: 'reversed_inputs',
      code: `def greatest_common_rhythm(a, b):
    while a > b:
        a = a - b
    return a
`,
    },
  ],
  hiddenTests: [
    { inputs: { a: 1, b: 1 }, expected: 1, group: 'same_value' },
    { inputs: { a: 100, b: 1 }, expected: 1, group: 'long_reduction' },
    { inputs: { a: 48, b: 18 }, expected: 6, group: 'shared_factor' },
    { inputs: { a: 81, b: 27 }, expected: 27, group: 'exact_multiple' },
    { inputs: { a: 17, b: 13 }, expected: 1, group: 'coprime' },
    { inputs: { a: 84, b: 30 }, expected: 6, group: 'shared_factor' },
    { inputs: { a: 18, b: 48 }, expected: 6, group: 'reversed_inputs' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_gcd_28_1',
      title: '★★ 감산 불변식과 종료 조건',
      type: 'trace_understanding',
      prompt: '48과 18의 감산 과정에서 공약수가 보존되는 이유와 같은 수일 때의 동작을 확인하세요.',
      codeSnippet: `def greatest_common_rhythm(a, b):
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a`,
      questions: [
        {
          id: 'q1',
          text: '48과 18에서 48 - 18 = 30을 해도 30과 18의 최대공약수가 여전히 6으로 유지되는 이유는 무엇일까요?',
          options: [
            { value: 'factor_preserved', label: '두 수의 공약수 d는 큰 수에서 작은 수를 뺀 차(a - b)도 반드시 나누어떨어지게 하기 때문' },
            { value: 'random_coincidence', label: '우연히 30과 18이 짝수이기 때문' },
            { value: 'always_six', label: '모든 수의 최대공약수가 6이기 때문' },
          ],
          expected: 'factor_preserved',
        },
        {
          id: 'q2',
          text: 'a=9, b=9처럼 처음부터 두 수가 같을 때 while a != b 루프는 어떻게 동작할까요?',
          options: [
            { value: 'skip_loop', label: '루프 조건을 만족하지 않아 한 번도 반복하지 않고 즉시 9를 반환' },
            { value: 'infinite_loop', label: '무한 루프에 빠짐' },
            { value: 'subtract_once', label: '한 번 빼서 0을 반환' },
          ],
          expected: 'skip_loop',
        },
        {
          id: 'q3',
          text: 'while 루프의 종료 조건이 a != b인 이유는 무엇일까요?',
          options: [
            { value: 'stop_when_equal', label: '두 수가 같아지는 순간 그 값이 바로 두 수의 최대공약수이므로' },
            { value: 'avoid_zero', label: '0이 되는 것을 막기 위해' },
            { value: 'syntax_only', label: '문법상 필요해서' },
          ],
          expected: 'stop_when_equal',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_gcd_28_t1',
      title: '비율 약분하기 (기약 비율)',
      description: '두 양의 정수 a와 b의 비율 a:b를 최대공약수로 나누어 가장 간단한 기약 비율 리스트 [a // gcd, b // gcd]로 반환하세요. (주의: gcd를 구하는 동안 a, b가 감소하므로 원래 a, b 값을 미리 보존해야 합니다)',
      contextCard: {
        title: '📋 비율 약분 흐름 예시',
        steps: [
          { label: '원래 값 보존', text: 'orig_a = 12, orig_b = 8' },
          { label: 'GCD 계산', text: '12와 8의 GCD = 4' },
          { label: '약분 결과', text: '[12 // 4, 8 // 4] = [3, 2]' },
        ],
      },
      thoughtCheck: {
        prompt: 'a=12, b=8일 때 GCD 계산 후 a가 4로 변했다면 원래의 12를 어디서 가져와야 할까요?',
        options: [
          { id: 'opt_saved', label: '루프 전에 original_a = a 로 저장해 둔 변수에서 가져온다', isCorrect: true },
          { id: 'opt_magic', label: 'a에 4를 다시 곱한다', isCorrect: false },
        ],
        feedback: '정확합니다! 상태를 덮어쓰기 전에 미리 보존하는(preserve-before-overwrite) 전략이 필요합니다.',
      },
      entryFunction: 'reduce_ratio',
      starterCode: `def reduce_ratio(a, b):
    # 두 수 a와 b의 비율을 최대공약수로 약분하여 [약분된 a, 약분된 b] 리스트로 반환하세요.
    pass
`,
      officialSolutionCode: `def reduce_ratio(a, b):
    original_a = a
    original_b = b
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    gcd = a
    return [original_a // gcd, original_b // gcd]
`,
      testCases: [
        { inputs: { a: 8, b: 12 }, expected: [2, 3] },
        { inputs: { a: 21, b: 14 }, expected: [3, 2] },
        { inputs: { a: 7, b: 5 }, expected: [7, 5] },
        { inputs: { a: 100, b: 25 }, expected: [4, 1] },
        { inputs: { a: 9, b: 9 }, expected: [1, 1] },
      ],
    },
  ],
}
