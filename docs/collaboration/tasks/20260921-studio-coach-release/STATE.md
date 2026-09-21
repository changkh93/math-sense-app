# Code trace and studio coach release · 2026-09-21

User explicitly authorized GitHub commit/push and production deployment of this
thread's completed work. Baseline: 8a62b2ac (origin/main aligned).

Scope: Code Trace per-exercise line reveal resume/save, structured AI help with
bounded f-string support and related code, runtime method typo hints, opt-in local
behavior inspection, and admin visibility into missing observation data versus
existing global AI request reservations. The prior Enter scrolling fix is already
in the baseline and remains included.

Preserve unrelated dirty work (quiz battle, marketing, manual-feedback records,
agent workflow changes, videos). Stage only scoped paths, partially stage
package.json, then build/deploy from a clean archive of the resulting commit.
No changes to student drafts, collection settings, model, credentials or caps.

Pre-release validation: 65 coach tests, 15 studio tests, Code Trace progress/editor
contracts and 11 completion tests passed. Scoped lint and production build passed
in the working tree. Earlier actual browser checks and live synthetic model
checks are documented in ../20260916-studio-private-coach/OPERATIONS.md.

Plan: deploy studioErrorCoach and studioCoachLearningAdmin before Hosting;
verify deployed authenticated synthetic behavior/method cases, masked-only and
authorization boundaries, 14-day report, duplicate protection, unchanged disabled
collection, and production asset bytes. Temporary verification account is removed
in finally; aggregate request reservations can include these release checks.

Status: deployed and verified on 2026-09-21.

Implementation commit: db05922e, pushed to origin/main. Production was built
from a clean Git archive of that commit, excluding unrelated working-tree edits.
The isolated release passed all three relevant test commands and npm run build.
Firebase deployed studioErrorCoach and studioCoachLearningAdmin (asia-northeast3),
then Hosting for math-sense-1f6a8. No rules or collection controls were changed.

Production verification:
- hosting.json: msense.me index, SPA entry, and all five feature JS/CSS files
  returned HTTP 200 and matched the isolated build byte-for-byte.
- verify.json: all 17 checks passed, including three real deployed Luna replies
  (state mismatch, loop/image mismatch, method typo), duplicate protection,
  unauthenticated/student boundaries, raw-code rejection, the 14-day admin
  report, and unchanged disabled optional collection. Synthetic profile and
  Auth account were deleted in finally. Aggregate reservation counters include
  these synthetic release requests.
- Replies were reviewed: they distinguish behavior checks from exceptions,
  compare relevant lines, give conditional guidance and small checks, and do
  not claim execution or knowledge of masked image names.

Limits: browser interactions were verified before deployment as documented in
OPERATIONS.md; production checks here use deployed APIs and exact asset bytes.
A production Code Trace cloud save/reopen scenario was not repeated. Existing
build/deployment warnings were non-blocking; no unrelated dependencies changed.
Verification-only scripts/evidence are committed separately after deployment;
they do not change the deployed application bundle.
