/**
 * Problem: AC-ENUM-PAIR-01 (두 탐사 지점 모두 비교하기)
 * Constellation: 6 (가능성 연구소)
 * Route Role: Core / Learning Role: Anchor
 * Catalog Order: 61
 */

import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_PAIR_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-PAIR-01',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 61,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005', 'AC-EXP-LOOP-06'],
    introduces: { concept: 'pair-enumeration', pythonTool: null },
    lensId: 'state-transition',
    transferTemplateId: 'bounded-all-pairs-v1',
  },
  identity: {
    studentTitle: '두 탐사 지점 모두 비교하기',
    subtitle: '서로 다른 두 위치를 빠짐없이 훑으며 합이 목표와 같은 첫 쌍을 찾습니다.',
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision'],
    requiredClaims: ['ALL_PAIRS_SEARCHED_WITHOUT_DUPLICATION'],
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:procedure-decomposition'],
    introduces: ['pattern:unordered-pair-enumeration'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '캡슐 [2, 7, 11, 15]에서 두 개를 골라 합이 9가 되는 조합이 있을까요?',
      options: ['예 (2와 7)', '아니오 (합이 9가 되는 조합 없음)'],
      expected: '예 (2와 7)',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔎 쌍 열거 관찰판',
          description: '캡슐 [2, 7, 11, 15]에서 합이 9인 쌍을 찾습니다. 앞 위치 i를 고르고 뒤쪽 j만 짝으로 확인해요.',
          variables: [
            { name: 'capsules', value: '[2, 7, 11, 15]' },
            { name: 'target', value: '9' },
            { name: 'orderRule', value: 'j는 항상 i보다 뒤', label: '중복 방지 규칙' },
          ],
          guidance: '(0,1)을 확인한 뒤 (1,0)을 다시 확인하면 같은 쌍을 두 번 세는 것이 됩니다.',
        },
        initialState: { i: null, j: null, pairSum: null, found: null },
        initialStateLabel: '시작: 아직 어떤 쌍도 확인 전',
        initialStepTitle: '🚀 시작 (쌍 열거 대기)',
        initialPrompt: '앞 위치를 고정하고 뒤쪽 위치를 차례로 짝지어 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 앞 위치 i = 0 고정',
            operationLabel: '짝 j = 1: 2 + 7 = 9 -> 발견!',
            codeSnippet: '# i보다 뒤쪽 위치만 짝으로 확인',
            prompt: '첫 후보 (0, 1)이 곧 정답입니다. 찾는 순간 그 위치 쌍을 반환해요.',
            stateAfter: { i: 0, j: 1, pairSum: 9, found: true },
          },
          {
            id: 'f1',
            stepTitle: '② 만약 (0,1)이 아니었다면',
            operationLabel: '짝 j = 2, j = 3 순서로 계속 확인',
            codeSnippet: '# 같은 앞 위치에서 뒤쪽을 모두 확인',
            prompt: 'i = 0에서 짝이 없으면 i = 1로 넘어가고, 그 때의 짝은 2번과 3번뿐이에요.',
            stateAfter: { i: 1, j: 3, pairSum: null, found: false },
          },
          {
            // 이미 True 반환과 별개인 독립 실험: 순서 규칙이 없으면 중복이 생긴다.
            id: 'f2_counter',
            stepTitle: '③ 새 실험: 뒤쪽 제한이 없다면?',
            experimentReset: true,
            stateBefore: { i: null, j: null, pairSum: null, found: null },
            operationLabel: '짝 j를 처음부터 확인하면 (1, 0)도 다시 봄',
            codeSnippet: '# 새 실험: (0,1)과 (1,0)은 같은 쌍',
            prompt: '짝을 앞쪽까지 포함해 확인하면 같은 쌍을 두 번 세게 됩니다. j는 항상 i보다 뒤쪽만!',
            stateAfter: { i: 1, j: 0, pairSum: 9, found: true },
          },
        ],
        predictionPrompt: '합이 target인 서로 다른 두 위치의 쌍 [i, j]를 반환하고, 없으면 빈 목록을 반환하세요.',
        rulePrompt: '서로 다른 쌍 열거 규칙',
        ruleStatement: '앞 위치를 고정하고 그보다 뒤쪽 위치만 짝으로 확인한다. 찾으면 위치 쌍을 반환하고, 끝까지 없으면 빈 목록을 반환한다.',
      },
    },
    code: {
      entryFunction: 'find_pair_sum',
      starterCode: `def find_pair_sum(capsules, target):
    # 합이 target이 되는 서로 다른 두 위치를 빠짐없이 찾아보세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { capsules: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { inputs: { capsules: [1, 2, 3], target: 10 }, expected: [] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_comb_061_1',
        prompt: '두 수의 합이 target이 되는 인덱스 쌍 탐색 결과를 예측해 보세요.',
        questions: [
          {
            id: 'q1',
            text: 'capsules = [1, 3, 5], target = 8일 때 find_pair_sum(capsules, target)의 결과는?',
            options: [
              { value: '[1, 2]', label: '[1, 2]' },
              { value: '[0, 2]', label: '[0, 2]' },
              { value: '[]', label: '[]' },
            ],
            expected: '[1, 2]',
          },
          {
            id: 'q2',
            text: '짝 위치 j를 항상 i보다 뒤쪽부터만 확인하는 이유는 무엇일까요?',
            options: [
              { value: 'avoid_duplicates', label: '(0, 1)과 (1, 0)처럼 같은 쌍을 두 번 세는 일과 자기 자신과의 짝을 막기 위해' },
              { value: 'faster_scan', label: '탐색 속도를 조금이라도 빠르게 보이기 위해' },
            ],
            expected: 'avoid_duplicates',
          },
          {
            id: 'q3',
            text: '모든 쌍을 확인해도 합이 target인 쌍이 없다면 무엇을 반환해야 할까요?',
            options: [
              { value: 'empty_list', label: '빈 목록([]) — 못 찾았다는 약속된 결과' },
              { value: 'minus_one', label: '-1 — 이 문제의 실패 표시' },
            ],
            expected: 'empty_list',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_comb_061_transfer_1',
        title: '목표 차이를 만드는 두 캡슐',
        description: '두 캡슐의 차이 (capsules[j] - capsules[i])가 target이 되는 인덱스 쌍 [i, j]를 반환하세요.',
        entryFunction: 'find_pair_diff',
        starterCode: 'def find_pair_diff(capsules, target):\n    pass\n',
        contextCard: {
          title: '↔️ 차이 짝 탐색 전략',
          strategyGuide: '두 위치를 순서 있게 골라 뒤쪽 값에서 앞쪽 값을 뺀 차이가 목표와 같은지 확인하고, 첫 짝을 찾으면 그 위치 쌍을 알려줍니다.',
        },
        thoughtCheck: {
          question: '캡슐 [3, 10]에서 차이 7을 만드는 위치 쌍 [i, j]는 무엇일까요?',
          options: [
            { value: 'pair_01', label: '[0, 1] — 10 빼기 3이 7이다' },
            { value: 'pair_10', label: '[1, 0] — 3 빼기 10이 7이다' },
          ],
          expected: 'pair_01',
        },
        testCases: [
          { inputs: { capsules: [2, 9], target: 7 }, expected: [0, 1] },
          { inputs: { capsules: [6, 1, 4], target: 3 }, expected: [1, 2] },
        ],
      },
    ],
  },
})
