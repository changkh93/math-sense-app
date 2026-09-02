import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_BOUND_05 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-BOUND-05',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '경계선의 탐사선',
    subtitle: '탐사선 위치가 경계선(limit)에 정확히 걸쳤을 때의 반례를 관찰하고 참/거짓 비교 연산자를 결정합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus'],
    introduces: ['operator:comparison-bound'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['boundary-predicate'],
    requiredClaims: ['exact-boundary-inclusive-check'],
  },
  modes: {
    observe: {
      prompt: '탐사 기록: 위치 9(경계 10)는 안전(True), 위치 11(경계 10)은 위험(False)입니다.\n이 두 기록만 보고 위치 10(경계선 위)의 결과를 단정할 수 있을까요?',
      expected: '이 기록만으로는 아직 알 수 없다',
      options: ['안전(True)이다', '위험(False)이다', '이 기록만으로는 아직 알 수 없다'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 경계선 판정 실험실',
          description: '탐사선이 안전 구역 경계선(limit=10) 안쪽에 있는지 판정하는 규칙을 탐색합니다. 🛰️ 탐사 규정: "탐사선은 경계선에 닿는 것(위치 10)까지 안전 구역으로 인정합니다."',
          variables: [
            { name: 'limit', value: 10, label: '경계선 위치' },
          ],
          guidance: '위치 9(안전)와 11(위험)은 두 규칙(< 와 <=) 모두 동일하지만, 오직 "경계선 위(10)"에서만 결과가 갈라집니다. 탐사 규정에 맞는 연산자를 선택해 보세요.',
        },
        initialState: { current_pos: 9, limit: 10 },
        initialStateLabel: '경계선(limit = 10) 안전 구역 판정을 시작합니다.',
        initialStepTitle: '🚀 시작 (pos=9)',
        initialPrompt: '먼저 1단계: 경계선 안쪽(pos=9)의 판정을 확인해 볼까요?',
        frames: [
          {
            id: 'step_inside',
            stepTitle: '① 경계선 안쪽 (pos=9)',
            operationLabel: 'pos=9 (안쪽)',
            codeSnippet: '9 < 10 (True)  /  9 <= 10 (True)',
            prompt: '경계선 안쪽(9)에서는 < 와 <= 두 규칙 모두 안전(True)으로 판정합니다.',
            stateAfter: { current_pos: 9, limit: 10, result: true },
          },
          {
            id: 'step_boundary_choice',
            stepTitle: '② 경계선 위 (pos=10) [핵심 분기]',
            operationLabel: 'pos=10 (경계선 위)',
            codeSnippet: 'current_pos <= limit  # 10 <= 10 -> True',
            prompt: '비교 연산자 (current_pos <= limit)를 선택하여 경계선에 닿은 위치(10)도 탐사 규정대로 안전(True)으로 판정되었습니다!',
            choiceTitle: '🎯 2단계 미션: 탐사 규정에 맞는 비교 연산자 선택',
            choicePrompt: '🛰️ 탐사 규정: "경계선에 닿은 위치(10)까지 안전 구역에 포함해야 합니다." 어떤 비교 연산자를 사용해야 할까요?',
            choiceHint: '💡 힌트: < 10 은 10을 포함하지 않아 False가 되고, <= 10 은 10을 포함하여 True가 됩니다.',
            operationOptions: [
              {
                id: 'opt_less_equal',
                label: 'current_pos <= limit',
                stateAfter: { current_pos: 10, limit: 10, result: true },
                feedback: '정답입니다! <= 기호는 경계선 위의 값(10)까지 안전(True)으로 포함합니다.',
              },
              {
                id: 'opt_strict_less',
                label: 'current_pos < limit',
                stateAfter: { current_pos: 10, limit: 10, result: false },
                feedback: '아쉬워요! < 기호를 쓰면 10 < 10 이 False가 되어 경계선 위를 위험으로 판정해 버립니다.',
              },
            ],
            expectedOptionId: 'opt_less_equal',
            stateAfter: { current_pos: 10, limit: 10, result: true },
          },
          {
            id: 'step_outside',
            stepTitle: '③ 경계선 바깥 (pos=11)',
            operationLabel: 'pos=11 (바깥)',
            codeSnippet: '11 < 10 (False)  /  11 <= 10 (False)',
            prompt: '경계선 바깥(11 > 10)으로 벗어나면 두 규칙 모두 위험(False)으로 판정합니다.',
            stateAfter: { current_pos: 11, limit: 10, result: false },
          },
        ],
        predictionPrompt: '경계선보다 작을 때와 경계선과 정확히 같을 때의 참/거짓 결과를 비교해 보세요.',
        discoveryQuestion: {
          prompt: '🔎 두 후보 규칙(pos < limit vs pos <= limit)의 판정 결과가 서로 달라지는 유일한 지점은 어디일까요?',
          options: [
            {
              id: 'opt_boundary',
              label: '경계선과 정확히 일치하는 경계값 (pos = limit = 10)',
              isCorrect: true,
            },
            {
              id: 'opt_far_inside',
              label: '경계선보다 한참 안쪽에 있는 지점 (pos = 0)',
              isCorrect: false,
            },
            {
              id: 'opt_far_outside',
              label: '경계선보다 한참 바깥에 있는 지점 (pos = 100)',
              isCorrect: false,
            },
          ],
          successFeedback: '정확합니다! 경계 조건의 차이는 항상 "경계선에 딱 걸친 순간(Boundary Case)"에서만 발생하므로, 경계값을 반드시 직접 검증해야 합니다.',
          wrongFeedback: '안쪽이나 바깥쪽에서는 두 연산자의 결과가 같습니다. 오직 경계선과 값이 같아지는 순간에만 차이가 납니다.',
        },
        rulePrompt: '경계 조건(Boundary Case) 추론 규칙',
        ruleStatement: '< 연산자는 경계 직전까지만 포함하고, <= 연산자는 경계선 위의 값까지 포함합니다. 따라서 경계 조건에서는 반드시 경계값(Boundary) 자체를 확인해야 합니다.',
      },
    },
    code: {
      entryFunction: 'check_within_boundary',
      starterCode: `def check_within_boundary(current_pos, limit):
    # 경계선 위의 위치(current_pos == limit)도 안전(True)에 포함하는 규칙을 코드로 작성하세요.
    return False
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { current_pos: 8, limit: 10 }, expected: true },
      { inputs: { current_pos: 10, limit: 10 }, expected: true },
      { inputs: { current_pos: 12, limit: 10 }, expected: false },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_exp_bound_05_1',
        title: '★★ 경계값 오류를 찾는 가장 빠른 입력',
        type: 'single-choice',
        prompt: '탐사 규정은 "경계선(limit=10)까지 안전(True)"인데, 동료가 return current_pos < limit 으로 코드를 작성했습니다.',
        codeSnippet: `def check_within_boundary(current_pos, limit):
    # 탐사 규정: limit(10)까지 안전(True)이어야 함
    return current_pos < limit  # 실수로 < 기호를 사용함`,
        questions: [
          {
            id: 'q1',
            text: '위 코드는 pos=9(안전)와 pos=11(위험)에서는 정상 작동합니다. 코드의 오류를 밝혀낼 가장 정확한 반례 입력(current_pos)은 무엇일까요?',
            options: [
              { value: '10', label: '10 (경계선 위의 값: 규정은 True여야 하나 코드는 False 반환)' },
              { value: '0', label: '0 (경계선 안쪽: 둘 다 True)' },
              { value: '20', label: '20 (경계선 바깥: 둘 다 False)' },
            ],
            expected: '10',
          },
          {
            id: 'q2',
            text: '경계 조건(Boundary Condition)을 검증할 때 가장 먼저 확인해야 하는 핵심 지점은 어디일까요?',
            options: [
              { value: 'boundary', label: '경계선 바로 위(경계값)와 그 직전/직후 지점' },
              { value: 'random', label: '경계선과 상관없는 임의의 큰 숫자' },
            ],
            expected: 'boundary',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_exp_bound_05_transfer_1',
        title: '산소 소비 한계선 점검',
        description: '현재까지 사용한 산소량(oxygen_used)이 최대 허용 한계(usage_limit) 이하인지 점검하여 안전하면 True, 초과하면 False를 반환하세요. (한계값과 정확히 같아도 안전합니다)',
        contextCard: {
          title: '📋 산소 안전 기준',
          steps: [
            { label: '① 한계 이하 (<=)', text: '한계선에 딱 걸쳐도 안전 상태 (True 반환)' },
            { label: '② 한계 초과 (>)', text: '경고 상태 (False 반환)' },
          ],
        },
        thoughtCheck: {
          prompt: '산소 사용량이 최대 허용 한계(100)에 정확히 도달했을 때 안전(True)으로 판정하려면 어떤 연산자를 써야 할까요?',
          options: [
            { id: 'opt_le', label: '<= (경계값 100을 안전에 포함)', isCorrect: true },
            { id: 'opt_lt', label: '< (100을 안전에서 제외)', isCorrect: false },
          ],
          feedback: '맞아요! 한계값과 같은 순간까지 포함하려면 <= 연산자를 사용해야 합니다.',
        },
        entryFunction: 'check_oxygen_usage_safe',
        starterCode: `def check_oxygen_usage_safe(oxygen_used, usage_limit):
    # 산소 소비량이 한계 이하인지 확인하는 코드를 작성하세요.
    pass
`,
        testCases: [
          { inputs: { oxygen_used: 80, usage_limit: 100 }, expected: true },
          { inputs: { oxygen_used: 100, usage_limit: 100 }, expected: true },
          { inputs: { oxygen_used: 101, usage_limit: 100 }, expected: false },
        ],
      },
    ],
  },
})
