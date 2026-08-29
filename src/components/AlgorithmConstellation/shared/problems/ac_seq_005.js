/**
 * Public Problem Kernel: AC-SEQ-005 (Energy Capsule Collection)
 * Focus: Sequence Iteration, Filtering, and Accumulator Pattern (for + if + total)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_SEQ_005 = deepFreeze({
  id: 'AC-SEQ-005',
  version: 1,
  schemaVersion: 1,
  family: 'SEQ',
  evidenceRecipe: { primitives: ['container-scan', 'scalar-sequence', 'decision'] },
  pythonConcepts: { introduces: ['builtin:list', 'statement:for', 'statement:if'], requires: [] },

  identity: {
    systemTitle: 'Sequence - Filter and Accumulator Pattern',
    studentTitle: '에너지 캡슐 선별 수거',
    difficultyLevel: 2,
  },

  learning: {
    objective: '리스트 데이터를 하나씩 순회하며 조건에 맞는 양수 에너지(energy > 0)만 선별하여 합산 누적(Accumulator)하는 절차를 구현한다.',
    thinkingSkills: ['리스트 순회 (Linear Scan)', '조건 선별 (Filtering)', '누적자 갱신 (Accumulation)'],
    concepts: ['for loop', 'list iteration', 'if condition', 'Accumulator pattern', 'Initial value 0'],
    prerequisites: ['리스트 기본 구조', 'for 반복문 기초', '변수 덧셈'],
  },

  shells: {
    explorer: {
      story: '우주선 외부에서 수거된 에너지 캡슐 리스트가 주어집니다. 정상 캡슐은 양수 에너지(> 0)를 가지고 있지만, 손상된 캡슐은 0 이하의 값을 갖습니다. 정상 캡슐의 에너지만 모두 합산해 보세요.',
      terms: { list: '캡슐 리스트', item: '개별 캡슐 에너지', result: '총 유효 에너지' },
      visualTheme: 'energy_capsule_conveyor',
    },
    navigator: {
      story: '캡슐 배열 capsules를 순회하여 energy > 0 인 항목만 선별하여 누적 변수 total을 업데이트하는 함수를 작성하세요.',
      terms: { list: 'capsules', item: 'energy', result: 'total' },
      visualTheme: 'data_pipeline',
    },
    pro: {
      story: '정수 리스트 capsules가 주어질 때 양의 정수들의 합을 계산하여 반환하는 함수 collect_energy를 구현하세요.',
      terms: { list: 'capsules', item: 'element', result: 'return value' },
      visualTheme: 'code_terminal',
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 1', input: '[5, 8]', result: '13', text: '정상 캡슐 [5, 8] ➔ 총 에너지 13' },
        { label: '기록 2', input: '[5, -3, 8]', result: '13', text: '손상 캡슐(-3) 제외 ➔ 총 에너지 13 (5 + 8)' },
        { label: '기록 3', input: '[-5, 0, -2]', result: '0', text: '정상 캡슐 없음 ➔ 총 에너지 0' },
      ],
      truthTable: [
        { input: '[10, -5, 20]', expected: 30, prompt: '관측 예측 1: [10, -5, 20]에서 유효 에너지(>0)의 총합은?', answer: { type: 'single-choice', options: [30, 25, 20, 0] } },
        { input: '[] (빈 리스트)', expected: 0, prompt: '관측 예측 2: 빈 리스트 []의 유효 에너지 총합은?', answer: { type: 'single-choice', options: [0, -5, 10, 'None'] } },
      ],
    },
    explore: {
      lensId: 'sequence-accumulator',
      lensConfig: {
        sampleStream: [10, -5, 20, -8, 15, 0, -2, 30],
        filterPredicate: 'energy > 0',
        accumulatorVar: 'total',
      },
      allowedManipulations: ['step_capsule_pointer'],
    },
    code: {
      entryFunction: 'collect_energy',
      starterCode: `def collect_energy(capsules):\n    # 정상 캡슐(> 0)만 선별하여 합산하는 코드를 작성해 보세요.\n    pass\n`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'capsule_accumulator_stream',
    limits: {
      maxExecutionMs: 1500,
      maxSteps: 50000,
      maxOutputBytes: 16384,
      maxMemoryMb: 64,
      maxTraceEvents: 500,
      maxRawEvents: 500,
      maxMeaningfulEvents: 50,
    },
    seedContract: {
      policy: 'deterministic_practice',
    },
  },

  assessment: {
    publicTests: [
      { id: 'p1', inputs: { capsules: [5, -3, 8, 0, -2] }, expected: 13 },
      { id: 'p2', inputs: { capsules: [10, 20, 30] }, expected: 60 },
      { id: 'p3', inputs: { capsules: [-5, -10, 0] }, expected: 0 },
      { id: 'p4', inputs: { capsules: [] }, expected: 0 },
    ],
    diagnosticTests: [
      { id: 'd1', inputs: { capsules: [5, -3, 8, 0, -2] }, expected: 13 },
      { id: 'd2', inputs: { capsules: [10, 20, 30] }, expected: 60 },
      { id: 'd3', inputs: { capsules: [-5, -10, 0] }, expected: 0 },
      { id: 'd4', inputs: { capsules: [] }, expected: 0 },
    ],
    hiddenTestsRef: 'sec_seq_005_hidden_suite_v1',
    transferFamily: 'linear-filter-accumulator',
    transferDescription: '수정 광석 순도 선별 수거에 적용하기',
    completionEvidence: {
      resultStar: 'hidden_suite_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
  },

  scaffolding: {
    publicPolicy: {
      parsonAvailable: true,
      maxHints: 3,
    },
  },
})

// Assert valid public kernel schema
validateProblemKernelSchema(AC_SEQ_005)

export default AC_SEQ_005
