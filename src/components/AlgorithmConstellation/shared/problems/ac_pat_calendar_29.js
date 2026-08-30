import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_CALENDAR_29 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-CALENDAR-29',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-003'],
  },
  identity: {
    studentTitle: '다음 우주 캘린더',
    subtitle: '0부터 6까지 반복되는 요일에서 시작점과 이동량을 함께 추적합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:arithmetic-state-update',
      'operator:modulo',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: [
      'zero-move-keeps-start',
      'start-offset-is-added-before-cycle-wrap',
      'large-move-reduces-to-cycle-remainder',
    ],
  },
  modes: {
    observe: {
      prompt: '시작 요일이 수요일(start_day = 2)일 때, 0일 뒤는 수요일(2)이고 5일 뒤는 월요일(0)입니다. 시작 요일이 0이 아닐 때도 단순히 days_later % 7만 구하면 될까요?',
      expected: 'add_start_first',
      options: [
        { value: 'add_start_first', label: '아니다. 시작 요일을 더한 뒤 (start_day + days_later) % 7로 계산해야 한다.' },
        { value: 'mod_only', label: '맞다. 이동한 날 수의 나머지 days_later % 7 만 있으면 된다.' },
        { value: 'always_start', label: '항상 시작 요일을 그대로 반환한다.' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🗓️ 시작점이 있는 요일 이동 실험실',
          description: '수요일(2)에서 출발해 이동량이 달라질 때 최종 요일이 어떻게 바뀌는지 비교합니다.',
          variables: [
            { name: 'start_day', value: 2, label: '시작 요일 (수요일)' },
          ],
          guidance: '이동하지 않는 경우, 주기 끝, 한 바퀴를 넘는 경우를 차례로 살펴보세요.',
        },
        initialState: { start_day: 2, days_later: null, total: null, final_day: null },
        initialStateLabel: '시작: 수요일(2), 이동량 미정',
        initialStepTitle: '🚀 수요일에서 출발',
        initialPrompt: '이동량을 더했을 때 6을 넘어가면 어떤 일이 생길까요?',
        frames: [
          {
            id: 'move_0',
            stepTitle: '① 0일 뒤',
            operationLabel: '시작 위치 유지',
            codeSnippet: '(2 + 0) % 7 = 2',
            prompt: '이동하지 않으면 시작 요일인 수요일(2)이 그대로 유지됩니다.',
            stateAfter: { start_day: 2, days_later: 0, total: 2, final_day: 2 },
          },
          {
            id: 'move_1',
            stepTitle: '② 1일 뒤',
            operationLabel: '한 칸 이동',
            codeSnippet: '(2 + 1) % 7 = 3',
            prompt: '수요일(2)에서 한 칸 이동하면 목요일(3)입니다.',
            stateAfter: { start_day: 2, days_later: 1, total: 3, final_day: 3 },
          },
          {
            id: 'move_4',
            stepTitle: '③ 4일 뒤',
            operationLabel: '주기 끝 도착',
            codeSnippet: '(2 + 4) % 7 = 6',
            prompt: '주기의 마지막 위치인 일요일(6)에 도착합니다.',
            stateAfter: { start_day: 2, days_later: 4, total: 6, final_day: 6 },
          },
          {
            id: 'wrap_5',
            stepTitle: '④ 5일 뒤',
            operationLabel: '6 다음은 0으로 감싸기',
            codeSnippet: '(2 + 5) % 7 = 0',
            prompt: '합이 7이 되면 주기가 한 바퀴 돌아 월요일(0)로 되돌아옵니다.',
            stateAfter: { start_day: 2, days_later: 5, total: 7, final_day: 0 },
          },
          {
            id: 'large_12',
            stepTitle: '⑤ 12일 뒤',
            operationLabel: '큰 이동도 같은 주기 위치',
            codeSnippet: '(2 + 12) % 7 = 0',
            prompt: '12일 이동도 한 바퀴를 제외하면 5일 이동과 같아 월요일(0)에 도착합니다.',
            stateAfter: { start_day: 2, days_later: 12, total: 14, final_day: 0 },
          },
        ],
        predictionPrompt: '시작 요일이 0이 아닐 때 이동량만 7로 나눈 값과 최종 요일이 항상 같을까요?',
        rulePrompt: '시작점이 있는 7일 주기 계산 규칙',
        ruleStatement: '먼저 시작 위치와 이동량을 더하고, 그 결과를 주기 길이(7)로 나눈 나머지가 최종 위치입니다: (start_day + days_later) % 7',
      },
    },
    code: {
      entryFunction: 'calendar_day',
      starterCode: `def calendar_day(start_day, days_later):
    # 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일입니다.
    # days_later가 0이면 시작 요일(start_day)을 그대로 반환해야 합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { start_day: 2, days_later: 0 }, expected: 2 },
      { inputs: { start_day: 2, days_later: 5 }, expected: 0 },
      { inputs: { start_day: 5, days_later: 9 }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_calendar_29_1',
        title: '★★ 시작 요일과 큰 수의 주기 전이',
        type: 'trace_understanding',
        prompt: '0일 뒤의 상태 보존과 1,000,000일 뒤의 주기 계산 원리를 확인하세요.',
        codeSnippet: `def calendar_day(start_day, days_later):
    return (start_day + days_later) % 7`,
        questions: [
          {
            id: 'q1',
            text: 'start_day=4(금요일), days_later=0일 때 계산 결과가 4가 되는 이유는 무엇일까요?',
            options: [
              { value: 'zero_move_keeps', label: '0일을 이동하면 날짜가 바뀌지 않아 시작 요일이 그대로 유지되기 때문' },
              { value: 'all_zero', label: '모든 0일 이동은 요일 0(월요일)이 되기 때문' },
              { value: 'error', label: '0으로 나눌 수 없기 때문' },
            ],
            expected: 'zero_move_keeps',
          },
          {
            id: 'q2',
            text: 'start_day=3, days_later=1000000 처럼 아주 큰 수도 반복문 없이 빠르게 계산할 수 있는 이유는 무엇일까요?',
            options: [
              { value: 'period_remainder', label: '7일마다 같은 요일로 돌아오므로 7로 나눈 나머지만 구하면 되기 때문' },
              { value: 'loop_required', label: '백만 번 루프를 돌아야만 정확하기 때문' },
              { value: 'approximate', label: '대략적인 날짜만 맞추기 때문' },
            ],
            expected: 'period_remainder',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_calendar_29_t1',
        title: '원형 회전 좌석 번호 계산',
        description: 'seat_count개의 좌석(0부터 seat_count - 1까지)이 원형으로 배치되어 있을 때, start 위치에서 시계 방향으로 moves 칸 이동한 최종 좌석 번호를 반환하세요.',
        contextCard: {
          title: '📋 원형 좌석 이동 흐름 예시',
          steps: [
            { label: '초기 좌석', text: 'start = 1 (총 5좌석: 0~4)' },
            { label: '이동 칸수', text: 'moves = 0 -> 1 그대로' },
            { label: '3칸 이동', text: 'start=4, moves=3 -> (4+3)%5 = 2' },
          ],
        },
        thoughtCheck: {
          prompt: '고정된 7일 대신 원형 좌석에서는 어떤 값을 주기 길이로 나누어야 할까요?',
          options: [
            { id: 'opt_seat_count', label: '전체 좌석 수인 seat_count로 나눈다', isCorrect: true },
            { id: 'opt_seven', label: '항상 7로 나눈다', isCorrect: false },
          ],
          feedback: '맞아요! 주기의 크기가 seat_count로 바뀌었으므로 (start + moves) % seat_count로 일반화합니다.',
        },
        entryFunction: 'rotated_seat',
        starterCode: `def rotated_seat(start, moves, seat_count):
    # 0부터 seat_count - 1까지의 좌석에서 start 위치로부터 moves 칸 이동한 좌석 번호를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { start: 1, moves: 0, seat_count: 5 }, expected: 1 },
          { inputs: { start: 4, moves: 3, seat_count: 5 }, expected: 2 },
        ],
      },
    ],
  },
})
