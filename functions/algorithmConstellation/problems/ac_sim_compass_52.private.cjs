/**
 * AC-SIM-COMPASS-52 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SIM-COMPASS-52',
  problemVersion: 1,
  entryFunction: 'rotate_compass',
  officialSolutionCode: `def rotate_compass(start_direction, commands):
    direction = start_direction
    for command in commands:
        if command == "R":
            direction = (direction + 1) % 4
        else:
            direction = (direction + 3) % 4
    return direction
`,
  intendedWrongFixtures: [
    {
      id: 'COMPASS-NO-WRAP',
      expectedFailingGroup: 'right-wrap',
      code: `def rotate_compass(start_direction, commands):
    direction = start_direction
    for command in commands:
        if command == "R":
            direction = direction + 1
        else:
            direction = direction + 3
    return direction
`,
    },
    {
      id: 'COMPASS-LEFT-SAME-AS-RIGHT',
      expectedFailingGroup: 'left-wrap',
      code: `def rotate_compass(start_direction, commands):
    direction = start_direction
    for command in commands:
        if command == "R":
            direction = (direction + 1) % 4
        else:
            direction = (direction + 1) % 4
    return direction
`,
    },
    {
      // 마지막 명령 하나만 적용하는 오개념: 시작 방향에 마지막 명령 한 번만 반영.
      id: 'COMPASS-USES-LAST-COMMAND-ONLY',
      expectedFailingGroup: 'four-turn-cycle',
      code: `def rotate_compass(start_direction, commands):
    direction = start_direction
    count = 0
    for command in commands:
        count = count + 1
    if count > 0:
        last = commands[count - 1]
        if last == "R":
            direction = (start_direction + 1) % 4
        else:
            direction = (start_direction + 3) % 4
    return direction
`,
    },
    {
      // L 명령을 아예 무시하고 R만 세는 오개념.
      id: 'COMPASS-COUNTS-RIGHT-ONLY',
      expectedFailingGroup: 'left-wrap',
      code: `def rotate_compass(start_direction, commands):
    direction = start_direction
    for command in commands:
        if command == "R":
            direction = (direction + 1) % 4
    return direction % 4
`,
    },
  ],
  hiddenTests: [
    // 빈 명령 목록: 시작 방향 그대로.
    { inputs: { start_direction: 2, commands: [] }, expected: 2, group: 'empty-turns' },
    // 오른쪽 경계 통과: 2 + 2 = 4 -> 0.
    { inputs: { start_direction: 2, commands: ['R', 'R'] }, expected: 0, group: 'right-wrap' },
    // 왼쪽 경계 통과: 0에서 L -> 3 (가산 형식 (0 + 3) % 4).
    { inputs: { start_direction: 0, commands: ['L'] }, expected: 3, group: 'left-wrap' },
    // 네 번 회전은 한 바퀴: 마지막 명령만 적용하는 오답을 잡는다.
    { inputs: { start_direction: 1, commands: ['R', 'R', 'R', 'R'] }, expected: 1, group: 'four-turn-cycle' },
    // R과 L이 섞인 목록.
    { inputs: { start_direction: 0, commands: ['R', 'L', 'R'] }, expected: 1, group: 'mixed-turns' },
    // 여러 바퀴를 도는 긴 목록.
    { inputs: { start_direction: 3, commands: ['R', 'R', 'R', 'R', 'R', 'R'] }, expected: 1, group: 'multiple-cycles' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sim_052_1',
      title: '순환 방향 감싸기 이해',
      prompt: '4방향 나침반의 순환 회전 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '서(3)에서 R을 하면 북(0)이 되는 이유는 무엇일까요?',
          options: [
            { value: 'wrap_to_start', label: '방향이 네 개로 순환하므로 끝을 지나면 첫 방향으로 돌아가서' },
            { value: 'stays_four', label: '4라는 새 방향이 생겨서' },
            { value: 'turns_back', label: '회전이 무시되어서' },
          ],
          expected: 'wrap_to_start',
        },
        {
          id: 'q2',
          text: '왼쪽 회전(L)을 "방향에 3을 더한 뒤 감싸기"로 표현하면 좋은 이유는 무엇일까요?',
          options: [
            { value: 'always_in_range', label: '어떤 방향에서 계산해도 중간 값이 음수가 되지 않아 나머지로 한 번에 감쌀 수 있어서' },
            { value: 'shorter_code', label: '코드가 더 짧아져서' },
            { value: 'same_as_right', label: '왼쪽과 오른쪽이 같은 회전이어서' },
          ],
          expected: 'always_in_range',
        },
        {
          id: 'q3',
          text: '어느 방향에서 R을 네 번 하면 어떻게 될까요?',
          options: [
            { value: 'full_cycle', label: '한 바퀴 돌아 처음 방향으로 돌아온다' },
            { value: 'off_range', label: '방향이 4만큼 늘어나 범위를 벗어난다' },
          ],
          expected: 'full_cycle',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sim_052_transfer_1',
      title: '일주일 요일 이동기',
      description: '요일을 0(월)부터 6(일)까지 일곱 개로 기록할 때, NEXT와 PREV 이동 명령을 처리해 최종 요일을 구합니다.',
      entryFunction: 'shift_weekday',
      starterCode: `def shift_weekday(start_day, moves):
    # NEXT와 PREV를 처리해 최종 요일(0~6)을 반환하세요.
    pass
`,
      officialSolutionCode: `def shift_weekday(start_day, moves):
    day = start_day
    for move in moves:
        if move == "NEXT":
            day = (day + 1) % 7
        else:
            day = (day + 6) % 7
    return day
`,
      contextCard: {
        title: '📅 요일 이동 전략',
        strategyGuide: 'NEXT는 하루를 더하고, PREV는 하루 전으로 돌아가되 요일 범위를 벗어나면 반대편 끝으로 감싸 줍니다.',
      },
      thoughtCheck: {
        question: '요일 0(월)에서 PREV를 처리하면 몇 번 요일이 될까요?',
        options: [
          { value: 'sunday_six', label: '6 (일) — 앞쪽 끝을 지나 반대편 끝으로 감싸진다' },
          { value: 'minus_one', label: '-1 — 범위 밖의 새 요일이 된다' },
        ],
        expected: 'sunday_six',
      },
      testCases: [
        // PREV 감산 대신 가산 형식((day + 6) % 7)이 필요한 앞쪽 경계.
        { inputs: { start_day: 5, moves: ['PREV'] }, expected: 4 },
        { inputs: { start_day: 0, moves: ['PREV'] }, expected: 6 },
        // 빈 이동 목록.
        { inputs: { start_day: 3, moves: [] }, expected: 3 },
        // 여러 바퀴 이동.
        { inputs: { start_day: 6, moves: ['NEXT', 'NEXT'] }, expected: 1 },
      ],
    },
  ],
}
