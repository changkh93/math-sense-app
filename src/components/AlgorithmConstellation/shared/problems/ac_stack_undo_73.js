import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STACK_UNDO_73 = createCapabilityPrototypeKernel({
  problemId: "AC-STACK-UNDO-73",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 73,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-STACK-BOX-71"],
  },
  identity: {
    studentTitle: "잘못된 명령 되돌리기",
    subtitle: "commands는 0~24개의 정수입니다. 1~99는 작업 기록, 0은 현재 남은 최신 기록 하나 취소입니다. 빈 기록의 취소는 무시하고 남은 기록을 원래 순서로 반환하세요.",
  },
  pythonConcepts: {
    requires: [
      "builtin:list",
      "method:pop",
      "method:append",
      "statement:for",
      "statement:if",
      "operator:equality",
      "builtin:len",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:lifo-processing"],
    introduces: ["pattern:undo-last-action"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "decision", "scalar-sequence"],
    requiredClaims: ["UNDO_TASK_HISTORY_RECONSTRUCTION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "명령 목록 [4, 7, 0]에서 0이 지우는 대상은 무엇일까요?",
      options: [
        {
          value: "last_valid",
          label: "가장 최근에 기록된 7 — 바로 직전 행동 하나를 취소",
        },
        {
          value: "first_valid",
          label: "처음에 기록된 4",
        },
      ],
      expected: "last_valid",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "⏪ 실행 취소(Undo) 시뮬레이터",
          description: "0이 아닌 숫자는 작업 기록에 추가하고, 0을 만나면 가장 최근 작업을 뒤에서 꺼내기으로 지웁니다.",
          variables: [
            {
              name: "commands",
              value: "[3, 5, 0, 9]",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          cmd: null,
          history: [],
        },
        initialStateLabel: "시작: 빈 작업 내역",
        initialStepTitle: "🚀 시작 (작업 기록과 취소)",
        initialPrompt: "명령을 하나씩 읽으며 기록과 취소를 수행합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① 명령 3 기록",
            operationLabel: "상태 변화 확인",
            prompt: "유효 명령 3이 기록되었습니다.",
            stateAfter: {
              cmd: 3,
              history: [3],
            },
          },
          {
            id: "f1",
            stepTitle: "② 명령 5 기록",
            operationLabel: "상태 변화 확인",
            prompt: "유효 명령 5가 추가되었습니다.",
            stateAfter: {
              cmd: 5,
              history: [3, 5],
            },
          },
          {
            id: "f2",
            stepTitle: "③ 명령 0 (취소)",
            operationLabel: "상태 변화 확인",
            prompt: "가장 최근 작업인 5가 취소되어 목록에서 사라졌습니다.",
            stateAfter: {
              cmd: 0,
              history: [3],
            },
            choicePrompt: "최근 기록을 하나 취소하면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "가장 최근에 남은 기록 하나만 사라진다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "가장 오래된 기록이 사라진다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f3",
            stepTitle: "④ 명령 9 기록 -> 완료",
            operationLabel: "상태 변화 확인",
            prompt: "남아 있던 3 뒤에 새 명령 9가 기록되어 [3, 9]가 완성되었습니다.",
            stateAfter: {
              cmd: 9,
              history: [3, 9],
            },
          },
        ],
        predictionPrompt: "commands는 0~24개의 정수입니다. 1~99는 작업 기록, 0은 현재 남은 최신 기록 하나 취소입니다. 빈 기록의 취소는 무시하고 남은 기록을 원래 순서로 반환하세요.",
        rulePrompt: "실행 취소(Undo) 규칙",
        ruleStatement: "0이 아닌 값은 기록함에 넣고, 0이면 기록함이 비어 있지 않을 때 맨 위 항목을 pop()으로 지운다.",
      },
    },
    code: {
      entryFunction: "restore_task_history",
      starterCode: `def restore_task_history(commands):
    # commands는 0~24개의 정수입니다. 1~99는 작업 기록, 0은 현재 남은 최신 기록 하나 취소입니다. 빈 기록의 취소는 무시하고 남은 기록을 원래 순서로 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          commands: [4, 7, 0],
        },
        expected: [4],
      },
      {
        inputs: {
          commands: [1, 2, 3],
        },
        expected: [1, 2, 3],
      },
    ],
    understandingChallenges: [
      {
        challengeId: "uc_stack_073_1",
        title: "실행 취소 로직 이해",
        prompt: "취소 명령의 연속 실행 및 빈 상태 동작을 점검하세요.",
        questions: [
          {
            id: "q1",
            text: "명령 [1, 2, 0, 0]을 실행한 후 남는 작업은 무엇일까요?",
            options: [
              {
                value: "empty",
                label: "빈 목록 [] — 2가 취소되고 그 다음 1도 취소되므로",
              },
              {
                value: "only_one",
                label: "[1] — 0이 하나만 작동하므로",
              },
            ],
            expected: "empty",
          },
          {
            id: "q2",
            text: "기록함이 이미 비어 있을 때 0이 들어오면 어떻게 처리해야 할까요?",
            options: [
              {
                value: "ignore_empty_undo",
                label: "지울 작업이 없으므로 조용히 무시한다",
              },
              {
                value: "crash",
                label: "오류를 발생시킨다",
              },
            ],
            expected: "ignore_empty_undo",
          },
          {
            id: "q3",
            text: "0이라는 숫자 자체가 최종 결과에 들어가야 할까요?",
            options: [
              {
                value: "never_recorded",
                label: "아니다 — 0은 취소 명령일 뿐 데이터로 기록되지 않는다",
              },
              {
                value: "recorded",
                label: "맞다 — 0도 하나의 작업이다",
              },
            ],
            expected: "never_recorded",
          },
          {
            id: "q_state",
            text: "최근 기록을 하나 취소하면?",
            options: [
              {
                value: "expected",
                label: "가장 최근에 남은 기록 하나만 사라진다",
              },
              {
                value: "wrong",
                label: "가장 오래된 기록이 사라진다",
              },
            ],
            expected: "expected",
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: "tc_stack_073_transfer_1",
        title: "유효 충전량 합산",
        description: "충전 명령(commands)에서 취소(0)를 반영한 뒤 남은 유효 충전량의 합을 반환합니다.",
        entryFunction: "sum_active_charges",
        starterCode: `def sum_active_charges(commands):
    # 취소를 반영한 뒤 남은 충전량들의 총합을 반환하세요.
    pass
`,
        contextCard: {
          title: "⚡ 유효 충전량 누적 전략",
          strategyGuide: "취소할 때 현재 남아 있는 최신 기록 하나만 없앱니다. 마지막에 남은 충전량들을 합쳐 보세요.",
        },
        thoughtCheck: {
          question: "명령 [10, 20, 0, 5]를 실행했을 때 유효 충전량의 합은 얼마일까요?",
          options: [
            {
              value: "15",
              label: "15 (10 + 5)",
            },
            {
              value: "35",
              label: "35 (10 + 20 + 5)",
            },
          ],
          expected: "15",
        },
        testCases: [
          {
            inputs: {
              commands: [10, 20, 0, 5],
            },
            expected: 15,
          },
          {
            inputs: {
              commands: [5, 0],
            },
            expected: 0,
          },
        ],
      },
    ],
  },
})
