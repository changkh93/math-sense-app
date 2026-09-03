/** Server-only definition: AC-GREEDY-COIN-95. */
module.exports = {
  problemId: 'AC-GREEDY-COIN-95',
  problemVersion: 1,
  entryFunction: 'min_coins',
  starterCode: `def min_coins(coins, amount):
    # 주어진 동전으로 amount를 만드는 최소 동전 수를 반환하세요 (불가능 시 -1).
    pass
`,
  officialSolutionCode: `def min_coins(coins, amount):
    if amount == 0:
        return 0
    inf = 999999
    dp = [0]
    for _ in range(amount):
        dp.append(inf)
    for a in range(1, amount + 1):
        best = inf
        for c in coins:
            if c <= a:
                prev = dp[a - c]
                if prev != inf:
                    cand = prev + 1
                    if cand < best:
                        best = cand
        dp[a] = best
    ans = dp[amount]
    if ans >= inf:
        return -1
    return ans
`,
  alternativeSolutions: [
    `def min_coins(coins, amount):
    if amount == 0:
        return 0
    dp = [0]
    for _ in range(amount):
        dp.append(999999)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                if dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
    if dp[amount] < 999999:
        return dp[amount]
    return -1
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'GREEDY-LARGEST-FIRST',
      expectedFailingGroup: 'greedy_trap',
      code: `def min_coins(coins, amount):
    # Sort or assume coins are available, greedily taking largest
    rem = amount
    count = 0
    # Search largest coin that fits repeatedly
    for _ in range(amount + 1):
        if rem == 0:
            return count
        max_fit = -1
        for c in coins:
            if c <= rem and c > max_fit:
                max_fit = c
        if max_fit == -1:
            return -1
        rem = rem - max_fit
        count = count + 1
    return count
`,
    },
    {
      id: 'NO-UPDATE-CHAIN',
      expectedFailingGroup: 'state_transition',
      code: `def min_coins(coins, amount):
    if amount == 0:
        return 0
    dp = [0]
    for _ in range(amount):
        dp.append(999999)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = dp[a - c]
    return dp[amount] if dp[amount] < 999999 else -1
`,
    },
    {
      id: 'OMITS-INF-CHECK',
      expectedFailingGroup: 'unreachable_amount',
      code: `def min_coins(coins, amount):
    if amount == 0:
        return 0
    inf = 999999
    dp = [0]
    for _ in range(amount):
        dp.append(inf)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount]
`,
    },
    {
      id: 'SINGLE-COIN-ONLY',
      expectedFailingGroup: 'coin_combination',
      code: `def min_coins(coins, amount):
    if amount == 0:
        return 0
    best = 999999
    for c in coins:
        if amount % c == 0:
            cnt = amount // c
            if cnt < best:
                best = cnt
    return best if best < 999999 else -1
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        coins: [1, 5, 6],
        amount: 10,
      },
      expected: 2,
      group: 'greedy_trap',
    },
    {
      inputs: {
        coins: [1, 4, 5],
        amount: 8,
      },
      expected: 2,
      group: 'greedy_trap',
    },
    {
      inputs: {
        coins: [1, 5],
        amount: 0,
      },
      expected: 0,
      group: 'edge_cases',
    },
    {
      inputs: {
        coins: [1, 2, 5],
        amount: 1,
      },
      expected: 1,
      group: 'edge_cases',
    },
    {
      inputs: {
        coins: [2, 4],
        amount: 3,
      },
      expected: -1,
      group: 'unreachable_amount',
    },
    {
      inputs: {
        coins: [1, 2, 5],
        amount: 7,
      },
      expected: 2,
      group: 'state_transition',
    },
    {
      inputs: {
        coins: [2, 3],
        amount: 5,
      },
      expected: 2,
      group: 'coin_combination',
    },
    {
      inputs: {
        coins: [1, 4, 5],
        amount: 30,
      },
      expected: 6,
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_greedy_095_1',
      title: '탐욕 알고리즘의 실패와 DP의 보장',
      prompt: '동전 문제에서 탐욕과 표 기반 접근의 차이를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '동전 [1, 3, 4]에서 6원을 만들 때 큰 동전 우선 탐욕이 실패하는 이유는?',
          options: [
            { value: 'local_optimal_trap', label: '눈앞의 가장 큰 4원을 고르면 남은 2원을 채우는 데 비효율적인 동전 2개가 추가되기 때문' },
            { value: 'no_answer', label: '6원을 만드는 방법이 없기 때문' },
          ],
          expected: 'local_optimal_trap',
        },
        {
          id: 'q2',
          text: '상향식 표(dp)가 항상 최소 동전 수를 보장할 수 있는 이유는?',
          options: [
            { value: 'check_all_coins', label: '각 금액마다 사용할 수 있는 모든 동전을 시험하여 가장 작은 값을 선택하기 때문' },
            { value: 'always_greedy', label: '동전을 무작위로 섞어서 고르기 때문' },
          ],
          expected: 'check_all_coins',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_greedy_095_transfer_1',
      title: '우표 최소 장수 붙이기',
      description: '우표 액면가 values와 목표 요금 total이 주어질 때, total을 정확히 맞추는 최소 우표 장수를 구하세요.',
      entryFunction: 'min_stamps',
      starterCode: `def min_stamps(values, total):
    # 최소 우표 장수를 반환하세요 (불가능 시 -1).
    pass
`,
      officialSolutionCode: `def min_stamps(values, total):
    if total == 0:
        return 0
    inf = 999999
    dp = [0]
    for _ in range(total):
        dp.append(inf)
    for a in range(1, total + 1):
        best = inf
        for v in values:
            if v <= a:
                prev = dp[a - v]
                if prev != inf:
                    cand = prev + 1
                    if cand < best:
                        best = cand
        dp[a] = best
    ans = dp[total]
    if ans >= inf:
        return -1
    return ans
`,
      contextCard: {
        title: '📮 우표 요금 계산',
        strategyGuide: 'dp[0]=0에서 출발하여 각 요금 t마다 모든 우표 v에 대해 dp[t-v]+1의 최솟값을 기록합니다.',
      },
      thoughtCheck: {
        question: '우표 [1, 4, 5]로 8원을 만들 때 최소 우표 수는?',
        options: [
          { value: 'ans_2', label: '2장 (4 + 4)' },
          { value: 'ans_4', label: '4장 (5 + 1 + 1 + 1)' },
        ],
        expected: 'ans_2',
      },
      testCases: [
        {
          inputs: {
            values: [1, 4, 5],
            total: 8,
          },
          expected: 2,
        },
        {
          inputs: {
            values: [1, 3],
            total: 0,
          },
          expected: 0,
        },
        {
          inputs: {
            values: [1, 2, 5],
            total: 10,
          },
          expected: 2,
        },
      ],
    },
  ],
}
