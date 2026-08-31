/**
 * AC-SIM-CLOCK-53 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SIM-CLOCK-53',
  problemVersion: 1,
  entryFunction: 'adjust_space_clock',
  officialSolutionCode: `def adjust_space_clock(hour, minute, add_minutes):
    total = hour * 60 + minute + add_minutes
    new_hour = (total // 60) % 24
    new_minute = total % 60
    return [new_hour, new_minute]
`,
  intendedWrongFixtures: [
    {
      // 올림 후 분이 60 이상인 채로 남는 오개념.
      id: 'CLOCK-MINUTES-WITHOUT-CARRY',
      expectedFailingGroup: 'exact-hour-carry',
      code: `def adjust_space_clock(hour, minute, add_minutes):
    new_minute = minute + add_minutes
    new_hour = hour
    if new_minute > 59:
        new_hour = hour + 1
    return [new_hour, new_minute]
`,
    },
    {
      // 하루 감싸기 누락: 24 이상의 시간이 그대로 반환된다.
      id: 'CLOCK-HOUR-WITHOUT-DAY-WRAP',
      expectedFailingGroup: 'day-wrap',
      code: `def adjust_space_clock(hour, minute, add_minutes):
    total = hour * 60 + minute + add_minutes
    new_hour = total // 60
    new_minute = total % 60
    return [new_hour, new_minute]
`,
    },
    {
      // 60과 같은 정확한 경계에서 올림을 놓치는 오개념.
      id: 'CLOCK-CARRY-ONLY-ON-GREATER-THAN-60',
      expectedFailingGroup: 'exact-hour-carry',
      code: `def adjust_space_clock(hour, minute, add_minutes):
    new_hour = hour
    new_minute = minute + add_minutes
    if new_minute > 60:
        new_hour = new_hour + new_minute // 60
        new_minute = new_minute % 60
    return [new_hour, new_minute]
`,
    },
    {
      // 분을 시간에 직접 더하는 오개념.
      id: 'CLOCK-ADDS-MINUTES-DIRECTLY-TO-HOUR',
      expectedFailingGroup: 'multi-hour-carry',
      code: `def adjust_space_clock(hour, minute, add_minutes):
    new_hour = hour + add_minutes
    new_minute = minute
    return [new_hour % 24, new_minute]
`,
    },
  ],
  hiddenTests: [
    // 정확히 60분 경계 올림: 9:59 + 1 = 10:00.
    { inputs: { hour: 9, minute: 59, add_minutes: 1 }, expected: [10, 0], group: 'exact-hour-carry' },
    // 여러 시간에 걸친 올림.
    { inputs: { hour: 8, minute: 15, add_minutes: 130 }, expected: [10, 25], group: 'multi-hour-carry' },
    // 하루 감싸기: 23:30 + 90분 = 다음 날 1:00.
    { inputs: { hour: 23, minute: 30, add_minutes: 90 }, expected: [1, 0], group: 'day-wrap' },
    // 분 경계: 정각에 정확히 60분.
    { inputs: { hour: 4, minute: 0, add_minutes: 60 }, expected: [5, 0], group: 'minute-boundary' },
    // 더할 값이 0.
    { inputs: { hour: 21, minute: 33, add_minutes: 0 }, expected: [21, 33], group: 'zero-addition' },
    // 하루 전체(+1440분)는 같은 시각.
    { inputs: { hour: 6, minute: 45, add_minutes: 1440 }, expected: [6, 45], group: 'full-day-equivalent' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sim_053_1',
      title: '단위 올림과 하루 순환 이해',
      prompt: '시계를 분 단위로 정규화하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '59분에 1분을 더했을 때 시간이 1 늘어나고 분이 0이 되는 이유는 무엇일까요?',
          options: [
            { value: 'carry_to_hour', label: '60분이 곧 1시간이라 기준에 닿은 만큼 큰 단위로 올라가고 남은 것만 분이 되어서' },
            { value: 'minutes_reset', label: '분이 60을 넘으면 버려져서' },
            { value: 'clock_stops', label: '시계가 멈춰서' },
          ],
          expected: 'carry_to_hour',
        },
        {
          id: 'q2',
          text: '23시 50분에 20분을 더하면 0시 10분이 되는 이유는 무엇일까요?',
          options: [
            { value: 'day_wrap', label: '하루는 24시간이라 넘친 만큼 다음 날 0시부터 다시 세어서' },
            { value: 'hour_24', label: '24시라는 새 시간이 생겨서' },
          ],
          expected: 'day_wrap',
        },
        {
          id: 'q3',
          text: '전체를 분으로 합친 뒤 60으로 나눈 나머지를 분으로 쓰는 이유는 무엇일까요?',
          options: [
            { value: 'remainder_is_leftover', label: '나눈 나머지는 60분에 못 미치는 남은 작은 단위이기 때문에' },
            { value: 'remainder_random', label: '나머지는 아무 수나 나오기 때문에' },
          ],
          expected: 'remainder_is_leftover',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sim_053_transfer_1',
      title: '임무 타이머 조정기',
      description: '임무 타이머를 분(minute)과 초(second)로 기록할 때, 더할 초(add_seconds)를 처리해 60분 주기로 정규화한 [분, 초]를 반환합니다.',
      entryFunction: 'adjust_mission_timer',
      starterCode: `def adjust_mission_timer(minute, second, add_seconds):
    # 초를 더한 뒤 [새 분, 새 초]를 반환하세요.
    pass
`,
      officialSolutionCode: `def adjust_mission_timer(minute, second, add_seconds):
    total = minute * 60 + second + add_seconds
    new_minute = (total // 60) % 60
    new_second = total % 60
    return [new_minute, new_second]
`,
      contextCard: {
        title: '⏱️ 임무 타이머 정규화 전략',
        strategyGuide: '분과 초를 모두 초 단위로 합친 뒤, 몫으로 분을 나누고 나머지로 초를 남겨 60분 주기로 감싸 줍니다.',
      },
      thoughtCheck: {
        question: '타이머가 1분 50초일 때 20초를 더하면 어떻게 될까요?',
        options: [
          { value: 'two_ten', label: '2분 10초 — 60초가 넘자 분으로 올라가 남은 초만 남는다' },
          { value: 'one_seventy', label: '1분 70초 — 초가 그대로 유지된다' },
        ],
        expected: 'two_ten',
      },
      testCases: [
        // 정각 경계: 59:59 + 1초는 0분 0초로 감싸진다.
        { inputs: { minute: 59, second: 59, add_seconds: 1 }, expected: [0, 0] },
        // 한 바퀴 전체(+3600초).
        { inputs: { minute: 0, second: 0, add_seconds: 3600 }, expected: [0, 0] },
        // 여러 분에 걸친 올림.
        { inputs: { minute: 30, second: 45, add_seconds: 75 }, expected: [32, 0] },
        // 더할 값이 0.
        { inputs: { minute: 12, second: 20, add_seconds: 0 }, expected: [12, 20] },
      ],
    },
  ],
}
