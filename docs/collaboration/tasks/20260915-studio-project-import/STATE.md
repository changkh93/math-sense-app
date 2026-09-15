# Code Studio project import resilience

- ID: `20260915-studio-project-import`
- Phase: DONE (local; not deployed)
- Last updated: 2026-09-15 19:29 KST
- Coordinator: Codex (local)
- Baseline: `e6dec935`; shared checkout has unrelated user changes in marketing, SEO, crew, Functions, rules, and other task records. Preserve them.
- Original goal: investigate why student 정시원 (`cPW3EkkiW5Me2pLQDgAbixuRDLa2`) cannot import a Code Studio folder at `amer_monster.png`, and make project capacity more generous because size failures are frequent.
- Evidence: student screenshot reports `amer_monster.png: 파일 내용과 확장자가 일치하지 않습니다.`; a second screenshot shows Windows Photos displaying the file. The original binary was not supplied.

## Acceptance criteria

- A valid supported image saved under another supported image extension imports without weakening rejection of HTML/script, damaged data, or image/audio cross-family disguises.
- Standard PNG/JPEG/WebP, audio, fonts, code, backup restore, folder import, local persistence, and runner behavior remain intact.
- Image/audio capacity is substantially above 5 MiB, font capacity above 20 MiB, and project capacity above 30 MiB; every upload/import/restore/validation path uses the same limits and large imports have adequate processing time.
- Targeted tests, build, and a browser folder-import check pass. No production deploy or student-data write without separate authorization.

## Diagnosis and implementation

- Studio projects are stored only in per-browser IndexedDB (`metasense-python-game-studio-v1`), keyed by UID. The student's original folder and failed bytes are not on Firestore/Storage, so the UID cannot retrieve the source file remotely.
- Windows Photos can decode by content even when a downloaded WebP/JPEG retained a `.png` name. The previous synchronous validator required the exact extension signature and aborted the whole folder on one mismatch.
- Implemented: recognize PNG/JPEG/WebP as one safe image family and OGG/WAV/MP3 as one safe audio family. A downloaded WebP/JPEG retained under a `.png` name now imports, while HTML/script, damaged bytes, and audio renamed to `.png` remain rejected.
- Limits raised: image/audio 5→20 MiB each, font 20→30 MiB, project 30→100 MiB. Backup JSON allowance derives from the 100 MiB decoded ceiling. Base64 per-file validation derives from the largest file class. Worker timeout 20→60 seconds.
- File count remains 100 and Python/CSV remain 200 KiB. These guard runtime/UI stability and are unrelated to the reported media-capacity failures.

## Verification

- `npm run test:python-game-studio`: 14/14 pass, including same-family renamed images, malicious/cross-family rejection, 20 MiB media boundary, 30 MiB font boundary, and 100 MiB project boundary.
- `node --test scripts/test-python-game-folder.mjs`: 4/4 pass.
- Actual Chrome folder chooser: a real WebP file copied as `images/amer_monster.png` imports, persists to IndexedDB, and `pygame.image.load()` executes successfully alongside nested Python, PNG, OGG, and TTF assets. Re-import, entrypoint choice/cancel, and no-Python errors pass.
- Actual Chrome backup flow: exported mixed-asset project restores and survives reload; a valid PNG payload above the old 5 MiB limit restores without data loss; malformed JSON, unsupported ZIP, and simulated IndexedDB quota failure preserve the active project and controls.
- Targeted ESLint: pass. `npm run build`: pass (74/74 Frontier audio asset validity; pre-existing license/provisional notices and chunk-size warning remain). `git diff --check`: pass; git fsmonitor emits its existing IPC warning.
- Not verified: the student's original binary/device was unavailable, so its exact byte signature was not inspected. No authenticated production learner session, deployment, Firestore/Storage read, or student-data write was performed.

## Ownership and next action

- Codex owns `projectPolicy.mjs`, import timeout, targeted tests, this state, and the index entry. No external relay.
- Next: deploy the frontend when authorized, then have the student hard-refresh and import the same folder again. If it still fails, collect the original `amer_monster.png` binary (not a screenshot) for exact format/damage analysis.
