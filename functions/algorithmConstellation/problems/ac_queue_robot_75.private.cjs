/** Server-only definition: AC-QUEUE-ROBOT-75. */
module.exports = {
  problemId: "AC-QUEUE-ROBOT-75",
  problemVersion: 1,
  entryFunction: "admit_robots",
  officialSolutionCode: `from collections import deque

def admit_robots(events):
    queue = deque([])
    admitted = []
    for evt in events:
        kind = evt[0]
        val = evt[1]
        if kind == 'IN':
            queue.append(val)
        elif kind == 'OUT':
            if len(queue) > 0:
                admitted.append(queue.popleft())
    return admitted
`,
  alternativeSolutions: [
    `from collections import deque

def admit_robots(events):
    q = deque()
    res = []
    for action, item in events:
        if action == 'IN':
            q.append(item)
        elif action == 'OUT' and q:
            res.append(q.popleft())
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: "QUEUE-USES-LIFO-POP",
      expectedFailingGroup: "fifo_admission_order",
      code: `from collections import deque

def admit_robots(events):
    queue = deque([])
    admitted = []
    for evt in events:
        if evt[0] == 'IN':
            queue.append(evt[1])
        elif evt[0] == 'OUT':
            if len(queue) > 0:
                admitted.append(queue.pop())
    return admitted
`,
    },
    {
      id: "QUEUE-CRASHES-ON-EMPTY-OUT",
      expectedFailingGroup: "empty_queue_out",
      code: `from collections import deque

def admit_robots(events):
    queue = deque([])
    admitted = []
    for evt in events:
        if evt[0] == 'IN':
            queue.append(evt[1])
        elif evt[0] == 'OUT':
            admitted.append(queue.popleft())
    return admitted
`,
    },
    {
      id: "QUEUE-INCLUDES-REMAINING",
      expectedFailingGroup: "remaining_unadmitted",
      code: `from collections import deque

def admit_robots(events):
    queue = deque([])
    admitted = []
    for evt in events:
        if evt[0] == 'IN':
            queue.append(evt[1])
        elif evt[0] == 'OUT':
            if len(queue) > 0:
                admitted.append(queue.popleft())
    while len(queue) > 0:
        admitted.append(queue.popleft())
    return admitted
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        events: [
          ["IN", "R1"],
          ["IN", "R2"],
          ["IN", "R3"],
          ["OUT", ""],
          ["OUT", ""],
        ],
      },
      expected: ["R1", "R2"],
      group: "fifo_admission_order",
    },
    {
      inputs: {
        events: [
          ["OUT", ""],
          ["OUT", ""],
          ["IN", "Solo"],
          ["OUT", ""],
        ],
      },
      expected: ["Solo"],
      group: "empty_queue_out",
    },
    {
      inputs: {
        events: [
          ["IN", "A"],
          ["IN", "B"],
          ["OUT", ""],
          ["IN", "C"],
        ],
      },
      expected: ["A"],
      group: "remaining_unadmitted",
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
          ["IN", "X"],
          ["OUT", ""],
          ["IN", "Y"],
          ["OUT", ""],
        ],
      },
      expected: ["X", "Y"],
      group: "interleaved_events",
    },
    {
      inputs: {
        events: [
          ["IN", "Bot1"],
          ["IN", "Bot2"],
          ["IN", "Bot3"],
        ],
      },
      expected: [],
      group: "no_out_events",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_queue_075_1",
      title: "대기열 사건 처리 로직 이해",
      prompt: "IN과 OUT 사건이 섞여 들어올 때의 상태 변화를 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "사건 [IN R1, OUT, IN R2, OUT]을 처리하면 입장 목록은 무엇일까요?",
          options: [
            {
              value: "r1_r2",
              label: "['R1', 'R2'] — 도착하자마자 바로 입장",
            },
            {
              value: "r2_r1",
              label: "['R2', 'R1']",
            },
          ],
          expected: "r1_r2",
        },
        {
          id: "q2",
          text: "OUT 사건 시 대기열의 어느 쪽에서 로봇을 꺼내야 할까요?",
          options: [
            {
              value: "front_popleft",
              label: "맨 앞 (popleft) — 먼저 도착한 로봇부터",
            },
            {
              value: "rear_pop",
              label: "맨 뒤 (pop) — 가장 최근에 온 로봇부터",
            },
          ],
          expected: "front_popleft",
        },
        {
          id: "q3",
          text: "모든 사건이 끝난 뒤 대기열에 아직 남아 있는 로봇은 결과에 포함될까요?",
          options: [
            {
              value: "not_included",
              label: "포함되지 않는다 — 아직 입장(OUT)하지 못했으므로",
            },
            {
              value: "included",
              label: "자동으로 포함된다",
            },
          ],
          expected: "not_included",
        },
        {
          id: "q_state",
          text: "먼저 기다린 로봇 한 명을 입장시키면?",
          options: [
            {
              value: "expected",
              label: "앞 로봇만 나가고 뒤 로봇은 계속 기다린다",
            },
            {
              value: "wrong",
              label: "뒤 로봇이 먼저 입장한다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_queue_075_transfer_1",
      title: "발송 후 남은 물자까지 확인하기",
      description: "events는 ['ADD', 비어 있지 않은 이름]과 ['SEND', '']의 목록(0~24개)입니다. 빈 발송은 무시하고 [발송목록, 남은대기목록]을 반환하세요.",
      entryFunction: "dispatch_supply_requests",
      starterCode: `from collections import deque

def dispatch_supply_requests(events):
    # events는 ['ADD', 비어 있지 않은 이름]과 ['SEND', '']의 목록(0~24개)입니다. 빈 발송은 무시하고 [발송목록, 남은대기목록]을 반환하세요.
    pass
`,
      contextCard: {
        title: "발송 후 남은 물자까지 확인하기",
        strategyGuide: "먼저 기다린 물자를 보내고, 발송된 물자와 아직 기다리는 물자를 서로 다른 목록으로 구분해 보세요.",
      },
      thoughtCheck: {
        question: "A, B가 도착하고 하나를 보낸 뒤 C가 도착했다면 남은 줄은?",
        options: [
          {
            value: "bc",
            label: "[B, C]",
          },
          {
            value: "cb",
            label: "[C, B]",
          },
        ],
        expected: "bc",
      },
      officialSolutionCode: `from collections import deque

def dispatch_supply_requests(events):
    queue = deque()
    sent = []
    for event in events:
        if event[0] == 'ADD':
            queue.append(event[1])
        elif len(queue) > 0:
            sent.append(queue.popleft())
    return [sent, list(queue)]
`,
      testCases: [
        {
          inputs: {
            events: [
              ["ADD", "A"],
              ["ADD", "B"],
              ["SEND", ""],
              ["ADD", "C"],
            ],
          },
          expected: [
            ["A"],
            ["B", "C"],
          ],
        },
        {
          inputs: {
            events: [],
          },
          expected: [
            [],
            [],
          ],
        },
        {
          inputs: {
            events: [
              ["SEND", ""],
              ["SEND", ""],
            ],
          },
          expected: [
            [],
            [],
          ],
        },
        {
          inputs: {
            events: [
              ["ADD", "X"],
              ["ADD", "X"],
              ["SEND", ""],
              ["SEND", ""],
            ],
          },
          expected: [
            ["X", "X"],
            [],
          ],
        },
      ],
    },
  ],
}
