# 20260917 interactive learning record rewards

## Goal

NEW · 체험 학습 네 종의 실제 완료를 일일 학습 기록에 남기고, 중복 없는 광석 보상을 지급하며, 초등수학 과제 평가·피드백 근거에 반영한다.

## Status

- Phase: DONE_LOCAL
- Baseline: `be1b8472`
- Working tree: shared and dirty; unrelated changes must remain untouched.
- Deployment: not requested in this turn.

## Decisions

- 보상은 하루 단위가 아니라 계정 전체의 `activityId + completionKey` 최초 성공 1회만 서버 transaction으로 지급한다.
- 카드 정답은 카드당 3광석, 세로셈 미션 완료는 미션당 10광석이다.
- 같은 항목의 복습은 날짜별 학습 기록에는 남지만, 날짜 없는 결정적 보상 원장으로 중복 지급을 차단한다.
- 카드 정답과 세로셈 완료 직후 광석 획득 아이콘과 금액을 표시한다.
- 일일 기록 타입은 `interactive_learning`, 광석 원장은 `interactive_learning_reward`이다.
- 초등수학(`cluster_elementary`) 연습 근거로만 인정하고 일반 퀴즈 점수와 분리한다.
- 앱 내부 광석은 과제 피드백 보너스에 재합산하지 않는다.

## Scope

- Firebase callable, 보상 정책 및 멱등 transaction
- 카드 정답 및 세로셈 완료 화면의 기록 요청과 즉시 보상 상태 표시
- 일일 학습 타임라인·집계
- 수동 export와 운영툴 단건 과제 피드백 경로
- `docs/manual-assignment-feedback-workflow.md`

## Verification

- `node --test functions/interactiveLearningRewardPolicy.test.cjs` — 4/4 passed, including lifetime reward ID vs. daily history ID separation.
- `node scripts/test-interactive-learning-rewards.mjs` — passed with per-card completion keys and 3/10 reward contract.
- Existing multiplication card, division card, vertical multiplication, and vertical division model tests — passed.
- `node scripts/test-phase9-course-isolation-matrix.mjs` — passed.
- `npm run test:learning-summary` — passed.
- `npm run build` — passed after immediate reward UI and deduplication changes (including prerender and guide build).
- `node --check` for callable/export/service files — passed.
- `npm --prefix functions run lint` remains unusable because the existing functions ESLint configuration reports CommonJS globals (`require`, `module`, `exports`) and 200+ pre-existing errors across the functions tree; the new policy tests and syntax checks pass.

## Result

- Card activities claim each correct fact, while vertical labs claim each completed mission; all show immediate saving/earned/already-rewarded/error feedback.
- The callable validates an allowlist and atomically updates balance, growth, daily history, and a lifetime-deduplicated reward ledger.
- Daily learning timeline groups interactive learning separately and reports completion count plus crystals.
- Both assignment-feedback data paths expose the same interactive learning fields, exclude them from quiz averages, and strip them outside elementary math.
- The manual assignment feedback workflow documents the data contract, rewards, interpretation, isolation, and no-double-reward rule.

## Remaining

- Deploy the callable and Hosting together when requested, then verify with an authenticated student account that a first success creates one daily history row and one lifetime reward ledger row, while a duplicate creates neither extra crystals nor an extra same-day history row.
