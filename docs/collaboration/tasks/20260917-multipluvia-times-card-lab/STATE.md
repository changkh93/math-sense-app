# 20260917-multipluvia-times-card-lab

- Original goal: 멀티플루비아 섹터의 체험 학습을 일반 학습 아래와 RETURN TO GALAXY 사이로 옮기고, 큰곱셈 조립소 왼쪽에 2단~12단 복수 선택·전체 무작위 출제·앞뒷면 카드·불빛 수열·정답/오답 데크·오답 반복·다음날 취약 카드 집중 기능을 갖춘 구구단 체험 학습을 추가한다.
- Coordinator: Codex (local implementation and verification)
- Phase: IMPLEMENTED_AND_VERIFIED
- Last updated: 2026-09-17 KST
- Baseline: current shared checkout with existing unrelated modified/untracked files. Preserve all existing user work; this task owns only the paths listed below and narrow integration edits.
- Worktree/branch: shared checkout; no external writer or parallel handoff.

## Acceptance criteria

- 멀티플루비아의 체험 학습 영역이 일반 장 카드 아래, 하단 RETURN TO GALAXY 버튼 위에 있다.
- 구구단 체험 카드가 큰곱셈 조립소의 왼쪽에 먼저 배치된다.
- 학생이 2단~12단을 여러 개 선택할 수 있고, 선택한 각 단의 1~12 곱셈 카드가 빠짐없이 무작위로 나온다.
- 문제 앞면에는 누적곱이 차례로 켜지고 마지막 정답 위치는 물음표로 가려진다.
- 답을 제출하면 카드 뒷면에서 정답·설명을 확인한다.
- 맞힌 카드와 다시 볼 카드를 별도 데크로 보여주고, 틀린 카드는 모두 맞힐 때까지 반복한다.
- 날짜를 넘겨 다시 학습하면 저장된 누적 오답 기록으로 취약 카드를 먼저 복습한다.
- 카드 뒷면에서 `아주 쉬워요` / `조금 어려워요`로 느낌을 나누고, 틀린 카드와 어려웠던 카드를 모두 반복 학습한다.
- 12단 옆의 `한 번 더!` 선택으로 저장된 오답·어려움 카드만 모아서 연습할 수 있다.
- 카드 앞면에서 `이 일은 이, 이 이는 사 … 이 팔은?`처럼 정답 직전까지 빠른 한국어 구구단 음성을 들려주고, 읽는 순서와 불빛을 동기화한다.
- 키보드·터치와 반응형 화면을 지원한다.
- 순수 학습 모델 검사, scoped lint, production build, 브라우저 시각·상호작용 검증을 수행한다.

## Ownership

- `src/components/Space/MultiplicationCardLab.jsx`
- `src/components/Space/MultiplicationCardLab.css`
- `src/components/Space/multiplicationCardLabModel.js`
- `src/components/Space/multiplicationChantAudio.js`
- `scripts/generate-multiplication-chant-audio.mjs`
- `scripts/test-multiplication-card-lab.mjs`
- `public/sounds/multiplication/v1/**`
- narrow edits: `.gitignore`, `firebase.json`, `src/components/Space/SpaceHome.jsx`, `src/App.jsx`, `package.json`, `docs/collaboration/INDEX.md`

## Next action

- No required implementation work remains. If classroom listening reveals a specific pronunciation or pacing issue, regenerate only the affected hashed phrase and bump the versioned audio directory before deployment so immutable caches remain correct.

## Work completed

- Added `구구단 불빛 카드` with multi-selectable 2단~12단 controls and all 1~12 facts per selected table.
- Added shuffled full-deck study, staged cumulative-product lights with the final value hidden as `?`, numeric keyboard/touch input, and a front/back card flip explanation.
- Added separate green correct and orange retry deck stacks. Missed facts remain in the retry set and are reshuffled until answered correctly.
- Added per-user local fact statistics. Prior-day missed facts with the strongest weakness scores appear in a focus warm-up before the complete selected deck.
- Moved the multiplication sector's experience-learning section below ordinary chapter cards and immediately above the bottom RETURN TO GALAXY button.
- Added two side-by-side experience cards with `구구단 불빛 카드` first on the left and `큰곱셈 조립소` second on the right; mobile stacks them in the same order.
- Added a development QA route at `/dev/multiplication-card-lab`.
- User revision: replaced the horizontal number-only sequence with a full multiplication table. The current table runs from the selected factor down to 1 on the vertical axis and ×1~×12 on the horizontal axis.
- The selected multiplication is outlined as an orange rectangle; only the top multiples row lights in sequence, and the target top-row cell remains `?` until the student answers.
- Replaced the back-side repeated-addition chips with an equal-cell rectangular array and an explicit `세로 n칸 × 가로 m칸` explanation.
- Split the back-side progression into `아주 쉬워요` and `조금 어려워요`. A correct-but-difficult card now enters the retry deck immediately, while an incorrect card repeats regardless of which feeling button is chosen.
- Added the student-facing `한 번 더!` choice immediately after 12단, including its live card count. It can be combined with selected tables or used alone to study every locally saved incorrect/difficult fact.
- Added persistent easy/hard counts and a `needsPractice` flag per fact. A correct card marked easy leaves `한 번 더!`; a difficult or incorrect card stays until it is later answered correctly and marked easy.
- Added fast Korean multiplication chanting with browser system speech at rate 1.45. Korean number words cover every result through 12×12, and topic particles follow the spoken word naturally (`일은`, `이는`, `삼은`, `사는`).
- Each phrase advances the corresponding top-row light, while the target remains a question (`이 팔은?`). Every front card auto-starts the chant and provides a compact `다시 듣기` control.
- Added a no-speech-API fallback that reveals the visual sequence without blocking answer entry.
- Confirmed the existing Python Code Studio OpenAI infrastructure can be reused safely for offline asset generation: Firebase Secret Manager `OPENAI_API_KEY` latest version 4 is ENABLED, the configured OpenAI project is already bound, and no browser-exposed OpenAI key or OpenAI SDK dependency is required because the existing server tooling uses direct HTTPS.
- Sent one bounded synthetic `gpt-4o-mini-tts` request with no student data. OpenAI returned HTTP 200 `audio/mpeg`; the 5.832-second Korean sample is valid mono MP3 (24 kHz, 128 kbps, 93,312 bytes). The key value was held in memory only and was not printed or written to the repository.
- After user feedback, regenerated `이 일은 이`, `이 이는 사`, `이 삼은 육`, `이 팔은?` as four independent Marin clips at 1.15 speed, trimmed and loudness-normalized them, then placed their starts on a fixed 1.35-second beat grid. This avoids letting sentence-level TTS choose inconsistent pauses and gives the UI exact light-onset timing.
- Generated a higher-tier comparison through Chat Completions using `gpt-audio-1.5`, Marin voice, a strict Korean voice-actor/rhythm instruction, and the same exact chant. The API returned HTTP 200, its own transcript exactly matched the target, and the valid output is 6.2-second mono PCM WAV at 24 kHz (297,644 bytes; 181 prompt tokens / 154 completion tokens).
- User approved this higher-tier voice quality. Produced a pitch-preserving 1.20× tempo preview with loudness normalization: 5.164 seconds, mono 24 kHz MP3 at approximately 96 kbps (63,117 bytes).
- A whole-sequence 150 BPM singing attempt became too slow and aggressive compression damaged `팔`; it was rejected internally and will not be used. Regenerated four independent two-beat GPT-Audio-1.5 Marin chant phrases, verified each phrase separately, and assembled them on fixed 1.14-second starts. The corrected v6 output is 4.35 seconds, mono 24 kHz MP3 at approximately 96 kbps (53,325 bytes).
- User listening rejected the v6 singing style despite its semantic transcription. Returned to the approved 6.2-second GPT-Audio-1.5 spoken source, extracted its four intact phrases at natural pauses, applied only 1.08× tempo, and placed on exact 1.17-second starts. Clean v7 is 4.22 seconds. A second v7 variant adds very quiet 620 Hz onset notes and an 820 Hz question note without altering the voice.
- Implemented the final traditional Korean recitation rules requested by the user: `이 일은 이`, `이 이는 사`, `이 삼은 육`, then particle-free `이 사 팔` through `이 구 십팔`; the same familiar pattern is applied across 2~9단. Targets remain questions such as `이 팔은?`.
- For the nontraditional ×10~×12 extension, added explicit `곱하기` phrasing such as `삼 곱하기 십이는 삼십육` so adjacent number words cannot be mistaken for another fact.
- Generated and validated 264 independent GPT-Audio-1.5 Marin phrases for 2~12단: 12 answer statements and 12 target questions per table. Each phrase is transcript-checked, duration-checked, and rejected if it contains an implausible internal or edge silence.
- Packed the verified phrases into 11 per-table 24 kHz/96 kbps MP3 sprites plus a timing/text manifest under `public/sounds/multiplication/v1` (about 3.8 MB total). Runtime problem solving makes no OpenAI API request.
- Added a guarded one-time generator with persistent hashed phrase caching, bounded retries, Firebase Secret Manager retrieval, and no API key output. Changed phrases create a new cache key automatically.
- Added lazy Web Audio loading and selected-table prefetch. Every phrase start advances the matching top-row light; the last question activates the hidden target cue. Playback stops cleanly on answer, card change, replay, setup reset, or unmount.
- Retained device speech only as a last-resort fallback if the versioned static audio cannot load. Added an `AI로 만든 학습 음성` disclosure and long-lived immutable caching for the versioned corpus.

## Checks

- `npm run test:multiplication-card-lab` passed: 2~12 table range, 1~12 complete facts, 8×7 sequence, prior-day weakness selection, 2·3·4단 36-card plan, retry de-duplication, and sector placement/order contract.
- `npm run test:vertical-multiplication-lab` passed with no regression.
- Scoped ESLint for the new component/model passed with 0 errors. Broader scoped lint also passed with only the two pre-existing `SpaceHome.jsx` hook dependency warnings.
- `npm run build` passed, including 74/74 frontier audio assets, Vite production build, prerendering, and static guide generation. Existing audio documentation and large chunk warnings remain.
- In-app browser QA verified setup rendering, 8단 selection, sequential light animation, hidden final value, wrong-answer card flip, retry deck increment, correct-answer deck increment, and 2·3·4단 multi-selection yielding 36 cards.
- Rectangle revision QA: the model test verifies that 8×7 creates 8 rows, 12 visible columns, a 56-cell highlighted area, the top sequence `8, 16, 24, 32, 40, 48, 56`, and a target at row 8/column 7. Browser QA on 8×10 confirmed 8 table rows, 96 displayed product cells, an 80-cell orange rectangle, a hidden top-row target, top-row-only lighting, and an 80-cell back-side rectangle with matching explanation.
- Confidence revision tests passed: difficult self-rating enters the persistent practice set, practice-only plans work with no table selected, correct/easy removes a fact, and incorrect/easy does not remove it.
- Confidence revision browser QA used a saved 8×10 card: `한 번 더! 1장` started as a one-card practice-only session, `조금 어려워요` produced an immediate retry round, and the later correct `아주 쉬워요` choice completed the session and reduced the saved practice count to 0.
- Final verification passed: `npm run test:multiplication-card-lab`, `npm run test:vertical-multiplication-lab`, scoped ESLint, and `npm run build`. Existing audio-license documentation and large-chunk build warnings remain unchanged.
- Chant revision tests passed for Korean number words (`16`, `80`, `144`), the complete 2×8 phrase sequence, the hidden final answer, UI replay affordance, scoped ESLint, vertical-multiplication regression, and production build.
- In-app browser QA verified the 2×8 card, replay control, complete visual sequence/fallback, responsive placement, and zero console errors. This preview browser reports no Web Speech API, so audible output could not be heard there; supported Chrome/Safari student browsers use their installed Korean system voice.
- Live TTS capability check passed against `POST /v1/audio/speech` using the existing OpenAI project and Secret Manager credential. The generated test artifact is temporary at `/private/tmp/openai-gpt4o-mini-tts-check.mp3`; no reusable production corpus or app integration was generated in this check.
- Revised rhythm sample is temporary at `/private/tmp/openai-gpt4o-mini-tts-rhythm-v2.mp3` (4.87 seconds, mono 24 kHz MP3). A separate synthetic `gpt-4o-mini-transcribe` verification returned the intended text exactly: `이 일은 이, 이 이는 사, 이 삼은 육, 이 팔은?`. This automated check supports wording intelligibility but does not replace the user's listening judgment about voice quality and rhythm.
- GPT-Audio-1.5 sample is temporary at `/private/tmp/openai-gpt-audio-1.5-korean-chant.wav`. An independent `gpt-4o-mini-transcribe` call also returned the intended chant exactly. Listening approval remains required because transcription cannot measure whether the classroom rhythm and Korean accent feel natural.
- Approved faster preview is temporary at `/private/tmp/openai-gpt-audio-1.5-korean-chant-fast.mp3`. The 1.20× tempo is a reversible post-processing parameter and does not require another model call.
- Faster melodic v6 preview is temporary at `/private/tmp/openai-gpt-audio-1.5-korean-chant-song-rhythmic-v6.mp3`. Independent transcription resolved to the intended four facts (`2×1=2`, `2×2=4`, `2×3=6`, `2×8=?`). The earlier v3/v4/v5 intermediate singing mixes are not approved production candidates.
- Direct-singing v3~v6 candidates are rejected and must not be used. Clear spoken-beat v7 is temporary at `/private/tmp/openai-gpt-audio-1.5-korean-chant-spoken-beat-v7.mp3`; subtle-note v7 is at `/private/tmp/openai-gpt-audio-1.5-korean-chant-spoken-note-v7.mp3`. Independent transcription of the note version exactly matched `이 일은 이, 이 이는 사, 이 삼은 육, 이 팔은?`.
- Final corpus validation passed for all 11 tables, all 264 manifest entries, exact model-generated Korean texts, and all 11 MP3 files over 100 KB. Scoped ESLint and `npm run test:multiplication-card-lab` passed.
- Final `npm run build` passed and copied the versioned audio pack into the production output. Existing frontier provisional-license notices and large-chunk warnings remain unrelated and unchanged.
- In-app browser QA on a random 2×11 card verified the static audio path in an environment with no usable system speech: ten preceding top-row cells lit in order, the target question cue activated, the replay control returned to idle, the AI disclosure rendered, and browser error/warning logs were empty.

## Limitations

- Weak-card history is stored per user in this browser/device, not synced across devices.
- The prior-day focus algorithm is unit-tested with synthetic date-separated history; a real next-calendar-day browser observation requires waiting until a later KST date or deliberately seeding test data.
- Static audio playback requires Web Audio and successful loading of the versioned files. If either fails, installed Korean system speech is used when available; otherwise the visual activity remains fully usable and marks audio unavailable.
