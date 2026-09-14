# Large Korean font upload
- DONE (Hosting deployed), 2026-09-14; Codex local owner. Baseline 21fcd887.
- Student report: NanumMyeongjoEcoBold.ttf does not appear after upload. Original student binary/device not available; no account data reads needed because studio projects are local IndexedDB.
- Preserve unrelated dirty files (marketing/SEO/crew/functions/rules/firebase/package/etc).
- Goal: reproduce with official font, support reasonable Korean TTF sizes throughout upload/replace/folder/backup/runtime, show errors by upload button, verify local persistence and pygame rendering.
- No external relay or deployment. Next: reproduce limits then fix/test.

## Diagnosis and fix
- Official NAVER file: https://hangeul.pstatic.net/hangeul_static/webfont/NanumEco/NanumMyeongjoEco/NanumMyeongjoEcoBold.ttf
- Measured 9,809,868 bytes (9.355 MiB); sfnt header 00010000. Original student binary not provided, so this is the same-named official file, not a claim of inspecting the student's disk.
- Old upload rejects above 6 MiB project total / 5 MiB assets; old base64 reader also rejects this file's encoded size. Failure notice used to appear only at the page top.
- Font limit 20 MiB; total project 30 MiB; other assets stay 5 MiB, Python/CSV 200 KiB. Shared size validation applies upload, replacement, folder import and stored project/runtime validation. Base64 decoder accepts font-sized payloads and uses a direct byte loop; backup reader increased to 41 MiB to hold the larger base64 project.
- Upload errors now also appear immediately below the upload button with actual size/allowed limit, and busy state is labeled. Existing project and local storage data preserved.

## Verification
- Same official file rejected by old validator, accepted by new validator.
- npm run test:python-game-studio: 14 checks PASS, including 10 MiB font serialization/runtime payload, original asset/code limits, 30 MiB total cap.
- Actual Chrome/WASM: upload shows file; FontFace loads; local IndexedDB survives refresh; replace accepts same font; pygame.font.Font renders Korean using uploaded file; >9 MiB JSON backup downloads/restores; folder import includes fonts subdirectory; >20 MiB font rejects visibly without deleting existing files.
- Evidence in verification/{checks.json,font-preview.png,pygame-font.png,upload-error.png}; screenshots visually inspected.
- Targeted ESLint has no errors (existing deletedIds cleanup-ref warning); npm run build PASS including current repository prerender scripts; git diff --check PASS.
- No production deployment, account/Firestore reads or student data writes. Student browser itself was not inspected. Next: release the frontend change; then student reloads and uploads again.
- Official fixture SHA256: f63cc918651cb0a97390e1bc76afd8358bcf113f7e18e8047e760536c3f49d3c

## Release 2026-09-14
- User explicitly authorized GitHub commit/push and production deployment. Releasing responsive preview and previously verified Korean font fix together.
- Commit scoped to Code Studio sources, QA and these task records. Preserve the current frontend build configuration and already-deployed SEO/crew screens; Functions, rules and student records excluded from deployment.
- Phase: DONE (Hosting deployed).
- GitHub main source commit: `842fe2c6`; push succeeded.
- Firebase Hosting `math-sense-1f6a8` deployment succeeded 2026-09-14. No Functions/rules/data deployment.
- Operating `https://msense.me/python-game-studio` returns new main `/assets/index-C1gSFMHy.js`; live studio JS and CSS SHA256 exactly match local production build. Evidence: `../20260914-studio-responsive-preview/verification/production-release.json`. Existing home/Python/trial/guides pages return HTTP 200 and expected titles.
- Release checks: studio 14, turtle 5, sync 9, input 7 Python + 2 protocol tests passed; build and SEO/guides/funnel checks passed. Chrome viewport/WASM QA was completed locally; no physical iPad or authenticated production learner session was tested.
