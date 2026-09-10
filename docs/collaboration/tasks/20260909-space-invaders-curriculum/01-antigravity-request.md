[MetaSense 협업 작업 20260909-space-invaders-curriculum/01]
대상: Antigravity / Gemini 3.8 Flash (지원되면 High, 아니면 기본값)

당신은 교육 콘텐츠 집필 담당자입니다. 조정·통합은 Codex가 맡으므로 재위임하지 마세요.
프로젝트: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app
작업 자료 폴더: docs/collaboration/tasks/20260909-space-invaders-curriculum
기준 커밋: 9da58446475546b67435f0980174d75443d57682

목표: 파이썬 > 게임 프로젝트의 Space Invaders 10유닛을 동영상 없이 Data Log/Code Trace/Field Test/Quiz Battle로 구성합니다. 학생은 메타센스 게임 스튜디오에서만 코딩합니다.

먼저 작업 자료 폴더의 AUTHORING-BRIEF.md, SOURCE-MAP.md, TEACHING-CONTRACT.md, DATA-LOG-PILOT.md, pilot-02-A.py를 모두 읽고 상세 계약대로 집필하세요. AUTHORING-BRIEF.md는 이 패킷의 전체 명세입니다. 원본 /Users/selah/Downloads/space_invaders.py는 완성 동작만 참고합니다.

핵심 요구:
1. Data Log를 영상처럼 작은 제작 단계로 안내하세요. 각 단계에 정확한 삽입/교체 위치와 들여쓰기, 입력 코드, 줄 설명, '여기서 실행하세요', 조작과 관찰 결과, 정상 미구현 현상, 실패 시 점검법을 넣습니다. 코드를 추측해야 하거나 완성 코드를 먼저 통째로 입력시키면 안 됩니다.
2. 실제 강의 순서는 규칙 → 설정/루프/클래스 뼈대 → 플레이어 → 플레이어 탄환 → 적 → 적 탄환 → HUD/편대 → 경계/침범 → 상태/일시정지 → 전체 reset/충돌/라운드 완료입니다. 내부 순서도 SOURCE-MAP.md에 맞춥니다. 완성 코드의 함수 순서로 재배치하지 마세요.
3. 새 에셋과 도현체는 public/space-invaders에 준비되어 있고 스튜디오의 '우주 방어대 수업 준비' 버튼이 빈 main.py와 함께 불러옵니다. 파일명과 개선된 클래스명은 TEACHING-CONTRACT.md를 따릅니다. 09의 일시정지는 최상위 루프와 state로 가르쳐 웹에서 중첩 대기 루프가 멈추지 않게 합니다.

수정 허용: 작업 자료 폴더 안 draft/만. 결과 보고는 같은 자료 폴더의 01-antigravity-report.md에 저장합니다. Codex는 결과를 기다리는 동안 이 집필 범위를 수정하지 않습니다. 기존 앱 소스, public, scripts, 중앙 STATE/INDEX, 사용자 수정은 읽기 전용입니다. DB 쓰기, 배포, 병합, 학생 데이터 열람, 다른 에이전트/앱 위임 금지. 경로/기준선이 다르면 보고하세요.

완성할 산출물:
- draft/data-log/01.md~10.md: 샘플이 아닌 학생용 전체 원고.
- draft/checkpoints/: 매 중간 실행의 완전한 누적 Python과 final-main.py.
- draft/manifest.json: 유닛/강의/단계/이전 파일/코드 경로/수정 위치/기대 결과/오류 진단 연결.
- draft/assessments.json: 유닛별 Code Trace 2~5개와 퀴즈10개씩 총100개. 선택지4개/정답1개/정답 근거와 오답 해설. 명세의 JSON 형식을 지킵니다.
- draft/REVIEW.md: 순서 대조와 검증 결과. Quiz Battle은 같은 퀴즈은행을 사용하며 새 시스템을 만들지 않습니다.

검증: 모든 Python 문법 검사와 JSON 파싱, 이전 코드에 문서의 변경을 적용해 다음 체크포인트가 되는지, 에셋 경로, 아직 배우지 않은 내용 출제 여부, 정답/기대 결과를 실제 코드와 대조합니다. 가능한 스튜디오 실행도 하되 수행하지 않은 검증을 완료라고 쓰지 마세요. 전체10유닛을 완성하고 다음 보고를 파일과 마지막 답변에 남기세요.

[CODEX RETURN]
작업 ID: 20260909-space-invaders-curriculum/01
사용 앱/모델 및 상태:
작업 폴더/기준 커밋/산출물 절대 경로:
Data Log/체크포인트/Code Trace/퀴즈 실제 개수:
사용자 요구·강의 순서 반영 요약:
실행한 검증과 실제 결과:
미실행 검증 및 이유:
남은 문제/연결 필요 사항:
[/CODEX RETURN]
