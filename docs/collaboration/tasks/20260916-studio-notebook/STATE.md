# Code Studio notebook mode
- DONE (local; not deployed) 2026-09-16. User requests seamless file/notebook editors, stateful cell execution, full current studio library coverage (ColabTurtlePlus, CSV, pandas, Matplotlib, pygame, Tk, input).
- Baseline c84bd458; unrelated marketing/SEO/crew/functions/rules work preserved. Codex owns core/runtime/integration in current checkout; no concurrent code writer or external relay.
- Design: same .py source with recognized # %% cell markers; notebook code/Markdown cells, shared interpreter per project/file, execution counts, run-all/error stop/restart, per-cell output and safe image snapshots alongside live interactive canvas; .ipynb import/export, current assets and local IndexedDB storage reused.
- Verify actual WASM multi-cell variables/objects/functions, CSV/dataframes/NumPy/plots/turtle/Tk/pygame/input, mode switching/save/export/reload, file-mode regression and tablet layout. No student data writes. Deployment not requested for this new feature.


## Implemented
- File/notebook buttons share canonical `.py` source with actual Python-comment `# %%` delimiters (multiline-string safe), code and Markdown cells, add/move/delete, Shift+Enter, run-all with stop-on-error, execution counts, restart, bounded per-cell text/table/image outputs.
- Persistent isolated Python namespace/filesystem per project + selected file. Previous imports/functions/objects remain usable; cooperative loops/input work across cells. Last expressions and `display(value)` render data, with trailing semicolon suppression. Ordinary file execution retains clean-run semantics.
- Existing turtle/ColabTurtlePlus, CSV/pandas, NumPy/Matplotlib, Tk and pygame use the same compatibility/runtime pipeline. Figures/turtle snapshots appear below cells; interactive GUI stays in the common live preview. Renderer switching does not destroy Python objects.
- Local source and asset persistence retained, repeated runtime CSV writes use current project snapshots, saved editor mode and selected file restored. `.ipynb` import/export is explicitly source/Markdown only; imported outputs/HTML are discarded and JSON is never executed on import. Files use existing size caps; notebook import caps 20 MB/100 cells.
- Tablet notebook keeps its inert, invisible runner laid out while code is visible: `display:none` had paused animation-driven WASM initialization. Existing visible preview layout and enlargement retained.
- Prior-cell source feeds completion and signature context. Runtime output retention is bounded to five notebook keys/24 MB of images with per-cell log limits.

## Verification
- Actual Chrome + Pygbag/WASM `scripts/qa-python-game-notebook.mjs`: PASS variables, previous-cell function/input, turtle object continuation, csv.reader and pandas table/mean, NumPy/Matplotlib, error recovery/restart/run-all stop, Tk button changes/callback, pygame surface, mode switch, source persistence, download, 768px portrait.
- Actual Chrome `scripts/qa-python-game-notebook-workflow.mjs`: PASS 1024px cold notebook engine start, Colab code/Markdown import/export, repeated CSV writes and reload, Shift+Enter without source mutation, previous-cell object completion, add/move/delete, last-file restoration, ordinary file execution, infinite pygame stop.
- Existing responsive browser QA (output redirected under this task): PASS desktop/tablet/phone fit, rotation/enlargement, source stability, pygame mouse and tablet input. Mouse assertion now accounts for one CSS pixel rounded by SDL at small scales (rather than fixed two source pixels).
- New Python compiler tests: 5 PASS (including previous-cell object input method, prior pygame alias, semicolon/comment, error state). Notebook model checks PASS (boundaries, strings, edit offsets, Markdown/native notebook roundtrip, discard executable imported output).
- Existing regression suites PASS: studio 15, turtle 5 + sync 9, input 7 + protocol 2, math 3, pandas 9 (reference parity), Tk 6, completion 11. Targeted ESLint zero errors, existing deletedIds cleanup-ref warning. Production build passed; diff whitespace check passed.
- Screenshots and machine-readable results in `verification/`; tablet import screenshot visually inspected. Early debug captures retain evidence of issues corrected during testing, not outstanding failures.

## Limits / release
- No production deployment, commits/push or student-account data writes for this feature. Physical iPad/Safari not tested; Chrome viewport tests are distinct from device verification.
- Variables and outputs are session-only, not saved to disk or exported. `.ipynb` code/Markdown becomes `.py` cells inside the project; original unsupported metadata/widgets/attachments are not imported. Existing library compatibility scope remains unchanged; arbitrary Colab pip/remote services are not added.
- User guide: [USAGE.md](USAGE.md). Ready for release upon request; no external relay pending.

## 2026-09-16 inline notebook UI revision — DONE (local; not deployed)
- User requested full-width notebook cells with live graphics, input, stdout and errors below each cell, removing the duplicate right pane.
- Codex implementing locally; same interpreter DOM must persist while changing cells/modes. No external handoff or deployment.

- Notebook uses the full remaining width with one native scrollport. No separate right-side console or result tabs in notebook mode. Output/errors/interactive input are below the originating cell.
- Live turtle/pygame/Tk/plot surface occupies its cell slot. The iframe stays mounted in the same DOM parent across cells and editor modes; only its position changes. Offscreen surfaces are parked inside the viewport so animation-driven Python continues. Cell controls remain above the live surface during compositor scrolling.
- Runtime reports actual visual activity per run. Plain print/syntax-error cells do not inherit blank/stale canvases. Earlier turtle/plot/pygame outputs retain snapshots; the latest visual cell is interactive. Internal asyncio Task/Future return values are excluded from automatic result display.
- PASS actual Chrome/WASM `qa-python-game-notebook-inline.mjs`: full width, no duplicate console, inline turtle/input/Tk clicks, plain text and syntax errors without phantom pictures, prior snapshots, Task suppression, interpreter identity across cells/modes, 1024 landscape/768 portrait, enlarge/restore.
- PASS full notebook library regression after the UI change: variables/functions/input, turtle, csv/pandas, NumPy/Matplotlib, error recovery/reset, Tk and pygame. Screenshots `inline-desktop.png`, `inline-tablet-*.png` visually reviewed (synthetic fixtures only).
- Initial test attempts exposed offscreen execution and compositor click interception; these were fixed and the final actual mouse-click tests passed. An input fixture was corrected to wait for execution completion before editing (editing is intentionally locked while running).

- Final PASS: notebook workflow/import/export/save/reload/shortcuts; existing file-mode responsive suite (five viewport sizes, rotation, enlargement, resized output, pygame mouse coordinates, tablet input). Evidence in `verification/inline-file-regression/`.
- Final production build PASS (11.21s), scoped whitespace check PASS, targeted ESLint zero errors (existing cleanup-ref warning only). Compiler/model/input/turtle/math and studio console regressions passed. Actual Safari/iPad hardware remains untested; viewport QA used desktop Chrome.
- No production deployment or commit/push in this UI revision. Next: user review of local UI / release if requested.

## 2026-09-16 native notebook files revision — DONE (local; not deployed)
- User requested actual notebook.ipynb alongside main.py, lazy creation on notebook tab, notebook-mode new files, assignment submission and completeness review.
- Local integration in existing dirty checkout; preserve unrelated changes. No external packet or production data writes.
- Native nbformat4 source-only file kind, independent selection/editing, legacy cell copy on first switch, upload/folder/backup/export, and .py/.ipynb attachment support implemented. Verifying actual runtime, persistence and feedback source extraction next.

### Final native-file behavior and verification
- This revision supersedes the earlier shared-.py model and its import/export limitation above: notebooks are now independent native nbformat4 `.ipynb` files. First notebook-tab click creates a blank notebook only when none exists; legacy `# %%` work is copied, never deleted from the Python original. New projects still start with only main.py.
- Native cells retain their actual boundaries (including literal `# %%` inside code), code/Markdown, names, subfolders and independent edits. Per-file selection chooses the appropriate editor; mode toggles remember the most recent file of each kind. Cell structure changes clear obsolete output attribution.
- .ipynb works in upload/replacement, folder import (including notebook-only projects), backup import/export, individual download, rename/move/delete and local save/reload. Imported outputs and unsupported metadata remain intentionally omitted; source/Markdown only are submitted/exported.
- Assignment picker now offers .py/.ipynb immutable file snapshots. UTF-8 submission metadata recognizes notebooks. Both UI feedback enrichment and manual-review export read authored notebook cell source (no production reviews or student record mutations performed).
- Runtime dependency discovery parses notebook code cells independently, so unfinished other cells do not block NumPy/Matplotlib loading.
- PASS actual Chrome/WASM: qa-python-game-notebook.mjs, qa-python-game-notebook-inline.mjs, qa-python-game-notebook-workflow.mjs. Covers libraries, state/input/GUI, inline output, tablet layouts, imports, CSV persistence, keyboard shortcuts and file mode.
- PASS new qa-python-game-notebook-files.mjs: lazy creation, independent main.py, multiple notebooks/new-file default, remembered mode/file, reload, native download, full backup restore, notebook-only nested folder import, actual assignment picker with synthetic IndexedDB drafts and actual File JSON capture. No assignment sent. Evidence: verification/native-file-checks.json and native-notebook-files.png (visually reviewed).
- PASS 11 attachment/folder/native-file unit checks; existing studio suite 15; compiler/package tests 6; legacy cell-model test. Final build PASS 9.47s; scoped diff whitespace check PASS.
- Targeted studio ESLint: zero errors, existing cleanup-ref warning. assignmentFeedbackService.js still has five pre-existing lint errors (unused documentId/buildFeedbackWhitelistDto, duplicate focusScore, undefined quizMap twice); confirmed identical on HEAD. No unrelated feedback policy edits made.
- Manual export script syntax checked only; it was not run against production. Real assignment upload and physical Safari/iPad were not exercised. No commit/push/deploy for this feature. Updated USAGE.md.
- Next: review local implementation / release on request. No user action required for implementation completion.

## Production release — 2026-09-16
- User explicitly requested GitHub commit, push and production deployment.
- Source commit `791f9efa` pushed to `origin/main`. Built from detached clean worktree `/tmp/metasense-notebook-release-791f9ef`; unrelated checkout changes excluded.
- Release checks: 18 studio/native-notebook/attachment tests and 6 compiler/package tests passed; clean production build passed (11.36s).
- Firebase Hosting `math-sense-1f6a8` release completed. No Functions, database or rules deployment.
- `https://msense.me/python-game-studio` and release assets fetched successfully. SHA-256 matches clean build: `/assets/index-DJERmOR7.js` f13e2b79aee5afe5f43dde546d3d97a85aab091739f164a61e40779d16cb707b; `/assets/PythonGameStudioPage-BDNE7aol.js` 6331dd05900682c4a40c1239d3fb3120403e13d7dfc31d25c9a22a83842f887b.
- No authenticated production student actions performed. Prior actual Chrome/WASM checks cover runtime behavior; deployment verified by matching production bytes.
- Phase: DONE (Hosting deployed). Earlier local-only status entries are historical.
