import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_STEP_03 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-STEP-03',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '빠진 명령 한 장',
    subtitle: '연속된 절차를 분해하고 앞뒤 상태를 연결하는 누락된 명령을 찾아 올바른 순서로 조립합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:procedure-decomposition'],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['procedural-decomposition-and-assembly'],
  },
  modes: {
    observe: {
      prompt: '초기 에너지 2에서 충전(+3) 후 누락된 명령(×4)을 거쳐 방어막(-5)을 켰을 때 최종 에너지는 얼마일까요?',
      expected: '15',
      options: ['15', '0', '20', '5'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { energy: 2 },
      frames: [
        {
          id: 'step_1_charge',
          operationLabel: '1단계 (+3)',
          stateAfter: { energy: 5 },
        },
        {
          id: 'missing_boost',
          operationLabel: '2단계 (빠진 명령)',
          prompt: '앞 단계의 결과를 다음 단계로 올바르게 연결할 명령을 선택하세요.',
          operationOptions: [
            {
              id: 'multiply_boost',
              label: 'energy = energy * boost',
              stateAfter: { energy: 20 },
            },
            {
              id: 'add_shield',
              label: 'energy = energy + shield',
              stateAfter: { energy: 10 },
            },
            {
              id: 'reset_energy',
              label: 'energy = 0',
              stateAfter: { energy: 0 },
            },
          ],
          expectedOptionId: 'multiply_boost',
          stateAfter: { energy: 20 },
        },
        {
          id: 'step_3_shield',
          operationLabel: '3단계 (-5)',
          stateAfter: { energy: 15 },
        },
      ],
      predictionPrompt: '절차의 각 단계마다 에너지 상태가 어떻게 전이되는지 확인하고 누락된 단계를 찾아보세요.',
      rulePrompt: '복잡한 프로그램의 절차를 올바르게 조립하는 원리는 무엇일까요?',
      ruleStatement: '프로그램은 여러 단계의 명령으로 분해할 수 있으며, 이전 단계의 계산 결과가 다음 단계의 입력 상태가 되도록 올바른 순서로 배치해야 합니다.',
    },
    code: {
      entryFunction: 'assemble_patrol_energy',
      starterCode: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    # 앞뒤 상태를 연결하는 한 명령이 빠져 있어요.
    energy = energy - shield
    return energy
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { initial_energy: 2, charge: 3, boost: 4, shield: 5 }, expected: 15 },
      { inputs: { initial_energy: 10, charge: 5, boost: 2, shield: 6 }, expected: 24 },
    ],
  },
})
