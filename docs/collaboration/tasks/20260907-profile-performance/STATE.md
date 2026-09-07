# Profile performance and cost

- ID: 20260907-profile-performance
- Original goal: 프로필 페이지가 가볍고 빠르게 열리며 오류와 반복 조회 비용을 줄인다.
- Phase: DONE (local)
- Last updated: 2026-09-07
- Coordinator/owner: Codex, local only. No external packet.
- Baseline: dda7eed8ad3ff7680888e9baef6fe8be10b1baa1; clean tracked/untracked state at start.
- Workspace: existing checkout, no branch switch; one writer.
- Scope: PublicProfile loading, scoped query cache and visibility hooks, certificate board optional one-shot loading, profile-edit cache invalidation, related tests and docs.
- Findings: sequential bookshelf callable → answers → unbounded history → owner refinement reads block even the basic profile. Foreign history read is normally denied. Awards subscribe twice on mount.
- Acceptance: header independent of supplemental loading; no hidden-profile supplemental requests; no foreign private-history requests; request deduplication/TTL; bounded answer/book reads; explicit full-history loading preserves correct totals; failures offer local retry without blocking header; route/account isolation; relevant runtime tests and build.
- Next: deploy the answers composite index, wait for READY, then deploy the web app when deployment is requested. No production mutation performed.

## Implemented

- Identity no longer waits for bookshelf/answers/history/refinement. Own identity reuses `useAuth` userData; foreign identity is one document with a 60-second memory cache.
- Viewer + target scoped React Query keys, in-flight deduplication, five-minute supplemental freshness, ten-minute inactive cache GC, no focus/reconnect refetch or automatic retry. Profile save invalidates affected profile caches.
- Bookshelf, answers, and certificate board activate when within 160px of viewport; awards module loads lazily with a local error boundary, and uses two one-shot reads rather than live subscriptions on this page. Existing consumers retain realtime default.
- Recent answers query now orders by createdAt descending and limits to five; added `answers(userId ASC, createdAt DESC)` index. Prior query took arbitrary 30 then sorted locally.
- History/incorrect/review scans occur only when the owner opens full statistics. Complete data remains intact for lifetime totals and concept classification; closed statistics/heatmap are not built/rendered. Foreign private history is not requested; previously denied reads were silently presented as empty stats.
- Badge summary derives from the existing user summary initially; owner full-history expansion completes historical badges with explicit copy. Premium badge images use native lazy loading.
- Supplemental requests have a 12-second UI deadline; bookshelf callable has an 8-second deadline before its existing bounded owner-only fallback. SDK reads cannot be physically aborted; late results do not replace a newer route/account. Failure UI supports section-local retry and distinguishes failure from empty data.

## Verification

- `npm run test:profile-performance`: PASS. Actual PublicProfile/CertificateAwardsBoard rendered in React StrictMode/JSDOM with mocked service I/O. Verified immediate own header with zero additional page queries before visibility, pending bookshelf independent of header, one-shot awards (onSnapshot forbidden by fixture), ordered five-answer query, exactly three scans on history expansion, zero supplemental reads on fresh revisit, hidden-profile gating, no foreign history, local error retry/recovery, route races and account-scoped cache, TTL expiry, request dedup and timeout.
- `npm run test:profile-image`: PASS; photo feature preserved.
- ESLint for all changed JSX/JS: PASS. `git diff --check`: PASS (existing fsmonitor warning).
- Final `npm run build`: PASS, 9.02 seconds on this machine. Existing audio provisional-license and large-chunk warnings remain unrelated.
- No live Firebase latency/billing measurement or authenticated browser visual QA performed. Tests substantiate request behavior, not an absolute speed or billing reduction claim. Answer document cap is 30 → 5 (83% lower cap); no claim of 83% total cost reduction.

## Deployment and limits

- New answer index must reach READY before deploying the new web bundle; no Cloud Functions or access-rule changes required for this performance task.
- Full history still scales with history size when explicitly expanded; subsequent fresh visits reuse it in memory. Page reload resets memory caches. Other-user identity can be up to one minute old, supplements up to five minutes old.
- Actual production deployment, live-account reading/writing, and external relay were not performed. No user action is required to maintain the task record.
