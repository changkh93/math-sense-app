# Lightweight crew routes

- Phase: DONE (local); updated 2026-09-07; baseline 984561b; starting tree clean; Codex is the single local writer. No external relay or deployment.
- Request: adapt the supplied frontier travel idea to promote student interaction and collaboration, minimizing operating cost and development weight.
- Decision: reuse approved-crew authorization, existing visit actions, relay partners and return logs. No public student directory, new currency/passport ledger, multi-world loading, new subscriptions or simultaneous-button server simulation.
- Scope: selectable crew atlas, explicit sea/sky gate entry, guarded single-destination travel with cancellation/failure recovery, arrival activities tied to existing facilities and return records.
- Acceptance: no requests for atlas browsing or gate approach; one call per confirmed trip; duplicate and stale arrival suppression; private/blocked routes unavailable; safe arrival and single scene; keyboard/mobile UI; existing reward and permission contracts preserved.
- Implemented: crew atlas selection/confirmation and preserved safety controls; two lightweight 3D gates and local map markers; single pending travel with cancellation/failure/stale-response handling; single-scene reset on arrival; existing facility help and return-log entry points; explicit guest training label. Existing server admission, reward limits, co-op relay and subscription policies unchanged.
- Passed: test:frontier-crew (real React/StrictMode hook and component DOM with synthetic transport); test:frontier-cost; test:frontier-exploration; test:galaxy-navigation; galaxyGame.live.test.cjs; galaxyGame.worldObject.test.cjs; scoped ESLint; diff whitespace check; production build (existing audio metadata/chunk warnings).
- Browser: local Chrome synthetic destination success + safe landing, sea gate click -> atlas with unchanged request count, hoverpack at sky gate, desktop/narrow viewport, actual MetaGalaxy guest route menu. No browser errors observed in the synthetic route test.
- Report: docs/astra-frontier-crew-routes.md. No actual student visits/reward mutations or billing measurement; no new backend functions or observer/public access.
- Next: user-authorized deployment when desired, then two authorized student accounts can verify production multi-user behavior. No user action needed to finish the local implementation.
