/** Server-only definition: AC-QUEUE-CARD-77. */
module.exports = {
  problemId: "AC-QUEUE-CARD-77",
  problemVersion: 1,
  entryFunction: "last_space_card",
  officialSolutionCode: `from collections import deque

def last_space_card(n):
    if n <= 0:
        return None
    queue = deque(range(1, n + 1))
    while len(queue) > 1:
        queue.popleft()
        moved = queue.popleft()
        queue.append(moved)
    return queue[0]
`,
  alternativeSolutions: [
    `from collections import deque

def last_space_card(n):
    q = deque(list(range(1, n + 1)))
    while len(q) > 1:
        q.popleft()
        q.append(q.popleft())
    return q[0]
`,
  ],
  intendedWrongFixtures: [
    {
      id: "CARD-DISCARDS-WITHOUT-ROTATING",
      expectedFailingGroup: "even_n",
      code: `from collections import deque

def last_space_card(n):
    queue = deque(range(1, n + 1))
    while len(queue) > 1:
        queue.popleft()
    return queue[0]
`,
    },
    {
      id: "CARD-ROTATES-WITHOUT-DISCARDING",
      expectedFailingGroup: "even_n",
      code: `from collections import deque

def last_space_card(n):
    queue = deque(range(1, n + 1))
    for _ in range(n):
        queue.append(queue.popleft())
    return queue[0]
`,
    },
    {
      id: "CARD-CRASHES-ON-N1",
      expectedFailingGroup: "single_card",
      code: `from collections import deque

def last_space_card(n):
    queue = deque(range(1, n + 1))
    queue.popleft()
    moved = queue.popleft()
    queue.append(moved)
    return queue[0]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        n: 6,
      },
      expected: 4,
      group: "even_n",
    },
    {
      inputs: {
        n: 7,
      },
      expected: 6,
      group: "odd_n",
    },
    {
      inputs: {
        n: 2,
      },
      expected: 2,
      group: "small_even",
    },
    {
      inputs: {
        n: 3,
      },
      expected: 2,
      group: "small_odd",
    },
    {
      inputs: {
        n: 10,
      },
      expected: 4,
      group: "medium_n",
    },
    {
      inputs: {
        n: 1,
      },
      expected: 1,
      group: "single_card",
    },
    {
      inputs: {
        n: 20,
      },
      expected: 8,
      group: "maximum_n",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_queue_077_1",
      title: "카드 순환 규칙 이해",
      prompt: "카드 장수에 따른 시뮬레이션 과정을 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "카드 6장(n=6)일 때 가장 첫 번째로 버려지는 카드는 무엇일까요?",
          options: [
            {
              value: "card_1",
              label: "1 — 맨 앞에 위치한 카드",
            },
            {
              value: "card_6",
              label: "6 — 맨 뒤에 위치한 카드",
            },
          ],
          expected: "card_1",
        },
        {
          id: "q2",
          text: "카드가 딱 1장 남았을 때도 맨 앞에서 꺼내기를 계속 실행해야 할까요?",
          options: [
            {
              value: "stop_at_one",
              label: "아니다 — 1장이 남는 순간 반복을 멈추고 그 카드를 반환해야 한다",
            },
            {
              value: "continue_empty",
              label: "맞다 — 0장이 될 때까지 버려야 한다",
            },
          ],
          expected: "stop_at_one",
        },
        {
          id: "q3",
          text: "n=3일 때 마지막으로 남는 카드는 무엇일까요?",
          options: [
            {
              value: "card_2",
              label: "2 — (1 버림 -> 2 뒤로 -> 3 버림 -> 2 남음)",
            },
            {
              value: "card_3",
              label: "3",
            },
          ],
          expected: "card_2",
        },
        {
          id: "q_state",
          text: "[1, 2, 3, 4]에서 1을 버리고 새 앞 카드를 뒤로 보내면?",
          options: [
            {
              value: "expected",
              label: "[3, 4, 2]",
            },
            {
              value: "wrong",
              label: "[2, 3, 4]",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_queue_077_transfer_1",
      title: "카드가 떠난 전체 순서 기록하기",
      description: "cards는 서로 다른 양수 카드 목록(1~12개)입니다. 앞 카드를 버리고 다음 카드를 뒤로 옮깁니다. 버린 카드들을 순서대로 기록한 뒤 마지막 생존 카드까지 붙인 전체 목록을 반환하세요.",
      entryFunction: "card_elimination_order",
      starterCode: `from collections import deque

def card_elimination_order(cards):
    # cards는 서로 다른 양수 카드 목록(1~12개)입니다. 앞 카드를 버리고 다음 카드를 뒤로 옮깁니다. 버린 카드들을 순서대로 기록한 뒤 마지막 생존 카드까지 붙인 전체 목록을 반환하세요.
    pass
`,
      contextCard: {
        title: "카드가 떠난 전체 순서 기록하기",
        strategyGuide: "버린 카드와 뒤로 보낸 카드는 다릅니다. 언제 기록하고 언제 기다리게 할지 나누고, 마지막 카드도 결과에 포함해 보세요.",
      },
      thoughtCheck: {
        question: "[10, 20, 30, 40]에서 처음 버린 두 카드는?",
        options: [
          {
            value: "ten_thirty",
            label: "10, 30",
          },
          {
            value: "ten_twenty",
            label: "10, 20",
          },
        ],
        expected: "ten_thirty",
      },
      officialSolutionCode: `from collections import deque

def card_elimination_order(cards):
    queue = deque(cards)
    removed = []
    while len(queue) > 1:
        removed.append(queue.popleft())
        moved = queue.popleft()
        queue.append(moved)
    removed.append(queue.popleft())
    return removed
`,
      testCases: [
        {
          inputs: {
            cards: [1, 2, 3, 4, 5, 6],
          },
          expected: [1, 3, 5, 2, 6, 4],
        },
        {
          inputs: {
            cards: [5, 9, 2],
          },
          expected: [5, 2, 9],
        },
        {
          inputs: {
            cards: [42],
          },
          expected: [42],
        },
        {
          inputs: {
            cards: [8, 3],
          },
          expected: [8, 3],
        },
      ],
    },
  ],
}
