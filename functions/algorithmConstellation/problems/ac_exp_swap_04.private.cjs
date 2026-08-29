/**
 * Private Problem Definition: AC-EXP-SWAP-04 (바뀌어 버린 두 화물)
 */

module.exports = {
  problemId: 'AC-EXP-SWAP-04',
  problemVersion: 1,
  entryFunction: 'swap_cargo_boxes',
  officialSolutionCode: `def swap_cargo_boxes(box_a, box_b):
    temp = box_a
    box_a = box_b
    box_b = temp
    return [box_a, box_b]
`,
  alternativeSolutions: [
    `def swap_cargo_boxes(box_a, box_b):
    box_a, box_b = box_b, box_a
    return [box_a, box_b]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'SWAP-OVERWRITE-WITHOUT-PRESERVE',
      misconceptionCode: 'STATE-OVERWRITE-BEFORE-PRESERVE',
      expectedMisconception: 'STATE-OVERWRITE-BEFORE-PRESERVE',
      expectedFailingGroup: 'distinct_values',
      code: `def swap_cargo_boxes(box_a, box_b):
    box_a = box_b
    box_b = box_a
    return [box_a, box_b]
`,
    },
    {
      id: 'SWAP-PRESERVE-WRONG-SIDE',
      misconceptionCode: 'BACKUP-WRONG-VARIABLE',
      expectedMisconception: 'BACKUP-WRONG-VARIABLE',
      expectedFailingGroup: 'distinct_values',
      code: `def swap_cargo_boxes(box_a, box_b):
    temp = box_b
    box_a = box_b
    box_b = temp
    return [box_a, box_b]
`,
    },
    {
      id: 'SWAP-RETURN-ORIGINAL-ORDER',
      misconceptionCode: 'NO-SWAP-OPERATION',
      expectedMisconception: 'NO-SWAP-OPERATION',
      expectedFailingGroup: 'distinct_values',
      code: `def swap_cargo_boxes(box_a, box_b):
    return [box_a, box_b]
`,
    },
  ],
  hiddenTests: [
    { inputs: { box_a: 100, box_b: 500 }, expected: [500, 100], group: 'distinct_values' },
    { inputs: { box_a: 42, box_b: 42 }, expected: [42, 42], group: 'equal_values' },
    { inputs: { box_a: -10, box_b: 30 }, expected: [30, -10], group: 'negative_values' },
    { inputs: { box_a: 0, box_b: 77 }, expected: [77, 0], group: 'zero_value' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_swap_04_1',
      type: 'single-choice',
      prompt: '임시 변수를 활용한 교환 단계를 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'temp = box_a를 실행하는 가장 중요한 이유는 무엇인가요?',
          options: [
            { value: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해', label: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해' },
            { value: '두 변수의 값을 더하기 위해', label: '두 변수의 값을 더하기 위해' },
            { value: '메모리를 절약하기 위해', label: '메모리를 절약하기 위해' },
          ],
          expected: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_swap_04_t1',
      title: '우주선 도킹 위치 교환',
      description: '도킹 구역 dock_1과 dock_2의 우주선 식별 번호를 서로 맞바꾼 리스트 [dock_1, dock_2]를 반환하세요.',
      entryFunction: 'exchange_docking_ships',
      starterCode: `def exchange_docking_ships(dock_1, dock_2):
    # 두 도킹 위치의 우주선 번호를 서로 바꾸세요.
    pass
`,
      officialSolutionCode: `def exchange_docking_ships(dock_1, dock_2):
    temp = dock_1
    dock_1 = dock_2
    dock_2 = temp
    return [dock_1, dock_2]
`,
      testCases: [
        { inputs: { dock_1: 101, dock_2: 202 }, expected: [202, 101] },
        { inputs: { dock_1: 7, dock_2: 3 }, expected: [3, 7] },
      ],
    },
  ],
}
