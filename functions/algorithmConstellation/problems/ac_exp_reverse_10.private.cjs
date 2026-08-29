module.exports = {
  problemId: 'AC-EXP-REVERSE-10',
  problemVersion: 1,
  entryFunction: 'apply_robot_rule',
  officialSolutionCode: `def apply_robot_rule(signal):
    return signal * 2 + 3
`,
  alternativeSolutions: [
    `def apply_robot_rule(signal):
    res = signal * 2
    return res + 3
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'REVERSE-ADD-ONLY',
      code: `def apply_robot_rule(signal):
    return signal + 3
`,
      expectedFailingGroup: 'slope_sensitive',
      expectedMisconception: 'CONSTANT-OFFSET-ONLY',
    },
    {
      label: 'REVERSE-MULT-ONLY',
      code: `def apply_robot_rule(signal):
    return signal * 2
`,
      expectedFailingGroup: 'zero_input',
      expectedMisconception: 'MULTIPLICATION-ONLY',
    },
    {
      label: 'REVERSE-HARDCODED-SAMPLE',
      code: `def apply_robot_rule(signal):
    return 5
`,
      expectedFailingGroup: 'varied_signals',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { signal: 0 }, expected: 3, group: 'zero_input' },
    { inputs: { signal: 1 }, expected: 5, group: 'slope_sensitive' },
    { inputs: { signal: 2 }, expected: 7, group: 'slope_sensitive' },
    { inputs: { signal: 4 }, expected: 11, group: 'varied_signals' },
    { inputs: { signal: 7 }, expected: 17, group: 'varied_signals' },
    { inputs: { signal: 10 }, expected: 23, group: 'large_signals' },
    { inputs: { signal: 50 }, expected: 103, group: 'large_signals' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_exp_reverse_10_1',
      prompt: '로봇의 입출력 데이터(0->3, 1->5, 2->7, 3->9)의 규칙을 분석해 보세요.',
      questions: [
        {
          id: 'q1',
          text: '입력 signal이 1 증가할 때마다 출력값은 얼마나 늘어나나요?',
          options: [
            { value: '2', label: '2' },
            { value: '1', label: '1' },
            { value: '3', label: '3' },
          ],
          expected: '2',
        },
        {
          id: 'q2',
          text: '입력이 0일 때 출력이 3인 것은 규칙의 어느 부분을 보여주는 것일까요?',
          options: [
            { value: '시작 보정값 +3', label: '시작 보정값 +3' },
            { value: '배율 ×2', label: '배율 ×2' },
          ],
          expected: '시작 보정값 +3',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_exp_reverse_10_transfer_1',
      title: '탐사 드론의 레벨별 에너지 출력',
      description: '드론의 레벨별 출력 기록(0->1, 1->4, 2->7, 3->10)을 분석하여, 레벨(level)에 따른 에너지 출력을 계산하는 함수를 작성하세요.',
      entryFunction: 'apply_drone_energy',
      starterCode: `def apply_drone_energy(level):
    # 관측 기록(0->1, 1->4, 2->7, 3->10)에서 찾은 규칙을 작성하세요.
    pass
`,
      officialSolutionCode: `def apply_drone_energy(level):
    return level * 3 + 1
`,
      testCases: [
        { inputs: { level: 0 }, expected: 1 },
        { inputs: { level: 1 }, expected: 4 },
        { inputs: { level: 4 }, expected: 13 },
        { inputs: { level: 10 }, expected: 31 },
      ],
    },
  ],
}
