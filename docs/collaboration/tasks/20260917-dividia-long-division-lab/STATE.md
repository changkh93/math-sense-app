# 20260917-dividia-long-division-lab

- Original goal: 디비디아에 작은 수에서 큰 수까지 자연스럽게 이어지는 20문제 세로 나눗셈 체험 학습을 추가하고, 몫·곱하기·빼기·다음 자리 내려오기를 정확한 위치와 설명으로 익히게 한다. 기존 15개 미션 목록을 더 길게 만들지 않는 창의적인 체험 학습 진입점을 설계한다.
- Coordinator: Codex (local implementation and verification)
- Phase: DEPLOYED_AND_VERIFIED
- Last updated: 2026-09-17 KST
- Baseline: `f7e6c3dc`; shared checkout contains unrelated modified and untracked user work. Preserve it and limit this task to the ownership below.
- Worktree/branch: shared checkout; no external writer or parallel handoff.

## Acceptance criteria

- 디비디아 15개 일반 미션과 구별되는 체험 학습 진입점이 목록 상단에서 바로 보인다.
- 20문제가 한 자리÷한 자리에서 천의 자리÷십의 자리까지 단계적으로 이어진다.
- 각 계산 차례마다 몫 쓰기 → 나누는 수와 몫 곱하기 → 빼기 → 다음 숫자 내려오기를 학생이 직접 입력하되, 몫이 0인 자리에서는 의미 없는 `0 × 나누는 수`, `0 − 0`을 건너뛴다.
- 세로셈 판에서 입력 위치, 현재 계산 자리, 이미 완성한 계산이 명확히 구별된다.
- 내려오는 숫자는 원래 자리에서 계산 위치로 이동하는 화살표 애니메이션으로 표현된다.
- 각 단계의 의미를 왕새우쌤의 학생 친화적 문장과 오답 힌트로 설명한다.
- 나머지가 있는 문제와 몫 가운데 0이 들어가는 문제를 포함한다.
- 진행 저장, 순차 해금, 키보드·터치, 반응형 화면을 지원한다.
- 순수 계산 모델 검사, scoped lint, production build, 브라우저 상호작용·시각 검증을 수행한다.

## Ownership

- `src/components/Space/VerticalDivisionLab.jsx`
- `src/components/Space/VerticalDivisionLab.css`
- `src/components/Space/verticalDivisionLabModel.js`
- `scripts/test-vertical-division-lab.mjs`
- narrow edits: `src/components/Space/SpaceHome.jsx`, `src/App.jsx`, `package.json`, `docs/collaboration/INDEX.md`

## Current work

- Repository flow and the existing multiplication lab patterns inspected.
- Chosen integration: a distinct compact experience card immediately below the MISSION SELECT title, before the leaderboard and 15-item list, so it is discoverable without becoming a 16th ordinary mission.
- Added five color-coded learning zones and 20 sequential missions spanning one-digit division, two- and three-digit dividends, two-digit divisors, and four-digit dividends.
- Added a pure long-division model with 154 verified student actions. When the leading place is too small, the flow first asks whether it can be divided; calculation cycles generate `몫 쓰기 → 곱해 적기 → 빼기 → 다음 숫자 내려오기`, with final cycles omitting the unnecessary bring-down action and zero-quotient cycles omitting redundant multiply/subtract actions.
- Included remainder problems, leading multi-digit partial dividends, and internal zero quotient cases such as `408 ÷ 4 = 102`.
- Added a position-aware long-division board. Quotient, product and remainder targets use distinct colors; the source digit and landing cell are separately highlighted during bring-down, with a repeated downward-arrow animation.
- Corrected the long-division geometry after visual review: place-value columns now anchor from the dividend's leftmost digit, the quotient phase no longer repeats the current dividend as a premature “first calculation,” and the product target is revealed only after the quotient is entered. The quotient, current dividend, and product target now share the exact same horizontal center after accounting for the division-bracket stroke.
- Completed bring-down actions now join the remainder row at the next place, so the following partial dividend is assembled in the same physical row instead of appearing as a detached duplicate.
- Increased the subtraction rule beneath the product from a faint 1px line to a high-contrast 3px rounded line with a restrained glow, keeping it readable against the dark board.
- Quotient coaching now names the active place value explicitly (for example, “십의 자리 수 4” and “몫은 반드시 십의 자리 위 칸”), and the answer label repeats that place value.
- When a zero remainder is joined to the next brought-down digit, the no-longer-meaningful leading zero fades and blurs away as the next quotient step begins, leaving `2` rather than visually presenting `02`.
- When a brought-down value itself is 0, the learner now writes only the quotient 0 and moves directly to the next bring-down. The skipped cycle has no product/subtraction row; its 0 fades in place while the next digit lands on the existing calculation row.
- During every quotient step, the exact partial dividend being divided is now marked directly on the written algorithm with a warm animated underline and glow. It begins on the source dividend (`15` in `156 ÷ 3`) and follows later partial dividends onto the working row.
- Corrected the zero-quotient shortcut distinction: only a partial dividend that is actually `0` fades. A smaller nonzero partial dividend remains visible and joins the next digit—for `1248 ÷ 12`, `4` stays while `8` comes down to form `48`; the coach explicitly explains that `4` must not be erased.
- Tightened and normalized the vertical calculation rhythm by removing stacked cycle padding: in the `96 ÷ 8` QA case, the `96 → 8` row-center gap changed from 66px to 58px and the brought-down `16 → 16` gap from 77px to 59px.
- Added a student-controlled leading-place decision. For `156 ÷ 3`, the learner first decides whether the hundreds digit 1 can make a group of 3; choosing “나눌 수 없어요” explains that 1 hundred and 5 tens become 15 tens (150), so the quotient begins in the tens place. The explanation remains until the learner presses the continue button. Problems needing more than one look-ahead, such as `2025 ÷ 25`, repeat this decision safely.
- Added 왕새우쌤 step explanations, two-level correction hints, auto-advance after correct answers, number pad/keyboard entry, sequential unlocking, per-user local progress and completion/mastery screens.
- Added a dedicated development QA route at `/dev/vertical-division-lab`.

## Checks

- `npm run test:vertical-division-lab` passed: 20 missions, 5 zones, all 154 steps, answers/rejections, leading-place decisions, zero-quotient shortcut, leading multi-digit partial dividends, board state, entry placement and QA route.
- Added regression contracts for left-anchored place columns, no duplicate partial-dividend label, in-row bring-down placement, and subtraction-sign positioning.
- `npm run test:vertical-multiplication-lab` passed with no regression.
- Scoped ESLint passed with no new errors; two pre-existing `SpaceHome.jsx` hook-dependency warnings remain.
- `npm run build` passed, including 74/74 frontier audio checks, Vite production build, Python prerendering and static guide generation. Existing frontier license notices and large-chunk warnings remain.
- Browser QA completed on `42 ÷ 2`: quotient, multiply, subtract, animated bring-down, next quotient cycle, automatic transitions and final `21` completion were verified.
- Browser QA completed on `9 ÷ 4`: the initial 9 appears once at the left edge under its quotient cell; after entering 2, the product input appears directly beneath 9 with the subtraction sign to its left. Measured centers for quotient `2`, dividend `9`, and product target were all exactly `x = 401px` in the QA viewport.
- Browser QA completed on `156 ÷ 3`: the hundreds digit 1 is highlighted first, both “나눌 수 있어요 / 없어요” choices are available, the correct explanation remained visible after 4.5 seconds, and its continue button advanced to a tens-place quotient target for 15.
- Browser QA completed on `408 ÷ 4`: after entering the middle quotient 0, the flow moved directly from step 5 to the bring-down step 6 of 9 with no `0 × 4` or `0 − 0` prompt. Both obsolete zeros faded to computed opacity 0, the landing target stayed on the existing row, and entering 8 advanced directly to the final ones-place quotient.
- Browser QA completed on `156 ÷ 3` for the active-number cue: quotient step 2 marked exactly the source digits `1` and `5` with animated 4px underlines (no underline under `6`), and after completing that cycle the cue followed the brought-down `6` onto the working row.
- Browser QA completed on `1248 ÷ 12`: the zero-quotient bridge showed “4 옆으로 8 내려오기,” retained visible `4`, faded only the old zero, and step 8 displayed and underlined both `4` and `8` as `48` with computed opacity 1.
- Responsive QA at 768×1024 measured `scrollWidth 753` for `innerWidth 768`, confirming no horizontal page overflow. The CSS also switches to the single-column/mobile rail layout at 900px and below.
- Browser console contained no warnings or errors during the full interaction.

## Next action

- 학생 사용 피드백을 관찰하고 필요할 때 문구와 속도를 다듬는다.

## Release

- Feature commit `4dc4d13` was pushed to `origin/main` on 2026-09-17 KST.
- A clean detached worktree at that commit passed `npm run test:vertical-division-lab` (20 missions, 154 guided steps) and `npm run build` before release.
- Firebase Hosting production deployment completed successfully at `https://math-sense-1f6a8.web.app`.
- The deployed `VerticalDivisionLab` JavaScript and CSS files were downloaded from production and their SHA-256 hashes matched the clean local build exactly (`6d3c1b…f2fd`, `7ea51049…6173`).

## Limitations

- Progress is saved per user in the current browser with local storage and is not synchronized across devices.
- A physical phone/tablet was not available; responsive browser verification covered the 768px tablet layout and CSS/mobile overflow behavior.
