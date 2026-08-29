/**
 * AC-COND-002: 우주 구명정 승선 규칙 (Public Problem Kernel)
 * Focus: Boolean disjunction (or)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_COND_002 = deepFreeze({
  id: 'AC-COND-002',
  version: 1,
  schemaVersion: 1,
  family: 'COND',
  evidenceRecipe: { primitives: ['decision'] },
  pythonConcepts: { introduces: ['operator:or'], requires: ['value:boolean'] },

  identity: {
    systemTitle: 'Condition Decomposition - Disjunctive Boarding Rule',
    studentTitle: '우주 구명정 승선 규칙',
    difficultyLevel: 1,
  },

  learning: {
    objective: '둘 중 하나라도 참이면 만족되는 대안 조건을 논리합(or)으로 모델링한다.',
    thinkingSkills: ['대안 조건 분해 (Disjunctive Reasoning)', '논리합 추론'],
    concepts: ['Boolean', 'if condition', 'Logical OR', 'Early Return'],
    prerequisites: ['기본 변수 선언', 'True/False 불리언 개념', 'AC-COND-001'],
  },

  shells: {
    explorer: {
      story: '긴급 대피 상황입니다. 승선 카드가 있거나 비상 승인을 받았다면 구명정에 탑승할 수 있습니다. 출입문 개방 규칙을 찾아보세요.',
      terms: {
        switch1: '승선 카드',
        switch2: '비상 승인',
        result: '구명정 승선',
        resultTrue: '승선 허가 (PASS)',
        resultFalse: '승선 불가 (LOCKED)',
        choiceTrue: '승선 허가 (True)',
        choiceFalse: '승선 불가 (False)',
      },
      visualTheme: 'lifeboat_airlock',
    },
    navigator: {
      story: '구명정 출입 관제 기록을 분석하여 승선 카드(has_card)와 비상 승인(emergency_approved) 조건의 해제 규칙을 발견하세요.',
      terms: {
        switch1: '승선 카드',
        switch2: '비상 승인',
        result: '구명정 승선 판정',
        resultTrue: '승선 허가 (PASS)',
        resultFalse: '승선 불가 (LOCKED)',
        choiceTrue: '승선 허가 (True)',
        choiceFalse: '승선 불가 (False)',
      },
      visualTheme: 'sector_airlock',
    },
    pro: {
      story: '두 불리언 입력 has_card, emergency_approved에 대한 출입 통제 함수 can_board를 구현하세요.',
      terms: {
        switch1: 'has_card',
        switch2: 'emergency_approved',
        result: 'return value',
        resultTrue: 'True (허가)',
        resultFalse: 'False (불가)',
        choiceTrue: 'True',
        choiceFalse: 'False',
      },
      visualTheme: 'code_terminal',
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 A', s1: true, s2: false, result: true, text: '카드 소지(ON) / 비상 미승인(OFF) ➔ 🔓 승선 허가' },
        { label: '기록 B', s1: false, s2: false, result: false, text: '카드 미소지(OFF) / 비상 미승인(OFF) ➔ 🔒 승선 불가' },
      ],
      truthTable: [
        { s1: false, s2: true, expected: true, prompt: '기록 C: 카드 미소지(OFF) / 비상 승인(ON) 일 때 출입문은?', answer: { type: 'boolean-choice', trueLabel: '승선 허가 (True)', falseLabel: '승선 불가 (False)' } },
        { s1: true, s2: true, expected: true, prompt: '기록 D: 카드 소지(ON) / 비상 승인(ON) 일 때 출입문은?', answer: { type: 'boolean-choice', trueLabel: '승선 허가 (True)', falseLabel: '승선 불가 (False)' } },
      ],
    },
    explore: {
      lensId: 'condition-table',
      lensConfig: { s1Label: '승선 카드', s2Label: '비상 승인', logic: 'or' },
      allowedManipulations: ['toggle_switch_1', 'toggle_switch_2'],
    },
    code: {
      entryFunction: 'can_board',
      starterCode: `def can_board(has_card, emergency_approved):\n    # 앞에서 발견한 구명정 승선 규칙을 Python 코드로 표현해 보세요.\n    pass\n`,
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
      { id: 'p1', inputs: { has_card: true, emergency_approved: false }, expected: true },
      { id: 'p2', inputs: { has_card: false, emergency_approved: true }, expected: true },
      { id: 'p3', inputs: { has_card: true, emergency_approved: true }, expected: true },
      { id: 'p4', inputs: { has_card: false, emergency_approved: false }, expected: false },
    ],
    diagnosticTests: [
      { id: 'd_tf', inputs: { has_card: true, emergency_approved: false }, expected: true },
      { id: 'd_ft', inputs: { has_card: false, emergency_approved: true }, expected: true },
      { id: 'd_tt', inputs: { has_card: true, emergency_approved: true }, expected: true },
      { id: 'd_ff', inputs: { has_card: false, emergency_approved: false }, expected: false },
    ],
    hiddenTestsRef: 'sec_cond_002_hidden_suite_v1',
    transferFamily: 'condition-decomposition-or',
    transferDescription: '우주선 비상 연료 재보충 조건에 적용하기',
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
validateProblemKernelSchema(AC_COND_002)

export default AC_COND_002
