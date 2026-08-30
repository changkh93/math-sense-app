/**
 * Private Problem Definition: AC-PAT-CALENDAR-29 (다음 우주 캘린더)
 */

module.exports = {
  problemId: 'AC-PAT-CALENDAR-29',
  problemVersion: 1,
  entryFunction: 'calendar_day',
  officialSolutionCode: `def calendar_day(start_day, days_later):
    return (start_day + days_later) % 7
`,
  alternativeSolutions: [
    `def calendar_day(start_day, days_later):
    total = start_day + days_later
    return total % 7
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'CAL-MISSING-START-OFFSET',
      misconceptionCode: 'PERIOD-MISSING-START-OFFSET',
      expectedMisconception: 'PERIOD-MISSING-START-OFFSET',
      expectedFailingGroup: 'zero_move',
      code: `def calendar_day(start_day, days_later):
    return days_later % 7
`,
    },
    {
      id: 'CAL-MISSING-WRAP',
      misconceptionCode: 'PERIOD-MISSING-WRAP',
      expectedMisconception: 'PERIOD-MISSING-WRAP',
      expectedFailingGroup: 'wrap_boundary',
      code: `def calendar_day(start_day, days_later):
    return start_day + days_later
`,
    },
    {
      id: 'CAL-OFF-BY-ONE',
      misconceptionCode: 'PERIOD-OFF-BY-ONE',
      expectedMisconception: 'PERIOD-OFF-BY-ONE',
      expectedFailingGroup: 'zero_move',
      code: `def calendar_day(start_day, days_later):
    return (start_day + days_later + 1) % 7
`,
    },
    {
      id: 'CAL-OFFSET-DIRECTION',
      misconceptionCode: 'PERIOD-OFFSET-DIRECTION',
      expectedMisconception: 'PERIOD-OFFSET-DIRECTION',
      expectedFailingGroup: 'large_move',
      code: `def calendar_day(start_day, days_later):
    return (days_later - start_day) % 7
`,
    },
  ],
  hiddenTests: [
    { inputs: { start_day: 3, days_later: 0 }, expected: 3, group: 'zero_move' },
    { inputs: { start_day: 6, days_later: 1 }, expected: 0, group: 'wrap_boundary' },
    { inputs: { start_day: 4, days_later: 7 }, expected: 4, group: 'full_cycle' },
    { inputs: { start_day: 1, days_later: 13 }, expected: 0, group: 'large_move' },
    { inputs: { start_day: 2, days_later: 1000000 }, expected: 3, group: 'large_move' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_calendar_29_1',
      title: '★★ 시작 요일과 큰 수의 주기 전이',
      type: 'trace_understanding',
      prompt: '0일 뒤의 상태 보존과 1,000,000일 뒤의 주기 계산 원리를 확인하세요.',
      codeSnippet: `def calendar_day(start_day, days_later):
    return (start_day + days_later) % 7`,
      questions: [
        {
          id: 'q1',
          text: 'start_day=4(금요일), days_later=0일 때 계산 결과가 4가 되는 이유는 무엇일까요?',
          options: [
            { value: 'zero_move_keeps', label: '0일을 이동하면 날짜가 바뀌지 않아 시작 요일이 그대로 유지되기 때문' },
            { value: 'all_zero', label: '모든 0일 이동은 요일 0(월요일)이 되기 때문' },
            { value: 'error', label: '0으로 나눌 수 없기 때문' },
          ],
          expected: 'zero_move_keeps',
        },
        {
          id: 'q2',
          text: 'start_day=3, days_later=1000000 처럼 아주 큰 수도 반복문 없이 빠르게 계산할 수 있는 이유는 무엇일까요?',
          options: [
            { value: 'period_remainder', label: '7일마다 같은 요일로 돌아오므로 7로 나눈 나머지만 구하면 되기 때문' },
            { value: 'loop_required', label: '백만 번 루프를 돌아야만 정확하기 때문' },
            { value: 'approximate', label: '대략적인 날짜만 맞추기 때문' },
          ],
          expected: 'period_remainder',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_pat_calendar_29_t1',
      title: '원형 회전 좌석 번호 계산',
      description: 'seat_count개의 좌석(0부터 seat_count - 1까지)이 원형으로 배치되어 있을 때, start 위치에서 시계 방향으로 moves 칸 이동한 최종 좌석 번호를 반환하세요.',
      contextCard: {
        title: '📋 원형 좌석 이동 흐름 예시',
        steps: [
          { label: '초기 좌석', text: 'start = 1 (총 5좌석: 0~4)' },
          { label: '이동 칸수', text: 'moves = 0 -> 1 그대로' },
          { label: '3칸 이동', text: 'start=4, moves=3 -> (4+3)%5 = 2' },
        ],
      },
      thoughtCheck: {
        prompt: '고정된 7일 대신 원형 좌석에서는 어떤 값을 주기 길이로 나누어야 할까요?',
        options: [
          { id: 'opt_seat_count', label: '전체 좌석 수인 seat_count로 나눈다', isCorrect: true },
          { id: 'opt_seven', label: '항상 7로 나눈다', isCorrect: false },
        ],
        feedback: '맞아요! 주기의 크기가 seat_count로 바뀌었으므로 (start + moves) % seat_count로 일반화합니다.',
      },
      entryFunction: 'rotated_seat',
      starterCode: `def rotated_seat(start, moves, seat_count):
    # 0부터 seat_count - 1까지의 좌석에서 start 위치로부터 moves 칸 이동한 좌석 번호를 반환하세요.
    pass
`,
      officialSolutionCode: `def rotated_seat(start, moves, seat_count):
    return (start + moves) % seat_count
`,
      testCases: [
        { inputs: { start: 0, moves: 20, seat_count: 4 }, expected: 0 },
        { inputs: { start: 6, moves: 1, seat_count: 7 }, expected: 0 },
        { inputs: { start: 2, moves: 1000000, seat_count: 9 }, expected: 3 },
        { inputs: { start: 11, moves: 37, seat_count: 12 }, expected: 0 },
      ],
    },
  ],
}
