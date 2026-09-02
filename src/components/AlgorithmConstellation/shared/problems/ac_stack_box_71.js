import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STACK_BOX_71 = createCapabilityPrototypeKernel({
  problemId: "AC-STACK-BOX-71",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 71,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "anchor",
    recommendedBand: "EN",
    prerequisites: ["AC-SEQ-RUNNING-35", "AC-EXP-WHILE-07"],
  },
  identity: {
    studentTitle: "우주복 박스 쌓기",
    subtitle: "boxes는 쌓은 순서의 문자열 목록(0~16개)입니다. 왼쪽이 바닥이며, 모두 쌓은 뒤 맨 위부터 꺼낸 순서를 반환하세요. 같은 라벨도 각각 보존하고 빈 입력은 []입니다.",
  },
  pythonConcepts: {
    requires: ["builtin:list", "method:append", "statement:for", "statement:while", "builtin:len", "statement:if"],
    introduces: ["method:pop"],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ["pattern:lifo-processing"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "container-scan"],
    requiredClaims: ["LIFO_STACK_PROCESSING"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "상자 A를 넣고 그 위에 B를 쌓은 뒤 상자 하나를 꺼내면 무엇이 먼저 나올까요?",
      options: [
        {
          value: "B",
          label: "B — 가장 나중에 쌓은 상자가 맨 위에 있으므로",
        },
        {
          value: "A",
          label: "A — 가장 먼저 넣은 상자이므로",
        },
      ],
      expected: "B",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "📦 스택 상자 시뮬레이터",
          description: "상자 쌓기와 꺼내기를 번갈아 하는 독립 조작 실험입니다. 함수 문제에서는 모든 상자를 쌓은 뒤 꺼내지만, 이 실험에서는 중간에 새 상자가 들어옵니다.",
          variables: [
            {
              name: "boxes",
              value: "['A', 'B', 'C']",
            },
          ],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          currentBox: null,
          stack: [],
          unpacked: [],
        },
        initialStateLabel: "시작: 빈 보관함",
        initialStepTitle: "🚀 시작 (상자 쌓기와 꺼내기)",
        initialPrompt: "상자를 하나씩 쌓고 꺼내는 상태 변화를 확인합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① A, B 상자 쌓기",
            operationLabel: "상태 변화 확인",
            prompt: "상자 A 위에 B가 놓였습니다.",
            stateAfter: {
              currentBox: "B",
              stack: ["A", "B"],
              unpacked: [],
            },
          },
          {
            id: "f1",
            stepTitle: "② 맨 위 상자 B 꺼내기",
            operationLabel: "상태 변화 확인",
            prompt: "가장 최근에 넣은 B가 먼저 꺼내졌습니다.",
            stateAfter: {
              currentBox: null,
              stack: ["A"],
              unpacked: ["B"],
            },
            choicePrompt: "[A, B]에서 하나를 꺼내면?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "B가 나가고 [A]가 남는다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "A가 나가고 [B]가 남는다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f2",
            stepTitle: "③ 새 상자 C 쌓기",
            operationLabel: "상태 변화 확인",
            prompt: "남아 있던 A 위에 새 상자 C가 쌓였습니다.",
            stateAfter: {
              currentBox: "C",
              stack: ["A", "C"],
              unpacked: ["B"],
            },
          },
          {
            id: "f3",
            stepTitle: "④ C 꺼내고 마지막 A 꺼내기",
            operationLabel: "상태 변화 확인",
            prompt: "새로 들어온 C가 먼저 나오고 마지막에 바닥의 A가 나옵니다.",
            stateAfter: {
              currentBox: null,
              stack: [],
              unpacked: ["B", "C", "A"],
            },
          },
        ],
        predictionPrompt: "boxes는 쌓은 순서의 문자열 목록(0~16개)입니다. 왼쪽이 바닥이며, 모두 쌓은 뒤 맨 위부터 꺼낸 순서를 반환하세요. 같은 라벨도 각각 보존하고 빈 입력은 []입니다.",
        rulePrompt: "후입선출 (LIFO: Last-In First-Out) 규칙",
        ruleStatement: "가장 늦게 보관함에 들어간 항목이 가장 먼저 꺼내지고, 빈 보관함에서는 꺼내지 않는다.",
      },
    },
    code: {
      entryFunction: "unpack_suits",
      starterCode: `def unpack_suits(boxes):
    # boxes는 쌓은 순서의 문자열 목록(0~16개)입니다. 왼쪽이 바닥이며, 모두 쌓은 뒤 맨 위부터 꺼낸 순서를 반환하세요. 같은 라벨도 각각 보존하고 빈 입력은 []입니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          boxes: ["A", "B", "C"],
        },
        expected: ["C", "B", "A"],
      },
      {
        inputs: {
          boxes: [],
        },
        expected: [],
      },
    ],
    understandingChallenges: [
      {
        challengeId: "uc_stack_071_1",
        title: "스택 꺼내기 동작 이해",
        prompt: "보관함(스택)에서 상자를 넣고 꺼낼 때의 상태를 점검하세요.",
        questions: [
          {
            id: "q1",
            text: "상자 [A, B]에서 하나를 꺼낸 뒤 C를 넣으면 다음으로 꺼내지는 상자는 무엇일까요?",
            options: [
              {
                value: "C",
                label: "C — 새로 들어와 맨 위에 놓인 상자",
              },
              {
                value: "A",
                label: "A — 바닥에 남아 있던 상자",
              },
            ],
            expected: "C",
          },
          {
            id: "q2",
            text: "맨 뒤에서 꺼내기 메서드가 수행하는 두 가지 동작은 무엇일까요?",
            options: [
              {
                value: "pop_returns_and_removes",
                label: "맨 뒤 원소를 반환하고 원래 목록에서 제거한다",
              },
              {
                value: "pop_only_reads",
                label: "목록을 그대로 두고 값만 읽어온다",
              },
            ],
            expected: "pop_returns_and_removes",
          },
          {
            id: "q3",
            text: "같은 라벨의 상자 [A, A]가 들어오면 어떻게 처리되어야 할까요?",
            options: [
              {
                value: "keep_duplicates",
                label: "각각 다른 상자이므로 중복을 보존하여 [A, A]로 꺼낸다",
              },
              {
                value: "deduplicate",
                label: "중복을 제거하여 하나만 꺼낸다",
              },
            ],
            expected: "keep_duplicates",
          },
          {
            id: "q_state",
            text: "[A, B]에서 하나를 꺼내면?",
            options: [
              {
                value: "expected",
                label: "B가 나가고 [A]가 남는다",
              },
              {
                value: "wrong",
                label: "A가 나가고 [B]가 남는다",
              },
            ],
            expected: "expected",
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: "tc_stack_071_transfer_1",
        title: "에너지 셀 하역 순서",
        description: "쌓인 에너지 셀의 수치 목록(cells)을 역순으로 하역하여 반환합니다.",
        entryFunction: "unload_energy_cells",
        starterCode: `def unload_energy_cells(cells):
    # 에너지 셀을 쌓인 역순으로 하역하여 반환하세요.
    pass
`,
        contextCard: {
          title: "🔋 셀 하역 전략",
          strategyGuide: "가장 나중에 쌓은 셀이 먼저 나옵니다. 꺼낸 셀을 기록하고 아직 남은 셀의 순서도 확인해 보세요.",
        },
        thoughtCheck: {
          question: "셀 [10, 20, 30]을 하역하면 첫 번째로 나오는 셀의 수치는 무엇일까요?",
          options: [
            {
              value: "30",
              label: "30 (가장 마지막에 쌓은 셀)",
            },
            {
              value: "10",
              label: "10 (가장 처음에 넣은 셀)",
            },
          ],
          expected: "30",
        },
        testCases: [
          {
            inputs: {
              cells: [10, 20, 30],
            },
            expected: [30, 20, 10],
          },
          {
            inputs: {
              cells: [5],
            },
            expected: [5],
          },
        ],
      },
    ],
  },
})
