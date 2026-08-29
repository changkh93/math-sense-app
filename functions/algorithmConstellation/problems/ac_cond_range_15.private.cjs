module.exports = {
  problemId: 'AC-COND-RANGE-15',
  problemVersion: 1,
  entryFunction: 'is_temperature_safe',
  officialSolutionCode: `def is_temperature_safe(temp, min_temp, max_temp):
    return temp >= min_temp and temp <= max_temp
`,
  alternativeSolutions: [
    `def is_temperature_safe(temp, min_temp, max_temp):
    return min_temp <= temp <= max_temp
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'RANGE-STRICT-INEQUALITY',
      code: `def is_temperature_safe(temp, min_temp, max_temp):
    return temp > min_temp and temp < max_temp
`,
      expectedFailingGroup: 'exact_boundaries',
      expectedMisconception: 'BOUNDARY-INCLUSION-ERROR',
    },
    {
      label: 'RANGE-OR-LOGIC-BUG',
      code: `def is_temperature_safe(temp, min_temp, max_temp):
    return temp >= min_temp or temp <= max_temp
`,
      expectedFailingGroup: 'outside_both_sides',
      expectedMisconception: 'CONJUNCTION-DISJUNCTION-CONFUSION',
    },
    {
      label: 'RANGE-LOWER-ONLY',
      code: `def is_temperature_safe(temp, min_temp, max_temp):
    return temp >= min_temp
`,
      expectedFailingGroup: 'upper_violation',
      expectedMisconception: 'ONE-SIDED-BOUND',
    },
    {
      label: 'RANGE-UPPER-ONLY',
      code: `def is_temperature_safe(temp, min_temp, max_temp):
    return temp <= max_temp
`,
      expectedFailingGroup: 'lower_violation',
      expectedMisconception: 'ONE-SIDED-BOUND',
    },
  ],
  hiddenTests: [
    { inputs: { temp: 10, min_temp: 10, max_temp: 30 }, expected: true, group: 'exact_boundaries' },
    { inputs: { temp: 30, min_temp: 10, max_temp: 30 }, expected: true, group: 'exact_boundaries' },
    { inputs: { temp: 5, min_temp: 5, max_temp: 5 }, expected: true, group: 'zero_width_range' },
    { inputs: { temp: 20, min_temp: 10, max_temp: 30 }, expected: true, group: 'inside' },
    { inputs: { temp: 35, min_temp: 10, max_temp: 30 }, expected: false, group: 'upper_violation' },
    { inputs: { temp: 5, min_temp: 10, max_temp: 30 }, expected: false, group: 'lower_violation' },
    { inputs: { temp: -100, min_temp: 0, max_temp: 100 }, expected: false, group: 'outside_both_sides' },
    { inputs: { temp: 500, min_temp: 0, max_temp: 100 }, expected: false, group: 'outside_both_sides' },
    { inputs: { temp: -5, min_temp: -10, max_temp: -1 }, expected: true, group: 'negative_range' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_range_15_1',
      prompt: '닫힌 구간 판정과 and/or 논리 결합을 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'min=10, max=30일 때 temp=10과 temp=30은 안전 구간에 포함될까요?',
          options: [
            { value: '둘 다 포함된다 (True)', label: '둘 다 포함된다 (True)' },
            { value: '경계선은 제외된다 (False)', label: '경계선은 제외된다 (False)' },
          ],
          expected: '둘 다 포함된다 (True)',
        },
        {
          id: 'q2',
          text: '올바른 경계 순서(min<=max)에서 temp >= 10 or temp <= 30을 사용하면 어떤 결과가 생길까요?',
          options: [
            { value: '모든 temp가 적어도 한 조건을 만족해 구간 밖도 True가 된다', label: '모든 temp가 적어도 한 조건을 만족해 구간 밖도 True가 된다' },
            { value: '항상 False가 된다', label: '항상 False가 된다' },
          ],
          expected: '모든 temp가 적어도 한 조건을 만족해 구간 밖도 True가 된다',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_range_15_transfer_1',
      title: '우주선 발사 가능 시간 구간 판정',
      description: '현재 시각(current_time)이 시작 시각(start_time) 이상, 종료 시각(end_time) 이하인 발사 가능 시간 구간 안에 들어오는지 판정하는 함수를 작성하세요. (start_time <= end_time)',
      entryFunction: 'is_launch_window_open',
      starterCode: `def is_launch_window_open(current_time, start_time, end_time):
    # 시작 시각과 종료 시각을 포함한 발사 가능 시간 구간인지 판정하세요.
    pass
`,
      officialSolutionCode: `def is_launch_window_open(current_time, start_time, end_time):
    return current_time >= start_time and current_time <= end_time
`,
      testCases: [
        { inputs: { current_time: 10, start_time: 10, end_time: 20 }, expected: true },
        { inputs: { current_time: 20, start_time: 10, end_time: 20 }, expected: true },
        { inputs: { current_time: 15, start_time: 10, end_time: 20 }, expected: true },
        { inputs: { current_time: 5, start_time: 10, end_time: 20 }, expected: false },
        { inputs: { current_time: 25, start_time: 10, end_time: 20 }, expected: false },
      ],
    },
  ],
}
