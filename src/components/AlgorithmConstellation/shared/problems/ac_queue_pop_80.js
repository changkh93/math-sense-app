import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_QUEUE_POP_80 = createCapabilityPrototypeKernel({
  problemId: "AC-QUEUE-POP-80",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 80,
    constellationId: "constellation-7",
    routeRole: "branch",
    learningRole: "review",
    recommendedBand: "EN",
    prerequisites: ["AC-STACK-BOX-71", "AC-NAV-005", "AC-CODE-FIRST-ERROR-01"],
  },
  identity: {
    studentTitle: "pop과 popleft의 한 줄 차이",
    subtitle: "signals는 도착 순서의 문자열 목록(0~16개), limit는 0~16입니다. 먼저 도착한 신호부터 최대 limit개를 반환하도록 코드를 수리하세요. 신호가 먼저 소진되면 멈추며 빈 입력이나 limit=0이면 []입니다.",
  },
  pythonConcepts: {
    requires: ["class:deque", "method:popleft", "method:pop", "method:append", "statement:while", "builtin:len", "statement:if"],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:first-state-divergence", "pattern:fifo-processing"],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ["source-debug", "ordered-buffer", "decision"],
    requiredClaims: ["FIRST_STATE_DIVERGENCE_REPAIR"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "서로 다른 신호 [S1, S2]를 도착 순서대로 보내야 하는데 잘못된 코드가 S2를 먼저 보냈습니다. 무엇이 잘못되었을까요?",
      options: [
        {
          value: "reverses_order",
          label: "가장 나중에 온 'S3', 'S2'가 먼저 발송되어 순서가 뒤집힌다",
        },
        {
          value: "cannot_run",
          label: "코드가 실행되지 않고 멈춘다",
        },
      ],
      expected: "reverses_order",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "🔧 신호 발송 버그 심판판",
          description: "기대 순서와 실제 순서가 처음 달라지는 순간을 찾고, 꺼내는 방향이 발송 규칙에 맞는지 판단하세요.",
          variables: [
            {
              name: "signals",
              value: "['S1', 'S2', 'S3']",
            },
            {
              name: "limit",
              value: "2",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          sig: null,
          queue: ["S1", "S2", "S3"],
          dispatched: [],
        },
        initialStateLabel: "시작: 대기열 [S1, S2, S3]",
        initialStepTitle: "🚀 시작 (수리 전후 비교)",
        initialPrompt: "첫 번째 신호를 꺼내는 순간부터 기대 결과와 버그 코드 결과가 갈라집니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① 첫 발송: S1 기대 vs S3 실제",
            operationLabel: "상태 변화 확인",
            prompt: "첫 단계에서 이미 잘못된 신호(S3)가 꺼내져 오류가 시작됩니다.",
            stateAfter: {
              sig: "S1",
              queue: ["S2", "S3"],
              dispatched: ["S1"],
            },
            choicePrompt: "대기열 [S1, S2, S3]의 첫 발송에서 맞는 결과는?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "S1이 나가고 [S2, S3]가 남는다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "S3이 나가고 [S1, S2]가 남는다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f1",
            stepTitle: "② 두 번째 발송: S2 꺼냄",
            operationLabel: "상태 변화 확인",
            prompt: "수리된 코드는 두 번째 도착 신호인 S2를 정상 발송하여 [S1, S2]를 완성합니다.",
            stateAfter: {
              sig: "S2",
              queue: ["S3"],
              dispatched: ["S1", "S2"],
            },
          },
        ],
        predictionPrompt: "signals는 도착 순서의 문자열 목록(0~16개), limit는 0~16입니다. 먼저 도착한 신호부터 최대 limit개를 반환하도록 코드를 수리하세요. 신호가 먼저 소진되면 멈추며 빈 입력이나 limit=0이면 []입니다.",
        rulePrompt: "대기열 수리 규칙",
        ruleStatement: "먼저 도착한 신호부터 꺼내되, 요청한 개수와 현재 남은 개수를 모두 확인한다.",
      },
    },
    code: {
      entryFunction: "repair_dispatch_order",
      starterCode: `from collections import deque

def repair_dispatch_order(signals, limit):
    queue = deque(signals)
    dispatched = []
    while len(queue) > 0 and len(dispatched) < limit:
        sig = queue.pop()
        dispatched.append(sig)
    return dispatched
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          signals: ["S1", "S2", "S3"],
          limit: 2,
        },
        expected: ["S1", "S2"],
      },
      {
        inputs: {
          signals: ["A"],
          limit: 0,
        },
        expected: [],
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
    transferChallenges: [
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
              history: ["H1", "H2", "H3"],
              limit: 2,
            },
            expected: ["H3", "H2"],
          },
          {
            inputs: {
              history: ["A"],
              limit: 1,
            },
            expected: ["A"],
          },
        ],
      },
    ],
  },
})
