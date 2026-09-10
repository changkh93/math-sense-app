# 우주 방어대 (Space Invaders) 커리큘럼 02차 수정 작업 보고서

[CODEX RETURN]
작업 ID: 20260909-space-invaders-curriculum/02
사용한 앱/모델/추론 설정: Antigravity / Gemini 3.8 Flash (High 추론)
상태: 완료
변경 파일 및 실제 산출물 개수:
- 총 산출물: Data Log 10개 (`01.md`~`10.md`), 체크포인트 25개 (`01-A.py`~`10-C.py` 24개 + `final-main.py`), 누적 편집 매니페스트 `draft/edits.json`, 커리큘럼 매니페스트 `draft/manifest.json`, 평가 문항 `draft/assessments.json` (Code Trace 29개, 퀴즈 100개), 개정 검수 보고서 `draft/REVIEW.md`, 수락 검증 로그 `draft/verification/gameplay-acceptance.txt`, 자동화 검증 도구 7개 (`draft/tools/`).
- 변경 및 생성 파일: `draft/checkpoints/*` (25개), `draft/data-log/*` (10개), `draft/manifest.json`, `draft/assessments.json`, `draft/edits.json`, `draft/REVIEW.md`, `draft/verification/gameplay-acceptance.txt`, `draft/tools/*` (7개), `02-antigravity-report.md`. (앱 소스, DB, scripts, verify-gameplay.py 등 외부 영역은 일체 미변경 유지)

R1–R4 실행 오류 수정 결과:
- R1 (최종 점수 보존 및 Enter 재시작): `reset_game()`에서 `start_new_round()` 호출을 제거하고 `pause_game(f'최종 점수: {self.score}', ...)`와 `self.state = 'game_over'`만 설정하여 최종 점수가 Enter 전까지 유지되도록 수정. Enter 입력 시 `restart_game()`을 통해 점수 0, 라운드 1, 생명 5, 양쪽 탄환 비우기 및 새 55기 편대를 소환하도록 분리 완료.
- R2 (동일 프레임 상태 가드): `Mission.update()` 내부의 `shift_raiders()`, `check_collisions()`, `check_round_completion()` 호출 사이에 `if self.state != 'playing': return` 가드를 배치하여, 침범(paused)이나 피격/사망(game_over) 발생 시 즉시 후속 충돌 및 라운드 클리어 처리를 차단함. 마지막 적 격추와 마지막 생명 피격이 동시 발생해도 100점 획득 후 안전하게 게임오버 상태와 점수가 보존됨.
- R3 (라운드 전환 탄환 정리 및 보너스): `check_round_completion()`에서 `self.scout_pulses.empty()`, `self.raider_pulses.empty()`로 양쪽 탄환을 완전히 비우고, 라운드 증가 전 현재 라운드 기준(`1000 * self.round_number`)으로 보너스 점수를 가산한 뒤 55기 새 편대를 소환하도록 수정 완료.
- R4 (양쪽 경계 보정 clamp): `Scout.update()`에서 이동 후 `if self.rect.left < 0: self.rect.left = 0`, `if self.rect.right > SCREEN_WIDTH: self.rect.right = SCREEN_WIDTH`로 화면 양끝 경계 보정(clamp)을 구현하여 임의의 속도(velocity=8, 임시 7 등)에서도 화면 밖으로 기체가 삐져나가지 않도록 완벽 해결.

03/09 순서 및 Data Log 세분화 결과:
- 02단원: 5개 클래스 선언부에 빈 pass가 아닌 구체적인 메서드 pass 뼈대(`__init__`, `update`, `fire`, `reset` 등)를 사전 배치하여 후속 단원의 교체 닻(anchor) 확립.
- 03단원: 그룹/객체/탄환 전달/update·draw 연결을 먼저 작성하고 Scout 이미지 로딩, 좌우 이동 및 clamp 보정, Scout.reset() 단위 검증 순서로 개편.
- 06단원: 임시 10기 편대 배치 후 `< SCREEN_HEIGHT` 부등호 오류를 의도적으로 관찰하여 발사 즉시 탄환이 소멸되는 현상을 확인하고, `> SCREEN_HEIGHT`로 올바르게 복원하는 진단 단계 복원.
- 07단원: 07-A(HUD/방어선/폰트), 07-B(임시 편대 제거 및 55기 편대 생성), 07-C(start_new_round 호출)의 3단계로 분리하여 Mission 객체 중복 생성 버그 방지.
- 08단원: 편대 벽 반전, 라운드 비례 하강(`10 * round_number`), 방어선 침범 구현 후, 임시 30라운드 설정으로 수 분 기다림 없이 신속히 침범을 검증하고 1라운드로 안전하게 복원하는 지침 완성.
- 09단원: `check_game_status`의 비상 정돈(탄환 비우기/기체 원위치/생명 차감/분기)을 먼저 작성한 후 `pause_game` 및 반투명 오버레이를 구현하고, `running = True`부터 루프 끝까지 메인 루프 전체 교체 코드를 제공하여 draw는 매 프레임, update는 playing일 때만 실행하는 상태 머신 완성.
- 10단원: 게임오버 리셋(`reset_game`, `restart_game`)을 먼저 구현하여 안전망을 확보한 뒤 충돌 검사(`check_collisions`) 및 전멸/보너스(`check_round_completion`)를 순차 완성.

누적 편집 재현 파일/검증 결과:
- `draft/edits.json`: 24개 단계 전환 전체에 대해 고유한 `before`/`after` 문자열 교체 블록과 `replaceAll` 전체 교체 모드, `experiment`/`restore` 임시 시험값 추적 필드를 완비하여 Codex가 프로그래밍 방식으로 01-A부터 10-C까지 100% 재현 가능하도록 구축.
- 검증 결과: `draft/tools/verify_all.py` 및 `generate_edits.py`를 통해 모든 대상 체크포인트와 매핑 확인 완료.

7개 게임 검사의 실제 결과와 로그 경로:
- 실행 파일: `docs/collaboration/tasks/20260909-space-invaders-curriculum/verify-gameplay.py`
- 검증 결과: 7개 테스트 전원 통과 (`Ran 7 tests in 6.559s, OK`)
  - test_game_over_preserves_final_score_until_enter ... ok
  - test_last_enemy_and_last_life_same_frame_keeps_game_over ... ok
  - test_movement_clamps_both_edges_after_step (좌/우 subtest 포함) ... ok
  - test_multiple_kills_score_each_enemy ... ok
  - test_new_wave_clears_old_bullets_and_awards_current_round_bonus ... ok
  - test_two_bullet_limit_and_offscreen_cleanup ... ok
  - test_update_stops_when_breach_pauses_game ... ok
- 실제 로그 저장 경로: `docs/collaboration/tasks/20260909-space-invaders-curriculum/draft/verification/gameplay-acceptance.txt`

평가 정답/2–8줄/100문항 검증 결과:
- Code Trace 정답 라인 수: 10개 유닛 총 29개 문항 전원 최소 2줄 ~ 최대 8줄 규칙 100% 준수 (01차 검수에서 지적된 4개 위반 문항 완전 해소: 03 reset 3줄, 06 fire 4줄, 09 비상정돈 8줄, 10 충돌 5줄).
- 퀴즈 문항: 총 100문항 (유닛당 정확히 10문항), 모든 문항 4개 선택지 / 1개 정답(`isCorrect: true`), 정답 번호 0~3 균등 분배 완료.
- 사실 오류 전면 수정: 1/1001 확률(1001개 중 1개, 평균 ~16.7초), `.mspygame.json` 단일 백업 형식, 브라우저 정지 vs 창 닫기 구분, 도현체 TTF 폰트 번들링 이유 명시, 퀴즈 10-10을 동시 충돌/상태 결과 예측 문항으로 교체 완료.

미검증 항목 및 남은 문제:
- 헤드리스(SDL dummy) 환경 외 실제 웹 브라우저 캔버스 상에서의 실시간 조작 체감 및 WebAudio 다채널 사운드 청음은 로컬 CLI 환경 특성상 검증하지 못함.
- 앱 통합 및 운영 Firestore DB(`codeExercises`, `quizzes`) 등록은 Codex 소관 업무로 남아 있음.
[/CODEX RETURN]
