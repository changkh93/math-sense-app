[MetaSense 협업 수정 작업 20260909-space-invaders-curriculum/02]
대상: Antigravity / Gemini 3.8 Flash
권장 추론: High가 있으면 High, 없으면 앱 기본값

당신은 교육 콘텐츠 집필 담당자입니다. Codex가 01차 산출물을 실제 검수했고 NEEDS_REVISION으로 판정했습니다. 기존 작업을 이어서 원고·누적 코드·평가를 함께 수정하세요. 중앙 조정자 역할이나 다른 작업자/서브에이전트 위임은 맡지 않습니다.

프로젝트: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app
기준 커밋: 9da58446475546b67435f0980174d75443d57682
작업 폴더: /Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/docs/collaboration/tasks/20260909-space-invaders-curriculum
수정 허용: 위 작업 폴더의 draft/ 전체와 02-antigravity-report.md만.
그 외 앱 소스/public/scripts/STATE/INDEX/기존 검수문서·테스트·백업/Git 설정/DB는 읽기 전용입니다. 기존 미커밋 변경을 초기화하지 마세요. Codex는 반환 전까지 draft/를 수정하지 않는 순차 작업입니다.

먼저 작업 폴더의 02-REVISION-BRIEF.md 전체를 읽으세요. 구체적인 실패 증거·수정 순서·완료 기준이 있습니다. SOURCE-MAP.md, TEACHING-CONTRACT.md, DATA-LOG-PILOT.md도 다시 대조하세요. 01-gameplay-results.txt와 01-structural-results.json은 Codex의 실제 검사 결과입니다.

필수 수정:
1. 게임오버 최종 점수를 Enter 전까지 유지하고 Enter에서만 새 게임을 초기화하세요. 같은 프레임에서 상태가 바뀌면 후속 처리를 중단하고, 새 라운드에서 양쪽 탄환을 정리하세요. 03부터 이동 후 양쪽 경계 보정을 가르치세요.
2. 03은 그룹/객체/update·draw 연결 먼저, 09는 status/탄환 정리/위치 복원 먼저입니다. 02 메서드 pass 뼈대, 06 비교 오류 직접 관찰·수정, 08 빠른 침범 시험을 복원하세요. 10은 reset → 충돌 → 라운드 완료 순서를 유지하세요.
3. 후반 교재를 작은 실행 지점으로 나누고 매번 정확한 교체 위치·입력 코드·줄 설명·여기서 실행하세요·관찰 결과·정상 미구현·실패 진단·시험값 복원을 작성하세요. 07의 Mission 중복 생성 지시와 09의 모호한 메인 루프 변경을 해결하세요.
4. 잘못된 reset/경계 Code Trace와 퀴즈를 수정하세요. 정답2–8줄을 위반한4개 항목을 고치고 확률1/1001, 웹 동작, 게임 규칙, 다운로드 형식을 정확히 설명하세요. 과장된 완료·검증 주장은 제거하세요.
5. Data Log10개/모든 checkpoint와 final-main.py/manifest/assessments/REVIEW를 함께 갱신하세요. 각 유닛 Code Trace2–5개, 퀴즈10개(총100개)를 유지하세요. 실제 단계 변경을 재현할 draft/edits.json과 사용한 검사기를 draft/tools/에 제공하세요.

학생은 영상 없이 메타센스 게임 스튜디오에서만 직접 코딩합니다. 완성 코드를 먼저 주거나 VS Code/pip/터미널을 학생 동선에 넣지 마세요. 새 이미지·6종소리·한글 도현체와 기존 경로를 그대로 사용하세요. 외부 강의 자막을 복사하지 말고 확인된 순서로 독립 집필하세요.

검증: 작업 폴더의 verify-gameplay.py는 읽기 전용입니다. python3로 실행하여7개 검사를 통과시키고 실제 출력을 draft/verification/에 남기세요. 전체 Python AST/JSON 구조/평가 정답/누적 편집 적용도 검사하세요. 실행하지 않은 웹 플레이·2인 Battle·청음을 통과했다고 보고하지 마세요. 앱 통합/운영 DB 등록/배포는 Codex 담당입니다.

완성 후 02-antigravity-report.md와 최종 답변에 아래 형식으로 반환하세요.
[CODEX RETURN]
작업 ID: 20260909-space-invaders-curriculum/02
사용한 앱/모델/추론 설정:
상태: 완료 / 부분 완료 / 막힘
변경 파일 및 실제 산출물 개수:
R1–R4 실행 오류 수정 결과:
03/09 순서 및 Data Log 세분화 결과:
누적 편집 재현 파일/검증 결과:
7개 게임 검사의 실제 결과와 로그 경로:
평가 정답/2–8줄/100문항 검증 결과:
미검증 항목 및 남은 문제:
[/CODEX RETURN]
