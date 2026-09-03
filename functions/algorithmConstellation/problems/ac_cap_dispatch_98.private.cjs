/** Server-only definition: AC-CAP-DISPATCH-98. */
module.exports = {
  problemId: 'AC-CAP-DISPATCH-98',
  problemVersion: 1,
  entryFunction: 'dispatch_order',
  starterCode: `def dispatch_order(priorities):
    # 높은 우선순위 먼저, 동률은 먼저 도착한 순서대로 인덱스 목록을 반환하세요.
    pass
`,
  officialSolutionCode: `def dispatch_order(priorities):
    n = len(priorities)
    used = []
    for _ in range(n):
        used.append(False)
    order = []
    for _ in range(n):
        best_idx = -1
        best_prio = -1
        for i in range(n):
            if not used[i]:
                p = priorities[i]
                if p > best_prio:
                    best_prio = p
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            order.append(best_idx)
    return order
`,
  alternativeSolutions: [
    `def dispatch_order(priorities):
    n = len(priorities)
    done = []
    for _ in range(n):
        done.append(False)
    res = []
    for _ in range(n):
        high = -1
        pick = -1
        for idx in range(n):
            if not done[idx]:
                if priorities[idx] > high:
                    high = priorities[idx]
                    pick = idx
        if pick != -1:
            done[pick] = True
            res.append(pick)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ARRIVAL-ORDER-ONLY',
      expectedFailingGroup: 'priority_inversion',
      code: `def dispatch_order(priorities):
    res = []
    for i in range(len(priorities)):
        res.append(i)
    return res
`,
    },
    {
      id: 'TIE-REVERSED',
      expectedFailingGroup: 'tie_stability',
      code: `def dispatch_order(priorities):
    n = len(priorities)
    used = []
    for _ in range(n):
        used.append(False)
    order = []
    for _ in range(n):
        best_idx = -1
        best_prio = -1
        for i in range(n):
            if not used[i]:
                p = priorities[i]
                if p >= best_prio:
                    best_prio = p
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            order.append(best_idx)
    return order
`,
    },
    {
      id: 'LOWEST-PRIORITY-FIRST',
      expectedFailingGroup: 'priority_inversion',
      code: `def dispatch_order(priorities):
    n = len(priorities)
    used = []
    for _ in range(n):
        used.append(False)
    order = []
    for _ in range(n):
        best_idx = -1
        best_prio = 999999
        for i in range(n):
            if not used[i]:
                p = priorities[i]
                if p < best_prio:
                    best_prio = p
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            order.append(best_idx)
    return order
`,
    },
    {
      id: 'ONE-ITEM-ONLY',
      expectedFailingGroup: 'complete_dispatch',
      code: `def dispatch_order(priorities):
    if len(priorities) == 0:
        return []
    mx = -1
    idx = -1
    for i in range(len(priorities)):
        if priorities[i] > mx:
            mx = priorities[i]
            idx = i
    return [idx]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { priorities: [] },
      expected: [],
      group: 'edge_cases',
    },
    {
      inputs: { priorities: [5] },
      expected: [0],
      group: 'edge_cases',
    },
    {
      inputs: { priorities: [3, 3, 3] },
      expected: [0, 1, 2],
      group: 'tie_stability',
    },
    {
      inputs: { priorities: [2, 6, 1, 6, 4] },
      expected: [1, 3, 4, 0, 2],
      group: 'priority_inversion',
    },
    {
      inputs: { priorities: [10, 20, 30, 40] },
      expected: [3, 2, 1, 0],
      group: 'complete_dispatch',
    },
    {
      inputs: {
        priorities: [0, 2, 4, 1, 3, 0, 2, 4, 1, 3, 0, 2],
      },
      expected: [2, 7, 4, 9, 1, 6, 11, 3, 8, 0, 5, 10],
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cap_098_1',
      title: '우선순위 동률 처리와 관제 원리',
      prompt: '화물 처리 우선순위 규칙을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '화물들의 우선순위가 모두 동일할 때(예: [3, 3, 3]) 반환되어야 하는 순서는?',
          options: [
            { value: 'fifo_order', label: '[0, 1, 2] (먼저 도착한 순서 그대로)' },
            { value: 'reverse_order', label: '[2, 1, 0]' },
          ],
          expected: 'fifo_order',
        },
        {
          id: 'q2',
          text: '스캔 과정에서 이미 출항한 화물을 다시 선택하지 않기 위해 사용하는 기법은?',
          options: [
            { value: 'used_array', label: '각 화물의 처리 여부를 기록하는 used 불리언 목록' },
            { value: 'del_keyword', label: '화물 목록을 매번 지우기' },
          ],
          expected: 'used_array',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cap_098_transfer_1',
      title: '구급 응급도 분류 순서',
      description: '환자들의 응급도 severities(높을수록 응급)가 도착 순서대로 주어질 때, 치료받을 환자 인덱스 순서를 구하세요 (동률은 먼저 도착한 환자 우선).',
      entryFunction: 'rescue_triage',
      starterCode: `def rescue_triage(severities):
    # 응급도 순(동률 시 도착순) 인덱스 목록을 반환하세요.
    pass
`,
      officialSolutionCode: `def rescue_triage(severities):
    n = len(severities)
    used = []
    for _ in range(n):
        used.append(False)
    order = []
    for _ in range(n):
        best_idx = -1
        best_prio = -1
        for i in range(n):
            if not used[i]:
                p = severities[i]
                if p > best_prio:
                    best_prio = p
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            order.append(best_idx)
    return order
`,
      contextCard: {
        title: '🏥 응급도 관제',
        strategyGuide: '미치료 환자 중 응급도가 가장 높고 인덱스가 가장 낮은 환자를 한 명씩 선별합니다.',
      },
      thoughtCheck: {
        question: '응급도 [2, 4, 4]의 치료 순서는?',
        options: [
          { value: 'ans_1_2_0', label: '[1, 2, 0]' },
          { value: 'ans_2_1_0', label: '[2, 1, 0]' },
        ],
        expected: 'ans_1_2_0',
      },
      testCases: [
        {
          inputs: { severities: [] },
          expected: [],
        },
        {
          inputs: { severities: [7] },
          expected: [0],
        },
        {
          inputs: { severities: [5, 1, 5, 3] },
          expected: [0, 2, 3, 1],
        },
      ],
    },
  ],
}
