# Code Studio error coach
- Phase: LIVE_CONNECTION_VERIFIED / PENDING_STUDENT_READINESS_AND_RELEASE; 2026-09-16 (latest status below)
- User: GPT-5.6 Luna only; cost-efficient, child-friendly Python error help, file and notebook mode. Existing OPENAI_API_KEY must NOT be used: latest user plans a new OpenAI project named msense and a newly issued key. Await secure registration of the new key before live calls.
- Baseline: 9838eaa7. Shared checkout has unrelated changes; preserve them. Codex implements locally; no external relay.
- Acceptance: no automatic AI calls; free deterministic guides; progressively disclosed short hints; explicit minimized-code preview; authenticated course access; one fixed model, bounded tokens/time, deduplication and transactional quotas; no student code/PII in logs or persistent caches; failure leaves free help usable; tests for both modes, API protocol and abuse/cost guards.
- Official sources checked: developers.openai.com/api/docs/models/gpt-5.6-luna, guides/structured-outputs, guides/your-data, guides/safety-checks/under-18-api-guidance. Model gpt-5.6-luna, Responses structured output supported. store:false is not a ZDR guarantee; approval required.
- Next: implement and verify. No deployment requested for this new feature yet.


## Implementation and verification — 2026-09-16
- Phase: ACTIVE / READY_FOR_NEW_KEY. Local implementation complete; paid connection and production enablement pending new msense project key. No existing key read or used; no remote configuration writes, commit, push or deploy for this feature.
- Server: `studioErrorCoach` v1 callable, authenticated active Python course/admin access, fixed `gpt-5.6-luna` Responses schema, store:false, 700 output tokens/20s upstream deadline, no tools/fallback/retry. OPENAI_API_KEY secret reference plus explicit new project ID header and disabled-by-default control document.
- Free local error families and staged hints in file console and notebook cells. AI only after both free hints, explicit minimized code preview and acknowledgement. Snapshot from failed run, stale-code guard, per-execution component identity; prior-cell ambiguous function context withheld from AI rather than attributing wrong source.
- Server transaction reserves per-user/day/month call limits and 30s cooldown; HMAC duplicate fingerprints prevent parallel/cold-instance repeat charges. Cache is bounded, memory-only. No raw code/error/model output is persisted or logged by this feature. Usage expiry field supplied; operational TTL not enabled yet.
- Default caps: 10/student/day, 300/service/day, 3000/service/month (UTC). Limits include failed/uncertain requests; only this endpoint is covered. Firestore/Functions overhead remains.
- New OpenAI project / child-data readiness check gates real calls. Store:false is not ZDR; see OPERATIONS.md for official sources, safe secret registration, configuration and release scope. User does not need to send secret in chat.
- PASS: `node --test functions/studioErrorCoach.test.cjs` — 9 tests covering auth/guest/access, new project gate, payload limits, exact API contract, transaction concurrency, cooldown/caps, cache/cold duplicate, no retry, private text minimization, ambiguous notebook frames.
- PASS: `scripts/qa-studio-error-coach.mjs` actual Chrome/WASM file NameError and notebook ZeroDivisionError, zero automatic API requests, privacy preview, stale-code guard, successful rerun, 768px tablet, one synthetic response for all hint stages. Screenshots and browser-checks.json saved in verification; file/tablet screenshots visually reviewed.
- PASS: existing `qa-python-game-notebook-inline.mjs` actual Chrome/WASM inline graphics/input/error/persistent interpreter/full-width/tablet regression; 4 native-notebook file tests, 6 Python notebook compiler/package tests.
- PASS: npm run build; targeted frontend ESLint zero errors (one pre-existing cleanup-ref warning); Node syntax checks; scoped diff whitespace checks. Build has existing large-chunk/audio-asset warnings. No broad unrelated cleanup.
- NOT VERIFIED: real Luna API availability/response quality for the new account, pedagogical outcomes, Firestore emulator concurrency, production deployment, physical iPad/Safari. The transaction tests use an atomic in-memory Firestore double. Live model test will use synthetic snippets after secure new-key registration.
- Next: user creates/selects OpenAI project msense, registers new key securely as OPENAI_API_KEY, supplies only project ID and readiness status. Confirm appropriate child-data handling for that project before student activation. No manual external relay needed.

## Credential handling update
- User pasted a newly issued API credential into chat. Do not reuse or reproduce it. It was not written to files, Secret Manager, commands, or API requests. Advised revocation and replacement via the private Firebase CLI secret prompt. Continue waiting for secure replacement registration and the non-secret project ID.

- Registration check: Firebase CLI metadata confirms OPENAI_API_KEY version 1 ENABLED. Secret value was not accessed; whether it is the newly rotated credential is not verified. gcloud creation-time metadata lookup could not refresh its login, so creation timestamp remains unverified. Await OpenAI project ID; no paid requests or enablement.

## Project binding and live connection check — 2026-09-16
- User provided OpenAI project ID `proj_S7uL2bHA4redF0r90zUcfxRe`; normalized the Markdown-escaped underscore. Stored only the non-secret ID in config.draft.json, with enabled:false and childDataReady:false. No production config changes.
- User reported secure key registration. Read registered Secret version 1 in process memory with Firebase SDK logging disabled (not the secrets:access CLI, which logs plaintext). Metadata: ENABLED, created 2026-09-16T10:07:41.041607Z. No key persisted, printed or added to request arguments.
- One synthetic NameError Responses request to the exact user project and gpt-5.6-luna was rejected by OpenAI: HTTP 401, code invalid_api_key. No retry/fallback. Model availability and response quality remain unverified because authentication failed.
- Evidence: verification/live-smoke.json. Added scripts/check-studio-error-coach-live.mjs for bounded explicit synthetic-only connection checks. Script syntax checked. No real student data or Firestore changes used.
- Phase: BLOCKED_EXTERNAL_CREDENTIAL. Next: user securely replaces OPENAI_API_KEY with a currently valid key from the msense project; do not paste it in chat. Then rerun the synthetic connection check. New project ID need not be requested again. Keep student AI disabled pending credentials and child-data readiness verification.

## Secret version 3 verification — 2026-09-16
- User supplied the successful Firebase registration message for version 3. Secure smoke confirmed version 3 ENABLED, created 2026-09-16T10:20:14.011975Z.
- One synthetic request at 10:20:48 UTC again returned HTTP 401 invalid_api_key. No retry, fallback, student data, production configuration changes or deployment. Secret value remained in process memory only; the evidence contains metadata and safe error code only.
- Inspected credential retrieval and request construction: Firebase SDK decodes Secret Manager base64; handler sends the resulting key in Bearer authentication to api.openai.com. No decoding/header defect found. Secret Manager registration success does not establish validity at OpenAI.
- Still BLOCKED_EXTERNAL_CREDENTIAL. User should copy a newly created key directly with the OpenAI creation dialog copy button and paste once into the masked Firebase prompt; do not copy a redacted list value or the prior chat. No need to change Service account ownership.

## Duplicate paste repaired; billing block — 2026-09-16
- User provided the OpenAI key list screenshot. Compared only public suffixes in process memory: version 3 matched active msense-code-studio. Further safe check proved the entire same key was repeated exactly twice, explaining the invalid_api_key response. The key itself was valid-looking; repeatedly requesting reissuance before checking duplicate paste was unnecessary.
- Corrected only the exact duplicate and stored new Secret version 4 ENABLED at 2026-09-16T10:23:20.345970Z. Guarded against concurrent version change; preserved all prior versions. Firebase SDK logging disabled; no secret values in commands, logs, files or model output. This is a real Secret Manager mutation, not an application deployment.
- One synthetic connection check using version 4 now returns HTTP 429 credit_balance_exhausted, replacing the prior authentication error. No retries, fallback or student data. Evidence is verification/live-smoke.json (productionModified:false refers to test itself; prior repair is documented here).
- Phase: BLOCKED_EXTERNAL_BILLING. Next: user funds the OpenAI API billing account associated with the msense project. Key reissue/re-registration no longer needed. After balance is available, run one synthetic request to validate model/schema/advice and cache. Student activation still awaits child-data readiness and deployment; no commit/push/deploy performed.

## Funded account: live connection verified — 2026-09-16
- User reports $20 API credit funding. One synthetic NameError request at 10:29:59 UTC succeeded: HTTP 200, exact model gpt-5.6-luna, input 341 tokens / output 146 tokens, Secret version 4. This confirms request availability, not the remaining account balance.
- All four structured fields returned valid Korean hints. The advice asks the learner to compare variable spelling and rerun instead of providing a complete solution. It also mentioned cell order despite file mode; this is a small prompt-quality limitation to address in a later focused educational evaluation, not a runtime failure.
- Identical repeated handler request returned cached:true. No second upstream request, retry, fallback, real student data or production DB writes. Evidence: verification/live-smoke.json.
- Credentials and billing blockers resolved. Phase LIVE_CONNECTION_VERIFIED / PENDING_STUDENT_READINESS_AND_RELEASE. Local implementation and synthetic live connection complete; project-specific ZDR/child-data readiness remains unconfirmed. Config stays disabled. No commit/push/Functions/Hosting deploy performed for this feature.


## Actionable free diagnostics — 2026-09-16
- User reported the generic SyntaxError message was unhelpful for `print("hello world"a)`. Added conservative local diagnosis using the failed source snapshot and Python error subtype/message. Closed-string/name adjacency identifies the extra name and explains both deletion and comma separation without guessing the learner's intent. Examples are grammar illustrations; code is never auto-edited or executed.
- Specialized guidance covers unclosed quotes/brackets, mismatched brackets, missing colon/comma, malformed imports, indentation/Tab mixing, missing variable names (file vs notebook), string/number addition, module calls, invalid integer input and missing file paths. Unknown cases retain cautious general guidance. Comments, escaped/triple strings, valid adjacent strings/conditional keywords and ambiguous prior notebook cells are guarded against false diagnosis.
- The cause and first corrective action now show immediately. One optional expansion reveals a check and small example; AI remains explicitly requested after free help and privacy preview. No new automatic API path.
- File and notebook UI show the guide before internal traceback, with original details expandable. Notebook parse uses a virtual filename and restores actual filename/source in SyntaxError so notebook JSON `{` no longer replaces the student's line or distorts parser caret positions.
- PASS: 14 local/server unit tests, 7 notebook Python tests (including source/line/filename/offset regression), targeted ESLint (zero errors, existing cleanup-ref warning), production build and diff whitespace check. Build retains pre-existing large chunk/audio manifest warnings.
- PASS: actual Chrome/WASM reported typo, immediate corrective action before clicks, examples, expandable cell-source traceback, file/ notebook errors, stale edits, tablet fit, synthetic staged AI; zero paid API calls during this change. Final notebook-actionable-syntax.png visually reviewed. Additional temporary dev server on 5181 stopped; existing 5180 retained.
- Local changes complete; no commit/push/deploy. Prior live API success remains valid; student-data readiness/release still pending.


## Preserve Python print stream layout — 2026-09-16
- User reported `print("hello world", a)` rendered the number on another line. Python sends separate stdout write events for arguments, separators and end text; notebook output mapped each event to its own block-level pre. The recent file console refactor also introduced this behavior there.
- Added shared OutputLogs renderer: adjacent stdout/stderr chunks stay in a single pre with inline spans; exact whitespace/newline characters and stderr styling are preserved. ERROR events remain separate, with existing expandable traceback and file jump controls. No runner/event/data mutation.
- PASS: scripts/qa-studio-print-output.mjs in real Chrome/WASM for both file and notebook modes. Exact text and rendered glyph top positions confirm `hello world 2` is one visual line. Covered custom sep/end, no trailing newline, explicit blank/embedded newlines, loops, Korean and mixed stdout/stderr. Tablet screenshot visually reviewed; zero API calls.
- PASS: existing error-coach browser regression (free guidance/details/stale edits/AI preview), targeted ESLint (existing cleanup-ref warning only), production build (existing chunk/audio warnings) and git diff whitespace check. Evidence: verification/print-checks.json, print-file.png, print-notebook.png.
- Local fix complete, no commit/push/deploy performed.


## Production release — 2026-09-16
- User explicitly requested GitHub commit/push and production deployment. Code commit d49240c5 pushed to origin/main. Only studio feature paths and the single functions/index.js export were staged; unrelated marketing, crew, rules, firebase.json and package.json edits preserved.
- Clean detached release worktree: /tmp/metasense-coach-release-d49240c. Existing dependencies/build environment used without printing values. Release-source checks: 14 server/local tests, 7 notebook compiler tests, build passed. Prior browser QA covers real WASM, actionable hints, exact print output and tablet layouts.
- Firebase deploy --only functions:studioErrorCoach,hosting --project math-sense-1f6a8 completed. New Node.js22 first-generation function in asia-northeast3; Secret accessor granted to the runtime service account for OPENAI_API_KEY. No other functions or rules deployed.
- Production https://msense.me/python-game-studio HTTP200, entry assets and studio JS/CSS SHA256 match release build. Callable endpoint now returns HTTP401 UNAUTHENTICATED for a credential-free synthetic request, replacing 404. No student data or paid AI calls in deployment checks. Evidence: verification/production-release.json.
- Firestore studioCoachControl/config read-only check: absent (404), so paid student AI remains disabled by server precondition. No activation/config write, TTL setup or readiness assertion performed. ZDR/child-data readiness still requires confirmation before activation. Basic local hints and output fixes are live now.
- Phase: RELEASED / STUDENT_AI_ACTIVATION_PENDING. Commit/push/Hosting and function deployment request completed; full student AI availability remains explicitly pending. Existing large chunk/audio and Firebase legacy-config deprecation warnings did not block this deploy.
