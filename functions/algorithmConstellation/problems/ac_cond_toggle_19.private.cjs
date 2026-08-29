module.exports = {
  problemId: 'AC-COND-TOGGLE-19',
  problemVersion: 1,
  entryFunction: 'toggle_base_power',
  officialSolutionCode: `def toggle_base_power(initial_power, toggle_actions):
    power = initial_power
    for action in toggle_actions:
        if action:
            power = not power
    return power
`,
  alternativeSolutions: [
    `def toggle_base_power(initial_power, toggle_actions):
    power = initial_power
    for action in toggle_actions:
        if action:
            if power:
                power = False
            else:
                power = True
    return power
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'TOGGLE-REUSE-INITIAL-STATE',
      code: `def toggle_base_power(initial_power, toggle_actions):
    power = initial_power
    for action in toggle_actions:
        if action:
            power = not initial_power
    return power
`,
      expectedFailingGroup: 'multiple_toggles',
      expectedMisconception: 'STATE-UPDATE-FROM-STALE-VALUE',
    },
    {
      label: 'TOGGLE-NO-STATE-UPDATE',
      code: `def toggle_base_power(initial_power, toggle_actions):
    return initial_power
`,
      expectedFailingGroup: 'single_toggle',
      expectedMisconception: 'MISSING-STATE-MUTATION',
    },
    {
      label: 'TOGGLE-UNCONDITIONAL-FLIP',
      code: `def toggle_base_power(initial_power, toggle_actions):
    power = initial_power
    for action in toggle_actions:
        power = not power
    return power
`,
      expectedFailingGroup: 'mixed_actions',
      expectedMisconception: 'UNCONDITIONAL-STATE-MUTATION',
    },
  ],
  hiddenTests: [
    { inputs: { initial_power: true, toggle_actions: [] }, expected: true, group: 'no_action' },
    { inputs: { initial_power: true, toggle_actions: [true] }, expected: false, group: 'single_toggle' },
    { inputs: { initial_power: false, toggle_actions: [false, false] }, expected: false, group: 'preserve_only' },
    { inputs: { initial_power: true, toggle_actions: [false] }, expected: true, group: 'preserve_only' },
    { inputs: { initial_power: false, toggle_actions: [true, false, false, false] }, expected: true, group: 'mixed_actions' },
    { inputs: { initial_power: true, toggle_actions: [false, true, false, false] }, expected: false, group: 'mixed_actions' },
    { inputs: { initial_power: false, toggle_actions: [true, true] }, expected: false, group: 'multiple_toggles' },
    { inputs: { initial_power: true, toggle_actions: [true, true, true, true] }, expected: true, group: 'multiple_toggles' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_toggle_19_1',
      prompt: '토글 누적 상태 갱신과 직전 상태 참조를 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'initial_power=False일 때 True 신호가 2번 들어오면 왜 최종 전원이 다시 False가 될까요?',
          options: [
            { value: '두 번 반전되면 원래 상태(False)로 돌아오기 때문', label: '두 번 반전되면 원래 상태(False)로 돌아오기 때문' },
            { value: '스위치가 꺼져 있기 때문', label: '스위치가 꺼져 있기 때문' },
          ],
          expected: '두 번 반전되면 원래 상태(False)로 돌아오기 때문',
        },
        {
          id: 'q2',
          text: 'power = not initial_power처럼 매번 최초 상태를 참조하면 어떤 문제가 생길까요?',
          options: [
            { value: '직전의 바뀐 상태가 아니라 최초 상태만을 기준으로 계산하여 두 번째 이후의 반전이 유실됨', label: '직전의 바뀐 상태가 아니라 최초 상태만을 기준으로 계산하여 두 번째 이후의 반전이 유실됨' },
            { value: 'initial_power가 숫자가 아니기 때문에 실행 오류 발생', label: 'initial_power가 숫자가 아니기 때문에 실행 오류 발생' },
          ],
          expected: '직전의 바뀐 상태가 아니라 최초 상태만을 기준으로 계산하여 두 번째 이후의 반전이 유실됨',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_toggle_19_transfer_1',
      title: '안전 잠금이 있는 차폐막 토글',
      description: '차폐막 상태(shield_on)에서 명령 리스트(commands)를 순회하며, command가 True이고 안전 잠금이 해제(not controls_locked)되어 있을 때만 상태를 반전시키는 함수를 작성하세요.',
      entryFunction: 'toggle_shield_status',
      starterCode: `def toggle_shield_status(shield_on, commands, controls_locked):
    # 안전 잠금이 해제된 상태에서만 참 명령에 따라 차폐막 상태를 반전하세요.
    pass
`,
      officialSolutionCode: `def toggle_shield_status(shield_on, commands, controls_locked):
    status = shield_on
    for command in commands:
        if command and not controls_locked:
            status = not status
    return status
`,
      testCases: [
        { inputs: { shield_on: false, commands: [true, false, true], controls_locked: false }, expected: false },
        { inputs: { shield_on: true, commands: [true, true, true], controls_locked: false }, expected: false },
        { inputs: { shield_on: false, commands: [true], controls_locked: true }, expected: false },
        { inputs: { shield_on: true, commands: [true, false], controls_locked: true }, expected: true },
        { inputs: { shield_on: true, commands: [], controls_locked: false }, expected: true },
      ],
    },
  ],
}
