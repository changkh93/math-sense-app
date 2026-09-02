import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_QUEUE_ROBIN_76 = createCapabilityPrototypeKernel({
  problemId: "AC-QUEUE-ROBIN-76",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 76,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-QUEUE-ROBOT-75"],
  },
  identity: {
    studentTitle: "번갈아 통신하는 기지",
    subtitle: "stations는 서로 다른 기지 이름 목록(0~8개), turns는 0~20입니다. 앞 기지가 한 차례 통신 후 맨 뒤로 이동합니다. 통신한 순서를 반환하고 기지가 없거나 0회면 []입니다.",
  },
  pythonConcepts: {
    requires: [
      "class:deque",
      "method:popleft",
      "method:append",
      "statement:for",
      "statement:while",
      "builtin:len",
      "statement:if",
      "builtin:list",
      "builtin:range",
      "operator:comparison-bound",
      "operator:arithmetic-state-update",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:queue-event-simulation"],
    introduces: ["pattern:round-robin"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "container-scan", "scalar-sequence"],
    requiredClaims: ["ROUND_ROBIN_SCHEDULE_GENERATION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "기지 [A, B]가 3번 번갈아 통신할 때 통신 순서는 어떻게 될까요?",
      options: [
        {
          value: "ABA",
          label: "A -> B -> A — A가 통신 후 맨 뒤로 가고 B 다음 다시 A 차례",
        },
        {
          value: "ABB",
          label: "A -> B -> B",
        },
      ],
      expected: "ABA",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "🔄 라운드 로빈 스케줄러",
          description: "맨 앞 기지를 꺼내 통신 기록에 남기고, 바로 대기열 맨 뒤로 다시 보냅니다.",
          variables: [
            {
              name: "stations",
              value: "['A', 'B', 'C']",
            },
            {
              name: "turns",
              value: "4",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          turn: 0,
          current: null,
          queue: ["A", "B", "C"],
          order: [],
        },
        initialStateLabel: "시작: [A, B, C]",
        initialStepTitle: "🚀 시작 (라운드 로빈 회전)",
        initialPrompt: "정해진 턴 횟수만큼 기지를 꺼내 기록하고 뒤로 보냅니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① 턴 1: A 통신",
            operationLabel: "상태 변화 확인",
            prompt: "A가 첫 번째로 통신하고 대기열 맨 뒤로 돌아갔습니다.",
            stateAfter: {
              turn: 1,
              current: "A",
              queue: ["B", "C", "A"],
              order: ["A"],
            },
            choicePrompt: "A가 한 차례 통신한 뒤 줄은?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "[B, C, A]",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "[A, B, C]",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f1",
            stepTitle: "② 턴 2: B 통신",
            operationLabel: "상태 변화 확인",
            prompt: "두 번째 기지 B가 통신 후 맨 뒤로 돌아갔습니다.",
            stateAfter: {
              turn: 2,
              current: "B",
              queue: ["C", "A", "B"],
              order: ["A", "B"],
            },
          },
          {
            id: "f2",
            stepTitle: "③ 턴 3: C 통신",
            operationLabel: "상태 변화 확인",
            prompt: "모든 기지가 한 번씩 돌아 원위치 [A, B, C]로 돌아왔습니다.",
            stateAfter: {
              turn: 3,
              current: "C",
              queue: ["A", "B", "C"],
              order: ["A", "B", "C"],
            },
          },
          {
            id: "f3",
            stepTitle: "④ 턴 4: 다시 A 통신 -> 완료",
            operationLabel: "상태 변화 확인",
            prompt: "4턴이 끝나 [A, B, C, A] 통신 일정이 완성되었습니다.",
            stateAfter: {
              turn: 4,
              current: "A",
              queue: ["B", "C", "A"],
              order: ["A", "B", "C", "A"],
            },
          },
        ],
        predictionPrompt: "stations는 서로 다른 기지 이름 목록(0~8개), turns는 0~20입니다. 앞 기지가 한 차례 통신 후 맨 뒤로 이동합니다. 통신한 순서를 반환하고 기지가 없거나 0회면 []입니다.",
        rulePrompt: "라운드 로빈 회전 규칙",
        ruleStatement: "대기열이 빌 때까지가 아니라 요청된 turns 횟수만큼 반복하며, 꺼낸 항목을 즉시 맨 뒤로 재삽입한다.",
      },
    },
    code: {
      entryFunction: "schedule_transmissions",
      starterCode: `from collections import deque

def schedule_transmissions(stations, turns):
    # stations는 서로 다른 기지 이름 목록(0~8개), turns는 0~20입니다. 앞 기지가 한 차례 통신 후 맨 뒤로 이동합니다. 통신한 순서를 반환하고 기지가 없거나 0회면 []입니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          stations: ["A", "B"],
          turns: 3,
        },
        expected: ["A", "B", "A"],
      },
      {
        inputs: {
          stations: ["Alpha"],
          turns: 2,
        },
        expected: ["Alpha", "Alpha"],
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
    transferChallenges: [
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
        testCases: [
          {
            inputs: {
              packet_counts: [2, 1, 2],
            },
            expected: [1, 0, 2],
          },
          {
            inputs: {
              packet_counts: [0, 1],
            },
            expected: [1],
          },
        ],
      },
    ],
  },
})
