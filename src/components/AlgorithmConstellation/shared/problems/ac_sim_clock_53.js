import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SIM_CLOCK_53 = createCapabilityPrototypeKernel({
  problemId: 'AC-SIM-CLOCK-53',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 53,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-SIM-COMPASS-52', 'AC-PAT-DIGIT-24'],
  },
  identity: {
    studentTitle: '우주 시계 맞추기',
    subtitle: '전체를 분 단위로 합친 뒤 몫과 나머지로 시간과 분을 나누고 하루(24시간)로 감쌉니다.',
  },
  pythonConcepts: {
    requires: ['operator:floor-division', 'operator:modulo', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:cyclic-state-wrap'],
    introduces: ['pattern:unit-carry-normalization'],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['UNIT_CARRY_NORMALIZATION'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '우주 시계가 9시 59분일 때 1분을 더하면 몇 시 몇 분이 될까요?',
      options: [
        { value: 'ten_oclock', label: '10시 0분 — 60분이 넘으면 시간으로 올라간다' },
        { value: 'nine_sixty', label: '9시 60분 — 분이 그대로 유지된다' },
        { value: 'nine_zero', label: '9시 0분 — 분이 사라진다' },
      ],
      expected: 'ten_oclock',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🕰️ 우주 시계 조정판',
          description: '시(hour), 분(minute), 더할 분(add_minutes)을 전부 분 단위로 합친 뒤, 몫은 시간, 나머지는 분이 됩니다.',
          variables: [
            { name: 'hour', value: '23' },
            { name: 'minute', value: '50' },
            { name: 'add_minutes', value: '20' },
            { name: 'dayRule', value: '24시간을 넘으면 0시로', label: '하루 감싸기' },
          ],
          guidance: '큰 단위(시간)는 나눈 몫, 남은 작은 단위(분)는 나눈 나머지입니다.',
        },
        initialState: { totalMinutes: null, newHour: null, newMinute: null },
        initialStateLabel: '시작: 23시 50분',
        initialStepTitle: '🚀 시작 (23시 50분)',
        initialPrompt: '전체를 분으로 합치고, 20분을 더한 뒤 시간과 분으로 나눕니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 현재 시각을 분으로 합치기',
            operationLabel: '23시간 50분 -> 23 곱하기 60 더하기 50 = 1430분',
            codeSnippet: '# total = hour * 60 + minute',
            prompt: '시간 단위를 모두 분으로 바꿔 하나의 수로 만듭니다.',
            stateAfter: { totalMinutes: 1430, newHour: null, newMinute: null },
          },
          {
            id: 'f1',
            stepTitle: '② 더할 분을 더하기',
            operationLabel: '1430분에 20분 더하기 = 1450분',
            codeSnippet: '# total = total + add_minutes',
            prompt: '올림을 신경 쓰지 않아도 돼요. 전부 분이므로 그냥 더하면 됩니다.',
            stateAfter: { totalMinutes: 1450, newHour: null, newMinute: null },
          },
          {
            id: 'f2',
            stepTitle: '③ 큰 단위와 작은 단위로 나누기',
            operationLabel: '1450을 60으로 나눈 몫 24 -> 하루 감싸기로 0, 나머지 10',
            codeSnippet: '# new_hour = (total // 60) % 24, new_minute = total % 60',
            prompt: '몫 24는 하루를 넘었으므로 24로 나눈 나머지 0시가 되고, 남은 작은 단위 10이 분이 됩니다. 최종 0시 10분!',
            stateAfter: { totalMinutes: 1450, newHour: 0, newMinute: 10 },
          },
          {
            // 올림이 없는 독립 실험: 더할 값이 0이면 원래 시각이 그대로 나온다.
            id: 'f3_zero_add',
            stepTitle: '④ 새 실험: 10시 5분에 0분 더하기',
            experimentReset: true,
            stateBefore: { totalMinutes: null, newHour: null, newMinute: null },
            operationLabel: '10 곱하기 60 더하기 5 = 605분, 그대로 분해',
            codeSnippet: '# 새 실험: total 605 -> 10시 5분',
            prompt: '더할 값이 0이어도 같은 규칙이 그대로 적용됩니다. 정규화는 입력과 상관없이 항상 일어나요.',
            stateAfter: { totalMinutes: 605, newHour: 10, newMinute: 5 },
          },
        ],
        predictionPrompt: '분을 더한 뒤 [새 시간, 새 분] 목록을 반환하세요. 하루를 넘으면 0시부터 다시 셉니다.',
        rulePrompt: '단위 올림 정규화 규칙',
        ruleStatement: '전체를 가장 작은 단위로 합친 뒤, 큰 단위는 몫(하루 범위로 감싸기), 작은 단위는 나머지로 정한다.',
      },
    },
    code: {
      entryFunction: 'adjust_space_clock',
      starterCode: `def adjust_space_clock(hour, minute, add_minutes):
    # 분을 더한 뒤 [새 시간, 새 분]을 반환하세요.
    # 하루(24시간)를 넘으면 0시부터 다시 세어야 합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { hour: 23, minute: 50, add_minutes: 20 }, expected: [0, 10] },
      { inputs: { hour: 10, minute: 5, add_minutes: 0 }, expected: [10, 5] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sim_053_1',
        title: '단위 올림과 하루 순환 이해',
        prompt: '시계를 분 단위로 정규화하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '59분에 1분을 더했을 때 시간이 1 늘어나고 분이 0이 되는 이유는 무엇일까요?',
            options: [
              { value: 'carry_to_hour', label: '60분이 곧 1시간이라 기준에 닿은 만큼 큰 단위로 올라가고 남은 것만 분이 되어서' },
              { value: 'minutes_reset', label: '분이 60을 넘으면 버려져서' },
              { value: 'clock_stops', label: '시계가 멈춰서' },
            ],
            expected: 'carry_to_hour',
          },
          {
            id: 'q2',
            text: '23시 50분에 20분을 더하면 0시 10분이 되는 이유는 무엇일까요?',
            options: [
              { value: 'day_wrap', label: '하루는 24시간이라 넘친 만큼 다음 날 0시부터 다시 세어서' },
              { value: 'hour_24', label: '24시라는 새 시간이 생겨서' },
            ],
            expected: 'day_wrap',
          },
          {
            id: 'q3',
            text: '전체를 분으로 합친 뒤 60으로 나눈 나머지를 분으로 쓰는 이유는 무엇일까요?',
            options: [
              { value: 'remainder_is_leftover', label: '나눈 나머지는 60분에 못 미치는 남은 작은 단위이기 때문에' },
              { value: 'remainder_random', label: '나머지는 아무 수나 나오기 때문에' },
            ],
            expected: 'remainder_is_leftover',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sim_053_transfer_1',
        title: '임무 타이머 조정기',
        description: '임무 타이머를 분(minute)과 초(second)로 기록할 때, 더할 초(add_seconds)를 처리해 60분 주기로 정규화한 [분, 초]를 반환합니다.',
        entryFunction: 'adjust_mission_timer',
        starterCode: `def adjust_mission_timer(minute, second, add_seconds):
    # 초를 더한 뒤 [새 분, 새 초]를 반환하세요.
    pass
`,
        contextCard: {
          title: '⏱️ 임무 타이머 정규화 전략',
          strategyGuide: '분과 초를 모두 초 단위로 합친 뒤, 몫으로 분을 나누고 나머지로 초를 남겨 60분 주기로 감싸 줍니다.',
        },
        thoughtCheck: {
          question: '타이머가 1분 50초일 때 20초를 더하면 어떻게 될까요?',
          options: [
            { value: 'two_ten', label: '2분 10초 — 60초가 넘자 분으로 올라가 남은 초만 남는다' },
            { value: 'one_seventy', label: '1분 70초 — 초가 그대로 유지된다' },
          ],
          expected: 'two_ten',
        },
        testCases: [
          { inputs: { minute: 1, second: 50, add_seconds: 20 }, expected: [2, 10] },
          { inputs: { minute: 5, second: 0, add_seconds: 0 }, expected: [5, 0] },
        ],
      },
    ],
  },
})
