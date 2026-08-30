import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_BUG_50 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-BUG-50',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 50,
    constellationId: 'constellation-4',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-FREQ-44', 'AC-CODE-FIRST-ERROR-01'],
  },
  identity: {
    studentTitle: '빈도표 오류 찾기',
    subtitle: '실행은 되지만 잘못된 빈도표를 내는 코드를 관찰하고, 기대 상태와 처음 달라진 순간을 찾아 수리합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:dict',
      'statement:for',
      'statement:if',
      'operator:membership-in',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:frequency-table'],
    introduces: ['pattern:first-state-divergence'],
  },
  evidenceRecipe: {
    primitives: [
      'source-debug',
      'container-scan',
      'decision',
    ],
    requiredClaims: ['FIRST_FREQUENCY_STATE_DIVERGENCE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "새 항목을 0으로 기록하는 버그 코드가 ['A', 'B', 'A']를 모두 처리한 뒤, A칸의 값은 얼마가 될까요?",
      options: [
        { value: 'a_is_1', label: '1 — 첫 A가 0으로 기록되고 두 번째 A에서 1로 증가한다' },
        { value: 'a_is_2', label: '2 — A가 두 번 등장했으므로 올바른 빈도표라면 2다' },
        { value: 'a_is_0', label: '0 — A칸이 만들어지지 않는다' },
      ],
      expected: 'a_is_1',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 빈도표 디버깅 관찰판',
          description: "기대 상태(올바른 빈도표)와 버그 코드의 실제 상태를 나란히 놓고, signals ['A', 'B', 'A']를 한 단계씩 처리합니다.",
          variables: [
            { name: 'expectedCounts', value: '{A: 2, B: 1}', label: '기대 상태' },
            { name: 'buggyCounts', value: '{A: 1, B: 0}', label: '버그 코드의 실제 상태' },
            { name: 'diverged', value: 'True', label: '두 상태가 어긋났는지' },
          ],
          guidance: '최종 결과만 보지 말고, 두 상태가 처음 어긋난 단계에 주목하세요.',
        },
        initialState: { signal: null, expectedCounts: {}, buggyCounts: {}, diverged: false },
        initialStateLabel: '시작: 두 표 모두 비어 있어 같은 상태',
        initialStepTitle: '🚀 시작 (기대 상태 vs 실제 상태)',
        initialPrompt: '신호를 하나씩 처리하며 기대 횟수표와 버그 코드의 횟수표를 나란히 비교합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 1번 신호 "A" 처리',
            operationLabel: '첫 신호 "A": 기대는 A칸 1, 버그 코드는 A칸 0',
            codeSnippet: '# 기대: 새 항목 1 등록 / 실제 버그: 새 항목 0 등록',
            prompt: '최초 차이가 일어난 단계예요. 최종 A칸이 1이라는 이유만으로 증가 줄이 틀렸다고 판단하면 안 됩니다. 이미 첫 새 항목 초기화에서 어긋났어요.',
            stateAfter: { signal: 'A', expectedCounts: { A: 1 }, buggyCounts: { A: 0 }, diverged: true },
          },
          {
            id: 'f1',
            stepTitle: '② 2번 신호 "B" 처리',
            operationLabel: '신호 "B": 기대는 B칸 1, 버그 코드는 B칸 0',
            codeSnippet: '# 같은 초기화 오류가 B에서도 반복된다',
            prompt: '차이가 그대로 유지됩니다. 규칙 자체가 잘못되었으므로 모든 새 항목에서 같은 어긋남이 나타나요.',
            stateAfter: { signal: 'B', expectedCounts: { A: 1, B: 1 }, buggyCounts: { A: 0, B: 0 }, diverged: true },
          },
          {
            id: 'f2',
            stepTitle: '③ 3번 신호 "A" 처리',
            operationLabel: '신호 "A" 재등장: 증가 분기는 정상 작동 (0 -> 1)',
            codeSnippet: '# 증가 줄은 이미 올바르다: A칸 0 -> 1',
            prompt: '증가 분기는 제대로 작동해 최종 A칸이 1이 되었지만, 올바른 값은 2예요. 수리할 줄은 증가 줄이 아니라 새 항목 초기화 줄입니다.',
            stateAfter: { signal: 'A', expectedCounts: { A: 2, B: 1 }, buggyCounts: { A: 1, B: 0 }, diverged: true },
          },
        ],
        predictionPrompt: '기대 상태와 실제 상태가 처음 달라지는 단계를 찾아, 잘못된 초기화 줄을 수리한 뒤 올바른 빈도표(dict)를 반환하세요.',
        rulePrompt: '최초 상태 차이 수리 규칙',
        ruleStatement: '입력을 하나씩 처리하며 기대 상태와 실제 상태를 비교하고, 처음 달라진 단계의 규칙을 고친다. 새 항목은 이미 한 번 등장했으므로 1로 시작한다.',
      },
    },
    code: {
      entryFunction: 'repair_signal_frequency',
      // 이 Starter는 수리 대상이다: 실행은 되지만 ['A']에서 {A: 0}을 반환해
      // Public Test 1에 실제로 실패한다. 주석으로 정답 값(1)을 알려주지 않는다.
      starterCode: `def repair_signal_frequency(signals):
    # 이 코드는 실행되지만 잘못된 빈도표를 만듭니다. 관찰하고 고쳐 보세요.
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 0
    return counts
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signals: ['A'] }, expected: { A: 1 } },
      { inputs: { signals: ['B', 'B'] }, expected: { B: 2 } },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_dict_050_1',
        title: '최초 상태 차이 찾기 이해',
        prompt: "버그 코드가 ['A', 'B', 'A']를 처리하는 상황에서 기대 상태와 실제 상태를 비교하세요.",
        questions: [
          {
            id: 'q1',
            text: '기대 상태와 실제 상태가 처음 달라지는 단계는 언제일까요?',
            options: [
              { value: 'first_signal', label: '첫 신호 "A"를 처리한 직후 — 새 항목 초기화 단계에서 이미 0으로 어긋난다' },
              { value: 'second_signal', label: '두 번째 신호 "B"를 처리한 직후' },
              { value: 'third_signal', label: '세 번째 신호 "A"를 처리한 직후 — 최종 A칸이 1이 되는 순간' },
            ],
            expected: 'first_signal',
          },
          {
            id: 'q2',
            text: '처음 등장한 신호의 칸을 1로 기록해야 하는 이유는 무엇일까요?',
            options: [
              { value: 'first_occurrence_is_one', label: '이미 한 번 등장했다는 사실이 1로 기록되어야 이후 등장 때 1씩 늘어나는 규칙과 이어진다' },
              { value: 'always_zero_start', label: '빈도표의 모든 칸은 0에서 시작해야 하므로' },
              { value: 'find_via_empty_input', label: '빈 입력으로 코드를 실행해 보면 바로 알 수 있으므로' },
            ],
            expected: 'first_occurrence_is_one',
          },
          {
            id: 'q3',
            text: '반복 항목을 증가시키는 줄(counts[signal] + 1)은 이미 올바릅니다. 수리해야 할 줄은 어느 쪽일까요?',
            options: [
              { value: 'fix_else_init', label: '처음 보는 신호의 칸을 새로 만드는 줄 (else 쪽 초기화)' },
              { value: 'fix_if_increment', label: '이미 있는 신호의 횟수를 늘리는 줄 (if 쪽 증가)' },
            ],
            expected: 'fix_else_init',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_050_transfer_1',
        title: '투표 집계기의 반복 득표 오류',
        description: '반복 득표가 누적되지 않는 투표 집계기(votes)를 수리해 후보별 득표수 Dictionary를 올바르게 반환합니다.',
        entryFunction: 'repair_vote_frequency',
        starterCode: `def repair_vote_frequency(votes):
    # 이 집계기는 반복 표를 올바르게 누적하지 못합니다. 관찰하고 고쳐 보세요.
    tally = {}
    for vote in votes:
        if vote in tally:
            tally[vote] = 1
        else:
            tally[vote] = 1
    return tally
`,
        contextCard: {
          title: '🗳️ 투표 집계 수리 전략',
          strategyGuide: '표를 처음 받은 후보는 칸을 만들어 첫 득표를 기록하고, 이미 칸이 있는 후보는 기존 득표에 다시 더해야 합니다. 초기화와 누적의 역할 차이에 주목하세요.',
        },
        thoughtCheck: {
          question: "버그 집계기가 ['X', 'Y', 'X']를 처리한 뒤 X의 득표수는 얼마로 기록되어 있을까요?",
          options: [
            { value: 'x_is_1', label: '1 — 반복 표가 누적되지 않고 다시 1로 덮어써진다' },
            { value: 'x_is_2', label: '2 — X가 두 번 등장했으므로' },
          ],
          expected: 'x_is_1',
        },
        testCases: [
          { inputs: { votes: ['DUO', 'DUO'] }, expected: { DUO: 2 } },
          { inputs: { votes: ['SOLO'] }, expected: { SOLO: 1 } },
        ],
      },
    ],
  },
})
