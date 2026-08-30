/**
 * Private Problem Definition: AC-SEQ-ROTATE-38 (화물 한 칸씩 밀기)
 */

module.exports = {
  problemId: 'AC-SEQ-ROTATE-38',
  problemVersion: 1,
  entryFunction: 'rotate_cargo_right',
  officialSolutionCode: `def rotate_cargo_right(cargos):
    rotated = [cargos[-1]]
    for cargo in cargos[:-1]:
        rotated.append(cargo)
    return rotated
`,
  alternativeSolutions: [
    `def rotate_cargo_right(cargos):
    res = [cargos[-1]]
    for i in range(len(cargos) - 1):
        res.append(cargos[i])
    return res
`,
    `def rotate_cargo_right(cargos):
    res = []
    res.append(cargos[-1])
    for x in cargos[:-1]:
        res.append(x)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ROTATE-REVERSES-ALL',
      misconceptionCode: 'SEQ-ROTATE-VS-REVERSE',
      expectedMisconception: 'SEQ-ROTATE-VS-REVERSE',
      expectedFailingGroup: 'longer_sequence',
      code: `def rotate_cargo_right(cargos):
    return cargos[::-1]
`,
    },
    {
      id: 'ROTATE-WRONG-DIRECTION',
      misconceptionCode: 'SEQ-ROTATE-WRONG-DIRECTION',
      expectedMisconception: 'SEQ-ROTATE-WRONG-DIRECTION',
      expectedFailingGroup: 'longer_sequence',
      code: `def rotate_cargo_right(cargos):
    rotated = []
    for cargo in cargos[1:]:
        rotated.append(cargo)
    rotated.append(cargos[0])
    return rotated
`,
    },
    {
      id: 'ROTATE-LOSES-BOUNDARY',
      misconceptionCode: 'SEQ-ROTATE-DROP-LAST',
      expectedMisconception: 'SEQ-ROTATE-DROP-LAST',
      expectedFailingGroup: 'two_elements',
      code: `def rotate_cargo_right(cargos):
    return cargos[:-1]
`,
    },
  ],
  hiddenTests: [
    { inputs: { cargos: [10, 20] }, expected: [20, 10], group: 'two_elements' },
    { inputs: { cargos: [-5, -10, 15] }, expected: [15, -5, -10], group: 'negative_values' },
    { inputs: { cargos: [3, 3, 3] }, expected: [3, 3, 3], group: 'duplicates' },
    { inputs: { cargos: [0, 5, 0] }, expected: [0, 0, 5], group: 'contains_zero' },
    { inputs: { cargos: [10, 20, 30, 40, 50] }, expected: [50, 10, 20, 30, 40], group: 'longer_sequence' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_seq_rotate_38_1',
      title: '★★ 회전과 단순 역순의 차이',
      type: 'trace_understanding',
      prompt: 'cargos = [1, 2, 3, 4]를 오른쪽으로 1칸 회전하는 과정을 확인하세요.',
      codeSnippet: `def rotate_cargo_right(cargos):
    rotated = [cargos[-1]]
    for cargo in cargos[:-1]:
        rotated.append(cargo)
    return rotated`,
      questions: [
        {
          id: 'q1',
          text: '회전 후 결과 리스트의 길이는 원래 리스트의 길이와 비교하여 어떨까요?',
          options: [
            { value: 'same_length', label: '원소가 유실되지 않고 위치만 바뀌므로 항상 같다' },
            { value: 'smaller', label: '하나 줄어든다' },
            { value: 'larger', label: '하나 늘어난다' },
          ],
          expected: 'same_length',
        },
        {
          id: 'q2',
          text: '[1, 2, 3, 4]를 회전했을 때 [4, 3, 2, 1]이 아니라 [4, 1, 2, 3]이 되는 이유는 무엇일까요?',
          options: [
            { value: 'relative_order_kept', label: '마지막 원소 4만 맨 앞으로 가고 나머지 [1, 2, 3]의 상대적 순서는 그대로 유지되기 때문' },
            { value: 'random_sort', label: '무작위로 섞이기 때문' },
          ],
          expected: 'relative_order_kept',
        },
        {
          id: 'q3',
          text: '원소가 1개인 cargos = [7]을 회전하면 어떤 결과가 나올까요?',
          options: [
            { value: 'single_seven', label: '[7] (1개인 리스트는 회전해도 변하지 않는다)' },
            { value: 'empty_res', label: '[]' },
          ],
          expected: 'single_seven',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_seq_rotate_38_t1',
      title: '신호 왼쪽 한 칸 회전',
      description: '신호 리스트 signals(길이 1 이상)가 주어질 때, 맨 앞의 신호를 맨 뒤로 보내 왼쪽으로 한 칸 회전한 새 리스트를 반환하세요.',
      contextCard: {
        title: '📋 왼쪽 회전 변환 흐름',
        steps: [
          { label: '관찰', text: '맨 앞의 첫 번째 신호를 경계 신호로 분리합니다.' },
          { label: '구분', text: '첫 신호를 제외한 나머지 신호들의 순서를 그대로 유지합니다.' },
          { label: '상태 갱신', text: '나머지 신호들 뒤에 첫 신호를 덧붙여 왼쪽 회전 리스트를 완성합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '오른쪽 회전에서 왼쪽 회전으로 바뀔 때 경계 항목의 위치는 어떻게 될까요?',
        options: [
          { id: 'opt_first_to_last', label: '첫 번째 항목을 분리하여 나머지 항목들 뒤에 보낸다', isCorrect: true },
          { id: 'opt_last_to_first', label: '마지막 항목을 앞으로 보낸다', isCorrect: false },
        ],
        feedback: '맞아요! 왼쪽으로 밀어낼 때는 맨 앞의 원소가 맨 뒤로 이동합니다.',
      },
      entryFunction: 'rotate_signal_left',
      starterCode: `def rotate_signal_left(signals):
    # signals 리스트를 왼쪽으로 한 칸 회전한 새 리스트를 반환하세요.
    pass
`,
      officialSolutionCode: `def rotate_signal_left(signals):
    rotated = []
    for signal in signals[1:]:
        rotated.append(signal)
    rotated.append(signals[0])
    return rotated
`,
      testCases: [
        { inputs: { signals: [1, 2, 3, 4, 5] }, expected: [2, 3, 4, 5, 1] },
        { inputs: { signals: [-10, 20] }, expected: [20, -10] },
        { inputs: { signals: [9, 9, 9] }, expected: [9, 9, 9] },
        { inputs: { signals: [0] }, expected: [0] },
      ],
    },
  ],
}
