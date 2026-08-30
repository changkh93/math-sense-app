import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_TWOSUM_47 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-TWOSUM-47',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 47,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-STOCK-46', 'AC-STR-REVERSE-01'],
  },
  identity: {
    studentTitle: '목표 에너지의 두 캡슐',
    subtitle: '필요한 에너지 짝을 계산한 뒤, 뒤쪽 목록에서 그 값이 있는지 확인합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'builtin:len',
      'builtin:range',
      'statement:for',
      'statement:if',
      'operator:membership-in',
      'syntax:slicing',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:membership-query'],
    introduces: ['pattern:complement-search'],
  },
  evidenceRecipe: {
    primitives: [
      'container-scan',
      'container-membership',
      'decision',
      'scalar-sequence',
    ],
    requiredClaims: ['COMPLEMENT_SEARCH_WITH_DISTINCT_POSITIONS'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '에너지 목록 [4, 1, 8, 6]에서 합이 목표 10이 되는 서로 다른 두 캡슐이 존재할까요?',
      options: [
        { value: 'pair_exists', label: '존재한다 (4와 6을 더하면 10)' },
        { value: 'no_pair', label: '존재하지 않는다' },
        { value: 'single_ten', label: '10 캡슐 하나만 있어야 한다' },
      ],
      expected: 'pair_exists',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔋 두 에너지 캡슐 합산 검사판',
          description: '각 캡슐마다 필요한 짝을 계산하고 아직 확인하지 않은 뒤쪽 목록에서 찾습니다.',
          variables: [
            { name: 'currentEnergy', value: '4', label: '현재 캡슐' },
            { name: 'neededEnergy', value: '6', label: '필요한 짝 (10 - 4)' },
            { name: 'remainingEnergies', value: '[1, 8, 6]', label: '남은 뒤쪽 목록' },
            { name: 'foundPair', value: 'True', label: '짝 발견 여부' },
          ],
          guidance: '현재 캡슐을 제외한 뒤쪽 목록에서만 짝을 찾아 같은 캡슐을 두 번 쓰는 실수를 방지합니다.',
        },
        initialState: { currentEnergy: null, neededEnergy: null, remainingEnergies: [4, 1, 8, 6], foundPair: null },
        initialStateLabel: '시작: 전체 목록 [4, 1, 8, 6], 목표 10',
        initialStepTitle: '🚀 시작 (목표 10의 두 캡슐 탐색)',
        initialPrompt: '0번 캡슐부터 순서대로 필요한 짝을 뒤쪽에서 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 캡슐 4 검사',
            operationLabel: '필요한 짝 6(10 - 4)이 뒤쪽 [1, 8, 6]에 있음 -> True',
            codeSnippet: '# 10 - 4 = 6 -> [1, 8, 6]에 6 존재',
            prompt: '0번 캡슐 4에 필요한 짝 6이 뒤쪽 목록 [1, 8, 6]에 들어 있어 즉시 True가 됩니다.',
            stateAfter: { currentEnergy: 4, neededEnergy: 6, remainingEnergies: [1, 8, 6], foundPair: true },
          },
          {
            id: 'f1_counter',
            stepTitle: '② 반례: 캡슐 [5] 하나만 있을 때',
            operationLabel: '필요한 짝 5가 뒤쪽 빈 목록 []에 없음 -> False',
            codeSnippet: '# 10 - 5 = 5 -> []에 5 없음',
            prompt: '캡슐이 5 하나뿐이면 뒤쪽에 두 번째 5가 없으므로 10을 만들 수 없습니다(False).',
            stateAfter: { currentEnergy: 5, neededEnergy: 5, remainingEnergies: [], foundPair: false },
          },
        ],
        predictionPrompt: '서로 다른 두 캡슐의 에너지 합이 목표가 되는지 여부(True/False)를 반환하세요.',
        rulePrompt: '필요한 짝 계산 및 뒤쪽 탐색 규칙',
        ruleStatement: '목표에서 현재 에너지를 뺀 값이 아직 보지 않은 뒤쪽 목록에 들어 있으면 True입니다.',
      },
    },
    code: {
      entryFunction: 'has_energy_pair',
      starterCode: `def has_energy_pair(energies, target):\n    # 서로 다른 두 캡슐의 합이 target이 되는지 판정하세요.\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { energies: [2, 7, 11], target: 9 }, expected: true },
      { inputs: { energies: [1, 2, 4], target: 8 }, expected: false },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_dict_047_1',
        title: '필요한 짝 계산과 뒤쪽 탐색 이해',
        prompt: '목표 합을 이루는 두 캡슐을 찾을 때 필요한 원리를 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '목표 합이 target이고 현재 캡슐의 에너지가 energy일 때, needed = target - energy가 의미하는 것은 무엇일까요?',
            options: [
              { value: 'needed_pair', label: '현재 캡슐과 더해서 target을 만들기 위해 필요한 짝의 에너지' },
              { value: 'difference', label: '두 캡슐 에너지의 단순 차이' },
            ],
            expected: 'needed_pair',
          },
          {
            id: 'q2',
            text: '필요한 짝을 전체 목록이 아니라 현재 위치 뒤쪽 목록에서만 찾는 이유는 무엇일까요?',
            options: [
              { value: 'prevent_self_reuse', label: '현재 위치의 캡슐을 혼자서 두 번 재사용하는 오류를 막기 위해' },
              { value: 'increase_speed', label: '목록의 길이를 늘리기 위해' },
            ],
            expected: 'prevent_self_reuse',
          },
          {
            id: 'q3',
            text: '에너지 목록이 [5] 하나이고 목표가 10일 때, 정답이 False인 이유는 무엇일까요?',
            options: [
              { value: 'distinct_capsules_required', label: '서로 다른 위치의 두 캡슐이 필요한데 5가 하나뿐이어서' },
              { value: 'wrong_target', label: '10은 홀수여서' },
            ],
            expected: 'distinct_capsules_required',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_047_transfer_1',
        title: '제한 무게를 맞추는 두 화물',
        description: '화물 무게 목록(weights)에서 서로 다른 두 화물의 무게 합이 목표 적재량(capacity)과 일치하는지 판정합니다.',
        entryFunction: 'has_cargo_pair',
        starterCode: `def has_cargo_pair(weights, capacity):\n    # 서로 다른 두 화물의 무게 합이 capacity가 되는지 판정하세요.\n    pass\n`,
        contextCard: {
          title: '⚖️ 두 화물 조합 전략',
          strategyGuide: '각 화물마다 필요한 무게(capacity - weight)를 계산하고, 뒤쪽 화물 목록에 있는지 확인합니다.',
        },
        thoughtCheck: {
          question: '무게 목록 [10, 20, 30]에서 용량이 50일 때 조합이 가능할까요?',
          options: [
            { value: 'possible_50', label: '가능하다 (20과 30의 합이 50)' },
            { value: 'impossible_50', label: '불가능하다' },
          ],
          expected: 'possible_50',
        },
        testCases: [
          { inputs: { weights: [10, 20, 30], capacity: 50 }, expected: true },
          { inputs: { weights: [15, 25], capacity: 30 }, expected: false },
        ],
      },
    ],
  },
})
