# Broader code studio error coaching

The structural encoder previously rejected all value, index, key, division and
file errors, most TypeErrors, and errors on formatted-string lines. These are
now eligible for explicitly requested AI help, without sending raw values,
exception messages, paths, custom identifiers, comments or embedded f-string
expressions. Dynamic calls are represented but never evaluated by the encoder.

Error meanings use a bounded vocabulary shared by the browser and callable.
The model must distinguish known facts from possible causes and provide a
specific local check instead of refusing solely because values are masked.
Authentication, course access, consent, rate limits and cost controls are unchanged.

Safety-related limits remain: unsupported string syntax, unknown lexical input,
ambiguous notebook locations and oversized excerpts still fail closed.

Verification: `npm run test:studio-coach-learning` covers the request boundary,
server validation, privacy and access controls. The opt-in live command below
uses eight synthetic examples, an in-memory database and the configured model;
it does not modify production users, settings or usage documents:

`node scripts/check-studio-error-coach-live.mjs proj_ID --run-synthetic --runtime-errors`

Deploy the updated `studioErrorCoach` callable before Hosting: the expanded
finite vocabulary is additive, so the new server accepts old clients, but the
old server rejects new error reasons. Existing model and API options are unchanged.

## Verification results

- 68 coach tests passed, including all currently parsed error categories,
  file/notebook payloads, private-marker leakage checks and denied-access checks.
- Targeted ESLint passed. Full application build passed with existing asset and
  dependency-scan warnings unrelated to this change.
- Eight synthetic live GPT-6 Luna requests returned valid Korean advice and
  cached repeats. See `preflight.json`; production data was not modified.
- Manual review found the first f-string response mistook the masked expression
  for a plain string. A bounded `f` token now retains only its formatted-string
  category. Reverification produced the appropriate suggestion to inspect names
  inside the original braces, without transmitting those names or expressions.
- Browser interaction with the actual CoachAdvice component and a synthetic
  transport confirmed the ValueError and f-string AI entry points, masked
  preview, explicit confirmation gate, token-only request and local alias restore.
  No real student draft or authenticated account was changed for the UI check.
