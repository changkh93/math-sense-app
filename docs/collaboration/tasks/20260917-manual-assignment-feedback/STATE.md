# 20260917-manual-assignment-feedback

- Goal: 현재 대기 과제를 제출 원문·첨부·동일 과정 이전 공개 피드백·제출일 학습 근거와 대조하고 학생별 상세 초안 저장.
- Phase: DONE (draft-only saved and verified)
- Updated: 2026-09-17 KST
- Owner: Codex 단독 수동 검토. 외부 위임/API 생성 없음.
- Baseline: a0475b616d2b1fb36349a1ed9e151be80d0e7e6b
- Workspace: 기존 프로젝트. 다수 기존 소스·문서 변경 보존. 본 작업은 이 상태 문서, INDEX 및 /private/tmp 검토 자료만 사용.
- Initial scope: submitted 38건. 실행 중 추가/변경 제출은 저장 전 다시 확인.
- Acceptance: 모든 대상 원문/첨부 검토, 과정 격리, 이전 공개 피드백 반영 대조, 명시적 평가·보너스·질문 답변, AI 초안 8개 필드만 저장. status/feedback/보상 등 비-AI 필드 불변을 재조회 검증.
- Current: 25명·38건 상세 수동 초안 저장 완료. Python 10 / 초등수학 14 / 중등수학 6 / 고전 8. 본문 합계 33,102자, 건별 739~1,168자.
- Results: reviewed 제안 37건 / needs_revision 제안 1건(기존 분수 나눗셈 풀이 근거 보완). 실제 status는 38건 모두 submitted 유지. 보너스는 제안만 20×2 / 25×6 / 30×14 / 35×12 / 40×4.
- Verification: 저장 직전 원자료 비초안 변경 0, 추가 대기 0. 저장 후 38/38 본문·구조형 payload·근거·루브릭 일치. 허용된 초안 8필드 밖의 모든 필드(기존 AI 보조 필드 포함) 불변을 저장 직전 snapshot과 재조회 비교. 공개 피드백/승인/지급/경고 생성 없음.
- Next: 운영자의 초안 검토·공개 판단. 아래 퀴즈 콘텐츠 문제는 별도 수정 권한을 받으면 처리. 현재 상세 피드백 작업의 미처리 대상 없음.
- User action: 없음. 승인·공개·실제 보너스 지급은 본 작업 범위 밖.

## 검토 및 정규화

- 원본 history와 learning_progress, 현재 제출/첨부 전체, 같은 과정 직전 최대 5건 및 공개 피드백·반응 대조. 다른 과정 기록 혼합 방지; 초등→중등 레벨업 인정.
- 영상 NFD/NFC 및 history/progress 중복 제거. 누적 시청 위치를 당일 학습 시간으로 계산하지 않음. 자동 learningLoad/부족 경고 대신 실제 활동별 근거와 직접 판정 사용.
- 동일 경로 코드끼리만 비교. exporter의 서로 다른 파일 간 diff(노트북 vs main.py 등)는 payload에서 교체. 실제 첨부 이미지 2장 및 Google 문서의 당일 손필기 직접 확인.
- CODE TRACE 전체 완료와 최고 정확도 분리; LUMI 7/10 미션 진행을 전체 완료로 오인하지 않음. 이번 제출일의 interactiveLearnings 완료 근거는 없음.
- 마채윤 큰 수 나눗셈의 실제 2응답은 currentIdx=0으로 exporter에서 누락돼 원자료로 복원. 다솜이의 보류 5문제는 userAnswers가 비어 있어 0응답으로 정정.
- 고전은 동일 bookId로 페이지 비교, 새 책 시작 정상 인정, 실제 퀴즈 응답 없는 8건 모두 quizActivity=0. 열린 세션만으로 퀴즈 시도·오답 인정하지 않음.
- 학생 컴퓨터 비서 파일의 키는 출력 전 마스킹, 값/실제 컴퓨터 조작/외부 API 실행하지 않음. 본문에 보안·환경·중단 장치 안내.
- 표시 검사: 현재 formatFeedbackForDisplay에 38개 본문을 통과시켜 원문과 완전 일치 검증. 모두 짧은 문단이며 Markdown 링크/코드 내 마침표가 분리되지 않음. 학생 기기에서 공개 후 UI 실물 검증을 한 것은 아님.
- 앱 소스/퀴즈 원본 변경·빌드·배포 없음. 기존 다른 작업 변경은 보존.

## 별도 확인: 창문 함수 퀴즈 정답 설정 오류 (미수정)

- 문서: `quizzes/unit_python_20_q7_1773324450186`.
- 문항: window() 안에서 global x 선언 없이 x = x + 70을 실행할 때 결과.
- 현재 저장 정답: 함수 안에서 새 x가 만들어져 외부 x는 그대로라는 선택지.
- 본문의 전역 x를 읽고 수정하는 상황에서 학생이 고른 '에러 발생'이 타당. q5/q8의 전역 x 수정·y 읽기 맥락도 대조.
- 최소 재현: 외부 `x=10`, 인수 없는 함수 내부 `x=x+70`, 호출 시 `UnboundLocalError` 확인. 별도 초기화/매개변수가 있는 경우와 구별.
- 최다인 Python의 4응답 중 시스템 오답 3개에 포함돼 있으나, 이 1개는 개념 오류·감점 근거에서 제외. 반복문 묶음 횟수와 지역 변수의 실제 오류는 설명. 퀴즈 원본·성적·보상은 변경하지 않음.

## 로컬 검증 자료 (임시, 비밀값 미포함 출력본)

- `/private/tmp/feedback-20260917-feedbacks.json`: 최종 38건 수동 작성 payload.
- `/private/tmp/feedback-20260917-normalized.json`: 과정·중복·진도 정규화 컨텍스트.
- `/private/tmp/feedback-20260917-drafts.mjs`: 직접 작성 초안 및 검증 로직.
- `/private/tmp/feedback-20260917-verification-before.json`, `...-verification-after.json`: 저장 전후 재조회 결과.
- 원자료는 민감한 학생 정보가 포함된 임시 검토 자료이므로 저장소에 복사하지 않음.
