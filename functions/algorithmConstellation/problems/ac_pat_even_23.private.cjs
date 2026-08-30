/**
 * Private Problem Definition: AC-PAT-EVEN-23 (홀수·짝수 비콘)
 */

module.exports = {
  problemId: 'AC-PAT-EVEN-23',
  problemVersion: 1,
  entryFunction: 'is_even_beacon',
  officialSolutionCode: `def is_even_beacon(signal_number):
    return signal_number % 2 == 0
`,
  alternativeSolutions: [
    `def is_even_beacon(signal_number):
    if signal_number % 2 == 0:
        return True
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'EVEN-ODD-INVERTED',
      misconceptionCode: 'PARITY-INVERTED',
      expectedMisconception: 'PARITY-INVERTED',
      expectedFailingGroup: 'even_small',
      code: `def is_even_beacon(signal_number):
    return signal_number % 2 == 1
`,
    },
    {
      id: 'EVEN-RAW-REMAINDER',
      misconceptionCode: 'NON-BOOLEAN-RETURN',
      expectedMisconception: 'NON-BOOLEAN-RETURN',
      expectedFailingGroup: 'even_small',
      code: `def is_even_beacon(signal_number):
    return signal_number % 2
`,
    },
    {
      id: 'EVEN-ALWAYS-TRUE',
      misconceptionCode: 'CONSTANT-RETURN',
      expectedMisconception: 'CONSTANT-RETURN',
      expectedFailingGroup: 'odd_small',
      code: `def is_even_beacon(signal_number):
    return True
`,
    },
  ],
  hiddenTests: [
    { inputs: { signal_number: 2 }, expected: true, group: 'even_small' },
    { inputs: { signal_number: 100 }, expected: true, group: 'even_medium' },
    { inputs: { signal_number: 10000 }, expected: true, group: 'even_large' },
    { inputs: { signal_number: 1 }, expected: false, group: 'odd_small' },
    { inputs: { signal_number: 99 }, expected: false, group: 'odd_medium' },
    { inputs: { signal_number: 9999 }, expected: false, group: 'odd_large' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_even_23_1',
      title: '★★ 0은 짝수일까 홀수일까?',
      type: 'trace_understanding',
      prompt: '0을 2로 나눈 나머지와 2씩 커질 때 홀짝 패턴의 변화를 확인해 보세요.',
      codeSnippet: `def is_even_beacon(signal_number):
    return signal_number % 2 == 0`,
      questions: [
        {
          id: 'q1',
          text: 'signal_number=0일 때, 0 % 2의 계산 결과와 is_even_beacon(0)의 반환값은 무엇일까요?',
          options: [
            { value: '0_true', label: '나머지는 0이므로 반환값은 True (0은 짝수)' },
            { value: '0_false', label: '0은 짝수가 아니므로 반환값은 False' },
            { value: 'error', label: '0으로 나눌 수 없으므로 에러 발생' },
          ],
          expected: '0_true',
        },
        {
          id: 'q2',
          text: '짝수 n에 2를 더한 (n + 2)는 항상 짝수일까요?',
          options: [
            { value: 'always_even', label: '항상 짝수이다 (2씩 건너뛰면 짝수 상태가 유지된다)' },
            { value: 'becomes_odd', label: '홀수로 바뀐다' },
            { value: 'unknown', label: '수마다 다르다' },
          ],
          expected: 'always_even',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_even_23_t1',
      title: '두 신호의 홀짝 일치 판별',
      description: '두 신호 번호 a와 b가 모두 짝수이거나 모두 홀수로 홀짝 상태(parity)가 일치하면 True, 서로 다르면 False를 반환하세요.',
      contextCard: {
        title: '📋 신호 동기화 예시',
        steps: [
          { label: '신호 A', text: 'a % 2 (0 또는 1)' },
          { label: '신호 B', text: 'b % 2 (0 또는 1)' },
          { label: '동일 상태', text: 'a % 2 == b % 2' },
        ],
      },
      thoughtCheck: {
        prompt: '두 수 a=4(짝수), b=10(짝수)일 때 a % 2와 b % 2는 서로 같을까요?',
        options: [
          { id: 'opt_same', label: '둘 다 나머지가 0으로 일치한다 (True)', isCorrect: true },
          { id: 'opt_diff', label: '수가 다르므로 나머지도 다르다', isCorrect: false },
        ],
        feedback: '맞아요! 두 수가 모두 짝수이면 나머지가 0으로 같고, 모두 홀수이면 나머지가 1로 같습니다.',
      },
      entryFunction: 'have_same_parity',
      starterCode: `def have_same_parity(a, b):
    # 두 수 a와 b의 홀짝(2로 나눈 나머지)이 같으면 True, 다르면 False를 반환하세요.
    pass
`,
      officialSolutionCode: `def have_same_parity(a, b):
    return a % 2 == b % 2
`,
      testCases: [
        { inputs: { a: 3, b: 7 }, expected: true },
        { inputs: { a: 0, b: 100 }, expected: true },
        { inputs: { a: 1, b: 0 }, expected: false },
        { inputs: { a: 11, b: 17 }, expected: true },
        { inputs: { a: 14, b: 21 }, expected: false },
      ],
    },
  ],
}
