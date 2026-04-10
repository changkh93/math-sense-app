# ☄️ Streak System (연속 학습 시스템) — 운영 기준 문서

## 구현 완료 날짜
2026-02-19

## 최종 업데이트
2026-04-06

## 시스템 개요
매일 1회 이상 학습 완료 기록이 있으면 "연속 항해 일수"가 누적됩니다.
Duolingo의 Streak와 유사하지만, 앱 세계관에 맞춰 **혜성 엔진(Comet Engine)** 테마를 적용합니다.

현재 운영 기준은 아래와 같습니다.

- `currentStreak`는 **실제 학습 완료일(active day)** 수만 셉니다.
- `streak_freeze`(크라이오 코어 방어일)는 **연속성은 유지하지만 streak 숫자를 증가시키지 않습니다.**
- 랭킹/헤더/Journey/Admin 복구는 가능한 한 동일한 공용 계산 로직을 사용합니다.
- `quiz_in_progress`(예: 다크 매터 4/6문항 진행 중)는 **일일 활동 피드에는 보일 수 있지만 streak 완료 조건은 아닙니다.**

---

## Phase 1: Core Streak Engine ✅

### 1.1 `streakUtils.js` — 순수 함수 유틸리티
- `getTodayKST()` / `getYesterdayKST()` — KST 기준 날짜 계산
- `getCometTier(streak)` — 5단계 혜성 등급 시스템
  - `inactive (0)` → `ignition (1+)` → `acceleration (7+)` → `stellarwind (14+)` → `supernova (30+)` → `galactic (100+)`
- `calculateStreakUpdate(userData)` — 런타임 갱신 로직
  - 오늘 이미 학습 → 변경 없음
  - 어제 학습함 → currentStreak + 1
  - 하루 이상 빠짐 + Freeze 보유 → 방어일 소모 후 currentStreak + 1
  - 그 외 → 1로 초기화
- `calculateStreakFromHistory(activeDates, defendedDates)` — 이력 재계산
- `recalculateStreakState(activeDates, coreEvidenceDates)` — 관리자 복구/배치 복구용 단일 엔진
- `extractLearningActivityDates(historyEntries, transactions)` — 학습일 추출 공용 함수
  - `history`
  - `quiz_reward`, `quiz_penalty`
  - `transmission_reward`, `data_log_reward`
- `getCurrentGapDefendedDates(lastActiveDate, freezeCount)` — 현재 공백 구간이 코어로 방어 가능한지 판정
- `getEffectiveStreak(userData, historyData?)` — UI 표시용 유효 streak 계산
  - 오늘/어제 학습이면 표시
  - 현재 공백 구간이 보유 코어로 방어 가능해도 표시

### 1.2 `useAuth.js` 수정
- 사용자 데이터 기본값에 스트릭 필드 추가:
  - `currentStreak: 0`
  - `longestStreak: 0`
  - `lastStreakDate: ""`
  - `streakFreezeCount: 0`
  - `streakMilestones: []`

### 1.3 `SpaceHome.jsx` — handleComplete 통합
- calculateStreakUpdate() 호출
- setDoc merge에 streakUpdate 포함
- completionResult에 streakInfo 메타데이터 추가
- streakCelebration state로 마일스톤 모달 트리거
- 클라이언트 drift self-heal write 제거, audit-only 경고로 변경
- 코어 사용 시 `defendedDates`, `consumedFreezeCount`, `balanceBefore`, `balanceAfter`를 트랜잭션 metadata에 기록

### 1.4 2026-04-06 운영 안정화 패치 ✅

#### 단일 규칙으로 재정의
- 기존에는 런타임 계산, Journey 재구성, 관리자 복구, CLI 복구가 서로 다른 규칙을 사용했습니다.
- 현재는 "방어일은 streak 숫자를 늘리지 않는다"를 기준 규칙으로 통일했습니다.

#### 학습일 판정 기준 통합
- 기존 관리자 복구는 `history`만 보고 "정상"이라고 판정하는 누락이 있었습니다.
- 현재는 reward transaction만 남은 학습일도 복구 대상에 포함합니다.

#### 랭킹 표시 보정
- 기존 랭킹은 `lastStreakDate`가 오늘/어제가 아니면 0으로 숨겼습니다.
- 현재는 `streakFreezeCount`로 현재 공백 구간을 방어 가능한 경우 streak를 계속 표시합니다.

#### Journey 표시 보정
- `streak_freeze`만 있던 날이 활동일처럼 보이던 문제를 정리했습니다.
- 실제 학습 + 코어 사용이 동시에 있으면 `탐사항해 완료 + 코어 사용 기록`으로 분리 표기합니다.

#### 운영툴 복구 보강
- `StreakFixer`는 `currentStreak`, `lastStreakDate`, `streakFreezeCount`를 함께 보정합니다.
- CLI 복구 스크립트(`fix_streak_cores.mjs`)와 관리자 복구가 같은 엔진을 사용합니다.

---

## Phase 2: Comet Engine Visuals ✅

### 2.1 `CometBadge.jsx` + `CometBadge.css`
- 등급별 아이콘/컬러/글로우 표시
- `compact`, `mini`, `celebrating` 모드 지원
- 호버 시 등급 정보 툴팁
- 펄스 애니메이션 (is-active)

### 2.2 `SpaceNavbar.jsx` 수정
- 광석 카운터 좌측에 CometBadge 추가

### 2.3 `SpaceRanking.jsx` 수정
- 랭킹 리스트의 PILOT 이름 옆에 compact CometBadge 표시
- 관리자용 streak repair 기능을 공용 엔진 기반으로 보강
- 현재 공백 구간 방어 가능 streak도 숨기지 않도록 표시 로직 정정

### 2.4 `SpaceCollection.jsx` 수정
- 연속 학습 마일스톤 배지 5종 추가:
  - 항해의 시작 (3일), 궤도 진입 (7일), 항성풍 서퍼 (30일), 초신성 폭발 (100일), 영원한 항해사 (365일)

---

## Phase 3: Cryo Core (Streak Freeze) 경제 통합 ✅

### 3.1 `SpaceStore.jsx` 수정
- "항해 보호 장비" 카테고리 신설
- 크라이오 코어 (🧊) 구매 기능 구현
  - 가격: 100 광석
  - 최대 보유량: 3개
  - Firebase 실시간 차감/업데이트
  - 구매 성공/실패 알림 메시지

---

## Phase 4: Celebration & Calendar ✅

### 4.1 `StreakCelebration.jsx` + `StreakCelebration.css`

#### StreakCelebrationModal
- 마일스톤 달성 시 전체화면 축하 연출
- 등급별 테마 색상 적용
- 파티클 효과
- 7초 후 자동 닫기

#### StreakToast
- 일일 학습 완료 시 우상단 토스트
- Freeze 사용 알림 포함
- 4초 후 자동 닫기

#### StreakCalendar
- GitHub 잔디 스타일 90일 히트맵
- 요일 헤더 (일~토)
- 학습일 셀 글로우 + 호버 툴팁
- 통계: 현재 연속 / 최고 기록 / 크라이오 코어 / 총 학습일
- SpaceCollection(DATABASE) 내에 렌더링

---

## Firestore Schema

### `users/{uid}` 추가 필드
```
currentStreak:      number      // 현재 연속 일수
longestStreak:      number      // 역대 최고 기록
lastStreakDate:     string      // 마지막 학습일 (YYYY-MM-DD, KST)
streakFreezeCount:  number      // 보유 크라이오 코어 수
streakMilestones:   number[]    // 달성한 마일스톤 임계값 배열
```

### `users/{uid}/crystal_transactions/{txId}` — streak 관련 metadata
```ts
type === 'streak_freeze'

metadata: {
  unitId?: string
  streakBefore: number
  streakAfter: number
  defendedDates: string[]         // YYYY-MM-DD[]
  consumedFreezeCount: number
  balanceBefore: number
  balanceAfter: number
}
```

---

## 파일 목록

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/utils/streakUtils.js` | 핵심 계산 로직 |
| `src/components/Space/CometBadge.jsx` | 혜성 등급 뱃지 |
| `src/components/Space/CometBadge.css` | 뱃지 스타일 |
| `src/components/Space/StreakCelebration.jsx` | 축하 모달 + 토스트 + 캘린더 |
| `src/components/Space/StreakCelebration.css` | 축하 UI 스타일 |

### 수정 파일
| 파일 | 변경 사항 |
|------|-----------|
| `src/hooks/useAuth.js` | streak 기본값 추가 |
| `src/components/Space/SpaceHome.jsx` | streak 저장, activity 기반 drift audit, freeze metadata 기록 |
| `src/components/Space/SpaceNavbar.jsx` | CometBadge 추가 |
| `src/components/Space/SpaceRanking.jsx` | compact CometBadge, admin repair, effective streak 표시 보정 |
| `src/components/Space/SpaceJourney.jsx` | protected/active 동시 표기, freeze-only activity 오인 방지 |
| `src/components/Space/SpaceCollection.jsx` | 배지 5종 + StreakCalendar 추가 |
| `src/components/Space/SpaceStore.jsx` | 크라이오 코어 구매 기능 추가 |
| `src/pages/Admin/StreakFixer.jsx` | activity records 기반 무결성 검사/복구 |
| `fix_streak_cores.mjs` | 공용 엔진 기반 CLI 복구 |
| `scripts/test-streak-utils.mjs` | streak 회귀 테스트 |

---

## 마일스톤 임계값
| 일수 | 아이콘 | 설명 |
|------|--------|------|
| 3 | 🕯️ | 항해의 불씨 |
| 7 | 🔵 | 안정 궤도 진입 |
| 14 | 🟣 | 항성풍 순항 |
| 30 | 💫 | 초신성급 에너지 |
| 50 | ⭐ | 은하 항해 절반 |
| 100 | 🌌 | 전설의 항해사 |
| 200 | 👑 | 불멸의 탐험가 |
| 365 | 🏆 | 우주의 역사 |

## 보안 참고사항
- Firestore 규칙: 사용자 본인 문서만 read/write 가능 (기존 규칙 유지)
- 크라이오 코어 구매: 클라이언트 측 검증 + merge write
- 추후 Cloud Functions 이관 시 서버 사이드 검증 추가 예정

---

## 운영 메모 (2026-04-06)

### 완료로 인정되는 활동
- 퀴즈 완료(`history` 기록 생성)
- 영상 완료/보상 기록
- 데이터 로그 완료/보상 기록

### 아직 완료로 보지 않는 활동
- `learning_progress.quizSession`만 존재하는 진행 중 퀴즈
- 예: 다크 매터 `진행 중 4/6문항`

이 값은 관리자 "일일 학습 기록"에는 보일 수 있으나, 현재 streak 및 ranking 반영 기준은 아닙니다.
운영 화면에서는 이 항목을 "완료 학습"과 시각적으로 더 분리할 필요가 있습니다.
