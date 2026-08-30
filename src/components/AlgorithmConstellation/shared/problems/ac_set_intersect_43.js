import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SET_INTERSECT_43 = createCapabilityPrototypeKernel({
  problemId: 'AC-SET-INTERSECT-43',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 43,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-SET-MEMBERSHIP-42'],
  },
  identity: {
    studentTitle: '두 기지가 공통으로 가진 부품',
    subtitle: '두 탐사 기지의 부품 목록(base_a, base_b)에 모두 존재하는 서로 다른 부품의 종류 수를 계산합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'builtin:set',
      'builtin:len',
      'statement:for',
      'statement:if',
      'operator:membership-in',
    ],
    introduces: ['method:set_add'],
  },
  thinkingPatterns: {
    requires: ['pattern:membership-query'],
    introduces: ['pattern:intersection-by-membership'],
  },
  evidenceRecipe: {
    primitives: ['container-membership', 'container-scan', 'decision'],
    requiredClaims: ['SET_INTERSECTION_COUNT'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "기지A [A, A, B, C]와 기지B [A, C, D]가 있을 때, 두 기지에 모두 있는 서로 다른 부품 종류는 몇 개일까요?",
      options: [
        { value: 'two_common', label: '2개 (A, C)' },
        { value: 'three_common', label: '3개 (A가 2번 들어감)' },
        { value: 'four_common', label: '4개' },
      ],
      expected: 'two_common',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔧 공통 부품 수집기',
          description: '기지A [A, A, B, C]의 부품을 하나씩 보며 기지B [A, C, D]에도 있는 부품만 공통 보관함에 한 번씩 담습니다.',
          variables: [
            { name: 'part', value: '"C"', label: '확인 부품' },
            { name: 'commonSet', value: '["A", "C"]', label: '공통 집합' },
            { name: 'commonCount', value: '2', label: '공통 종류 수' },
          ],
          guidance: '중복 부품(A)이 여러 번 들어와도 공통 집합의 크기는 한 번만 증가하는 점을 확인하세요.',
        },
        initialState: { part: null, commonSet: [], commonCount: 0 },
        initialStateLabel: '시작: 빈 공통 보관함',
        initialStepTitle: '🚀 시작 (기지A 순회)',
        initialPrompt: '기지A의 첫 부품부터 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 부품 "A" 확인',
            operationLabel: 'A는 두 목록에 모두 있음 -> 공통 보관함에 기록',
            codeSnippet: '# "A"는 B에도 있음 -> 공통 집합에 추가',
            prompt: '첫 번째 부품 "A"가 기지B에도 있으므로 공통 집합에 등록합니다.',
            stateAfter: { part: 'A', commonSet: ['A'], commonCount: 1 },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 부품 "A" 확인 (중복)',
            operationLabel: 'A는 이미 공통 보관함에 있음 -> 유지',
            codeSnippet: '# "A"는 이미 공통 집합에 존재',
            prompt: '두 번째 "A"도 B에 있지만 집합 특성상 크기가 늘어나지 않고 1로 유지됩니다.',
            stateAfter: { part: 'A', commonSet: ['A'], commonCount: 1 },
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 부품 "B" 확인',
            operationLabel: 'B는 두 번째 목록에 없음 -> 기록하지 않음',
            codeSnippet: '# "B"는 B에 없음 -> 건너뜀',
            prompt: '세 번째 부품 "B"는 기지B에 없으므로 추가하지 않습니다.',
            stateAfter: { part: 'B', commonSet: ['A'], commonCount: 1 },
          },
          {
            id: 'f3',
            stepTitle: '④ 3번 부품 "C" 확인',
            operationLabel: 'C는 두 목록에 모두 있음 -> 공통 보관함에 기록',
            codeSnippet: '# "C"는 B에도 있음 -> 공통 집합에 추가',
            prompt: '네 번째 부품 "C"가 기지B에도 있으므로 공통 집합에 등록하여 최종 2개가 됩니다.',
            stateAfter: { part: 'C', commonSet: ['A', 'C'], commonCount: 2 },
          },
        ],
        predictionPrompt: '공통 부품 종류 수 2를 반환하세요.',
        rulePrompt: '공통 부품 집합 구성 규칙',
        ruleStatement: '첫 목록을 돌며 다른 목록에도 있는 부품만 공통 보관함에 한 번씩 기록하면 공통 종류 수를 정확히 셀 수 있습니다.',
      },
    },
    code: {
      entryFunction: 'count_common_parts',
      starterCode: `def count_common_parts(base_a, base_b):
    # 두 기지에 모두 있는 서로 다른 부품 종류 수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { base_a: ['A', 'A', 'B', 'C'], base_b: ['A', 'C', 'D'] }, expected: 2 },
      { inputs: { base_a: ['X', 'Y'], base_b: ['A', 'B'] }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_set_intersect_43_1',
        title: '★★ 공통 항목 탐색과 교집합 구성',
        type: 'trace_understanding',
        prompt: '두 목록의 공통 항목 수를 구하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: "기지A에 'A'가 2개 있고 기지B에 'A'가 1개 있을 때, 공통 종류 수가 1개로 계산되는 이유는 무엇일까요?",
            options: [
              { value: 'set_dedup', label: '공통 보관함을 집합(Set)으로 관리하여 동일한 부품은 한 번만 세기 때문' },
              { value: 'ignore_first', label: '첫 번째 A를 무시하기 때문' },
            ],
            expected: 'set_dedup',
          },
          {
            id: 'q2',
            text: '기지A와 기지B의 입력 순서를 서로 바꿔서 실행해도 공통 종류 수는 어떻게 될까요?',
            options: [
              { value: 'same_result', label: '공통으로 존재하는 부품의 종류는 순서가 바뀌어도 항상 동일하다' },
              { value: 'different_result', label: '순서에 따라 달라진다' },
            ],
            expected: 'same_result',
          },
          {
            id: 'q3',
            text: '어느 한 기지의 부품 목록이 빈 목록 []이면 공통 부품 수는 얼마일까요?',
            options: [
              { value: 'always_zero', label: '공통으로 존재할 부품이 없으므로 항상 0이다' },
              { value: 'other_len', label: '다른 기지의 전체 부품 수이다' },
            ],
            expected: 'always_zero',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_set_intersect_43_t1',
        title: '팀 공통 배지 종류 수',
        description: '두 탐사팀이 보유한 배지 목록(badges_a, badges_b)에서 두 팀 모두가 보유하고 있는 서로 다른 배지 종류의 수를 반환하세요.',
        contextCard: {
          title: '📋 공통 배지 종류 수 측정 사고 흐름',
          steps: [
            { label: '관찰', text: '두 팀의 배지 목록을 확인합니다.' },
            { label: '구분', text: '첫 번째 팀의 배지를 순회하며 두 번째 팀에도 있는 배지만 고릅니다.' },
            { label: '상태 갱신', text: '공통 집합에 배지를 기록한 뒤 최종 집합 크기를 반환합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '부품 목록에서 팀 배지 목록으로 도메인이 바뀌었을 때 공통 종류를 세는 원리는 어떻게 될까요?',
          options: [
            { id: 'opt_same_intersect', label: '자료의 의미만 달라졌을 뿐, 두 목록에 모두 존재하는 원소를 집합으로 모아 크기를 재는 원리는 완전히 동일하다', isCorrect: true },
            { id: 'opt_diff_intersect', label: '배지는 공통 개수를 셀 수 없다', isCorrect: false },
          ],
          feedback: '맞아요! 두 집단 사이의 공통 원소를 집합으로 모으면 어떤 도메인이든 고유 공통 종류를 정확히 계산할 수 있습니다.',
        },
        entryFunction: 'count_shared_badges',
        starterCode: `def count_shared_badges(badges_a, badges_b):
    # 두 팀이 공통으로 가진 서로 다른 배지 종류 수를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { badges_a: ['STAR', 'MOON', 'SUN'], badges_b: ['MOON', 'STAR', 'COMET'] }, expected: 2 },
          { inputs: { badges_a: ['ALPHA'], badges_b: ['BETA'] }, expected: 0 },
        ],
      },
    ],
  },
})
