import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_SWAP_04 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-SWAP-04',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '바뀌어 버린 두 화물',
    subtitle: '덮어쓰기 전 정보를 잃어버리지 않도록 임시 보관(temp)하는 교환 전략을 설계합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'operator:assignment'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:preserve-before-overwrite'],
  },
  evidenceRecipe: {
    primitives: ['ordered-buffer'],
    requiredClaims: ['preserve-state-before-overwrite-in-swap'],
  },
  modes: {
    observe: {
      prompt: 'a = "A", b = "B"에서 temp 없이 a = b, b = a를 실행하면 a, b는 각각 무엇이 될까요?',
      expected: '둘 다 "B"',
      options: ['둘 다 "B"', 'a="B", b="A"', '둘 다 "A"', '에러 발생'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { box_a: 10, box_b: 20, temp: '비어있음' },
      frames: [
        { id: 'backup', operationLabel: 'temp = box_a', stateAfter: { box_a: 10, box_b: 20, temp: 10 } },
        { id: 'overwrite_a', operationLabel: 'box_a = box_b', stateAfter: { box_a: 20, box_b: 20, temp: 10 } },
        { id: 'restore_b', operationLabel: 'box_b = temp', stateAfter: { box_a: 20, box_b: 10, temp: 10 } },
      ],
      predictionPrompt: 'box_a의 원래 값을 잃어버리지 않으려면 어느 순간에 temp에 백업해야 할까요?',
      rulePrompt: '두 상자의 값을 안전하게 교환하는 핵심 원리는 무엇일까요?',
      ruleStatement: '변수에 새 값을 덮어쓰기 전에 기존 값을 임시 변수(temp)에 미리 보관해 두어야 정보가 유실되지 않습니다.',
    },
    code: {
      entryFunction: 'swap_cargo_boxes',
      starterCode: `def swap_cargo_boxes(box_a, box_b):
    # box_a와 box_b의 값을 서로 맞바꾼 [box_a, box_b] 리스트를 반환하세요.
    temp = box_a
    return [box_a, box_b]
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { box_a: 10, box_b: 20 }, expected: [20, 10] },
      { inputs: { box_a: 1, box_b: 99 }, expected: [99, 1] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_swap_04_1',
        title: '★★ 덮어쓰기 전 보관의 이유',
        type: 'single-choice',
        prompt: '임시 변수를 활용한 교환 단계를 확인해 보세요.',
        questions: [
          {
            id: 'q1',
            text: 'temp = box_a를 실행하는 가장 중요한 이유는 무엇인가요?',
            options: [
              { value: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해', label: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해' },
              { value: '두 변수의 값을 더하기 위해', label: '두 변수의 값을 더하기 위해' },
              { value: '메모리를 절약하기 위해', label: '메모리를 절약하기 위해' },
            ],
            expected: 'box_a의 원래 값이 덮어씌워져 사라지기 전에 보관하기 위해',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_swap_04_t1',
        title: '우주선 도킹 위치 교환',
        description: '도킹 구역 dock_1과 dock_2의 우주선 식별 번호를 서로 맞바꾼 리스트 [dock_1, dock_2]를 반환하세요.',
        contextCard: {
          title: '📋 우주선 도킹 맞교환 흐름',
          steps: [
            { label: '① 임시 대기 구역에 보관', text: 'temp = dock_1' },
            { label: '② 1번 구역에 2번 우주선 진입', text: 'dock_1 = dock_2' },
            { label: '③ 2번 구역에 임시 보관된 우주선 진입', text: 'dock_2 = temp' },
          ],
        },
        thoughtCheck: {
          prompt: 'dock_1 = dock_2를 먼저 실행하기 전에 temp = dock_1을 하지 않으면 어떻게 될까요?',
          options: [
            { id: 'opt_lost', label: 'dock_1에 있던 원래 우주선 번호가 사라진다', isCorrect: true },
            { id: 'opt_stay', label: '자동으로 dock_2에 들어간다', isCorrect: false },
          ],
          feedback: '맞아요! dock_1에 새 값을 덮어쓰면 원래 번호는 영구히 유실되므로 temp에 먼저 보관해야 합니다.',
        },
        entryFunction: 'exchange_docking_ships',
        starterCode: `def exchange_docking_ships(dock_1, dock_2):
    # 두 도킹 위치의 우주선 번호를 서로 바꾸세요.
    pass
`,
        testCases: [
          { inputs: { dock_1: 101, dock_2: 202 }, expected: [202, 101] },
          { inputs: { dock_1: 7, dock_2: 3 }, expected: [3, 7] },
        ],
      },
    ],
  },
})
