/**
 * AC-ENUM-COMB-64 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-COMB-64',
  problemVersion: 1,
  entryFunction: 'list_sensor_pairs',
  officialSolutionCode: `def list_sensor_pairs(sensors):
    combos = []
    for i in range(len(sensors)):
        for j in range(i + 1, len(sensors)):
            combos.append([sensors[i], sensors[j]])
    return combos
`,
  intendedWrongFixtures: [
    {
      // 순서쌍까지 만들어 두 배로 반환하는 오개념.
      id: 'COMB-BOTH-ORDERS',
      expectedFailingGroup: 'combination-order',
      code: `def list_sensor_pairs(sensors):
    combos = []
    for i in range(len(sensors)):
        for j in range(i + 1, len(sensors)):
            combos.append([sensors[i], sensors[j]])
            combos.append([sensors[j], sensors[i]])
    return combos
`,
    },
    {
      // 자기 자신과의 짝을 포함하는 오개념.
      id: 'COMB-INCLUDES-SELF',
      expectedFailingGroup: 'max-size',
      code: `def list_sensor_pairs(sensors):
    combos = []
    for i in range(len(sensors)):
        for j in range(i, len(sensors)):
            combos.append([sensors[i], sensors[j]])
    return combos
`,
    },
    {
      // 마지막 센서를 짝 후보에서 누락하는 오개념.
      id: 'COMB-SKIPS-LAST-SENSOR',
      expectedFailingGroup: 'reversed-order',
      code: `def list_sensor_pairs(sensors):
    combos = []
    for i in range(len(sensors)):
        for j in range(i + 1, len(sensors) - 1):
            combos.append([sensors[i], sensors[j]])
    return combos
`,
    },
    {
      // 값 쌍이 아니라 위치 쌍을 반환하는 오개념.
      id: 'COMB-RETURNS-INDEX-PAIRS',
      expectedFailingGroup: 'reversed-order',
      code: `def list_sensor_pairs(sensors):
    combos = []
    for i in range(len(sensors)):
        for j in range(i + 1, len(sensors)):
            combos.append([i, j])
    return combos
`,
    },
  ],
  hiddenTests: [
    // 빈 목록.
    { inputs: { sensors: [] }, expected: [], group: 'empty-list' },
    // 두 항목: 조합은 정확히 하나.
    { inputs: { sensors: ['P', 'Q'] }, expected: [['P', 'Q']], group: 'two-items' },
    // 네 항목: 생성 순서를 검증한다 (COMB-BOTH-ORDERS를 가른다).
    { inputs: { sensors: ['A', 'B', 'C', 'D'] }, expected: [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']], group: 'combination-order' },
    // 역순 입력: 마지막 항목 누락·위치 반환 오답을 가른다.
    { inputs: { sensors: ['D', 'C', 'B', 'A'] }, expected: [['D', 'C'], ['D', 'B'], ['D', 'A'], ['C', 'B'], ['C', 'A'], ['B', 'A']], group: 'reversed-order' },
    // 최대 크기 8: 28개 조합과 길이 불변을 확인한다.
    { inputs: { sensors: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] }, expected: [['S1', 'S2'], ['S1', 'S3'], ['S1', 'S4'], ['S1', 'S5'], ['S1', 'S6'], ['S1', 'S7'], ['S1', 'S8'], ['S2', 'S3'], ['S2', 'S4'], ['S2', 'S5'], ['S2', 'S6'], ['S2', 'S7'], ['S2', 'S8'], ['S3', 'S4'], ['S3', 'S5'], ['S3', 'S6'], ['S3', 'S7'], ['S3', 'S8'], ['S4', 'S5'], ['S4', 'S6'], ['S4', 'S7'], ['S4', 'S8'], ['S5', 'S6'], ['S5', 'S7'], ['S5', 'S8'], ['S6', 'S7'], ['S6', 'S8'], ['S7', 'S8']], group: 'max-size' },
    // 한 항목.
    { inputs: { sensors: ['ONLY'] }, expected: [], group: 'single-item' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_064_1',
      title: '조합 생성 이해',
      prompt: '조합을 순서대로 만들 때의 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '(A, B)를 만든 뒤 (B, A)도 만들어야 할까요?',
          options: [
            { value: 'no_same_combo', label: '아니요 — 순서만 다른 같은 조합이라 하나만 기록한다' },
            { value: 'yes_both', label: '예 — 순서쌍까지 모두 만들어야 한다' },
          ],
          expected: 'no_same_combo',
        },
        {
          id: 'q2',
          text: '기록해야 할 것은 위치 쌍일까요 값 쌍일까요?',
          options: [
            { value: 'value_pairs', label: '값 쌍 — 문제가 센서 조합 자체를 요구하기 때문에' },
            { value: 'index_pairs', label: '위치 쌍 — 항상 위치를 기록하기 때문에' },
          ],
          expected: 'value_pairs',
        },
        {
          id: 'q3',
          text: '센서가 하나뿐이면 결과는 어떻게 될까요?',
          options: [
            { value: 'empty_result', label: '짝지을 둘째 센서가 없어 빈 목록이다' },
            { value: 'self_pair', label: '자기 자신과의 짝 하나가 나온다' },
          ],
          expected: 'empty_result',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_064_transfer_1',
      title: '두 명씩 짝지는 승무원 팀',
      description: '승무원 후보 목록(members)에서 두 명을 고르는 모든 팀 구성을 생성 순서대로 반환합니다.',
      entryFunction: 'list_crew_pairs',
      starterCode: `def list_crew_pairs(members):
    # 두 명을 고르는 모든 팀 구성을 반환하세요.
    pass
`,
      officialSolutionCode: `def list_crew_pairs(members):
    teams = []
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            teams.append([members[i], members[j]])
    return teams
`,
      contextCard: {
        title: '👥 팀 구성 생성 전략',
        strategyGuide: '앞 후보를 고정해 뒤쪽 후보와 차례로 짝지고, 같은 짝을 두 번 만들지 않으며 생성 순서를 지켜 기록합니다.',
      },
      thoughtCheck: {
        question: '후보 [루미, 노바, 솔]의 두 명 팀 구성은 모두 몇 개일까요?',
        options: [
          { value: 'three', label: '3개 — (루미,노바), (루미,솔), (노바,솔)' },
          { value: 'six', label: '6개 — 자리를 바꾼 짝까지 센다' },
        ],
        expected: 'three',
      },
      testCases: [
        { inputs: { members: ['P', 'Q', 'R', 'S'] }, expected: [['P', 'Q'], ['P', 'R'], ['P', 'S'], ['Q', 'R'], ['Q', 'S'], ['R', 'S']] },
        { inputs: { members: [] }, expected: [] },
        { inputs: { members: ['X', 'Y'] }, expected: [['X', 'Y']] },
        { inputs: { members: ['E', 'D', 'C'] }, expected: [['E', 'D'], ['E', 'C'], ['D', 'C']] },
      ],
    },
  ],
}
