import { getLumiSolutionBody, getLumiSolutionDuration } from './lumiSolutionCatalog.js'

export const LUMI_DRAFT_SCHEMA_VERSION = 'v7'

const STAGE_META = Object.freeze({
  observe: { label: '처음 익히기', instruction: '완성 코드를 실행하며 각 줄이 월드를 어떻게 바꾸는지 관찰합니다.' },
  guided: { label: '설명 보고 작성하기', instruction: '아래 작업 순서와 도구 설명을 읽고 코드를 한 단계씩 작성합니다.' },
  recall: { label: '스스로 다시 만들기', instruction: '배운 원리를 떠올리되, 막히면 단계별 힌트나 완성 코드 보기를 사용할 수 있습니다.' },
  mission: { label: '응용하기', instruction: '상황에 맞게 여러 개념을 연결하여 해결합니다.' },
  'field-test': { label: '종합 도전', instruction: '앞에서 배운 개념을 조합하여 전체 해결 과정을 완성합니다.' },
})

const API_REFERENCE = Object.freeze([
  {
    signature: 'from msense import lumi', token: 'from msense import lumi',
    description: 'msense에서 lumi를 가져와 코드에서 사용할 수 있게 준비합니다.',
    detail: 'LUMI에게 명령을 내리기 전에 항상 맨 첫 줄에 작성합니다.',
  },
  {
    signature: '# 주석 (실행 끄기 / 설명)', token: '#',
    description: '줄 맨 앞에 #을 붙이면 Python이 해당 코드를 실행하지 않고 건너뜁니다.',
    detail: '예: # lumi.move(4)처럼 위험한 명령을 비활성화하거나 메모를 남길 때 사용합니다.',
  },
  {
    signature: 'lumi.move(distance)', token: 'lumi.move',
    description: 'LUMI를 앞으로 distance칸 이동합니다.',
    detail: '예: lumi.move(2)를 작성하면 앞으로 2칸 이동합니다.',
  },
  {
    signature: 'lumi.turn(degrees)', token: 'lumi.turn',
    description: 'LUMI의 방향을 degrees도만큼 회전합니다.',
    detail: '90은 오른쪽(시계 방향), -90은 왼쪽(반시계 방향)으로 회전합니다.',
  },
  {
    signature: 'lumi.say(message)', token: 'lumi.say',
    description: 'message를 루미의 말풍선으로 전송합니다.',
    detail: '문자열, 숫자, Boolean, 변수 값을 전달할 수 있습니다. 화면의 말풍선과 실행 기록에 표시됩니다.',
  },
  {
    signature: 'lumi.scan(radius=99)', token: 'lumi.scan',
    description: '탐지 범위 안의 신호와 물체를 리스트로 반환합니다.',
    detail: '반환값은 여러 객체가 순서대로 들어 있는 list입니다. 변수에 저장한 뒤 for로 하나씩 살펴볼 수 있습니다.',
  },
  {
    signature: 'lumi.collect(object)', token: 'lumi.collect',
    description: '전달한 object 한 개를 수집합니다.',
    detail: '수집에 성공하면 그 객체는 월드의 남은 객체 목록에서 없어지고 수집 기록으로 이동합니다. 따라서 world.objects의 길이도 1 줄어듭니다.',
  },
  {
    signature: 'lumi.charge()', token: 'lumi.charge',
    description: '충전소에서 루미의 에너지를 충전합니다.',
    detail: '괄호 안에 값을 넣지 않습니다. 충전 뒤 lumi.energy가 올라가므로 에너지 조건을 사용한 while 반복이 끝날 수 있습니다.',
  },
  {
    signature: 'lumi.energy', token: 'lumi.energy',
    description: '루미에게 현재 남아 있는 에너지를 나타내는 숫자입니다.',
    detail: '괄호가 없는 속성입니다. 이동이나 충전 뒤 값이 달라질 수 있으므로 조건에서 읽으면 매번 현재 값을 확인합니다.',
  },
  {
    signature: 'world.objects', token: 'world.objects',
    description: '월드에 아직 남아 있는 수집 대상들이 들어 있는 리스트입니다.',
    detail: '처음에는 여러 신호가 들어 있고, lumi.collect(object)가 성공할 때마다 해당 신호가 빠집니다. 빈 리스트는 False이므로 while world.objects:는 목록이 빌 때 멈춥니다.',
  },
  {
    signature: 'world.objects[0]', token: 'world.objects[0]',
    description: '남아 있는 객체 리스트에서 첫 번째 객체 하나를 선택합니다.',
    detail: 'Python 리스트는 0부터 번호를 셉니다. 목록이 비어 있을 때 [0]을 읽으면 오류가 나므로 먼저 객체가 남았는지 확인해야 합니다.',
  },
  {
    signature: 'world.target_distance', token: 'world.target_distance',
    description: '현재 위치에서 목표까지 남은 거리를 나타내는 숫자입니다.',
    detail: '고정값이 아니라 현재 상태를 읽는 속성입니다. lumi.move(1) 뒤 다시 읽으면 보통 1 줄어듭니다. 변수에 한 번 저장한 숫자는 자동으로 줄어들지 않습니다.',
  },
  {
    signature: 'world.steps_to_target', token: 'world.steps_to_target',
    description: '목표까지 필요한 현재 이동 칸 수를 나타내는 숫자입니다.',
    detail: '목표 위치가 달라지면 값도 달라집니다. 고정 숫자 대신 이 값을 사용하면 여러 항로에서 같은 코드가 작동합니다.',
  },
  {
    signature: 'world.path_clear', token: 'world.path_clear',
    description: '앞 항로가 안전하면 True, 막혀 있으면 False인 Boolean 값입니다.',
    detail: '괄호가 없는 속성입니다. if 조건에 바로 사용할 수 있으며 문자열 "True"와는 다릅니다.',
  },
  {
    signature: 'world.obstacle_ahead_distance', token: 'world.obstacle_ahead_distance',
    description: '현재 방향에서 가장 가까운 장애물까지의 거리를 나타내는 숫자입니다.',
    detail: '비교 연산자와 함께 사용하면 장애물이 충분히 멀리 있는지 True/False로 판단할 수 있습니다.',
  },
  {
    signature: 'world.entity_specs', token: 'world.entity_specs',
    description: '월드가 보내는 여러 객체의 초기 정보가 담긴 리스트입니다.',
    detail: '각 항목은 name, integrity 같은 이름표가 붙은 값을 가진 dictionary입니다. for로 항목을 하나씩 읽어 객체를 만들 수 있습니다.',
  },
  {
    signature: 'input(prompt)', token: 'input',
    description: '관제 입력 패널에서 받은 값을 문자열로 반환합니다.',
    detail: '숫자처럼 보여도 결과는 str입니다. 이동 거리로 쓰려면 int(input(...))처럼 정수로 변환해야 합니다.',
  },
  {
    signature: 'int(value)', token: 'int',
    description: '숫자 모양의 문자열을 정수로 변환합니다.',
    detail: '예를 들어 int("4")는 숫자 4가 됩니다. 숫자가 아닌 문자열은 변환할 수 없으므로 input()으로 받은 값의 형태를 먼저 확인해야 합니다.',
  },
  {
    signature: 'type(value)', token: 'type',
    description: '값이 어떤 자료형인지 확인합니다.',
    detail: 'type(100)은 int, type("100")은 str입니다. 화면에는 자료형 객체로 표시되며 값 자체를 바꾸지는 않습니다.',
  },
  {
    signature: 'print(value)', token: 'print',
    description: '글자나 숫자를 화면(OUTPUT 창)에 보여줍니다.',
    detail: '예: print("LUMI ONLINE")을 실행하면 오른쪽 아래 OUTPUT 창에 글자가 나타납니다. 글자는 항상 큰따옴표(" ") 안에 넣습니다.',
  },
  {
    signature: 'len(items)', token: 'len',
    description: '리스트나 문자열에 들어 있는 항목 수를 숫자로 반환합니다.',
    detail: '빈 리스트의 길이는 0입니다. 원본 리스트를 바꾸지 않고 현재 개수만 확인합니다.',
  },
  {
    signature: 'split(separator)', token: 'split',
    description: '문자열을 separator 기준으로 나누어 리스트로 반환합니다.',
    detail: '원본 문자열은 바뀌지 않습니다. 예: "A|B".split("|")의 결과는 ["A", "B"]입니다.',
  },
  {
    signature: 'separator.join(items)', token: 'join',
    description: '문자열 리스트의 항목 사이에 separator를 넣어 하나의 문자열로 만듭니다.',
    detail: 'split과 반대 방향의 작업입니다. items의 항목은 문자열이어야 하며 원본 리스트는 바뀌지 않습니다.',
  },
])

const CONCEPT_REFERENCE = Object.freeze([
  { match: /input\s*\(|관제 입력|형 변환|\bint\s*\(/i, title: 'input()의 결과는 언제나 문자열입니다', body: '관제 패널에서 4를 보내도 Python은 "4"라는 str로 받습니다. 이동 칸 수처럼 숫자 계산에 쓰려면 int()로 정수로 바꾼 뒤 변수에 저장하세요.' },
  { match: /f-string|f문자열|f-문자열|\bf["']/i, title: 'f-string은 문자열 안에 변수 값을 넣습니다', body: '문자열 앞에 f를 붙이고 중괄호 안에 변수 이름을 씁니다. 예를 들어 변수의 현재 값이 문장 속에 들어가며 원래 변수는 바뀌지 않습니다.' },
  { match: /split|join|패킷/i, title: 'split()과 join()은 문자열과 리스트를 오갑니다', body: 'split()은 긴 문자열을 구분자로 잘라 리스트를 만들고, join()은 문자열 리스트의 항목 사이에 구분자를 넣어 한 문자열로 합칩니다.' },
  { match: /tuple|튜플|좌표/i, title: 'tuple은 순서가 있지만 수정하지 않는 값 묶음입니다', body: '(x, y)처럼 소괄호로 만들며 좌표처럼 한 쌍으로 유지할 값에 알맞습니다. list와 달리 만든 뒤 항목을 바꿀 수 없습니다.' },
  { match: /dictionary|딕셔너리|\bdict\b|키와 값|\.get\(/i, title: 'dictionary는 이름표와 값을 한 쌍으로 저장합니다', body: '{"energy": 80}처럼 키로 값을 찾습니다. data["energy"]로 읽거나 data.get("energy", 0)으로 키가 없을 때의 기본값까지 정할 수 있습니다.' },
  { match: /리스트|\blist\b/i, title: 'list는 여러 값을 순서대로 보관합니다', body: '대괄호로 만들고 0번부터 위치를 셉니다. 빈 리스트는 조건식에서 False, 값이 하나라도 있으면 True로 판단됩니다.' },
  { match: /\bwhile\b/i, title: 'while은 조건을 매번 다시 확인합니다', body: '조건이 True인 동안 들여쓴 블록을 반복합니다. 반복문 안의 행동이 조건에 사용된 값을 바꾸지 않으면 끝나지 않으므로 상태 변화가 반드시 필요합니다.' },
  { match: /\bfor\b|순회|반복 변수/i, title: 'for는 여러 값이나 정해진 횟수를 차례로 처리합니다', body: '리스트를 사용하면 각 항목을 하나씩 받고, range를 사용하면 정해진 횟수만큼 반복합니다. 반복할 줄은 네 칸 들여씁니다.' },
  { match: /\bif\b|\belif\b|\belse\b|조건문/i, title: 'if는 조건에 따라 실행할 길을 고릅니다', body: 'if 조건이 True일 때만 들여쓴 블록을 실행합니다. elif는 다른 조건을 이어서 확인하고, else는 앞 조건이 모두 False일 때 실행합니다.' },
  { match: /Boolean|True|False|비교/i, title: 'Boolean은 참과 거짓을 나타냅니다', body: '비교 결과는 True 또는 False가 됩니다. if와 while은 이 값을 보고 블록을 실행할지 결정합니다.' },
  { match: /변수|대입|갱신|자료형|\btype\s*\(/i, title: '변수는 값을 기억하는 이름입니다', body: '= 왼쪽에 이름을 쓰고 오른쪽 값을 저장합니다. 같은 이름에 새 값을 대입하면 이전 값 대신 새 값이 기억되며, type()으로 현재 값의 자료형을 확인할 수 있습니다.' },
  { match: /속성|\bself\b|instance|인스턴스/i, title: '점(.) 뒤의 이름은 객체의 상태 또는 행동입니다', body: '괄호가 없으면 energy 같은 상태(속성)를 읽고, 괄호가 있으면 move() 같은 행동(메서드)을 호출합니다. self는 그 메서드를 실행 중인 바로 그 객체입니다.' },
  { match: /\bclass\b|클래스|__init__/i, title: 'class는 객체를 만드는 설계도입니다', body: '__init__은 객체가 생성될 때 처음 실행되며, self.name처럼 각 객체만의 상태를 저장합니다. 같은 클래스에서 만든 객체도 서로 다른 값을 가질 수 있습니다.' },
  { match: /\bdef\b|함수 정의|매개변수|\breturn\b/i, title: '함수는 이름 붙인 코드 묶음입니다', body: 'def로 정의하고 괄호를 붙여 호출합니다. 매개변수는 호출할 때 받은 값을 함수 안에서 쓰는 이름이며, return은 계산 결과를 호출한 곳으로 돌려줍니다.' },
])

const MISSION_STEPS = Object.freeze({
  'lumi-act1-01': ['msense에서 lumi를 불러옵니다. (from msense import lumi)', 'LUMI를 앞으로 2칸 이동시킵니다. (lumi.move(2))'],
  'lumi-act1-02': ['지뢰 앞까지 1칸 전진합니다. (lumi.move(1))', '오른쪽으로 90도 회전합니다. (lumi.turn(90))', '아래로 2칸 이동합니다. (lumi.move(2))', '왼쪽으로 -90도 회전합니다. (lumi.turn(-90))', '앞으로 3칸 이동해 비콘에 도착합니다. (lumi.move(3))'],
  'lumi-act1-03': ['lumi.move() 괄호 안에 덧셈 수식(2 + 3)을 입력합니다.'],
  'lumi-act1-04': [
    'print("LUMI ONLINE")으로 화면에 메시지를 출력합니다. (원하는 메시지를 3줄까지 써도 좋아요!)',
    'lumi.move(3)으로 비콘에 도착합니다.',
  ],
  'lumi-act1-05': ['위험한 직진 명령 맨 앞에 #을 붙여 끕니다. (# lumi.move(4))', '오른쪽으로 돌아가는 안전한 이동 코드를 작성합니다.'],
  'lumi-act1-06': ['print("COMMAND CORE 100%")를 출력합니다.', '1 + 2 계산으로 3칸 전진합니다.', '회전과 이동을 조합하여 최종 비콘에 도착합니다.'],
  'while-approach-01': ['world.target_distance가 0보다 큰 동안 반복하는 while 조건을 만드세요.', '반복 블록 안에서 루미를 한 칸 이동시켜 남은 거리가 줄어들게 하세요.'],
  'while-charge-02': ['lumi.energy가 50보다 작은 동안 반복하는 조건을 만드세요.', '반복 블록 안에서 lumi.charge()를 실행하세요.', '반복이 끝난 뒤, 들여쓰기를 끝내고 현재 목표 거리만큼 이동하세요.'],
  'while-collect-03': ['world.objects에 객체가 남아 있는 동안 반복하세요.', '반복할 때마다 world.objects[0]으로 첫 번째 객체를 하나 선택해 변수에 저장하세요.', '선택한 객체를 lumi.collect()에 전달하세요. 수집되면 목록에서 사라지고 다음 객체가 0번이 됩니다.'],
  'while-rescue-06': ['첫 번째 while에서 world.objects가 빌 때까지 첫 번째 신호를 하나씩 수집하세요.', '첫 반복이 끝나면 별도의 두 번째 while을 시작하세요.', '두 번째 while에서는 world.target_distance가 0이 될 때까지 한 칸씩 이동하세요.'],
  'lumi-act2-06': ['input()으로 관제 패널의 이동 신호를 받아 문자열 변수에 저장하세요.', 'int()로 그 문자열을 정수로 바꾸어 이동 칸 수 변수에 저장하세요.', '변환한 숫자 변수를 lumi.move()에 전달하세요.'],
  'lumi-data-7-02': ['신호 패킷 문자열을 변수에 저장하세요.', '문자열의 split()을 호출해 구분자 | 기준의 리스트로 나누세요.', 'len()으로 만들어진 리스트의 항목 수를 출력하세요.'],
  'lumi-data-7-03': ['신호 문자열들이 들어 있는 리스트를 만드세요.', '구분자 문자열의 join()에 그 리스트를 전달해 하나의 문자열로 합치세요.', '합쳐진 문자열을 출력하세요.'],
})

function plainText(value) {
  return String(value || '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

function missionText(mission) {
  const hints = (mission?.hints || []).map((hint) => (typeof hint === 'object' ? hint.text : hint))
  return [mission?.objective, mission?.summary, mission?.briefing, ...(mission?.concepts || []), ...(mission?.checklist || []), ...hints, ...(mission?.conceptEvidence?.mustCall || [])]
    .map(plainText).join(' ')
}

export function getLumiScaffoldStage(mission = {}) {
  const explicit = mission?.scaffold?.stage || mission?.scaffold?.level
  if (STAGE_META[explicit]) return explicit
  if (mission?.scaffold?.mode === 'view-only' && mission?.scaffold?.allowSolvedStarter === true) return 'observe'
  if (/field|challenge|final/i.test(String(mission?.difficulty || ''))) return 'field-test'
  const order = Number(mission?.order || 1)
  if (order <= 2) return 'guided'
  if (order <= 4) return 'recall'
  return 'mission'
}

export function getLumiScaffoldMeta(mission = {}) {
  const stage = getLumiScaffoldStage(mission)
  return { stage, ...STAGE_META[stage] }
}

export function isSolvedStarterAllowed(mission = {}) {
  return getLumiScaffoldStage(mission) === 'observe' && mission?.scaffold?.allowSolvedStarter === true
}

export function getLumiLearningSteps(mission = {}) {
  if (Array.isArray(mission?.learningSteps) && mission.learningSteps.length > 0) return mission.learningSteps.map(plainText).filter(Boolean)
  if (MISSION_STEPS[mission?.id]) return MISSION_STEPS[mission.id]
  if (Array.isArray(mission?.checklist) && mission.checklist.length > 1) return mission.checklist.map(plainText).filter(Boolean)
  const solution = getLumiSolutionBody(mission)
  if (/input\s*\(/.test(solution)) return ['input()으로 관제 패널의 값을 받아 문자열 변수에 저장하세요.', 'int()로 문자열을 정수로 변환해 새 변수에 저장하세요.', '변환한 숫자를 필요한 명령이나 계산에 사용하세요.']
  if (/\.split\s*\(/.test(solution)) return ['원본 문자열을 변수에 저장하세요.', '문자열의 split()을 호출해 지정된 구분자로 리스트를 만드세요.', '만들어진 리스트를 출력하거나 다음 작업에 사용하세요.']
  if (/\.join\s*\(/.test(solution)) return ['합칠 문자열들이 들어 있는 리스트를 준비하세요.', '구분자 문자열의 join()에 리스트를 전달하세요.', '완성된 문자열을 출력하거나 다음 작업에 사용하세요.']
  if (/^class\s/m.test(solution)) return ['class 문으로 객체의 설계도를 정의하세요.', '__init__이 필요한 미션이면 self에 각 객체의 초기 상태를 저장하세요.', '설계도로 객체를 만들고 요구된 메서드를 호출해 상태 변화를 확인하세요.']
  if (/^def\s/m.test(solution)) return ['def로 함수 이름과 필요한 매개변수를 정의하세요.', '함수 안에 반복할 행동이나 반환할 값을 들여써서 작성하세요.', '함수를 실제로 호출해 미션 결과를 만드세요.']
  if (/^while\s|\nwhile\s/m.test(solution)) return ['반복을 계속할 조건을 while 뒤에 작성하세요.', '반복할 행동을 네 칸 들여써서 작성하고, 그 행동이 조건의 상태를 바꾸는지 확인하세요.', '반복이 끝난 뒤 실행할 명령은 들여쓰기를 끝내고 작성하세요.']
  if (/^for\s|\nfor\s/m.test(solution)) return ['for가 차례로 읽을 리스트 또는 range() 범위를 정하세요.', '반복할 때 사용할 변수 이름을 정하세요.', '각 항목마다 실행할 명령을 네 칸 들여써서 작성하세요.']
  if (/^if\s|\nif\s/m.test(solution)) return ['True 또는 False가 되는 조건을 if 뒤에 작성하세요.', '조건이 참일 때 실행할 명령을 네 칸 들여써서 작성하세요.', '필요하면 elif나 else로 다른 경우의 행동을 이어서 작성하세요.']
  const objective = plainText(mission?.codeObjective || mission?.objective || mission?.summary || mission?.briefing)
  return objective ? [objective] : ['왼쪽의 성공 조건을 만족하도록 코드를 작성하세요.']
}

export function getLumiInitialCode(mission = {}) {
  if (typeof mission?.starterCode === 'string' && mission.starterCode.trim().length > 0) {
    return mission.starterCode
  }
  if (isSolvedStarterAllowed(mission)) return String(mission?.starterCode || '')
  if (mission?.scaffold?.exposure === 'minimal-skeleton' && typeof mission?.scaffold?.initialCode === 'string') return mission.scaffold.initialCode
  return `${['# 아래 순서대로 코드를 작성하세요.', ...getLumiLearningSteps(mission).map((step, index) => `# ${index + 1}. ${step}`)].join('\n')}\n\n`
}

function describesCode(value) {
  return /\b(?:lumi|world|while|for|if|elif|else|def|class|return|input|print|range)\b|[()=<>:[\]]/.test(value)
}

function conceptHintForMission(mission = {}) {
  const text = missionText(mission)
  const lesson = CONCEPT_REFERENCE.find((item) => item.match.test(text))
  return lesson ? `${lesson.title}. ${lesson.body}` : plainText(mission?.briefing || mission?.summary || mission?.objective)
}

export function getLumiMissionHints(mission = {}) {
  const source = Array.isArray(mission?.hints) ? mission.hints : []
  const normalized = source.map((hint, index) => {
    const text = plainText(typeof hint === 'object' ? hint.text : hint)
    const codeHint = describesCode(text)
    return { ...(typeof hint === 'object' ? hint : {}), type: codeHint ? 'structure' : 'concept', label: codeHint ? `${index + 2}단계 · 작성 방향` : `${index + 2}단계 · 추가 설명`, text }
  }).filter((hint) => hint.text)
  return [{ type: 'concept', label: '1단계 · 개념 설명', text: conceptHintForMission(mission) }, ...normalized]
}

export function getRelevantMissionApi(mission = {}) {
  const requiredCalls = new Set(mission?.conceptEvidence?.mustCall || [])
  const text = missionText(mission)
  const catalogItems = (mission?.api || []).map((item) => (typeof item === 'string' ? { signature: item } : item))
  const candidates = [...catalogItems, ...API_REFERENCE]
  const seen = new Set()
  const selected = []
  for (const item of candidates) {
    const signature = String(item?.signature || '')
    const token = item?.token || signature.split('(')[0]
    if (!signature || seen.has(signature)) continue

    const isExactRequired = requiredCalls.has(token)
    let isMatchedInText = false
    if (token === 'int') {
      isMatchedInText = /\bint\s*\(/.test(text)
    } else if (token === 'print') {
      isMatchedInText = /\bprint\s*\(/.test(text)
    } else if (token === 'type') {
      isMatchedInText = /\btype\s*\(/.test(text)
    } else if (token === 'len') {
      isMatchedInText = /\blen\s*\(/.test(text)
    } else if (token === 'input') {
      isMatchedInText = /\binput\s*\(/.test(text)
    } else {
      isMatchedInText = text.includes(token)
    }

    if (isExactRequired || isMatchedInText) {
      const reference = API_REFERENCE.find((candidate) => candidate.signature === signature || candidate.token === token)
      seen.add(signature)
      selected.push({ ...reference, ...item, signature })
    }
  }
  const appendReference = (token) => {
    const item = API_REFERENCE.find((candidate) => candidate.token === token)
    if (!item || seen.has(item.signature)) return
    seen.add(item.signature)
    selected.push(item)
  }
  if (requiredCalls.has('lumi.charge')) appendReference('lumi.energy')
  if (requiredCalls.has('input') || /\binput\s*\(/.test(text)) {
    if (requiredCalls.has('int') || /\bint\s*\(/.test(text)) appendReference('int')
  }
  if (requiredCalls.has('print') || /\bprint\s*\(/.test(text)) appendReference('print')
  if (requiredCalls.has('type') || /\btype\s*\(/.test(text)) appendReference('type')
  if (requiredCalls.has('len') || /\blen\s*\(/.test(text)) appendReference('len')
  if (text.includes('world.objects')) {
    appendReference('world.objects')
    if (text.includes('[0]') || mission?.id === 'while-collect-03' || mission?.id === 'while-rescue-06') appendReference('world.objects[0]')
  }
  if (mission?.id === 'lumi-act1-05' || mission?.concepts?.some(c => String(c).includes('주석')) || text.includes('주석')) {
    appendReference('#')
  }
  if (requiredCalls.has('lumi.move') && text.includes('world.target_distance')) appendReference('world.target_distance')
  return selected.length > 0 ? selected : catalogItems.slice(0, 3)
}

export function getLumiConceptLessons(mission = {}) {
  const text = missionText(mission)
  return CONCEPT_REFERENCE.filter((item) => item.match.test(text)).slice(0, 3)
}

export function getLumiGoalLabel(goal = {}) {
  if (typeof goal === 'string') return goal
  if (goal.label) return goal.label
  const labels = {
    awake: '루미의 전원을 켭니다.',
    position: `루미가 목표 좌표 (${goal.x}, ${goal.y})에 도착합니다.`,
    positionUnchanged: `항로를 완주하고 출발 좌표 (${goal.x}, ${goal.y})로 돌아옵니다.`,
    noCollision: '장애물과 충돌하지 않습니다.',
    eventOccurred: goal.eventType === 'rover_spoke' ? '루미가 지정된 메시지를 전송합니다.' : '요구된 행동을 실행합니다.',
    spokenMessage: goal.includes ? `루미가 “${goal.includes}”가 포함된 메시지를 말합니다.` : '루미가 메시지를 전송합니다.',
    stdoutIncludes: `출력 창에 “${goal.value}”가 나타납니다.`,
    allSignalsCollected: '월드에 남은 구조 신호를 모두 수집합니다.',
    collectedCount: `수집 대상을 ${goal.count || 1}개 이상 회수합니다.`,
    collectedIncludes: `${goal.id || '지정된'} 신호를 수집합니다.`,
    minimumEnergy: `루미의 에너지를 ${goal.value} 이상으로 만듭니다.`,
    variableDefined: `${goal.name} 변수를 만들고 값을 저장합니다.`,
    variableValueEquals: `${goal.name} 변수의 최종 값을 ${String(goal.value)}로 만듭니다.`,
    variableChanged: `${goal.name} 변수의 값을 계산으로 갱신합니다.`,
    classDefined: `${goal.className || '지정된'} 클래스를 정의합니다.`,
    classCountAtLeast: `클래스 설계도를 ${goal.count || 1}개 이상 정의합니다.`,
    instanceCountEquals: `객체 인스턴스를 정확히 ${goal.count}개 생성합니다.`,
    distinctInstanceCount: `서로 독립된 객체를 ${goal.count}개 생성합니다.`,
    classHasMethod: `${goal.className || '클래스'} 안에 ${goal.methodName} 메서드를 정의합니다.`,
    runtimeMethodCalled: `${goal.methodName || '지정된'} 메서드를 실제로 호출합니다.`,
    methodCalled: `${goal.methodName || '지정된'} 메서드를 실제로 호출합니다.`,
    allInstancesHaveAttribute: `모든 객체가 ${goal.attribute} 속성을 갖게 합니다.`,
    instancesHaveDistinctState: `각 객체의 ${goal.attribute || '상태'}가 서로 독립적으로 유지되게 합니다.`,
    inspectSystemObject: `${goal.objectName || 'lumi'} 객체의 정체와 상태를 확인합니다.`,
  }
  return labels[goal.type] || '설명에 제시된 실행 결과를 완성합니다.'
}

export function getLumiMissionGoals(mission = {}, result = null) {
  const source = result?.goalDetails || mission?.checklist || mission?.goals || (mission?.goal ? [mission.goal] : [])
  return (source || []).map((item) => ({ ...(typeof item === 'object' ? item : {}), label: getLumiGoalLabel(item) }))
}

export function getLumiSolutionPreview(mission = {}) {
  const body = getLumiSolutionBody(mission)
  if (!body) return null
  const header = ['# 완성 코드 예시', ...getLumiLearningSteps(mission).map((step, index) => `# ${index + 1}. ${step}`), ''].join('\n')
  const code = `${header}${body.trim()}\n`
  return { code, duration: getLumiSolutionDuration(code) }
}
