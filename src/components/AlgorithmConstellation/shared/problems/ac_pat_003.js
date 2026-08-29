/**
 * AC-PAT-003: 얼어붙은 신호 다리 (Public Problem Kernel)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_PAT_003_PUBLIC_KERNEL = deepFreeze({
  id: 'AC-PAT-003',
  version: 1,
  schemaVersion: 1,
  family: 'PAT',
  evidenceRecipe: { primitives: ['scalar-sequence', 'decision'] },
  pythonConcepts: { introduces: ['operator:modulo'], requires: [] },

  identity: {
    systemTitle: 'Pattern and Modulo - Frozen Signal Bridge',
    studentTitle: '얼어붙은 신호 다리',
    difficultyLevel: 1,
    concept: '반복되는 주기와 나머지 패턴 (%)',
    shortDescription: '신호 다리의 개폐 관측 기록을 분석하고 현재 시간(time)에 다리가 열리는지 판단하세요.',
  },

  learning: {
    objective: '일정한 주기로 반복되는 패턴을 모듈로 연산자(%)를 활용해 수식과 코드로 모델링한다.',
    thinkingSkills: ['주기 패턴 인식 (Periodicity Recognition)', '모듈로 수식화 (Modulo Formulation)'],
    concepts: ['Modulo (%)', 'Periodicity', 'Integer Arithmetic', 'Conditional Return'],
    prerequisites: ['기본 변수', '정수 나머지 연산'],
  },

  shells: {
    explorer: {
      story: '신호 기지에는 주기적으로 얼어붙는 다리의 관측 기록이 남아 있습니다. 어떤 시간에 다리가 열리는지 규칙을 찾아보세요.',
      terms: { time: '현재 시간 (초)', result: '신호 다리' },
      visualTheme: 'frozen_signal_bridge',
    },
    navigator: {
      story: '빙하 횡단 다리의 신호 센서 로그를 분석하여 다리가 개방되는 시간의 공통 규칙을 발견하세요.',
      terms: { time: '타임 센서', result: '빙하 격벽 다리' },
      visualTheme: 'glacier_crossing',
    },
    pro: {
      story: '주기적 신호 함수 check_bridge(time)의 입출력 로그를 분석하고 최적의 조건식을 구현하세요.',
      terms: { time: 'time (int)', result: 'return value' },
      visualTheme: 'code_terminal',
    },
  },

  world: {
    type: 'signal-bridge',
    grid: { width: 1, height: 1 },
    timeRange: [0, 15],
    cycleLength: 3,
    states: {
      open: { color: '#00f0ff', label: '열림 (Open)' },
      closed: { color: '#ef4444', label: '얼어붙음 (Frozen)' },
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 1', time: 0, result: true, text: '0초 ➔ 🔓 열림' },
        { label: '기록 2', time: 1, result: false, text: '1초 ➔ ❄️ 닫힘' },
        { label: '기록 3', time: 2, result: false, text: '2초 ➔ ❄️ 닫힘' },
        { label: '기록 4', time: 3, result: true, text: '3초 ➔ 🔓 열림' },
        { label: '기록 5', time: 6, result: true, text: '6초 ➔ 🔓 열림' },
      ],
      timelineScenes: [
        { time: 0, bridgeOpen: true, remainder: 0 },
        { time: 1, bridgeOpen: false, remainder: 1 },
        { time: 2, bridgeOpen: false, remainder: 2 },
        { time: 3, bridgeOpen: true, remainder: 0 },
        { time: 4, bridgeOpen: false, remainder: 1 },
        { time: 5, bridgeOpen: false, remainder: 2 },
        { time: 6, bridgeOpen: true, remainder: 0 },
      ],
      truthTable: [
        { time: 9, expected: true, prompt: '관측 예측 1: 현재 시간이 9초일 때 신호 다리는?', answer: { type: 'boolean-choice', trueLabel: '열림 (True)', falseLabel: '얼어붙음 (False)' } },
        { time: 10, expected: false, prompt: '관측 예측 2: 현재 시간이 10초일 때 신호 다리는?', answer: { type: 'boolean-choice', trueLabel: '열림 (True)', falseLabel: '얼어붙음 (False)' } },
        { time: 12, expected: true, prompt: '관측 예측 3: 현재 시간이 12초일 때 신호 다리는?', answer: { type: 'boolean-choice', trueLabel: '열림 (True)', falseLabel: '얼어붙음 (False)' } },
      ],
      predictionGoal: '시간 9초, 10초, 12초일 때 신호 다리의 상태를 예측하세요.',
    },
    explore: {
      lensId: 'pattern-timeline',
      lensConfig: { cycleLength: 3, activeInterval: 1, conditionType: 'modulo_zero' },
      type: 'time_modulo_simulator',
      cycle: 3,
      interactiveInputs: [
        { id: 'time', label: '현재 시간 (time)', min: 0, max: 15, default: 0 },
      ],
    },
    code: {
      language: 'python',
      runtimeVersion: 2,
      entryFunction: 'check_bridge',
      starterCode: `def check_bridge(time):\n    # 앞에서 발견한 신호 다리 규칙을 Python 코드로 표현해 보세요.\n    pass\n`,
    },
  },

  assessment: {
    publicTests: [
      { id: 't0', inputs: { time: 0 }, expected: true },
      { id: 't1', inputs: { time: 1 }, expected: false },
      { id: 't2', inputs: { time: 2 }, expected: false },
      { id: 't3', inputs: { time: 3 }, expected: true },
      { id: 't4', inputs: { time: 4 }, expected: false },
      { id: 't6', inputs: { time: 6 }, expected: true },
    ],
    diagnosticTests: [
      { id: 'd0', inputs: { time: 0 }, expected: true },
      { id: 'd1', inputs: { time: 1 }, expected: false },
      { id: 'd2', inputs: { time: 2 }, expected: false },
      { id: 'd3', inputs: { time: 3 }, expected: true },
      { id: 'd4', inputs: { time: 4 }, expected: false },
      { id: 'd5', inputs: { time: 5 }, expected: false },
      { id: 'd6', inputs: { time: 6 }, expected: true },
      { id: 'd9', inputs: { time: 9 }, expected: true },
      { id: 'd10', inputs: { time: 10 }, expected: false },
      { id: 'd12', inputs: { time: 12 }, expected: true },
    ],
    hiddenTestsRef: 'sec_pat_003_hidden_suite_v1',
    transferFamily: 'pattern-modulo',
    transferDescription: '4초 주기 냉각 장치 가동 조건에 적용하기',
    completionEvidence: {
      resultStar: 'hidden_suite_pass',
      understandingStar: 'fresh_micro_evidence',
      transferStar: 'fresh_transfer_pass',
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'signal_bridge',
    limits: {
      maxSteps: 50_000,
      maxExecutionMs: 1_500,
      maxMemoryMb: 64,
      maxOutputBytes: 16_384,
      maxTraceEvents: 500,
      maxRawEvents: 500,
      maxMeaningfulEvents: 50,
    },
    seedContract: {
      policy: 'deterministic_practice',
    },
  },

  scaffolding: {
    publicPolicy: {
      parsonAvailable: true,
      maxHints: 3,
    },
  },
})

// Validate and freeze kernel
validateProblemKernelSchema(AC_PAT_003_PUBLIC_KERNEL)

export const AC_PAT_003 = AC_PAT_003_PUBLIC_KERNEL
