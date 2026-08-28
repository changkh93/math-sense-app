/**
 * Scaffold Graph Specification
 * Multi-tier educational support levels with fading rules (S0 ~ S5 + Rescue).
 */

export const SCAFFOLD_LEVELS = Object.freeze({
  S0: 0, // Independent
  S1: 1, // Condition Scan (Emphasis on key words)
  S2: 2, // Reduced Universe / Formula Lens
  S3: 3, // Guiding Question
  S4: 4, // Route Card (Step-by-step logic flow card)
  S5: 5, // Personalized Partial Code / Parsons
  RESCUE: 6, // Recovery Lab
})

export const AC_COND_001_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 조건 스캔',
    description: '문제에서 가장 중요한 단어에 주목해 보세요.',
    content: '우주선 게이트는 **두 스위치가 모두** 켜져 있어야 합니다. "동시에" 만족해야 하는 조건을 찾아보세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 축소 우주 실험',
    description: '네 가지 스위치 조합을 직접 눌러보며 규칙을 확인하세요.',
    content: '스위치 1만 켜졌을 때(ON, OFF), 스위치 2만 켜졌을 때(OFF, ON)는 게이트가 열리지 않아야 합니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '생각을 구체화하는 질문입니다.',
    content: '질문: "만약 스위치 하나라도 OFF(False)라면, 게이트는 열려야 할까요, 닫혀야 할까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]
1. 스위치 1(s1)의 상태를 확인한다.
2. 스위치 2(s2)의 상태를 확인한다.
3. 둘 다 참일 때만 True를 반환한다.
4. 그 외에는 False를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '정답 표현을 복사하지 않고, 필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      '두 입력을 함께 검사하는 조건을 만든다.',
      '그 조건이 만족되면 True를 반환한다.',
      '그 밖의 경우에는 False를 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '두 조건이 모두 참이어야 할 때는 Python의 `and` 논리 연산자를 사용합니다. 먼저 s1과 s2를 and로 결합한 식의 결과를 네 가지 입력에서 예측한 뒤, 자신의 함수에 맞게 표현해 보세요.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export const AC_PAT_003_SCAFFOLD_CONTENT = {
  S1: {
    level: 1,
    title: 'S1 · 주기 스캔',
    description: '반복되는 시간 간격에 주목해 보세요.',
    content: '신호 다리는 **0초, 3초, 6초, 9초...** 처럼 3초마다 열립니다. 3의 배수 규칙을 찾아보세요.',
    source: 'hint',
    answerExposure: 'none',
  },
  S2: {
    level: 2,
    title: 'S2 · 수식 렌즈 (Modulo %)',
    description: '나머지를 구하는 연산자를 확인하세요.',
    content: 'Python에서 나머지를 구하는 기호는 `%`입니다. `time % 3`을 계산하면 0초, 3초, 6초는 나머지가 0이 됩니다.',
    source: 'hint',
    answerExposure: 'partial',
  },
  S3: {
    level: 3,
    title: 'S3 · 방향 유도 질문',
    description: '조건을 코드로 만드는 질문입니다.',
    content: '질문: "시간(time)을 3으로 나눈 나머지(`time % 3`)가 몇과 같아야 다리가 열릴까요?"',
    source: 'hint',
    answerExposure: 'partial',
  },
  S4: {
    level: 4,
    title: 'S4 · 항로 절차 카드',
    description: '단계별 논리 흐름을 확인하세요.',
    content: `[절차 카드]
1. time을 3으로 나눈 나머지(time % 3)를 계산한다.
2. 나머지가 0과 같은지(== 0) 비교한다.
3. 나머지가 0이면 True를 반환한다.
4. 그 외에는 False를 반환한다.`,
    source: 'hint',
    answerExposure: 'partial',
  },
  S5: {
    level: 5,
    title: 'S5 · 부분 절차 배열 (Parsons)',
    description: '필요한 절차 블록을 순서대로 배열해 보세요.',
    parsonsBlocks: [
      '현재 시간 time을 주기 3으로 나눈 나머지를 구한다.',
      '나머지가 0과 같은지 비교한다 (time % 3 == 0).',
      '조건의 참/거짓 결과를 반환한다.',
    ],
    source: 'parsons',
    answerExposure: 'partial',
  },
  RESCUE: {
    level: 6,
    title: 'Rescue · 해설 및 복구 연구실',
    description: '완전한 정답을 단계별로 탐구하고, 24시간 뒤 새 문제로 독립 귀환을 준비합니다.',
    solutionExplanation: '3초 주기는 `time % 3 == 0` 수식으로 표현합니다. `def check_bridge(time): return time % 3 == 0` 처럼 작성하면 모든 시간에 대해 정확히 다리 개폐를 판정할 수 있습니다.',
    source: 'solution-review',
    answerExposure: 'full',
  },
}

export function getScaffoldByLevel(level, problemId = 'AC-COND-001') {
  const catalog = problemId === 'AC-PAT-003' ? AC_PAT_003_SCAFFOLD_CONTENT : AC_COND_001_SCAFFOLD_CONTENT
  switch (level) {
    case 1: return catalog.S1
    case 2: return catalog.S2
    case 3: return catalog.S3
    case 4: return catalog.S4
    case 5: return catalog.S5
    case 6: return catalog.RESCUE
    default: return null
  }
}
