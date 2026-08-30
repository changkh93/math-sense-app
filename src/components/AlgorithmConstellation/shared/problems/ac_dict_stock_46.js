import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_STOCK_46 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-STOCK-46',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 46,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-FREQ-44'],
  },
  identity: {
    studentTitle: '화물 재고 장부',
    subtitle: '초기 재고에 입고량을 누적 갱신한 뒤, 요청된 부품의 최종 수량을 조회합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:dict', 'statement:for', 'statement:if', 'operator:membership-in'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:frequency-table'],
    introduces: ['pattern:keyed-state-update'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'container-membership', 'decision', 'scalar-sequence'],
    requiredClaims: ['KEYED_STATE_UPDATE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "초기 재고에 BOLT가 2개 있을 때, [['BOLT', 3]] 입고가 들어오면 최종 BOLT 수량은 얼마일까요?",
      options: [
        { value: 'bolt_5', label: '5개 (기존 2개 + 입고 3개)' },
        { value: 'bolt_3', label: '3개 (입고량만 기록)' },
        { value: 'bolt_2', label: '2개 (기존 수량 유지)' },
      ],
      expected: 'bolt_5',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📦 화물 재고 누적 관리',
          description: '입고 목록을 순회하며 화물 코드별 수량을 누적 갱신하고 최종 수량을 조회합니다.',
          variables: [
            { name: 'update', value: '["BOLT", 3]', label: '입고 내역' },
            { name: 'currentStock', value: '{"BOLT": 5, "NUT": 4}', label: '현재 재고 장부' },
            { name: 'targetResult', value: '5', label: 'BOLT 최종 수량' },
          ],
          guidance: '장부에 이미 있는 부품은 기존 수량에 더하고, 처음 입고된 부품은 새 이름표로 등록합니다.',
        },
        initialState: { update: null, currentStock: { BOLT: 2, NUT: 4 }, targetResult: null },
        initialStateLabel: '시작: 초기 재고 { BOLT: 2, NUT: 4 }',
        initialStepTitle: '🚀 시작 (입고 처리 준비)',
        initialPrompt: '첫 번째 입고 내역부터 차례대로 장부에 반영합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① ["BOLT", 3] 입고 처리',
            operationLabel: '기존 BOLT(2)에 3을 더해 5로 갱신',
            codeSnippet: '# BOLT: 2 + 3 -> 5',
            prompt: '기존 재고 2개에 새로 입고된 3개를 더해 BOLT 수량이 5가 됩니다.',
            stateAfter: { update: ['BOLT', 3], currentStock: { BOLT: 5, NUT: 4 }, targetResult: null },
          },
          {
            id: 'f1',
            stepTitle: '② ["CORE", 2] 입고 처리',
            operationLabel: '장부에 없던 CORE이므로 새 이름표(2) 등록',
            codeSnippet: '# CORE: 2로 신규 등록',
            prompt: '새로운 부품 CORE의 이름표를 만들고 수량 2를 기록합니다.',
            stateAfter: { update: ['CORE', 2], currentStock: { BOLT: 5, NUT: 4, CORE: 2 }, targetResult: null },
          },
          {
            id: 'f2',
            stepTitle: '③ "BOLT" 최종 수량 조회',
            operationLabel: '장부에서 "BOLT"를 찾아 최종 수량 5 반환',
            codeSnippet: '# 최종 BOLT 수량 = 5',
            prompt: '모든 입고를 마친 뒤 요청받은 "BOLT"의 최종 수량 5를 반환합니다.',
            stateAfter: { update: null, currentStock: { BOLT: 5, NUT: 4, CORE: 2 }, targetResult: 5 },
          },
        ],
        predictionPrompt: '입고 내역을 반영한 뒤 요청된 부품의 최종 수량을 반환하세요.',
        rulePrompt: '재고 누적 및 조회 규칙',
        ruleStatement: '입고된 수량을 장부의 부품별로 누적 갱신하고, 요청된 부품의 최종 수량을 조회합니다.',
      },
    },
    code: {
      entryFunction: 'get_final_stock',
      starterCode: `def get_final_stock(stock, updates, requested_part):\n    # 입고 내역을 반영한 뒤 요청된 부품의 최종 수량을 반환하세요.\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { stock: { BOLT: 2 }, updates: [['BOLT', 3]], requested_part: 'BOLT' }, expected: 5 },
      { inputs: { stock: { NUT: 4 }, updates: [['CORE', 2]], requested_part: 'CORE' }, expected: 2 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_dict_046_1',
        title: '장부 갱신 및 조회 원리 이해',
        prompt: '장부에 입고 내역을 기록하고 조회하는 과정을 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '장부에 이미 수량 2개가 있던 부품에 3개가 추가 입고되면 최종 수량은 얼마여야 할까요?',
            options: [
              { value: 'accumulate_5', label: '5개 (기존 수량 2 + 추가 입고 3)' },
              { value: 'overwrite_3', label: '3개 (최근 입고량으로 덮어씀)' },
            ],
            expected: 'accumulate_5',
          },
          {
            id: 'q2',
            text: '초기 장부에 없던 새로운 부품이 입고되면 장부를 어떻게 다루어야 할까요?',
            options: [
              { value: 'create_new_entry', label: '새로운 이름표를 만들어 입고된 수량으로 시작한다' },
              { value: 'ignore_new', label: '초기 장부에 없으므로 무시한다' },
            ],
            expected: 'create_new_entry',
          },
          {
            id: 'q3',
            text: '모든 입고가 끝난 뒤에도 요청된 부품이 장부에 한 번도 없다면 반환해야 하는 기본값은 무엇일까요?',
            options: [
              { value: 'return_zero', label: '0 (재고 없음)' },
              { value: 'return_none', label: '-1' },
            ],
            expected: 'return_zero',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_046_transfer_1',
        title: '탐사팀 점수 장부',
        description: '초기 팀별 점수(initial_scores)에 추가 보너스 점수(bonus_events)를 누적 반영한 뒤, 특정 탐사팀(requested_crew)의 최종 점수를 반환합니다. 없는 팀은 0점을 반환합니다.',
        entryFunction: 'get_final_crew_score',
        starterCode: `def get_final_crew_score(initial_scores, bonus_events, requested_crew):\n    # 보너스 점수를 누적 갱신한 뒤 요청된 팀의 최종 점수를 반환하세요.\n    pass\n`,
        contextCard: {
          title: '🏅 팀 점수 갱신 전략',
          strategyGuide: '보너스 획득 팀이 장부에 있으면 기존 점수에 더하고, 처음이면 보너스 점수로 시작한 뒤 대상 팀의 점수를 조회합니다.',
        },
        thoughtCheck: {
          question: '초기 점수가 10점인 팀이 5점 보너스를 받으면 최종 점수는 얼마가 될까요?',
          options: [
            { value: 'score_15', label: '15점' },
            { value: 'score_5', label: '5점' },
          ],
          expected: 'score_15',
        },
        testCases: [
          { inputs: { initial_scores: { ALPHA: 10 }, bonus_events: [['ALPHA', 5]], requested_crew: 'ALPHA' }, expected: 15 },
          { inputs: { initial_scores: { BETA: 20 }, bonus_events: [['GAMMA', 8]], requested_crew: 'GAMMA' }, expected: 8 },
        ],
      },
    ],
  },
})
