# Workbook completion report inspection
- Goal: 사용자 제보 학생의 분수 나눗셈 workbook 완료 체크 누락 확인.
- Phase: DONE (local follow-up fix), 2026-09-07.
- Owner: Codex, local. No external handoff.
- Baseline: 3efce3ff38c7edf3e8757c13db021892e0eae569; clean working tree at start.
- Scope: supplied student's learning_progress, workbook history, matching units catalog and learningSummaries. No production writes, rewards, regrading or feedback.
- Unit: fractions_chap4_unit5 / 5. 분수의 나눗셈.
- Evidence: all 18 pages have persisted grading/reward attempts; final history has 59 responses, 58 correct, score 98; workbookCompleted=true and workbookBestScore=98. Final timestamp 1788687851417 ms. Page rewards 89 already recorded; no additional payment needed.
- Summary: current schema 3, matching unit modalities.workbook=true and bestWorkbookScore=98; updated timestamp 1788775568967 ms.
- UI trace: SpaceHome derives workbook score rows from mergeSummaryWithRecentHistory; MissionHub checks presence of unitId_workbook score. Current stored summary produces a workbook 98 row with the actual utility. No code-level failure reproduced with current data.
- Interpretation: student did finish and final-save. Screenshot mismatch may be stale client data / timing of summary synchronization; original browser cache and network state cannot be determined from screenshot. Do not claim cause proven or data repaired.
- Outcome: reassure student, no need to redo. Re-enter unit / refresh to fetch current completed state. If still missing, inspect that browser's live state and served app version.
- Checks: scoped Firebase reads and current source data mapping. No full build/tests required because application source was not changed. Temporary read script removed; raw student records kept out of repository.
- User action: refresh/re-enter if old screen remains. No other dependency for requested inspection.

## Follow-up: completion logic audit
- User requested detailed examination of display logic; investigate and fix the reproduced failure locally.
- Reproduced flaw: MissionHub already subscribes to the current progress document but derives workbook/quiz checks solely from summary/recent-history bestScores. An omitted summary entry + yesterday's completion gives an unchecked card despite workbookCompleted=true. Today's-only fallback and 24h revalidation TTL extend exposure. Original student's browser failure remains unproven.
- Fix: derive workbook/quiz badge and displayed best score from both sources; scope progress snapshots to user+unit, do not consider draft sessions or page rewards completed, preserve zero score and avoid fabricated score for completion-only records. No new queries or server writes.
- Verification: scripts/test-mission-card-completion.mjs reproduces stale-summary/yesterday+TTL conditions and tests corrected result, user/unit identity exclusion, missing document, partial session/page rewards exclusion, 0-point completion, missing score, max score merge and quiz/workbook separation. npm run test:learning-summary and npm run test:video-progress passed. New utility ESLint and git diff --check passed. npm run build passed (existing bundle-size warning).
- UI integration: existing onSnapshot callback feeds a user/unit-scoped completion snapshot; workbook and FIELD TEST use the merged resolver for both checkmarks and best-score text. No extra reads or production data changes.
- Scope/limits: fixes current unit dashboard cards; parent chapter aggregates still depend on summary synchronization. Original student's exact stale client state and UI after production deployment remain unverified. This turn verified behavior tests + build, not a live student browser.
- Next: web deployment required to deliver this fix; no student needs to redo or resave completed work.
