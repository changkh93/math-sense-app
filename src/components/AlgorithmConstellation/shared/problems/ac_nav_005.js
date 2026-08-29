/**
 * Public Problem Kernel: AC-NAV-005 (Emergency Signal Queue)
 * Focus: FIFO Queue Concept, Deque Operations (append, popleft)
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_NAV_005 = deepFreeze({
  id: 'AC-NAV-005',
  version: 1,
  schemaVersion: 1,
  family: 'NAV',
  evidenceRecipe: { primitives: ['ordered-buffer', 'container-scan'] },
  pythonConcepts: { introduces: ['class:deque', 'method:popleft', 'method:append'], requires: [] },

  identity: {
    systemTitle: 'Navigation - FIFO Queue and Deque Operations',
    studentTitle: '구조 신호 대기열',
    difficultyLevel: 2,
  },

  learning: {
    objective: '먼저 도착한 신호를 먼저 처리(FIFO)하기 위해 대기열 자료구조(Queue)를 사용하고 popleft로 순서대로 꺼내는 원리를 익힌다.',
    thinkingSkills: ['선입선출 대기열 모델링 (FIFO Queue)', '자료구조 선택 및 처리 순서'],
    concepts: ['Queue', 'FIFO', 'collections.deque', 'append', 'popleft'],
    prerequisites: ['리스트 기초', 'while 반복문 기초'],
  },

  shells: {
    explorer: {
      story: '성단 전역에서 여러 조난 신호가 들어오고 있습니다. 먼저 도착한 신호부터 차례대로 꺼내어 처리 목록을 완성하세요.',
      terms: { queue: '신호 대기열', pop: '맨 앞 신호 꺼내기', result: '처리된 신호 목록' },
      visualTheme: 'signal_queue_station',
    },
    navigator: {
      story: 'signals 목록을 deque로 래핑하여 대기열이 빌 때까지 popleft()로 신호를 꺼내 processed 리스트에 누적하는 함수를 작성하세요.',
      terms: { queue: 'deque', pop: 'popleft', result: 'processed' },
      visualTheme: 'traffic_control',
    },
    pro: {
      story: '문자열 리스트 signals가 주어질 때 FIFO 순서대로 모든 신호를 처리하여 리스트로 반환하는 함수 process_signals를 구현하세요.',
      terms: { queue: 'deque', pop: 'popleft', result: 'return value' },
      visualTheme: 'code_terminal',
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 1', input: "['A', 'B'] 도착", result: "['A', 'B'] 순서 처리", text: 'A가 먼저 도착 ➔ A를 먼저 꺼내 처리' },
        { label: '기록 2', input: "['Alpha', 'Beta', 'Gamma'] 도착", result: "['Alpha', 'Beta', 'Gamma'] 순서 처리", text: '도착 순서(FIFO)대로 처리' },
      ],
      truthTable: [
        { input: "['SOS_1', 'SOS_2']", expected: "['SOS_1', 'SOS_2'] (FIFO)", prompt: "관측 예측 1: 먼저 온 SOS_1과 나중에 온 SOS_2의 올바른 처리 순서는?", answer: { type: 'single-choice', options: ["['SOS_1', 'SOS_2'] (FIFO)", "['SOS_2', 'SOS_1'] (LIFO)"] } },
      ],
    },
    explore: {
      lensId: 'fifo-queue',
      lensConfig: {
        initialSignals: ['ALPHA', 'BETA', 'GAMMA', 'DELTA'],
        container: 'deque',
        operations: ['append', 'popleft'],
      },
      allowedManipulations: ['enqueue_signal', 'dequeue_signal'],
    },
    code: {
      entryFunction: 'process_signals',
      starterCode: `from collections import deque\n\ndef process_signals(signals):\n    # 먼저 도착한 신호부터 차례대로 꺼내는 코드를 작성해 보세요.\n    pass\n`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'fifo_queue_simulator',
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
      { id: 'p1', inputs: { signals: ['A', 'B', 'C'] }, expected: ['A', 'B', 'C'] },
      { id: 'p2', inputs: { signals: ['Alpha', 'Beta'] }, expected: ['Alpha', 'Beta'] },
      { id: 'p3', inputs: { signals: ['SOS'] }, expected: ['SOS'] },
      { id: 'p4', inputs: { signals: [] }, expected: [] },
    ],
    diagnosticTests: [
      { id: 'd1', inputs: { signals: ['A', 'B', 'C'] }, expected: ['A', 'B', 'C'] },
      { id: 'd2', inputs: { signals: ['Alpha', 'Beta'] }, expected: ['Alpha', 'Beta'] },
      { id: 'd3', inputs: { signals: ['SOS'] }, expected: ['SOS'] },
      { id: 'd4', inputs: { signals: [] }, expected: [] },
    ],
    hiddenTestsRef: 'sec_nav_005_hidden_suite_v1',
    transferFamily: 'fifo-queue-processing',
    transferDescription: '화물 선적 대기열 처리에 적용하기',
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
validateProblemKernelSchema(AC_NAV_005)

export default AC_NAV_005
