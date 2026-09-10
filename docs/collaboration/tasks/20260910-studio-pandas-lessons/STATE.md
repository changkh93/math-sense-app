# pandas classroom compatibility
- Phase: DONE (local; not deployed), 2026-09-10. Codex sole local writer; no external relay.
- Goal: support the supplied csv/weather lesson and quizzes 1–5 while preserving Tk flash-card CSV persistence and existing studio behavior.
- Baseline: 3d22f7c plus prior turn's uncommitted tkinter/CSV/completion implementation (preserve it).
- Scope: pandas compatibility module, completions, lesson fixtures, unit/browser verification and documentation. No deployment or server data changes.
- Acceptance: numeric CSV inference; DataFrame(dict-of-lists), Series/index/attributes; comparisons and filtered rows retain indices; aggregates; default to_dict; readable bounded prints; CSV persists/reloads; previous flash-card tests pass.
- Next: no implementation work pending. User action: none. Not committed or deployed.


## Implemented
- Expanded studio_pandas.py to classroom-subset-2: column-oriented/list-of-records DataFrame, Series selection and original row indices, scalar comparisons and boolean masks, mean/max/min/sum, to_list/to_dict orientations, numeric CSV inference with dtype=str escape hatch, readable bounded Korean tables, default indexed to_csv through existing local persistence.
- Invalid column lengths, unknown columns, mismatched masks, string means, unsupported options and out-of-project writes fail explicitly. Existing record-list flash-card behavior remains.
- Completion catalog and analyzer recognize Series/filtered tables, imported CSV header names including Korean, dict-based columns and changed CSV files; no column suggestions inside filter-value strings. CSV schema inference is bounded and never executes student code.
- Added public/python-game-examples/pandas main.py, quizzes.py, weather.csv and weather_data.csv. Restored indentation, commented lesson headings and used explicit print for script output; runtime does not rewrite student source.
- Added docs/python-game-studio-pandas.md and updated current Tk/implementation documentation. Prior task's recorded v1 history remains intact.

## Verification
- Python pandas 9 tests PASS, including differential classroom result/to_dict/to_csv checks against installed real pandas 2.2.2.
- Existing Tk/CSV unit tests 6 PASS, completion 9 PASS, project/console policy 13 PASS.
- Chrome qa-python-game-pandas PASS: actual folder picker, original csv/weather operations, class/Series outputs, averages/max/tied rows, exact quiz results (홍길동=90, Seoul/Busan), indexed CSV bytes, same interpreter reuse, CSV survives page refresh and rereads numbers (population sum=16243500), actual Korean header/method completion and signature help. No host page errors.
- Chrome qa-python-game-tkinter PASS: original lesson/timer cancellation, local learning CSV, refresh, empty-deck completion, PNG/button/keyboard, narrow viewport, Stop cleanup and callback traceback. QA output redirected into this task to preserve earlier screenshots.
- Viewed verification/quiz-output.png and column-completion.png: readable table and Korean header popup.
- Scoped ESLint PASS. Production build PASS (existing large-chunk warning); git diff --check PASS.
- Tested Chrome desktop; not Safari/Firefox or physical tablets. Full pandas, Excel, plotting, index/dtype edge cases outside documented subset and notebook implicit display are not implemented. Records are browser-local, not automatic Firebase uploads.
