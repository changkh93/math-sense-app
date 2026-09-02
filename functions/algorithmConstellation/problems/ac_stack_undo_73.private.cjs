/** Server-only definition: AC-STACK-UNDO-73. */
module.exports = {
  problemId: "AC-STACK-UNDO-73",
  problemVersion: 1,
  entryFunction: "restore_task_history",
  officialSolutionCode: `def restore_task_history(commands):
    history = []
    for cmd in commands:
        if cmd == 0:
            if len(history) > 0:
                history.pop()
        else:
            history.append(cmd)
    return history
`,
  alternativeSolutions: [
    `def restore_task_history(commands):
    res = []
    for c in commands:
        if c != 0:
            res.append(c)
        elif res:
            res.pop()
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: "UNDO-KEEPS-ZERO",
      expectedFailingGroup: "consecutive_undos",
      code: `def restore_task_history(commands):
    history = []
    for cmd in commands:
        if cmd == 0:
            history.append(0)
        else:
            history.append(cmd)
    return history
`,
    },
    {
      id: "UNDO-REMOVES-FIRST-INSTEAD-OF-LAST",
      expectedFailingGroup: "undo_order",
      code: `def restore_task_history(commands):
    history = []
    for cmd in commands:
        if cmd == 0:
            if len(history) > 0:
                history.pop(0) if hasattr(history, 'popleft') else history.pop()
        else:
            history.append(cmd)
    return history
`,
    },
    {
      id: "UNDO-CRASHES-ON-EMPTY-POP",
      expectedFailingGroup: "empty_guard",
      code: `def restore_task_history(commands):
    history = []
    for cmd in commands:
        if cmd == 0:
            history.pop()
        else:
            history.append(cmd)
    return history
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        commands: [1, 2, 0, 0],
      },
      expected: [],
      group: "consecutive_undos",
    },
    {
      inputs: {
        commands: [0, 0, 5],
      },
      expected: [5],
      group: "empty_guard",
    },
    {
      inputs: {
        commands: [10, 20, 30, 0, 40],
      },
      expected: [10, 20, 40],
      group: "undo_order",
    },
    {
      inputs: {
        commands: [7],
      },
      expected: [7],
      group: "single_item",
    },
    {
      inputs: {
        commands: [],
      },
      expected: [],
      group: "empty_commands",
    },
    {
      inputs: {
        commands: [1, 0, 2, 0, 3],
      },
      expected: [3],
      group: "alternating_undos",
    },
    {
      inputs: {
        commands: [5, 5, 0],
      },
      expected: [5],
      group: "repeated_values",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_stack_073_1",
      title: "실행 취소 로직 이해",
      prompt: "취소 명령의 연속 실행 및 빈 상태 동작을 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "명령 [1, 2, 0, 0]을 실행한 후 남는 작업은 무엇일까요?",
          options: [
            {
              value: "empty",
              label: "빈 목록 [] — 2가 취소되고 그 다음 1도 취소되므로",
            },
            {
              value: "only_one",
              label: "[1] — 0이 하나만 작동하므로",
            },
          ],
          expected: "empty",
        },
        {
          id: "q2",
          text: "기록함이 이미 비어 있을 때 0이 들어오면 어떻게 처리해야 할까요?",
          options: [
            {
              value: "ignore_empty_undo",
              label: "지울 작업이 없으므로 조용히 무시한다",
            },
            {
              value: "crash",
              label: "오류를 발생시킨다",
            },
          ],
          expected: "ignore_empty_undo",
        },
        {
          id: "q3",
          text: "0이라는 숫자 자체가 최종 결과에 들어가야 할까요?",
          options: [
            {
              value: "never_recorded",
              label: "아니다 — 0은 취소 명령일 뿐 데이터로 기록되지 않는다",
            },
            {
              value: "recorded",
              label: "맞다 — 0도 하나의 작업이다",
            },
          ],
          expected: "never_recorded",
        },
        {
          id: "q_state",
          text: "최근 기록을 하나 취소하면?",
          options: [
            {
              value: "expected",
              label: "가장 최근에 남은 기록 하나만 사라진다",
            },
            {
              value: "wrong",
              label: "가장 오래된 기록이 사라진다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_stack_073_transfer_1",
      title: "유효 충전량 합산",
      description: "충전 명령(commands)에서 취소(0)를 반영한 뒤 남은 유효 충전량의 합을 반환합니다.",
      entryFunction: "sum_active_charges",
      starterCode: `def sum_active_charges(commands):
    # 취소를 반영한 뒤 남은 충전량들의 총합을 반환하세요.
    pass
`,
      officialSolutionCode: `def sum_active_charges(commands):
    charges = []
    for cmd in commands:
        if cmd == 0:
            if len(charges) > 0:
                charges.pop()
        else:
            charges.append(cmd)
    total = 0
    for c in charges:
        total += c
    return total
`,
      contextCard: {
        title: "⚡ 유효 충전량 누적 전략",
        strategyGuide: "취소할 때 현재 남아 있는 최신 기록 하나만 없앱니다. 마지막에 남은 충전량들을 합쳐 보세요.",
      },
      thoughtCheck: {
        question: "명령 [10, 20, 0, 5]를 실행했을 때 유효 충전량의 합은 얼마일까요?",
        options: [
          {
            value: "15",
            label: "15 (10 + 5)",
          },
          {
            value: "35",
            label: "35 (10 + 20 + 5)",
          },
        ],
        expected: "15",
      },
      testCases: [
        {
          inputs: {
            commands: [100, 200, 0, 50],
          },
          expected: 150,
        },
        {
          inputs: {
            commands: [0, 0],
          },
          expected: 0,
        },
        {
          inputs: {
            commands: [1, 2, 3, 0],
          },
          expected: 3,
        },
        {
          inputs: {
            commands: [10, 0, 20, 0],
          },
          expected: 0,
        },
      ],
    },
  ],
}
