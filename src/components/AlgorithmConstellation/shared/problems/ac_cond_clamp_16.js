import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_CLAMP_16 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-CLAMP-16',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-RANGE-15'],
  },
  identity: {
    studentTitle: '최대 출력 제한기',
    subtitle: '요청 출력이 안전 한도를 넘으면 최대치로 제한하고 정상 범위는 그대로 유지하는 상한 제한 규칙을 작성합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:comparison-lower-bound',
      'statement:if',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:upper-clamp'],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: ['upper-clamp-preservation', 'upper-clamp-bounding'],
  },
  modes: {
    observe: {
      prompt: '최대 출력이 100일 때 80 요청은 80, 120 요청은 100으로 제한됩니다. 정확히 100을 요청하면 최종 출력은 얼마일까요?',
      expected: '100 (최대 출력 그대로)',
      options: ['100 (최대 출력 그대로)', '0', '120', '80'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { requestedPower: 0, maxPower: 100, finalPower: 0, status: '대기 중' },
      frames: [
        {
          id: 'case_normal',
          operationLabel: '정상 범위 요청 (80)',
          prompt: '80은 최대 한도 100 이하이므로 요청값 80이 그대로 출력됩니다.',
          stateAfter: { requestedPower: 80, maxPower: 100, finalPower: 80, status: '요청값 유지' },
        },
        {
          id: 'case_exact_limit',
          operationLabel: '경계값 요청 (100)',
          prompt: '100은 최대 출력과 정확히 같으므로 줄이지 않고 100 그대로 출력됩니다.',
          stateAfter: { requestedPower: 100, maxPower: 100, finalPower: 100, status: '경계값 유지' },
        },
        {
          id: 'case_exceeded',
          operationLabel: '한도 초과 요청 (120)',
          prompt: '120은 최대 한도 100을 초과하므로 안전 한도인 100으로 제한됩니다.',
          stateAfter: { requestedPower: 120, maxPower: 100, finalPower: 100, status: '최대치로 제한' },
        },
        {
          id: 'case_extreme',
          operationLabel: '극단적 초과 요청 (500)',
          prompt: '500처럼 아무리 큰 값이 들어와도 안전 한도 100을 넘을 수 없습니다.',
          stateAfter: { requestedPower: 500, maxPower: 100, finalPower: 100, status: '최대치로 제한' },
        },
      ],
      predictionPrompt: '요청 출력이 최대 한도를 넘을 때 최종 출력은 어떤 값이어야 할까요?',
      rulePrompt: '안전한 요청은 보존하고, 한도를 넘은 요청만 최대치로 되돌리는 규칙을 찾아보세요.',
      ruleStatement: '요청 출력이 최대 출력을 초과하면 최대 출력을, 그렇지 않으면 요청 출력을 그대로 반환합니다.',
    },
    code: {
      entryFunction: 'clamp_engine_power',
      starterCode: `def clamp_engine_power(requested_power, max_power):
    # 요청 출력이 안전 한도를 넘지 않도록 최종 출력을 결정하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { requested_power: 40, max_power: 100 }, expected: 40 },
      { inputs: { requested_power: 100, max_power: 100 }, expected: 100 },
      { inputs: { requested_power: 120, max_power: 100 }, expected: 100 },
    ],
  },
})
