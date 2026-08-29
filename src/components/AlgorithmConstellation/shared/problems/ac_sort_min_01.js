/**
 * Problem: AC-SORT-MIN-01 (가장 작은 화물을 앞으로)
 * Constellation: 5 (시뮬레이션과 탐색)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 56
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SORT_MIN_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-SORT-MIN-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 56,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005'],
    introduces: { concept: 'selection-step', pythonTool: 'builtin:min' },
    lensId: 'sort-lab-lens',
    transferTemplateId: 'selection-sort-step-v1',
  },
  identity: {
    studentTitle: '가장 작은 화물을 앞으로',
    subtitle: '아직 정렬되지 않은 화물들 중 가장 가벼운 화물을 찾아 맨 앞과 자리를 바꾸세요.',
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'container-membership'],
    requiredClaims: ['MIN_SWAP_TO_FRONT'],
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: ['builtin:min', 'syntax:swap'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '화물 무게 [7, 5, 3, 2]에서 가장 작은 무게를 맨 앞(인덱스 0)과 한 번 교환하면 어떤 배열이 될까요?',
      options: ['[2, 5, 3, 7]', '[2, 3, 5, 7]', '[5, 7, 3, 2]', '[7, 5, 2, 3]'],
      expected: '[2, 5, 3, 7]',
    },
    explore: {
      lens: 'sort-lab-lens',
      defaultValues: { cargos: [8, 6, 4, 1] },
      ruleStatement: '전체 목록에서 최소값의 인덱스를 찾아 첫 번째 원소와 자리를 바꾸면(Swap), 가장 작은 원소가 맨 앞에 배치됩니다.',
    },
    code: {
      entryFunction: 'sort_cargo_step',
      starterCode: `def sort_cargo_step(cargos):
    # 가장 작은 화물을 찾아 맨 앞과 자리를 바꾸어 보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { cargos: [7, 5, 3, 2] }, expected: [2, 5, 3, 7] },
      { inputs: { cargos: [1, 2, 3] }, expected: [1, 2, 3] },
    ],
  },
})
