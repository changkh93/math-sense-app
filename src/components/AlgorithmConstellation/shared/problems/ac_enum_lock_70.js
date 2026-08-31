import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_LOCK_70 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-LOCK-70',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 70,
    constellationId: 'constellation-6',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-PAIR-01', 'AC-PAT-DIGIT-24', 'AC-COND-COMPLEX-18'],
  },
  identity: {
    studentTitle: '두 자릿수 암호 추리',
    subtitle: '00부터 99까지 후보를 만들어, 여러 단서를 동시에 만족하는 유일한 암호를 찾습니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:modulo', 'operator:floor-division', 'operator:equality', 'method:append'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:enumerate-then-filter'],
    introduces: ['pattern:constraint-intersection'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision'],
    requiredClaims: ['CONSTRAINT_INTERSECTION_FOUND'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "단서 [단서 하나: 추측 23과 일치 자리 2개]가 있을 때, 암호 후보는 몇 개 남을까요?",
      options: [
        { value: 'one', label: '1개 — 23만 남는다' },
        { value: 'many', label: '여러 개 — 두 자리 모두 일치해야 하는 단서는 강력하다' },
        { value: 'zero', label: '0개 — 일치할 수 없다' },
      ],
      expected: 'one',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔐 암호 추리 관찰판',
          description: '후보 00..99를 하나씩 만들어 단서 [추측 23, 일치 2]와 [추측 83, 일치 1]을 동시에 통과하는 암호를 찾습니다.',
          variables: [
            { name: 'clues', value: '[[23, 2], [83, 1]]' },
            { name: 'candidate', value: '00부터 99까지 하나씩', label: '후보' },
            { name: 'rule', value: '모든 단서를 통과한 첫 후보', label: '정답 조건' },
          ],
          guidance: '일치 자리는 십의 자리와 일의 자리를 각각 비교해 센니다.',
        },
        initialState: { candidate: null, clue1Hits: null, clue2Hits: null, allMatch: null },
        initialStateLabel: '시작: 후보 00부터 확인',
        initialStepTitle: '🚀 시작 (후보 전수 확인)',
        initialPrompt: '후보 하나가 단서들을 어떻게 통과하는지 관찰합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 후보 23 확인',
            operationLabel: '단서1: 두 자리 모두 일치(2) / 단서2: 십의 자리만 일치(1) -> 통과!',
            codeSnippet: '# 모든 단서를 만족한 첫 후보',
            prompt: '후보 23은 단서 [23, 2]와 [83, 1]을 모두 만족해요. 정답은 23!',
            stateAfter: { candidate: 23, clue1Hits: 2, clue2Hits: 1, allMatch: true },
          },
          {
            id: 'f1',
            stepTitle: '② 후보 03 확인 (정답이 23이 아니었다면)',
            operationLabel: '단서1: 십의 자리 0 vs 2 불일치 -> 1개 -> 단서 실패',
            codeSnippet: '# 단서 하나라도 어긋나면 후보 탈락',
            prompt: '단서 [23, 2]는 두 자리 모두 일치해야 하므로 03은 탈락합니다.',
            stateAfter: { candidate: 3, clue1Hits: 1, clue2Hits: 1, allMatch: false },
          },
          {
            // 단서 하나만 만족하는 오답을 가르는 독립 실험.
            id: 'f2_partial',
            stepTitle: '③ 새 실험: 단서 하나만 만족하는 83',
            experimentReset: true,
            stateBefore: { candidate: null, clue1Hits: null, clue2Hits: null, allMatch: null },
            operationLabel: '단서2는 통과하지 단서1은 실패 -> 정답 아님',
            codeSnippet: '# 새 실험: 모든 단서를 통과해야 한다',
            prompt: '일부 단서만 만족하는 후보는 정답이 될 수 없어요. 교집합이 답입니다.',
            stateAfter: { candidate: 83, clue1Hits: 0, clue2Hits: 2, allMatch: false },
          },
        ],
        predictionPrompt: '모든 단서를 동시에 만족하는 첫 암호(0~99)를 반환하고, 없으면 -1을 반환하세요.',
        rulePrompt: '제약 교집합 규칙',
        ruleStatement: '후보 전체를 하나씩 만들어 보며 모든 단서를 통과하는 후보만 남긴다. 통과한 첫 후보가 답이고, 없으면 -1이다.',
      },
    },
    code: {
      entryFunction: 'deduce_lock_code',
      starterCode: `def deduce_lock_code(clues):
    # 모든 단서를 만족하는 암호(0~99)를 반환하세요. 없으면 -1을 반환합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { clues: [[0, 1], [1, 1], [18, 1]] }, expected: 8 },
      { inputs: { clues: [[0, 0], [5, 1], [20, 1]] }, expected: 25 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_070_1',
        title: '제약 교집합 이해',
        prompt: '여러 단서로 후보를 추리는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '후보 하나가 정답이 되려면 단서들을 어떻게 통과해야 할까요?',
            options: [
              { value: 'all_clues', label: '모든 단서와의 일치 개수가 정확히 같아야 한다' },
              { value: 'any_clue', label: '단서 중 하나만 만족하면 충분하다' },
            ],
            expected: 'all_clues',
          },
          {
            id: 'q2',
            text: '일치 자리를 셀 때 십의 자리는 십의 자리끼리 비교하는 이유는 무엇일까요?',
            options: [
              { value: 'position_match', label: '단서가 말하는 것은 위치까지 일치하는 숫자의 개수이기 때문에' },
              { value: 'value_only', label: '숫자가 들어 있기만 하면 되기 때문에' },
            ],
            expected: 'position_match',
          },
          {
            id: 'q3',
            text: '단서를 만나기 전에 추측의 자릿수를 미리 나눠 두면 좋은 이유는 무엇일까요?',
            options: [
              { value: 'precompute_once', label: '후보 100개를 확인하는 동안 같은 나눗셈을 반복하지 않아도 되기 때문에' },
              { value: 'shorter_code', label: '코드가 더 짧아지기 때문에' },
            ],
            expected: 'precompute_once',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_070_transfer_1',
        title: '두 자리 탐사 채널 추리',
        description: '채널 단서 목록(clues, [추측, 일치 자리 수])에서 모든 단서를 만족하는 유일한 두 자리 채널 번호를 찾아 반환합니다.',
        entryFunction: 'find_channel_number',
        starterCode: `def find_channel_number(clues):
    # 모든 단서를 만족하는 채널 번호(0~99)를 반환하세요. 없으면 -1을 반환합니다.
    pass
`,
        contextCard: {
          title: '📻 채널 번호 추리 전략',
          strategyGuide: '후보 번호를 0부터 99까지 하나씩 만들어 보며, 단서마다 십의 자리와 일의 자리 일치 개수를 확인해 모든 단서를 통과한 첫 후보를 답으로 삼습니다.',
        },
        thoughtCheck: {
          question: "단서 [단서: 추측 40, 일치 1]은 후보 46을 남길까요?",
          options: [
            { value: 'keep', label: '남긴다 — 십의 자리 4가 일치해 일치 개수 1과 같다' },
            { value: 'drop', label: '버린다 — 두 자리가 모두 일치해야 한다' },
          ],
          expected: 'keep',
        },
        testCases: [
          { inputs: { clues: [[0, 1], [1, 1], [13, 1]] }, expected: 3 },
          { inputs: { clues: [[0, 1], [1, 1], [14, 1]] }, expected: 4 },
        ],
      },
    ],
  },
})
