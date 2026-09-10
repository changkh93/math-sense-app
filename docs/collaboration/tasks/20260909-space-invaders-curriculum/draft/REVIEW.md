# 우주 방어대 (Space Invaders) 02차 개정 검수 보고서 (REVIEW)

- **작업 ID**: `20260909-space-invaders-curriculum/02`
- **작업 대상**: 파이썬 > 게임 프로젝트 > 우주 방어대 (Space Invaders) 10유닛 커리큘럼
- **작성자**: Antigravity / Gemini 3.8 Flash (교육 콘텐츠 집필 담당)
- **수정 기준 커밋**: `9da58446475546b67435f0980174d75443d57682`
- **조정 및 통합 담당**: Codex

---

## 1. 01차 실패 판정 원인 및 02차 조치 결과 요약

Codex의 01차 검수 판정(`NEEDS_REVISION`)에서 지적된 4대 런타임 오류(R1~R4), 강의 순서 불일치, 누적 편집 모호성, 평가 문항 줄 수 및 사실 오류를 전면 재작성하여 해결하였습니다.

| 항목 | 01차 상태 (실패 원인) | 02차 조치 및 해결 내용 | 검증 증거 |
| :--- | :--- | :--- | :--- |
| **R1. 최종 점수 유지 및 재시작 분리** | `reset_game` 내부에서 `start_new_round`를 즉시 호출하여 `paused`로 덮어씌워져 최종 점수 렌더링 프레임이 증발함 | `reset_game`은 최종 점수 문구와 `game_over` 상태만 설정하고 반환. Enter 키 입력 시 `restart_game()`을 호출하여 새 게임(점수0, 라운드1, 생명5, 55기 편대)을 시작하도록 완전 분리함 | `test_game_over_preserves_final_score_until_enter` PASS |
| **R2. 동일 프레임 상태 가드** | `Mission.update`가 상태 전이 후에도 후속 메서드를 무조건 실행하여 피격/게임오버 후 라운드 완료가 덮이는 결함 | `shift_raiders`, `check_collisions`, `check_round_completion` 호출 사이에 `if self.state != 'playing': return` 가드를 배치하여 즉시 후속 검사 차단함 | `test_update_stops_when_breach_pauses_game`, `test_last_enemy_and_last_life_same_frame_keeps_game_over` PASS |
| **R3. 라운드 전환 시 탄환 정리 및 보너스** | 이전 라운드의 아군/적 탄환이 잔존한 채 새 편대가 출격함 | `check_round_completion`에서 `scout_pulses.empty()`, `raider_pulses.empty()`로 양쪽 탄환을 완전히 비우고, 현재 라운드 기준(`1000 * round_number`) 보너스 지급 후 라운드를 증가시킴 | `test_new_wave_clears_old_bullets_and_awards_current_round_bonus` PASS |
| **R4. 양쪽 경계 보정 (Clamp)** | 이동 전 검사로 인해 속도(8)에 따라 `left`가 -7, `right`가 1207로 경계 초과 발생 | 이동 후 `if self.rect.left < 0: self.rect.left = 0`, `if self.rect.right > SCREEN_WIDTH: self.rect.right = SCREEN_WIDTH`로 양쪽 벽을 강제 고정(clamp)함 | `test_movement_clamps_both_edges_after_step` PASS (좌/우 서브테스트 2개 모두 통과) |
| **강의 순서 복원** | 02 pass 부족, 03 순서 역전, 06 오류 미관찰, 07 중복 생성, 08 대기 지연, 09 순서 역전, 10 순서 불일치 | 02단원 메서드 pass 뼈대 복원, 03단원 그룹 연결/Scout/이동 보정/reset 순서 확립, 06단원 `<` 오류 직접 관찰 및 `>` 복원, 07단원 3단계 분리 및 단일 생성 블록 정리, 08단원 임시 30라운드 빠른 침범 시험 후 복원, 09단원 `check_game_status` 선행 및 루프 전체 교체, 10단원 리셋 선행 확립 | 10개 Data Log 및 24개 체크포인트 코드 동기화 완료 |
| **평가 문항 규격 (2~8줄)** | Code Trace 4개 문항이 1줄(2개) 또는 9줄(2개)로 규칙 위반 | 03 위치 reset(3줄), 06 fire(4줄), 09 비상 정돈(8줄), 10 충돌(5줄)로 전면 개편. 29개 전체 Code Trace가 2~8줄 범위 엄격 준수 | `verify_all.py` 검사 0 violations PASS |
| **사실 오류 및 퀴즈 교정** | 1/1001 확률 조건, `.mspygame.json` 파일 형식, 10-10 자기평가성 문항 등 | 1/1001 확률(1001개 중 1개, 평균 ~16.7초), `.mspygame.json` 백업 형식, 브라우저 정지 vs 창 닫기 구분, 퀴즈 10-10을 동시 충돌 결과 예측 문항으로 교체 | 퀴즈 100문항 4선1택/정답1개/해설 정합성 완료 |
| **누적 편집 재현성** | 수동 변경 지시의 모호성으로 누적 적용 시 충돌 위험 | `draft/edits.json`에 24개 단계별 고유 `before`/`after` 교체 문자열, `replaceAll` 모드, `experiment`/`restore` 블록 명시 | `draft/edits.json` 생성 및 유효성 검증 완료 |
| **재현 가능한 도구 보존** | scratch 폴더의 개인 스크립트만으로 검증 주장 | 모든 생성기 및 검사기를 `draft/tools/` 폴더에 영구 보존함 | `draft/tools/` 7개 스크립트 배치 완료 |

---

## 2. 체크포인트 및 단계 매핑 구조

- **총 유닛 수**: 10개 (`si01` ~ `si10`)
- **총 실행 지점 (단계 수)**: 24개
- **총 체크포인트 파일 수**: 25개 (24개 단계 체크포인트 + 최종 완성본 `final-main.py`)

```text
Unit 01: 01-A (Pygame init 및 버전 확인)
Unit 02: 02-A (창 생성 및 메인 루프) -> 02-B (배경색 변경) -> 02-C (5대 클래스 메서드 pass 뼈대)
Unit 03: 03-A (그룹 연결 및 Scout 출격) -> 03-B (이동 및 clamp 경계 보정) -> 03-C (Scout.reset 및 단위 시험)
Unit 04: 04-A (Pulse 및 발사 연결) -> 04-B (2발 제한 관찰) -> 04-C (상단 kill 소멸 처리)
Unit 05: 05-A (Raider 클래스, 속도/방향/1/1001 확률 발사/reset)
Unit 06: 06-A (임시 10기 드론 배치) -> 06-B (RaiderPulse 및 하향 발사) -> 06-C (< 부등호 진단 관찰 및 > 복원)
Unit 07: 07-A (Mission 초기화, Dohyeon 폰트, HUD/방어선) -> 07-B (임시 편대 삭제, 55기 생성, 단일 인스턴스) -> 07-C (55기 출격 호출)
Unit 08: 08-A (편대 기동, 10*round 하강, 침범 감지) -> 08-B (30라운드 빠른 침범 시험 및 복원)
Unit 09: 09-A (check_game_status 선행, pause_game, 루프 전체 교체) -> 09-B (Enter 키 재개 연결)
Unit 10: 10-A (reset_game, restart_game, Enter 분기) -> 10-B (충돌 검사 및 상태 가드) -> 10-C (전멸 판정, 라운드 보너스, 새 라운드 완성)
Final: final-main.py (10-C와 동일한 최종 실행본)
```

---

## 3. 검증 결과 보고

### 3.1 로컬 Pygame 게임플레이 수락 검사 (`verify-gameplay.py`)
- **실행 명령**: `python3 docs/collaboration/tasks/20260909-space-invaders-curriculum/verify-gameplay.py`
- **환경**: macOS, Python 3.12.3, Pygame 2.4.0 (SDL dummy 드라이버 헤드리스 모드)
- **결과**: **7개 테스트 전원 통과 (OK)**
- **보존 로그 경로**: `draft/verification/gameplay-acceptance.txt`
- **테스트 항목 세부 결과**:
  1. `test_game_over_preserves_final_score_until_enter`: 생명 0 시 `state == 'game_over'` 유지 및 최종 점수(700) 렌더링 텍스트 보존 확인 -> **PASS**
  2. `test_last_enemy_and_last_life_same_frame_keeps_game_over`: 마지막 적 격추(+100점)와 마지막 생명 피격이 동시 발생 시 `state == 'game_over'`, 1라운드 유지, 100점 보존 확인 -> **PASS**
  3. `test_movement_clamps_both_edges_after_step`: 속도 8 이동 후 좌측(left >= 0), 우측(right <= 1200) 경계 보정 서브테스트 2건 모두 확인 -> **PASS**
  4. `test_multiple_kills_score_each_enemy`: 1발로 2기 동시 격추 시 200점(100 * 2) 가산 및 적기 제거 확인 -> **PASS**
  5. `test_new_wave_clears_old_bullets_and_awards_current_round_bonus`: 전멸 시 양쪽 탄환 0 비우기, 2라운드 보너스(+2000) 합산(2100점), 3라운드 진입, 새 55기 생성 확인 -> **PASS**
  6. `test_two_bullet_limit_and_offscreen_cleanup`: 3회 발사 시 2발 제한 확인, 상단 이동 후 0발 소멸 확인, 재발사 확인 -> **PASS**
  7. `test_update_stops_when_breach_pauses_game`: 침범으로 paused 전환 시 동일 프레임의 check_collisions, check_round_completion 미호출(차단) 확인 -> **PASS**

### 3.2 정적 구조 및 산출물 전수 검사 (`draft/tools/verify_all.py`)
- **Python AST 파싱**: 25개 체크포인트 파일 전원 구문 오류 없음 (**25/25 PASS**).
- **매니페스트 구조**: 10유닛, 24단계, 25체크포인트 파일 경로 및 데이터로그 파일 연결 일치 확인 (**PASS**).
- **Code Trace 정답 줄 수**: 29개 문항 전원 최소 2줄 ~ 최대 8줄 범위 준수 확인 (위반 문항 0건, **29/29 PASS**).
- **퀴즈 구조 및 선택지**: 100개 문항 전원 선택지 4개, 정답 1개(불리언 true 1개), 해설 완비 확인 (**100/100 PASS**).
- **누적 편집 정의**: `draft/edits.json`의 24단계 교체 블록 구조 무결성 확인 (**PASS**).
- **데이터로그 완결성**: 10개 Data Log 파일 전원 8개 교육 계약 요소 및 학생 점검 체크리스트(`[ ]`) 포함 확인 (**10/10 PASS**).

---

## 4. 검증 범위와 한계 (미검증 항목 명시)

Codex의 검수 원칙에 따라, 실제로 실행하여 검증한 사실과 검증하지 않은 영역을 명확히 구분합니다.

### 실제 검증 완료된 항목:
1. 로컬 헤드리스 Pygame(SDL dummy) 환경에서 `verify-gameplay.py`의 7개 게임플레이 규칙 테스트 통과.
2. 25개 체크포인트의 Python AST 파싱 및 문법 무결성.
3. 29개 평가 문항의 2~8줄 제약 및 100개 퀴즈 구조/정답 유일성 검사.
4. `draft/edits.json` 및 `draft/manifest.json`과 체크포인트 파일 간의 1:1 매핑 일치.

### 로컬 환경의 한계로 검증하지 못한 항목 (Codex 및 웹 환경 연동 필요):
1. **메타센스 웹 브라우저 런타임 실시간 실행**: Pyodide / WebAssembly 기반 브라우저 캔버스에서의 60FPS 프레임 유지율 및 입력 지연.
2. **실시간 오디오 청음 검증**: 6종 사운드(WAV)의 실제 스피커 음향 밸런스 및 다중 채널 동시 출력 체감 (헤드리스 환경에서는 더미 오디오 드라이버로 모킹됨).
3. **2인 배틀 소켓 연동**: 본 패킷은 싱글 플레이 게임 프로젝트 콘텐츠이므로 실시간 2인 대전 소켓 환경은 포함되지 않음.
4. **운영 DB 등록 및 웹 UI 마운트**: `codeExercises`, `quizzes` 컬렉션의 실제 Firestore 등록 및 학생 진도 연동 (Codex 후속 작업).

---

## 5. Codex 통합 가이드

1. **에셋 및 경로**:
   - `assets/images/scout.png`, `assets/images/raider.png`
   - `assets/fonts/Dohyeon.ttf`
   - `assets/sounds/` (scout_pulse.wav, raider_pulse.wav, raider_break.wav, shield_hit.wav, breach.wav, new_round.wav)
2. **DB 스키마 매핑**:
   - `draft/assessments.json`의 각 유닛별 `exercises`는 앱의 최상위 `codeExercises` 컬렉션에 `unitId` 외래키로 등록됩니다.
   - `quizzes` 역시 최상위 `quizzes` 컬렉션에 `unitId` 외래키로 등록되며, 선택지 및 해설 필드가 표준 규격과 호환됩니다.
3. **체크포인트 파일 보존**:
   - `draft/checkpoints/` 안의 25개 파일은 학생이 단계별로 막혔을 때 '정답 코드 보기' 및 '이전 상태 복원'용 기준 소스로 활용됩니다.
