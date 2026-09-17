# Fractonis equivalent-fraction lab

- Task ID: `20260917-fractonis-equivalent-fraction-lab`
- Owner: Codex (local implementation; no external relay)
- Phase: DEPLOYED_AND_VERIFIED
- Baseline: `a0475b61`
- Workspace: shared dirty worktree; preserve unrelated changes

## Goal

Add a student-facing interactive experience to the fraction planet where a paper fraction card and a transparent divider card can be overlaid to discover why equivalent fractions have the same size.

## Acceptance criteria

- The fraction sector shows a distinct `NEW · 체험 학습` entry below its ordinary chapter cards.
- Students can drag or automatically slide a transparent card over a shaded paper fraction card.
- The visual grid, shaded count, and equation stay synchronized: both numerator and denominator are multiplied by the same factor while the represented amount stays fixed.
- A guided sequence includes at least six age-appropriate observation-and-answer missions.
- A free-observation mode lets students change the base fraction and overlay factor.
- Keyboard/touch access, reduced-motion behavior, and narrow-screen layouts remain usable.
- Domain tests, a production build, and a browser visual check pass.

## Scope

- `src/components/Space/EquivalentFractionLab*`
- `src/components/Space/equivalentFractionLabModel.js`
- Fraction-sector entry and dev-only QA route
- Focused tests and verification artifacts

## Non-goals

- No new reward/backend policy in this task unless separately requested.
- No changes to ordinary fraction curriculum content.

## Delivered

- Fraction-sector `NEW · 체험 학습` entry: `분수 겹침 렌즈`
- Direct drag, range control, and automatic overlay for the transparent divider card
- Synchronized shaded grid and same-factor numerator/denominator explanation
- Six sequential guided discoveries with saved local progress
- Free observation controls for denominator 2–8, numerator, and overlay factor 2–5
- Desktop/tablet/mobile responsive layout and reduced-motion handling
- Single-source grid dividers so a fully overlaid card shows each line only once
- Crisp snapped-card rendering without backdrop blur, plus a compact centered answer equation
- Dev QA route: `/dev/equivalent-fraction-lab`

## Verification

- `node scripts/test-equivalent-fraction-lab.mjs` — passed
- focused ESLint for new model/component/test — passed
- focused `git diff --check` — passed (repository fsmonitor emitted its existing IPC warning only)
- `npm run build` — passed; existing chunk-size and frontier provisional-audio warnings remain
- In-app browser desktop and 390×844 mobile QA — passed
  - guided `1/2 → 3/6` overlay, input, validation, and next-mission unlock
  - free observation `2/5 × 4 → 8/20`
  - fully overlaid paper/transparent cards render single, aligned divider lines
  - snapped shading remains crisp; compact answer fields and the equals sign stay centered
  - the answer-panel equals sign uses its own stable alignment class and sits on the fraction bar
  - no browser console errors or warnings

## Next

- Commit `7223c3c1` was pushed to `origin/main` and deployed to Firebase Hosting at `https://math-sense-1f6a8.web.app`.
- Each guided mission now records `interactive_learning` completion and grants 10 crystals only on its first lifetime success through the idempotent server ledger.
- Production returned HTTP 200 for the exact `EquivalentFractionLab-BHHuHDNi.js` and shared reward-notice bundles produced from the clean deployment worktree.
- Remaining optional check: authenticated student completion smoke test against Firestore history and reward-ledger documents.
