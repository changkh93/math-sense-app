/** Server-only definition: AC-STACK-BOX-71. */
module.exports = {
  problemId: "AC-STACK-BOX-71",
  problemVersion: 1,
  entryFunction: "unpack_suits",
  officialSolutionCode: `def unpack_suits(boxes):
    stack = []
    for box in boxes:
        stack.append(box)
    unpacked = []
    while len(stack) > 0:
        item = stack.pop()
        unpacked.append(item)
    return unpacked
`,
  alternativeSolutions: [
    `def unpack_suits(boxes):
    unpacked = []
    stack = list(boxes)
    while stack:
        unpacked.append(stack.pop())
    return unpacked
`,
    `def unpack_suits(boxes):
    return boxes[::-1]
`,
  ],
  intendedWrongFixtures: [
    {
      id: "LIFO-USES-FRONT",
      expectedFailingGroup: "fifo_order_check",
      code: `def unpack_suits(boxes):
    unpacked = []
    for b in boxes:
        unpacked.append(b)
    return unpacked
`,
    },
    {
      id: "LIFO-SKIPS-LAST-ITEM",
      expectedFailingGroup: "single_element",
      code: `def unpack_suits(boxes):
    stack = list(boxes)
    unpacked = []
    while len(stack) > 1:
        unpacked.append(stack.pop())
    return unpacked
`,
    },
    {
      id: "LIFO-DEDUPLICATES",
      expectedFailingGroup: "repeated_labels",
      code: `def unpack_suits(boxes):
    seen = set()
    unpacked = []
    for b in boxes[::-1]:
        if b not in seen:
            seen.add(b)
            unpacked.append(b)
    return unpacked
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        boxes: ["S1", "S2", "S3", "S4"],
      },
      expected: ["S4", "S3", "S2", "S1"],
      group: "fifo_order_check",
    },
    {
      inputs: {
        boxes: ["Single"],
      },
      expected: ["Single"],
      group: "single_element",
    },
    {
      inputs: {
        boxes: ["A", "B", "A"],
      },
      expected: ["A", "B", "A"],
      group: "repeated_labels",
    },
    {
      inputs: {
        boxes: [],
      },
      expected: [],
      group: "empty_queue",
    },
    {
      inputs: {
        boxes: ["RED", "BLUE"],
      },
      expected: ["BLUE", "RED"],
      group: "two_items",
    },
    {
      inputs: {
        boxes: ["H1", "H2", "H3", "H4", "H5"],
      },
      expected: ["H5", "H4", "H3", "H2", "H1"],
      group: "asymmetric_many",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_stack_071_1",
      title: "스택 꺼내기 동작 이해",
      prompt: "보관함(스택)에서 상자를 넣고 꺼낼 때의 상태를 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "상자 [A, B]에서 하나를 꺼낸 뒤 C를 넣으면 다음으로 꺼내지는 상자는 무엇일까요?",
          options: [
            {
              value: "C",
              label: "C — 새로 들어와 맨 위에 놓인 상자",
            },
            {
              value: "A",
              label: "A — 바닥에 남아 있던 상자",
            },
          ],
          expected: "C",
        },
        {
          id: "q2",
          text: "맨 뒤에서 꺼내기 메서드가 수행하는 두 가지 동작은 무엇일까요?",
          options: [
            {
              value: "pop_returns_and_removes",
              label: "맨 뒤 원소를 반환하고 원래 목록에서 제거한다",
            },
            {
              value: "pop_only_reads",
              label: "목록을 그대로 두고 값만 읽어온다",
            },
          ],
          expected: "pop_returns_and_removes",
        },
        {
          id: "q3",
          text: "같은 라벨의 상자 [A, A]가 들어오면 어떻게 처리되어야 할까요?",
          options: [
            {
              value: "keep_duplicates",
              label: "각각 다른 상자이므로 중복을 보존하여 [A, A]로 꺼낸다",
            },
            {
              value: "deduplicate",
              label: "중복을 제거하여 하나만 꺼낸다",
            },
          ],
          expected: "keep_duplicates",
        },
        {
          id: "q_state",
          text: "[A, B]에서 하나를 꺼내면?",
          options: [
            {
              value: "expected",
              label: "B가 나가고 [A]가 남는다",
            },
            {
              value: "wrong",
              label: "A가 나가고 [B]가 남는다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_stack_071_transfer_1",
      title: "에너지 셀 하역 순서",
      description: "쌓인 에너지 셀의 수치 목록(cells)을 역순으로 하역하여 반환합니다.",
      entryFunction: "unload_energy_cells",
      starterCode: `def unload_energy_cells(cells):
    # 에너지 셀을 쌓인 역순으로 하역하여 반환하세요.
    pass
`,
      officialSolutionCode: `def unload_energy_cells(cells):
    stack = []
    for c in cells:
        stack.append(c)
    unloaded = []
    while len(stack) > 0:
        unloaded.append(stack.pop())
    return unloaded
`,
      contextCard: {
        title: "🔋 셀 하역 전략",
        strategyGuide: "가장 나중에 쌓은 셀이 먼저 나옵니다. 꺼낸 셀을 기록하고 아직 남은 셀의 순서도 확인해 보세요.",
      },
      thoughtCheck: {
        question: "셀 [10, 20, 30]을 하역하면 첫 번째로 나오는 셀의 수치는 무엇일까요?",
        options: [
          {
            value: "30",
            label: "30 (가장 마지막에 쌓은 셀)",
          },
          {
            value: "10",
            label: "10 (가장 처음에 넣은 셀)",
          },
        ],
        expected: "30",
      },
      testCases: [
        {
          inputs: {
            cells: [1, 2, 3, 4],
          },
          expected: [4, 3, 2, 1],
        },
        {
          inputs: {
            cells: [99],
          },
          expected: [99],
        },
        {
          inputs: {
            cells: [],
          },
          expected: [],
        },
        {
          inputs: {
            cells: [50, 20, 50],
          },
          expected: [50, 20, 50],
        },
      ],
    },
  ],
}
