# 20260911-study-stream-30-sfu-plan

## Original goal

스터디 크루의 Google Meet 모임을 MetaSense 내부로 가져오되 비용을 최소화하고, 최대 30명까지 안정적으로 확장할 수 있는 대안과 실행 계획을 마련한다.

## Acceptance criteria

- 현재 MetaSense Study Stream 코드와 구식 3명 PeerJS 설계의 차이를 확인한다.
- 30명에 맞는 P2P 이외의 아키텍처를 선택한다.
- 주요 대안의 현재 가격과 장단점을 공식 출처로 비교한다.
- 개발 단계, 성능·상태·보안 계약, 롤백, 수락 기준을 포함한다.
- 설계만 작성하고 운영 서비스·DB·비밀키를 변경하지 않는다.

## Status

- Phase: DONE (design only; not implemented or deployed)
- Last updated: 2026-09-11 20:59 KST
- Coordinator: Codex

## Baseline and dirty state

- Baseline commit: `4c014ce9e1a832f78a22caa71b22994ef6d00977`
- Initial worktree: clean (`git -c core.fsmonitor=false status --porcelain=v1`)
- No worktree or external packet was created. This was completed locally because repository inspection and official-source pricing verification were sufficient.

## Findings

- Existing `StudyStreamRoomView.jsx` uses PeerJS and only renders two remote video tiles, but creates calls for all participants.
- Existing room creation and open-study pool configuration allow 100 participants, conflicting with the original 3-person P2P plan.
- Participant presence writes to Firestore every 15 seconds; 30 active participants imply about 7,200 writes/hour before other activity.
- Google Meet APIs create/manage Meet spaces and add MetaSense-like content inside Meet, but do not provide the required general-purpose Meet video embed inside MetaSense.
- Recommended transport for 4~30 participants is Cloudflare Realtime SFU, with a maximum of 8 remote video subscriptions per desktop client and 3 per mobile client.
- Recommended fallback is Cloudflare RealtimeKit if low-level SFU development/quality does not pass the 10-person pilot.

## Artifacts

- Main plan: `docs/STUDY_STREAM_30_SFU_PLAN.md`
- Sources are linked inline in the plan.

## Checks performed

- Read `docs/collaboration/WORKFLOW.md` and `docs/collaboration/INDEX.md`.
- Inspected `package.json`, `firebase.json`, Firestore rules, room callables, open-study configuration, and `StudyStreamRoomView.jsx` media/presence/render paths.
- Verified the current Git baseline and clean initial worktree.
- Checked current official documentation and pricing for Google Meet, Firebase, PeerJS, Cloudflare Realtime SFU/RealtimeKit, and LiveKit Cloud on 2026-09-11.
- No build or runtime test was run because this task changes only planning documentation.

## Final verification and limitations

- The plan includes a cost model, but bandwidth figures are estimates until a 10/20/30-person pilot measures actual codec bitrate and Cloudflare egress.
- No Cloudflare account, Realtime app, secret, function, rule, or production setting was created.
- No claim is made that the existing PeerJS room is safe for 30 participants; the plan explicitly requires a temporary 3-person cap before rollout.

## Next action

If the user authorizes implementation, begin with Phase 0 (server-enforced 3-person safety cap and instrumentation) and Phase 1 (media transport abstraction plus Realtime Database presence migration). Deployment remains a separate explicit step.
