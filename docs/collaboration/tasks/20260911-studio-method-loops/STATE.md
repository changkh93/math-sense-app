# Synchronous pygame method pause loops

- Phase: DONE (local; not deployed), 2026-09-11. Baseline 413489f; Codex sole writer, no external handoff.
- User: collision -> update/check_collision/pause_game freezes at while is_paused with frame watchdog error. Earlier attached original monster game has the same synchronous call chain.
- Scope: execution-copy compiler, bounded direct function/method call propagation, regression tests and actual browser pause/resume/stop. Preserve editor source and original error locations. Do not remove watchdog or blindly convert unrelated sprite update methods/callbacks.
- Preserve existing completion modifications, central INDEX and manual-feedback records. No deploy or student-data writes requested.
- Acceptance: unchanged synchronous source can wait for Enter/QUIT beyond watchdog, nested method calls await correctly, other sprite methods stay synchronous, warm stop/restart and original tracebacks work. Existing async code and ordinary Python lessons remain valid.

## Changes and evidence

- Root cause: BrowserGameLoops deliberately skipped synchronous FunctionDef/ClassDef, so only the module-level frame loop yielded. The user's collision path entered a synchronous pause_game loop and hit the 2-second watchdog.
- Added bounded, same-file direct-call analysis. Known local Game instances and self calls propagate the required await through update/check_collision/pause_game. Only reachable synchronous functions requiring frame yields are converted in the executable AST. Subclass methods, constructors, decorated functions, generators and function references used as callback values are excluded; unrelated Sprite.update remains synchronous. Existing async definitions preserve their own frame timing. Dynamic dispatch, imported helper files and arbitrary callback chains are not generally supported by this adaptation.
- Loop transformation now traverses calls within outer loops and handles nested waiting while loops; avoids adding an extra yield per event for nested for loops. A single-underscore generated helper prevents Python class name mangling. Watchdog remains enabled; source lines and the original editor project are unchanged.
- Python: synchronous compiler 9 behavior tests, turtle 5, Tk 6, pandas 9, math 3 pass; studio/console Node tests 13 pass. Build passes with existing chunk-size warning; diff whitespace check passes.
- Browser: synthetic matching method chain waits over 3 seconds at both initial and collision pause, real Enter resumes, QUIT during pause exits, Stop and warm print rerun work, same-named Sprite.update returns synchronously. Original simple pygame QA passes.
- Browser: user's earlier complete monster source runs without adding async/await. Test fixtures use bundled OGG assets (audio filename extensions changed) and OFL DoHyeon at the expected font filename. Initial pause and forced real collision/game-over survive >3 seconds; real Enter restores five lives; saved full source matches the input. An initial test assertion read CodeMirror's virtualized DOM instead of full source; switched to isolated test IndexedDB snapshot and reran successfully. Screenshots and original-lesson.json retained in verification.
- Latest 04.py itself was requested but not supplied; same stack structure is reproduced in the synthetic fixture and the user's earlier full source. No production deployment, no real student data changes. The earlier completion fix remains alongside this change, uncommitted.
- Next: local fix verified. msense.me still needs a web deployment for this revision to take effect.

- Follow-up screenshot supplied the actual pause_game body (QUIT-only, no Enter branch). Reproduced that body in the compiler with a delayed event: loop cooperatively yields, QUIT exits and running becomes False. No runtime change needed beyond the implemented fix; this snippet intentionally has no resume-on-Enter behavior. Full 04.py remains unavailable.
