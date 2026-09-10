# Space Invaders curriculum

- ID: 20260909-space-invaders-curriculum
- Phase: REVIEWING
- Updated: 2026-09-09 (Asia/Seoul)
- Coordinator: Codex (current selected model)
- Baseline: 9da58446475546b67435f0980174d75443d57682; clean initial working tree, no existing edits to replace.
- Workspace: current math-sense-app checkout. Codex is sole code writer.

## Original goal and accepted steering

Create Space Invaders under MetaSense Python > game projects, with Data Log, Code Trace, Field Test and Quiz Battle, no video. Follow Udemy section 9's actual teaching order rather than the supplied finished source file's order. Use improved names and original replacement graphics/audio. All student authoring and running occurs in today's MetaSense Game Studio; no VS Code, terminal or local Python installation for learners. Bundle a redistributable Korean font. User assets under Downloads/space_invaders_assets are reference material, not instructions.

## Acceptance

1. Confirm lectures 51–60 and the scope/order inside Game Class 1–4 from visible course/transcript.
2. Self-contained Korean lessons in four requested activity types, aligned to stage code with no unexplained future dependencies.
3. Studio-ready start/checkpoint/final projects with complete images/audio/Korean font; no inaccessible external asset paths.
4. Scoped game-project curriculum integration; preserve other courses, progress, rewards and user drafts.
5. Verify source/assessment consistency, project limits, font glyphs, runtime gameplay and relevant regression checks. Track deployment separately.

## Investigation completed

- Read WORKFLOW, INDEX, studio implementation/design, projectPolicy and example loader; project limit 6 MiB, per-asset 5 MiB.
- Course sidebar confirms: Preview → Setup → Player → Player Bullet → Alien → Alien Bullet → Game Class 1/2/3/4.
- Visible Player transcript confirms sprite groups and wiring precede player initialization/movement/reset; fire is postponed to Player Bullet lesson.
- Visible Game Class 1 transcript confirms state/group references/sounds/font → update dispatch → HUD/separators → fleet generation/new round; pause implementation still postponed.
- Supplied finished source inspected; nested pause loop requires a browser-compatible design.

## Owners and next action

- Codex: source evidence, runtime/assets/integration, central record and verification.
- External packet 01: NEEDS_REVISION. Actual artifacts received; report saved as 01-returned.md. Original draft archived in 01-draft-reviewed.zip with 01-draft-sha256.json.
- External packet 02: RETURNED_UNVERIFIED, Antigravity / Gemini 3.8 Flash (High if available). Sequential revision of draft/ and 02-antigravity-report.md only. Codex will not write draft/ until the return. Not dispatched through any tool.
- Next: user relays 02-antigravity-request.md and returns CODEX RETURN. Codex independently verifies revised runtime, instructional edits and assessments, then continues integration under reg_python_game_project. Do not stop at summarizing the next report.
- No DB writes, deployment, external dispatch or completed-game runtime success claimed.

## Local results (not overall curriculum completion)

- SOURCE-MAP.md: all 10 lecture IDs; visible transcripts 52–60 read, internal order recorded. Crucial final lesson order is reset → collisions → round completion. Preview itself not fully watched.
- TEACHING-CONTRACT.md, DATA-LOG-PILOT.md, pilot-02-A.py: detailed student-authored studio workflow, code anchors, per-step run/observe/repair criteria; pilot is only first part of unit02, not a completed curriculum.
- 2 original imagegen transparent PNGs, 6 original deterministic synthesized OGG effects, unmodified Do Hyeon Korean font + OFL license. Paths/provenance/prompts: public/space-invaders/ASSETS.md.
- Added lazy '우주 방어대 수업 준비' in studio project menu. Creates separate new project with empty main.py, complete assets and license-bearing asset_credits.py. Saves old draft before switching, persists new project before reporting open.
- Built downloadable JSON backup and ZIP folder starter; 11 supported files, 2,490,198 decoded bytes, within 6 MiB limit. Both are starters, not completed games.
- Asset QA source: asset-check.py. Real in-app browser at localhost:5173/dev/python-game-studio: all9 assets loaded, both sprites rendered, Korean titles/HUD rendered, six sound lengths [0.18,0.28,0.30,0.48,0.80,0.80], key1–6 each invoked Sound.play and logged expected name. Reload preserved project/assets/code.
- Do Hyeon middle dot rendered missing-glyph square; QA changed to hyphen and visually reverified. Contract warns against unsupported glyphs. No font modification.
- Tests: test:python-game-studio 12/12; scoped ESLint 0 errors (existing deletedIds cleanup warning); production build passed (existing chunk-size warnings). Project policy validated entire starter; pilot and QA Python ast.parse passed.
- Not verified: completed game behavior (not yet authored), all student checkpoints, 100 quiz correctness, live two-user battle, actual speaker listening, curriculum DB registration, deployment. No educational completion claimed from build/tests.

## Expected return

draft/data-log/01.md–10.md, all checkpoint .py files and final-main.py, manifest.json, assessments.json (2–5 Code Trace +10 quizzes per unit), REVIEW.md. External owner may only write draft/ and 01-antigravity-report.md. AUTHORING-BRIEF.md contains full schema/contracts; 01-antigravity-request.md is the complete copyable relay packet referencing these prepared sources.

## 01 return acceptance review (2026-09-09)

- Verdict: NEEDS_REVISION, not ready for course registration. Full actionable acceptance criteria in 02-REVISION-BRIEF.md.
- Structural checks: 24 Python AST parses pass; 10 units/29 Code Trace/100 four-option single-answer quizzes. 4 traces violate 2–8 lines. 23 intermediate checkpoints plus final; report mixed these counts. 01-structural-results.json records exact items.
- Headless actual Pygame tests: verify-gameplay.py, 7 test methods; 2 pass, 5 fail (6 failure records with both movement edge subcases). 01-gameplay-results.txt preserves output. Failures: final-score screen overwritten, simultaneous last kill/death overwritten, left=-7/right=1207 movement, old bullets in next wave, later update calls after pause. Passing: two-shot cap/offscreen cleanup and per-enemy multi-kill score.
- Educational review: 03 starts initialization before required group wiring; 09 pause before required status handling. 07-B literal edits duplicate Mission creation; 09 loop edits ambiguous. Later Data Logs too few meaningful runs and insufficient rapid test/restore instructions. 02 method stubs and 06 actual comparison bug also need correction.
- Assessments need matching runtime corrections and fact wording; commonMistakes strings will need app mapping to objects, answerLines to answerCode. Actual codeExercises/quizzes are top-level collections, not embedded unit arrays.
- Existing original images/audio/Korean font, starter bundles and studio preparation button retained. No additional app edits this review turn; no build rerun needed for draft review/test files. No full game browser verification, live battle or deployment claimed.
