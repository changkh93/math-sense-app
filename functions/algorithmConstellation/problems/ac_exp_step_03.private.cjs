module.exports = {
  problemId: 'AC-EXP-STEP-03',
  problemVersion: 1,
  entryFunction: 'assemble_patrol_energy',
  officialSolutionCode: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    energy = energy * boost
    energy = energy - shield
    return energy
`,
  alternativeSolutions: [
    `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    return (initial_energy + charge) * boost - shield
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'STEP-OMIT-MIDDLE',
      code: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    energy = energy - shield
    return energy
`,
      expectedFailingGroup: 'boost_sensitive',
      expectedMisconception: 'STEP-OMISSION',
    },
    {
      label: 'STEP-REVERSE-ORDER',
      code: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy * boost
    energy = energy + charge
    energy = energy - shield
    return energy
`,
      expectedFailingGroup: 'boost_sensitive',
      expectedMisconception: 'PROCEDURAL-ORDER-REVERSAL',
    },
    {
      label: 'STEP-HARDCODED-SAMPLE',
      code: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    return 15
`,
      expectedFailingGroup: 'varied_parameters',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { initial_energy: 2, charge: 3, boost: 4, shield: 5 }, expected: 15, group: 'boost_sensitive' },
    { inputs: { initial_energy: 4, charge: 2, boost: 3, shield: 2 }, expected: 16, group: 'boost_sensitive' },
    { inputs: { initial_energy: 0, charge: 10, boost: 2, shield: 5 }, expected: 15, group: 'zero_initial' },
    { inputs: { initial_energy: 5, charge: 5, boost: 3, shield: 0 }, expected: 30, group: 'no_shield_cost' },
    { inputs: { initial_energy: 10, charge: 5, boost: 2, shield: 6 }, expected: 24, group: 'varied_parameters' },
    { inputs: { initial_energy: 1, charge: 1, boost: 5, shield: 3 }, expected: 7, group: 'varied_parameters' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_exp_step_03_1',
      prompt: 'initial=2, charge=3, boost=4, shield=5일 때 단계별 실행 결과를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: '빠진 증폭 명령(energy = energy * boost)까지 정상 실행한 직후의 energy 값은?',
          options: [
            { value: '20', label: '20' },
            { value: '5', label: '5' },
            { value: '15', label: '15' },
          ],
          expected: '20',
        },
        {
          id: 'q2',
          text: '증폭 명령을 빠뜨리고(충전 후 바로 방어막) 실행했을 때 최종 energy 값은?',
          options: [
            { value: '0', label: '0' },
            { value: '15', label: '15' },
            { value: '20', label: '20' },
          ],
          expected: '0',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_exp_step_03_transfer_1',
      title: '신호 센서 보정 시퀀스',
      description: '센서의 초기 신호(raw_signal)에서 잡음을 뺀 뒤(noise), 증폭기(gain)를 곱하고, 보정값(offset)을 더하는 3단계 보정 절차를 완성하세요.',
      entryFunction: 'calibrate_scan_signal',
      starterCode: `def calibrate_scan_signal(raw_signal, noise, gain, offset):
    # 1단계(잡음 제거) -> 2단계(증폭) -> 3단계(보정값 추가)를 순서대로 완성하세요.
    pass
`,
      officialSolutionCode: `def calibrate_scan_signal(raw_signal, noise, gain, offset):
    signal = raw_signal
    signal = signal - noise
    signal = signal * gain
    signal = signal + offset
    return signal
`,
      testCases: [
        { inputs: { raw_signal: 10, noise: 2, gain: 3, offset: 4 }, expected: 28 },
        { inputs: { raw_signal: 20, noise: 5, gain: 2, offset: 0 }, expected: 30 },
        { inputs: { raw_signal: 5, noise: 0, gain: 4, offset: 10 }, expected: 30 },
      ],
    },
  ],
}
