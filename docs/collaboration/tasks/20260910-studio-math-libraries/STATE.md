# Python math course support
- Phase: DONE (local; not deployed); updated 2026-09-10
- Goal: NumPy, Matplotlib, pandas array/index lessons, itertools and Fraction in the game studio.
- Owner: Codex, sole writer in existing checkout. No external packets required.
- Baseline: 3d22f7c plus existing uncommitted tkinter/pandas/course changes; preserve all.
- Acceptance: actual browser numerical results, chart rendering/show and implicit final rendering, warm rerun/cleanup, Korean text, pandas matrix/Series/index operations, autocomplete, relevant regressions and build.
- Investigation: pygame-web pinned cp312 index includes native NumPy 1.26.4 and Matplotlib 3.5.2 wheels; current runtime does not preload them. Actual WASM itertools/Fraction pass (20 permutations, 36 dice pairs, prime-sum probability 5/12).
- Next: none for local implementation. Deployment has not been performed; nothing required from user for completed work.
- Deployment: not requested for this change.

## Integrated changes
- Recognize NumPy/Matplotlib imports (including literal dynamic imports and helper files), preload pinned wheels/dependencies once per iframe. Genuine NumPy 1.26.4 / Matplotlib 3.5.2, stdlib itertools/Fraction.
- Agg image bridge, explicit show + implicit final figures, scrollable multiple figures, next-run/stop cleanup, rc/font/NumPy settings reset. Basic UTF-16-BE codec registration for stripped browser stdlib.
- Pinned Pillow ImagingCore ABI error reproduced. Genuine Agg RGBA pixels encoded to PNG via stdlib; chart rendering does not use broken Pillow save path.
- Built-in licensed Do Hyeon font, Nanum-name fallback, uploaded project fonts registered and registry restored after each run.
- pandas classroom subset v3 accepts NumPy arrays/scalars/matrices, tuple rows, Series dtype and loc/iloc scalar writes. Old ambiguous integer-on-string-index/chained assignment is not silently emulated; portable examples use loc/iloc.
- Completion signatures for math modules, NumPy arrays (including binary math and histogram unpacking), pyplot/Figure/Axes, Fraction and indexer hints.
- Four runnable math sample files and docs/python-game-studio-math.md.

## Verification actually performed
- Actual headless Google Chrome / dev app / opaque sandbox WASM: all four math samples passed. Arrays doubled correctly, random frequency totals 30, 24x2 slice assignment, DataFrame/Series label access, loc update; permutations 20 / dice 36 / probability 5/12.
- Two histogram/bar figures including implicit final show; three line/scatter/Axes/reciprocal figures including Korean labels, ticks, legend, boundaries and inf gap. PNG outputs under verification/ were visually inspected. Natural PNG sizes checked; the reciprocal curve does not connect across x=0.
- Same iframe identity retained; no additional wheel requests on warm Matplotlib rerun (8 total wheel requests observed). Plain print clears prior gallery. NumPy seterr/precision are reset on next run. Actual editor mean completion passed.
- Existing Chrome tkinter card/timer/CSV write/persistence/reload/keyboard/stop/error checks passed; screenshots under verification/tkinter/.
- Existing Chrome turtle house/race/movement/winner/stop, plain print and pygame switch/error checks passed; screenshots under verification/turtle/.
- 57 local checks pass: studio/console 13, pandas 9 (native pandas 2.2.2 parity), math 3 (NumPy/native pandas parity), tkinter 6, turtle 5 + compiler 4, completion 10, import/attachments 7.
- Scoped ESLint pass, git diff --check pass, production build pass. Existing audio inventory/license and chunk size warnings remain. Studio chunk now ~1.31 MB uncompressed / 504 KB gzip including built-in full Korean font.

## Remaining limits
- pandas remains the documented classroom subset; `.py` bare expressions do not get notebook HTML/display semantics. Use print and modern loc/iloc examples.
- Matplotlib is static Agg output; no desktop GUI, animation or interactive pan/zoom promise. Built-in Korean fallback is Do Hyeon, not identical to NanumBarunGothic.
- Default Korean rendering was verified in Chrome; a separate uploaded font family was not independently browser-tested in this task.
- Local implementation only. No production deployment, Firebase writes or external workers.
