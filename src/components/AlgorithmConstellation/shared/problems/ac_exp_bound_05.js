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
      prompt: '위치 9/경계 10은 안전(True), 위치 11/경계 10은 위험(False)입니다. 위치가 정확히 10(경계선 위)일 때는 무엇이어야 할까요?',
      expected: 'True',
      options: ['True', 'False'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 경계선 판정 실험실',
          description: '탐사선이 안전 구역 경계선(limit) 안쪽에 있는지 판정하는 연산자를 탐색합니다.',
          variables: [
            { name: 'limit', value: 10, label: '경계선 위치' },
          ],
          guidance: '탐사선 위치(current_pos)가 경계선 안쪽(9), 경계선 위(10), 바깥(11)일 때의 판정 결과를 관찰해 보세요.',
        },
        initialState: { current_pos: 9, limit: 10 },
        frames: [
          {
            id: 'step_inside',
            stepTitle: '① 경계선 안쪽 (pos=9)',
            operationLabel: 'pos=9 (안쪽)',
            codeSnippet: 'current_pos <= limit  # 9 <= 10 -> True',
            prompt: '경계선 안쪽(9 < 10)에서는 명확하게 안전(True) 판정을 받습니다.',
            stateAfter: { current_pos: 9, limit: 10, result: true },
          },
          {
            id: 'step_boundary_choice',
            stepTitle: '② 경계선 위 (pos=10) [연산자 선택]',
            operationLabel: 'pos=10 (경계선 위)',
            codeSnippet: 'current_pos <= limit  # 10 <= 10 -> True',
            prompt: '비교 연산자 (current_pos <= limit)를 사용하여 경계선 위의 위치(10)도 안전(True) 구역으로 정확히 판정되었습니다.',
            choiceTitle: '🎯 2단계 미션: 경계선 포함 비교 연산자 선택',
            choicePrompt: '경계선 위의 지점(pos = limit = 10)도 안전 구역에 포함(True)하려면 어떤 비교 연산자를 사용해야 할까요?',
            choiceHint: '💡 힌트: < 기호는 미만(미포함)이고, <= 기호는 이하(경계값 포함)를 의미합니다.',
            operationOptions: [
              {
                id: 'opt_less_equal',
                label: 'current_pos <= limit',
                stateAfter: { current_pos: 10, limit: 10, result: true },
                feedback: '정답입니다! <= 연산자는 경계선 위의 값(10)까지 포함하여 True를 반환합니다.',
              },
              {
                id: 'opt_strict_less',
                label: 'current_pos < limit',
                stateAfter: { current_pos: 10, limit: 10, result: false },
                feedback: '아쉬워요! < 연산자는 10 < 10이 거짓(False)이 되어 경계선 위를 안전 구역에서 제외해 버립니다.',
              },
            ],
            expectedOptionId: 'opt_less_equal',
            stateAfter: { current_pos: 10, limit: 10, result: true },
          },
          {
            id: 'step_outside',
            stepTitle: '③ 경계선 바깥 (pos=11)',
            operationLabel: 'pos=11 (바깥)',
            codeSnippet: 'current_pos <= limit  # 11 <= 10 -> False',
            prompt: '경계선 바깥(11 > 10)으로 벗어나면 위험(False) 판정을 받습니다.',
            stateAfter: { current_pos: 11, limit: 10, result: false },
          },
        ],
        predictionPrompt: '경계선보다 작을 때와 경계선과 정확히 같을 때의 참/거짓 결과를 비교해 보세요.',
        discoveryQuestion: {
          prompt: '🔎 경계선(limit)까지 안전 구역에 포함하려면 어떤 비교 기호를 써야 할까요?',
          options: [
            {
              id: 'opt_inclusive',
              label: '<= 기호를 써서 경계선 위의 값(limit)과 같아도 참(True)이 되게 한다.',
              isCorrect: true,
            },
            {
              id: 'opt_strict',
              label: '< 기호를 써서 경계선 위의 값은 항상 거짓(False)이 되게 한다.',
              isCorrect: false,
            },
          ],
          successFeedback: '맞아요! 경계값까지 포함하는 조건에는 항상 <= 또는 >= 기호를 사용해야 합니다.',
          wrongFeedback: '< 기호는 경계 바로 앞까지만 포함합니다. 경계선 위까지 포함하려면 <= 기호를 써야 합니다.',
        },
        rulePrompt: '경계선(limit) 포함 조건 규칙',
        ruleStatement: '< 기호는 경계 바로 전까지만 포함하고, <= 기호는 경계선 위의 값까지 포함합니다.',
      },
    },
    code: {
      entryFunction: 'check_within_boundary',
      starterCode: `def check_within_boundary(current_pos, limit):
    # 경계선 위의 위치도 안전 구역에 포함되는 규칙을 코드로 표현하세요.
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
        title: '★★ 경계값 포함 여부 판정',
        type: 'single-choice',
        prompt: '경계값 10에 대해 < 와 <= 연산자의 차이를 예측해 보세요.',
        questions: [
          {
            id: 'q1',
            text: '10 <= 10 의 평가 결과는 무엇일까요?',
            options: [
              { value: 'True', label: 'True' },
              { value: 'False', label: 'False' },
            ],
            expected: 'True',
          },
          {
            id: 'q2',
            text: '10 < 10 의 평가 결과는 무엇일까요?',
            options: [
              { value: 'False', label: 'False' },
              { value: 'True', label: 'True' },
            ],
            expected: 'False',
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
            { label: '① 한계 이하 (<=)', text: '안전 상태 (True 반환)' },
            { label: '② 한계 초과 (>)', text: '경고 상태 (False 반환)' },
          ],
        },
        thoughtCheck: {
          prompt: '산소량이 허용 한계(100)와 정확히 같을 때 안전(True)으로 판정하려면 어떤 연산자가 필요한가요?',
          options: [
            { id: 'opt_le', label: '<= (이하 연산자)', isCorrect: true },
            { id: 'opt_lt', label: '< (미만 연산자)', isCorrect: false },
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
