import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_ORDER_20 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-ORDER-20',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-GRADE-17'],
  },
  identity: {
    studentTitle: '조건의 순서가 바꾸는 결과',
    subtitle: '다중 분기에서 조건 순서가 잘못되어 상위 할인을 가리는 버그 코드를 반례로 분석하고 수리합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:comparison-bound',
      'operator:comparison-lower-bound',
      'statement:elif',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:counterexample-search'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['source-debug', 'decision'],
    requiredClaims: [
      'matching-samples-do-not-prove-equivalence',
      'first-counterexample-at-overlap-boundary',
      'narrower-threshold-must-run-first',
    ],
  },
  modes: {
    observe: {
      prompt: '정책상 1000원 이상은 300원, 500원 이상은 100원 할인입니다. 버그 코드(500 이상 먼저 검사)는 600원에서 100원을 정상 할인했습니다. 이 코드는 모든 금액에서 항상 맞을까요?',
      expected: '아니다 (1000원 이상에서 상위 할인을 놓치는 반례 발생)',
      options: [
        '아니다 (1000원 이상에서 상위 할인을 놓치는 반례 발생)',
        '항상 맞다',
        '500원 미만에서만 틀린다',
      ],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { amount: 0, policyExpected: 0, bugOutput: 0, status: '검증 전' },
      frames: [
        {
          id: 'case_amt_200',
          operationLabel: '금액 200 (할인 없음)',
          prompt: '200은 정책(0)과 버그 코드(0)의 결과가 일치합니다.',
          stateAfter: { amount: 200, policyExpected: 0, bugOutput: 0, status: '일치' },
        },
        {
          id: 'case_amt_600',
          operationLabel: '금액 600 (중간 할인)',
          prompt: '600은 정책(100)과 버그 코드(100)의 결과가 일치하여 버그가 드러나지 않습니다.',
          stateAfter: { amount: 600, policyExpected: 100, bugOutput: 100, status: '일치' },
        },
        {
          id: 'case_amt_999',
          operationLabel: '금액 999 (중간 할인 경계)',
          prompt: '999까지도 정책(100)과 버그 코드(100)가 같습니다.',
          stateAfter: { amount: 999, policyExpected: 100, bugOutput: 100, status: '일치' },
        },
        {
          id: 'case_amt_1000',
          operationLabel: '금액 1000 (첫 경계 반례)',
          prompt: '1000은 정책상 300이어야 하지만, 버그 코드가 500 이상에 먼저 걸려 100만 반환하는 첫 번째 반례입니다!',
          stateAfter: { amount: 1000, policyExpected: 300, bugOutput: 100, status: '반례 발견 (불일치)' },
        },
        {
          id: 'case_amt_1200',
          operationLabel: '금액 1200 (상위 구간 불일치)',
          prompt: '1000 이상의 모든 상위 구간에서 버그 코드는 상위 할인을 가로채어 계속 틀립니다.',
          stateAfter: { amount: 1200, policyExpected: 300, bugOutput: 100, status: '불일치 영역' },
        },
      ],
      predictionPrompt: '몇 개의 금액에서 결과가 같다는 사실만으로 이 코드가 항상 맞다고 말할 수 있을까요?',
      rulePrompt: '두 조건을 동시에 만족하기 시작하는 경계값에서 버그 코드의 결과를 확인해 보세요.',
      ruleStatement: '조건이 겹치면 더 좁고 높은 기준을 먼저 검사해야 하며, 첫 반례는 겹침이 시작되는 경계에서 찾을 수 있습니다.',
    },
    code: {
      entryFunction: 'apply_discount_priority',
      starterCode: `def apply_discount_priority(amount):
    # 아래 코드는 1000 이상 금액에서 상위 할인을 놓칩니다. 최소한으로 고쳐 보세요.
    if amount >= 500:
        return 100
    elif amount >= 1000:
        return 300
    return 0
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { amount: 200 }, expected: 0 },
      { inputs: { amount: 600 }, expected: 100 },
      { inputs: { amount: 1200 }, expected: 300 },
    ],
  },
})
