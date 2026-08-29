/**
 * Private Problem Definition: AC-EXP-VAR-02 (사라진 변수 값)
 */

module.exports = {
  problemId: 'AC-EXP-VAR-02',
  problemVersion: 1,
  entryFunction: 'update_signal',
  officialSolutionCode: `def update_signal(old_level, new_level):
    signal = old_level
    signal = new_level
    return signal
`,
  alternativeSolutions: [
    `def update_signal(old_level, new_level):
    return new_level
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'VAR-COMBINE-NOT-OVERWRITE',
      misconceptionCode: 'COMBINE-RATHER-THAN-OVERWRITE',
      expectedMisconception: 'COMBINE-RATHER-THAN-OVERWRITE',
      expectedFailingGroup: 'positive_levels',
      code: `def update_signal(old_level, new_level):
    return old_level + new_level
`,
    },
    {
      id: 'VAR-RETURN-OLD',
      misconceptionCode: 'RETURN-ORIGINAL-STATE',
      expectedMisconception: 'RETURN-ORIGINAL-STATE',
      expectedFailingGroup: 'positive_levels',
      code: `def update_signal(old_level, new_level):
    signal = old_level
    return signal
`,
    },
    {
      id: 'VAR-HARDCODED-NEW',
      misconceptionCode: 'HARDCODED-SAMPLE-RETURN',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
      expectedFailingGroup: 'zero_level',
      code: `def update_signal(old_level, new_level):
    return 70
`,
    },
  ],
  hiddenTests: [
    { inputs: { old_level: 100, new_level: 250 }, expected: 250, group: 'positive_levels' },
    { inputs: { old_level: 80, new_level: 0 }, expected: 0, group: 'zero_level' },
    { inputs: { old_level: 40, new_level: -15 }, expected: -15, group: 'negative_level' },
    { inputs: { old_level: 99, new_level: 99 }, expected: 99, group: 'same_value' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_var_02_1',
      type: 'single-choice',
      prompt: '변수 덮어쓰기 동작을 추적해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'old_level=30, new_level=70일 때, signal = new_level 실행 직후 signal의 값은 얼마일까요?',
          options: [
            { value: '70', label: '70' },
            { value: '30', label: '30' },
            { value: '100', label: '100' },
          ],
          expected: '70',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_var_02_t1',
      title: '항로 목표 갱신',
      description: '현재 탐사선의 목표 좌표(initial_target)를 새로운 긴급 좌표(updated_target)로 갱신하여 반환하세요.',
      entryFunction: 'update_target_destination',
      starterCode: `def update_target_destination(initial_target, updated_target):
    # 목표 좌표를 새 좌표로 갱신하세요.
    pass
`,
      officialSolutionCode: `def update_target_destination(initial_target, updated_target):
    dest = initial_target
    dest = updated_target
    return dest
`,
      testCases: [
        { inputs: { initial_target: 100, updated_target: 250 }, expected: 250 },
        { inputs: { initial_target: -5, updated_target: 80 }, expected: 80 },
      ],
    },
  ],
}
