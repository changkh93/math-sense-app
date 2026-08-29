import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_GRADE_17 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-GRADE-17',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-ELIF-14'],
  },
  identity: {
    studentTitle: '탐사 등급 분류기',
    subtitle: '뒤섞인 점수 기준을 올바른 순서로 검사하여 알맞은 탐사 등급(S, A, B, C)을 결정하는 다중 분기 전략을 작성합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:comparison-lower-bound',
      'statement:elif',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: [
      'ordered-threshold-priority',
      'first-matching-branch-stops',
      'fallback-covers-remaining-values',
    ],
  },
  modes: {
    observe: {
      prompt: '뒤섞여 제시된 등급 기준(A: 80점 이상, C: 나머지, S: 90점 이상, B: 70점 이상)에서 92점이 B가 아닌 최고 등급 S를 받으려면 어떤 조건을 가장 먼저 검사해야 할까요?',
      expected: '90점 이상 조건',
      options: ['90점 이상 조건', '70점 이상 조건', '80점 이상 조건', '순서는 상관없다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { score: 0, checkedBranches: '미검사', finalGrade: '대기 중' },
      frames: [
        {
          id: 'case_top_tier',
          operationLabel: '최고 등급 경계 (92)',
          prompt: '92는 90 이상이 참이므로 첫 번째 분기에서 즉시 S가 반환되고 아래 조건들은 모두 건너뜁니다(skipped).',
          stateAfter: { score: 92, checkedBranches: '90이상: 참 (즉시 반환)', finalGrade: 'S' },
        },
        {
          id: 'case_a_tier',
          operationLabel: 'A 등급 경계 (89)',
          prompt: '89는 90 이상은 거짓이지만, 80 이상이 참이므로 A 등급에서 멈춥니다.',
          stateAfter: { score: 89, checkedBranches: '90이상: 거짓 -> 80이상: 참', finalGrade: 'A' },
        },
        {
          id: 'case_b_tier',
          operationLabel: 'B 등급 경계 (79)',
          prompt: '79는 90과 80 이상을 지나 70 이상에서 참이 되어 B 등급이 반환됩니다.',
          stateAfter: { score: 79, checkedBranches: '90/80 거짓 -> 70이상: 참', finalGrade: 'B' },
        },
        {
          id: 'case_low_tier',
          operationLabel: '기본 등급 (69)',
          prompt: '69는 90, 80, 70 이상 조건이 모두 거짓이므로 마지막 C 등급이 반환됩니다.',
          stateAfter: { score: 69, checkedBranches: '모든 명시 조건 거짓', finalGrade: 'C' },
        },
      ],
      predictionPrompt: '겹치는 기준에서 높은 등급을 놓치지 않으려면 어떤 조건을 먼저 검사해야 할까요?',
      rulePrompt: '위에서부터 처음 참인 조건에서 판정이 끝난다는 점을 이용해 기준 순서를 정해 보세요.',
      ruleStatement: '이상 기준은 더 높은 경계부터 낮은 경계 순으로 검사해야 가장 알맞은 등급을 반환합니다.',
    },
    code: {
      entryFunction: 'evaluate_exploration_grade',
      starterCode: `def evaluate_exploration_grade(score):
    # 뒤섞인 등급 기준 카드를 알맞은 검사 순서로 정리해 등급을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { score: 92 }, expected: 'S' },
      { inputs: { score: 85 }, expected: 'A' },
      { inputs: { score: 75 }, expected: 'B' },
      { inputs: { score: 60 }, expected: 'C' },
    ],
  },
})
