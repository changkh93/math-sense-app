# 20260918-manual-assignment-feedback

- Goal: 현재 대기 과제 전체를 원문·첨부·동일 과정 이전 피드백·제출일 학습 기록과 대조하여 학생에게 유용한 상세 수동 초안 작성.
- Phase: COMPLETE
- Updated: 2026-09-18 KST
- Owner: Codex 직접 검토. 외부 위임·자동 생성 API 없음.
- Baseline: 10a1028787881c13a141730187c2285c9ceeebde
- Workspace: 기존 프로젝트의 다수 문서·마케팅 등 변경 보존. 이번 작업은 task STATE/INDEX 및 /private/tmp 검토 자료만 수정.
- Initial scope: submitted 37건. 저장 직전 추가/수정 제출 재확인.
- Acceptance: 개별 원문/첨부/이전 공개 피드백 대조, 실제 진행과 완료 구별, 과정 격리, 질문 답변·명시적 평가·보너스. AI 초안 8필드만 저장하고 나머지 모든 필드 불변·초안 일치 재조회 검증.
- Current: 9월 17일 제출 37건 / 29명 상세 수동 초안 저장·재조회 완료. 저장 직전 37건 원문/상태/기존 필드 모두 초기 조회와 동일했고, 저장 후 추가 제출 0건.
- Result: 학생별 846~1,148자. 질문 답변, 실제 활동 근거, 같은 과정 이전 공개 피드백/반응, 구체적인 개선 설명, 보호자·운영자 요약과 8항목 수동 rubric 포함.
- Next: 운영자가 관리자 화면에서 AI 초안을 확인하고 승인·공개 여부 결정.
- User action: 초안 검토. 승인·공개·실제 보상 지급은 수행하지 않음.

## 저장·검증

- `scripts/apply-manual-assignment-feedbacks.mjs`를 사용하여 AI 초안 전용 8개 필드만 저장.
- 37건 모두 저장한 본문·제안 보너스·상태·근거·평가·요약 재조회 일치. `nextMission`은 빈 문자열.
- 각 과제의 AI 8필드 외 **모든 필드**가 저장 직전과 동일함을 비교. 공개 feedback, status(submitted), reviewedAt/reviewedBy, bonusCrystals 등 미변경.
- 29명 사용자 문서 전체가 저장 전후 동일. 사용자 잔고/실제 보상 지급 없음.
- 보너스 제안: 20광석 1건, 25광석 1건, 30광석 20건, 35광석 11건, 40광석 4건. 실제 지급하지 않음.
- 고전 읽기 8건은 같은 bookId의 이전 제출 쪽수 비교. 퀴즈 실응답 근거 없음으로 모두 30 이하. 책 변경은 새 기준점으로 인정.
- 전체 질문 답변 섹션·학생 호칭·과정 격리·범위/합계 검증. 모든 문단 240자 이하, `formatFeedbackForDisplay` 적용 전후 37건 본문 완전 동일.
- 실제 손풀이 사진 2장과 첨부 코드 원문/이전 동일 파일 검토. 안전한 짧은 Python 예제(if/else, f-string)는 실행하여 결과 확인; 클래스 파일 2개는 AST 문법 검사로 오류 확인.
- 앱 코드·교육 콘텐츠·배포 변경 없음. build는 앱 수정이 없어 실행하지 않음. 모바일/브라우저 실화면 렌더링, GUI 게임·Tkinter·외부 API 전체 실행은 미검증이며 관련 피드백에서 실행 확인으로 단정하지 않음.

## 운영자 확인 포인트

- seoyeon park / Python: collect_coins.py가 HTTP 200이지만 0바이트이며 직전 원본도 비어 있음. CODE TRACE 5/5·100%는 별도로 인정하고 첨부 원본 재확인 안내.
- 정승규 / Python: 화면 갱신 코드 개선은 확인됨. 마우스 클릭 처리에서 Rect.center에 정수를 각각 넣는 오류와 불명확한 제출 설명을 구분하여 안내. 불성실 경고 발행 없음.
- MINSOL / Python: CODE TRACE 4/5는 직전과 동일. 진행 중 초안에서 읽기/저장 CSV 경로 불일치 및 빈 이미지 경로 확인. 완료나 전체 실행 성공으로 포장하지 않음.
- 박기준 / Python: 퀴즈 최종100과 이전날 CODE TRACE 완료 인정. 제출한 두 클래스 파일은 직전과 동일하고 초기화 메서드 문법 오류가 남아 있어 수정·실행 확인 도움이 필요.
- 마채윤 / 고전: 현재 bookId의 최근 같은 책 기록은 9/10 140쪽, 이번152쪽(+12). 다른 bookId의 142쪽과 빼지 않음. 내용 불명 반응이 반복되어 개별 읽기 점검/보호자 안내/책 선택 재확인을 운영자 요약에 남김. 유효 책·쪽수가 있어 reviewed·20 제안, 읽지 않았다고 단정하지 않음.
- 신 ㅇㅛㅇㅎㅟ: 본인 수상 컬렉션의 studentId로 재확인. 4·5·7·8월 평가 최우수상, 9월 평가 수상/장학생 등록 없음. 확정 순위나 수상 불가로 해석하지 않도록 답변. 수상 기록 생성 없음.
- PARK / 고전: 질문한 인물 신원을 원문 마지막 장에서 확인하고 결말 정보 경고와 함께 설명. 집 소유자와 발견된 인물 신원을 구별. 이전 잘림 신고에 대한 앱 수정/해결 주장은 하지 않음.

## 검토 자료

학생 원문/코드/전체 사용자 문서는 저장소에 복사하지 않고 로컬 임시 자료와 Firestore AI 초안으로 보관.

- `/private/tmp/feedback-20260918-raw.json`, `source.json`, `files.json`, `meta.json`, `targeted.json`: 원문과 검토 근거(각 파일 동일 접두어).
- `/private/tmp/feedback-20260918-build.mjs`: Codex가 직접 작성한 37개 개별 피드백과 컨텍스트 정규화.
- `/private/tmp/feedback-20260918-normalized.json`, `/private/tmp/feedback-20260918-drafts.json`: 저장 입력.
- `/private/tmp/feedback-20260918-qa.json`: 37건 PASS, 길이·질문·표시 formatter·평가 검증.
- `/private/tmp/feedback-20260918-save-verify.mjs`: 저장 직전 변경 중단 가드 및 저장 후 비교.
- `/private/tmp/feedback-20260918-verification.json`: 37건 초안 일치, 추가 제출0, 모든 비AI 필드 불변, 사용자29명 문서 불변 검증 결과.
