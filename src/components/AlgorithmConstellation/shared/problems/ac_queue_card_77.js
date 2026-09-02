import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_QUEUE_CARD_77 = createCapabilityPrototypeKernel({
  problemId: "AC-QUEUE-CARD-77",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 77,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-QUEUE-ROBIN-76"],
  },
  identity: {
    studentTitle: "한 장씩 버리는 우주 카드",
    subtitle: "n은 1~20입니다. 카드 1~n에서 앞 한 장을 버린 뒤 새 앞 카드를 뒤로 옮깁니다. 한 장이 남을 때 끝내고 그 번호를 반환하세요.",
  },
  pythonConcepts: {
    requires: [
      "class:deque",
      "method:popleft",
      "method:append",
      "builtin:range",
      "statement:while",
      "builtin:len",
      "statement:if",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:round-robin"],
    introduces: ["pattern:discard-and-rotate"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "container-scan", "scalar-sequence"],
    requiredClaims: ["DISCARD_AND_ROTATE_SIMULATION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "카드 [1, 2, 3, 4]에서 1을 버린 뒤 바로 다음 단계에서 일어나는 일은 무엇일까요?",
      options: [
        {
          value: "move_2_to_back",
          label: "맨 앞이 된 2를 맨 뒤로 이동시킨다 -> [3, 4, 2]",
        },
        {
          value: "discard_2",
          label: "2도 바로 버린다",
        },
      ],
      expected: "move_2_to_back",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "🃏 카드 버리기·회전 시뮬레이터",
          description: "1부터 n까지의 카드에서 [맨 앞 버리기 -> 다음 카드 맨 뒤로 이동]을 한 장이 남을 때까지 반복합니다.",
          variables: [
            {
              name: "n",
              value: "4",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          discarded: null,
          moved: null,
          queue: [1, 2, 3, 4],
        },
        initialStateLabel: "시작: [1, 2, 3, 4]",
        initialStepTitle: "🚀 시작 (버리고 뒤로 이동)",
        initialPrompt: "규칙을 순서대로 적용하여 남은 카드를 추적합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① 1 버리고 2 뒤로 이동",
            operationLabel: "상태 변화 확인",
            prompt: "1이 제거되고 2가 맨 뒤로 이동했습니다.",
            stateAfter: {
              discarded: 1,
              moved: 2,
              queue: [3, 4, 2],
            },
            choicePrompt: "[1, 2, 3, 4]에서 1을 버리고 새 앞 카드를 뒤로 보내면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "[3, 4, 2]",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "[2, 3, 4]",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f1",
            stepTitle: "② 3 버리고 4 뒤로 이동",
            operationLabel: "상태 변화 확인",
            prompt: "3이 제거되고 4가 2 뒤로 이동했습니다.",
            stateAfter: {
              discarded: 3,
              moved: 4,
              queue: [2, 4],
            },
          },
          {
            id: "f2",
            stepTitle: "③ 2 버리기 -> 4 혼자 남음",
            operationLabel: "상태 변화 확인",
            prompt: "마지막으로 2가 버려지고 4 혼자 남아 최종 결과가 됩니다.",
            stateAfter: {
              discarded: 2,
              moved: null,
              queue: [4],
            },
          },
        ],
        predictionPrompt: "n은 1~20입니다. 카드 1~n에서 앞 한 장을 버린 뒤 새 앞 카드를 뒤로 옮깁니다. 한 장이 남을 때 끝내고 그 번호를 반환하세요.",
        rulePrompt: "카드 버리기·회전 규칙",
        ruleStatement: "한 장이 남을 때까지 앞 카드를 버리고, 다음 앞 카드를 뒤로 보낸다. 버린 카드와 옮긴 카드를 구분한다.",
      },
    },
    code: {
      entryFunction: "last_space_card",
      starterCode: `from collections import deque

def last_space_card(n):
    # n은 1~20입니다. 카드 1~n에서 앞 한 장을 버린 뒤 새 앞 카드를 뒤로 옮깁니다. 한 장이 남을 때 끝내고 그 번호를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          n: 4,
        },
        expected: 4,
      },
      {
        inputs: {
          n: 1,
        },
        expected: 1,
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
    transferChallenges: [
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
        testCases: [
          {
            inputs: {
              cards: [10, 20, 30, 40],
            },
            expected: [10, 30, 20, 40],
          },
          {
            inputs: {
              cards: [7],
            },
            expected: [7],
          },
        ],
      },
    ],
  },
})
