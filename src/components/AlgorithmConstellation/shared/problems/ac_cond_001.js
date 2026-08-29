/**
 * AC-COND-001: 두 개의 안전 스위치 (Public Problem Kernel)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_COND_001 = deepFreeze({
  id: 'AC-COND-001',
  version: 1,
  schemaVersion: 1,
  family: 'COND',
  evidenceRecipe: { primitives: ['decision'] },
  pythonConcepts: { introduces: ['value:boolean', 'operator:and'], requires: [] },

  identity: {
    systemTitle: 'Condition Decomposition - Binary Conjunction Gate',
    studentTitle: '두 개의 안전 스위치',
    difficultyLevel: 1,
  },

  learning: {
    objective: '두 개의 독립된 조건이 동시에 참이어야 하는 상황을 논리곱(and)으로 모델링한다.',
    thinkingSkills: ['조건 분해 (Condition Decomposition)', '결합 논리 (Conjunctive Reasoning)'],
    concepts: ['Boolean', 'if condition', 'Logical AND', 'Early Return'],
    prerequisites: ['기본 변수 선언', 'True/False 불리언 개념'],
  },

  shells: {
    explorer: {
      story: '고장 난 우주선 관제 기록에는 스위치 상태만 남아 있습니다. 어떤 경우에 발사 게이트가 열리는지 숨겨진 규칙을 찾아보세요.',
      terms: {
        switch1: '빨간 스위치',
        switch2: '파란 스위치',
        result: '우주선 게이트',
        resultTrue: '게이트 열림 (PASS)',
        resultFalse: '게이트 닫힘 (LOCKED)',
        choiceTrue: '열림 (True)',
        choiceFalse: '닫힘 (False)',
      },
      visualTheme: 'space_shuttle_gate',
    },
    navigator: {
      story: '구역 보안 격벽 관제 기록을 분석하여 메인 레버와 보조 레버 조합에 따른 격벽 해제 조건을 발견하세요.',
      terms: {
        switch1: '메인 레버',
        switch2: '보조 레버',
        result: '보안 격벽',
        resultTrue: '격벽 해제 (PASS)',
        resultFalse: '격벽 차단 (LOCKED)',
        choiceTrue: '해제 (True)',
        choiceFalse: '차단 (False)',
      },
      visualTheme: 'sector_airlock',
    },
    pro: {
      story: '두 센서 입력 s1, s2에 대한 시스템 게이트의 출력을 분석하고 함수 check_gate를 구현하세요.',
      terms: {
        switch1: 's1',
        switch2: 's2',
        result: 'return value',
        resultTrue: 'True (열림)',
        resultFalse: 'False (닫힘)',
        choiceTrue: 'True',
        choiceFalse: 'False',
      },
      visualTheme: 'code_terminal',
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 A', s1: true, s2: true, result: true, text: '🔴 ON   🔵 ON ➔ 🔓 게이트 열림' },
        { label: '기록 B', s1: true, s2: false, result: false, text: '🔴 ON   🔵 OFF ➔ 🔒 게이트 닫힘' },
      ],
      truthTable: [
        { s1: true, s2: false, expected: false, prompt: '관측 예측 1: 빨간 스위치 ON, 파란 스위치 OFF일 때 게이트는?', answer: { type: 'boolean-choice', trueLabel: '열림 (True)', falseLabel: '닫힘 (False)' } },
        { s1: false, s2: true, expected: false, prompt: '관측 예측 2: 빨간 스위치 OFF, 파란 스위치 ON일 때 게이트는?', answer: { type: 'boolean-choice', trueLabel: '열림 (True)', falseLabel: '닫힘 (False)' } },
      ],
    },
    explore: {
      lensId: 'condition-table',
      lensConfig: { s1Label: '빨간 안전 스위치', s2Label: '파란 안전 스위치', logic: 'and' },
      allowedManipulations: ['toggle_s1', 'toggle_s2'],
    },
    code: {
      entryFunction: 'check_gate',
      starterCode: `def check_gate(s1, s2):\n    # 앞에서 발견한 게이트 규칙을 Python 코드로 표현해 보세요.\n    pass\n`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'binary_logic_gate',
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
      { id: 'p1', inputs: { s1: true, s2: true }, expected: true },
      { id: 'p2', inputs: { s1: true, s2: false }, expected: false },
      { id: 'p3', inputs: { s1: false, s2: true }, expected: false },
      { id: 'p4', inputs: { s1: false, s2: false }, expected: false },
    ],
    diagnosticTests: [
      { id: 'd_tt', inputs: { s1: true, s2: true }, expected: true },
      { id: 'd_tf', inputs: { s1: true, s2: false }, expected: false },
      { id: 'd_ft', inputs: { s1: false, s2: true }, expected: false },
      { id: 'd_ff', inputs: { s1: false, s2: false }, expected: false },
    ],
    hiddenTestsRef: 'sec_cond_001_hidden_suite_v1',
    transferFamily: 'condition-decomposition',
    transferDescription: '우주복 준비 상태와 산소 잔량 조건에 적용하기',
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
validateProblemKernelSchema(AC_COND_001)
