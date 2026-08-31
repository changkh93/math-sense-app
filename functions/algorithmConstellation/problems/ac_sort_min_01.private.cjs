/**
 * Server-only Private Problem Definition for AC-SORT-MIN-01
 */

module.exports = {
  problemId: 'AC-SORT-MIN-01',
  problemVersion: 1,
  entryFunction: 'sort_cargo_step',
  officialSolutionCode: `def sort_cargo_step(cargos):
    if not cargos:
        return []
    min_idx = 0
    for i in range(len(cargos)):
        if cargos[i] < cargos[min_idx]:
            min_idx = i
    cargos[0], cargos[min_idx] = cargos[min_idx], cargos[0]
    return cargos
`,
  alternativeSolutions: [
    `def sort_cargo_step(cargos):
    if not cargos:
        return []
    min_idx = 0
    for i in range(len(cargos)):
        if cargos[i] < cargos[min_idx]:
            min_idx = i
    first = cargos[0]
    cargos[0] = cargos[min_idx]
    cargos[min_idx] = first
    return cargos
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'no_swap_returned',
      code: `def sort_cargo_step(cargos):
    return cargos
`,
      expectedFailingGroup: 'unaligned_cargos',
    },
    {
      // 한 단계 계약 위반: 전체 정렬을 반환하는 오개념.
      id: 'SELECTION-FULL-SORT',
      expectedFailingGroup: 'unaligned_cargos',
      code: `def sort_cargo_step(cargos):
    count = len(cargos)
    for start in range(count - 1):
        min_index = start
        for i in range(start + 1, count):
            if cargos[i] < cargos[min_index]:
                min_index = i
        cargos[start], cargos[min_index] = cargos[min_index], cargos[start]
    return cargos
`,
    },
    {
      // 맨 앞이 아니라 맨 뒤와 교환하는 오개념.
      id: 'SELECTION-SWAPS-WITH-LAST',
      expectedFailingGroup: 'minimum_in_middle',
      code: `def sort_cargo_step(cargos):
    if not cargos:
        return []
    min_index = 0
    for i in range(len(cargos)):
        if cargos[i] < cargos[min_index]:
            min_index = i
    last_index = len(cargos) - 1
    cargos[0], cargos[last_index] = cargos[last_index], cargos[0]
    return cargos
`,
    },
    {
      // 최소가 아니라 최대를 선택하는 오개념.
      id: 'SELECTION-SELECTS-MAXIMUM',
      expectedFailingGroup: 'minimum_in_middle',
      code: `def sort_cargo_step(cargos):
    if not cargos:
        return []
    max_index = 0
    for i in range(len(cargos)):
        if cargos[i] > cargos[max_index]:
            max_index = i
    cargos[0], cargos[max_index] = cargos[max_index], cargos[0]
    return cargos
`,
    },
  ],
  hiddenTests: [
    // ---- 기존 hiddenTests (추가 전용 보강: 아래 4건은 절대 삭제/변경하지 않는다) ----
    { inputs: { cargos: [10, 5, 20, 1] }, expected: [1, 5, 20, 10], group: 'unaligned_cargos' },
    { inputs: { cargos: [2, 5, 8] }, expected: [2, 5, 8], group: 'already_min_at_front' },
    { inputs: { cargos: [9, 8, 7, 6, 5] }, expected: [5, 8, 7, 6, 9], group: 'reverse_cargos' },
    { inputs: { cargos: [42] }, expected: [42], group: 'single_cargo' },
    // ---- 신규 그룹 (중간 위치의 음수 최소 / 중복 최소의 첫 위치) ----
    // 최소가 중간에 있는 "음수" 값: 음수를 건너뛰는 오답(if cargos[i] < ... and
    // cargos[i] >= 0 류)이 선언 그룹에서 기각된다. 가이드 §5.6 negative-minimum
    // 그룹과 minimum-in-middle을 한 케이스로 함께 충족해 6건 예산을 유지한다.
    { inputs: { cargos: [6, 3, -7, 1, 9] }, expected: [-7, 3, 6, 1, 9], group: 'minimum_in_middle' },
    { inputs: { cargos: [5, 2, 8, 2] }, expected: [2, 5, 8, 2], group: 'first_of_duplicate_minima' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sort_056_1',
      prompt: '최소값을 맨 앞과 1회 교환하는 1단계 선택 정렬 결과를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'cargos = [8, 5, 9, 1]일 때 sort_cargo_step(cargos)의 결과는 무엇일까요?',
          options: [
            { value: '[1, 5, 9, 8]', label: '[1, 5, 9, 8]' },
            { value: '[1, 5, 8, 9]', label: '[1, 5, 8, 9]' },
            { value: '[8, 5, 9, 1]', label: '[8, 5, 9, 1]' },
          ],
          expected: '[1, 5, 9, 8]',
        },
        {
          id: 'q2',
          text: '훓는 동안 더 작은 값을 찾을 때마다 자리를 바꾸면 안 되는 이유는 무엇일까요?',
          options: [
            { value: 'one_swap_contract', label: '한 단계에서 교환은 정확히 한 번이어야 한 단계 계약을 지키게 되어서' },
            { value: 'swap_count_free', label: '교환 횟수는 결과에 아무 영향이 없어서' },
          ],
          expected: 'one_swap_contract',
        },
        {
          id: 'q3',
          text: '맨 앞 교환 뒤에 나머지 부분이 정렬되지 않아도 되는 이유는 무엇일까요?',
          options: [
            { value: 'one_step_task', label: '이 문제는 전체 정렬이 아니라 딱 한 단계만 수행하는 것이기 때문에' },
            { value: 'already_sorted', label: '나머지 부분은 이미 정렬되어 있기 때문에' },
          ],
          expected: 'one_step_task',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sort_056_transfer_1',
      title: '가장 무거운 화물을 맨 뒤로',
      description: '가장 큰 화물의 인덱스를 찾아 마지막 인덱스와 교환한 리스트를 반환하세요.',
      entryFunction: 'move_max_to_end',
      starterCode: 'def move_max_to_end(cargos):\n    pass\n',
      officialSolutionCode: `def move_max_to_end(cargos):
    if not cargos:
        return []
    max_idx = 0
    for i in range(len(cargos)):
        if cargos[i] > cargos[max_idx]:
            max_idx = i
    last = len(cargos) - 1
    cargos[last], cargos[max_idx] = cargos[max_idx], cargos[last]
    return cargos
`,
      contextCard: {
        title: '🏗️ 최댓값 이동 전략',
        strategyGuide: '가장 무거운 화물의 위치를 기억하며 목록을 훑은 뒤, 그 위치와 맨 뒤 자리를 딱 한 번 교환합니다.',
      },
      thoughtCheck: {
        question: 'cargos = [4, 4, 2]일 때 move_max_to_end(cargos)의 결과는 무엇일까요?',
        options: [
          { value: '[2, 4, 4]', label: '[2, 4, 4] — 처음 나온 최댓값 위치와 맨 뒤가 교환된다' },
          { value: '[4, 4, 2]', label: '[4, 4, 2] — 이미 최댓값이 있어 그대로다' },
        ],
        expected: '[2, 4, 4]',
      },
      // ---- 기존 2건 (추가 전용 보강) ----
      testCases: [
        { inputs: { cargos: [3, 9, 2, 5] }, expected: [3, 5, 2, 9] },
        { inputs: { cargos: [1, 2, 3] }, expected: [1, 2, 3] },
        // ---- 신규 2건: 중복 최댓값 첫 위치 / 음수 값 ----
        { inputs: { cargos: [4, 4, 2] }, expected: [2, 4, 4] },
        { inputs: { cargos: [-1, -5] }, expected: [-5, -1] },
      ],
    },
  ],
}
