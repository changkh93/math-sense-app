import fs from 'node:fs'
import { LUMI_COURSE_CATALOG, getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { getLumiSolutionBody } from '../src/components/PythonWorld/lumiSolutionCatalog.js'

let md = '# PYTHON LEARNING JOURNEY: 루미와 함께 배우는 Python 전 과정 (ACT 0 ~ ACT 9 + FINAL)\n\n'
md += '> 탐사선 LUMI와 함께 우주 항로를 복원하며 파이썬 기초 문법부터 객체지향, 종합 자율항법까지 단계별로 체득하는 총 72개 미션 전체 로드맵 및 완성 코드 가이드입니다.\n\n'

md += '## 📑 전체 커리큘럼 구성 요약\n\n'
md += '| 과정 | ACT 명칭 | 부제 | 미션 수 | 핵심 개념 |\n'
md += '|:---|:---|:---|:---:|:---|\n'

let total = 0
for (const act of LUMI_COURSE_CATALOG.acts) {
  const set = getLumiMissionSet(act.id)
  total += set.missions.length
  md += `| ${act.title.split('.')[0]} | ${act.title} | ${act.subtitle} | ${set.missions.length}개 | ${act.concepts} |\n`
}
md += `| **총계** | **11개 액트** | **전체 코스** | **${total}개** | **파이썬 기초 ~ 자율항법 완결** |\n\n`
md += '---\n\n'

for (const act of LUMI_COURSE_CATALOG.acts) {
  const set = getLumiMissionSet(act.id)
  md += `## 🚀 ${act.title} : ${act.subtitle} (${set.missions.length}개 단계)\n\n`
  md += `> **핵심 테마 & 개념**: \`${act.concepts}\`\n\n`

  for (const mission of set.missions) {
    const solution = getLumiSolutionBody(mission)
    const codeName = mission.codeName || mission.id
    const concepts = (mission.concepts || []).join(', ') || act.concepts
    const objective = mission.objective || mission.summary || ''
    const briefing = mission.briefing || mission.storyIntro || ''

    md += `### [${codeName}] ${mission.title}\n`
    md += `- **미션 ID**: \`${mission.id}\`\n`
    md += `- **학습 개념**: ${concepts}\n`
    if (objective) md += `- **학습 목표**: ${objective}\n`
    if (briefing) md += `- **상황/시나리오**: ${briefing}\n`
    md += `\n\`\`\`python\n${solution}\n\`\`\`\n\n`
  }
  md += '---\n\n'
}

md += '## 🔍 전체 커리큘럼 종합 분석 및 리뷰\n\n'
md += '### 1. 문법 및 개념의 점진적 연계성 (Progression)\n'
md += '- **ACT 0 ~ ACT 1 (실행/명령)**: 아무것도 모르는 상태에서 실행 버튼을 누르는 `lumi.wake()`부터 인자를 전달하는 `lumi.move(2)`, 방향을 트는 `lumi.turn(90)`까지 직관적인 공간 이동으로 문법 진입 장벽을 낮춤.\n'
md += '- **ACT 2 (변수/자료형)**: 고정된 숫자가 아닌 이름 붙인 상자(`variable`)의 필요성을 스킨 장착, 게이지 갱신, HUD 렌더링으로 시각화.\n'
md += '- **ACT 3 ~ ACT 4 (센서/판단)**: 환경 관측 객체(`world`)를 도입하여 고정 수치가 아닌 실시간 센서값(`world.steps_to_target`, `world.path_clear`)을 읽고, `if-elif-else`를 통해 로봇이 상황에 맞게 스스로 판단하도록 연결.\n'
md += '- **ACT 5 ~ ACT 6 (자동화/루프)**: 단순 나열된 코드를 `for`와 `range`로 압축하고, 종료 시점을 알 수 없는 상황을 `while`, `break`, `continue`로 처리하며 게임 루프 구조까지 자연스럽게 확장.\n'
md += '- **ACT 7 (데이터 코어)**: 단순 단일 변수를 넘어 `list`, `tuple`, `dict` 등 현실 프로그래밍에서 쓰이는 데이터 구조와 문자열 패킷 파싱(`split`, `join`)을 관제 텔레메트리 상황과 융합.\n'
md += '- **ACT 8 (능력 코어 - 함수)**: 반복되거나 복잡한 로직을 `def`, 매개변수, `return`, `Scope` 분리를 통해 독립적인 모듈형 함수로 캡슐화.\n'
md += '- **ACT 9 (객체 코어 - 클래스)**: `lumi`가 단순한 모듈이 아니라 `class Rover`로 찍어낸 인스턴스임을 밝히며 `class`, `__init__`, `self`, 메서드, 다중 인스턴스 편대 관리로 심화.\n'
md += '- **FINAL (THE LOST LIGHT - 종합 자율항법)**: 앞서 배운 센서, 판단, 반복, 데이터, 함수, 객체를 총동원하여 미지의 성간에서 자율 구조 알고리즘을 완성.\n\n'

md += '### 2. 모듈 임포트 (`from msense import ...`) 일관성\n'
md += '- **ACT 1**: `from msense import lumi` 명시\n'
md += '- **ACT 2**: `from msense import game` 또는 `lumi` 명시\n'
md += '- **ACT 3**: `from msense import lumi, world`로 환경 센서 객체 도입 명시\n'
md += '- **ACT 4 ~ ACT 8**: `from msense import lumi, world` 일관 적용\n'
md += '- **ACT 9 / FINAL**: 순수 파이썬 클래스 정의와 월드 텔레메트리 연동이 자연스럽게 배분됨.\n\n'

md += '### 3. 스토리텔링 및 게임적 시나리오 흐름 평가\n'
md += '- 신호 폭풍으로 다운된 탐사선 LUMI를 깨우는 도입부(ACT 0)부터, 각 코어(명령-기억-센서-판단-자동화-지속-데이터-능력-객체)를 하나씩 복구해 나가며 잃어버린 빛의 항로(FINAL)를 완성하는 서사적 몰입감이 매우 뛰어남.\n'
md += '- 특히 단순 알고리즘 문제 풀이가 아니라 **"조난 신호 수신", "장애물 방어", "에너지 도크 완충", "텔레메트리 패킷 복원", "드론 편대 제어"**라는 탐사 테마가 학습 목적과 유기적으로 결합되어 있음.\n'

fs.writeFileSync('/Users/selah/.gemini/antigravity/brain/896205f4-319d-478a-8244-f0d5246141e1/python_learning_journey_curriculum.md', md, 'utf8')
console.log('Successfully written python_learning_journey_curriculum.md')
