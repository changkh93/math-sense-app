/**
 * Misconception Taxonomy & Granular Code Definitions
 * Structured into 8 High-Level Categories with 12+ Granular Rule Matcher Targets.
 */

export const MISCONCEPTION_CATEGORIES = {
  IDX: { code: 'IDX', name: '인덱스 및 범위 (Index & Bounds)' },
  LOOP: { code: 'LOOP', name: '반복 및 제어 흐름 (Iteration & Termination)' },
  COND: { code: 'COND', name: '조건 분해 및 논리 (Conditions & Logic)' },
  DATA: { code: 'DATA', name: '자료구조 및 중복 (Data Structures & Sets)' },
  STQ: { code: 'STQ', name: '스택/큐 순서 (Stack vs Queue Order)' },
  VIS: { code: 'VIS', name: '방문 추적 (Visited State Tracking)' },
  GREEDY: { code: 'GREEDY', name: '탐욕적 선택 (Greedy Strategy)' },
  DP: { code: 'DP', name: '상태 정의 및 메모 (State Memoization)' },
}

export const GRANULAR_MISCONCEPTIONS = {
  'COND-AND-OR-01': {
    category: 'COND',
    label: 'and/or 논리 결합 혼동',
    description: '모두 만족해야 하는 조건을 or로 연결하거나, 하나만 만족해도 되는 조건을 and로 연결함',
    diagnosticHint: '두 스위치가 각각 켜졌을 때와 둘 다 켜졌을 때 결과를 진리표로 비교해보세요.',
    repairUnitId: 'unit_py_math_15',
  },
  'COND-ALL-TRUE-01': {
    category: 'COND',
    label: '모두 참인 기준 사례 미충족',
    description: '모든 필수 조건이 참인 기준 입력에서도 거짓을 반환함',
    diagnosticHint: '모든 조건이 참인 한 장면부터 결과를 손으로 예측해보세요.',
  },
  'COND-SINGLE-INPUT-01': {
    category: 'COND',
    label: '일부 입력만 조건에 반영',
    description: '여러 입력 가운데 하나의 상태만 결과에 반영함',
    diagnosticHint: '한 입력은 고정하고 다른 입력만 바꾼 두 장면을 비교해보세요.',
  },
  'COND-CONSTANT-01': {
    category: 'COND',
    label: '입력과 무관한 고정값 반환',
    description: '입력이 달라져도 항상 같은 결과를 반환함',
    diagnosticHint: '가장 다른 두 입력의 결과가 정말 같아야 하는지 비교해보세요.',
  },
  'COND-BOUNDARY-01': {
    category: 'COND',
    label: '조건 경계값 부등호 오류',
    description: '이상/이하(>=, <=)와 초과/미만(>, <) 경계 조건을 혼동함',
    diagnosticHint: '경계에 정확히 걸친 값(예: 10)일 때 참이어야 하는지 확인해보세요.',
  },
  'IDX-OFF-BY-ONE-01': {
    category: 'IDX',
    label: 'Off-by-One 마지막 원소 누락',
    description: '범위 종료 지점을 1 작게 설정해 마지막 원소를 순회하지 못함',
    diagnosticHint: '길이가 N인 리스트에서 range(N)의 마지막 숫자가 무엇인지 관찰해보세요.',
  },
  'IDX-1-BASED-01': {
    category: 'IDX',
    label: '1-Based 인덱스 가정',
    description: 'Python 인덱스가 0이 아닌 1부터 시작한다고 오해하여 첫 원소를 건너뜀',
    diagnosticHint: '리스트의 첫 번째 원소는 index 0에 들어있습니다.',
  },
  'LOOP-NO-PROGRESS-01': {
    category: 'LOOP',
    label: '반복 상태 갱신 누락',
    description: 'while 루프 내부에서 조건 변수를 변경하지 않아 무한 루프에 빠짐',
    diagnosticHint: '루프가 끝내려면 어떤 변수가 어떻게 바뀌어야 하는지 확인해보세요.',
  },
  'LOOP-EARLY-EXIT-01': {
    category: 'LOOP',
    label: '첫 원소 검사 후 조기 종료',
    description: '루프 첫 번째 반복에서 바로 return/break하여 전체 탐색에 실패함',
    diagnosticHint: '모든 원소를 다 확인한 뒤에 판단해야 하는지 생각해보세요.',
  },
  'DATA-DUP-DISCARD-01': {
    category: 'DATA',
    label: '중복 데이터 누락 및 덮어쓰기',
    description: '중복된 항목의 빈도나 개수를 보존해야 하는데 set이나 key로 덮어써 누락함',
    diagnosticHint: '같은 이름의 화물이 2개 이상 들어올 때 개수가 맞게 유지되는지 관찰해보세요.',
  },
  'QUEUE-LIFO-01': {
    category: 'STQ',
    label: 'Queue LIFO 후입선출 오용',
    description: '먼저 들어온 원소를 꺼내야 하는데 pop()을 사용해 나중에 들어온 원소를 먼저 처리함',
    diagnosticHint: '줄을 선 순서대로 처리하려면 popleft()를 사용해야 합니다.',
  },
  'BFS-VISITED-LATE-01': {
    category: 'VIS',
    label: 'Visited 늦은 기록',
    description: '큐에 넣을 때(enqueue)가 아니라 꺼낼 때(dequeue) 방문 표시를 하여 중복 노드가 큐에 누적됨',
    diagnosticHint: '방을 발견하는 순간 바로 방문 표시를 해두면 같은 방을 큐에 두 번 넣지 않게 됩니다.',
  },
  'ACC-INIT-01': {
    category: 'COND',
    label: '누적 변수 초기값 오류',
    description: '곱셈 누적을 0으로 시작하거나 최솟값 탐색 초기값을 0으로 설정함',
    diagnosticHint: '누적 변수의 시작값이 계산 결과에 어떤 영향을 주는지 확인해보세요.',
  },
}
