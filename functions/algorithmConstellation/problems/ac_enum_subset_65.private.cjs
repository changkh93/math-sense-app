/**
 * AC-ENUM-SUBSET-65 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-SUBSET-65',
  problemVersion: 1,
  entryFunction: 'build_equipment_subsets',
  // 재귀·비트 연산 없이: 선택 상태를 2^n으로 늘리고 몫·나머지로 포함 여부를 읽는다.
  // 측정: 4항목 991 step / 5항목 2,356 step / 6항목 5,481 step (§4.6 예산 근거).
  officialSolutionCode: `def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit):
        selected = []
        remaining = mask
        for item in items:
            if remaining % 2 == 1:
                selected.append(item)
            remaining = remaining // 2
        subsets.append(selected)
    return subsets
`,
  intendedWrongFixtures: [
    {
      // 빈 부분집합(상태 0)을 누락하는 오개념.
      id: 'SUBSET-SKIPS-EMPTY',
      expectedFailingGroup: 'three-items',
      code: `def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit):
        selected = []
        remaining = mask
        for item in items:
            if remaining % 2 == 1:
                selected.append(item)
            remaining = remaining // 2
        if mask > 0:
            subsets.append(selected)
    return subsets
`,
    },
    {
      // 전체 집합(마지막 상태)을 누락하는 오개념.
      id: 'SUBSET-SKIPS-FULL',
      expectedFailingGroup: 'six-items',
      code: `def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit - 1):
        selected = []
        remaining = mask
        for item in items:
            if remaining % 2 == 1:
                selected.append(item)
            remaining = remaining // 2
        subsets.append(selected)
    return subsets
`,
    },
    {
      // 선택 상태 자리를 갱신하지 않아 항상 첫 항목만 판정하는 오개념.
      id: 'SUBSET-NO-BIT-UPDATE',
      expectedFailingGroup: 'three-items',
      code: `def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit):
        selected = []
        for item in items:
            if mask % 2 == 1:
                selected.append(item)
        subsets.append(selected)
    return subsets
`,
    },
    {
      // 항목을 뒤에서부터 읽어 원소 순서를 반전시키는 오개념.
      id: 'SUBSET-REVERSES-ORDER',
      expectedFailingGroup: 'three-items',
      code: `def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit):
        selected = []
        remaining = mask
        index = len(items) - 1
        for i in range(len(items)):
            if remaining % 2 == 1:
                selected.append(items[index])
            remaining = remaining // 2
            index = index - 1
        subsets.append(selected)
    return subsets
`,
    },
  ],
  hiddenTests: [
    // 한 항목: 빈 묶음 + 단일 묶음.
    { inputs: { items: ['A'] }, expected: [[], ['A']], group: 'single-item' },
    // 세 항목: 8개, mask 순서 검증 (빈 집합·자릿수 갱신·순서 오답을 가른다).
    { inputs: { items: ['X', 'Y', 'Z'] }, expected: [[], ['X'], ['Y'], ['X', 'Y'], ['Z'], ['X', 'Z'], ['Y', 'Z'], ['X', 'Y', 'Z']], group: 'three-items' },
    // 네 항목: 16개.
    { inputs: { items: ['P', 'Q', 'R', 'S'] }, expected: [[], ['P'], ['Q'], ['P', 'Q'], ['R'], ['P', 'R'], ['Q', 'R'], ['P', 'Q', 'R'], ['S'], ['P', 'S'], ['Q', 'S'], ['P', 'Q', 'S'], ['R', 'S'], ['P', 'R', 'S'], ['Q', 'R', 'S'], ['P', 'Q', 'R', 'S']], group: 'four-items' },
    // 다섯 항목: 32개.
    { inputs: { items: ['A', 'B', 'C', 'D', 'E'] }, expected: [[], ['A'], ['B'], ['A', 'B'], ['C'], ['A', 'C'], ['B', 'C'], ['A', 'B', 'C'], ['D'], ['A', 'D'], ['B', 'D'], ['A', 'B', 'D'], ['C', 'D'], ['A', 'C', 'D'], ['B', 'C', 'D'], ['A', 'B', 'C', 'D'], ['E'], ['A', 'E'], ['B', 'E'], ['A', 'B', 'E'], ['C', 'E'], ['A', 'C', 'E'], ['B', 'C', 'E'], ['A', 'B', 'C', 'E'], ['D', 'E'], ['A', 'D', 'E'], ['B', 'D', 'E'], ['A', 'B', 'D', 'E'], ['C', 'D', 'E'], ['A', 'C', 'D', 'E'], ['B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E']], group: 'five-items' },
    // 여섯 항목: 64개 — §4.6 규칙상 최대 1건만 허용되는 최대 크기 테스트.
    { inputs: { items: ['A', 'B', 'C', 'D', 'E', 'F'] }, expected: [[], ['A'], ['B'], ['A', 'B'], ['C'], ['A', 'C'], ['B', 'C'], ['A', 'B', 'C'], ['D'], ['A', 'D'], ['B', 'D'], ['A', 'B', 'D'], ['C', 'D'], ['A', 'C', 'D'], ['B', 'C', 'D'], ['A', 'B', 'C', 'D'], ['E'], ['A', 'E'], ['B', 'E'], ['A', 'B', 'E'], ['C', 'E'], ['A', 'C', 'E'], ['B', 'C', 'E'], ['A', 'B', 'C', 'E'], ['D', 'E'], ['A', 'D', 'E'], ['B', 'D', 'E'], ['A', 'B', 'D', 'E'], ['C', 'D', 'E'], ['A', 'C', 'D', 'E'], ['B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E'], ['F'], ['A', 'F'], ['B', 'F'], ['A', 'B', 'F'], ['C', 'F'], ['A', 'C', 'F'], ['B', 'C', 'F'], ['A', 'B', 'C', 'F'], ['D', 'F'], ['A', 'D', 'F'], ['B', 'D', 'F'], ['A', 'B', 'D', 'F'], ['C', 'D', 'F'], ['A', 'C', 'D', 'F'], ['B', 'C', 'D', 'F'], ['A', 'B', 'C', 'D', 'F'], ['E', 'F'], ['A', 'E', 'F'], ['B', 'E', 'F'], ['A', 'B', 'E', 'F'], ['C', 'E', 'F'], ['A', 'C', 'E', 'F'], ['B', 'C', 'E', 'F'], ['A', 'B', 'C', 'E', 'F'], ['D', 'E', 'F'], ['A', 'D', 'E', 'F'], ['B', 'D', 'E', 'F'], ['A', 'B', 'D', 'E', 'F'], ['C', 'D', 'E', 'F'], ['A', 'C', 'D', 'E', 'F'], ['B', 'C', 'D', 'E', 'F'], ['A', 'B', 'C', 'D', 'E', 'F']], group: 'six-items' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_065_1',
      title: '부분집합 생성 이해',
      prompt: '선택 상태로 부분집합을 만드는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '아무것도 담지 않은 빈 부분집합도 결과에 포함되는 이유는 무엇일까요?',
          options: [
            { value: 'empty_is_subset', label: '아무것도 선택하지 않은 것도 하나의 선택 상태이기 때문에' },
            { value: 'empty_is_error', label: '빈 조합은 실수이기 때문에' },
          ],
          expected: 'empty_is_subset',
        },
        {
          id: 'q2',
          text: '장비가 세 개면 부분집합은 몇 개일까요?',
          options: [
            { value: 'eight', label: '8개 — 항목마다 넣거나 뺄지 두 가지씩 늘어난다' },
            { value: 'six', label: '6개 — 항목 수에 두 개를 더한다' },
          ],
          expected: 'eight',
        },
        {
          id: 'q3',
          text: '선택 상태 2가 [B]를 만들었다면, 상태 3은 어떤 부분집합일까요?',
          options: [
            { value: 'both_items', label: '[A, B] — 상태가 하나 커지면 포함 자리가 바뀐다' },
            { value: 'same_as_two', label: '여전히 [B]다' },
          ],
          expected: 'both_items',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_065_transfer_1',
      title: '가능한 모든 탐사 도구 묶음',
      description: '탐사 도구 목록(tools)으로 만들 수 있는 모든 도구 묶음을 선택 상태 순서대로 반환합니다.',
      entryFunction: 'build_tool_bundles',
      starterCode: `def build_tool_bundles(tools):
    # 모든 도구 묶음을 순서대로 반환하세요.
    pass
`,
      officialSolutionCode: `def build_tool_bundles(tools):
    limit = 1
    for tool in tools:
        limit = limit * 2
    bundles = []
    for mask in range(limit):
        bundle = []
        remaining = mask
        for tool in tools:
            if remaining % 2 == 1:
                bundle.append(tool)
            remaining = remaining // 2
        bundles.append(bundle)
    return bundles
`,
      contextCard: {
        title: '🧰 도구 묶음 생성 전략',
        strategyGuide: '도구마다 넣거나 뺄지의 선택 상태를 하나씩 늘려 가며, 상태가 가리키는 도구만 모아 묶음으로 기록합니다.',
      },
      thoughtCheck: {
        question: '도구가 하나뿐일 때 묶음은 모두 몇 개일까요?',
        options: [
          { value: 'two', label: '2개 — 빈 묶음과 도구 하나만 담은 묶음' },
          { value: 'one', label: '1개 — 빈 묶음은 세지 않는다' },
        ],
        expected: 'two',
      },
      testCases: [
        { inputs: { tools: ['P', 'Q'] }, expected: [[], ['P'], ['Q'], ['P', 'Q']] },
        { inputs: { tools: ['M', 'N', 'O'] }, expected: [[], ['M'], ['N'], ['M', 'N'], ['O'], ['M', 'O'], ['N', 'O'], ['M', 'N', 'O']] },
        { inputs: { tools: [] }, expected: [[]] },
        { inputs: { tools: ['K', 'L', 'M', 'N'] }, expected: [[], ['K'], ['L'], ['K', 'L'], ['M'], ['K', 'M'], ['L', 'M'], ['K', 'L', 'M'], ['N'], ['K', 'N'], ['L', 'N'], ['K', 'L', 'N'], ['M', 'N'], ['K', 'M', 'N'], ['L', 'M', 'N'], ['K', 'L', 'M', 'N']] },
      ],
    },
  ],
}
