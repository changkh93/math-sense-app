# Code Studio interactive input

- Phase: DONE (local; not deployed), 2026-09-11. Coordinator: Codex; local implementation, no external handoff.
- Goal: Run normal student input(), int(input()), repeated questions without editing their Python; console input with Enter, responsive stop/re-run.
- Baseline: 413489f plus existing method-loop/compiler and completion fixes. Preserved those changes and unrelated manual feedback records.
- Scope/owner: Codex in current workspace; runner input protocol/compiler, preview bridge, console form, completion help, runtime/browser regression tests. No other code writer dispatched.

## Implementation

- Session/run/request-bound MessagePort input response, one submission per question; input never enters executable command text. Preserve Korean, emoji, empty answers, whitespace via UTF-8/base64 prompt and ASCII-escaped JSON response at the WASM bridge.
- Cooperative async input waiting, cancellation cleanup, serialized concurrent requests; interpreter retained across stop/re-run.
- Executable-copy AST adapts builtin input calls at module level, ordinary loops, existing async functions, and eligible directly called same-file functions/method chains. Student editor/saved source unchanged; input returns str and int(input()) reports ordinary ValueError for invalid numbers at the student source line.
- Scope/shadowing checks preserve locally redefined input and parameter names. As with existing loop adaptation, dynamic/imported helper calls, callbacks, generators/comprehensions, nested definitions and inherited/decorated methods are outside this bounded transformation. Unadapted builtin input reports a Korean unsupported-context error instead of returning an unawaited coroutine. No claim of arbitrary Python suspension or full terminal stdin support.
- Console form autofocus, Enter/button, IME Enter guard, automatic scroll, input-waiting status, 8192-character answer limit. Input form clears on stop, project switch, errors, completion and engine recovery. Mobile width and fullscreen input visibility handled.
- Completion help now explains console input/string result/numeric conversion.

## Verified

- `npm run test:python-game-input`: 7 Python behavioral checks + 2 JavaScript protocol tests PASS. Unicode and empty answer serialization; wrong session/run/request, duplicate/oversized input rejection; callable chains, shadowing, errors, cancellation, concurrent async serialization.
- Actual Chrome/WASM `scripts/qa-python-game-input.mjs`: PASS. Screenshot-style Colab import + int(input()) mood branch; Korean/empty/whitespace and successive questions; functions/methods; invalid int ValueError (no coroutine warning); >3 seconds waiting; stop/replacement/re-run with warm interpreter; source unchanged; turtle reaches x=80 after input; mobile Korean/emoji answer; synthetic IME composing Enter guard.
- `scripts/qa-python-game-method-loops.mjs`: PASS actual pygame initial/collision waits, Enter, QUIT, stop/re-run, unchanged source and synchronous sprite update.
- Regression checks: pygame compiler 9, turtle 5, tkinter 6, studio/console 13, completion 11 PASS.
- Targeted ESLint: no errors; existing deletedIds cleanup-ref warning remains. Final `npm run build` and `git diff --check` PASS; existing chunk-size warnings.
- Evidence: verification/waiting.png, completed.png, mobile-input.png, checks.json. Actual WASM QA caught a Latin-1/UTF-8 prompt bridge mismatch during development; fixed and rerun successfully. Physical Korean IME/mobile keyboard not tested; simulated composition/browser viewport verified.

## Next

Implementation and local verification complete. No user input required. Production msense.me remains undeployed; no server/student data writes performed.

## Follow-up: user screenshot after release

- Read-only live check on 2026-09-11: msense.me/python-game-studio references index-GxeVL_EC.js and PythonGameStudioPage-DwCwsldI.js. The live studio bundle is byte-for-byte identical to the locally tested dist bundle and includes studioBeginInput, INPUT_REQUEST, input_calls, and pgs-input-form. Deployment occurred outside this turn; Codex did not deploy it. Earlier "not deployed" status is superseded for this studio bundle.
- Screenshot's exact `!pip install ColabTurtlePlus` directive + Colab import + int(input()) + five sequential inputs also passed executable-copy compiler behavior check.
- Likely stale already-open browser tab/iframe, since it still shows the pre-fix coroutine TypeError. This is an inference; user's tab version was not directly inspected. Recommended reload and rerun without clearing browser site data or changing student code.
