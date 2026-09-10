# Profile photo / ship crossfade

- Goal: 랭킹 및 아고라 답변·댓글(답글)에 등록 사진과 탐사선이 부드럽게 교차 표시되도록 구현.
- Phase: DONE (local; not deployed)
- Updated: 2026-09-10
- Coordinator: Codex; local shared checkout, no external relay.
- Baseline: 6f5770d76dd8d09fe7d15410442d513e230b1835.
- Existing edits: profile-auth-photo task record and INDEX row preserved.
- Owned paths: ProfileShipAvatar component/CSS, ranking and QuestionDetail integration, dedicated regression test, this record/INDEX.

## Implementation and acceptance

- Shared avatar uses existing image URL and ship data, without database requests or JS interval timers.
- Each full 12-second cycle holds ship/photo for four seconds each and crossfades over two seconds each direction.
- Starts only after image load; missing, rejected or failed images leave ship visible. URL changes reset load/error state.
- Ranking keeps its original frame and responsive dimensions; answer and reply identities use the same component. Teacher and anonymous-question identities remain unchanged.
- Reduced-motion uses a static photo with a small ship overlay, no crossfade.
- Component runtime regression and existing image utility tests pass; targeted ESLint and diff whitespace checks pass.
- Production build passed (existing large-chunk/audio-license warnings remain). Real authenticated browser visual QA not performed; no deployment or production data changes.
- Prior uploaded-photo disappearance report remains a separate unresolved task; this change does not recover absent uploads.
- Next action: visual review and authorized web release; no external packet required.

## Follow-up: no visible change in development

- Confirmed localhost:5173 serves this checkout. Actual ranking DOM had the new avatar component, but no photo elements.
- Root cause: cleanUserSummary in stellarLeaderboardService.cjs omitted all image fields from every ranking aggregate. Prior component-only verification missed the upstream contract.
- Fixed aggregate projection to retain safe image URLs with explicit empty fields. Added generator regression test covering uploaded/absent/unsafe photos across ranking lists.
- Added RankingProfileAvatar compatibility hydration for old aggregates: only near-viewport rows missing the image field query the user's document, cached per viewer/user for five minutes; no repeated failure retry. New aggregates skip these reads. Own rows use current userData. This supersedes the earlier zero-extra-read claim for legacy aggregates.
- Profile save invalidates the own-photo and answer caches.
- Verified in the user's authenticated development tab: reported student's uploaded image naturalWidth=720, is-ready=true, and computed photo opacity=1 / ship opacity=0; another uploaded photo was mid-crossfade at .895888/.104112. Missing photos retain ship opacity=1. No production writes or uploads performed.
- Dedicated avatar and aggregate tests, targeted ESLint, server syntax and whitespace checks passed. Ranking live UI verified; Agora live UI not rechecked in this follow-up.
- Server projection needs future Functions deployment; compatibility hydration works now without it.
