# Learning save / completion stability
- ID: 20260908-learning-save-stability
- Original goal: 두 학생 제보(비 1장 4단원 완료 미표시 / 같은 크기-빌딩 모델 9페이지 진행 유실)의 원인을 조사하고 저장·완료 표시 안정화.
- Phase: ACTIVE, 2026-09-08 KST. Coordinator: Codex. Local core integrity work; external relay unnecessary for now.
- Acceptance: persisted completion reflected in chapter list; workbook hydrate cannot overwrite early input; failed local storage cannot block cloud save; exit flush/retry and visible status; meaningful regression tests; inspect reported records read-only and report recovery evidence without inventing answers/rewards.
- Baseline: 90c92a046f7f94b09e3c764da1e11341be1e4c52, current shared checkout. Existing uncommitted marketing docs/assets and collaboration index preserved.
- Owner/scope: Codex only writer for WorkbookPlayer, persistence utilities/tests, chapter completion read path, task record. No external packets. Scoped production recovery and additive index repair are recorded below.
- Findings: raw close bypasses pause save; localStorage exception aborts cloud scheduling; inputs render before async hydration; signature equality rejects changed page IDs; chapter list uses summary/history only.
- Checks: production evidence, historical recovery, deterministic loss reproduction, real Firestore emulator tests and browser checks completed; see latest section.
- Next: complete scoped index readiness verification; web/functions/rules release remains pending.

## Verified incident evidence and recovery (2026-09-08)
- User clarified that the student used **오늘은 여기까지**, not the X button. Do not attribute the incident solely to X-close.
- Report A: `ratios_ratio_chap1_unit4` has logRead=true, all transmission completions, workbookCompleted=true/workbookBestScore=100. History includes text completion and 24/24 workbook responses. Summary's text flag alone was false. Corrected only that unit's summary modalities.text from actual progress evidence in a transaction; reread confirms quiz/workbook/video/text all true. No reward/history/answers changed.
- Report B: `fractions_chap2_unit2` current session initially had zero answers, page index 0, matching current 10-page signature. Reward ledger proves completed grading of pages 1–8. Historical read at 2026-09-08T07:56:00Z recovered currentPageIndex=8, answers=59, checkedPages=0..7; savedAtMs=1788854122806. At 08:13Z a newer blank session existed. This proves stored progress regressed, but the original browser/cache/network cause is not proven.
- Recovery source: `/tmp/metasense-workbook-recovery-1788854160000.json` (mode 0600, raw private answers excluded from repository).
- Initial guarded recovery skipped because student resumed work (page 3, 2 answers). Asked the user to have the student close the workbook, then continued local work.
- User confirmed workbook closed. Fresh snapshot `/tmp/metasense-workbook-closed-current.json` has savedAtMs=1788856494447, 2 answers matching recovery exactly, same checked-element data and no extra attempts. Conditional transaction checked unchanged session timestamp, workbook signature, answer/grade subset, and attempts; restored original session with fresh savedAtMs and revision `recovered-20260908-building-page9-after-close`.
- Reread: **page 9 / 59 answers / 8 checked pages**, exact restored object equality. workbookPageRewardAttempts and workbookPageRewardTotal unchanged. No regrading, fabricated answers or additional rewards. User was told to refresh the app and reopen.
- Backups: `/tmp/metasense-workbook-before-recovery.json`, `/tmp/metasense-workbook-closed-current.json`, `/tmp/metasense-summary-before-recovery.json` (private temp files; not committed).

## Local stabilization
- WorkbookPlayer: server-confirmed hydration before editable UI; failed read stays behind retry gate; mere mount no longer writes or retimestamps a blank session. Prefer meaningful work over newer empty cache. Account-aware cache and keyed player lifecycle.
- Serialized save queue: local-storage failures cannot block cloud saving; explicit pause/X waits for acknowledged writes, pending writes drain during overlap and unmount; online/pagehide/visibility flush; visible status/retry. Transient pause error clears after successful retry.
- Firestore transaction compares session revision before writing. Empty sessions cannot replace real work. Replace only workbookSession map via mergeFields, avoiding stale nested answer/grade keys while preserving other modalities. Conflicting local edits are kept separately instead of silently overwriting another device on reopen.
- Completion drains draft writes before parent callback and uses captured queue/token to handle parent unmount. Conditional cleanup cannot delete another active draft or report committed completion as failed just because optional cleanup failed.
- SpaceHome: source completion documents for visible region units, in bounded document-ID chunks, supplement summary/history. User/scope-isolated listener state. Drafts/page rewards do not imply full completion. No score/reward/activity invention.
- Modified app paths: WorkbookPlayer.jsx/css, MissionHub.jsx (player key only), SpaceHome.jsx, learningSummaryUtils.js, new workbookPersistence.js. New test command test:workbook-persistence; existing summary parity test accommodates additional completion booleans.

## Validation and release status
- PASS: new queue and actual production effect/handler runtime tests (hydration, pristine mount, quota, failure/retry, current pause data, unmount, account switch, completion-parent-unmount, conflict guard, stale summary regression).
- PASS: test:learning-summary, test:mission-card-completion, test:video-progress, test:workbook-interactions, test:workbook-input-mode, test:quiz-session.
- PASS: production Vite build (existing bundle-size warning); targeted changed WorkbookPlayer/utilities/test ESLint and git diff --check.
- Broader touched-component lint still contains pre-existing MissionHub errors and SpaceHome hook warnings; compare against HEAD before reporting counts. Do not call whole-repo lint clean.
- Browser: actual WorkbookPlayer under React StrictMode in a localhost Vite harness with synthetic Firebase transport only. Verified loading gate, restored page 2, keypad answer entry, 오늘은 여기까지 close after save, reopen same page+answer, failed save keeps UI/answer and displays local-only status/retry, connection recovery retry. Temporary harness `/tmp/metasense-workbook-qa.mjs`; no production login/UI impersonation.
- Not verified: original student device/browser state, actual deployed build behavior, browser crash durability with both network and local storage unavailable. Opening a workbook now requires a successful server read; a changed workbook signature with existing work is held for safe recovery.
- Phase: ACTIVE — production record repair complete; local code verified; web release pending. No hosting/functions/rules deployment performed. No external packet needed for this core integrity work.
- Next action: release reviewed web changes, then verify students' chapter completion and workbook resume in the deployed app. Student need not redo recovered pages. No additional recovery approval is pending.

## Root-cause investigation and process repair (latest, 2026-09-08)
- User clarified the outcome is detailed cause investigation and process improvement, not only individual record repair. Implemented this second phase locally; no external relay.
- Detailed evidence, reproduced before/after failure paths, tradeoffs and release scope: [ROOT-CAUSE.md](ROOT-CAUSE.md).
- Confirmed production syncLearningSummary errors: missing COLLECTION_ASC index on history.unitId. Both live index API and function error logs agree. Existing configuration preserved only COLLECTION_GROUP indexes. Added COLLECTION ASC/DESC for unitId/chapterId/regionId, retaining all GROUP indexes; source config matches.
- Reproduced old source defects: pause-before-hydration closes after empty write; failed server read is misclassified as successful empty hydration; actual Firebase SDK empty-map merge erases answers while reward totals survive. Exact original browser branch remains unproven.
- Added atomic page checkpoint in existing reward transaction; UI applies committed counters. Added server rule denying meaningful session -> empty overwrite and allowing valid completion cleanup.
- Replaced blind summary delta processing with source-version/event receipts and transactional rebuild, handling duplicate, delayed, reordered events and rebuild races. Enabled safe retries; explicit reconciliation no longer trusts history count/timestamp alone.
- Validation PASS: old-loss reproduction, persistence/runtime suite, summary suite, page interaction/input suites; real Firestore emulator atomicity/retry/ordering/rules tests; local browser grading -> pause -> reopen retains answer and grade; frontend build.
- Lint: changed workbook/util and new server/test files pass with suitable Node/ESM settings. functions/index.js has 15 existing CommonJS-environment errors, 0 newly introduced diagnostics; repository browser-only lint configuration is not suitable for that server file.
- Release state: ACTIVE (release pending). Additive production index repair performed; new web/functions/rules code remains undeployed. Other pending repository releases make a full web/rules deployment broader than this change alone.
- Production index verification: all six added COLLECTION indexes READY; after propagation, the previously failing unitId query succeeded at 2026-09-08T09:13:41.512Z (18:13 KST), returning 8 existing history records. No synthetic production history was written to provoke the trigger.

## 성하린 퀴즈 복구 위치 제보 (2026-09-08, latest)
- Request: ‘03 유리수와 순환소수’에서 16/20 복구 안내와 2/20 화면 불일치 확인. Same learning-integrity goal; no external relay and no new production writes.
- Source evidence: point-in-time reads at 17:30/17:35 KST match screenshot: answers=16, currentIdx=1, originalTotal=20, sessionCrystals=31, retryCount=3. All 16 answers include reactionId; missing questions 10/14/17/19. Current completion at 17:43:52.897 KST: 16 correct /20, score80, quizCompleted=true; draft cleared normally.
- Root cause: positional cursor restored against full question list without saved round IDs or reconciliation against already completed answers. Valid-range stale index opens answered question; old reaction-based lock only protects answers awaiting reaction. See ROOT-CAUSE.md appendix.
- Fix: round IDs persisted across checkpoints/transitions/focus snapshots; restore excludes completed answers and retains pending graded feedback; original answer maps/counters preserved; current-round location and full-set answer counts labeled separately.
- Files owned this phase: SpaceQuizView.jsx, quizSessionGuards.js, test-quiz-session-guards.mjs, this task record/index. Preserved already staged changes from prior work and all marketing edits; did not alter staging.
- Tests: quiz-session suite PASS including actual initializer execution for synthetic 16-answer/31-crystal incident; frontend build PASS. No production UI impersonation or data rollback. Code release pending with previous stability changes.
- Private evidence only in /tmp/metasense-harin-*.json, mode0600. No raw answers in repository fixtures.
