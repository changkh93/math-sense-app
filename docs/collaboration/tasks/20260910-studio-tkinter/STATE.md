# tkinter flash-card lesson
- Phase: ACTIVE; updated 2026-09-10
- Goal: run the user's Tk/Canvas/PhotoImage/Button/grid/after flash-card lesson, with CSV data and persistent learning progress.
- Baseline: 3d22f7c; clean checkout. Codex sole writer, current workspace; no external relay.
- Scope: isolated runner compatibility modules, CSV project policy/local synchronization, editor completions, example and tests. No server upload/deployment.
- Acceptance: actual browser images, Korean text, timer cancel/repeat and buttons; CSV fallback/read/write and reload; stop/rerun cleanup; error reporting; pygame/turtle regression; unsupported APIs explicit.
- Dependency finding: pinned pygame-web index-090-cp312.json contains no pandas. Provide explicitly scoped pandas-compatible CSV/DataFrame subset, not a claim of full pandas.
- Next: implement then unit/browser verification. User action: none.

## Completion (2026-09-10)
- Phase: DONE (local; not deployed). Codex implemented directly; no external work packets.
- Added scoped tkinter module and DOM/SVG renderer in the unchanged opaque iframe; Tk/Canvas/PhotoImage/Button/grid/after/cancel/mainloop/cleanup and callback tracebacks.
- Added explicit `studio-csv-subset-1` pandas-compatible module. Strings-only UTF-8 CSV, DataFrame records, to_dict(records), to_csv; unsupported APIs/options remain unsupported. Browser Python lacks utf-8-sig codec: verified failure, repaired with explicit BOM handling.
- CSV upload/folder import/preview/download; bounded FILE_WRITE messages with session/run/project and prior-content conflict guards; normal IndexedDB autosave. No Firebase changes, no automatic write to original computer folder, .py-only assignment attachment unchanged.
- Added Tk/pandas signatures and project CSV/PNG completion; restored user lesson plus optional last-word guard/CSV headers in public/python-game-examples/tkinter/main.py and four simple authored PNG fixtures.
- Browser verification discovered clipped grid-intrinsic sizing; repaired with flex centering and verified bounding boxes after resize. Space key handling now preserves native Tk button activation.

## Verification
- Python tkinter/CSV: 6 tests; turtle 5 + loop compiler 4; completion 8; project/console policy 13; folder/assignment attachment 7. All pass.
- Chrome qa-python-game-tkinter.mjs PASS: supplied lesson API (without optional last-word guard), real PNG/card/text positions, Korean flip after 3 seconds, cancelled timer not firing at old deadline, image click, CSV records saved to IndexedDB, warm rerun clears timers/UI, completed deck retains headers and reloads correctly, callback traceback points to main.py line 4, real folder picker imports all 6 files including CSV, Space key activation, 1000x800 layout fits, explicit Stop cancels pending callback. No host page errors.
- Chrome qa-python-game-turtle.mjs PASS: house, animated race/winner, normal final drawing, Stop/restart, turtle → print → pygame → turtle error with one interpreter.
- Screenshots inspected: verification/card-back.png, complete.png, narrow.png; regression race images copied here. Previous task's tracked screenshots restored after QA generated new images.
- Production build PASS (9.38 sec); existing chunk-size/audio-manifest diagnostics remain. Scoped eslint: 0 errors, 1 pre-existing deletedIds.current effect-cleanup warning in PythonGameStudio.jsx. git diff --check passes.
- Documentation: docs/python-game-studio-tkinter.md describes exact API and storage semantics.
- Limitations: not full Tcl/Tk or pandas; mainloop belongs at end; one window; PNG only for PhotoImage; no widget bindings/ttk/dialogs; only to_csv writes sync, CSV max200KB; Safari/Firefox/physical tablets not tested.
- Next: no implementation work pending. Not committed or deployed. No user action required for local implementation.
