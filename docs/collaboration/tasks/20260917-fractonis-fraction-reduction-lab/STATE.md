# Fractonis fraction-reduction lab

- Task ID: `20260917-fractonis-fraction-reduction-lab`
- Owner: Codex (local implementation; no external relay)
- Phase: DONE_LOCAL
- Baseline: shared dirty worktree; preserve unrelated changes

## Original goal

Create a precise, creative interactive fraction-reduction tool where each square fraction building has a fixed common-factor-derived floor structure. Students observe whether every vertical set can merge into one floor, while candidate clicks never redraw the model.

## Acceptance criteria

- Add a separate `약분 묶음 연구소` card in the fraction-sector experiential-learning area.
- Each mission fixes the square building geometry before interaction: columns equal the intended common factor, rows equal the resulting denominator.
- The first view shows only the original fraction cells and shading. Selecting a candidate overlays grouping lines without changing or hiding any source cell boundary.
- Invalid candidates visibly show every complete candidate group and highlight the leftover source cell; valid candidates keep the original fraction intact under the grouping lines while the simplified building appears alongside it.
- Invalid candidates visibly leave an ungrouped building cell and explain why the whole cannot be rebuilt from equal-size larger rooms.
- Valid candidates enable quotient inputs for numerator and denominator, followed by an explicit compression action.
- Multi-step reductions continue until no common factor greater than one remains, with a visible fraction history.
- All mathematical fractions use stacked fraction notation.
- Eighteen guided missions include irreducible fractions, fractions with several common divisors, and fractions that can be reduced across multiple steps; local progress persistence, keyboard-usable controls, reduced-motion support, and responsive layouts are included.
- Focused model/integration tests, lint, production build, and browser visual/interaction QA pass.

## Scope

- New reduction-lab component, styles, pure model, focused tests, fraction-sector entry, and dev QA route.

## Non-goals

- No reward/ledger changes, deployment, or production data writes unless separately requested.

## Delivered

- Added a separate `약분 묶음 연구소` entry to the fraction-sector experiential-learning area and a dev QA route at `/dev/fraction-reduction-lab`.
- Expanded the sequence to eighteen missions. Four missions ask students to identify an already irreducible fraction, while multiple missions offer three or more valid common-factor paths and continue until the fraction is irreducible.
- Replaced the detached natural-number token rails after review: all grouping now happens inside one square fraction-building model.
- The opening missions are now `2/10` and `6/9`. `2/10` is always drawn as two vertical cells per floor across five floors, then merges to `1/5`; `6/9` is always drawn as three vertical cells per floor across three floors, then merges to `2/3`.
- The irreducible `2/7` mission no longer borrows a two-column layout from `2/8`. Its square is divided horizontally into exactly seven equal denominator cells with only the first two cells shaded. Numeric candidates overlay groups without redrawing those seven cells, and a full-width “동시에 나눌 수 있는 수가 없어요” answer lets students identify that the only common factor is 1.
- Candidate-number clicks no longer reconfigure the square. The initial model has no grouping overlay; choosing 2 on `6/9` adds four two-cell outlines and one coral leftover cell, while choosing 3 adds three three-cell outlines over the unchanged 3×3 source model and shows `2/3` on the right.
- Valid grouping outlines use one fixed dark-violet dashed stroke with no color-cycling animation, remaining distinct on both the teal shaded cells and the cream unshaded cells. The outlines render above the base frame, so every group is visibly closed along the large square's outer perimeter as well as its internal boundaries.
- Valid choices show the simplified large-room building beside the source building and unlock quotient inputs. Correct inputs unlock an explicit room-conversion action. The visible fraction history continues until no further grouping is possible.
- Validation accepts every actual common divisor rather than only one recommended divisor. For example, `12/18` may begin with 2, 3, or 6; choosing 2 produces `6/9`, then choosing 3 continues to the irreducible fraction `2/3` without prematurely completing the mission.
- After each valid reduction, the next source building is rebuilt from the new fraction's greatest common divisor, so the fixed-cell grouping model remains meaningful through multi-step reduction.
- Added local progress persistence, stacked fraction notation, keyboard-native controls, mobile layouts, and reduced-motion behavior.

## Verification

- `npm run test:fraction-reduction-lab` — passed.
- `npx eslint src/components/Space/FractionReductionLab.jsx src/components/Space/fractionReductionLabModel.js scripts/test-fraction-reduction-lab.mjs` — passed with no warnings or errors.
- In-app browser at `/dev/fraction-reduction-lab` — verified the first `6/9` view contains 9 source cells, 0 grouping paths, and 0 leftovers. Selecting 2 keeps all nine source-cell coordinates byte-for-byte unchanged, adds four two-cell grouping paths and one highlighted leftover cell, and blocks simplification. Selecting 3 again keeps all nine source cells unchanged, adds three three-cell grouping paths with no leftover, and shows the three-cell `2/3` result building on the right.
- In-app browser visual QA — verified the violet dashed outlines are clearly visible across teal and cream cells and remain visible around the top, bottom, left, and right outer edges of the source square.
- In-app browser visual/interaction QA for `2/7` — verified the initial source is one column of seven equal cells with two shaded; choosing 2 keeps all seven cells, overlays three two-cell groups and one leftover, and blocks simplification; choosing “동시에 나눌 수 있는 수가 없어요” preserves `2/7` and enables the irreducible-fraction confirmation.
- In-app browser multi-step QA for `12/18` — verified choosing 2 is accepted as a correct common divisor, produces `6/9`, keeps the mission active, then accepts 3 and records the complete history `12/18 = 6/9 = 2/3` before marking the mission complete.
- `npm run build` — passed. Existing audio-manifest documentation/provisional notices and chunk-size warnings remain informational.

No commit, push, deployment, reward integration, or production data write was performed.
