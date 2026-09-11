# Python education showcase + five videos

- Phase: DONE (local, music revision verified), 2026-09-11. Website/YouTube publishing not performed.
- Original user outcome: persuasive Python-only education/free-trial landing page; five new videos under one minute (foundation, LUMI, advanced, math, algorithm) using actual coding/execution, Korean explanatory text, BGM; integrate existing game-project YouTube video.
- Exact learning order: 처음 파이썬 → 루미 프로토콜 → 게임 프로젝트 → 파이썬 심화 → 파이썬 수학 → 생각의 항로.
- Baseline: f2ec7ea, clean tree at start. Codex sole writer. No external relay, no student/parent data, no production application or assessment writes.

## Delivered

- `/python` public landing, alias `/trial/python`; lazy route in App. Dedicated page/style in `src/pages/PythonEducation.*`. Added a discoverable link to the Python row of the existing general trial page, preserving referral query parameters.
- Hero with actual Code Studio screenshot, observation/prediction/code/experiment/explanation learning approach, six ordered selectable courses, video players, parent learning-management explanation, FAQ and dedicated trial form.
- Trial uses existing submitPublicApplication callable with selectedCourse `파이썬 코딩`, existing 7-day / valid-referral 4-week offer, required fields, privacy consent, invalid-phone validation, submission lock, retry/error handling, success only after acknowledgement. No new backend/schema/security changes.
- Accurate learning flow: Code Studio → .py and written reflection → AI-assisted analysis and teacher confirmation → linked parents see real-time learning activity/attendance/submissions and published evaluation/feedback. Does not claim parents can stream unsaved local code, or that unchecked AI drafts are automatically published.
- Five final MP4s in `public/python-showcase/`, each ~57.05s container duration (57s video), 1920×1080, H.264 30fps, AAC stereo 48 kHz; 4.4–5.0 MB each. Korean on-screen explanations, WebVTT and posters. No autoplay. One selected video loads on demand; switching pauses/removes the old video. Existing game-project ID xVBNU8vHoW4 mounts a YouTube nocookie iframe only on click.
- Editable Remotion project, real clips, standalone example Python source, local capture harness/scripts, media preparation/caption/verification scripts in `videos/python-course-showcase/`. Music credit and OFL font license included. Music revised to five distinct Kevin MacLeod tracks (see MUSIC-CREDITS.md), CC BY 4.0; excerpt, fade and volume adjustment disclosed on screen and page.
- Real Code Studio: turtle flower, actual NumPy/matplotlib graph, two-word Tk card cycling with matching translations, modulo signal pattern. LUMI uses real mission execution/evaluation with persistence disabled. Algorithm public observation UI is recorded without any grading submission; code verification then runs in the real Code Studio. Mock gateway is only a mount dependency for the observation harness, not a fabricated evaluation result.

## Verification

- `recording-checks.json`: exact selected recording segments and real results. Tk verifies imagine → 상상하다 → create → 만들다 → imagine; graph verifies shared intercept; signal verifies times 0–11 and new input 12; LUMI verifies goal coordinate (3,2). No unhandled browser errors in used captures.
- `qa-python-education.mjs`: ordered six stages, responsive widths 1440/768/390/360 without horizontal overflow, form validation, duplicate guard, retained inputs after failure, retry success, referral copy and callable payload. Calls intercepted before input; **0 production submissions**.
- `qa-python-education-media.mjs`: all five MP4s play, durations under 60s, playing video paused and detached on course change, correct YouTube ID and click gate, no browser exceptions. YouTube external playback itself not asserted (the iframe request was intercepted).
- Final rendered-frame review at 3/12/29/40/47/54 seconds for all five videos, plus full-frame checks for text/code. Screenshots of desktop hero/course view, mobile hero/course/form and full page. Mobile course video appears before the long description.
- `media-checks.json`: all videos decoded successfully; original export measured -19.93 LUFS and -3.86 dBFS true peak; replacement measurements are recorded in the music revision below. Audio fades; no extra game audio or voiceover.
- Focused ESLint passes for App, PublicApplication and PythonEducation. Video TypeScript passes. `npm run build` passes (existing general chunk-size warnings remain). Static assets synchronized after last video render; hashes match `public` and `dist` (`build-assets.json`).

## Preview / limits

- Local page: http://127.0.0.1:5180/python . Remotion editor: http://localhost:3110 . Both opened as deliverable tabs.
- Intended deployment path: msense.me/python. Deployment and YouTube uploads were not requested/executed; no production trial was submitted. Existing backend behavior was checked against its source and intercepted request contract, not a real application write.
- Reference blog was read via public Naver PostView. Prior local game-video source and supplied YouTube ID used for existing course. No invented student results/testimonials.
- No user action is needed to review the complete local deliverable. Any subsequent publishing should use the final checked files above.

## Music revision requested 2026-09-11

- Keep the existing game-project video and Pixelland unchanged. Replace each of the five new film soundtracks with a distinct composition, update source/render/credits/captions, balance loudness and verify playback. Codex sole writer; no external relay needed for this bounded revision.

- Completed: foundation → Carefree (ukulele/marimba); LUMI → Cipher (synth groove); advanced → Local Forecast (jazz); math → Prelude in C (BWV 846) (piano); algorithm → Thinking Music (strings/harp). All by Kevin MacLeod, official CC BY 4.0 attribution verified. Existing game-project assets/YouTube remain unchanged.
- Updated shared `src/data/pythonCourseMusic.json`, distinct prepared WAV/source MP3 files, Remotion audio and per-film closing credits, all five rendered MP4s, WebVTT, page's expandable attribution and MUSIC-CREDITS.md. Removed unused Pixelland copies from the new Remotion project only. Source excerpts can be reproduced with prepare-music.py.
- Video/cache revision `?v=music-2` prevents the old common soundtrack being reused by browsers. No auto playback added.
- Verification: five unique source ISRCs/source hashes and five distinct decoded audio hashes; full MP4 decode; each 57.045s, H.264 1080p/30fps, AAC stereo 48kHz. Integrated loudness -22.50 to -20.03 LUFS, true peaks at or below -3.90dBFS. Closing credits visually inspected for all five.
- Browser QA: all five revised URLs play, five source credits listed, previous player pauses on course switch, game-project embed ID preserved, no browser errors. ESLint and video TypeScript pass. Website build passes (pre-existing chunk-size warning); 23 public/dist assets hash-match. Initial root npx tsc lookup failed because TypeScript belongs to the video subproject; rerun using its installed binary passed. Parallel Webpack cache emitted a nonfatal cache-rename warning; all renders completed successfully.
- Next action: review updated local preview. Deployment/YouTube publishing not performed; no user action required for this revision.

## Video discoverability revision — 2026-09-11 (DONE, local)

- User could not initially recognize six separate videos. Replaced text-only course tabs with six numbered thumbnail cards, play icons, duration/demo badges and a selected marker; retained the exact course sequence and existing video/music files.
- Hero link now explicitly says “소개 영상 6편 둘러보기”; section heading and collection label emphasize six different demonstrations.
- Player shows current position (1 / 6 etc.), a link back to the six-film list, previous navigation and next-course name. The sixth loops to the first when requested. Selecting a thumbnail reveals the player; videos remain click-to-play, and switching pauses/detaches the prior player.
- Responsive six-column desktop, three-column tablet and two-column mobile gallery. Native buttons retain keyboard support, pressed state and clear names.
- Verification: focused ESLint; build passes with existing chunk warning; existing five-video playback/YouTube gating check passes. New gallery QA verifies six cards, no horizontal overflow at 1440/1024/768/390/360, next/previous/wrap, keyboard selection and retained YouTube click gate. Desktop/mobile gallery/player screenshots visually inspected. Trial form unchanged; no production writes. No video re-render or deployment needed/performed for this local UI revision.
