/**
 * Problem: AC-SORT-MIN-01 (가장 작은 화물을 앞으로)
 * Constellation: 5 (시뮬레이션과 탐색)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 56
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SORT_MIN_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-SORT-MIN-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 56,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-MINMAX-32', 'AC-EXP-SWAP-04'],
    introduces: { concept: 'selection-step', pythonTool: 'syntax:swap' },
    lensId: 'state-transition',
    transferTemplateId: 'selection-sort-step-v1',
  },
  identity: {
    studentTitle: '가장 작은 화물을 앞으로',
    subtitle: '아직 정렬되지 않은 화물들 중 가장 가벼운 화물의 위치를 기억했다가 맨 앞과 딱 한 번 교환하세요.',
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'container-membership'],
    requiredClaims: ['MIN_SWAP_TO_FRONT'],
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:comparison-lower-bound'],
    introduces: ['syntax:swap'],
  },
  thinkingPatterns: {
    requires: ['pattern:first-item-initialization'],
    introduces: ['pattern:select-extreme-and-swap'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '화물 무게 [7, 5, 3, 2]에서 가장 작은 무게를 맨 앞(인덱스 0)과 한 번 교환하면 어떤 배열이 될까요?',
      options: ['[2, 5, 3, 7]', '[2, 3, 5, 7]', '[5, 7, 3, 2]', '[7, 5, 2, 3]'],
      expected: '[2, 5, 3, 7]',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⚖️ 최소 화물 선택판',
          description: '목록을 훑으며 가장 작은 화물의 "위치"를 기억하고, 마지막에 맨 앞과 한 번만 교환합니다.',
          variables: [
            { name: 'cargos', value: '[7, 5, 3, 2]', label: '화물 무게 목록' },
            { name: 'minValue', value: '2', label: '지금까지 본 가장 작은 값' },
            { name: 'swapRule', value: '교환은 딱 한 번', label: '한 단계 규칙' },
          ],
          guidance: '전체 정렬이 아니라 한 단계만 수행합니다. 나머지가 아직 정렬되지 않아도 됩니다.',
        },
        initialState: { scannedIndex: null, minIndex: null, minValue: null, swapped: null },
        initialStateLabel: '시작: 아직 아무것도 훑지 않음',
        initialStepTitle: '🚀 시작 (목록 훓기 전)',
        initialPrompt: '왼쪽부터 훑으며 가장 작은 값의 위치를 기억합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 첫 화물 7 확인',
            operationLabel: '첫 화물을 임시 최소로 기억 (위치 0, 값 7)',
            codeSnippet: '# min_index = 0',
            prompt: '첫 화물을 기준으로 삼고 비교를 시작합니다.',
            stateAfter: { scannedIndex: 0, minIndex: 0, minValue: 7, swapped: null },
          },
          {
            id: 'f1',
            stepTitle: '② 화물 5 확인 — 더 작다!',
            operationLabel: '5 < 7 이므로 기억 위치를 1로 교체',
            codeSnippet: '# min_index = 1',
            prompt: '더 작은 값을 찾았을 때만 기억한 위치를 바꿉니다.',
            stateAfter: { scannedIndex: 1, minIndex: 1, minValue: 5, swapped: null },
          },
          {
            id: 'f2',
            stepTitle: '③ 화물 3 확인 — 또 더 작다!',
            operationLabel: '3 < 5 이므로 기억 위치를 2로 교체',
            codeSnippet: '# min_index = 2',
            prompt: '아직 자리 교환은 하지 않아요. 위치만 기억합니다.',
            stateAfter: { scannedIndex: 2, minIndex: 2, minValue: 3, swapped: null },
          },
          {
            id: 'f3',
            stepTitle: '④ 화물 2 확인 — 가장 작다!',
            operationLabel: '2 < 3 이므로 기억 위치를 3으로 교체',
            codeSnippet: '# min_index = 3',
            prompt: '훓기가 끝났습니다. 가장 작은 화물은 위치 3의 2예요.',
            stateAfter: { scannedIndex: 3, minIndex: 3, minValue: 2, swapped: null },
          },
          {
            id: 'f4',
            stepTitle: '⑤ 맨 앞과 딱 한 번 교환',
            operationLabel: '위치 0과 위치 3을 교환 -> [2, 5, 3, 7]',
            codeSnippet: '# 기억한 위치의 화물과 맨 앞 화물을 한 번 맞바꾸기',
            prompt: '한 단계에서 교환은 이것으로 끝! [2, 3, 5, 7]이 아니라 [2, 5, 3, 7]이 정답입니다.',
            stateAfter: { scannedIndex: 3, minIndex: 3, minValue: 2, swapped: true },
          },
        ],
        predictionPrompt: '가장 작은 화물의 위치를 찾아 맨 앞과 한 번 교환한 목록을 반환하세요.',
        rulePrompt: '선택 교환 한 단계 규칙',
        ruleStatement: '가장 작은 값의 위치를 기억하며 훑은 뒤, 맨 앞과 정확히 한 번만 교환한다. 나머지는 아직 정렬되지 않아도 된다.',
      },
    },
    code: {
      entryFunction: 'sort_cargo_step',
      starterCode: `def sort_cargo_step(cargos):
    # 가장 작은 화물을 찾아 맨 앞과 자리를 바꾸어 보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { cargos: [7, 5, 3, 2] }, expected: [2, 5, 3, 7] },
      { inputs: { cargos: [1, 2, 3] }, expected: [1, 2, 3] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sort_056_1',
        prompt: '최소값을 맨 앞과 1회 교환하는 1단계 선택 정렬 결과를 예측해 보세요.',
        questions: [
          {
            id: 'q1',
            text: 'cargos = [8, 5, 9, 1]일 때 sort_cargo_step(cargos)의 결과는 무엇일까요?',
            options: [
              { value: '[1, 5, 9, 8]', label: '[1, 5, 9, 8]' },
              { value: '[1, 5, 8, 9]', label: '[1, 5, 8, 9]' },
              { value: '[8, 5, 9, 1]', label: '[8, 5, 9, 1]' },
            ],
            expected: '[1, 5, 9, 8]',
          },
          {
            id: 'q2',
            text: '훓는 동안 더 작은 값을 찾을 때마다 자리를 바꾸면 안 되는 이유는 무엇일까요?',
            options: [
              { value: 'one_swap_contract', label: '한 단계에서 교환은 정확히 한 번이어야 한 단계 계약을 지키게 되어서' },
              { value: 'swap_count_free', label: '교환 횟수는 결과에 아무 영향이 없어서' },
            ],
            expected: 'one_swap_contract',
          },
          {
            id: 'q3',
            text: '맨 앞 교환 뒤에 나머지 부분이 정렬되지 않아도 되는 이유는 무엇일까요?',
            options: [
              { value: 'one_step_task', label: '이 문제는 전체 정렬이 아니라 딱 한 단계만 수행하는 것이기 때문에' },
              { value: 'already_sorted', label: '나머지 부분은 이미 정렬되어 있기 때문에' },
            ],
            expected: 'one_step_task',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sort_056_transfer_1',
        title: '가장 무거운 화물을 맨 뒤로',
        description: '가장 큰 화물의 인덱스를 찾아 마지막 인덱스와 교환한 리스트를 반환하세요.',
        entryFunction: 'move_max_to_end',
        starterCode: 'def move_max_to_end(cargos):\n    pass\n',
        contextCard: {
          title: '🏗️ 최댓값 이동 전략',
          strategyGuide: '가장 무거운 화물의 위치를 기억하며 목록을 훑은 뒤, 그 위치와 맨 뒤 자리를 딱 한 번 교환합니다.',
        },
        thoughtCheck: {
          question: 'cargos = [4, 4, 2]일 때 move_max_to_end(cargos)의 결과는 무엇일까요?',
          options: [
            { value: '[2, 4, 4]', label: '[2, 4, 4] — 처음 나온 최댓값 위치와 맨 뒤가 교환된다' },
            { value: '[4, 4, 2]', label: '[4, 4, 2] — 이미 최댓값이 있어 그대로다' },
          ],
          expected: '[2, 4, 4]',
        },
        testCases: [
          { inputs: { cargos: [6, 2, 8, 1] }, expected: [6, 2, 1, 8] },
          { inputs: { cargos: [5, 1] }, expected: [1, 5] },
        ],
      },
    ],
  },
})
