/**
 * LUMI Algorithm Constellation — Problem Solving Pattern Registry
 *
 * Invariant: Problem-solving patterns (e.g. temp-swap, preserve-before-overwrite)
 * are algorithm strategies, distinct from Python syntax/builtins.
 */

export const PROBLEM_SOLVING_PATTERN_REGISTRY = Object.freeze({
  'pattern:procedure-decomposition': {
    conceptId: 'pattern:procedure-decomposition',
    patternId: 'pattern:procedure-decomposition',
    displayName: '절차 분해와 단계 조립 (Step 분해)',
    kind: 'algorithm-pattern',
    canonicalFirstProblemId: 'AC-EXP-STEP-03',
    why: '복잡한 전체 행동을 작은 단위 명령들로 나누고, 앞 단계의 결과가 다음 단계의 출발 상태가 되도록 올바른 순서로 조립해요.',
    tinyExample: 'energy = energy + charge\nenergy = energy * boost\nenergy = energy - shield',
    syntaxExample: '# 1단계: 충전 -> 2단계: 증폭 -> 3단계: 소모',
    predictionCheck: {
      prompt: '충전 후 증폭하는 것과 증폭 후 충전하는 것은 결과가 같을까요, 다를까요?',
      options: ['서로 다르다', '항상 같다'],
      expected: '서로 다르다',
    },
    protocolRepairId: 'PR-DECOMPOSE-001',
  },
  'pattern:preserve-before-overwrite': {
    conceptId: 'pattern:preserve-before-overwrite',
    patternId: 'pattern:preserve-before-overwrite',
    displayName: '소실 전 백업 전략 (temp 패턴)',
    kind: 'algorithm-pattern',
    canonicalFirstProblemId: 'AC-EXP-SWAP-04',
    why: '변수의 값을 덮어쓰면 원래 정보가 사라지므로, 덮어쓰기 전에 임시 상자(temp)에 안전하게 백업해 두는 생각의 전략이에요.',
    tinyExample: 'temp = box_a  # box_a를 잃어버리기 전에 백업!\nbox_a = box_b\nbox_b = temp',
    syntaxExample: 'temp = box_a\nbox_a = box_b\nbox_b = temp',
    predictionCheck: {
      prompt: 'temp = box_a; box_a = box_b 실행 후 box_b에 box_a의 원래 값을 넣으려면 무엇을 대입해야 할까요?',
      options: ['temp', 'box_a', 'box_b', 'None'],
      expected: 'temp',
    },
    protocolRepairId: 'PR-TEMP-SWAP-001',
  },
  'pattern:counterexample-search': {
    conceptId: 'pattern:counterexample-search',
    patternId: 'pattern:counterexample-search',
    displayName: '작은 반례로 항상인지 확인하기',
    kind: 'algorithm-pattern',
    canonicalFirstProblemId: 'AC-EXP-EQUIV-09',
    why: '몇 번 맞는 것만으로 항상 같다고 할 수 없어요. 서로 달라지는 작은 입력 하나를 찾으면 항상 같다는 주장을 검증할 수 있어요.',
    tinyExample: '(x + 1) * 2와 x + 2는 x=0에서는 둘 다 2로 같지만 x=1에서는 4와 3으로 달라요.',
    syntaxExample: '# 작은 값 0, 1, 경계값을 차례로 비교',
    predictionCheck: {
      prompt: '두 식이 항상 같다는 주장을 깨뜨리는 가장 확실한 증거는 무엇일까요?',
      options: ['서로 다른 결과가 나오는 입력(반례) 하나', '같은 결과가 나오는 입력 하나'],
      expected: '서로 다른 결과가 나오는 입력(반례) 하나',
    },
    protocolRepairId: 'PR-COUNTEREXAMPLE-001',
  },
  'pattern:upper-clamp': {
    conceptId: 'pattern:upper-clamp',
    patternId: 'pattern:upper-clamp',
    displayName: '상한 제한 (Upper Clamp)',
    kind: 'algorithm-pattern',
    canonicalFirstProblemId: 'AC-COND-CLAMP-16',
    why: '값이 안전 한도를 넘었을 때 버리지 않고, 정상 값은 그대로 보존하며 한도를 초과한 값만 최대 허용치로 되돌리는 생각의 전략이에요.',
    tinyExample: 'if value > limit:\n    value = limit',
    syntaxExample: 'if requested > max_power:\n    return max_power\nreturn requested',
    predictionCheck: {
      prompt: '최대 허용치가 100일 때, 120이 요청되면 어떤 값으로 되돌려야 할까요?',
      options: ['100', '120', '0', '20'],
      expected: '100',
    },
    protocolRepairId: 'PR-UPPER-CLAMP-001',
  },
})

export function getPatternDetails(patternId) {
  return PROBLEM_SOLVING_PATTERN_REGISTRY[patternId] || null
}

export function getPatternsNeededForProblem(problemId, thinkingPatterns = {}) {
  const patternIds = [...new Set([
    ...(thinkingPatterns.requires || []),
    ...(thinkingPatterns.introduces || []),
  ])]
  return patternIds.map((id) => PROBLEM_SOLVING_PATTERN_REGISTRY[id]).filter(Boolean)
}
