# External packet template — Codex fills every field before sending

```text
[MetaSense 협업 작업 {task-id}/{sequence}]
대상: {Antigravity / Gemini 3.8 Flash 또는 ZCode / GLM 5.3 또는 GLM 5.3 Flash}
권장 추론 설정: {해당 앱에서 실제 지원되는 설정 또는 기본값}

당신은 Codex가 분리한 작업의 담당자입니다. 사용자가 이 지시문을 전달했습니다.
아래 범위의 결과를 완성하고 마지막에 Codex 전달용 보고를 작성하세요.
프로젝트 AGENTS.md를 읽더라도 중앙 조정자 역할이나 재위임 절차를 맡지 마세요.
중앙 INDEX.md/STATE.md는 Codex가 관리합니다.

전체 목표: {원래 사용자 목표와 이 작업의 관계}
이번 담당 작업: {단일하고 구체적인 결과물}
작업 방식: {읽기 전용 조사 / 격리 폴더에서 구현 / 쓰기 담당을 넘겨받은 순차 구현}
작업 폴더: {검증된 절대 경로 또는 저장소 접근 불필요}
기준 브랜치/커밋: {실제 확인값 또는 비코드 작업으로 해당 없음}
포함된 미커밋 변경: {내용 또는 없음}

확인된 사실과 이미 수행한 작업:
{재현 조건, 관련 인터페이스, 기존 결정, 실제 확인 내용}

읽을 자료:
{실제로 접근 가능한 파일/링크 또는 필요한 발췌 본문}
수정 가능한 경로: {구체적인 허용 범위 또는 없음}
유지할 계약과 제외 범위: {구체적인 불변 조건과 다른 담당자의 영역}

완료 조건:
{관찰 가능한 결과와 경계 사례}
검증:
{저장소에서 확인된 명령, 재현 절차, 화면 확인 또는 출처 확인 기준}
검증을 못 했다면 성공했다고 쓰지 말고 이유를 적어 주세요.

작업 지침:
- 합리적인 범위 내에서 구현과 관련 검증까지 완료하세요.
- 범위 밖 변경이 필요하면 변경하지 말고 이유와 필요한 연결 지점을 보고하세요.
- 운영 배포/DB 쓰기/병합/다른 앱 재위임은 이번 작업에 포함되지 않습니다.
- 비밀키와 실제 학생 데이터를 읽거나 보고서에 넣지 마세요.
- 코드 작업 결과는 커밋 또는 실제 diff/patch 경로로 확인할 수 있게 남기세요.
- 커밋이 불가능하면 변경 파일과 git diff, 신규 파일의 실제 위치를 제공하세요.
- 폴더나 기준선이 다르면 임의로 다른 저장소에서 구현하지 말고 불일치를 보고하세요.

마지막 답변을 아래 양식의 한 개 텍스트 블록으로 작성하세요.
[CODEX RETURN]
작업 ID: {task-id}/{sequence}
사용한 앱/모델:
상태: 완료 / 부분 완료 / 막힘
작업 폴더 및 기준 커밋:
변경 커밋 또는 diff/patch/산출물 절대 경로:
변경 파일:
구현/조사 요약:
완료 조건별 결과:
실행한 검증과 실제 결과:
미실행 검증 및 이유:
남은 문제/연결 필요 사항:
[/CODEX RETURN]
```

For non-code tasks, remove irrelevant git fields and specify where evidence and artifacts are accessible. Never rely on an inaccessible local report alone; the final report must include the substantive findings or a usable artifact reference.
