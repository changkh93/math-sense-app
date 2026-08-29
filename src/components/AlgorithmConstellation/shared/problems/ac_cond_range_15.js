import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_RANGE_15 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-RANGE-15',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-002', 'AC-COND-ELIF-14'],
  },
  identity: {
    studentTitle: '안전 온도 구간',
    subtitle: '최소 온도와 최대 온도 사이의 닫힌 구간(경계선 포함)에 현재 온도가 들어오는지 and 논리곱으로 판정합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:and',
      'operator:or',
      'operator:comparison-bound',
      'operator:comparison-lower-bound',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: ['bounded-interval-checking'],
  },
  modes: {
    observe: {
      prompt: '안전 구간이 10부터 30까지이고 두 경계선(10, 30)도 포함됩니다. 9, 10, 20, 30, 31 가운데 안전한 온도는 몇 개일까요?',
      expected: '3개 (10, 20, 30)',
      options: ['3개 (10, 20, 30)', '1개 (20만)', '5개 모두', '2개 (10, 30)'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { minTemp: 10, maxTemp: 30, status: '경계 관측 전' },
      frames: [
        {
          id: 'case_below',
          operationLabel: '하한 미달 (temp=9)',
          prompt: '9는 10 이상이 아니므로 안전 구간 밖(False)입니다.',
          stateAfter: { temp: 9, lowerPassed: false, upperPassed: true, safe: false },
        },
        {
          id: 'case_lower_bound',
          operationLabel: '하한 경계 (temp=10)',
          prompt: '10은 하한선 위(>= 10)이자 상한선 아래(<= 30)이므로 안전(True)입니다.',
          stateAfter: { temp: 10, lowerPassed: true, upperPassed: true, safe: true, position: 'lower-boundary' },
        },
        {
          id: 'case_inside',
          operationLabel: '구간 내부 (temp=20)',
          prompt: '20은 두 경계선 사이 내부이므로 안전(True)입니다.',
          stateAfter: { temp: 20, lowerPassed: true, upperPassed: true, safe: true, position: 'inside' },
        },
        {
          id: 'case_upper_bound',
          operationLabel: '상한 경계 (temp=30)',
          prompt: '30도 상한선 위(<= 30)이자 하한선 위(>= 10)이므로 안전(True)입니다.',
          stateAfter: { temp: 30, lowerPassed: true, upperPassed: true, safe: true, position: 'upper-boundary' },
        },
        {
          id: 'case_above',
          operationLabel: '상한 초과 (temp=31)',
          prompt: '31은 30 이하 조건을 벗어나므로 안전 구간 밖(False)입니다.',
          stateAfter: { temp: 31, lowerPassed: true, upperPassed: false, safe: false },
        },
      ],
      predictionPrompt: '하한 아래, 두 경계선 위, 구간 내부, 상한 위의 결과를 차례대로 비교해 보세요.',
      rulePrompt: '두 경계선 사이의 안전 구간은 어떻게 판정할까요?',
      ruleStatement: '현재 온도가 하한 이상이고 동시에 상한 이하일 때만 안전합니다. 정확한 하한과 상한도 안전 구간에 포함됩니다.',
    },
    code: {
      entryFunction: 'is_temperature_safe',
      starterCode: `def is_temperature_safe(temp, min_temp, max_temp):
    # 두 경계선 위를 포함한 안전 구간인지 판정하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { temp: 20, min_temp: 10, max_temp: 30 }, expected: true },
      { inputs: { temp: 10, min_temp: 10, max_temp: 30 }, expected: true },
      { inputs: { temp: 35, min_temp: 10, max_temp: 30 }, expected: false },
    ],
  },
})
