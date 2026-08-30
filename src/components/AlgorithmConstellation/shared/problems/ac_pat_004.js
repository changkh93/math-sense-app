/**
 * Public Problem Kernel: AC-PAT-004 (Rotating Space Beacon)
 * Focus: Periodic Interval Pattern & Modulo Inequality (time % 4 < 2)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_PAT_004 = deepFreeze({
  id: 'AC-PAT-004',
  version: 1,
  schemaVersion: 1,
  family: 'PAT',
  evidenceRecipe: { primitives: ['scalar-sequence', 'decision'] },
  pythonConcepts: { introduces: [], requires: ['operator:modulo', 'operator:comparison-bound'] },

  identity: {
    systemTitle: 'Pattern & Modulo - Interval Periodic Beacon',
    studentTitle: '회전하는 우주 등대',
    difficultyLevel: 2,
  },

  learning: {
    objective: '한 주기 안에서 특정 구간 동안 상태가 유지되는 주기적 구간 패턴을 나머지 수식(time % 4 < 2)으로 모델링한다.',
    thinkingSkills: ['구간 주기 발견 (Periodic Interval Discovery)', '불변성 및 부등식 모델링'],
    concepts: ['Modulo %', 'Comparison <', 'Periodic Interval', 'Inequality'],
    prerequisites: ['AC-PAT-003', 'AC-EXP-BOUND-05'],
  },

  shells: {
    explorer: {
      story: '우주 등대가 회전하며 빛을 비춥니다. 4초마다 한 바퀴를 돌며, 매 주기마다 처음 2초(0초, 1초) 동안 불빛이 켜집니다. 등대가 켜져 있는 구간의 규칙을 찾아보세요.',
      terms: {
        time: '관측 시간 (초)',
        signal: '등대 빛',
        result: '우주 등대 빛',
        resultTrue: '등대 켜짐 (LIGHT ON)',
        resultFalse: '회전 어두움 (DARK)',
        choiceTrue: '켜짐 (True)',
        choiceFalse: '어두움 (False)',
      },
      visualTheme: 'space_beacon',
    },
    navigator: {
      story: '회전 비콘의 주기적 발광 로그를 분석하여 4초 주기 중 켜짐이 유지되는 구간 수식을 도출하세요.',
      terms: {
        time: 'time',
        signal: 'beacon_output',
        result: '비콘 발광 상태',
        resultTrue: '발광 (True)',
        resultFalse: '소등 (False)',
        choiceTrue: '발광 (True)',
        choiceFalse: '소등 (False)',
      },
      visualTheme: 'rotating_beacon_log',
    },
    pro: {
      story: '입력 time(초)에 대해 등대가 켜져 있으면 True, 꺼져 있으면 False를 반환하는 함수 beacon_light를 구현하세요.',
      terms: {
        time: 'time',
        signal: 'return value',
        result: 'return value',
        resultTrue: 'True (켜짐)',
        resultFalse: 'False (꺼짐)',
        choiceTrue: 'True',
        choiceFalse: 'False',
      },
      visualTheme: 'code_terminal',
    },
  },

  world: {
    type: 'beacon',
    grid: { width: 1, height: 1 },
    timeRange: [0, 15],
    cycleLength: 4,
    activeInterval: 2,
    states: {
      open: { color: '#fbbf24', label: '등대 켜짐 (LIGHT ON)' },
      closed: { color: '#475569', label: '회전 어두움 (DARK)' },
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 1', time: 0, result: true, text: '0초 ➔ 💡 등대 켜짐 (LIGHT ON)' },
        { label: '기록 2', time: 1, result: true, text: '1초 ➔ 💡 등대 켜짐 (LIGHT ON)' },
        { label: '기록 3', time: 2, result: false, text: '2초 ➔ 🌑 회전 어두움 (DARK)' },
        { label: '기록 4', time: 3, result: false, text: '3초 ➔ 🌑 회전 어두움 (DARK)' },
        { label: '기록 5', time: 4, result: true, text: '4초 ➔ 💡 등대 켜짐 (LIGHT ON)' },
      ],
      timelineScenes: [
        { time: 0, bridgeOpen: true, remainder: 0 },
        { time: 1, bridgeOpen: true, remainder: 1 },
        { time: 2, bridgeOpen: false, remainder: 2 },
        { time: 3, bridgeOpen: false, remainder: 3 },
        { time: 4, bridgeOpen: true, remainder: 0 },
        { time: 5, bridgeOpen: true, remainder: 1 },
        { time: 6, bridgeOpen: false, remainder: 2 },
        { time: 7, bridgeOpen: false, remainder: 3 },
      ],
      truthTable: [
        { time: 5, expected: true, prompt: '관측 예측 1: 5초일 때 등대는 켜져 있을까요?', answer: { type: 'boolean-choice', trueLabel: '켜짐 (True)', falseLabel: '어두움 (False)' } },
        { time: 6, expected: false, prompt: '관측 예측 2: 6초일 때 등대는 켜져 있을까요?', answer: { type: 'boolean-choice', trueLabel: '켜짐 (True)', falseLabel: '어두움 (False)' } },
        { time: 8, expected: true, prompt: '관측 예측 3: 8초일 때 등대는 켜져 있을까요?', answer: { type: 'boolean-choice', trueLabel: '켜짐 (True)', falseLabel: '어두움 (False)' } },
      ],
    },
    explore: {
      lensId: 'pattern-timeline',
      lensConfig: { cycleLength: 4, activeInterval: 2, conditionType: 'modulo_interval' },
      allowedManipulations: ['scrub_time_slider'],
    },
    code: {
      entryFunction: 'beacon_light',
      starterCode: `def beacon_light(time):\n    # 우주 등대가 회전하며 빛을 비추는 구간 규칙을 코드로 작성해 보세요.\n    pass\n`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'periodic_beacon_interval',
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
      { id: 't0', inputs: { time: 0 }, expected: true },
      { id: 't1', inputs: { time: 1 }, expected: true },
      { id: 't2', inputs: { time: 2 }, expected: false },
      { id: 't3', inputs: { time: 3 }, expected: false },
      { id: 't4', inputs: { time: 4 }, expected: true },
      { id: 't5', inputs: { time: 5 }, expected: true },
      { id: 't6', inputs: { time: 6 }, expected: false },
    ],
    diagnosticTests: [
      { id: 'd0', inputs: { time: 0 }, expected: true },
      { id: 'd1', inputs: { time: 1 }, expected: true },
      { id: 'd2', inputs: { time: 2 }, expected: false },
      { id: 'd3', inputs: { time: 3 }, expected: false },
      { id: 'd4', inputs: { time: 4 }, expected: true },
      { id: 'd5', inputs: { time: 5 }, expected: true },
      { id: 'd6', inputs: { time: 6 }, expected: false },
    ],
    hiddenTestsRef: 'sec_pat_004_hidden_suite_v1',
    transferFamily: 'periodic-interval-modulo',
    transferDescription: '5초 주기 방어막 충전 구간에 적용하기',
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
validateProblemKernelSchema(AC_PAT_004)

export default AC_PAT_004
