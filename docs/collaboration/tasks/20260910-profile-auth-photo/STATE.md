# Profile Auth photo mismatch

## Correction after user clarification

- User explicitly reports a directly uploaded image, not a Google photo. The earlier diagnosis below does not establish the cause of that upload failure.
- Reverted the Google fallback/save changes and their tests; do not replace the student's intended upload with an Auth image.
- Scoped read-only production checks: current profile-images/{reported UID}/ listing is empty; deployed Storage rules already allow member-owned JPEG/PNG/WebP uploads up to 2 MB. Missing deployment of these rules is not the current explanation.
- Selection currently creates only a local preview; upload occurs on the overall profile Save action. A failed subsequent document write also attempts to delete the new upload. Empty storage alone cannot distinguish these cases.
- Actual direct-upload failure remains unresolved. Need the student's confirmation of whether Save showed success or error; no production changes made.
- Earlier local-fix completion statements below are superseded by this correction.

- ID: 20260910-profile-auth-photo
- Original goal: 로그인 썸네일에는 사진이 있지만 공개 프로필에는 이름 첫 글자만 표시되는 학생 제보 해결.
- Phase: ACTIVE (local fix verified; deployment pending)
- Updated: 2026-09-10
- Coordinator/owner: Codex, shared checkout, no external packets.
- Baseline: 6f5770d76dd8d09fe7d15410442d513e230b1835; initial working tree clean.
- Scope: PublicProfile, ProfileEditView, profile regression tests and this record. No production writes.

## Evidence and changes

- Read only the reported student's users document and Auth record. All three Firestore image URL fields and image path were absent; Auth had a Google image URL returning HTTP 200 image/png. No credentials or image tokens recorded here.
- Navbar and edit preview resolve Auth photo fallback, but public profile previously did not.
- Own public profile now resolves the Auth fallback without extra network queries. Foreign profiles never use the viewer's photo.
- Profile save persists the same fallback photo shown in the preview, making it available to other viewers and existing answer snapshot synchronization. Custom uploads retain priority.
- Regression test covers Auth-only own profile, custom priority, foreign profile isolation; existing performance and image suites pass, targeted ESLint passes.

## Acceptance and remaining work

- Local own-profile fallback and preview/save consistency fixed.
- Existing missing foreign-profile photo requires the owner's next profile save, or separately authorized scoped data repair. No automatic writes on page views or new server lookups added.
- Production data and Hosting have not been changed. Live authenticated UI/upload verification not performed.
- Production build and git diff --check passed. Existing large-chunk and provisional audio-license warnings remain.
- Next: obtain deployment and, if desired, scoped repair authorization.
