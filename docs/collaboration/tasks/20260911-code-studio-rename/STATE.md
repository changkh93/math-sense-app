# Code Studio naming
- Phase: DONE (local; not deployed); 2026-09-11
- User request: rename 게임 스튜디오 to 코드 스튜디오 throughout screens and explanations.
- Baseline: 011536b, clean working tree. Codex sole local writer, no relay needed.
- Scope: visible UI/aria labels, menus/assignment attachment, loading/errors, general studio wording; public/content lesson guides, generator strings and downloadable ZIP text. Preserve URLs, storage keys, schema, existing student project titles, game-specific teaching content, and historical collaboration/video artifacts.
- Acceptance: no old brand in source/runtime/public/content/generators; new-project and studio UI check, existing policy/attachment checks, build. No deployment requested.
- Next: none for local change. Nothing required from user. No deployment performed.

## Verification
- Browser: METASENSE / CODE STUDIO header, general drawing/game/math description, 실행 화면 accessible controls, blank main.py and 나의 첫 프로젝트 on fresh browser confirmed. Screenshot studio.png visually reviewed.
- Existing assignment browser QA passes: own-account Python-only picker, snapshot attachments, renamed open link in new tab/no opener, standalone no back arrow, deleted project/empty state.
- 20 existing studio/console/folder/attachment checks passed; production build passed (existing audio/chunk warnings). git diff --check passed.
- Old brand search returns no matches in src/runtime/public/content/scripts. Developer history and previously produced videos retain their historical names.
- ZIP archives verified against HEAD: same entry names and byte-identical untouched assets; only 1/12/33 text entries renamed in starter/space course/mars course respectively. CRC checks pass.
- Only visible naming/wording and new-project default title changed; routes/storage keys/data formats retained. Existing saved project titles untouched. No remote curriculum records or production data rewritten.
