/** Server-only definition: AC-QUEUE-ROBIN-76. */
module.exports = {
  problemId: "AC-QUEUE-ROBIN-76",
  problemVersion: 1,
  entryFunction: "schedule_transmissions",
  officialSolutionCode: `from collections import deque

def schedule_transmissions(stations, turns):
    if len(stations) == 0 or turns <= 0:
        return []
    queue = deque(stations)
    schedule = []
    for _ in range(turns):
        cur = queue.popleft()
        schedule.append(cur)
        queue.append(cur)
    return schedule
`,
  alternativeSolutions: [
    `from collections import deque

def schedule_transmissions(stations, turns):
    if not stations or turns <= 0:
        return []
    q = deque(stations)
    res = []
    while len(res) < turns:
        st = q.popleft()
        res.append(st)
        q.append(st)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: "ROBIN-DOES-NOT-REINSERT",
      expectedFailingGroup: "rotation_wrap",
      code: `from collections import deque

def schedule_transmissions(stations, turns):
    queue = deque(stations)
    schedule = []
    for _ in range(turns):
        if len(queue) > 0:
            schedule.append(queue.popleft())
    return schedule
`,
    },
    {
      id: "ROBIN-REINSERTS-AT-FRONT",
      expectedFailingGroup: "rotation_wrap",
      code: `from collections import deque

def schedule_transmissions(stations, turns):
    if not stations or turns <= 0:
        return []
    queue = deque(stations)
    schedule = []
    for _ in range(turns):
        cur = queue.popleft()
        schedule.append(cur)
        queue.appendleft(cur)
    return schedule
`,
    },
    {
      id: "ROBIN-REVERSES-STATIONS",
      expectedFailingGroup: "rotation_wrap",
      code: `from collections import deque

def schedule_transmissions(stations, turns):
    if not stations or turns <= 0:
        return []
    queue = deque(stations[::-1])
    schedule = []
    for _ in range(turns):
        cur = queue.popleft()
        schedule.append(cur)
        queue.append(cur)
    return schedule
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        stations: ["A", "B", "C"],
        turns: 5,
      },
      expected: ["A", "B", "C", "A", "B"],
      group: "rotation_wrap",
    },
    {
      inputs: {
        stations: ["X"],
        turns: 4,
      },
      expected: ["X", "X", "X", "X"],
      group: "single_station",
    },
    {
      inputs: {
        stations: [],
        turns: 3,
      },
      expected: [],
      group: "empty_stations",
    },
    {
      inputs: {
        stations: ["P", "Q"],
        turns: 0,
      },
      expected: [],
      group: "zero_turns",
    },
    {
      inputs: {
        stations: ["S1", "S2", "S3", "S4"],
        turns: 6,
      },
      expected: ["S1", "S2", "S3", "S4", "S1", "S2"],
      group: "multi_wrap",
    },
  ],
  understandingChallenges: [
    {
      challengeId: "uc_queue_076_1",
      title: "라운드 로빈 회전 원리 이해",
      prompt: "순환 대기열의 상태와 종료 조건을 점검하세요.",
      questions: [
        {
          id: "q1",
          text: "기지 3개가 5턴 동안 통신할 때 마지막(5번째)으로 통신하는 기지는 어디일까요?",
          options: [
            {
              value: "second",
              label: "두 번째 기지 — 1, 2, 3, 1, 2 순서이므로",
            },
            {
              value: "third",
              label: "세 번째 기지",
            },
          ],
          expected: "second",
        },
        {
          id: "q2",
          text: "기지 목록이 비어 있거나 turns가 0이면 결과는 무엇일까요?",
          options: [
            {
              value: "empty_schedule",
              label: "빈 목록 []",
            },
            {
              value: "none",
              label: "None",
            },
          ],
          expected: "empty_schedule",
        },
        {
          id: "q3",
          text: "라운드 로빈에서 꺼낸 기지를 다시 대기열에 넣는 위치는 어디일까요?",
          options: [
            {
              value: "rear_append",
              label: "맨 뒤 (append) — 다른 대기 기지들에게 먼저 차례를 주기 위해",
            },
            {
              value: "front_appendleft",
              label: "맨 앞 (appendleft) — 바로 다시 통신하기 위해",
            },
          ],
          expected: "rear_append",
        },
        {
          id: "q_state",
          text: "A가 한 차례 통신한 뒤 줄은?",
          options: [
            {
              value: "expected",
              label: "[B, C, A]",
            },
            {
              value: "wrong",
              label: "[A, B, C]",
            },
          ],
          expected: "expected",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: "tc_queue_076_transfer_1",
      title: "전송이 끝난 기지부터 기록하기",
      description: "packet_counts는 기지 번호 순서의 남은 패킷 수(목록 길이 0~6, 각 0~3)입니다. 0인 기지는 참여하지 않습니다. 앞 기지는 패킷 하나를 보내고 남으면 뒤로 이동합니다. 전송을 끝낸 기지 번호를 완료 순서대로 반환하세요.",
      entryFunction: "finish_packet_batches",
      starterCode: `from collections import deque

def finish_packet_batches(packet_counts):
    # packet_counts는 기지 번호 순서의 남은 패킷 수(목록 길이 0~6, 각 0~3)입니다. 0인 기지는 참여하지 않습니다. 앞 기지는 패킷 하나를 보내고 남으면 뒤로 이동합니다. 전송을 끝낸 기지 번호를 완료 순서대로 반환하세요.
    pass
`,
      contextCard: {
        title: "전송이 끝난 기지부터 기록하기",
        strategyGuide: "대기열에는 기지 번호, 별도 목록에는 남은 패킷 수를 보관해 보세요. 한 번 보낸 뒤 계속 기다릴지 완료할지 나눕니다. 목록을 복사하고 해당 번호 위치의 수를 갱신하는 방법을 복습하세요.",
      },
      thoughtCheck: {
        question: "패킷 수 [2, 1, 2]에서 가장 먼저 전송을 끝내는 기지 번호는?",
        options: [
          {
            value: "one",
            label: "1번 기지",
          },
          {
            value: "zero",
            label: "0번 기지",
          },
        ],
        expected: "one",
      },
      officialSolutionCode: `from collections import deque

def finish_packet_batches(packet_counts):
    remaining = list(packet_counts)
    queue = deque()
    finished = []
    for station in range(len(remaining)):
        if remaining[station] > 0:
            queue.append(station)
    while len(queue) > 0:
        station = queue.popleft()
        remaining[station] = remaining[station] - 1
        if remaining[station] == 0:
            finished.append(station)
        else:
            queue.append(station)
    return finished
`,
      testCases: [
        {
          inputs: {
            packet_counts: [3, 2, 3, 1, 2, 3],
          },
          expected: [3, 1, 4, 0, 2, 5],
        },
        {
          inputs: {
            packet_counts: [0, 0, 0],
          },
          expected: [],
        },
        {
          inputs: {
            packet_counts: [],
          },
          expected: [],
        },
        {
          inputs: {
            packet_counts: [1, 0, 2, 1],
          },
          expected: [0, 3, 2],
        },
      ],
    },
  ],
}
