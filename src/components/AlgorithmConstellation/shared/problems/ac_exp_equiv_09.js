import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_EQUIV_09 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-EQUIV-09',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: [
      'AC-EXP-STEP-03',
      'AC-EXP-BOUND-05',
      'AC-CODE-FIRST-ERROR-01',
    ],
  },
  identity: {
    studentTitle: '두 코드, 같은 항로?',
    subtitle: '겉모습이 다른 두 연산 절차가 모든 입력에서 항상 같은지 비교하고, 곱셈 우선순위로 인한 반례를 탐색합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:counterexample-search'],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['algebraic-equivalence-and-counterexample-search'],
  },
  modes: {
    observe: {
      prompt: 'A: (pos + boost) * 2 와 B: pos * 2 + boost * 2 에 pos=3, boost=4를 대입하면 두 결과는 모두 14로 같을까요?',
      expected: '모두 14로 같다',
      options: ['모두 14로 같다', 'A만 14이다', 'B만 14이다', '둘 다 다르다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { status: '세 항로 비교 전' },
      frames: [
        {
          id: 'case_zero_pos',
          operationLabel: '입력 (pos=0, boost=5)',
          prompt: 'pos=0일 때는 세 항로가 모두 10으로 우연히 일치합니다.',
          stateAfter: { pos: 0, boost: 5, routeA: 10, routeB: 10, routeC: 10 },
        },
        {
          id: 'case_counterexample',
          operationLabel: '반례 발견 (pos=1, boost=0)',
          prompt: 'pos=1, boost=0을 대입하자 C는 1이 되어 A, B(2)와 달라졌습니다!',
          stateAfter: { pos: 1, boost: 0, routeA: 2, routeB: 2, routeC: 1 },
        },
        {
          id: 'case_general',
          operationLabel: '일반 입력 (pos=3, boost=4)',
          prompt: 'A와 B는 항상 14로 같지만, 괄호 없는 C는 곱셈 우선순위 때문에 11이 됩니다.',
          stateAfter: { pos: 3, boost: 4, routeA: 14, routeB: 14, routeC: 11 },
        },
      ],
      predictionPrompt: 'A=(pos+boost)*2, B=pos*2+boost*2, C=pos+boost*2를 작은 입력부터 비교해 보세요. 한 번 같았다는 사실만으로 항상 같다고 할 수 있을까요?',
      rulePrompt: '동치와 반례를 어떻게 확인할까요?',
      ruleStatement: 'A와 B는 모든 허용 입력에서 같은 결과를 냅니다. 하지만 C는 pos=1, boost=0 같은 반례에서 달라지므로 항상 같은 항로가 아닙니다.',
    },
    code: {
      entryFunction: 'expand_equivalent_route',
      starterCode: `def expand_equivalent_route(pos, boost):
    # 묶어서 두 배 한 항로((pos + boost) * 2)와 같은 도착값을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { pos: 3, boost: 4 }, expected: 14 },
      { inputs: { pos: 1, boost: 0 }, expected: 2 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_exp_equiv_09_1',
        title: '★★ 연산자 우선순위와 동치 판별',
        type: 'single-choice',
        prompt: 'A: (pos + boost) * 2 와 C: pos + boost * 2 의 실행 결과를 비교해 보세요.',
        questions: [
          {
            id: 'q1',
            text: 'pos=2, boost=3 일 때 A((2+3)*2)와 C(2+3*2)의 계산 결과는 각각 얼마일까요?',
            options: [
              { value: '10과 8', label: '10과 8' },
              { value: '10과 10', label: '10과 10' },
              { value: '8과 8', label: '8과 8' },
            ],
            expected: '10과 8',
          },
          {
            id: 'q2',
            text: 'A와 C의 결과가 달라지는 가장 작은 반례 입력(pos, boost)은 무엇일까요?',
            options: [
              { value: 'pos=1, boost=0 (결과 2와 1로 다름)', label: 'pos=1, boost=0 (결과 2와 1로 다름)' },
              { value: 'pos=0, boost=5 (결과 10으로 같음)', label: 'pos=0, boost=5 (결과 10으로 같음)' },
            ],
            expected: 'pos=1, boost=0 (결과 2와 1로 다름)',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_exp_equiv_09_transfer_1',
        title: '세 신호 묶음의 분배 전개',
        description: '세 신호(a, b, c)를 더한 뒤 두 배로 묶은 (a + b + c) * 2 와 항상 같은 결과를 반환하는 함수를 작성하세요.',
        contextCard: {
          title: '📋 분배 법칙 전개',
          steps: [
            { label: '① 괄호로 묶인 식', text: '(a + b + c) * 2' },
            { label: '② 각 항에 분배한 식', text: 'a * 2 + b * 2 + c * 2' },
          ],
        },
        thoughtCheck: {
          prompt: '(a + b + c) * 2 에서 괄호를 풀 때 곱하기 2는 어떤 항들에 적용되어야 할까요?',
          options: [
            { id: 'opt_all', label: 'a, b, c 모든 항에 각각 곱해진다', isCorrect: true },
            { id: 'opt_c', label: '마지막 c에만 곱해진다', isCorrect: false },
          ],
          feedback: '맞아요! 분배법칙에 의해 괄호 안의 모든 항에 동일한 배수가 곱해져야 동치 관계가 성립합니다.',
        },
        entryFunction: 'expand_three_signals',
        starterCode: `def expand_three_signals(a, b, c):
    # (a + b + c) * 2 와 항상 같은 결과를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { a: 1, b: 2, c: 3 }, expected: 12 },
          { inputs: { a: 0, b: 5, c: 10 }, expected: 30 },
          { inputs: { a: 4, b: 0, c: 6 }, expected: 20 },
          { inputs: { a: 10, b: 20, c: 30 }, expected: 120 },
        ],
      },
    ],
  },
})
