# Structural-code AI help: implementation and release notes

## Data path
1. Local feedback still reads original source and traceback in browser memory (no paid request).
2. A bounded lexer scans the full source (max 50k characters), removes comments and string/number contents, consistently assigns custom names and literal references, and selects at most 13 lines around the error.
3. Client request v2 contains only fixed enums, bounded indices and token arrays. No free-text source/error/path/profile fields. A finite preliminary finding ID preserves the local detector's suspicion without identifiers or prose.
4. Server rejects extra fields, invalid indices/enums, mismatched error categories and all v1 requests. It reconstructs a diagnostic excerpt from its own finite vocabulary. The model sees syntax, known library APIs, consistent aliases, placeholders, line numbers and error category. It does NOT see original variable spelling/values or student account headers.
5. Luna replies with four bounded Korean learning-hint fields. Alias restoration occurs ONLY in browser memory, by single-pass replacement. The lookup is never a request field or persistent storage entry.

Numeric placeholders are descriptive, not runnable Python. The prompt explicitly forbids treating number_N as an undefined variable. Model output cannot establish original values or intent. No execution-equivalence or legal-anonymity guarantee is made. Reserved vocabulary is intentionally retained; arbitrary identifiers are not. Code structure and request timing remain observable. Authentication and connection metadata are still processed by MetaSense/Firebase; do not claim that all service data has become anonymous.

## Supported / intentionally withheld
- Tested lessons: Turtle constructor () omission, misspelled variables, missing import target, pandas aliases; repeated variable and literal relationships retained.
- Original spelling remains available to LOCAL suggestions only; AI gets a finite suspicion, not the original misspelling.
- Actual literal values, file paths and output are unavailable. ValueError/KeyError/IndexError/ZeroDivisionError/FileNotFoundError requests remain local-only in v2.
- Interpolated/prefixed strings, dynamic eval/exec/getattr/setattr/globals/locals/__import__, unsupported lexical characters, ambiguous notebook frames, oversized inputs are withheld.
- Local rules/lexer are bounded, not a complete Python parser or type checker; extend only with positive/negative lesson fixtures.

## Controls and rollout (NOT performed)
- Model remains gpt-5.6-luna; store:false; no automatic requests/retries, existing atomic caps/cooldown/cache retained.
- Server config now requires enabled:true, structureDataReady:true and a project ID. An old childDataReady:true flag DOES NOT enable v2. Do not set childDataReady to claim ZDR approval.
- Frontend + callable must be released together. Old clients are rejected with invalid-argument; ask them to refresh. Current production is unchanged by this task.
- No raw-snippet route exists in the revised handler. Future ZDR approval does not automatically broaden its schema.
- Before student activation: settle legal characterization of transformed structural data, verify guardian authorization applicable to minors, publish effective-date notices, and validate actual operational retention/deletion of internal usage records. Existing expiresAt fields are NOT proof of configured Firestore TTL (TTL was not enabled here). Review provider contract/data location before any personal-data overseas-transfer disclosure. No invented country/entity/retention fields were published.
- Policy pages contain a visibly labelled proposed AI section, not an assertion that enrollment implies guardian consent or that anonymization/ZDR approval is established. No new consent collection workflow was implemented here.
- ZDR application remains pending. For later raw/personal-data processing: confirm project/endpoint eligibility and actual ZDR, separate necessary Korean notices/consent/legal basis, and revisit data minimization. Parent consent and store:false do not substitute for ZDR.

## Sources checked 2026-09-16
- OpenAI under-18: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
- OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data
- OpenAI Services Agreement §3.3(c) (minor guardian consent), §4.2 (training): https://openai.com/policies/services-agreement/
- Korean PIPA §22-2 (guardian consent where required, understandable child notices): https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334761
- Korean PIPA §28-8 (overseas transfer bases and disclosures): https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029331899
These sources do not certify this implementation as universally anonymous/compliant.

## Verification
- Node regression suite: studioCoachStructure.test.mjs, studioErrorCoachLocal.test.mjs, studioErrorCoach.test.cjs.
- Actual model, synthetic only: live-smoke-initial.json and live-smoke.json. Three requests per round, six total; repeats cached without extra calls; no production DB writes. Initial answer leaked a field label; prompt corrected and final three replies reviewed. Final round: 2080 input + 498 output tokens. Across both rounds: 3830 input + 1031 output tokens.
- Original WASM file/notebook/browser regression passed. Targeted UI script verifies token-only request, preview, local alias restoration and policy pages. Builds and target ESLint checked separately.
- Live checks are a small educational sample, not a guarantee for every student's code; no real student data sent.

## Production status — 2026-09-16 (supersedes rollout-pending notes)
Released and structural student AI enabled under the user's explicit authorization. ZDR is still pending, childDataReady remains false, raw snippets stay rejected. Notices carry the current effective date; this is not a certification of legal anonymity. Internal usage expiry now has a deployed daily cleanup function and enabled schedule; no Firestore TTL claim. Actual synthetic authenticated Luna response and rejection boundaries passed. First scheduled cleanup execution has not been observed. Details: [release record](../20260916-coach-production-release/STATE.md).

## 2026-09-21 local extension — not deployed

- Ordinary prefixed literals and bounded f-strings on other lines no longer disable AI help for an unrelated error. Entire formatted literals (including replacement expressions) become existing `q` placeholders. No raw-code fallback or new wire fields; v2 validation and limits remain intact.
- Nested quoted expressions, comments/escapes within replacement fields, malformed formatted literals, and errors on a formatted-literal line still withhold the request. The UI now distinguishes these reasons from value-sensitive errors, dynamic-code use, location ambiguity and size limits.
- Runtime `Did you mean` method hints are checked against the failing `self` call and a method declaration in the same named class. Only corroborated near-spellings produce the specific local hint. Different classes, strings pretending to be method definitions, nested functions and unrelated candidates are regression-tested.
- Help intents (except positive feedback) reveal the AI entry point; its label is `AI에게 물어보기`. Preview explains whole-f-string masking; the existing explicit preview confirmation remains.
- Verification: 52 coach regression tests passed (including mocked server request with f-string masking), scoped ErrorCoach ESLint passed, production build passed. Browser fixture verified specific method hint, AI entry, masked preview, confirmation and mocked response; separately verified the formatted-error-line message. The supplied original game source passed local payload generation and produced the 112 -> 121 method-spelling hint. No real AI requests or production writes were made; educational quality of a live AI answer was not tested.
- Release requires the frontend and updated callable/shared modules; no production deployment performed in this change.

## 2026-09-21 follow-up — improve the studio, not the learner's game

The user's game is a diagnostic example, not an implementation target. The
original attachment and saved student projects are unchanged.

- File-mode output now has `동작이 예상과 달라요`, independent of traceback or run
  failure. Inspection is explicit and local. Two bounded patterns compare image
  updates with color-index state and nested image/type loops. Observed lines,
  conditional interpretation and concrete print checks appear separately.
- Supplied original: runtime method typo at 112 with definition at 121; state
  assignment at 123 versus color lookup at 98; loop at 219–223. All three produce
  a supported masked AI payload locally. The attachment was not sent to AI.
- Runtime AI entry is visible immediately. Shared `CoachAdvice` handles explicit
  preview/confirmation, one-request locking, local alias restoration and stale
  source blocking. Behavior review makes no learning-observation/sample request.
- Optional v2 `related` adds at most four two-line token excerpts with the same
  aliases as the main (up to 13-line) excerpt. Schema rejects raw fields and
  malformed excerpts, caps combined tokens at 1,800 and payload at 24 KB.
  `BehaviorCheck` is explicitly not a Python runtime exception. The server prompt
  distinguishes evidence from learner intent and never claims execution.
- Strings/comments/actual numbers/identifiers stay masked as before. Complex
  unsupported syntax still fails closed. The loop check is anchored at its header
  and cannot recover masked f-string expressions in the AI view; local guidance
  supplies that observation. There is no raw-source fallback.
- Updated user-facing data descriptions to cover bounded related excerpts and
  behavior inspection. No model, credential, auth, consent or rate-cap change.

Verification:

- `npm run test:studio-coach-learning`: 61 passed, including negative examples
  (already-fixed code, different classes, commented/quoted code, doubled braces,
  image literals unrelated to the loop, rebinding, notebook ambiguity).
- `npm run test:python-game-studio`: 15 passed.
- Scoped ESLint: no errors; existing `deletedIds.current` cleanup warning in
  PythonGameStudio remains. `npm run build` passed; build is not runtime proof.
- Live handler + real gpt-5.6-luna: three synthetic cases, all HTTP 200, cached
  repeats made no additional calls. Human-readable replies were reviewed for
  actual field mismatch, loop index behavior, method-definition comparison and
  non-assertion of runtime errors. 3,209 input + 620 output tokens total. Evidence:
  [live-behavior-smoke.json](live-behavior-smoke.json). Only synthetic masked code;
  usage DB was in-memory, with no production writes.
- Browser: actual ErrorCoach/BehaviorCoach and full PythonGameStudio components
  at localhost with an isolated synthetic draft. Checked immediate runtime AI
  entry, no-error behavior entry, both findings, masked related preview, disabled
  submit before confirmation, alias restoration, stale-source blocking and
  disappearance of the corrected finding on reinspection. Browser replies
  replayed the independently obtained real-model evidence; the browser did not
  call the production callable. Compact-screen layout and scrolling checked.
- Temporary browser harness removed after checks. No deployment. Frontend and
  callable must be released together; the old deployed callable does not accept
  the new related excerpts or BehaviorCheck category.

Limits: this is not arbitrary free-form debugging, complete Python analysis,
asset inspection or a guarantee that the rest of the program is correct. Behavior
inspection currently supports these two file-mode patterns only. Unmatched code
gets a local checking approach and an explicit unsupported-AI explanation.

## 2026-09-21 retained-record audit — read-only

User requested inspection of accumulated student code-error records and
improvements grounded in those records. Production Firestore was inspected with
the existing authenticated CLI session, using only masked configuration fields,
aggregate collection counts and global daily request counters. No student
identity, per-user request fingerprint or source code was retrieved. No writes,
configuration changes or new AI calls were made.

Evidence: [records-audit.json](records-audit.json). Optional learning collection
and case retention are both OFF. Retained stats, samples, costs and explanation
cards each contain 0 documents. Global request reservations total 3 (2026-09-16:
2; 2026-09-18: 1). These can include failed or synthetic requests; they cannot
establish student-error frequency, successful responses or unique learner counts.
There are no retained cases from which to infer frequent student mistakes.

Improved the admin report accordingly:

- Explain collection-off versus enabled-with-no-observations, historical-only
  data, and usage-read failure. Never present missing data as absence of errors.
- Report the existing global daily reservation total separately from opt-in
  learning observations/token costs. Read exactly 14 global day documents,
  never user-level usage. No new logging fields or collection behavior.
- Use 14 inclusive UTC calendar dates (previous cutoff admitted 15 dates), with
  visible endpoints and exclusion of future aggregate rows.
- Explain that turning on collection cannot recover earlier errors and still
  requires each learner's optional participation. Production collection stays off.

Verification: 65 coach tests passed, including read-only/identity boundaries,
date edges, failure handling and empty-state distinctions; scoped ESLint and Node
syntax checks passed; build passed. Browser used the actual admin component with
the read-only audit summary and synthetic enabled/unavailable scenarios. All
three messages were verified without mutating production. Temporary harness
removed. Changes are local and not deployed.
