/**
 * Problem: AC-CODE-FIRST-ERROR-01 (오류가 시작된 한 순간)
 * Constellation: 0 (사고 탐사 면허)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 8
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_CODE_FIRST_ERROR_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-CODE-FIRST-ERROR-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 8,
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-SEQ-01'],
    introduces: { concept: 'source-debug', pythonTool: null },
    lensId: 'source-debug-lens',
    transferTemplateId: 'first-error-attribution-v1',
  },
  identity: {
    studentTitle: '오류가 시작된 한 순간',
    subtitle: '최종 결과의 오류 이전에 최초로 잘못된 연산 순간을 찾아보세요.',
  },
  evidenceRecipe: {
    primitives: ['source-debug', 'decision'],
    requiredClaims: ['FIRST_ERROR_LOCATION'],
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: [],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '에너지 측정 로그 [10, 20, -5, 30]에서 처음으로 비정상(0 미만) 값이 나타난 인덱스는 어디일까요?',
      options: ['인덱스 0 (10)', '인덱스 1 (20)', '인덱스 2 (-5)', '인덱스 3 (30)'],
      expected: '인덱스 2 (-5)',
    },
    explore: {
      lens: 'source-debug-lens',
      defaultValues: { logs: [15, 25, -10, 40], threshold: 0 },
      ruleStatement: '로그를 순서대로 확인하다가 처음으로 threshold 미만인 값을 만나면 해당 위치(인덱스)를 즉시 반환하고, 없으면 -1을 반환합니다.',
    },
    code: {
      entryFunction: 'find_first_error',
      starterCode: `def find_first_error(logs, threshold):
    # 로그를 순회하며 최초로 threshold 미만인 인덱스를 찾아보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { logs: [10, 20, -5, 30], threshold: 0 }, expected: 2 },
      { inputs: { logs: [10, 20, 30], threshold: 0 }, expected: -1 },
    ],
  },
})
