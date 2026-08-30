/**
 * AC-DICT-STOCK-46 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-STOCK-46',
  problemVersion: 1,
  entryFunction: 'get_final_stock',
  officialSolutionCode: `def get_final_stock(stock, updates, requested_part):
    for update in updates:
        part = update[0]
        amount = update[1]
        if part in stock:
            stock[part] = stock[part] + amount
        else:
            stock[part] = amount

    if requested_part in stock:
        return stock[requested_part]
    return 0
`,
  alternativeSolutions: [
    `def get_final_stock(stock, updates, requested_part):
    for u in updates:
        k = u[0]
        v = u[1]
        if k not in stock:
            stock[k] = 0
        stock[k] = stock[k] + v

    if requested_part in stock:
        return stock[requested_part]
    else:
        return 0
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'STOCK-OVERWRITES',
      expectedFailingGroup: 'existing-key-update',
      code: `def get_final_stock(stock, updates, requested_part):
    for update in updates:
        part = update[0]
        amount = update[1]
        stock[part] = amount

    if requested_part in stock:
        return stock[requested_part]
    return 0
`,
    },
    {
      id: 'STOCK-IGNORES-NEW-KEY',
      expectedFailingGroup: 'new-key-update',
      code: `def get_final_stock(stock, updates, requested_part):
    for update in updates:
        part = update[0]
        amount = update[1]
        if part in stock:
            stock[part] = stock[part] + amount

    if requested_part in stock:
        return stock[requested_part]
    return 0
`,
    },
    {
      id: 'STOCK-FIRST-UPDATE',
      expectedFailingGroup: 'repeated-updates',
      code: `def get_final_stock(stock, updates, requested_part):
    if updates:
        part = updates[0][0]
        amount = updates[0][1]
        if part in stock:
            stock[part] = stock[part] + amount
        else:
            stock[part] = amount

    if requested_part in stock:
        return stock[requested_part]
    return 0
`,
    },
    {
      id: 'STOCK-RETURNS-TOTAL',
      expectedFailingGroup: 'unrequested-updates',
      code: `def get_final_stock(stock, updates, requested_part):
    for update in updates:
        part = update[0]
        amount = update[1]
        if part in stock:
            stock[part] = stock[part] + amount
        else:
            stock[part] = amount

    total = 0
    for update in updates:
        total = total + update[1]
    return total
`,
    },
  ],
  hiddenTests: [
    { inputs: { stock: { BOLT: 2, NUT: 1 }, updates: [['BOLT', 3]], requested_part: 'BOLT' }, expected: 5, group: 'existing-key-update' },
    { inputs: { stock: { BOLT: 2 }, updates: [['CORE', 4]], requested_part: 'CORE' }, expected: 4, group: 'new-key-update' },
    { inputs: { stock: { FUSE: 1 }, updates: [['FUSE', 2], ['FUSE', 3]], requested_part: 'FUSE' }, expected: 6, group: 'repeated-updates' },
    { inputs: { stock: { CHIP: 10, WIRE: 5 }, updates: [['WIRE', 15], ['CHIP', 2]], requested_part: 'CHIP' }, expected: 12, group: 'unrequested-updates' },
    { inputs: { stock: { BOLT: 3 }, updates: [['NUT', 2]], requested_part: 'UNKNOWN' }, expected: 0, group: 'missing-request' },
    { inputs: { stock: { GEAR: 7 }, updates: [], requested_part: 'GEAR' }, expected: 7, group: 'empty-updates' },
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
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_046_transfer_1',
      title: '탐사팀 점수 장부',
      description: '초기 팀별 점수(initial_scores)에 추가 보너스 점수(bonus_events)를 누적 반영한 뒤, 특정 탐사팀(requested_crew)의 최종 점수를 반환합니다. 없는 팀은 0점을 반환합니다.',
      entryFunction: 'get_final_crew_score',
      starterCode: `def get_final_crew_score(initial_scores, bonus_events, requested_crew):\n    # 보너스 점수를 누적 갱신한 뒤 요청된 팀의 최종 점수를 반환하세요.\n    pass\n`,
      officialSolutionCode: `def get_final_crew_score(initial_scores, bonus_events, requested_crew):
    for event in bonus_events:
        team = event[0]
        score = event[1]
        if team in initial_scores:
            initial_scores[team] = initial_scores[team] + score
        else:
            initial_scores[team] = score

    if requested_crew in initial_scores:
        return initial_scores[requested_crew]
    return 0
`,
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
        { inputs: { initial_scores: { NOVA: 50, LUMI: 40 }, bonus_events: [['NOVA', 10], ['NOVA', 5]], requested_crew: 'NOVA' }, expected: 65 },
        { inputs: { initial_scores: { SOL: 30 }, bonus_events: [['ORION', 25]], requested_crew: 'ORION' }, expected: 25 },
        { inputs: { initial_scores: { ATLAS: 100 }, bonus_events: [], requested_crew: 'ATLAS' }, expected: 100 },
        { inputs: { initial_scores: {}, bonus_events: [['ECHO', 15]], requested_crew: 'GHOST' }, expected: 0 },
        { inputs: { initial_scores: { TITAN: 5 }, bonus_events: [['TITAN', 10], ['AURA', 20]], requested_crew: 'TITAN' }, expected: 15 },
      ],
    },
  ],
}
