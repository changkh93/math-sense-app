/**
 * AC-SIM-BELT-55 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SIM-BELT-55',
  problemVersion: 1,
  entryFunction: 'advance_cargo_belt',
  // 리스트 결합([x] + list)은 미지원이므로 38번 관행([요소] 리터럴 + .append())을 사용한다.
  officialSolutionCode: `def advance_cargo_belt(belt, incoming):
    outgoing = belt[-1]
    new_belt = [incoming]
    for i in range(len(belt) - 1):
        new_belt.append(belt[i])
    return [outgoing, new_belt]
`,
  intendedWrongFixtures: [
    {
      // 나간 화물을 버리지 않고 새 벨트 맨 앞에 되돌려 넣는 오개념.
      id: 'BELT-ROTATES-OUTGOING-TO-FRONT',
      expectedFailingGroup: 'normal-shift',
      code: `def advance_cargo_belt(belt, incoming):
    outgoing = belt[-1]
    new_belt = [outgoing]
    for i in range(len(belt) - 1):
        new_belt.append(belt[i])
    return [outgoing, new_belt]
`,
    },
    {
      // 새 화물을 벨트에 놓지 않고 버리는 오개념: 길이가 1 줄어든다.
      id: 'BELT-DROPS-INCOMING',
      expectedFailingGroup: 'length-invariant',
      code: `def advance_cargo_belt(belt, incoming):
    outgoing = belt[-1]
    new_belt = []
    for i in range(len(belt) - 1):
        new_belt.append(belt[i])
    return [outgoing, new_belt]
`,
    },
    {
      // 유출이 맨 앞에서 일어난다고 믿는 오개념.
      id: 'BELT-EXITS-FROM-FRONT',
      expectedFailingGroup: 'normal-shift',
      code: `def advance_cargo_belt(belt, incoming):
    outgoing = belt[0]
    new_belt = [incoming]
    for i in range(len(belt) - 1):
        new_belt.append(belt[i + 1])
    return [outgoing, new_belt]
`,
    },
    {
      // 남은 화물의 순서를 뒤집는 오개념.
      id: 'BELT-REVERSES-REMAINING',
      expectedFailingGroup: 'normal-shift',
      code: `def advance_cargo_belt(belt, incoming):
    outgoing = belt[-1]
    new_belt = [incoming]
    index = len(belt) - 2
    for i in range(len(belt) - 1):
        new_belt.append(belt[index])
        index = index - 1
    return [outgoing, new_belt]
`,
    },
  ],
  hiddenTests: [
    // 기본 이동: 유출은 끝, 새 화물은 앞, 나머지는 순서 유지.
    { inputs: { belt: [1, 2, 3, 4], incoming: 9 }, expected: [4, [9, 1, 2, 3]], group: 'normal-shift' },
    // 한 칸 벨트.
    { inputs: { belt: [8], incoming: 3 }, expected: [8, [3]], group: 'single-slot' },
    // 모든 값이 같은 경우.
    { inputs: { belt: [5, 5, 5], incoming: 5 }, expected: [5, [5, 5, 5]], group: 'duplicate-values' },
    // 새 화물이 0.
    { inputs: { belt: [6, 7], incoming: 0 }, expected: [7, [0, 6]], group: 'zero-incoming' },
    // 음수 값.
    { inputs: { belt: [4, -2], incoming: -9 }, expected: [-2, [-9, 4]], group: 'negative-values' },
    // 길이 보존(최대 8칸): DROPS-INCOMING 오답을 길이 불일치로 가른다.
    { inputs: { belt: [1, 2, 3, 4, 5, 6, 7, 8], incoming: 0 }, expected: [8, [0, 1, 2, 3, 4, 5, 6, 7]], group: 'length-invariant' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sim_055_1',
      title: '고정 길이 벨트 이동 이해',
      prompt: '벨트의 유입·유출·길이 보존 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '벨트에서 나가는 화물은 어느 위치의 화물일까요?',
          options: [
            { value: 'last_exits', label: '맨 끝의 화물 — 새 화물이 앞에서 밀어내므로' },
            { value: 'first_exits', label: '맨 앞의 화물 — 새 화물이 뒤에서 밀어내므로' },
          ],
          expected: 'last_exits',
        },
        {
          id: 'q2',
          text: '한 칸 이동 뒤 벨트 길이가 원래와 같은 이유는 무엇일까요?',
          options: [
            { value: 'in_equals_out', label: '하나가 들어오는 동안 하나가 나가서 들어온 수와 나간 수가 같기 때문에' },
            { value: 'belt_grows', label: '새 화물이 그냥 추가되기 때문에' },
          ],
          expected: 'in_equals_out',
        },
        {
          id: 'q3',
          text: '새 벨트에서 기존 화물들의 상대적 순서는 어떻게 될까요?',
          options: [
            { value: 'order_preserved', label: '원래 순서를 그대로 유지한 채 한 칸씩 뒤로 밀려난다' },
            { value: 'order_reversed', label: '순서가 거꾸로 뒤집힌다' },
          ],
          expected: 'order_preserved',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sim_055_transfer_1',
      title: '신호 버퍼 전달기',
      description: '고정 길이 신호 버퍼(buffer)에 새 신호(new_signal)가 들어오면 맨 끝 신호가 전달되고, 새 신호가 맨 앞에 놓입니다.',
      entryFunction: 'advance_signal_buffer',
      starterCode: `def advance_signal_buffer(buffer, new_signal):
    # [전달된 신호, 갱신된 버퍼]를 반환하세요.
    pass
`,
      officialSolutionCode: `def advance_signal_buffer(buffer, new_signal):
    delivered = buffer[-1]
    updated = [new_signal]
    for i in range(len(buffer) - 1):
        updated.append(buffer[i])
    return [delivered, updated]
`,
      contextCard: {
        title: '📨 신호 버퍼 전달 전략',
        strategyGuide: '버퍼 맨 끝 신호가 전달되고, 새 신호는 맨 앞에 놓이며 나머지 신호는 순서를 유지한 채 한 칸씩 밀려납니다.',
      },
      thoughtCheck: {
        question: '버퍼 [3, 1, 2]에 새 신호 4가 들어오면 전달되는 신호는 무엇일까요?',
        options: [
          { value: 'two_delivered', label: '2 — 맨 끝의 신호가 전달된다' },
          { value: 'three_delivered', label: '3 — 맨 앞의 신호가 전달된다' },
        ],
        expected: 'two_delivered',
      },
      testCases: [
        { inputs: { buffer: [3, 1, 2], new_signal: 4 }, expected: [2, [4, 3, 1]] },
        { inputs: { buffer: [9], new_signal: 0 }, expected: [9, [0]] },
        { inputs: { buffer: [-1, -2, -3], new_signal: -4 }, expected: [-3, [-4, -1, -2]] },
        { inputs: { buffer: [7, 7], new_signal: 7 }, expected: [7, [7, 7]] },
      ],
    },
  ],
}
