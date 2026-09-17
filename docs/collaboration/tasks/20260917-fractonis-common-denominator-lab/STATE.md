# Fractonis common-denominator lab

- Task ID: `20260917-fractonis-common-denominator-lab`
- Owner: Codex (local implementation; no external relay)
- Phase: DEPLOYED_AND_VERIFIED
- Baseline: shared dirty worktree; preserve unrelated changes

## Goal

Add a separate fraction-planet experience where students overlay two divider lenses, observe equal-sized unit fractions, convert both fractions to a common denominator, and compare the results.

## Acceptance criteria

- The fraction sector shows a second, distinct experiential-learning card beside/below `분수 겹침 렌즈`.
- Two same-size paper cards begin with differently sized pieces.
- A synchronized lens interaction subdivides both cards until one small room has the same size on both cards.
- The UI explains that the common denominator names the shared room size, not merely a memorized rule.
- Students enter both equivalent fractions and then compare them using `<`, `=`, or `>`.
- Eight progressively varied missions subdivide both cards and produce congruent unit rectangles (rotated 90 degrees between cards) so visual equality is unambiguous.
- Progress is saved locally and layouts remain usable on desktop and narrow screens.
- Focused tests, lint, production build, and browser visual QA pass.

## Scope

- New `CommonDenominatorLab` component, styles, and pure model
- Fraction-sector entry and dev-only QA route
- Focused tests and task documentation

## Non-goals

- No reward/ledger policy changes in this task unless separately requested.
- No replacement or modification of the existing equivalent-fraction experience.

## Delivered

- Added `통분 렌즈 연구소` as a separate experiential-learning card in the fraction sector; the existing `분수 겹침 렌즈` remains independent.
- Built a synchronized two-card lens interaction that reveals the least common denominator as a shared unit-room size.
- Added live factor explanations, converted-fraction inputs, and a follow-up `<`, `=`, `>` comparison step.
- Added eight missions covering divisible denominators, coprime denominators, and denominators with non-trivial common factors.
- Added local completion persistence, a dev-only QA route, responsive styling, reduced-motion handling, and a pure calculation model.

## Verification

- `node scripts/test-common-denominator-lab.mjs` — passed.
- `npx eslint src/components/Space/CommonDenominatorLab.jsx src/components/Space/commonDenominatorLabModel.js scripts/test-common-denominator-lab.mjs` — passed.
- `npm run build` — passed; only the repository's existing Frontier-audio documentation and chunk-size warnings were emitted.
- Browser QA at `/dev/common-denominator-lab` — passed for the full first-mission flow: overlay both lenses, enter `3/6` and `4/6`, choose `<`, save completion, and unlock/open mission 2.
- Desktop visual QA — passed for the separated cards, synchronized grids, common-room indicator, and compact answer panel.
- Narrow-screen behavior is covered by component media queries; no separate physical mobile-device run was performed in this task.

## Refinement requested 2026-09-17

- Make both visual fraction cards square so equal unit fractions have visibly equal area.
- Increase subdivision-line contrast.
- Replace ambiguous room metaphors and every visible slash-style fraction with stacked fraction notation.
- Explain that the denominator tells how many equal parts divide the whole, including why the first pair is subdivided by factors 3 and 2.

## Refinement delivered 2026-09-17

- Both paper cards now use a true square aspect ratio on desktop and narrow layouts.
- Base divisions and overlaid subdivision lines have higher contrast without darkening the colored fraction area.
- Visible slash notation was removed from the lab, including progress, transformed fractions, and the unit-fraction indicator; all mathematical fractions use stacked numerator/bar/denominator rendering.
- Replaced `같은 한 방` and `두 카드가 만나는 방 수` with `두 카드의 한 칸 크기` and `공통으로 나눈 전체 칸 수`.
- Added a denominator concept guide above the cards and a card-local subdivision reason. In the first mission it explicitly links the opposite denominators to 3-way and 2-way subdivision; later missions accurately use the least-common-denominator factor when the denominators share factors.
- Re-ran the focused model/integration test, focused ESLint, `git diff --check`, production build, and narrow-browser visual QA before and after overlaying the lenses.
- Follow-up: enlarged and centered the shared unit fraction, and removed double grid lines by replacing overlapping base/lens/cell borders with one final grid layer after snapping.
- Follow-up: removed the `이미 만나는 분모` / one-lens-unchanged concept and all non-coprime denominator pairs. Every mission now subdivides both cards using the opposite denominator, so the final unit cells have the same area and the same rectangular shape up to rotation.

## Deployment

- Commit `7223c3c1` was pushed to `origin/main` and deployed to Firebase Hosting at `https://math-sense-1f6a8.web.app`.
- Each mission records completion and grants 10 crystals only after both equivalent fractions and the comparison are correct; the server ledger prevents duplicate rewards.
- Production returned HTTP 200 for the exact `CommonDenominatorLab-CWgxA5E9.js` and shared reward-notice bundles produced from the clean deployment worktree.
- Remaining optional check: authenticated student completion smoke test against Firestore history and reward-ledger documents.
