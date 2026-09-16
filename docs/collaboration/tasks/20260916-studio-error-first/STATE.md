# Show Python errors before coaching
- Goal: file and notebook modes display the raw execution error expanded before local hints and optional AI help.
- Coordinator: Codex; small coupled UI change completed locally, no external handoff.
- Baseline: ce2708b1. Preserve unrelated existing dirty changes and already-deployed Hosting baseline.
- Implementation: shared OutputLogs uses a permanently visible labelled error section; file/each notebook cell render output before ErrorCoach. File console scrolls to the newest error rather than below it to the end of the hints. Normal stdout follows the existing streaming behavior.
- Verification: existing real Chrome/WASM error-coach suite passed, including file/notebook raw traceback ordering, default visibility, file initial scroll, successful rerun, local hints, stale code, tablet and synthetic AI stages. No paid API calls. Targeted ESLint, whitespace checks and production build passed. Initial-view screenshots captured separately before clicking hints.
- Status: DONE. Source f8e1d291 committed/pushed; Hosting deployed. msense.me references the new entry and its studio bundle matches local dist, including expanded error section and runtime traceback fix (production.json). Backend AI configuration/functions unchanged.

## Related traceback correction
Visual inspection found notebook runtime errors still showing saved ipynb JSON rather than executed Python. Runtime now remembers each notebook code object's source (weak references) and restores traceback frame lines, including nested functions retained from earlier cells and chained exceptions. Saved notebook JSON is never rewritten. Syntax-error handling remains unchanged. Notebook compiler tests: 8 passed, sync-loop tests: 9 passed. Real WASM regression rerun passed with a runtime assertion for t.forward(100) and absence of JSON metadata. Updated notebook screenshot shows this correction; file screenshot is the initial pre-hint view.
