module.exports = {
  problemId: 'AC-COND-NOT-13',
  problemVersion: 1,
  entryFunction: 'is_alarm_light_on',
  officialSolutionCode: `def is_alarm_light_on(silent_mode):
    return not silent_mode
`,
  alternativeSolutions: [
    `def is_alarm_light_on(silent_mode):
    if silent_mode:
        return False
    return True
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'NOT-DIRECT-RETURN',
      code: `def is_alarm_light_on(silent_mode):
    return silent_mode
`,
      expectedFailingGroup: 'silent_active',
      expectedMisconception: 'IDENTITY-PASS-THROUGH',
    },
    {
      label: 'NOT-ALWAYS-TRUE',
      code: `def is_alarm_light_on(silent_mode):
    return True
`,
      expectedFailingGroup: 'silent_active',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
    {
      label: 'NOT-ALWAYS-FALSE',
      code: `def is_alarm_light_on(silent_mode):
    return False
`,
      expectedFailingGroup: 'silent_inactive',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { silent_mode: true }, expected: false, group: 'silent_active' },
    { inputs: { silent_mode: false }, expected: true, group: 'silent_inactive' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_not_13_1',
      prompt: 'not 연산자의 실행 결과와 의미를 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'not True와 not False의 결과는 각각 무엇일까요?',
          options: [
            { value: 'False와 True', label: 'False와 True' },
            { value: 'True와 False', label: 'True와 False' },
            { value: '둘 다 True', label: '둘 다 True' },
          ],
          expected: 'False와 True',
        },
        {
          id: 'q2',
          text: 'silent_mode=True인데 경보등이 꺼지는(False) 이유는 무엇일까요?',
          options: [
            { value: '입력 상태를 반대로 뒤집는 규칙이기 때문', label: '입력 상태를 반대로 뒤집는 규칙이기 때문' },
            { value: '입력 상태를 그대로 사용하기 때문', label: '입력 상태를 그대로 사용하기 때문' },
          ],
          expected: '입력 상태를 반대로 뒤집는 규칙이기 때문',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_not_13_transfer_1',
      title: '선체 균열 센서 상태 판정',
      description: '센서가 정상이면(sensor_ok=True) 균열 없음(False), 정상이 아니면(sensor_ok=False) 균열 있음(True)을 반환하는 함수를 작성하세요.',
      entryFunction: 'is_hull_breached',
      starterCode: `def is_hull_breached(sensor_ok):
    # 센서 정상 여부(sensor_ok)의 반대 상태를 반환하세요.
    pass
`,
      officialSolutionCode: `def is_hull_breached(sensor_ok):
    return not sensor_ok
`,
      testCases: [
        { inputs: { sensor_ok: true }, expected: false },
        { inputs: { sensor_ok: false }, expected: true },
      ],
    },
  ],
}
