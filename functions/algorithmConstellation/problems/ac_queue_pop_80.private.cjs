/** Server-only definition: AC-QUEUE-POP-80. */
module.exports = {
  problemId: "AC-QUEUE-POP-80",
  problemVersion: 1,
  entryFunction: "repair_dispatch_order",
  officialSolutionCode: `from collections import deque

def repair_dispatch_order(signals, limit):
    queue = deque(signals)
    dispatched = []
    while len(queue) > 0 and len(dispatched) < limit:
        sig = queue.popleft()
        dispatched.append(sig)
    return dispatched
`,
  alternativeSolutions: [
    `def repair_dispatch_order(signals, limit):
    res = []
    for s in signals:
        if len(res) < limit:
            res.append(s)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: "POP80-UNREPAIRED-STARTER-LIFO",
      expectedFailingGroup: "fifo_order_check",
      code: `from collections import deque

def repair_dispatch_order(signals, limit):
    queue = deque(signals)
    dispatched = []
    while len(queue) > 0 and len(dispatched) < limit:
        sig = queue.pop()
        dispatched.append(sig)
    return dispatched
`,
    },
    {
      id: "POP80-IGNORES-LIMIT",
      expectedFailingGroup: "zero_limit",
      code: `from collections import deque

def repair_dispatch_order(signals, limit):
    queue = deque(signals)
    dispatched = []
    while len(queue) > 0:
        sig = queue.popleft()
        dispatched.append(sig)
    return dispatched
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        signals: ["S1", "S2", "S3", "S4"],
        limit: 3,
      },
      expected: ["S1", "S2", "S3"],
      group: "fifo_order_check",
    },
    {
      inputs: {
        signals: ["A", "B"],
        limit: 5,
      },
      expected: ["A", "B"],
      group: "limit_larger_than_length",
    },
    {
      inputs: {
        signals: ["A", "B"],
        limit: 0,
      },
      expected: [],
      group: "zero_limit",
    },
    {
      inputs: {
        signals: [],
        limit: 3,
      },
      expected: [],
      group: "empty_signals",
    },
    {
      inputs: {
        signals: ["X", "Y", "Z"],
        limit: 1,
      },
      expected: ["X"],
      group: "single_limit",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_queue_080_1",
      title: "pop vs popleft 판별 이해",
      prompt: "자료구조 메서드 선택의 목적을 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "도착한 순서대로 가장 오래 기다린 항목부터 꺼내려면 어떤 메서드를 써야 할까요?",
          options: [
            {
              value: "use_popleft",
              label: "맨 앞에서 꺼내기 — 맨 앞(Front)에서 꺼내기",
            },
            {
              value: "use_pop",
              label: "맨 뒤에서 꺼내기 — 맨 뒤(Rear)에서 꺼내기",
            },
          ],
          expected: "use_popleft",
        },
        {
          id: "q2",
          text: "반대로 가장 최근에 기록된 최신 이력부터 꺼내야 한다면 어떤 메서드가 적합할까요?",
          options: [
            {
              value: "use_pop_for_recent",
              label: "맨 뒤에서 꺼내기 — 맨 뒤(최신)에서 꺼내기",
            },
            {
              value: "use_popleft_for_recent",
              label: "맨 앞에서 꺼내기",
            },
          ],
          expected: "use_pop_for_recent",
        },
        {
          id: "q3",
          text: "limit이 신호 개수보다 크면 결과 리스트의 길이는 어떻게 될까요?",
          options: [
            {
              value: "length_equals_signals",
              label: "원래 신호 전체의 개수와 같다 — 대기열이 먼저 비므로",
            },
            {
              value: "length_equals_limit",
              label: "limit과 같다",
            },
          ],
          expected: "length_equals_signals",
        },
        {
          id: "q_state",
          text: "대기열 [S1, S2, S3]의 첫 발송에서 맞는 결과는?",
          options: [
            {
              value: "expected",
              label: "S1이 나가고 [S2, S3]가 남는다",
            },
            {
              value: "wrong",
              label: "S3이 나가고 [S1, S2]가 남는다",
            },
          ],
          expected: "expected",
        },
        {
          id: "q_counterexample",
          text: "양쪽에서 꺼내는 차이를 첫 출력에서 확인할 수 있는 작은 입력은?",
          options: [
            {
              value: "different",
              label: "서로 다른 신호 [A, B]",
            },
            {
              value: "same",
              label: "같은 신호 [A, A]",
            },
          ],
          expected: "different",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_queue_080_transfer_1",
      title: "최신 기록 우선 수리 (LIFO 요구)",
      description: "history는 오래된 순서의 문자열 기록 목록(0~16개), limit는 0~16입니다. 가장 최근 기록부터 최대 limit개를 반환하도록 아래 코드를 수리하세요. 기록이 먼저 소진되면 멈춥니다.",
      entryFunction: "repair_recent_history",
      starterCode: `from collections import deque

def repair_recent_history(history, limit):
    queue = deque(history)
    restored = []
    while len(queue) > 0 and len(restored) < limit:
        restored.append(queue.popleft())
    return restored
`,
      officialSolutionCode: `from collections import deque

def repair_recent_history(history, limit):
    queue = deque(history)
    dispatched = []
    while len(queue) > 0 and len(dispatched) < limit:
        sig = queue.pop()
        dispatched.append(sig)
    return dispatched
`,
      contextCard: {
        title: "⏪ 최신 이력 우선 추출 전략",
        strategyGuide: "이번에는 오래 기다린 기록이 아니라 가장 최근 기록부터 필요합니다. 어느 끝에서 꺼내야 하는지 상황의 요구와 비교해 보세요.",
      },
      thoughtCheck: {
        question: "이력 [H1, H2, H3]에서 가장 최신 2개를 꺼낼 때 첫 번째로 나오는 이력은 무엇일까요?",
        options: [
          {
            value: "h3",
            label: "H3 (가장 최근 이력)",
          },
          {
            value: "h1",
            label: "H1",
          },
        ],
        expected: "h3",
      },
      testCases: [
        {
          inputs: {
            history: ["H1", "H2", "H3", "H4"],
            limit: 3,
          },
          expected: ["H4", "H3", "H2"],
        },
        {
          inputs: {
            history: ["X", "Y"],
            limit: 0,
          },
          expected: [],
        },
        {
          inputs: {
            history: ["Alpha"],
            limit: 5,
          },
          expected: ["Alpha"],
        },
        {
          inputs: {
            history: [],
            limit: 3,
          },
          expected: [],
        },
      ],
    },
  ],
}
