/**
 * Public Problem Kernel: AC-NAV-006 (Nebula Shortest Path / BFS)
 * Focus: 2D Grid BFS Shortest Path, Visited Invariant, Deque Queue
 * STRICT SECURITY INVARIANT:
 * This file is bundled into the client browser.
 * It contains NO solution code, NO canonical strategy, and NO hidden test data.
 */

import { validateProblemKernelSchema, deepFreeze } from '../contracts/problemKernelSchema.js'

export const AC_NAV_006 = deepFreeze({
  id: 'AC-NAV-006',
  version: 1,
  schemaVersion: 1,
  family: 'NAV',
  evidenceRecipe: { primitives: ['ordered-buffer', 'container-membership', 'grid-frontier'] },
  pythonConcepts: { introduces: ['builtin:set', 'method:set_add'], requires: ['class:deque', 'method:popleft', 'method:append'] },

  identity: {
    systemTitle: 'Navigation - Grid Breadth-First Search (BFS)',
    studentTitle: '어둠 성운 구조 신호',
    difficultyLevel: 3,
  },

  learning: {
    objective: '2차원 격자 지도에서 장애물을 피해 시작점부터 목표점까지의 최단 경로(BFS)를 대기열(Queue)과 방문 집합(visited)으로 탐색한다.',
    thinkingSkills: ['너비 우선 탐색 (BFS)', '최단 경로 보장 원리', '방문 상태 불변성 (visited)'],
    concepts: ['BFS', 'collections.deque', 'visited set', '2D grid coordinates', 'Shortest Path'],
    prerequisites: ['AC-NAV-005 (Queue)', '2차원 배열/좌표계', '튜플 및 집합'],
  },

  shells: {
    explorer: {
      story: '성운 속에 조난선이 갇혀 있습니다. 0은 지나갈 수 있는 우주 공간, 1은 진입할 수 없는 소행성 지대입니다. 시작점에서 조난선까지 가장 빠른 최단 이동 거리를 찾아보세요.',
      terms: { grid: '성운 지도', start: '구조선 위치', target: '조난선 위치', result: '최단 이동 거리' },
      visualTheme: 'nebula_grid_radar',
    },
    navigator: {
      story: 'grid, start, target 좌표를 입력받아 BFS 파동 탐색으로 최단 거리를 계산하고, 도달 불가능 시 -1을 반환하는 함수를 작성하세요.',
      terms: { grid: 'grid', start: 'start', target: 'target', result: 'shortest distance' },
      visualTheme: 'star_chart_pathfinder',
    },
    pro: {
      story: '2차원 0/1 행렬 grid와 시작/목표 좌표가 주어질 때 4방향 이동 기준 최단 거리를 반환하는 shortest_path를 구현하세요.',
      terms: { grid: 'grid', start: 'start', target: 'target', result: 'return value' },
      visualTheme: 'code_terminal',
    },
  },

  modes: {
    observe: {
      givenRecords: [
        { label: '기록 1', input: '3x3 열린 지도 (0,0)➔(2,2)', result: '최단 4칸', text: '오른쪽 2칸 + 아래 2칸 ➔ 최단 거리 4' },
        { label: '기록 2', input: '장애물로 막힌 지도', result: '-1 (도달 불가)', text: '소행성에 둘러싸여 경로 없음 ➔ -1' },
      ],
      truthTable: [
        { input: '1칸 시작점=(0,0), 목표=(0,0)', expected: 0, prompt: '관측 예측 1: 시작점과 목표점이 같을 때 이동 거리는?', answer: { type: 'single-choice', options: [0, 1, -1, 2] } },
      ],
    },
    explore: {
      lensId: 'grid-bfs',
      lensConfig: {
        gridPreset: [
          [0, 0, 0],
          [1, 1, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        target: [2, 2],
        maxRows: 3,
        maxCols: 3,
      },
      allowedManipulations: ['step_bfs_wave', 'toggle_visited_overlay'],
    },
    code: {
      entryFunction: 'shortest_path',
      starterCode: `from collections import deque\n\ndef shortest_path(grid, start, target):\n    # BFS 큐와 visited를 활용해 최단 거리를 계산하는 코드를 작성해 보세요.\n    pass\n`,
    },
  },

  runtime: {
    language: 'python',
    worldModel: 'grid_bfs_wave_radar',
    limits: {
      maxExecutionMs: 2500,
      maxSteps: 80000,
      maxOutputBytes: 16384,
      maxMemoryMb: 64,
      maxTraceEvents: 800,
      maxRawEvents: 800,
      maxMeaningfulEvents: 80,
    },
    seedContract: {
      policy: 'deterministic_practice',
    },
  },

  assessment: {
    publicTests: [
      {
        id: 'p1',
        inputs: {
          grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
          start: [0, 0],
          target: [2, 2],
        },
        expected: 4,
      },
      {
        id: 'p2',
        inputs: {
          grid: [[0, 1], [1, 0]],
          start: [0, 0],
          target: [1, 1],
        },
        expected: -1,
      },
      {
        id: 'p3',
        inputs: {
          grid: [[0]],
          start: [0, 0],
          target: [0, 0],
        },
        expected: 0,
      },
      {
        id: 'p4',
        inputs: {
          grid: [[0, 0, 1], [1, 0, 0], [1, 1, 0]],
          start: [0, 0],
          target: [2, 2],
        },
        expected: 4,
      },
    ],
    diagnosticTests: [
      {
        id: 'd1',
        inputs: {
          grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
          start: [0, 0],
          target: [2, 2],
        },
        expected: 4,
      },
      {
        id: 'd2',
        inputs: {
          grid: [[0, 1], [1, 0]],
          start: [0, 0],
          target: [1, 1],
        },
        expected: -1,
      },
    ],
    hiddenTestsRef: 'sec_nav_006_hidden_suite_v1',
    transferFamily: 'bfs-grid-shortest-path',
    transferDescription: '연구소 바이러스 확산 단계에 적용하기',
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
validateProblemKernelSchema(AC_NAV_006)

export default AC_NAV_006
