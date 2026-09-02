/** Server-only definition: AC-STACK-QUEUE-79. */
module.exports = {
  problemId: "AC-STACK-QUEUE-79",
  problemVersion: 1,
  entryFunction: "serve_with_two_stacks",
  officialSolutionCode: `def serve_with_two_stacks(events):
    stack_in = []
    stack_out = []
    served = []
    for evt in events:
        kind = evt[0]
        val = evt[1]
        if kind == 'IN':
            stack_in.append(val)
        elif kind == 'OUT':
            if len(stack_out) == 0:
                while len(stack_in) > 0:
                    stack_out.append(stack_in.pop())
            if len(stack_out) > 0:
                served.append(stack_out.pop())
    return served
`,
  alternativeSolutions: [
    `def serve_with_two_stacks(events):
    s_in = []
    s_out = []
    res = []
    for cmd, val in events:
        if cmd == 'IN':
            s_in.append(val)
        elif cmd == 'OUT':
            if not s_out:
                while s_in:
                    s_out.append(s_in.pop())
            if s_out:
                res.append(s_out.pop())
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: "TWOSTACK-ALWAYS-POURS-BREAKS-ORDER",
      expectedFailingGroup: "interleaved_push_pop",
      code: `def serve_with_two_stacks(events):
    stack_in = []
    stack_out = []
    served = []
    for evt in events:
        if evt[0] == 'IN':
            stack_in.append(evt[1])
        elif evt[0] == 'OUT':
            while len(stack_in) > 0:
                stack_out.append(stack_in.pop())
            if len(stack_out) > 0:
                served.append(stack_out.pop())
    return served
`,
    },
    {
      id: "TWOSTACK-OUTS-DIRECTLY-FROM-IN",
      expectedFailingGroup: "interleaved_push_pop",
      code: `def serve_with_two_stacks(events):
    stack_in = []
    served = []
    for evt in events:
        if evt[0] == 'IN':
            stack_in.append(evt[1])
        elif evt[0] == 'OUT':
            if len(stack_in) > 0:
                served.append(stack_in.pop())
    return served
`,
    },
    {
      id: "TWOSTACK-CRASHES-ON-EMPTY",
      expectedFailingGroup: "empty_stack_guard",
      code: `def serve_with_two_stacks(events):
    stack_in = []
    stack_out = []
    served = []
    for evt in events:
        if evt[0] == 'IN':
            stack_in.append(evt[1])
        elif evt[0] == 'OUT':
            if len(stack_out) == 0:
                while len(stack_in) > 0:
                    stack_out.append(stack_in.pop())
            served.append(stack_out.pop())
    return served
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        events: [
          ["IN", "10"],
          ["IN", "20"],
          ["OUT", ""],
          ["IN", "30"],
          ["OUT", ""],
          ["OUT", ""],
        ],
      },
      expected: ["10", "20", "30"],
      group: "interleaved_push_pop",
    },
    {
      inputs: {
        events: [
          ["OUT", ""],
          ["OUT", ""],
          ["IN", "99"],
          ["OUT", ""],
        ],
      },
      expected: ["99"],
      group: "empty_stack_guard",
    },
    {
      inputs: {
        events: [
          ["IN", "1"],
          ["IN", "2"],
          ["IN", "3"],
          ["OUT", ""],
          ["OUT", ""],
          ["OUT", ""],
        ],
      },
      expected: ["1", "2", "3"],
      group: "pure_fifo_order",
    },
    {
      inputs: {
        events: [],
      },
      expected: [],
      group: "empty_events",
    },
    {
      inputs: {
        events: [
          ["IN", "A"],
          ["OUT", ""],
          ["IN", "B"],
          ["OUT", ""],
          ["IN", "C"],
          ["OUT", ""],
        ],
      },
      expected: ["A", "B", "C"],
      group: "alternating_one_by_one",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_stack_079_1",
      title: "2-스택 대기열 작동 이해",
      prompt: "두 스택 간 이동 타이밍과 순서 보존 원리를 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "stack_in의 항목들을 stack_out으로 옮길 때 순서는 어떻게 변할까요?",
          options: [
            {
              value: "reversed",
              label: "역순으로 뒤집힌다 — 가장 먼저 들어온 항목이 stack_out의 맨 위로 온다",
            },
            {
              value: "same",
              label: "원래 순서 그대로 유지된다",
            },
          ],
          expected: "reversed",
        },
        {
          id: "q2",
          text: "OUT 호출 시 stack_in과 stack_out이 둘 다 비어 있으면 어떻게 해야 할까요?",
          options: [
            {
              value: "ignore_empty",
              label: "꺼낼 항목이 없으므로 아무것도 꺼내지 않고 무시한다",
            },
            {
              value: "error",
              label: "오류를 내야 한다",
            },
          ],
          expected: "ignore_empty",
        },
        {
          id: "q3",
          text: "stack_out에 이미 원소가 있을 때 새 IN가 오면 어디에 넣어야 할까요?",
          options: [
            {
              value: "push_to_in",
              label: "stack_in에만 넣는다",
            },
            {
              value: "push_to_out",
              label: "stack_out의 맨 위에 넣는다",
            },
          ],
          expected: "push_to_in",
        },
        {
          id: "q_state",
          text: "출발 스택에 B가 남았을 때 C가 새로 도착하면?",
          options: [
            {
              value: "expected",
              label: "C는 도착 스택에서 기다리고 다음 처리 대상은 B다",
            },
            {
              value: "wrong",
              label: "C를 출발 스택 위에 올려 먼저 처리한다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_stack_079_transfer_1",
      title: "처리한 화물과 남은 화물",
      description: "commands는 0~24개의 정수입니다. 1~99는 화물 도착, 0은 가장 먼저 기다린 화물 하나 처리입니다. 빈 처리는 무시합니다. [처리목록, 남은 FIFO 목록]을 반환하세요.",
      entryFunction: "serve_crate_requests",
      starterCode: `def serve_crate_requests(commands):
    # commands는 0~24개의 정수입니다. 1~99는 화물 도착, 0은 가장 먼저 기다린 화물 하나 처리입니다. 빈 처리는 무시합니다. [처리목록, 남은 FIFO 목록]을 반환하세요.
    pass
`,
      contextCard: {
        title: "처리한 화물과 남은 화물",
        strategyGuide: "처리할 쪽에 남은 화물이 있으면 새 도착을 섞지 않습니다. 마지막에는 출발 쪽과 도착 쪽의 대기 순서를 연결해 보세요.",
      },
      thoughtCheck: {
        question: "[4, 8, 0, 6] 처리 후 결과는?",
        options: [
          {
            value: "expected",
            label: "[[4], [8, 6]]",
          },
          {
            value: "reversed",
            label: "[[4], [6, 8]]",
          },
        ],
        expected: "expected",
      },
      officialSolutionCode: `def serve_crate_requests(commands):
    incoming = []
    outgoing = []
    served = []
    for command in commands:
        if command > 0:
            incoming.append(command)
        else:
            if len(outgoing) == 0:
                while len(incoming) > 0:
                    outgoing.append(incoming.pop())
            if len(outgoing) > 0:
                served.append(outgoing.pop())
    return [served, outgoing[::-1] + incoming]
`,
      testCases: [
        {
          inputs: {
            commands: [2, 7, 0, 5, 0],
          },
          expected: [
            [2, 7],
            [5],
          ],
        },
        {
          inputs: {
            commands: [],
          },
          expected: [
            [],
            [],
          ],
        },
        {
          inputs: {
            commands: [9, 9, 0, 0, 0],
          },
          expected: [
            [9, 9],
            [],
          ],
        },
        {
          inputs: {
            commands: [3, 4, 5],
          },
          expected: [
            [],
            [3, 4, 5],
          ],
        },
      ],
    },
  ],
}
