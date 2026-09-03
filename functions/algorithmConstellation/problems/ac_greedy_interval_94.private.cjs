/** Server-only definition: AC-GREEDY-INTERVAL-94. */
module.exports = {
  problemId: 'AC-GREEDY-INTERVAL-94',
  problemVersion: 1,
  entryFunction: 'max_missions',
  starterCode: `def max_missions(starts, ends):
    # 겹치지 않게 선택할 수 있는 최대 임무 수를 반환하세요.
    pass
`,
  officialSolutionCode: `def max_missions(starts, ends):
    n = len(starts)
    if n == 0:
        return 0
    used = []
    for _ in range(n):
        used.append(False)
    count = 0
    free_from = 0
    for _ in range(n):
        best_idx = -1
        best_end = 999999
        for i in range(n):
            if not used[i]:
                s = starts[i]
                e = ends[i]
                if s >= free_from:
                    if e < best_end:
                        best_end = e
                        best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            count = count + 1
            free_from = best_end
    return count
`,
  alternativeSolutions: [
    `def max_missions(starts, ends):
    n = len(starts)
    chosen = []
    cur_time = 0
    for _ in range(n):
        cand = -1
        min_e = 999999
        for idx in range(n):
            if idx not in chosen and starts[idx] >= cur_time and ends[idx] < min_e:
                min_e = ends[idx]
                cand = idx
        if cand != -1:
            chosen.append(cand)
            cur_time = min_e
    return len(chosen)
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'GREEDY-EARLIEST-START',
      expectedFailingGroup: 'greedy_trap',
      code: `def max_missions(starts, ends):
    n = len(starts)
    if n == 0:
        return 0
    used = []
    for _ in range(n):
        used.append(False)
    count = 0
    free_from = 0
    for _ in range(n):
        best_idx = -1
        best_start = 999999
        best_end = 999999
        for i in range(n):
            if not used[i]:
                s = starts[i]
                e = ends[i]
                if s >= free_from and s < best_start:
                    best_start = s
                    best_end = e
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            count = count + 1
            free_from = best_end
    return count
`,
    },
    {
      id: 'GREEDY-LONGEST-FIRST',
      expectedFailingGroup: 'greedy_trap',
      code: `def max_missions(starts, ends):
    n = len(starts)
    if n == 0:
        return 0
    used = []
    for _ in range(n):
        used.append(False)
    count = 0
    free_from = 0
    for _ in range(n):
        best_idx = -1
        max_dur = -1
        best_end = 999999
        for i in range(n):
            if not used[i]:
                s = starts[i]
                e = ends[i]
                if s >= free_from and (e - s) > max_dur:
                    max_dur = e - s
                    best_end = e
                    best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            count = count + 1
            free_from = best_end
    return count
`,
    },
    {
      id: 'OMITS-FREE-UPDATE',
      expectedFailingGroup: 'overlap_conflict',
      code: `def max_missions(starts, ends):
    n = len(starts)
    if n == 0:
        return 0
    used = []
    for _ in range(n):
        used.append(False)
    count = 0
    for _ in range(n):
        best_idx = -1
        best_end = 999999
        for i in range(n):
            if not used[i] and ends[i] < best_end:
                best_end = ends[i]
                best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            count = count + 1
    return count
`,
    },
    {
      id: 'SELECTS-FIRST-ONLY',
      expectedFailingGroup: 'multi_selection',
      code: `def max_missions(starts, ends):
    return 1 if len(starts) > 0 else 0
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        starts: [],
        ends: [],
      },
      expected: 0,
      group: 'edge_cases',
    },
    {
      inputs: {
        starts: [5],
        ends: [10],
      },
      expected: 1,
      group: 'edge_cases',
    },
    {
      inputs: {
        starts: [1, 2, 3],
        ends: [10, 3, 4],
      },
      expected: 2,
      group: 'greedy_trap',
    },
    {
      inputs: {
        starts: [0, 2, 4, 6, 8],
        ends: [2, 4, 6, 8, 10],
      },
      expected: 5,
      group: 'multi_selection',
    },
    {
      inputs: {
        starts: [1, 2, 2, 4],
        ends: [4, 3, 5, 6],
      },
      expected: 2,
      group: 'overlap_conflict',
    },
    {
      inputs: {
        starts: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
        ends: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26],
      },
      expected: 6,
      group: 'multi_selection',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_greedy_094_1',
      title: '종료 시각 우선 탐욕의 정당성',
      prompt: '가장 일찍 끝나는 임무를 선택하는 이유를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '시작 시각이 가장 빠른 임무를 우선 선택했을 때 발생할 수 있는 문제는?',
          options: [
            { value: 'blocks_others', label: '매우 긴 임무 하나가 다른 짧은 임무 여러 개를 가로막을 수 있다' },
            { value: 'never_fails', label: '항상 최선의 결과가 나온다' },
          ],
          expected: 'blocks_others',
        },
        {
          id: 'q2',
          text: '임무를 하나 확정할 때마다 다음 가능 시각 free_from을 어떻게 갱신해야 할까요?',
          options: [
            { value: 'update_end', label: '방금 선택한 임무의 종료 시각으로 갱신한다' },
            { value: 'keep_zero', label: '0으로 그대로 둔다' },
          ],
          expected: 'update_end',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_greedy_094_transfer_1',
      title: '최대 방송 슬롯 배정',
      description: '각 방송 프로그램의 시작 시각과 종료 시각이 주어질 때, 시간이 겹치지 않게 송출할 수 있는 최대 프로그램 수를 구하세요.',
      entryFunction: 'max_broadcast_slots',
      starterCode: `def max_broadcast_slots(starts, ends):
    # 겹치지 않는 최대 방송 슬롯 수를 반환하세요.
    pass
`,
      officialSolutionCode: `def max_broadcast_slots(starts, ends):
    n = len(starts)
    if n == 0:
        return 0
    used = []
    for _ in range(n):
        used.append(False)
    count = 0
    free_from = 0
    for _ in range(n):
        best_idx = -1
        best_end = 999999
        for i in range(n):
            if not used[i]:
                s = starts[i]
                e = ends[i]
                if s >= free_from:
                    if e < best_end:
                        best_end = e
                        best_idx = i
        if best_idx != -1:
            used[best_idx] = True
            count = count + 1
            free_from = best_end
    return count
`,
      contextCard: {
        title: '📻 방송 슬롯 최적화',
        strategyGuide: '현재 시각 이후에 시작하는 슬롯 중 종료 시각이 가장 빠른 것을 반복 선택합니다.',
      },
      thoughtCheck: {
        question: '슬롯 [0~10], [1~3], [4~6]이 있을 때 올바른 최대 선택 수는?',
        options: [
          { value: 'ans_2', label: '2개 ([1~3], [4~6])' },
          { value: 'ans_1', label: '1개 ([0~10])' },
        ],
        expected: 'ans_2',
      },
      testCases: [
        {
          inputs: {
            starts: [0, 1, 4],
            ends: [10, 3, 6],
          },
          expected: 2,
        },
        {
          inputs: {
            starts: [],
            ends: [],
          },
          expected: 0,
        },
        {
          inputs: {
            starts: [2, 5, 8],
            ends: [4, 7, 10],
          },
          expected: 3,
        },
      ],
    },
  ],
}
