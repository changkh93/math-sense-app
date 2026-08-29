module.exports = {
  problemId: 'AC-EXP-WHILE-07',
  problemVersion: 1,
  entryFunction: 'advance_until_target',
  officialSolutionCode: `def advance_until_target(start_pos, target_pos):
    pos = start_pos
    while pos < target_pos:
        pos = pos + 1
    return pos
`,
  alternativeSolutions: [
    `def advance_until_target(start_pos, target_pos):
    return target_pos
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'WHILE-NO-UPDATE',
      code: `def advance_until_target(start_pos, target_pos):
    pos = start_pos
    while pos < target_pos:
        pass
    return pos
`,
      expectedFailingGroup: 'single_step',
      expectedMisconception: 'WHILE-INFINITE-LOOP',
    },
    {
      label: 'WHILE-OFF-BY-ONE-OVERSHOOT',
      code: `def advance_until_target(start_pos, target_pos):
    pos = start_pos
    while pos <= target_pos:
        pos = pos + 1
    return pos
`,
      expectedFailingGroup: 'single_step',
      expectedMisconception: 'WHILE-OVERSHOOT-BOUND',
    },
    {
      label: 'WHILE-RETURN-INITIAL',
      code: `def advance_until_target(start_pos, target_pos):
    return start_pos
`,
      expectedFailingGroup: 'single_step',
      expectedMisconception: 'NO-STATE-UPDATE',
    },
  ],
  hiddenTests: [
    { inputs: { start_pos: 5, target_pos: 5 }, expected: 5, group: 'already_at_target' },
    { inputs: { start_pos: 3, target_pos: 4 }, expected: 4, group: 'single_step' },
    { inputs: { start_pos: 0, target_pos: 6 }, expected: 6, group: 'distance_travel' },
    { inputs: { start_pos: 10, target_pos: 25 }, expected: 25, group: 'distance_travel' },
    { inputs: { start_pos: 0, target_pos: 10 }, expected: 10, group: 'zero_start' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_exp_while_07_1',
      prompt: 'start=1, target=4일 때 2회차 루프 직후의 상태와 종료 조건을 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: '2회차 루프(pos = pos + 1)가 끝난 직후 pos의 값은?',
          options: [
            { value: '3', label: '3' },
            { value: '2', label: '2' },
            { value: '4', label: '4' },
          ],
          expected: '3',
        },
        {
          id: 'q2',
          text: '그 직후 다음 반복 조건 (pos < target)의 평가는 무엇일까요?',
          options: [
            { value: 'True', label: 'True (3 < 4이므로 계속 진행)' },
            { value: 'False', label: 'False (종료)' },
          ],
          expected: 'True',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_exp_while_07_transfer_1',
      title: '가변 보폭으로 안전선 전진',
      description: '로버가 시작 위치(start_pos)에서 목표 위치(target_pos)를 초과하지 않는 동안 보폭(step)만큼 전진하여, 목표를 넘지 않는 가장 먼 안전 위치를 반환하세요.',
      entryFunction: 'advance_with_step',
      starterCode: `def advance_with_step(start_pos, target_pos, step):
    pos = start_pos
    # pos + step 이 target_pos 이하인 동안 전진하는 while 문을 작성하세요.
    return pos
`,
      officialSolutionCode: `def advance_with_step(start_pos, target_pos, step):
    pos = start_pos
    while pos + step <= target_pos:
        pos = pos + step
    return pos
`,
      testCases: [
        { inputs: { start_pos: 0, target_pos: 10, step: 2 }, expected: 10 },
        { inputs: { start_pos: 1, target_pos: 10, step: 3 }, expected: 10 },
        { inputs: { start_pos: 0, target_pos: 9, step: 4 }, expected: 8 },
        { inputs: { start_pos: 5, target_pos: 5, step: 2 }, expected: 5 },
        { inputs: { start_pos: 2, target_pos: 4, step: 5 }, expected: 2 },
      ],
    },
  ],
}
