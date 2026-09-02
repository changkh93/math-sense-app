/** Server-only definition: AC-DEQUE-DOCK-78. */
module.exports = {
  problemId: "AC-DEQUE-DOCK-78",
  problemVersion: 1,
  entryFunction: "operate_space_dock",
  officialSolutionCode: `from collections import deque

def operate_space_dock(events):
    dock = deque([])
    departed = []
    for evt in events:
        kind = evt[0]
        val = evt[1]
        if kind == 'FRONT_IN':
            dock.appendleft(val)
        elif kind == 'BACK_IN':
            dock.append(val)
        elif kind == 'FRONT_OUT':
            if len(dock) > 0:
                departed.append(dock.popleft())
        elif kind == 'BACK_OUT':
            if len(dock) > 0:
                departed.append(dock.pop())
    return [departed, list(dock)]
`,
  alternativeSolutions: [
    `from collections import deque

def operate_space_dock(events):
    d = deque()
    res = []
    for cmd, arg in events:
        if cmd == 'FRONT_IN':
            d.appendleft(arg)
        elif cmd == 'BACK_IN':
            d.append(arg)
        elif cmd == 'FRONT_OUT' and d:
            res.append(d.popleft())
        elif cmd == 'BACK_OUT' and d:
            res.append(d.pop())
    return [res, list(d)]
`,
  ],
  intendedWrongFixtures: [
    {
      id: "DOCK-CONFUSES-POP-FRONT-BACK",
      expectedFailingGroup: "front_back_confusion",
      code: `from collections import deque

def operate_space_dock(events):
    dock = deque([])
    departed = []
    for evt in events:
        if evt[0] == 'FRONT_IN':
            dock.appendleft(evt[1])
        elif evt[0] == 'BACK_IN':
            dock.append(evt[1])
        elif evt[0] == 'FRONT_OUT':
            if len(dock) > 0:
                departed.append(dock.pop())
        elif evt[0] == 'BACK_OUT':
            if len(dock) > 0:
                departed.append(dock.popleft())
    return [departed, list(dock)]
`,
    },
    {
      id: "DOCK-PUSH-FRONT-USES-APPEND",
      expectedFailingGroup: "mixed_four_ops",
      code: `from collections import deque

def operate_space_dock(events):
    dock = deque([])
    departed = []
    for evt in events:
        if evt[0] == 'FRONT_IN' or evt[0] == 'BACK_IN':
            dock.append(evt[1])
        elif evt[0] == 'FRONT_OUT':
            if len(dock) > 0:
                departed.append(dock.popleft())
        elif evt[0] == 'BACK_OUT':
            if len(dock) > 0:
                departed.append(dock.pop())
    return [departed, list(dock)]
`,
    },
    {
      id: "DOCK-CRASHES-ON-EMPTY",
      expectedFailingGroup: "empty_dock_guards",
      code: `from collections import deque

def operate_space_dock(events):
    dock = deque([])
    departed = []
    for evt in events:
        if evt[0] == 'FRONT_IN':
            dock.appendleft(evt[1])
        elif evt[0] == 'BACK_IN':
            dock.append(evt[1])
        elif evt[0] == 'FRONT_OUT':
            departed.append(dock.popleft())
        elif evt[0] == 'BACK_OUT':
            departed.append(dock.pop())
    return [departed, list(dock)]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        events: [
          ["FRONT_IN", "1"],
          ["BACK_IN", "2"],
          ["FRONT_IN", "0"],
          ["BACK_OUT", ""],
          ["FRONT_OUT", ""],
        ],
      },
      expected: [
        ["2", "0"],
        ["1"],
      ],
      group: "mixed_four_ops",
    },
    {
      inputs: {
        events: [
          ["FRONT_OUT", ""],
          ["BACK_OUT", ""],
          ["BACK_IN", "Solo"],
          ["FRONT_OUT", ""],
        ],
      },
      expected: [
        ["Solo"],
        [],
      ],
      group: "empty_dock_guards",
    },
    {
      inputs: {
        events: [
          ["FRONT_IN", "A"],
          ["FRONT_IN", "B"],
          ["BACK_OUT", ""],
        ],
      },
      expected: [
        ["A"],
        ["B"],
      ],
      group: "front_back_confusion",
    },
    {
      inputs: {
        events: [],
      },
      expected: [
        [],
        [],
      ],
      group: "empty_events",
    },
    {
      inputs: {
        events: [
          ["BACK_IN", "X"],
          ["FRONT_IN", "Y"],
          ["BACK_IN", "Z"],
          ["FRONT_OUT", ""],
          ["BACK_OUT", ""],
          ["FRONT_OUT", ""],
        ],
      },
      expected: [
        ["Y", "Z", "X"],
        [],
      ],
      group: "complete_drain",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_deque_078_1",
      title: "양방향 출입 동작 이해",
      prompt: "deque의 4가지 메서드와 위치 관계를 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "도크의 맨 앞(왼쪽)에 새 항목을 넣는 메서드는 무엇일까요?",
          options: [
            {
              value: "appendleft",
              label: "맨 앞에 추가하기 — 맨 앞(왼쪽)에 추가",
            },
            {
              value: "append",
              label: "맨 뒤에 추가하기 — 맨 뒤(오른쪽)에 추가",
            },
          ],
          expected: "appendleft",
        },
        {
          id: "q2",
          text: "도크의 맨 뒤(오른쪽)에서 항목을 꺼내는 메서드는 무엇일까요?",
          options: [
            {
              value: "pop",
              label: "맨 뒤에서 꺼내기 — 맨 뒤 항목을 꺼내고 반환",
            },
            {
              value: "popleft",
              label: "맨 앞에서 꺼내기 — 맨 앞 항목을 꺼내고 반환",
            },
          ],
          expected: "pop",
        },
        {
          id: "q3",
          text: "[FRONT_IN 1, FRONT_IN 2, FRONT_OUT] 실행 시 꺼내지는 값은 무엇일까요?",
          options: [
            {
              value: "two",
              label: "2 — 가장 마지막에 앞으로 들어간 값",
            },
            {
              value: "one",
              label: "1",
            },
          ],
          expected: "two",
        },
        {
          id: "q_state",
          text: "앞에 새 화물이 추가되면 기존 화물은?",
          options: [
            {
              value: "expected",
              label: "기존 순서를 유지하며 새 화물 뒤에서 기다린다",
            },
            {
              value: "wrong",
              label: "기존 화물들이 사라진다",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_deque_078_transfer_1",
      title: "숫자 도크의 퇴장과 잔여 상태",
      description: "events는 [명령, 정수] 목록(0~24개)입니다. FRONT_IN/BACK_IN은 앞/뒤 추가, FRONT_OUT/BACK_OUT은 앞/뒤 퇴장입니다. OUT의 값은 0이지만 IN의 0은 실제 화물입니다. 빈 퇴장은 무시하고 [퇴장목록, 남은목록]을 반환하세요.",
      entryFunction: "operate_numeric_dock",
      starterCode: `from collections import deque

def operate_numeric_dock(events):
    # events는 [명령, 정수] 목록(0~24개)입니다. FRONT_IN/BACK_IN은 앞/뒤 추가, FRONT_OUT/BACK_OUT은 앞/뒤 퇴장입니다. OUT의 값은 0이지만 IN의 0은 실제 화물입니다. 빈 퇴장은 무시하고 [퇴장목록, 남은목록]을 반환하세요.
    pass
`,
      contextCard: {
        title: "숫자 도크의 퇴장과 잔여 상태",
        strategyGuide: "값이 0인지가 아니라 명령이 무엇인지 먼저 구분하세요. 추가/제거와 앞/뒤를 각각 확인하고 끝에 남은 화물 순서도 보존합니다.",
      },
      thoughtCheck: {
        question: "뒤에 0을 넣고 앞에 2를 넣은 뒤 뒤에서 하나 꺼내면?",
        options: [
          {
            value: "zero",
            label: "0이 나가고 [2]가 남는다",
          },
          {
            value: "two",
            label: "2가 나가고 [0]이 남는다",
          },
        ],
        expected: "zero",
      },
      officialSolutionCode: `from collections import deque

def operate_numeric_dock(events):
    dock = deque([])
    departed = []
    for evt in events:
        kind = evt[0]
        val = evt[1]
        if kind == 'FRONT_IN':
            dock.appendleft(val)
        elif kind == 'BACK_IN':
            dock.append(val)
        elif kind == 'FRONT_OUT':
            if len(dock) > 0:
                departed.append(dock.popleft())
        elif kind == 'BACK_OUT':
            if len(dock) > 0:
                departed.append(dock.pop())
    return [departed, list(dock)]
`,
      testCases: [
        {
          inputs: {
            events: [
              ["BACK_IN", 10],
              ["FRONT_IN", 20],
              ["BACK_IN", 30],
              ["BACK_OUT", 0],
              ["FRONT_OUT", 0],
            ],
          },
          expected: [
            [30, 20],
            [10],
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
              ["BACK_IN", 0],
              ["BACK_IN", 0],
              ["FRONT_OUT", 0],
            ],
          },
          expected: [
            [0],
            [0],
          ],
        },
        {
          inputs: {
            events: [
              ["FRONT_IN", 7],
              ["BACK_IN", 9],
              ["FRONT_IN", 5],
            ],
          },
          expected: [
            [],
            [5, 7, 9],
          ],
        },
      ],
    },
  ],
}
