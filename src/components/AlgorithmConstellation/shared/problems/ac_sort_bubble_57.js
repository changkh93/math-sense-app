import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SORT_BUBBLE_57 = createCapabilityPrototypeKernel({
  problemId: 'AC-SORT-BUBBLE-57',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 57,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-SORT-MIN-01'],
  },
  identity: {
    studentTitle: '큰 화물을 뒤로 밀기',
    subtitle: '이웃한 두 화물을 비교해 앞이 크면 자리를 바꾸고, 목록을 한 번만 통과합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:comparison-lower-bound'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:select-extreme-and-swap'],
    introduces: ['pattern:adjacent-swap-pass'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'decision'],
    requiredClaims: ['ADJACENT_SWAP_PASS'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '화물 [5, 1, 4, 2]를 왼쪽부터 이웃끼리 비교하며 한 번 통과하면 어떤 목록이 될까요?',
      options: [
        { value: 'one_pass_result', label: '[1, 4, 2, 5] — 가장 큰 5가 맨 뒤로 갔다' },
        { value: 'full_sorted', label: '[1, 2, 4, 5] — 전체가 정렬되었다' },
        { value: 'unchanged', label: '[5, 1, 4, 2] — 그대로다' },
      ],
      expected: 'one_pass_result',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🫧 인접 교환 통과판',
          description: '왼쪽부터 이웃한 두 화물을 비교해 앞이 크면 바로 자리를 바꿉니다. 목록을 딱 한 번 통과해요.',
          variables: [
            { name: 'cargos', value: '[5, 1, 4, 2]' },
            { name: 'passRule', value: '한 번 통과', label: '통과 규칙' },
            { name: 'biggestGoes', value: '맨 뒤로', label: '최댓값의 행선지' },
          ],
          guidance: '한 번의 통과로 전체가 정렬되지는 않아요. 가장 큰 값만 맨 뒤로 보장됩니다.',
        },
        initialState: { compareIndex: null, comparedPair: [], swapped: null, cargos: [] },
        initialStateLabel: '시작: [5, 1, 4, 2]',
        initialStepTitle: '🚀 시작 (한 번의 통과)',
        initialPrompt: '이웃 비교가 일어날 때마다 목록이 어떻게 변하는지 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 이웃 비교: 5와 1',
            operationLabel: '5 > 1 -> 교환 -> [1, 5, 4, 2]',
            codeSnippet: '# 앞이 크면 자리 교환',
            prompt: '큰 값 5가 한 칸 뒤로 밀려났습니다.',
            stateAfter: { compareIndex: 0, comparedPair: [5, 1], swapped: true, cargos: [1, 5, 4, 2] },
          },
          {
            id: 'f1',
            stepTitle: '② 이웃 비교: 5와 4',
            operationLabel: '5 > 4 -> 교환 -> [1, 4, 5, 2]',
            codeSnippet: '# 큰 값이 계속 뒤로 이동',
            prompt: '5가 또 한 칸 뒤로 갔어요. 큰 값이 오른쪽으로 떠다니듯 이동합니다.',
            stateAfter: { compareIndex: 1, comparedPair: [5, 4], swapped: true, cargos: [1, 4, 5, 2] },
          },
          {
            id: 'f2',
            stepTitle: '③ 이웃 비교: 5와 2',
            operationLabel: '5 > 2 -> 교환 -> [1, 4, 2, 5]',
            codeSnippet: '# 통과 종료: 가장 큰 5가 맨 뒤에 도착',
            prompt: '한 번의 통과가 끝났습니다. 가장 큰 5가 맨 뒤에 있지만 전체는 아직 정렬되지 않았어요.',
            stateAfter: { compareIndex: 2, comparedPair: [5, 2], swapped: true, cargos: [1, 4, 2, 5] },
          },
          {
            // 이미 정렬된 목록의 독립 실험: 교환 없이 그대로 통과한다.
            id: 'f3_sorted',
            stepTitle: '④ 새 실험: 이미 정렬된 [1, 2, 3]',
            experimentReset: true,
            stateBefore: { compareIndex: null, comparedPair: [], swapped: null, cargos: [] },
            operationLabel: '어떤 이웃도 앞이 크지 않음 -> 교환 0회',
            codeSnippet: '# 새 실험: [1, 2, 3] -> 교환 없이 그대로',
            prompt: '이미 정렬된 목록은 한 번의 통과 동안 교환이 한 번도 일어나지 않고 그대로 반환됩니다.',
            stateAfter: { compareIndex: 1, comparedPair: [2, 3], swapped: false, cargos: [1, 2, 3] },
          },
        ],
        predictionPrompt: '왼쪽부터 이웃을 비교·교환하는 한 번의 통과 결과 목록을 반환하세요.',
        rulePrompt: '인접 교환 한 통과 규칙',
        ruleStatement: '이웃한 두 값을 비교해 앞이 크면 자리를 바꾸고 다음 이웃으로 넘어간다. 한 번의 통과 뒤 가장 큰 값이 맨 뒤에 온다.',
      },
    },
    code: {
      entryFunction: 'bubble_cargo_pass',
      starterCode: `def bubble_cargo_pass(cargos):
    # 왼쪽부터 이웃을 비교·교환하는 한 번의 통과를 수행하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { cargos: [5, 1, 4, 2] }, expected: [1, 4, 2, 5] },
      { inputs: { cargos: [1, 2, 3] }, expected: [1, 2, 3] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sort_057_1',
        title: '인접 교환 통과 이해',
        prompt: '버블 한 통과의 동작을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '한 번의 통과가 끝난 뒤 가장 큰 값이 맨 뒤에 있는 이유는 무엇일까요?',
            options: [
              { value: 'largest_bubbles_end', label: '가장 큰 값은 어떤 이웃과 비교해도 계속 교환되어 뒤로 밀려나기 때문에' },
              { value: 'smallest_sinks', label: '가장 작은 값이 먼저 골라지기 때문에' },
            ],
            expected: 'largest_bubbles_end',
          },
          {
            id: 'q2',
            text: '이미 정렬된 목록을 한 번 통과하면 어떻게 될까요?',
            options: [
              { value: 'no_swaps', label: '앞이 큰 이웃이 없어 교환 없이 그대로 반환된다' },
              { value: 'reverse_sort', label: '통과할 때마다 순서가 뒤집힌다' },
            ],
            expected: 'no_swaps',
          },
          {
            id: 'q3',
            text: '빈 목록([])이나 한 칸 목록을 통과하면 어떻게 될까요?',
            options: [
              { value: 'nothing_to_compare', label: '비교할 이웃이 없어 그대로 반환된다' },
              { value: 'error', label: '비교할 이웃이 없어 오류가 난다' },
            ],
            expected: 'nothing_to_compare',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sort_057_transfer_1',
        title: '작은 화물을 앞으로 밀기',
        description: '오른쪽 끝 이웃부터 왼쪽 방향으로 이웃을 비교해, 작은 값을 왼쪽으로 밀어내는 한 번의 통과를 수행합니다.',
        entryFunction: 'bubble_smallest_to_front',
        starterCode: `def bubble_smallest_to_front(cargos):
    # 오른쪽에서 왼쪽으로 이웃을 비교하는 한 번의 통과를 수행하세요.
    pass
`,
        contextCard: {
          title: '🌬️ 반대 방향 통과 전략',
          strategyGuide: '오른쪽 끝 이웃부터 비교하며 작은 값을 왼쪽으로 한 칸씩 밀어내면, 한 번의 통과로 가장 작은 값이 맨 앞에 도착합니다.',
        },
        thoughtCheck: {
          question: '오른쪽에서 왼쪽으로 통과한 뒤 가장 작은 값은 어디에 있을까요?',
          options: [
            { value: 'front', label: '맨 앞 — 왼쪽으로 계속 밀려나기 때문에' },
            { value: 'end', label: '맨 뒤 — 오른쪽으로 밀려나기 때문에' },
          ],
          expected: 'front',
        },
        testCases: [
          { inputs: { cargos: [4, 3, 2, 1] }, expected: [1, 4, 3, 2] },
          { inputs: { cargos: [1, 2] }, expected: [1, 2] },
        ],
      },
    ],
  },
})
