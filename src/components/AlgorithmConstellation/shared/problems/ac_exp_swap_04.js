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
  },
})
