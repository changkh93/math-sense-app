/**
 * Problem: AC-SET-UNIQUE-01 (서로 다른 광물은 몇 종?)
 * Constellation: 4 (집합과 기록표)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 41
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SET_UNIQUE_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-SET-UNIQUE-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 41,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-SEQ-005'],
    transferTemplateId: 'unique-count-v1',
  },
  identity: {
    studentTitle: '서로 다른 광물은 몇 종?',
    subtitle: '채굴된 광물 목록에서 중복을 없애고 고유한 광물 종류의 수를 계산하세요.',
  },
  pythonConcepts: {
    requires: ['builtin:list'],
    introduces: ['builtin:set', 'builtin:len'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:deduplicate-then-measure'],
  },
  evidenceRecipe: {
    primitives: ['container-membership', 'container-scan'],
    requiredClaims: ['SET_DEDUPLICATION_COUNT'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "광물 목록 ['철', '철', '얼음', '철', '수정']에서 서로 다른 광물 종류는 몇 개일까요?",
      options: ['3개 (철, 얼음, 수정)', '5개', '2개', '1개'],
      expected: '3개 (철, 얼음, 수정)',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '💎 광물 고유 수집함',
          description: '광물 목록에서 같은 이름을 하나로 모으면 고유한 종류만 남습니다.',
          variables: [
            { name: 'current', value: '"수정"', label: '확인한 광물' },
            { name: 'uniqueMinerals', value: '["철", "얼음", "수정"]', label: '고유 광물 보관함' },
            { name: 'kindCount', value: '3', label: '종류 수' },
          ],
          guidance: '같은 광물이 여러 번 나와도 고유 종류 수는 한 번만 늘어나는 점을 확인하세요.',
        },
        initialState: { current: null, uniqueMinerals: [], kindCount: 0 },
        initialStateLabel: '시작: 빈 고유 보관함, 종류 0',
        initialStepTitle: '🚀 시작 (광물 수신 대기)',
        initialPrompt: '첫 번째 광물부터 고유 보관함에 담습니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 광물 "철" 도착',
            operationLabel: '처음 본 광물이므로 고유 보관함에 기록',
            codeSnippet: '# 첫 광물 "철" 등록 -> 종류 1',
            prompt: '첫 번째 광물 "철"이 고유 보관함에 등록되어 종류 수가 1이 됩니다.',
            stateAfter: { current: '철', uniqueMinerals: ['철'], kindCount: 1 },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 광물 "철" 도착 (중복)',
            operationLabel: '이미 기록한 광물이므로 종류 수 유지',
            codeSnippet: '# 이미 있는 광물이므로 중복 무시',
            prompt: '두 번째 "철"은 이미 고유 보관함에 있으므로 종류 수가 늘어나지 않고 1로 유지됩니다.',
            stateAfter: { current: '철', uniqueMinerals: ['철'], kindCount: 1 },
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 광물 "얼음" 도착',
            operationLabel: '처음 본 광물이므로 고유 보관함에 기록',
            codeSnippet: '# 새 광물 "얼음" 등록 -> 종류 2',
            prompt: '새로운 광물 "얼음"이 들어와 고유 종류 수가 2로 증가합니다.',
            stateAfter: { current: '철', uniqueMinerals: ['철', '얼음'], kindCount: 2 },
          },
          {
            id: 'f3',
            stepTitle: '④ 3번 광물 "철" 도착 (중복)',
            operationLabel: '이미 기록한 광물이므로 종류 수 유지',
            codeSnippet: '# 중복 광물이므로 종류 2 유지',
            prompt: '다시 도착한 "철"은 이미 기록했으므로 종류 수가 2로 유지됩니다.',
            stateAfter: { current: '철', uniqueMinerals: ['철', '얼음'], kindCount: 2 },
          },
          {
            id: 'f4',
            stepTitle: '⑤ 4번 광물 "수정" 도착',
            operationLabel: '처음 본 광물이므로 고유 보관함에 기록',
            codeSnippet: '# 새 광물 "수정" 등록 -> 최종 종류 3',
            prompt: '새로운 광물 "수정"이 들어와 최종 종류 수 3이 완성됩니다.',
            stateAfter: { current: '수정', uniqueMinerals: ['철', '얼음', '수정'], kindCount: 3 },
          },
        ],
        predictionPrompt: '서로 다른 종류 수 3을 반환하세요.',
        rulePrompt: '중복을 합쳐 고유한 종류만 세는 규칙',
        ruleStatement: '같은 이름은 한 번만 기록하고, 남은 고유한 항목의 개수를 재면 서로 다른 광물 종류 수가 됩니다.',
      },
    },
    code: {
      entryFunction: 'count_unique_minerals',
      starterCode: `def count_unique_minerals(minerals):
    # 중복을 하나로 모아 서로 다른 광물 종류의 수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { minerals: ['철', '철', '얼음', '수정'] }, expected: 3 },
      { inputs: { minerals: ['금', '금', '금'] }, expected: 1 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_set_041_1',
        title: '★★ 집합의 중복 제거와 크기 측정',
        type: 'trace_understanding',
        prompt: '광물 목록에서 고유한 종류를 세는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: "minerals = ['철', '철', '얼음', '철', '수정']일 때 집합으로 모은 뒤 측정한 종류 수는 얼마일까요?",
            options: [
              { value: '3', label: '3개' },
              { value: '5', label: '5개' },
            ],
            expected: '3',
          },
          {
            id: 'q2',
            text: '같은 광물("철")이 여러 번 들어와도 집합의 종류 수가 늘어나지 않는 이유는 무엇일까요?',
            options: [
              { value: 'set_unique', label: '집합(Set)은 같은 값을 한 번만 보관하는 특성이 있기 때문' },
              { value: 'error', label: '오류가 발생하기 때문' },
            ],
            expected: 'set_unique',
          },
          {
            id: 'q3',
            text: '빈 목록 []이 주어졌을 때 서로 다른 종류 수가 0이 되는 이유는 무엇일까요?',
            options: [
              { value: 'empty_set', label: '담긴 광물이 없어 집합에 원소가 하나도 없기 때문' },
              { value: 'always_one', label: '최소 1개는 있어야 하기 때문' },
            ],
            expected: 'empty_set',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_set_041_transfer_1',
        title: '고유 행성 방문 수',
        description: '방문한 행성 코드 목록(planets)에서 중복을 제외한 서로 다른 방문 행성 수를 반환하세요.',
        contextCard: {
          title: '📋 고유 행성 종류 수 측정 사고 흐름',
          steps: [
            { label: '관찰', text: '방문 기록 목록에 적힌 행성 코드들을 확인합니다.' },
            { label: '구분', text: '중복 방문한 행성을 하나로 모아 집합으로 구성합니다.' },
            { label: '상태 갱신', text: '완성된 집합의 크기를 측정하여 고유한 행성 수를 구합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '광물 이름에서 행성 코드로 바뀌었을 때 중복을 없애고 종류를 세는 원리는 어떻게 될까요?',
          options: [
            { id: 'opt_same_set', label: '자료의 이름만 달라졌을 뿐, 집합으로 중복을 없애고 개수를 재는 원리는 완전히 동일하다', isCorrect: true },
            { id: 'opt_diff_set', label: '행성 코드는 집합으로 중복을 없앨 수 없다', isCorrect: false },
          ],
          feedback: '맞아요! 집합(set)과 len()을 활용하면 어떤 종류의 데이터든 고유한 항목 수를 정확히 구할 수 있습니다.',
        },
        entryFunction: 'count_unique_planets',
        starterCode: `def count_unique_planets(planets):
    # 방문한 서로 다른 행성의 수를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { planets: ['Earth', 'Mars', 'Earth', 'Jupiter'] }, expected: 3 },
          { inputs: { planets: ['Moon', 'Moon'] }, expected: 1 },
        ],
      },
    ],
  },
})
