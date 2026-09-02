/** Server-only definition: AC-STACK-PAREN-72. */
module.exports = {
  problemId: "AC-STACK-PAREN-72",
  problemVersion: 1,
  entryFunction: "is_signal_balanced",
  officialSolutionCode: `def is_signal_balanced(message):
    stack = []
    for ch in message:
        if ch == '(':
            stack.append(ch)
        elif ch == ')':
            if len(stack) == 0:
                return False
            stack.pop()
    return len(stack) == 0
`,
  alternativeSolutions: [
    `def is_signal_balanced(message):
    balance = 0
    for char in message:
        if char == '(':
            balance = balance + 1
        else:
            balance = balance - 1
        if balance < 0:
            return False
    return balance == 0
`,
  ],
  intendedWrongFixtures: [
    {
      id: "PAREN-COUNTS-ONLY",
      expectedFailingGroup: "order_matters",
      code: `def is_signal_balanced(message):
    opens = 0
    closes = 0
    for ch in message:
        if ch == '(':
            opens += 1
        elif ch == ')':
            closes += 1
    return opens == closes
`,
    },
    {
      id: "PAREN-IGNORES-REMAINING",
      expectedFailingGroup: "unclosed_opens",
      code: `def is_signal_balanced(message):
    stack = []
    for ch in message:
        if ch == '(':
            stack.append(ch)
        elif ch == ')':
            if len(stack) == 0:
                return False
            stack.pop()
    return True
`,
    },
    {
      id: "PAREN-RETURNS-FALSE-ON-EMPTY",
      expectedFailingGroup: "empty_string",
      code: `def is_signal_balanced(message):
    if len(message) == 0:
        return False
    return is_signal_balanced(message)
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        message: "((()))",
      },
      expected: true,
      group: "nested_balanced",
    },
    {
      inputs: {
        message: ")(",
      },
      expected: false,
      group: "order_matters",
    },
    {
      inputs: {
        message: "(()",
      },
      expected: false,
      group: "unclosed_opens",
    },
    {
      inputs: {
        message: "())",
      },
      expected: false,
      group: "extra_closes",
    },
    {
      inputs: {
        message: "",
      },
      expected: true,
      group: "empty_string",
    },
    {
      inputs: {
        message: "()(())((()))",
      },
      expected: true,
      group: "complex_balanced",
    },
    {
      inputs: {
        message: "(()(()))(",
      },
      expected: false,
      group: "unclosed_opens",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_stack_072_1",
      title: "괄호 균형 조건 이해",
      prompt: "괄호 검증에서 발생할 수 있는 실패 상황을 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "신호 \"(()\"가 올바르지 않은 이유는 무엇일까요?",
          options: [
            {
              value: "unclosed_open",
              label: "모든 문자를 확인한 뒤에도 짝을 찾지 못한 열림이 보관함에 남아 있어서",
            },
            {
              value: "too_short",
              label: "신호가 너무 짧아서",
            },
          ],
          expected: "unclosed_open",
        },
        {
          id: "q2",
          text: "단순히 \"(\"의 개수와 \")\"의 개수만 같으면 올바른 괄호라고 할 수 있을까요?",
          options: [
            {
              value: "counts_not_enough",
              label: "아니다 — \")(\"처럼 순서가 맞지 않으면 개수가 같아도 올바르지 않다",
            },
            {
              value: "counts_enough",
              label: "맞다 — 개수만 같으면 항상 짝이 맞는다",
            },
          ],
          expected: "counts_not_enough",
        },
        {
          id: "q3",
          text: "빈 문자열 \"\"이 입력되면 판정 결과는 무엇이어야 할까요?",
          options: [
            {
              value: "empty_is_true",
              label: "True — 짝 없는 괄호가 전혀 없으므로",
            },
            {
              value: "empty_is_false",
              label: "False — 괄호가 하나도 없으므로",
            },
          ],
          expected: "empty_is_true",
        },
        {
          id: "q_state",
          text: "열림 두 개 뒤에 닫힘 하나를 만나면?",
          options: [
            {
              value: "expected",
              label: "짝 없는 열림 하나가 남는다",
            },
            {
              value: "wrong",
              label: "열림 두 개가 모두 사라진다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_stack_072_transfer_1",
      title: "비콘 프레임 유효성 검사",
      description: "대괄호 프레임 문자열(frame)이 올바르게 짝을 이루는지 판정합니다.",
      entryFunction: "is_beacon_frame_valid",
      starterCode: `def is_beacon_frame_valid(frame):
    # 대괄호 프레임이 올바르게 균형을 이루는지 판정하세요.
    pass
`,
      officialSolutionCode: `def is_beacon_frame_valid(frame):
    stack = []
    for ch in frame:
        if ch == '[':
            stack.append(ch)
        elif ch == ']':
            if len(stack) == 0:
                return False
            stack.pop()
    return len(stack) == 0
`,
      contextCard: {
        title: "🛰️ 비콘 프레임 검증 전략",
        strategyGuide: "아직 짝 없는 열림을 보관합니다. 닫힘이 먼저 나오거나 끝에 열림이 남는 경우를 따로 확인하세요.",
      },
      thoughtCheck: {
        question: "프레임 \"[[]]\"은 유효한 프레임일까요?",
        options: [
          {
            value: "valid",
            label: "유효하다 (중첩된 괄호가 모두 올바르게 짝지어짐)",
          },
          {
            value: "invalid",
            label: "유효하지 않다",
          },
        ],
        expected: "valid",
      },
      testCases: [
        {
          inputs: {
            frame: "[[][]]",
          },
          expected: true,
        },
        {
          inputs: {
            frame: "][]",
          },
          expected: false,
        },
        {
          inputs: {
            frame: "[[[",
          },
          expected: false,
        },
        {
          inputs: {
            frame: "",
          },
          expected: true,
        },
      ],
    },
  ],
}
