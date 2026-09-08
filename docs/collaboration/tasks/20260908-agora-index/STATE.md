# Stella Agora public question index repair
- ID: 20260908-agora-index
- Original goal: restore Stella Agora public question list failing with Firebase missing-index error.
- Phase: DONE; updated 2026-09-08 KST. Owner: Codex; small scoped local repair, no external relay.
- Baseline: 5744245a6161c876d561d8508f15aae83163aa6a; shared checkout. Existing learning-save-stability task/index, quiz component, utility and test edits preserved.
- Scope: firestore.indexes.json, this task record and additive production questions/answers indexes only.
- Evidence: usePublicQuestions all filter queries questions where isPublic=true ordered by createdAt DESC, limit20. Source index config lacks the exact two-field composite, although status-filtered and userId-filtered composites exist.
- Local change: added COLLECTION questions composite isPublic ASC, createdAt DESC; existing indexes retained.
- Acceptance: production composite READY and matching ordered, limited query succeeds; source config retains required index.
- Next: user refreshes the Agora page or presses 다시 시도. No web/functions/rules release needed for this index repair.

## Production verification
- Created only questions composite isPublic ASC, createdAt DESC (implicit __name__ DESC), index ID CICAgISu1JsL; creation started 2026-09-08T09:37:53Z.
- Verified state READY; existing status/userId question indexes also READY.
- Matching production query (isPublic=true, createdAt DESC, limit20) succeeded and returned 20 document references. Selected names only; question content not logged.
- JSON parse and git diff --check PASS. No app code changes or frontend build needed.
- Limit: verified production query via authenticated REST, not the user’s browser UI/session. Existing user edits preserved; no document/rules/hosting writes.

## Detail answer follow-up (2026-09-08)
- User reports answers fail on the question detail page. Source useQuestionAnswers requires answers(questionId ASC, createdAt ASC), absent from source config.
- Scope extended to additive answer composite repair; existing production questions repair retained. Added missing composite to source config.
- Acceptance: answer composite READY and the reported public question’s actual answer query succeeds. Next: inspect/repair production index and verify.

### Detail repair verified
- Reproduced actual reported public question answer query: FAILED_PRECONDITION with missing answers(questionId ASC, createdAt ASC) index.
- Added only that composite in production, index CICAgOi3voUK, start 2026-09-08T09:45:19Z; READY verified. First READY read still had propagation delay; subsequent identical questionId + createdAt ASC query succeeded with **1 existing answer**. No answer content logged or modified.
- Whole-list, unanswered and solved query shapes also passed against production (20 references each). Source JSON parse and git diff --check PASS.
- User should refresh detail page. No frontend/functions/rules deploy performed or required for index fix. Browser rendering/session not directly verified.
