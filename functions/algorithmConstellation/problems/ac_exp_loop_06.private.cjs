/**
 * Private Problem Definition: AC-EXP-LOOP-06 (네 번 반복한 신호)
 */

module.exports = {
  problemId: 'AC-EXP-LOOP-06',
  problemVersion: 1,
  entryFunction: 'repeat_pulse',
  officialSolutionCode: `def repeat_pulse(times, step_energy):
    energy = 0
    for i in range(times):
        energy = energy + step_energy
    return energy
`,
  alternativeSolutions: [
    `def repeat_pulse(times, step_energy):
    return times * step_energy
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'LOOP-ONE-TOO-FEW',
      misconceptionCode: 'OFF-BY-ONE-FEWER',
      expectedMisconception: 'OFF-BY-ONE-FEWER',
      expectedFailingGroup: 'many_iterations',
      code: `def repeat_pulse(times, step_energy):
    energy = 0
    for i in range(times - 1):
        energy = energy + step_energy
    return energy
`,
    },
    {
      id: 'LOOP-RESET-INSIDE',
      misconceptionCode: 'LOOP-SCOPE-RESET',
      expectedMisconception: 'LOOP-SCOPE-RESET',
      expectedFailingGroup: 'many_iterations',
      code: `def repeat_pulse(times, step_energy):
    for i in range(times):
        energy = 0
        energy = energy + step_energy
    return energy if times > 0 else 0
`,
    },
    {
      id: 'LOOP-NO-ACCUMULATION',
      misconceptionCode: 'NO-ACCUMULATION',
      expectedMisconception: 'NO-ACCUMULATION',
      expectedFailingGroup: 'many_iterations',
      code: `def repeat_pulse(times, step_energy):
    energy = 0
    for i in range(times):
        energy = step_energy
    return energy
`,
    },
  ],
  hiddenTests: [
    { inputs: { times: 0, step_energy: 10 }, expected: 0, group: 'zero_iterations' },
    { inputs: { times: 1, step_energy: 7 }, expected: 7, group: 'one_iteration' },
    { inputs: { times: 6, step_energy: 8 }, expected: 48, group: 'many_iterations' },
    { inputs: { times: 5, step_energy: -3 }, expected: -15, group: 'negative_energy' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_loop_06_1',
      type: 'single-choice',
      prompt: '반복문 실행 과정의 중간 상태를 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'times=4, step_energy=2일 때, for 루프가 2회차까지 실행된 직후 energy의 값은 얼마일까요?',
          options: [
            { value: '4', label: '4' },
            { value: '2', label: '2' },
            { value: '8', label: '8' },
            { value: '0', label: '0' },
          ],
          expected: '4',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_loop_06_t1',
      title: '배터리 팩 순차 충전',
      description: '배터리 팩에 기본 0에서 시작하여 cycle_count 횟수만큼 charge_rate 씩 충전한 최종 충전량을 반환하세요.',
      entryFunction: 'charge_battery_pack',
      starterCode: `def charge_battery_pack(cycle_count, charge_rate):
    # cycle_count회 동안 charge_rate만큼 누적해 보세요.
    pass
`,
      officialSolutionCode: `def charge_battery_pack(cycle_count, charge_rate):
    total = 0
    for i in range(cycle_count):
        total = total + charge_rate
    return total
`,
      testCases: [
        { inputs: { cycle_count: 5, charge_rate: 10 }, expected: 50 },
        { inputs: { cycle_count: 0, charge_rate: 30 }, expected: 0 },
      ],
    },
  ],
}
