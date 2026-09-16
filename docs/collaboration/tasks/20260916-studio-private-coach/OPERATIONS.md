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
