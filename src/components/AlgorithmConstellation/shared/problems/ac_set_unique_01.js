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
    introduces: { concept: 'deduplication', pythonTool: 'builtin:set' },
    lensId: 'set-frequency-lens',
    transferTemplateId: 'unique-count-v1',
  },
  identity: {
    studentTitle: '서로 다른 광물은 몇 종?',
    subtitle: '채굴된 광물 목록에서 중복을 없애고 고유한 광물 종류의 수를 계산하세요.',
  },
  evidenceRecipe: {
    primitives: ['container-membership', 'container-scan'],
    requiredClaims: ['SET_DEDUPLICATION_COUNT'],
  },
  pythonConcepts: {
    requires: ['builtin:list'],
    introduces: ['builtin:set', 'method:set_add'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "광물 목록 ['철', '철', '얼음', '철', '수정']에서 서로 다른 광물 종류는 몇 개일까요?",
      options: ['3개 (철, 얼음, 수정)', '5개', '2개', '1개'],
      expected: '3개 (철, 얼음, 수정)',
    },
    explore: {
      lens: 'set-frequency-lens',
      defaultValues: { minerals: ['루비', '사파이어', '루비', '에메랄드'] },
      ruleStatement: '동일한 이름의 광물은 집합(Set)에 오직 한 번만 기록되므로, 집합의 크기가 곧 서로 다른 광물의 종류 수입니다.',
    },
    code: {
      entryFunction: 'count_unique_minerals',
      starterCode: `def count_unique_minerals(minerals):
    # 중복을 하나로 모아 서로 다른 광물 종류의 수를 구해 보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { minerals: ['철', '철', '얼음', '수정'] }, expected: 3 },
      { inputs: { minerals: ['금', '금', '금'] }, expected: 1 },
    ],
  },
})
