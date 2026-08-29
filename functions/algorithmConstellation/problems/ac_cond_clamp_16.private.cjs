module.exports = {
  problemId: 'AC-COND-CLAMP-16',
  problemVersion: 1,
  entryFunction: 'clamp_engine_power',
  officialSolutionCode: `def clamp_engine_power(requested_power, max_power):
    if requested_power > max_power:
        return max_power
    return requested_power
`,
  alternativeSolutions: [
    `def clamp_engine_power(requested_power, max_power):
    if requested_power > max_power:
        return max_power
    else:
        return requested_power
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'CLAMP-NO-LIMIT',
      code: `def clamp_engine_power(requested_power, max_power):
    return requested_power
`,
      expectedFailingGroup: 'exceeded_power',
      expectedMisconception: 'MISSING-UPPER-CLAMP',
    },
    {
      label: 'CLAMP-ALWAYS-MAX',
      code: `def clamp_engine_power(requested_power, max_power):
    return max_power
`,
      expectedFailingGroup: 'normal_power',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
    {
      label: 'CLAMP-INVERTED-LOGIC',
      code: `def clamp_engine_power(requested_power, max_power):
    if requested_power < max_power:
        return max_power
    return requested_power
`,
      expectedFailingGroup: 'normal_power',
      expectedMisconception: 'INVERTED-COMPARISON',
    },
  ],
  hiddenTests: [
    { inputs: { requested_power: 0, max_power: 50 }, expected: 0, group: 'normal_power' },
    { inputs: { requested_power: 73, max_power: 100 }, expected: 73, group: 'normal_power' },
    { inputs: { requested_power: 0, max_power: 0 }, expected: 0, group: 'exact_limit' },
    { inputs: { requested_power: 50, max_power: 50 }, expected: 50, group: 'exact_limit' },
    { inputs: { requested_power: 1, max_power: 0 }, expected: 0, group: 'exceeded_power' },
    { inputs: { requested_power: 999, max_power: 100 }, expected: 100, group: 'exceeded_power' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_clamp_16_1',
      prompt: '상한 제한 규칙과 경계값 보존을 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'requested_power=100, max_power=100일 때 출력은 무엇이어야 할까요?',
          options: [
            { value: '100 (경계선에서는 제한되지 않고 그대로 유지)', label: '100 (경계선에서는 제한되지 않고 그대로 유지)' },
            { value: '0으로 초기화된다', label: '0으로 초기화된다' },
          ],
          expected: '100 (경계선에서는 제한되지 않고 그대로 유지)',
        },
        {
          id: 'q2',
          text: 'if requested_power > max_power: 분기는 어떤 역할을 할까요?',
          options: [
            { value: '최대 한도를 넘어선 출력을 최대치로 되돌리는 역할', label: '최대 한도를 넘어선 출력을 최대치로 되돌리는 역할' },
            { value: '모든 출력을 0으로 만드는 역할', label: '모든 출력을 0으로 만드는 역할' },
          ],
          expected: '최대 한도를 넘어선 출력을 최대치로 되돌리는 역할',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_clamp_16_transfer_1',
      title: '배터리 충전 용량 제한',
      description: '현재 배터리(current)에 충전량(charge)을 더한 값이 최대 용량(capacity)을 초과하면 capacity를, 그렇지 않으면 합산된 배터리 값을 반환하는 함수를 작성하세요.',
      entryFunction: 'charge_battery',
      starterCode: `def charge_battery(current, charge, capacity):
    # 충전 후 배터리가 최대 용량을 넘지 않도록 최종 배터리를 계산하세요.
    pass
`,
      officialSolutionCode: `def charge_battery(current, charge, capacity):
    total = current + charge
    if total > capacity:
        return capacity
    return total
`,
      testCases: [
        { inputs: { current: 50, charge: 30, capacity: 100 }, expected: 80 },
        { inputs: { current: 60, charge: 40, capacity: 100 }, expected: 100 },
        { inputs: { current: 70, charge: 50, capacity: 100 }, expected: 100 },
        { inputs: { current: 100, charge: 20, capacity: 100 }, expected: 100 },
        { inputs: { current: 0, charge: 10, capacity: 0 }, expected: 0 },
      ],
    },
  ],
}
