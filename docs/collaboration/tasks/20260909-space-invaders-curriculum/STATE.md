# Space Invaders curriculum

- ID: 20260909-space-invaders-curriculum
- Phase: DONE
- Updated: 2026-09-10 (Asia/Seoul)
- Coordinator: Codex, current selected model. Sole code writer; external work was manually relayed by the user.
- Baseline: 9da58446475546b67435f0980174d75443d57682; initial checkout clean. Current math-sense-app checkout, no other writer or unrelated edits replaced. Changes remain uncommitted.

## Original goal and acceptance

Create Space Invaders under MetaSense Python > 게임 프로젝트. No video; Data Log, Code Trace, Field Test, Quiz Battle. Follow Udemy lectures 51–60 and their actual construction order, not finished-code method order. Students author and run exclusively in MetaSense 게임 스튜디오. Detailed Korean documents must specify edits, complete code, explanations, run points, visible outcomes, normal unfinished behavior, troubleshooting, temporary tests and restoration. Supply original replacement images/audio and a redistributable Korean font.

Acceptance: source order verified; all four activities registered; complete studio materials; scoped integration preserving other courses and drafts; document/code/assessment consistency and gameplay verified; production status tracked independently from external claims.

## Returned work and ownership

- Packet 01: NEEDS_REVISION. Structural, gameplay and educational failures recorded in 02-REVISION-BRIEF.md; 01-draft-reviewed.zip preserves the submission.
- Packet 02: reviewed, partially usable runtime only. Data Logs and assessments rejected: nonexistent font/audio paths, nonexistent variables, wrong signatures and edit anchors, double life decrement, incorrect lecture mapping. 02-draft-reviewed.zip, 02-edit-audit.json and 02-returned.md preserve evidence.
- Packet 02 phase: INTEGRATED (selected runtime foundation with local repairs; submitted curriculum replaced). No further relay required.
- Codex directly rebuilt the curriculum in content/space-invaders after two unsuccessful external drafts. No external API dispatch, automatic worker observation, or claim that the external report alone passed acceptance.
- Historical investigation/01 review is preserved in 02-review-state-before-integration.md and source/contract/audit files.

## Final implementation

- 10 Korean Data Logs generated from the same method-scoped changes as 31 cumulative checkpoints; 15 reproducible temporary experiments and a final comparison game.
- Actual source order from SOURCE-MAP.md retained: setup/class stubs; groups then Scout initialization; friendly bullets; Raider class; temporary fleet then enemy bullets; Mission state/dispatch/HUD/fleet; group direction/breach; cleanup then pause; reset then collisions then next round. Visible transcripts 52–60 were inspected; preview 51 was not watched in full. No transcript reproduction.
- Data Logs explain exact edits and include complete blocks, run/observe/normal/troubleshoot sections and restoration instructions. Quiz Battle instructions explicitly select 현재 유닛만 to avoid the default cumulative scope including other prior projects.
- 29 Code Trace exercises and 100 four-choice quizzes with one correct answer and explanations. Field Test and current-unit Quiz Battle share each unit's 10-question bank. Existing unit-scoped battle logic permits 10 questions (minimum 5).
- New graphics: original transparent Scout and Raider PNGs. Six original synthesized OGG effects. Unmodified Do Hyeon Korean font with OFL license and asset credits. Middle-dot missing glyph avoided. Bullets drawn in code. ASSETS.md records provenance.
- Game fixes: edge clamping, two/three shot limits, group cleanup, final score retained, simultaneous final kill/death retains game-over, state guards halt later phase updates, next-round cleanup and bonus, one Enter restarts a new game. Raider instances share loaded image/sound to avoid 55 repeated asset loads per wave.
- Studio 내 프로젝트 has 우주 방어대 수업 준비 (new empty main.py plus all assets), and 단계 비교·수업 자료 (separate checkpoint/experiment/final projects, preserving previous drafts). Full course ZIP and starter/final backups available.
- Starter: 11 files / 2,490,198 decoded bytes. Final: 11 files / 2,500,444 bytes; both fit the 6 MiB project policy.
- Rebuild, packaging, scoped registration and verification instructions: content/space-invaders/README.md. Packaging automatically refreshes ZIP.

## Registration and deployment

- Registered chapter chap_gameproj_space_invaders_v1 under reg_python_game_project, order 4. Existing three chapters retained.
- 140 managed documents: 1 chapter, 10 units, 29 codeExercises, 100 quizzes. All content fields and curriculum hash independently read back. content/space-invaders/registration-result.json is the final evidence. No student progress or reward records written by the registration script.
- Scope guard refuses to overwrite documents without this curriculum's managedBy marker. No changes to course privacy/access rules.
- Initial whole-build Hosting deploy was rejected by automatic approval review for unconfirmed production blast radius. The whole current web build scope was explained; user explicitly replied 네. Subsequent authorized Firebase Hosting deployment succeeded, including the final document/ZIP refresh. Functions and security rules were not deployed.
- Live URLs: https://msense.me/python-game-studio and https://msense.me/space-invaders/space-invaders-course.zip .
- 70 production downloads (all 10 documents, 32 code snapshots, 15 experiments, 9 assets, catalog and 3 bundles) return HTTP 200 and match local SHA-256. See 03-production-assets.json. Deployment log preserved as 03-hosting-deploy.log.

## Verification actually performed

- Independent replay of all 31 before/after edit sequences equals the saved checkpoints; every changed block appears verbatim in the corresponding Data Log. All source syntax and literal asset paths verified.
- Real local Pygame dummy display/audio: 32 scripts execute setup/update/draw/QUIT; actual loop event tests cover paused Space, one-Enter reset and QUIT. 03-curriculum-results.txt.
- Original independent 7 gameplay acceptance methods all pass; 03-gameplay-results.txt. Checks cover final score, simultaneous last kill/death, edges, per-enemy scoring, new-wave cleanup/bonus, shot limits and breach phase guards.
- Studio regression suite 12/12; scoped ESLint no errors, existing deletedIds cleanup warning only; production build passed with existing chunk-size warning; git diff --check clean.
- Actual authenticated course UI: new chapter and all ten units listed; four cards shown with no Transmission card. Data Log 02 visually inspected with readable Korean/code blocks/run checkpoints/links. Code Trace shows correct 3 exercises for unit02; Field Test entry and Quiz Battle current-unit scope visible. No answer/reward claims or challenges sent during QA.
- Actual browser runtime: original asset QA loaded all assets, rendered Korean and both sprites, invoked all six Sound.play effects. Local simultaneous final kill/death experiment displays score100/lives0/game-over and Enter resets to a new fleet, score0. Browser key was delivered directly to the iframe canvas for reliable focus.
- Production studio: empty starter loads all 9 assets plus credits, complete 31-step/15-experiment menu and downloads render, final comparison loads and executes; Korean round/score/lives HUD, new sprites, 55-enemy fleet and Enter start/Space shot visually verified.

## Limits and next action

- Live two-human matchmaking/battle and actual speaker listening were not tested. Battle registration/UI/range and question structures were checked; no fabricated live outcome.
- No novice classroom trial was performed. Automated checks do not establish pedagogical effectiveness.
- No pending user approval or external packet. Next action: user can teach from Data Log 01 in the registered course and open 게임 스튜디오 → 내 프로젝트 → 우주 방어대 수업 준비.

## Follow-up: direct code-link Korean encoding (2026-09-10)

- User reported mojibake at localhost:5173/space-invaders/checkpoints/02-A.py. File bytes are UTF-8; the actual local HTTP Content-Type was empty. Chrome's existing page showed Latin-1-like decoding of 우주 방어대.
- Production same URL at msense.me returns text/x-python; charset=utf-8 with unchanged UTF-8 bytes. The demonstrated missing-charset cause is specific to local Vite, not the checked production response.
- Added scripts/vite-curriculum-text.mjs to Vite dev and preview. Only the curriculum's flat/checkpoints/experiments .py paths are served as text/plain; charset=utf-8; source bytes and other asset types are preserved. Filename matching excludes traversal. Existing Vite server restarted automatically.
- Actual local HTTP verified four representative sources (02-A, final, experiment10-E, credits): 200, explicit UTF-8, exact original text. PNG keeps image/png. Syntax and git diff whitespace checks passed. No runtime/game/content changes and no production deployment required for this local response fix.
- Browser automation reads the old mojibake tab, but navigation/reload to .py URLs on both production and local was blocked by the browser client (ERR_BLOCKED_BY_CLIENT). Therefore no post-fix visual-browser success is claimed from that tool. HTTP correctness is verified; raw .py navigation behavior across every browser is not established. A dedicated UTF-8 HTML source viewer is an optional more consistent student experience if direct file opening remains inconvenient.


## Follow-up: scrollable source modal (2026-09-10)

- User requested opening the source in a scrolling modal. Implemented SourceCodeModal in the shared MissionMarkdownViewer, scoped to same-origin Space Invaders .py links; existing Markdown and stored course documents remain unchanged.
- Captures clicks before the inline formatting helper stops propagation. The existing link now opens a native modal dialog without direct .py navigation or a new tab. Source is explicitly decoded as UTF-8 and safely rendered as text, with preserved whitespace, independent horizontal/vertical scroll, copy, UTF-8 Blob download, loading/error/retry states, AbortController cleanup and object-URL cleanup.
- Dialog uses native focus containment, Escape/backdrop/close, and restores focus without scrolling the original document. Portal supports body/fullscreen containers. Responsive sizing and small-screen CSS included.
- Actual localhost Chrome: 03-A source shows Korean, copy reports success; code scroll reaches 2482px of a 3088px document in a 606px viewport; background Data Log stays at scrollTop2026 before and after closing, focus returns to the same code link. No separate tab navigation. Download link renders with the correct .py filename; actual downloaded-file handling was not exercised.
- Scoped ESLint and whitespace checks pass. Production build passes with existing chunk-size warning. Authorized Hosting-only deployment succeeds; 04-modal-hosting-deploy.log preserves evidence. No DB, rewards, functions, or rules writes.
- Deployed MissionMarkdownViewer JS and CSS match local build SHA-256. Actual authenticated production Chrome at msense.me: Python > 게임 프로젝트 > 우주 방어대 > 02 > Data Log > 02-A opens the modal in the same page, shows pygame.display.set_caption('우주 방어대') correctly, and exposes copy/download/close controls. This replaces the previously limited raw-file browser verification with a successful in-app source display.
- No remaining task blocker. On already-open production pages, refresh once to load the new frontend.
