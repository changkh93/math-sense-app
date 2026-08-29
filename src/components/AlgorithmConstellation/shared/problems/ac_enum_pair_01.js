/**
 * Problem: AC-ENUM-PAIR-01 (두 탐사 지점 모두 비교하기)
 * Constellation: 6 (가능성 연구소)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 61
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_PAIR_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-PAIR-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 61,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005'],
    introduces: { concept: 'pair-enumeration', pythonTool: null },
    lensId: 'combination-tree-lens',
    transferTemplateId: 'bounded-all-pairs-v1',
  },
  identity: {
    studentTitle: '두 탐사 지점 모두 비교하기',
    subtitle: '에너지 캡슐 목록에서 두 개를 골라 정확히 목표 에너지 합을 만드는 쌍이 존재하는지 찾으세요.',
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision'],
    requiredClaims: ['ALL_PAIRS_SEARCHED_WITHOUT_DUPLICATION'],
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: [],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '캡슐 [2, 7, 11, 15]에서 두 개를 골라 합이 9가 되는 조합이 있을까요?',
      options: ['예 (2와 7)', '아니오 (합이 9가 되는 조합 없음)'],
      expected: '예 (2와 7)',
    },
    explore: {
      lens: 'combination-tree-lens',
      defaultValues: { capsules: [1, 4, 6, 8], target: 10 },
      ruleStatement: '이중 반복문으로 모든 서로 다른 두 위치 (i < j)를 확인하여 합이 target과 일치하는지 판별합니다.',
    },
    code: {
      entryFunction: 'find_pair_sum',
      starterCode: `def find_pair_sum(capsules, target):
    # 합이 target이 되는 서로 다른 두 위치를 빠짐없이 찾아보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { capsules: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { inputs: { capsules: [1, 2, 3], target: 10 }, expected: [] },
    ],
  },
})
