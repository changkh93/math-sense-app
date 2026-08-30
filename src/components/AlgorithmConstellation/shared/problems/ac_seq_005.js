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
  problemId: 'AC-SEQ-005',
  version: 1,
  problemVersion: 1,
  schemaVersion: 1,
  family: 'SEQ',
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'E',
    prerequisites: [
      'AC-CODE-FIRST-ERROR-01',
      'AC-EXP-LOOP-06',
      'AC-COND-ELIF-14',
    ],
  },
  evidenceRecipe: { primitives: ['container-scan', 'scalar-sequence', 'decision'] },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'operator:comparison-lower-bound',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:filter-accumulate'],
  },

  identity: {
    systemTitle: 'Sequence - Filter and Accumulator Pattern',
    studentTitle: '에너지 캡슐 선별 수거',
    subtitle: '여러 캡슐을 차례로 확인해 정상 캡슐의 총 에너지를 구합니다.',
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
    understandingChallenges: [
      {
        challengeId: 'uc_seq_005_1',
        title: '★★ 선별 합산 누적자 추적',
        type: 'trace_understanding',
        prompt: 'capsules = [4, -2, 7, 0] 일 때 collect_energy(capsules)의 실행 과정을 확인하세요.',
        codeSnippet: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total`,
        questions: [
          {
            id: 'q1',
            text: '손상된 캡슐(-2)을 만났을 때 total 값은 어떻게 될까요?',
            options: [
              { value: 'keep_state', label: '조건(energy > 0)을 만족하지 않으므로 total 값이 유지된다' },
              { value: 'decrease', label: '2만큼 감소한다' },
              { value: 'reset', label: '0으로 초기화된다' },
            ],
            expected: 'keep_state',
          },
          {
            id: 'q2',
            text: '[4, -2, 7, 0]을 순회한 후 최종 반환되는 total 값은 얼마일까요?',
            options: [
              { value: 'val_11', label: '11 (4 + 7)' },
              { value: 'val_9', label: '9 (4 - 2 + 7)' },
              { value: 'val_2', label: '2 (양수 캡슐의 개수)' },
            ],
            expected: 'val_11',
          },
          {
            id: 'q3',
            text: '이 문제에서 양수 캡슐의 개수를 세는 것과 에너지 합을 구하는 것의 차이는 무엇일까요?',
            options: [
              { value: 'sum_vs_count', label: '개수는 1씩 더하지만, 합은 energy 값 자체를 더한다' },
              { value: 'same_thing', label: '둘은 완전히 같은 계산이다' },
            ],
            expected: 'sum_vs_count',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'AC-SEQ-005-T1',
        title: '수정 광석 선별 수거',
        description: '광석 리스트(ores)에서 순도가 양수(purity > 0)인 광석의 순도 총합을 구하세요.',
        contextCard: {
          title: '📋 수정 광석 선별 수거 흐름',
          steps: [
            { label: '빠짐없이 확인', text: '광석을 처음부터 끝까지 하나씩 살펴보세요.' },
            { label: '수거 대상 구분', text: '수거할 광석과 건너뛸 광석의 공통점을 찾아보세요.' },
            { label: '결과에 모으기', text: '수거한 광석의 순도를 하나의 결과에 계속 모으세요.' },
          ],
        },
        thoughtCheck: {
          prompt: '캡슐 에너지 합산과 수정 광석 순도 합산의 공통적인 생각의 규칙은 무엇일까요?',
          options: [
            { id: 'opt_filter_sum', label: '0보다 큰 유효한 값만 골라 누적 변수에 더한다', isCorrect: true },
            { id: 'opt_count_only', label: '양수 광석의 개수만 1씩 센다', isCorrect: false },
          ],
          feedback: '맞아요! 조건에 맞는 항목의 값 자체를 total에 누적하는 동일한 filter-accumulate 패턴입니다.',
        },
        entryFunction: 'collect_crystals',
        starterCode: `def collect_crystals(ores):\n    # 양의 순도(> 0) 광석만 선별하여 합산하세요.\n    pass\n`,
        testCases: [
          { inputs: { ores: [6, -2, 4] }, expected: 10 },
          { inputs: { ores: [] }, expected: 0 },
        ],
      },
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
