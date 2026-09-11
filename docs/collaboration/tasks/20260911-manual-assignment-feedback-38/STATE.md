# 20260911-manual-assignment-feedback-38

- Original goal: 현재 `submitted`(대기중) 학생 과제를 수동 피드백 절차에 따라 빠짐없이 상세 검토하고 운영툴 AI 초안에 저장한다.
- Phase: DONE
- Last updated: 2026-09-11 15:33 KST
- Coordinator: Codex (manual review; no external worker/model)
- Baseline: `413489f7007f1e3f0c944242ddf3718ad47c9034`; 작업 시작 시 source worktree clean.
- Acceptance criteria: 모든 현재 대기중 ID 포함, 학생별 구체 근거, 질문 답변, 이전 반응 반영, 과정 격리, 첨부 원본 검토, 고전 읽기 페이지 비교, 10~40 보너스, 학생 공개 필드/제출 상태 미변경, 저장 후 운영 재조회 일치.
- Local/operational work:
  - `scripts/export-pending-assignment-contexts.mjs`로 대기중 38건을 내보냈다.
  - 38건의 제출문, 당일 학습, 진행 중 학습, 이전 제출 5건, 피드백 반응, 다크 매터, 코드 첨부/비교를 Codex가 직접 검토했다.
  - 중등수학 사진 첨부 1건은 원본을 내려받아 손풀이·도형 표시·삼각비 계산을 시각 확인했다.
  - 고전 읽기 5건은 export에 reading summary가 빠져 운영 원본의 `assignment.reading`과 동일 bookId 이전 제출을 별도 읽어 페이지 진행을 복원했다. 비교 결과: +11, +29, +19, first_for_book, +7쪽.
  - 완료 영상과 `learning_progress` 영상이 이중 집계된 컨텍스트는 저장용 로컬 사본에서 같은 unit/title을 중복 제거하고 학습량 신호를 다시 계산했다. 운영 원본과 repo exporter 코드는 변경하지 않았다.
  - 보너스 분포: 15×1, 20×1, 25×3, 30×15, 35×13, 40×5.
  - 제안 상태: reviewed 37, needs_revision 1. 보완 1건은 동일 Python 코드와 `missing monster_type` 오류가 반복되어 네 번째 인자 수정 및 재실행 결과를 요청했다.
- Production write: `aiFeedbackDraft`, `aiFeedbackPayload`, `aiFeedbackEvidence`, `aiFeedbackRubricScores`, 수동 생성 메타데이터만 38건 저장. `feedback`, `status`, `reviewedAt`, `reviewedBy`, `bonusCrystals`는 수정하지 않았다.
- Verification:
  - context/feedback ID 38/38, missing 0, extra 0.
  - 질문 추출 9건 모두 `질문에 대한 답변` 포함.
  - 이전 피드백 반응 학생 4건 모두 후속 문장 반영.
  - 비-Python 피드백/컨텍스트의 CODE TRACE·LUMI 혼입 0.
  - 금지 문구 및 35자 이상 동일 문장 반복 0.
  - 고전 읽기 5건의 rubric 합계·쪽수·comparisonState 검증 통과.
  - Firestore 재조회: submitted 38, withDraft 38, manual 38, 로컬 검토본과 draft/bonus/suggestedStatus 불일치 0.
- Remaining limitation: export 스크립트 자체의 고전 읽기 summary 누락과 history/progress 영상 중복 집계는 이번 운영 저장에서 로컬 보정했으나 repo 코드에는 아직 남아 있다. 학생 공개 적용과 최종 승인/보완 처리는 운영자가 운영툴에서 수행한다.
- Next action: 운영툴에서 38개 AI 초안을 확인하고 `초안 적용` 후 승인 또는 보완요청을 결정한다. 별도 사용자 전달물은 없다.

