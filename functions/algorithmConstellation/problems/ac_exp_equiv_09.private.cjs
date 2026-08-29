module.exports = {
  problemId: 'AC-EXP-EQUIV-09',
  problemVersion: 1,
  entryFunction: 'expand_equivalent_route',
  officialSolutionCode: `def expand_equivalent_route(pos, boost):
    return pos * 2 + boost * 2
`,
  alternativeSolutions: [
    `def expand_equivalent_route(pos, boost):
    return (pos + boost) * 2
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'EQUIV-PRECEDENCE-BUG',
      code: `def expand_equivalent_route(pos, boost):
    return pos + boost * 2
`,
      expectedFailingGroup: 'precedence_counterexample',
      expectedMisconception: 'OPERATOR-PRECEDENCE-CONFUSION',
    },
    {
      label: 'EQUIV-MISSING-FACTOR',
      code: `def expand_equivalent_route(pos, boost):
    return pos * 2 + boost
`,
      expectedFailingGroup: 'each_term_factor',
      expectedMisconception: 'PARTIAL-DISTRIBUTION',
    },
    {
      label: 'EQUIV-HARDCODED-SAMPLE',
      code: `def expand_equivalent_route(pos, boost):
    return 14
`,
      expectedFailingGroup: 'varied_inputs',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { pos: 1, boost: 0 }, expected: 2, group: 'precedence_counterexample' },
    { inputs: { pos: 3, boost: 4 }, expected: 14, group: 'precedence_counterexample' },
    { inputs: { pos: 0, boost: 5 }, expected: 10, group: 'each_term_factor' },
    { inputs: { pos: 5, boost: 0 }, expected: 10, group: 'zero_boost' },
    { inputs: { pos: 10, boost: 20 }, expected: 60, group: 'varied_inputs' },
    { inputs: { pos: 7, boost: 8 }, expected: 30, group: 'varied_inputs' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_exp_equiv_09_1',
      prompt: 'A: (pos + boost) * 2 와 C: pos + boost * 2 의 실행 결과를 비교해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'pos=2, boost=3 일 때 A((2+3)*2)와 C(2+3*2)의 계산 결과는 각각 얼마일까요?',
          options: [
            { value: '10과 8', label: '10과 8' },
            { value: '10과 10', label: '10과 10' },
            { value: '8과 8', label: '8과 8' },
          ],
          expected: '10과 8',
        },
        {
          id: 'q2',
          text: 'A와 C의 결과가 달라지는 가장 작은 반례 입력(pos, boost)은 무엇일까요?',
          options: [
            { value: 'pos=1, boost=0 (결과 2와 1로 다름)', label: 'pos=1, boost=0 (결과 2와 1로 다름)' },
            { value: 'pos=0, boost=5 (결과 10으로 같음)', label: 'pos=0, boost=5 (결과 10으로 같음)' },
          ],
          expected: 'pos=1, boost=0 (결과 2와 1로 다름)',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_exp_equiv_09_transfer_1',
      title: '세 신호 묶음의 분배 전개',
      description: '세 신호(a, b, c)를 더한 뒤 두 배로 묶은 (a + b + c) * 2 와 항상 같은 결과를 반환하는 함수를 작성하세요.',
      entryFunction: 'expand_three_signals',
      starterCode: `def expand_three_signals(a, b, c):
    # (a + b + c) * 2 와 항상 같은 결과를 반환하세요.
    pass
`,
      officialSolutionCode: `def expand_three_signals(a, b, c):
    return a * 2 + b * 2 + c * 2
`,
      testCases: [
        { inputs: { a: 1, b: 2, c: 3 }, expected: 12 },
        { inputs: { a: 0, b: 5, c: 10 }, expected: 30 },
        { inputs: { a: 4, b: 0, c: 6 }, expected: 20 },
        { inputs: { a: 10, b: 20, c: 30 }, expected: 120 },
      ],
    },
  ],
}
