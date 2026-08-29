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
  ],
  hiddenTests: [
    { inputs: { cargos: [10, 5, 20, 1] }, expected: [1, 5, 20, 10], group: 'unaligned_cargos' },
    { inputs: { cargos: [2, 5, 8] }, expected: [2, 5, 8], group: 'already_min_at_front' },
    { inputs: { cargos: [9, 8, 7, 6, 5] }, expected: [5, 8, 7, 6, 9], group: 'reverse_cargos' },
    { inputs: { cargos: [42] }, expected: [42], group: 'single_cargo' },
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
      testCases: [
        { inputs: { cargos: [3, 9, 2, 5] }, expected: [3, 5, 2, 9] },
        { inputs: { cargos: [1, 2, 3] }, expected: [1, 2, 3] },
      ],
    },
  ],
}
