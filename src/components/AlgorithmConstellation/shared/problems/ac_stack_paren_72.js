import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STACK_PAREN_72 = createCapabilityPrototypeKernel({
  problemId: "AC-STACK-PAREN-72",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 72,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-STACK-BOX-71"],
  },
  identity: {
    studentTitle: "괄호 통신 검증",
    subtitle: "message는 (와 )로만 된 문자열(0~24자)입니다. 모든 닫힘이 앞선 열림과 짝을 이루고 남은 열림이 없으면 True입니다. 빈 문자열은 True입니다.",
  },
  pythonConcepts: {
    requires: [
      "builtin:list",
      "method:pop",
      "method:append",
      "statement:for",
      "statement:if",
      "statement:elif",
      "operator:equality",
      "builtin:len",
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ["pattern:lifo-processing"],
    introduces: ["pattern:bracket-matching"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "decision", "container-scan"],
    requiredClaims: ["BRACKET_BALANCE_VERIFICATION"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "신호 \")(\"는 열림 하나와 닫힘 하나가 있지만 왜 올바른 괄호 신호가 아닐까요?",
      options: [
        {
          value: "close_first",
          label: "닫힘 \")\"이 먼저 나와 짝지을 앞선 열림이 없기 때문에",
        },
        {
          value: "odd_length",
          label: "문자열의 길이가 홀수이기 때문에",
        },
      ],
      expected: "close_first",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "📡 괄호 신호 균형 탐색기",
          description: "열림 \"(\"을 만나면 스택에 보관하고, 닫힘 \")\"을 만나면 스택에서 열림 하나를 꺼내 짝짓습니다.",
          variables: [
            {
              name: "message",
              value: "'(())'",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          char: null,
          stack: [],
          balanced: null,
        },
        initialStateLabel: "시작: 빈 보관함",
        initialStepTitle: "🚀 시작 (괄호 짝 맞추기)",
        initialPrompt: "문자를 하나씩 확인하며 열림을 보관하고 닫힘과 짝짓습니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① 첫 번째 \"(\" 확인",
            operationLabel: "상태 변화 확인",
            prompt: "열림 기호이므로 짝을 기다리기 위해 보관함에 넣습니다.",
            stateAfter: {
              char: "(",
              stack: ["("],
              balanced: null,
            },
          },
          {
            id: "f1",
            stepTitle: "② 두 번째 \"(\" 확인",
            operationLabel: "상태 변화 확인",
            prompt: "중첩된 두 번째 열림 기호도 보관함에 추가합니다.",
            stateAfter: {
              char: "(",
              stack: ["(", "("],
              balanced: null,
            },
          },
          {
            id: "f2",
            stepTitle: "③ 첫 번째 \")\" 확인",
            operationLabel: "상태 변화 확인",
            prompt: "닫힘을 만나 가장 최근의 열림과 짝지어 보관함에서 꺼냈습니다.",
            stateAfter: {
              char: ")",
              stack: ["("],
              balanced: null,
            },
            choicePrompt: "열림 두 개 뒤에 닫힘 하나를 만나면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "짝 없는 열림 하나가 남는다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "열림 두 개가 모두 사라진다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f3",
            stepTitle: "④ 두 번째 \")\" 확인 -> 완료",
            operationLabel: "상태 변화 확인",
            prompt: "모든 괄호가 짝을 찾고 보관함이 완전히 비어 균형(True)을 이룹니다.",
            stateAfter: {
              char: ")",
              stack: [],
              balanced: true,
            },
          },
          {
            id: "f4_counter",
            stepTitle: "⑤ 반례: \")(\" 탐색",
            experimentReset: true,
            stateBefore: {
              char: null,
              stack: [],
              balanced: null,
            },
            operationLabel: "상태 변화 확인",
            prompt: "짝지을 열림이 없어 첫 글자에서 바로 실패(False)로 판정됩니다.",
            stateAfter: {
              char: ")",
              stack: [],
              balanced: false,
            },
          },
        ],
        predictionPrompt: "message는 (와 )로만 된 문자열(0~24자)입니다. 모든 닫힘이 앞선 열림과 짝을 이루고 남은 열림이 없으면 True입니다. 빈 문자열은 True입니다.",
        rulePrompt: "괄호 짝짓기 규칙",
        ruleStatement: "열림은 보관함에 쌓고, 닫힘은 보관함에서 하나 꺼내 짝지으며, 닫힘 때 보관함이 비거나 끝에 열림이 남으면 False다.",
      },
    },
    code: {
      entryFunction: "is_signal_balanced",
      starterCode: `def is_signal_balanced(message):
    # message는 (와 )로만 된 문자열(0~24자)입니다. 모든 닫힘이 앞선 열림과 짝을 이루고 남은 열림이 없으면 True입니다. 빈 문자열은 True입니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          message: "()()",
        },
        expected: true,
      },
      {
        inputs: {
          message: ")(",
        },
        expected: false,
      },
    ],
    understandingChallenges: [
      {
        challengeId: "uc_stack_072_1",
        title: "괄호 균형 조건 이해",
        prompt: "괄호 검증에서 발생할 수 있는 실패 상황을 점검하세요.",
        questions: [
          {
            id: "q1",
            text: "신호 \"(()\"가 올바르지 않은 이유는 무엇일까요?",
            options: [
              {
                value: "unclosed_open",
                label: "모든 문자를 확인한 뒤에도 짝을 찾지 못한 열림이 보관함에 남아 있어서",
              },
              {
                value: "too_short",
                label: "신호가 너무 짧아서",
              },
            ],
            expected: "unclosed_open",
          },
          {
            id: "q2",
            text: "단순히 \"(\"의 개수와 \")\"의 개수만 같으면 올바른 괄호라고 할 수 있을까요?",
            options: [
              {
                value: "counts_not_enough",
                label: "아니다 — \")(\"처럼 순서가 맞지 않으면 개수가 같아도 올바르지 않다",
              },
              {
                value: "counts_enough",
                label: "맞다 — 개수만 같으면 항상 짝이 맞는다",
              },
            ],
            expected: "counts_not_enough",
          },
          {
            id: "q3",
            text: "빈 문자열 \"\"이 입력되면 판정 결과는 무엇이어야 할까요?",
            options: [
              {
                value: "empty_is_true",
                label: "True — 짝 없는 괄호가 전혀 없으므로",
              },
              {
                value: "empty_is_false",
                label: "False — 괄호가 하나도 없으므로",
              },
            ],
            expected: "empty_is_true",
          },
          {
            id: "q_state",
            text: "열림 두 개 뒤에 닫힘 하나를 만나면?",
            options: [
              {
                value: "expected",
                label: "짝 없는 열림 하나가 남는다",
              },
              {
                value: "wrong",
                label: "열림 두 개가 모두 사라진다",
              },
            ],
            expected: "expected",
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: "tc_stack_072_transfer_1",
        title: "비콘 프레임 유효성 검사",
        description: "대괄호 프레임 문자열(frame)이 올바르게 짝을 이루는지 판정합니다.",
        entryFunction: "is_beacon_frame_valid",
        starterCode: `def is_beacon_frame_valid(frame):
    # 대괄호 프레임이 올바르게 균형을 이루는지 판정하세요.
    pass
`,
        contextCard: {
          title: "🛰️ 비콘 프레임 검증 전략",
          strategyGuide: "아직 짝 없는 열림을 보관합니다. 닫힘이 먼저 나오거나 끝에 열림이 남는 경우를 따로 확인하세요.",
        },
        thoughtCheck: {
          question: "프레임 \"[[]]\"은 유효한 프레임일까요?",
          options: [
            {
              value: "valid",
              label: "유효하다 (중첩된 괄호가 모두 올바르게 짝지어짐)",
            },
            {
              value: "invalid",
              label: "유효하지 않다",
            },
          ],
          expected: "valid",
        },
        testCases: [
          {
            inputs: {
              frame: "[[]]",
            },
            expected: true,
          },
          {
            inputs: {
              frame: "][",
            },
            expected: false,
          },
        ],
      },
    ],
  },
})
