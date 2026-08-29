import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_ELIF_14 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-ELIF-14',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-001', 'AC-EXP-BOUND-05'],
  },
  identity: {
    studentTitle: '세 단계 위험 신호',
    subtitle: '위험도 점수(0~100)를 위에서부터 비교하여 서로 겹치지 않는 세 단계 결과 중 하나를 선택합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:comparison-bound',
    ],
    introduces: ['operator:comparison-lower-bound', 'statement:elif'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: ['multi-way-exclusive-branching'],
  },
  modes: {
    observe: {
      prompt: '점수 90은 80 이상이면서 동시에 50 이상이기도 합니다. 결과는 하나만 선택되어야 할 때, 어느 단계가 먼저 검사되어야 할까요?',
      expected: '80 이상 (더 높은 위험도)',
      options: ['80 이상 (더 높은 위험도)', '50 이상 (더 낮은 위험도)', '순서는 상관없다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { status: '위험도 분류 전' },
      frames: [
        {
          id: 'case_safe',
          operationLabel: '안전 구역 (score=49)',
          prompt: '49는 높은 위험 기준과 경고 기준을 모두 넘지 않으므로 마지막 SAFE 구역이 선택됩니다.',
          stateAfter: { score: 49, firstCheck: false, secondCheck: false, selected: 'SAFE' },
        },
        {
          id: 'case_warning_low',
          operationLabel: '경고 구역 시작 (score=50)',
          prompt: '50은 80 이상은 False이지만, 두 번째 조건(50 이상)이 True이므로 WARNING이 선택됩니다.',
          stateAfter: { score: 50, firstCheck: false, secondCheck: true, selected: 'WARNING' },
        },
        {
          id: 'case_warning_high',
          operationLabel: '경고 구역 상한 (score=79)',
          prompt: '79도 80 이상은 False이고, 50 이상이 True이므로 WARNING이 선택됩니다.',
          stateAfter: { score: 79, firstCheck: false, secondCheck: true, selected: 'WARNING' },
        },
        {
          id: 'case_critical_low',
          operationLabel: '위험 구역 시작 (score=80)',
          prompt: '80은 첫 번째 높은 위험 기준을 만족하므로 CRITICAL이 선택되고, 두 번째 기준은 검사하지 않습니다.',
          stateAfter: { score: 80, firstCheck: true, secondCheck: 'skipped', selected: 'CRITICAL' },
        },
        {
          id: 'case_critical_high',
          operationLabel: '위험 구역 (score=90)',
          prompt: '90도 첫 조건이 True이므로 즉시 CRITICAL이 반환됩니다.',
          stateAfter: { score: 90, firstCheck: true, secondCheck: 'skipped', selected: 'CRITICAL' },
        },
      ],
      predictionPrompt: '점수가 여러 기준을 동시에 만족할 때 어느 기준을 먼저 확인해야 한 결과만 정확히 선택할 수 있을까요?',
      rulePrompt: '순서 있는 여러 기준은 어떻게 평가될까요?',
      ruleStatement: '기준을 위에서부터 확인하고 처음 만족한 한 구역만 선택합니다. 먼저 만족한 기준이 있으면 아래 기준은 더 검사하지 않습니다.',
    },
    code: {
      entryFunction: 'classify_hazard_level',
      starterCode: `def classify_hazard_level(danger_score):
    # 80 이상은 "CRITICAL", 50 이상은 "WARNING", 나머지는 "SAFE"입니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { danger_score: 90 }, expected: 'CRITICAL' },
      { inputs: { danger_score: 65 }, expected: 'WARNING' },
      { inputs: { danger_score: 30 }, expected: 'SAFE' },
    ],
  },
})
