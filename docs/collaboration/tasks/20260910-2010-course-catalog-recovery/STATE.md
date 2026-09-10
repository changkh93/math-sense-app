# 코스 목록 간헐적 오류 조사·복구

- ID: 20260910-2010-course-catalog-recovery
- Phase: DONE (investigation and local fix; not deployed)
- Updated: 2026-09-10 20:19 KST
- Original goal: paul@dulcine.net으로 msense.me 로그인 후 ‘학습 코스 정보를 불러오지 못했습니다’가 오늘 빈번히 발생한 원인 확인.
- Coordinator/owner: Codex, local only. 외부 전달 불필요.
- Baseline: a2e46b8 (shared checkout, main working directory).
- Existing edits preserved: docs/marketing/README.md, SOURCES.md, YOUTUBE-PLAN.md, daily/2026-09-10/JOURNAL.md.
- Scope: 코스 목록 조회 복구, 해당 오류 UI, 회귀 검사. 계정 권한/학생 기록/운영 데이터 변경 없음.
- Acceptance: 실제 오류 관찰, 10초 초과 응답 소실 재현, 늦은 응답 자동 반영·중복 읽기 방지·실제 실패 재시도 검증, 관련 기존 검사·빌드. 운영 사고 최초 지연 원인은 증거 없으면 미확정으로 보고.

## Evidence
- User Chrome tab https://msense.me/에서 제보와 동일한 오류 및 초등수학 fallback만 표시되는 상태 직접 확인.
- 당시 console warn/error buffer empty; 이후 사용자가 해당 탭을 닫아 retry/network capture 불가.
- src/hooks/useContent.js: getDocs에 10초 Promise timeout, timeout retry 금지, focus refetch 비활성. 실제 getDocs는 계속 실행되지만 늦은 응답이 UI에 반영되지 않음.
- Local firestore.rules: clusters read public. 계정별 권한이 원인이라고 단정할 근거 없음.
- Firebase Admin read-only account/catalog verification: sandbox DNS blocked; escalation auto-review rejected because explicit administrator credential use approval not established. User approval requested asynchronously; no successful admin request or data mutation.

## Work
- Implemented cluster query late success recovery and in-flight deduplication; preserved healthy 30min cache and error-only focus recovery.
- Tests and build passed as recorded below. No deployment performed.
- Investigation and local repair complete; report verified account/catalog status and remaining limits.

## Verified local result
- New Chrome tab https://msense.me/ in the same browser session showed all four clusters (중등수학/고전 읽기/파이썬/초등수학), no error banner. This supports an intermittent retrieval failure; it does not establish the original network/SDK cause or independently verify account email.
- Added src/utils/recoverableContentQuery.js: reuse pending read after UI deadline; apply delayed success to the original cache; do not restore removed queries or overwrite newer cached edits.
- useClusters alone adopts recovery and refetches errors on window focus. Other content queries and auth/access rules unchanged.
- ClusterSelector differentiates delay and offers recovery/loading state; SpaceHome passes error code and fetching state.
- npm run test:course-catalog-recovery: 8 query regression cases passed. The package script also includes the UI integration test below.
- node scripts/test-course-catalog-ui.mjs: actual useClusters + ClusterSelector in JSDOM with only Firebase I/O stubbed; real 10-second deadline, auth-disabled reads, retry deduplication, loading state, late response to all four clusters and alert removal passed. Visual browser testing of the new UI was not performed.
- npm run test:space-landing, test:access-claim-sync, test:google-auth passed.
- npm run build passed (existing large-chunk and audio-manifest warnings).
- Targeted ESLint on new helper/tests and ClusterSelector, git diff --check passed.
- Shared source marketing changes preserved. No commit, deployment, production data, rules, credentials or account changes.

## Remaining / next action
- Original incident error code/transport cause unknown: original tab had no console error buffer and was closed before network capture.
- Administrator read approval resolved: user explicitly asked to request approval again; escalation accepted and read-only lookup succeeded. No further account-read approval pending.
- Code repair is ready locally. Operating-site change requires a separate authorized web deployment and verification; do not claim the newly opened normal production tab was fixed by these local edits.
- User relay not used; no external task packet.

## Approved production read verification
- User follow-up: “다시 요청해주세요. 승인해줄게요.”
- Existing project Firebase service-account credential used only for Auth getUserByEmail, that user document get, and ordered clusters query. Escalation accepted; all reads succeeded; no write operations.
- Reported account: disabled=false; user document exists; role=admin; accountStatus unset; isDeleted=false; deletedAt absent. Custom claim accessVersion=1, 5 claimed course identifiers.
- Ordered production catalog returned all 4 expected documents: middle-math (중등수학), western-classic (고전 읽기), python (파이썬), cluster_elementary (초등수학).
- No evidence of account disablement/deletion or missing catalog data at verification time. Admin SDK reads do not reproduce browser client-rule/App Check/network behavior, so original transient transport cause remains unconfirmed.
- Final status: investigation and local recovery repair complete; repair has not been deployed.
