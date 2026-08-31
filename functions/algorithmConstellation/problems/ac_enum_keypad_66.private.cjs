/**
 * AC-ENUM-KEYPAD-66 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-KEYPAD-66',
  problemVersion: 1,
  entryFunction: 'build_keypad_codes',
  // frontier 재할당(codes = next_codes)과 문자열 + 결합은 모두 실행 검증 완료.
  // 최대 구성(4×3×2)에서 382 step — 예산 여유 큼.
  officialSolutionCode: `def build_keypad_codes(groups):
    codes = ['']
    for choices in groups:
        next_codes = []
        for prefix in codes:
            for letter in choices:
                next_codes.append(prefix + letter)
        codes = next_codes
    return codes
`,
  intendedWrongFixtures: [
    {
      // 첫 그룹만 반환하고 확장하지 않는 오개념.
      id: 'KEYPAD-FIRST-GROUP-ONLY',
      expectedFailingGroup: 'two-groups',
      code: `def build_keypad_codes(groups):
    return groups[0]
`,
    },
    {
      // prefix 없이 letter만 누적하는 오개념: 마지막 그룹의 글자만 남는다.
      id: 'KEYPAD-NO-PREFIX',
      expectedFailingGroup: 'two-groups',
      code: `def build_keypad_codes(groups):
    codes = ['']
    for choices in groups:
        next_codes = []
        for prefix in codes:
            for letter in choices:
                next_codes.append(letter)
        codes = next_codes
    return codes
`,
    },
    {
      // 매 자리마다 frontier를 비워 결과를 잃는 오개념.
      id: 'KEYPAD-RESETS-FRONTIER',
      expectedFailingGroup: 'max-shape',
      code: `def build_keypad_codes(groups):
    codes = ['']
    for choices in groups:
        codes = []
        for prefix in codes:
            for letter in choices:
                codes.append(prefix + letter)
    return codes
`,
    },
    {
      // 선택지를 뒤에서부터 붙여 순서를 반전시키는 오개념.
      id: 'KEYPAD-REVERSES-ORDER',
      expectedFailingGroup: 'two-groups',
      code: `def build_keypad_codes(groups):
    codes = ['']
    for choices in groups:
        next_codes = []
        for prefix in codes:
            index = len(choices) - 1
            for i in range(len(choices)):
                next_codes.append(prefix + choices[index])
                index = index - 1
        codes = next_codes
    return codes
`,
    },
  ],
  hiddenTests: [
    // 자리가 하나뿐.
    { inputs: { groups: [['P', 'Q', 'R']] }, expected: ['P', 'Q', 'R'], group: 'single-group' },
    // 두 자리.
    { inputs: { groups: [['7', '8'], ['#', '*']] }, expected: ['7#', '7*', '8#', '8*'], group: 'two-groups' },
    // 세 자리.
    { inputs: { groups: [['A', 'B'], ['C'], ['1', '2']] }, expected: ['AC1', 'AC2', 'BC1', 'BC2'], group: 'three-groups' },
    // 최대 구성: 4×3×2 = 24개.
    { inputs: { groups: [['1', '2', '3', '4'], ['A', 'B', 'C'], ['X', 'Y']] }, expected: ['1AX', '1AY', '1BX', '1BY', '1CX', '1CY', '2AX', '2AY', '2BX', '2BY', '2CX', '2CY', '3AX', '3AY', '3BX', '3BY', '3CX', '3CY', '4AX', '4AY', '4BX', '4BY', '4CX', '4CY'], group: 'max-shape' },
    // 그룹 사이에 같은 글자가 반복되어도 독립적으로 조합한다.
    { inputs: { groups: [['A', 'B'], ['A']] }, expected: ['AA', 'BA'], group: 'repeated-letters' },
    // 한 글자씩 두 자리.
    { inputs: { groups: [['Z'], ['9']] }, expected: ['Z9'], group: 'single-each' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_066_1',
      title: 'frontier 확장 이해',
      prompt: '자리마다 후보를 확장하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '후보 3개에 선택지가 2개인 자리를 붙이면 후보는 몇 개가 될까요?',
          options: [
            { value: 'six', label: '6개 — 후보 하나하나에 선택지를 하나씩 붙인다' },
            { value: 'five', label: '5개 — 후보에 선택지를 더한다' },
          ],
          expected: 'six',
        },
        {
          id: 'q2',
          text: '새 자리를 확장할 때 이전 frontier를 지우고 새 목록으로 교체하는 이유는 무엇일까요?',
          options: [
            { value: 'replace_stage', label: '그 자리까지의 후보만이 다음 자리의 출발점이기 때문에' },
            { value: 'save_memory', label: '목록 길이를 줄이기 위해' },
          ],
          expected: 'replace_stage',
        },
        {
          id: 'q3',
          text: '자리가 하나뿐이면 어떻게 될까요?',
          options: [
            { value: 'one_expansion', label: '빈 문자열에 글자를 한 번 붙인 결과가 곧 최종 조합이다' },
            { value: 'no_codes', label: '조합을 만들 수 없다' },
          ],
          expected: 'one_expansion',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_066_transfer_1',
      title: '로봇 부품 옵션 조합',
      description: '로봇 부품의 옵션 그룹 목록(option_groups)에서 각 그룹의 옵션을 하나씩 고른 모든 조합 문자열을 만듭니다.',
      entryFunction: 'build_robot_configs',
      starterCode: `def build_robot_configs(option_groups):
    # 각 그룹에서 하나씩 고른 모든 조합 문자열을 반환하세요.
    pass
`,
      officialSolutionCode: `def build_robot_configs(option_groups):
    configs = ['']
    for options in option_groups:
        next_configs = []
        for prefix in configs:
            for option in options:
                next_configs.append(prefix + option)
        configs = next_configs
    return configs
`,
      contextCard: {
        title: '🤖 부품 조합 생성 전략',
        strategyGuide: '빈 후보에서 출발해 그룹마다 지금까지의 후보마다 옵션을 하나씩 붙이고, 새 후보 목록으로 교체해 다음 그룹으로 넘어갑니다.',
      },
      thoughtCheck: {
        question: "옵션 [적, 청]과 [소, 대]로 만들 수 있는 조합은 모두 몇 개일까요?",
        options: [
          { value: 'four', label: '4개 — 적소, 적대, 청소, 청대' },
          { value: 'three', label: '3개' },
        ],
        expected: 'four',
      },
      testCases: [
        { inputs: { option_groups: [['A', 'B'], ['C']] }, expected: ['AC', 'BC'] },
        { inputs: { option_groups: [['1', '2'], ['3', '4'], ['X']] }, expected: ['13X', '14X', '23X', '24X'] },
        { inputs: { option_groups: [['M']] }, expected: ['M'] },
        { inputs: { option_groups: [['P', 'Q'], ['R', 'S'], ['T', 'U']] }, expected: ['PRT', 'PRU', 'PST', 'PSU', 'QRT', 'QRU', 'QST', 'QSU'] },
      ],
    },
  ],
}
