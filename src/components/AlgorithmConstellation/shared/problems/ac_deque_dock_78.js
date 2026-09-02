import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DEQUE_DOCK_78 = createCapabilityPrototypeKernel({
  problemId: "AC-DEQUE-DOCK-78",
  problemVersion: 1,
  curriculum: {
    catalogOrder: 78,
    constellationId: "constellation-7",
    routeRole: "core",
    learningRole: "practice",
    recommendedBand: "EN",
    prerequisites: ["AC-STACK-BOX-71", "AC-QUEUE-ROBOT-75"],
  },
  identity: {
    studentTitle: "앞·뒤 출입 우주 도크",
    subtitle: "events는 0~24개의 [명령, 라벨]입니다. FRONT_IN/BACK_IN은 앞/뒤 추가, FRONT_OUT/BACK_OUT은 앞/뒤 퇴장(라벨 '')입니다. 빈 퇴장은 무시합니다. [퇴장한 목록, 남은 목록]을 반환하며 두 목록 모두 왼쪽부터의 순서입니다.",
  },
  pythonConcepts: {
    requires: [
      "class:deque",
      "method:popleft",
      "method:pop",
      "method:append",
      "statement:for",
      "statement:if",
      "statement:elif",
      "builtin:len",
      "operator:equality",
    ],
    introduces: ["method:appendleft"],
  },
  thinkingPatterns: {
    requires: ["pattern:lifo-processing", "pattern:fifo-processing"],
    introduces: ["pattern:two-ended-buffer"],
  },
  evidenceRecipe: {
    primitives: ["ordered-buffer", "decision", "container-scan"],
    requiredClaims: ["TWO_ENDED_DEQUE_DOCK_OPERATIONS"],
  },
  modes: {
    observe: {
      type: "single-choice",
      prompt: "뒤로 A를 넣고(BACK_IN) 앞으로 B를 넣은(FRONT_IN) 도크([B, A])에서 뒤에서 꺼내면(BACK_OUT) 무엇이 나올까요?",
      options: [
        {
          value: "A",
          label: "A — 도크의 맨 뒤에 위치한 항목",
        },
        {
          value: "B",
          label: "B — 도크의 맨 앞에 위치한 항목",
        },
      ],
      expected: "A",
    },
    explore: {
      lensId: "state-transition",
      lensConfig: {
        introContext: {
          title: "🛸 양방향 우주 도크 시뮬레이터",
          description: "앞(앞에 넣기)과 뒤(뒤에 넣기)로 선박을 넣고, 앞(앞에서 꺼내기)과 뒤(뒤에서 꺼내기)에서 꺼내어 출항시킵니다.",
          variables: [],
          guidance: "왼쪽은 앞/바닥, 오른쪽은 뒤/맨 위입니다. 다음 행동을 고르기 전에 무엇이 나가고 무엇이 남을지 예상해 보세요.",
        },
        initialState: {
          dock: [],
          departed: [],
          operation: "대기",
          payload: "",
        },
        initialStateLabel: "시작: 빈 도크",
        initialStepTitle: "🚀 시작 (양방향 출입)",
        initialPrompt: "4가지 출입 명령을 순서대로 도크에 반영합니다.",
        frames: [
          {
            id: "f0",
            stepTitle: "① BACK_IN \"A\"",
            operationLabel: "상태 변화 확인",
            prompt: "선박 A가 도크 뒤쪽으로 입항했습니다.",
            stateAfter: {
              dock: ["A"],
              departed: [],
              operation: "BACK_IN",
              payload: "A",
            },
          },
          {
            id: "f1",
            stepTitle: "② FRONT_IN \"B\"",
            operationLabel: "상태 변화 확인",
            prompt: "선박 B가 A의 앞쪽으로 입항하여 [B, A]가 되었습니다.",
            stateAfter: {
              dock: ["B", "A"],
              departed: [],
              operation: "FRONT_IN",
              payload: "B",
            },
            choicePrompt: "앞에 새 화물이 추가되면 기존 화물은?",
            expectedOptionId: "expected",
            operationOptions: [
              {
                id: "expected",
                label: "기존 순서를 유지하며 새 화물 뒤에서 기다린다",
                feedback: "상태 변화와 일치해요.",
              },
              {
                id: "wrong",
                label: "기존 화물들이 사라진다",
                feedback: "먼저 들어온 순서와 남아 있는 위치를 다시 비교해 보세요.",
              },
            ],
          },
          {
            id: "f2",
            stepTitle: "③ BACK_OUT 발생",
            operationLabel: "상태 변화 확인",
            prompt: "맨 뒤에 있던 A가 출항했습니다.",
            stateAfter: {
              dock: ["B"],
              departed: ["A"],
              operation: "BACK_OUT",
              payload: "",
            },
          },
          {
            id: "f3",
            stepTitle: "④ FRONT_OUT 발생 -> 완료",
            operationLabel: "상태 변화 확인",
            prompt: "맨 앞에 남아 있던 B가 출항하여 [A, B]가 완성되었습니다.",
            stateAfter: {
              dock: [],
              departed: ["A", "B"],
              operation: "FRONT_OUT",
              payload: "",
            },
          },
        ],
        predictionPrompt: "events는 0~24개의 [명령, 라벨]입니다. FRONT_IN/BACK_IN은 앞/뒤 추가, FRONT_OUT/BACK_OUT은 앞/뒤 퇴장(라벨 '')입니다. 빈 퇴장은 무시합니다. [퇴장한 목록, 남은 목록]을 반환하며 두 목록 모두 왼쪽부터의 순서입니다.",
        rulePrompt: "양방향 도크 출입 규칙",
        ruleStatement: "명령이 추가인지 퇴장인지, 어느 끝을 쓰는지 따로 구분한다. 마지막에 퇴장 목록과 남은 목록을 각각 반환한다.",
      },
    },
    code: {
      entryFunction: "operate_space_dock",
      starterCode: `from collections import deque

def operate_space_dock(events):
    # events는 0~24개의 [명령, 라벨]입니다. FRONT_IN/BACK_IN은 앞/뒤 추가, FRONT_OUT/BACK_OUT은 앞/뒤 퇴장(라벨 '')입니다. 빈 퇴장은 무시합니다. [퇴장한 목록, 남은 목록]을 반환하며 두 목록 모두 왼쪽부터의 순서입니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      {
        inputs: {
          events: [
            ["BACK_IN", "A"],
            ["FRONT_IN", "B"],
            ["BACK_OUT", ""],
            ["FRONT_OUT", ""],
          ],
        },
        expected: [
          ["A", "B"],
          [],
        ],
      },
      {
        inputs: {
          events: [
            ["FRONT_OUT", ""],
          ],
        },
        expected: [
          [],
          [],
        ],
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
    transferChallenges: [
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
        testCases: [
          {
            inputs: {
              events: [
                ["BACK_IN", 0],
                ["FRONT_IN", 2],
                ["BACK_OUT", 0],
              ],
            },
            expected: [
              [0],
              [2],
            ],
          },
          {
            inputs: {
              events: [
                ["FRONT_OUT", 0],
              ],
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
