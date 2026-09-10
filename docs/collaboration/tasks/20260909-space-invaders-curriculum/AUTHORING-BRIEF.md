[MetaSense 협업 작업 20260909-space-invaders-curriculum/01]
대상: Antigravity / Gemini 3.8 Flash
권장 추론 설정: 앱에서 지원하는 High, 없으면 기본값

당신은 Codex가 분리한 교육 콘텐츠 집필 담당자입니다. 사용자가 이 지시문을 전달했습니다. AGENTS.md를 읽어도 중앙 조정자 역할이나 재위임을 맡지 마세요. 중앙 기록과 통합은 Codex가 담당합니다.

전체 목표:
메타센스 파이썬 > 게임 프로젝트 하위에 Space Invaders 커리큘럼을 만듭니다. 동영상 없이 Data Log, Code Trace, Field Test, Quiz Battle을 제공합니다. 학생은 메타센스 게임 스튜디오에서만 코딩합니다. VS Code, 터미널, pip 설치 안내는 넣지 않습니다.

최우선 요구:
Data Log는 요약이 아니라 영상을 따라 만드는 느낌의 상세 제작 교재입니다. 기능을 조금씩 추가하고, 정확한 수정 위치/입력 코드/핵심 줄 설명/여기서 실행하세요/구체적인 관찰 결과/정상 미구현 현상/실패 시 점검법을 매 단계에 적으세요. 학생이 문서만 따라 쳐도 각 중간 실행이 작동해야 합니다. 완성 코드를 먼저 보여주고 해설하는 구성은 안 됩니다.

이번 담당 작업:
10개 유닛의 상세 Data Log, 각 실행 지점의 누적 Python 체크포인트, Code Trace, 객관식 퀴즈 100문항을 하나의 검토 가능한 교육 콘텐츠 묶음으로 완성하세요. 앱 통합이나 운영 등록은 하지 않습니다.

작업 방식: 지정한 초안 폴더에서 순차 집필. Codex는 이 패킷을 사용자에게 전달한 뒤 결과가 돌아오기 전까지 해당 집필 범위를 수정하지 않습니다. 다른 작업자/서브에이전트를 만들지 마세요.
프로젝트: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app
기준 커밋: 9da58446475546b67435f0980174d75443d57682
미커밋 준비물: 스튜디오의 새 수업 준비 버튼/spaceInvadersTemplate.js, public/space-invaders 에셋과 시작 패키지, scripts의 관련 생성기, 이 작업 문서. 모두 읽기 전용으로 참고하세요. 변경을 초기화하거나 덮어쓰지 마세요.
유일한 수정 허용 폴더: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/draft
보고서 허용 경로: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/01-antigravity-report.md
그 외 앱 소스·public·scripts·STATE.md·INDEX.md·Git 설정은 수정하지 마세요. 실제 경로/기준선이 다르면 임의의 다른 저장소에서 진행하지 말고 알려주세요.

반드시 먼저 읽을 자료:
1. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/SOURCE-MAP.md
2. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/TEACHING-CONTRACT.md
3. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/DATA-LOG-PILOT.md
4. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum/pilot-02-A.py
5. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/python-game-studio-implementation.md
6. /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/public/space-invaders/ASSETS.md
7. /Users/selah/Downloads/space_invaders.py — 완성 게임의 참고 자료일 뿐, 학습 순서를 정하는 근거가 아닙니다.

확인된 실제 강의 순서:
01 규칙/준비 → 02 화면과 반복문, 그다음 5개 클래스 pass 뼈대 → 03 그룹 연결/플레이어 표시/좌우 이동/reset → 04 플레이어 탄환/스페이스 발사/2발 제한/화면 밖 kill → 05 적 클래스/방향·속도/무작위 발사 조건/reset(편대 생성은 아직 없음) → 06 임시 적10개 편대 먼저/적 탄환 아래로 이동/화면 밖 kill/fire 연결 → 07 게임 상태/HUD/한글 폰트/11×5 편대, 임시 편대 제거 → 08 편대 경계 반전/하강/방어선 침범 → 09 상태 확인/탄환 비우기/위치 복원/일시정지와 Enter → 10 전체 게임 reset 먼저, 그다음 양쪽 충돌, 마지막 라운드 완료·보너스·다음 편대.
강의 52–60 자막을 Codex가 로그인된 브라우저에서 직접 확인했습니다. 다시 영상을 찾거나 완성 코드 순서로 추정하지 마세요. 상세 근거와 lecture ID는 SOURCE-MAP.md에 있습니다. 원강의의 표현/자막은 복사하지 않고 한국어로 독립 집필합니다.

코드와 에셋 계약:
- 게임명 우주 방어대. Mission/Scout/Raider/ScoutPulse/RaiderPulse, screen, SCREEN_WIDTH=1200, SCREEN_HEIGHT=700, FPS=60. 상세 변수/규칙은 TEACHING-CONTRACT.md와 통일.
- 내 프로젝트 > 우주 방어대 수업 준비를 누르면 빈 main.py와 에셋이 새 프로젝트로 열립니다. 기존 초안은 보존합니다.
- assets/scout.png, raider.png, DoHyeon-Regular.ttf, scout_pulse.ogg, raider_pulse.ogg, raider_break.ogg, shield_hit.ogg, line_alert.ogg, wave_ready.ogg가 모두 제공됩니다. 파일 경로를 바꾸지 마세요. 이미지는 pygame에서 크기를 줄이고 탄환은 작은 투명 Surface에 그립니다.
- 한글 표시와 효과음 로딩/재생 호출은 실제 스튜디오에서 확인했습니다. 폰트에 가운데점 · 글리프가 없어 게임 텍스트에는 하이픈 - 등 지원되는 기호를 씁니다. 폰트 라이선스는 asset_credits.py에 동봉되어 있습니다.
- 원본의 중첩 while 일시정지는 09에서 최상위 루프 + mission.state 방식으로 개선해 가르칩니다. 메서드 안 동기 무한 대기 루프 금지. async를 초반 학생의 선수지식으로 요구하지 않습니다.
- 강의의 점진적 미구현은 명확히 설명합니다. 특히 04의 2발 후 발사 불가 → kill로 해결, 06의 비교 연산 오류 → 수정, 08의 침범 후 위치 미복원 → 09에서 해결을 생략하지 마세요. 오류를 올바른 완성 정답으로 남기면 안 됩니다.
- 정지/재개/재시작, 경계 제한, 동시 격추 수만큼 점수, 기체0 이하 판정, 남은 탄환 초기화 등은 관련 단계에서 안전하게 완성합니다.

산출물:
A. draft/data-log/01.md ~ 10.md: 실제 학생용 전체 원고. 02의 시범 원고를 통합·확장할 수 있습니다. 코딩 유닛별 3개 이상 의미 있는 실행 지점, 복잡한 유닛은 5–8개를 권장하되 05에서 미래 편대를 미리 만들며 숫자를 채우지 마세요. 설명할 코드 위치가 모호하거나 독자가 빠진 코드를 추측해야 하면 다시 작성하세요.
B. draft/checkpoints/: 모든 실행 지점에 해당하는 완전한 누적 .py. final-main.py도 포함. main.py를 학생이 직접 작성하는 흐름이며 최종 코드를 시작 파일로 제공하지 않습니다.
C. draft/manifest.json: 유닛 번호/제목/lecture ID/Data Log 경로, 단계 ID/이전 체크포인트/누적 코드 경로/수정 위치/기대 결과/조작/정상 미구현/실패 진단.
D. draft/assessments.json: {"units":[{"unitKey":"si01","title":"...","exercises":[{"title":"...","level":1,"category":"pygame","concepts":["..."],"prompt":"...","answerLines":["올바른 코드 한 줄"],"hints":["..."],"commonMistakes":[]}],"quizzes":[{"question":"...","options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],"explanation":"정답 근거와 각 오답이 틀린 이유","score":1}]}]}. 예시의 ...는 실제 결과에 남기지 마세요. 각 유닛 Code Trace 2–5개, 각 정답 코드 2–8줄. 퀴즈 정확히 10개씩, 총100개, 선택지4개 중 정답1개. Data Log에서 배운 범위 안에서 예측/진단/조건 변경/순서 이해를 묻습니다. 정답 위치를 분산하세요.
E. Quiz Battle은 현재 앱에서 같은 quizzes 문제은행을 사용합니다. 별도 배틀 시스템을 만들지 마세요. 유닛당10개는 현재 유닛 배틀 최소5개를 충족합니다. 각 Data Log 끝에 Code Trace → Field Test → 해당 유닛 Quiz Battle 복습 동선을 안내하세요.
F. draft/REVIEW.md: 강의 순서 대조표, 실행 지점 누락 점검, 의도적 오류와 해결 위치, 검증 결과/미검증 구분, Codex 통합 시 필요한 사항.

완료 및 검증:
- 계획이나 1~2개 샘플만 제출하지 말고 전체10유닛 원고/코드/평가를 완성하세요.
- 수정 블록을 앞 단계 코드에 순서대로 적용하면 다음 체크포인트가 되는지 확인하세요. 줄 번호만 쓰면 코드가 늘어날 때 어긋나므로 고유한 기준 코드도 함께 씁니다.
- 모든 체크포인트를 ast.parse 등으로 문법 검사하고 JSON을 실제 파싱하세요. 모든 에셋 경로가 실제 제공 파일에 대응하는지 검사하세요.
- 가능하면 실제 스튜디오에서 확인하되 사용자 초안/계정/운영 학습 기록에 영향을 주지 마세요. 브라우저 실행을 못 했다면 정적 검증만 했다고 명확히 쓰세요. pygame 설치 후 로컬 실행만으로 웹에서 검증했다고 말하면 안 됩니다.
- 원고의 각 기대 결과, 퀴즈 정답과 해설을 체크포인트 코드와 대조하세요.
- DB 쓰기/배포/보상·학습기록·권한 변경/학생 데이터 열람/병합/다른 앱 위임은 금지합니다.

최종 보고를 다음 한 개 텍스트 블록에 담고, 파일에도 저장하세요.
[CODEX RETURN]
작업 ID: 20260909-space-invaders-curriculum/01
사용한 앱/모델:
상태: 완료 / 부분 완료 / 막힘
작업 폴더 및 기준 커밋:
산출물 절대 경로:
Data Log/체크포인트/Code Trace/퀴즈 실제 개수:
강의 순서와 사용자 요구 반영 요약:
완료 조건별 결과:
실행한 검증과 실제 결과:
미실행 검증 및 이유:
남은 문제/연결 필요 사항:
[/CODEX RETURN]
