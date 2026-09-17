# 20260917-dividia-division-card-lab

- Original goal: 곱셈 구구 카드처럼 나눗셈 카드를 만들고, `56 ÷ 8`에서 기존 8단 음성을 `팔 일은 팔`부터 `팔 칠 오십육`까지 들려주며 8개씩 묶인 그림과 소리를 동기화한다. 곱셈 관계는 `8 × 7 = 56` 순서로 표현하고, 오답·어려운 카드를 반복 학습하게 한다.
- Coordinator: Codex (local implementation and verification)
- Phase: DEPLOYED_AND_VERIFIED
- Last updated: 2026-09-17 KST (production deployment verified)
- Baseline: `e4eafa83`; shared checkout contains unrelated modified and untracked user work. Preserve it and restrict edits to the ownership below.
- Worktree/branch: shared checkout; no external handoff.

## Acceptance criteria

- 디비디아 체험 학습 영역에서 세로셈 연구소보다 먼저 나눗셈 카드에 들어갈 수 있다.
- 2~12단을 여러 개 골라 각 단마다 딱 나누어지는 카드 6장과 나머지가 생기는 카드 6장, 총 12장을 연습한다.
- `56 ÷ 8`은 `8`개씩 `7`묶음으로 시각화하고 `8 × 7 = 56` 관계를 명확히 보여 준다.
- 기존 곱셈 음성팩을 재사용해 `팔 일은 팔`부터 목표 곱까지 순차 재생하며 묶음 불빛과 동기화한다.
- 정답을 쓰고 카드를 뒤집어 원리를 확인하며, 오답 또는 “조금 어려워요” 카드를 같은 세션과 다음 학습에서 반복한다.
- 접근성, 키보드·터치 입력, 반응형 UI, 로컬 진행 저장을 지원한다.
- 나머지 점은 완성된 묶음과 사람에게 나누어 준 점에서 분리해 보여 주며, 몫과 나머지를 각각 입력하고 확인한다.
- 모델 검사, 관련 회귀 검사, scoped lint, production build, 브라우저 상호작용·시각 검증을 수행한다.

## Ownership

- `src/components/Space/DivisionCardLab.jsx`
- `src/components/Space/DivisionCardLab.css`
- `src/components/Space/divisionCardLabModel.js`
- `scripts/test-division-card-lab.mjs`
- narrow edits: `src/components/Space/SpaceHome.jsx`, `src/App.jsx`, `package.json`, `docs/collaboration/INDEX.md`

## Current work

- Existing multiplication card model, reusable chant audio player, local spaced-practice data shape, Dividia experience entry, and development routes inspected.
- Chosen concept: each lit capsule is one equal group containing the divisor number of dots; the number of illuminated groups is the quotient.
- Added 132 division facts across 2~12단. Each selected divisor contributes six exact/remainder pairs (12 shuffled cards total), and previously wrong or difficult facts can be included independently through “다시 만나기.”
- Added a two-sided card flow with numeric keypad/keyboard entry, correct/retry piles, confidence buttons, same-session retries, next-day weak-fact prioritization, and per-user local progress.
- Reused the existing `gpt-audio-1.5` multiplication chant pack without new API calls. The divisor maps to the spoken table and the quotient maps to the stopping point, so `56 ÷ 8` plays the 8단 sequence through `팔 칠 오십육` while seven 8-dot groups light in sync.
- The front hides the final accumulated product with `?`; the back reveals `8 × 7 = 56` followed by `56 ÷ 8 = 7`, preserving the natural divisor-first multiplication relationship.
- Added the “나눗셈 묶음 카드” before the vertical-division laboratory in Dividia's compact experience section and added `/dev/division-card-lab` for isolated QA.

## Checks

- `npm run test:division-card-lab` passed: fact generation, `56 ÷ 8`, seven groups and 56 dots, weak/practice/retry queues, audio reuse, multiplication relationship, entry order and QA route.
- `npm run test:multiplication-card-lab` and `npm run test:vertical-division-lab` passed with no regression.
- Scoped ESLint passed with no errors; two pre-existing `SpaceHome.jsx` hook-dependency warnings remain.
- `npm run build` passed, including 74/74 frontier audio validation, Vite production build, Python prerendering and guide generation. Existing audio-license notices and large-chunk warnings remain.
- Browser QA on the 8단 deck reached `56 ÷ 8`; the front showed seven groups containing 56 total dots with no horizontal page overflow.
- Replaying the chant showed exactly two lit groups and totals `8, 16` after 2.6 seconds, then all seven groups at completion, confirming phrase-to-group synchronization.
- Entering 7 revealed `8 × 7 = 56` and `56 ÷ 8 = 7`; selecting “조금 어려워요” increased the retry pile to one and advanced to the next card.
- Browser console contained no warnings or errors.
- Replaced the multiplication-like accumulated-number strip after user review. Every card now begins with the complete dividend visible as ungrouped dots; each spoken fact encloses exactly one divisor-sized group while all remaining dots stay visibly ungrouped.
- Added a simultaneous equal-sharing scene beneath the grouping scene. There are exactly `divisor` recipients, and each completed grouping round animates one new item to every recipient, so the grouping interpretation and equal-sharing interpretation reach the same quotient together.
- Removed the visible cumulative products and implementation-facing “existing audio reuse” wording. The learner sees only the whole, completed groups, remaining objects, recipients, and each recipient's current share.
- Extended the shared audio player with an opt-in `revealTarget` path: division cards now play the final full statement (for example `팔 사 삼십이`) instead of ending with a multiplication question; multiplication cards retain their original question behavior.
- Browser QA on `32 ÷ 8` verified an initial state of 32 visible dots, 0 completed groups, 4 ungrouped sets, 8 recipients and 0 distributed tokens. Mid-sequence QA verified 2 completed groups, 2 ungrouped sets, 16 remaining objects, and 2 objects for each of 8 recipients. Completion verified 4 groups, no ungrouped objects and 4 objects per recipient.
- Extreme-case browser QA on `144 ÷ 12` verified all 144 dots, 12 recipients, no horizontal page overflow, and a dynamically sized card with `scrollHeight === clientHeight` so none of the 12 grouping rounds is clipped.
- Expanded each divisor deck to mix exact and remainder division without increasing the normal deck beyond 12 cards. The 2-deck includes both `8 ÷ 2` and `9 ÷ 2`; selected weak cards are ordered first instead of duplicated, so the progress counter remains `1/12`.
- Replaced “한 바퀴” with the child-facing explanation “모두에게 하나씩 줄 때마다, 한 사람이 받은 수도 1씩 늘어요.” Small recipient counts now use centered, capped-width person cards so the received-count badge stays beside each person.
- Added a persistent loose-dot lane outside completed groups and a matching undistributed-dot explanation below the people. On remainder cards it changes to a highlighted `나머지 N` state only after all full groups are made.
- Added separate quotient/remainder inputs with a shared touch keypad. Blank remainder is accepted as zero for exact division; remainder cards require the correct remainder, and the back verifies `divisor × quotient + remainder = dividend`.
- Increased front/back card sizing so the complete numeric keypad and check button remain inside the card. Browser QA verified the `9 ÷ 2` front at `1/12`-style deck size, four 2-dot groups, one loose remainder dot, two centered people with count 4, and an unclipped keypad (`padBottom <= cardBottom`). Entering quotient 4 and remainder 1 revealed `2 × 4 + 1 = 9` and the matching remainder explanation.
- Final checks passed: division-card model test, multiplication-card regression, 20-mission/154-step vertical-division regression, scoped ESLint, production build, and browser interaction/visual QA.
- Released implementation commit `863f538d` to `main` and deployed that exact clean checkout to Firebase Hosting project `math-sense-1f6a8`.
- Production verification passed at `https://math-sense-1f6a8.web.app`: deployed `DivisionCardLab` JavaScript and CSS SHA-256 hashes exactly match the clean release build.

## Next action

- Optional: collect student feedback from the live release and iterate in a new scoped task.
