import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_QUEUE_ROBOT_75 = createCapabilityPrototypeKernel({
  problemId: "AC-QUEUE-ROBOT-75",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 75,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-NAV-005"],
  },
  identity: {
    studentTitle: "탐사 로봇 입장 순서",
    subtitle: "events는 0~24개의 두 칸 목록입니다. ['IN', 이름]은 뒤에 도착, ['OUT', '']은 앞 한 명 입장입니다. 이름은 비어 있지 않습니다. 빈 줄의 OUT은 무시하고 실제 입장 목록만 반환하며 남은 로봇은 자동 입장시키지 않습니다.",
  },
  pythonConcepts: {
    requires: [
      "class:deque",
      "method:popleft",
      "method:append",
      "statement:for",
      "statement:if",
      "statement:elif",
      "builtin:len",
      "operator:equality",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:fifo-processing"],
    introduces: ["pattern:queue-event-simulation"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "decision", "container-scan"],
    requiredClaims: ["QUEUE_EVENT_SIMULATION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "대기열에 아무 로봇도 없을 때 OUT 사건이 발생하면 어떻게 처리해야 할까요?",
      options: [
        {
          value: "ignore_empty_out",
          label: "입장시킬 로봇이 없으므로 조용히 무시하고 넘어간다",
        },
        {
          value: "crash",
          label: "오류를 발생시킨다",
        },
      ],
      expected: "ignore_empty_out",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "🤖 로봇 대기열 입장 시뮬레이터",
          description: "IN 사건은 대기열 뒤에 추가(뒤에 넣기)하고, OUT 사건은 대기열 맨 앞을 앞에서 꺼내기로 꺼내어 입장 목록에 담습니다.",
          variables: [
            {
              name: "events",
              value: "[['IN', 'R1'], ['IN', 'R2'], ['OUT', '']]",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          queue: [],
          admitted: [],
          operation: "대기",
          payload: "",
        },
        initialStateLabel: "시작: 빈 대기열",
        initialStepTitle: "🚀 시작 (사건 순차 반영)",
        initialPrompt: "도착과 입장 사건을 순서대로 대기열에 반영합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① IN R1",
            operationLabel: "상태 변화 확인",
            prompt: "첫 번째 로봇 R1이 대기열에 줄을 섰습니다.",
            stateAfter: {
              queue: ["R1"],
              admitted: [],
              operation: "IN",
              payload: "R1",
            },
          },
          {
            id: "f1",
            stepTitle: "② IN R2",
            operationLabel: "상태 변화 확인",
            prompt: "두 번째 로봇 R2가 R1 뒤에 줄을 섰습니다.",
            stateAfter: {
              queue: ["R1", "R2"],
              admitted: [],
              operation: "IN",
              payload: "R2",
            },
          },
          {
            id: "f2",
            stepTitle: "③ OUT 발생",
            operationLabel: "상태 변화 확인",
            prompt: "가장 먼저 대기한 R1이 입장 완료 목록으로 이동했습니다.",
            stateAfter: {
              queue: ["R2"],
              admitted: ["R1"],
              operation: "OUT",
              payload: "",
            },
            choicePrompt: "먼저 기다린 로봇 한 명을 입장시키면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "앞 로봇만 나가고 뒤 로봇은 계속 기다린다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "뒤 로봇이 먼저 입장한다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
        ],
        predictionPrompt: "events는 0~24개의 두 칸 목록입니다. ['IN', 이름]은 뒤에 도착, ['OUT', '']은 앞 한 명 입장입니다. 이름은 비어 있지 않습니다. 빈 줄의 OUT은 무시하고 실제 입장 목록만 반환하며 남은 로봇은 자동 입장시키지 않습니다.",
        rulePrompt: "대기열 사건 시뮬레이션 규칙",
        ruleStatement: "도착과 입장 사건을 순서대로 확인한다. 도착은 뒤에서 기다리고 입장은 앞에서 한 명만 처리하며 빈 줄의 입장은 무시한다.",
      },
    },
    code: {
      entryFunction: "admit_robots",
      starterCode: `from collections import deque

def admit_robots(events):
    # events는 0~24개의 두 칸 목록입니다. ['IN', 이름]은 뒤에 도착, ['OUT', '']은 앞 한 명 입장입니다. 이름은 비어 있지 않습니다. 빈 줄의 OUT은 무시하고 실제 입장 목록만 반환하며 남은 로봇은 자동 입장시키지 않습니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          events: [
            ["IN", "R1"],
            ["IN", "R2"],
            ["OUT", ""],
          ],
        },
        expected: ["R1"],
      },
      {
        inputs: {
          events: [
            ["OUT", ""],
          ],
        },
        expected: [],
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
    transferChallenges: [
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
        testCases: [
          {
            inputs: {
              events: [
                ["ADD", "Fuel"],
                ["ADD", "Water"],
                ["SEND", ""],
              ],
            },
            expected: [
              ["Fuel"],
              ["Water"],
            ],
          },
          {
            inputs: {
              events: [
                ["SEND", ""],
                ["ADD", "Oxygen"],
              ],
            },
            expected: [
              [],
              ["Oxygen"],
            ],
          },
        ],
      },
    ],
  },
})
