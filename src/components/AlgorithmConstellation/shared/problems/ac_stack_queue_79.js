import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STACK_QUEUE_79 = createCapabilityPrototypeKernel({
  problemId: "AC-STACK-QUEUE-79",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 79,
    constellationId: "constellation-7",
    routeRole: "branch",
    learningRole: "review",
    recommendedBand: "EN",
    prerequisites: ["AC-STACK-BOX-71", "AC-QUEUE-ROBOT-75"],
  },
  identity: {
    studentTitle: "스택 둘로 대기열 만들기",
    subtitle: "events는 0~24개의 ['IN', 이름] 또는 ['OUT', '']입니다. 이름은 비어 있지 않습니다. 앞서 도착한 항목부터 처리한 목록을 반환하고 빈 OUT은 무시합니다. 두 스택의 상태로 순서가 보존되는 이유를 탐구합니다.",
  },
  pythonConcepts: {
    requires: [
      "builtin:list",
      "method:pop",
      "method:append",
      "statement:for",
      "statement:while",
      "statement:if",
      "statement:elif",
      "builtin:len",
      "operator:equality",
      "syntax:slicing",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:lifo-processing", "pattern:fifo-processing"],
    introduces: ["pattern:two-stack-fifo"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "decision", "container-scan"],
    requiredClaims: ["TWO_STACK_QUEUE_SIMULATION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "출발용 스택(stack_out)에 이미 대기 중인 항목이 남아 있을 때, 새 도착 항목들을 옮기면 안 되는 이유는 무엇일까요?",
      options: [
        {
          value: "breaks_fifo_order",
          label: "새로 온 항목이 기존 대기자 위에 쌓여 먼저 나가 버리기 때문에",
        },
        {
          value: "stacks_get_full",
          label: "스택의 용량이 부족해지기 때문에",
        },
      ],
      expected: "breaks_fifo_order",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "📦 2-스택 대기열 시뮬레이터",
          description: "IN는 stack_in에 넣고, OUT 시 stack_out이 비었을 때만 stack_in의 모든 항목을 stack_out으로 쏟아부어 뒤집습니다.",
          variables: [],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          stack_in: [],
          stack_out: [],
          served: [],
          operation: "대기",
          payload: "",
        },
        initialStateLabel: "시작: 두 스택 모두 빈 상태",
        initialStepTitle: "🚀 시작 (2-스택 선입선출)",
        initialPrompt: "도착과 꺼내기 명령을 두 스택으로 분담 처리합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① A, B 도착",
            operationLabel: "상태 변화 확인",
            prompt: "새 항목들이 도착 스택(stack_in)에 차례로 쌓였습니다.",
            stateAfter: {
              stack_in: ["A", "B"],
              stack_out: [],
              served: [],
              operation: "IN",
              payload: "B",
            },
          },
          {
            id: "f1",
            stepTitle: "② OUT 발생 (stack_out으로 전체 이동)",
            operationLabel: "상태 변화 확인",
            prompt: "도착 쪽 항목을 뒤집어 옮긴 뒤 가장 먼저 온 A를 처리했습니다.",
            stateAfter: {
              stack_in: [],
              stack_out: ["B"],
              served: ["A"],
              operation: "OUT",
              payload: "",
            },
          },
          {
            id: "f2",
            stepTitle: "③ C 도착",
            operationLabel: "상태 변화 확인",
            prompt: "C는 도착 쪽에서 기다리고 출발 쪽의 B가 먼저 처리됩니다.",
            stateAfter: {
              stack_in: ["C"],
              stack_out: ["B"],
              served: ["A"],
              operation: "IN",
              payload: "C",
            },
            choicePrompt: "출발 스택에 B가 남았을 때 C가 새로 도착하면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "C는 도착 스택에서 기다리고 다음 처리 대상은 B다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "C를 출발 스택 위에 올려 먼저 처리한다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f3",
            stepTitle: "④ OUT 발생 (stack_out에서 바로 꺼냄)",
            operationLabel: "상태 변화 확인",
            prompt: "출발 쪽 B를 먼저 처리하며 C는 계속 기다립니다.",
            stateAfter: {
              stack_in: ["C"],
              stack_out: [],
              served: ["A", "B"],
              operation: "OUT",
              payload: "",
            },
          },
        ],
        predictionPrompt: "events는 0~24개의 ['IN', 이름] 또는 ['OUT', '']입니다. 이름은 비어 있지 않습니다. 앞서 도착한 항목부터 처리한 목록을 반환하고 빈 OUT은 무시합니다. 두 스택의 상태로 순서가 보존되는 이유를 탐구합니다.",
        rulePrompt: "2-스택 대기열 규칙",
        ruleStatement: "IN는 stack_in에 넣고, OUT 시 stack_out이 비었을 때만 stack_in을 모두 꺼내 stack_out에 옮긴 뒤 stack_out에서 꺼낸다.",
      },
    },
    code: {
      entryFunction: "serve_with_two_stacks",
      starterCode: `def serve_with_two_stacks(events):
    # events는 0~24개의 ['IN', 이름] 또는 ['OUT', '']입니다. 이름은 비어 있지 않습니다. 앞서 도착한 항목부터 처리한 목록을 반환하고 빈 OUT은 무시합니다. 두 스택의 상태로 순서가 보존되는 이유를 탐구합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          events: [
            ["IN", "1"],
            ["IN", "2"],
            ["OUT", ""],
            ["IN", "3"],
            ["OUT", ""],
            ["OUT", ""],
          ],
        },
        expected: ["1", "2", "3"],
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
        challengeId: "uc_stack_079_1",
        title: "2-스택 대기열 작동 이해",
        prompt: "두 스택 간 이동 타이밍과 순서 보존 원리를 점검하세요.",
        questions: [
          {
            id: "q1",
            text: "stack_in의 항목들을 stack_out으로 옮길 때 순서는 어떻게 변할까요?",
            options: [
              {
                value: "reversed",
                label: "역순으로 뒤집힌다 — 가장 먼저 들어온 항목이 stack_out의 맨 위로 온다",
              },
              {
                value: "same",
                label: "원래 순서 그대로 유지된다",
              },
            ],
            expected: "reversed",
          },
          {
            id: "q2",
            text: "OUT 호출 시 stack_in과 stack_out이 둘 다 비어 있으면 어떻게 해야 할까요?",
            options: [
              {
                value: "ignore_empty",
                label: "꺼낼 항목이 없으므로 아무것도 꺼내지 않고 무시한다",
              },
              {
                value: "error",
                label: "오류를 내야 한다",
              },
            ],
            expected: "ignore_empty",
          },
          {
            id: "q3",
            text: "stack_out에 이미 원소가 있을 때 새 IN가 오면 어디에 넣어야 할까요?",
            options: [
              {
                value: "push_to_in",
                label: "stack_in에만 넣는다",
              },
              {
                value: "push_to_out",
                label: "stack_out의 맨 위에 넣는다",
              },
            ],
            expected: "push_to_in",
          },
          {
            id: "q_state",
            text: "출발 스택에 B가 남았을 때 C가 새로 도착하면?",
            options: [
              {
                value: "expected",
                label: "C는 도착 스택에서 기다리고 다음 처리 대상은 B다",
              },
              {
                value: "wrong",
                label: "C를 출발 스택 위에 올려 먼저 처리한다",
              },
            ],
            expected: "expected",
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: "tc_stack_079_transfer_1",
        title: "처리한 화물과 남은 화물",
        description: "commands는 0~24개의 정수입니다. 1~99는 화물 도착, 0은 가장 먼저 기다린 화물 하나 처리입니다. 빈 처리는 무시합니다. [처리목록, 남은 FIFO 목록]을 반환하세요.",
        entryFunction: "serve_crate_requests",
        starterCode: `def serve_crate_requests(commands):
    # commands는 0~24개의 정수입니다. 1~99는 화물 도착, 0은 가장 먼저 기다린 화물 하나 처리입니다. 빈 처리는 무시합니다. [처리목록, 남은 FIFO 목록]을 반환하세요.
    pass
`,
        contextCard: {
          title: "처리한 화물과 남은 화물",
          strategyGuide: "처리할 쪽에 남은 화물이 있으면 새 도착을 섞지 않습니다. 마지막에는 출발 쪽과 도착 쪽의 대기 순서를 연결해 보세요.",
        },
        thoughtCheck: {
          question: "[4, 8, 0, 6] 처리 후 결과는?",
          options: [
            {
              value: "expected",
              label: "[[4], [8, 6]]",
            },
            {
              value: "reversed",
              label: "[[4], [6, 8]]",
            },
          ],
          expected: "expected",
        },
        testCases: [
          {
            inputs: {
              commands: [4, 8, 0, 6],
            },
            expected: [
              [4],
              [8, 6],
            ],
          },
          {
            inputs: {
              commands: [0],
            },
            expected: [
              [],
              [],
            ],
          },
        ],
      },
    ],
  },
})
