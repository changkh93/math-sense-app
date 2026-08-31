/**
 * AC-SIM-SWITCH-54 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SIM-SWITCH-54',
  problemVersion: 1,
  entryFunction: 'toggle_planet_switches',
  officialSolutionCode: `def toggle_planet_switches(switches, commands):
    for index in commands:
        switches[index] = not switches[index]
    return switches
`,
  intendedWrongFixtures: [
    {
      // 반전 대신 켜기만 하는 오개념: 두 번 명령해도 꺼지지 않는다.
      id: 'SWITCH-SETS-TRUE-INSTEAD-OF-TOGGLE',
      expectedFailingGroup: 'same-index-twice',
      code: `def toggle_planet_switches(switches, commands):
    for index in commands:
        switches[index] = True
    return switches
`,
    },
    {
      // 명령 하나마다 전체를 뒤집는 오개념: 선택 칸만 바뀌어야 한다.
      id: 'SWITCH-TOGGLES-ALL-EACH-COMMAND',
      expectedFailingGroup: 'mixed-repeated-indices',
      code: `def toggle_planet_switches(switches, commands):
    for index in commands:
        for i in range(len(switches)):
            switches[i] = not switches[i]
    return switches
`,
    },
    {
      // 명령을 무시하고 초기 상태를 그대로 돌려주는 오개념.
      id: 'SWITCH-REUSES-INITIAL-STATE',
      expectedFailingGroup: 'single-switch',
      code: `def toggle_planet_switches(switches, commands):
    result = []
    for i in range(len(switches)):
        result.append(switches[i])
    return result
`,
    },
    {
      // 명령 값 대신 명령 개수의 홀짝으로 전체를 뒤집는 오개념.
      id: 'SWITCH-USES-COMMAND-PARITY-ONLY',
      expectedFailingGroup: 'initially-all-on',
      code: `def toggle_planet_switches(switches, commands):
    count = 0
    for index in commands:
        count = count + 1
    if count % 2 == 1:
        for i in range(len(switches)):
            switches[i] = not switches[i]
    return switches
`,
    },
  ],
  hiddenTests: [
    // 같은 인덱스를 두 번 반전하면 원래 상태.
    { inputs: { switches: [false], commands: [0, 0] }, expected: [false], group: 'same-index-twice' },
    // 모든 인덱스를 한 번씩.
    { inputs: { switches: [false, false, false], commands: [0, 1, 2] }, expected: [true, true, true], group: 'all-indices-once' },
    // 스위치 하나짜리 패널.
    { inputs: { switches: [false], commands: [0] }, expected: [true], group: 'single-switch' },
    // 반복과 섞인 명령: SET-TRUE와 TOGGLE-ALL 오답을 가른다.
    { inputs: { switches: [false, true, false, true], commands: [1, 1, 3, 0] }, expected: [true, true, false, false], group: 'mixed-repeated-indices' },
    // 빈 명령 목록.
    { inputs: { switches: [false, false], commands: [] }, expected: [false, false], group: 'empty-commands' },
    // 처음부터 모두 켜진 상태.
    { inputs: { switches: [true, true], commands: [0] }, expected: [false, true], group: 'initially-all-on' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sim_054_1',
      title: '선택 칸 반전 이해',
      prompt: '인덱스 명령에 따른 스위치 반전 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '명령 [1]을 처리할 때 0번과 2번 칸이 그대로인 이유는 무엇일까요?',
          options: [
            { value: 'only_selected_index', label: '명령이 가리킨 1번 칸만 뒤집기 때문에' },
            { value: 'left_to_right', label: '왼쪽부터 순서대로만 뒤집히기 때문에' },
            { value: 'even_only', label: '짝수 번째 칸은 뒤집을 수 없기 때문에' },
          ],
          expected: 'only_selected_index',
        },
        {
          id: 'q2',
          text: '같은 칸을 두 번 뒤집으면 원래 상태로 돌아오는 이유는 무엇일까요?',
          options: [
            { value: 'double_toggle_restores', label: '반전을 두 번 하면 다시 제자리라 꺼짐-켜짐-꺼짐처럼 되돌아가서' },
            { value: 'second_ignored', label: '두 번째 명령은 무시되기 때문에' },
          ],
          expected: 'double_toggle_restores',
        },
        {
          id: 'q3',
          text: '명령 목록이 빈 목록([])이면 결과는 어떻게 될까요?',
          options: [
            { value: 'unchanged', label: '아무 칸도 뒤집히지 않아 처음 상태 그대로다' },
            { value: 'all_off', label: '모든 칸이 꺼진다' },
          ],
          expected: 'unchanged',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sim_054_transfer_1',
      title: '잠금 장치가 있는 조명 패널',
      description: '조명 패널(lights)에 명령 목록(commands)을 적용합니다. 패널이 잠겨 있으면(panel_locked가 True) 원래 상태를 그대로 돌려줍니다.',
      entryFunction: 'apply_light_commands',
      starterCode: `def apply_light_commands(lights, commands, panel_locked):
    # panel_locked가 True면 원본을 그대로, False면 명령 칸만 반전해 반환하세요.
    pass
`,
      officialSolutionCode: `def apply_light_commands(lights, commands, panel_locked):
    if panel_locked:
        return lights
    for index in commands:
        lights[index] = not lights[index]
    return lights
`,
      contextCard: {
        title: '💡 조명 패널 수리 전략',
        strategyGuide: '패널이 잠겨 있으면 원래 상태를 그대로 돌려주고, 열려 있으면 명령이 가리킨 칸만 반대 상태로 뒤집습니다.',
      },
      thoughtCheck: {
        question: '패널이 잠겨 있을 때 명령 [0]을 보내면 어떻게 될까요?',
        options: [
          { value: 'unchanged', label: '원래 상태 그대로다' },
          { value: 'toggled', label: '0번 칸만 반전된다' },
        ],
        expected: 'unchanged',
      },
      testCases: [
        // 같은 칸 두 번 반전은 원래대로.
        { inputs: { lights: [false, false, false], commands: [2, 2], panel_locked: false }, expected: [false, false, false] },
        // 빈 명령.
        { inputs: { lights: [true], commands: [], panel_locked: false }, expected: [true] },
        // 잠금 상태에서는 명령을 무시한다.
        { inputs: { lights: [true, true, true], commands: [1], panel_locked: true }, expected: [true, true, true] },
        // 반복이 섞인 열린 패널.
        { inputs: { lights: [true, false], commands: [0, 1, 0], panel_locked: false }, expected: [true, true] },
      ],
    },
  ],
}
