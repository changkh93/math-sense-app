/** Server-only definition: AC-GRID-NEIGHBOR-81. */
module.exports = {
  problemId: 'AC-GRID-NEIGHBOR-81',
  problemVersion: 1,
  entryFunction: 'valid_grid_neighbors',
  officialSolutionCode: `def valid_grid_neighbors(rows, cols, r, c):
    neighbors = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            neighbors.append([nr, nc])
    return neighbors
`,
  alternativeSolutions: [
    `def valid_grid_neighbors(rows, cols, r, c):
    res = []
    if r - 1 >= 0:
        res.append([r - 1, c])
    if r + 1 < rows:
        res.append([r + 1, c])
    if c - 1 >= 0:
        res.append([r, c - 1])
    if c + 1 < cols:
        res.append([r, c + 1])
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'NEIGHBOR-INCLUDES-DIAGONALS',
      expectedFailingGroup: 'corner_and_edge',
      code: `def valid_grid_neighbors(rows, cols, r, c):
    neighbors = []
    deltas = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    for dr, dc in deltas:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            neighbors.append([nr, nc])
    return neighbors
`,
    },
    {
      id: 'NEIGHBOR-SWAPS-ROW-COL',
      expectedFailingGroup: 'asymmetric_grid',
      code: `def valid_grid_neighbors(rows, cols, r, c):
    neighbors = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < cols and 0 <= nc < rows:
            neighbors.append([nr, nc])
    return neighbors
`,
    },
    {
      id: 'NEIGHBOR-OMITS-BOUNDS-CHECK',
      expectedFailingGroup: 'corner_and_edge',
      code: `def valid_grid_neighbors(rows, cols, r, c):
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { rows: 3, cols: 3, r: 0, c: 0 },
      expected: [[1, 0], [0, 1]],
      group: 'corner_and_edge',
    },
    {
      inputs: { rows: 4, cols: 4, r: 3, c: 3 },
      expected: [[2, 3], [3, 2]],
      group: 'corner_and_edge',
    },
    {
      inputs: { rows: 5, cols: 5, r: 2, c: 2 },
      expected: [[1, 2], [3, 2], [2, 1], [2, 3]],
      group: 'interior_all_four',
    },
    {
      inputs: { rows: 2, cols: 5, r: 1, c: 4 },
      expected: [[0, 4], [1, 3]],
      group: 'asymmetric_grid',
    },
    {
      inputs: { rows: 1, cols: 3, r: 0, c: 1 },
      expected: [[0, 0], [0, 2]],
      group: 'single_row',
    },
    {
      inputs: { rows: 3, cols: 1, r: 1, c: 0 },
      expected: [[0, 0], [2, 0]],
      group: 'single_col',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_grid_081_1',
      title: '4방향 격자 이웃 좌표의 이해',
      prompt: '격자 경계와 상·하·좌·우 좌표 변화량을 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '2×2 격자의 우하단 모서리 (1, 1)에서 유효한 이웃 좌표는 몇 개일까요?',
          options: [
            { value: 'two', label: '2개 — 상(0, 1)과 좌(1, 0)만 격자 안' },
            { value: 'four', label: '4개 — 모든 방향' },
          ],
          expected: 'two',
        },
        {
          id: 'q2',
          text: '격자에서 대각선 방향으로 인접한 좌표는 4방향 이웃에 포함될까요?',
          options: [
            { value: 'no', label: '아니다 — 상, 하, 좌, 우 네 방향만 포함된다' },
            { value: 'yes', label: '맞다 — 대각선도 이웃이다' },
          ],
          expected: 'no',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_grid_081_transfer_1',
      title: '좌석판의 인접 좌석 찾기',
      description: 'rows, cols 크기의 좌석 배치도에서 현재 좌석 좌표 seat([r, c])의 상, 하, 좌, 우 유효 인접 좌석 좌표 목록을 반환하세요.',
      entryFunction: 'valid_seat_neighbors',
      starterCode: `def valid_seat_neighbors(rows, cols, seat):
    # seat은 [r, c] 형태입니다. 상, 하, 좌, 우 순서로 유효한 좌석 목록을 반환하세요.
    pass
`,
      officialSolutionCode: `def valid_seat_neighbors(rows, cols, seat):
    sr = seat[0]
    sc = seat[1]
    res = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = sr + dr
        nc = sc + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            res.append([nr, nc])
    return res
`,
      contextCard: {
        title: '💺 좌석판 인접 좌표 탐색',
        strategyGuide: 'seat에서 먼저 행과 열을 변수로 추출한 뒤, 상·하·좌·우 변화량을 적용해 경계 안에 있는 좌석을 찾습니다.',
      },
      thoughtCheck: {
        question: '좌석 좌표 seat = [0, 0]에서 위쪽 좌석을 확인하려 할 때 발생하는 상황은?',
        options: [
          { value: 'out_of_bounds', label: '행 번호가 0 미만이 되어 좌석판 밖이다' },
          { value: 'valid_seat', label: '유효한 좌석이다' },
        ],
        expected: 'out_of_bounds',
      },
      testCases: [
        {
          inputs: { rows: 4, cols: 2, seat: [3, 0] },
          expected: [[2, 0], [3, 1]],
        },
        {
          inputs: { rows: 1, cols: 4, seat: [0, 3] },
          expected: [[0, 2]],
        },
        {
          inputs: { rows: 5, cols: 5, seat: [0, 4] },
          expected: [[1, 4], [0, 3]],
        },
      ],
    },
  ],
}
