# 중3 2학기 중간 1~4회
- Phase: DONE
- Owner: Codex 직접 작업 (사용자 요청)
- Goal: 네 문제지 전체를 원문 순서, 그림 캡처, 5지선다, 상세 개념 설명과 풀이로 작성하고 지정 DB에 등록, readback 검증 및 preview 제공.
- Mapping: 원본 1회→등록1회, 원본5회→등록2회 (별도해설지), 원본6회→등록3회, 원본7회→등록4회.
- Baseline: c62aa91d9b2a30bdca446559aecb9e914b214b6d
- Existing dirty files: INDEX.md, marketing README/JOURNAL, 이전 quiz output/task records. 보존.
- Scope: output/quiz/mid3-sem2-exams1-4 및 해당 task record, 네 지정 unit DB와 이미지.
- Checks: PDF 원본 복사 및 페이지 렌더 시작.
- Next: 전 문제와 정답 읽기, 작성, 수학 검증, 등록 후 readback. 사용자 추가 승인 불필요.

## 완료 및 검증
- 2026-09-09 KST: 중3 1~4회 25/30/26/19문항, 총100문항과 그림78개 등록 완료.
- 원본 1회→1회, 원본5회→2회(별도해설지), 원본6회→3회, 원본7회→4회.
- 4회16번 두 소문항을 넓이·길이 조합 보기로 보존.
- 73개 객관식 정답표 대조, 86개 독립 수치 검사, KaTeX5018개/JSON/5보기 검사 통과.
- 모든 DB필드 readback 일치, 문항수/순서 일치. 모든 이미지 HTTP200/PNG/로컬 SHA256 일치.
- 등록 스크립트의 이전 회차 20문항 고정 집계를 첫 등록에서 발견하여 회차별 실제 문항수로 수정; 1회 단원 집계를25로 정정하고 전필드 재검증 완료. 중복문항 없음.
- 브라우저100문항/그림78개/katex-error0 확인, 새 도형 렌더 및 상세 풀이 펼침 확인.
- Deliverables: output/quiz/mid3-sem2-exams1-4/{review.html,questions.json,REPORT.md,acceptance-report.json,registration-summary.json}, authoring/round1..4 및 소스.
- Preview: http://127.0.0.1:8769/review.html?registered=1 (local HTTP server).
- Limits: 원본 그림은 개략도이며 학생 계정 실제 응시·제출은 미실시. 앱 소스 변경 없음.
- Next: 없음. 사용자 검토 시 필요한 문항 수정에 대응.
