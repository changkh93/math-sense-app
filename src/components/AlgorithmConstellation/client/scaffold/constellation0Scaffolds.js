import { getPublicKernel } from '../../shared/problems/index.js'

// Author the teaching steps; take the function contract from the actual mission.
// Rescue examples are executed against the mission tests by the support suite.
function missionScaffold(problemId, { scan, experiment, question, steps, blocks, explanation, body }) {
  const kernel = getPublicKernel(problemId)
  const signature = kernel.modes.code.starterCode.match(/^def .+:$/m)[0]
  const hint = (level, title, content) => ({
    level, title, content, source: 'hint', answerExposure: level === 1 ? 'none' : 'partial',
  })
  return {
    S1: hint(1, `S1 · 조건 스캔 (${kernel.identity.studentTitle})`, scan),
    S2: hint(2, 'S2 · 작은 실험', experiment),
    S3: hint(3, 'S3 · 방향 질문', question),
    S4: hint(4, 'S4 · 항로 절차 카드', `[절차 카드]\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`),
    S5: {
      level: 5, title: 'S5 · 부분 절차',
      description: '빈칸에 필요한 값이나 조건을 생각해 보세요. 아래는 완성 전의 절차입니다.',
      parsonsBlocks: blocks, source: 'parsons', answerExposure: 'partial',
    },
    RESCUE: {
      level: 6, title: 'Rescue · 해설 및 복구 연구실',
      description: '각 줄의 역할을 확인하고, 다른 입력에서도 상태 변화를 따라가 보세요.',
      solutionExplanation: explanation,
      solutionCode: `${signature}\n${body.map((line) => `    ${line}`).join('\n')}\n`,
      source: 'solution-review', answerExposure: 'full',
    },
  }
}

export const CONSTELLATION_0_SCAFFOLDS = {
  'AC-EXP-SEQ-01': missionScaffold('AC-EXP-SEQ-01', {
    scan: 'start에서 출발하여 boost를 더하고, scale을 곱한 뒤, drift를 빼야 합니다. 매 명령은 바로 앞 명령의 결과를 사용합니다.',
    experiment: 'start=0, boost=5, scale=2, drift=3\n출발 0 → 더한 뒤 5 → 곱한 뒤 10 → 뺀 뒤 7',
    question: 'scale을 곱할 대상은 처음 start인가요, boost를 더한 뒤의 pos인가요?',
    steps: ['pos에 start를 저장한다.', 'pos에 boost를 더한다.', '갱신된 pos에 scale을 곱한다.', 'pos에서 drift를 뺀 뒤 반환한다.'],
    blocks: ['pos = start', 'pos = pos + boost', 'pos = pos * ___', 'pos = pos - ___', 'return pos'],
    explanation: '명령은 위에서 아래로 실행됩니다. pos를 갱신할 때마다 다음 줄은 새 값을 사용하므로 계산 순서를 유지해야 합니다.',
    body: ['pos = start', 'pos = pos + boost', 'pos = pos * scale', 'pos = pos - drift', 'return pos'],
  }),
  'AC-EXP-VAR-02': missionScaffold('AC-EXP-VAR-02', {
    scan: 'old_level을 signal에 저장한 뒤 new_level로 갱신합니다. 새 값을 대입하면 이전 값은 어떻게 될까요?',
    experiment: 'old_level=30, new_level=70\nsignal = old_level 실행 후 30\nsignal = new_level 실행 후 70\n두 값을 더하는 것이 아니라 새 값으로 덮어씁니다.',
    question: 'signal에 마지막으로 저장한 값은 old_level인가요, new_level인가요?',
    steps: ['signal에 old_level을 저장한다.', 'signal에 new_level을 대입하여 이전 값을 덮어쓴다.', '마지막 signal 값을 반환한다.'],
    blocks: ['signal = old_level', 'signal = ___', 'return signal'],
    explanation: '대입(=)은 오른쪽 값을 왼쪽 변수에 저장합니다. 두 번째 대입 뒤에는 new_level만 signal에 남습니다.',
    body: ['signal = old_level', 'signal = new_level', 'return signal'],
  }),
  'AC-EXP-STEP-03': missionScaffold('AC-EXP-STEP-03', {
    scan: '충전(charge) → 증폭(boost) → 방어막(shield)의 순서로 에너지가 바뀝니다. 앞뒤 상태를 연결할 명령을 찾아보세요.',
    experiment: 'initial_energy=2, charge=3, boost=4, shield=5\n충전: 2 + 3 = 5\n증폭: 5 * 4 = 20\n방어막: 20 - 5 = 15',
    question: '충전 결과가 담긴 energy를 boost배로 갱신하려면 어떤 연산이 필요한가요?',
    steps: ['energy에 initial_energy를 저장한다.', 'charge를 더한다.', '갱신된 energy에 boost를 곱한다.', 'shield를 뺀 뒤 energy를 반환한다.'],
    blocks: ['energy = initial_energy', 'energy = energy + charge', 'energy = energy ___ boost', 'energy = energy - shield', 'return energy'],
    explanation: '빠진 명령은 energy = energy * boost입니다. 충전한 결과에 배율을 적용한 뒤 방어막 비용을 빼야 합니다.',
    body: ['energy = initial_energy', 'energy = energy + charge', 'energy = energy * boost', 'energy = energy - shield', 'return energy'],
  }),
  'AC-EXP-SWAP-04': missionScaffold('AC-EXP-SWAP-04', {
    scan: 'box_a와 box_b를 맞바꿉니다. box_a를 덮어쓰기 전에 원래 값을 어디에 보관해야 할까요?',
    experiment: 'box_a=10, box_b=20\ntemp에 10 보관 → box_a를 20으로 갱신 → box_b에 temp의 10 저장\n결과: [20, 10]',
    question: 'box_a = box_b 실행 후 원래 box_a 값은 어느 변수에 남아 있어야 할까요?',
    steps: ['temp에 원래 box_a를 보관한다.', 'box_a에 box_b를 저장한다.', 'box_b에 temp를 저장한다.', '[box_a, box_b]를 반환한다.'],
    blocks: ['temp = box_a', 'box_a = ___', 'box_b = ___', 'return [box_a, box_b]'],
    explanation: 'temp는 덮어쓰기로 사라질 값을 보존합니다. 마지막에 box_b가 읽어야 할 값은 이미 바뀐 box_a가 아니라 temp입니다.',
    body: ['temp = box_a', 'box_a = box_b', 'box_b = temp', 'return [box_a, box_b]'],
  }),
  'AC-EXP-BOUND-05': missionScaffold('AC-EXP-BOUND-05', {
    scan: 'current_pos가 limit보다 작을 때뿐 아니라 경계선과 같을 때도 안전해야 합니다.',
    experiment: 'limit=10일 때 current_pos=8 → True, 10 → True, 12 → False\n10 < 10은 False이고, 10 <= 10은 True입니다.',
    question: '경계와 같은 값까지 포함하는 비교 연산자는 <인가요, <=인가요?',
    steps: ['current_pos와 limit를 비교한다.', '같은 경우까지 안전에 포함한다.', '비교 결과를 반환한다.'],
    blocks: ['current_pos와 limit 사이에 작거나 같음을 나타내는 비교 연산자를 넣는다.', 'return 비교 결과'],
    explanation: '이하(<=)는 경계와 같은 값도 포함합니다. limit를 10으로 고정하지 말고 전달받은 매개변수를 사용하세요.',
    body: ['return current_pos <= limit'],
  }),
  'AC-EXP-LOOP-06': missionScaffold('AC-EXP-LOOP-06', {
    scan: 'times는 반복 횟수이고 step_energy는 매번 더할 값입니다. 누적할 energy의 시작값과 반복 범위를 확인하세요.',
    experiment: 'times=4, step_energy=2\n시작 0 → 1회차 2 → 2회차 4 → 3회차 6 → 4회차 8\n반복이 모두 끝난 뒤 결과를 반환합니다.',
    question: '정수 times는 바로 순회할 수 없습니다. range(times)로 횟수를 만들고, 반복문 안에서 어떤 변수를 갱신해야 할까요?',
    steps: ['energy를 0으로 시작한다.', 'range(times)를 순회한다.', '반복문 안에서 energy에 step_energy를 더한다.', '반복이 끝난 뒤 energy를 반환한다.'],
    blocks: ['energy = 0', 'for i in range(___):', '    energy = energy + ___', 'return energy'],
    explanation: 'range(times)는 지정한 횟수만큼 반복할 수 있게 합니다. return은 반복문 밖에 두어야 모든 회차의 에너지가 누적됩니다.',
    body: ['energy = 0', 'for i in range(times):', '    energy = energy + step_energy', 'return energy'],
  }),
  'AC-EXP-WHILE-07': missionScaffold('AC-EXP-WHILE-07', {
    scan: 'start_pos에서 출발하여 target_pos에 도착할 때까지 pos를 1씩 전진시킵니다. 도착하면 반복을 멈춰야 합니다.',
    experiment: 'start_pos=1, target_pos=4\n1 → 2 → 3 → 4에서 정지\n처음부터 start_pos=target_pos=5라면 한 번도 전진하지 않습니다.',
    question: 'pos가 target_pos와 같아진 순간 False가 되려면 while의 조건을 어떻게 비교해야 할까요?',
    steps: ['pos에 start_pos를 저장한다.', 'pos가 target_pos보다 작은 동안 반복한다.', '반복문 안에서 pos를 1 늘린다.', '반복이 끝나면 pos를 반환한다.'],
    blocks: ['pos = start_pos', 'while pos ___ target_pos:', '    pos = pos + 1', 'return pos'],
    explanation: 'while pos < target_pos는 도착한 순간 False가 됩니다. 반복문 안의 상태 갱신이 있어야 조건이 바뀌어 안전하게 종료됩니다.',
    body: ['pos = start_pos', 'while pos < target_pos:', '    pos = pos + 1', 'return pos'],
  }),
  'AC-CODE-FIRST-ERROR-01': missionScaffold('AC-CODE-FIRST-ERROR-01', {
    scan: 'logs에서 threshold 미만인 값이 처음 나타난 인덱스를 찾습니다. 값 자체가 아니라 위치를 반환해야 합니다.',
    experiment: 'logs=[10, 20, -5, 30], threshold=0\n인덱스 0의 10은 정상 → 1의 20은 정상 → 2의 -5에서 처음 이상 발견\n결과는 -5가 아니라 인덱스 2입니다.',
    question: '이상 값을 처음 발견한 뒤에도 계속 검색해야 할까요? 아무 이상이 없으면 무엇을 반환해야 할까요?',
    steps: ['인덱스 0부터 logs를 확인한다.', 'logs[i]가 threshold 미만이면 i를 즉시 반환한다.', '끝까지 찾지 못했을 때 -1을 반환한다.'],
    blocks: ['for i in range(len(logs)):', '    if logs[i] ___ threshold:', '        return ___', 'return -1'],
    explanation: '처음 조건을 만족한 위치에서 즉시 return해야 뒤쪽 이상 값에 덮어씌워지지 않습니다. -1은 반복문이 끝날 때까지 찾지 못했을 때만 반환합니다.',
    body: ['for i in range(len(logs)):', '    if logs[i] < threshold:', '        return i', 'return -1'],
  }),
  'AC-EXP-EQUIV-09': missionScaffold('AC-EXP-EQUIV-09', {
    scan: '(pos + boost)를 두 배 한 항로와 같은 결과를 반환합니다. 덧셈과 곱셈의 순서에 주목하세요.',
    experiment: 'pos=3, boost=4: (3 + 4) * 2 = 14\npos=1, boost=0: (1 + 0) * 2 = 2, 하지만 1 + 0 * 2 = 1\n괄호를 빼면 항상 같지는 않습니다.',
    question: 'pos와 boost를 각각 두 배 한 뒤 더하면, 먼저 더한 뒤 두 배 한 것과 같을까요?',
    steps: ['pos와 boost를 먼저 더한다.', '합 전체에 2를 곱한다.', '계산 결과를 반환한다.'],
    blocks: ['pos와 boost의 합을 괄호로 묶는다.', '그 합에 2를 곱한다.', 'return 계산 결과'],
    explanation: '(pos + boost) * 2는 pos * 2 + boost * 2와 같습니다. pos + boost * 2는 pos를 두 배 하지 않으므로 다른 결과가 나올 수 있습니다.',
    body: ['return (pos + boost) * 2'],
  }),
  'AC-EXP-REVERSE-10': missionScaffold('AC-EXP-REVERSE-10', {
    scan: '관측 기록 0→3, 1→5, 2→7, 3→9에서 입력 증가에 따른 출력 변화와 입력 0의 출력을 살펴보세요.',
    experiment: '입력이 1 증가할 때 출력은 2 증가 → 배율 2\n입력이 0일 때 출력은 3 → 시작 보정값 3\nsignal=3일 때 3 * 2 + 3 = 9',
    question: '일정한 증가량에서 찾은 배율과, 입력 0에서 찾은 보정값을 어떤 순서로 적용하나요?',
    steps: ['signal에 배율 2를 곱한다.', '시작 보정값 3을 더한다.', '계산한 출력을 반환한다.'],
    blocks: ['signal에 관측에서 찾은 배율을 곱한다.', '입력 0의 출력에 해당하는 보정값을 더한다.', 'return 계산 결과'],
    explanation: '이 문제의 규칙은 signal * 2 + 3입니다. 입력 0, 1, 2, 3 모두에서 관측값 3, 5, 7, 9와 일치하는지 확인하세요.',
    body: ['return signal * 2 + 3'],
  }),
}
