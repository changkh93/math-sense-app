/**
 * Problem: AC-STR-REVERSE-01 (뒤집힌 구조 메시지)
 * Constellation: 3 (수열과 문자열)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 36
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STR_REVERSE_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-STR-REVERSE-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 36,
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-SEQ-005'],
    introduces: { concept: 'reverse-traversal', pythonTool: 'syntax:slicing' },
    lensId: 'string-scanner-lens',
    transferTemplateId: 'string-reverse-v1',
  },
  identity: {
    studentTitle: '뒤집힌 구조 메시지',
    subtitle: '거꾸로 전송된 외계 신호 문자열을 올바른 순서로 뒤집어 복원하세요.',
  },
  evidenceRecipe: {
    primitives: ['container-scan'],
    requiredClaims: ['REVERSE_ORDER_RECONSTRUCTED'],
  },
  pythonConcepts: {
    requires: [],
    introduces: ['syntax:slicing', 'builtin:range'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "거꾸로 들어온 신호 'IMUL'을 뒤집으면 어떤 단어가 될까요?",
      options: ["'LUMI'", "'IMLU'", "'MUIL'"],
      expected: "'LUMI'",
    },
    explore: {
      lens: 'string-scanner-lens',
      defaultValues: { msg: 'EDOC' },
      ruleStatement: '문자열의 마지막 글자부터 첫 글자까지 차례대로 모아서 새로운 문자열을 완성합니다.',
    },
    code: {
      entryFunction: 'decode_message',
      starterCode: `def decode_message(msg):
    # 뒤집힌 문자열 msg를 원래 순서로 복원해 보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { msg: 'IMUL' }, expected: 'LUMI' },
      { inputs: { msg: 'SOS' }, expected: 'SOS' },
    ],
  },
})
