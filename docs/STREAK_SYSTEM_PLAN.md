# ☄️ Streak System (연속 학습 시스템) — 구현 완료 문서

## 구현 완료 날짜
2026-02-19

## 시스템 개요
매일 1회 이상 퀴즈 탐사(20문항 세션)를 완료하면 "연속 항해 일수"가 누적됩니다.
Duolingo의 Streak와 유사하지만, 앱 세계관에 맞춰 **혜성 엔진(Comet Engine)** 테마를 적용합니다.

---

## Phase 1: Core Streak Engine ✅

### 1.1 `streakUtils.js` — 순수 함수 유틸리티
- `getTodayKST()` / `getYesterdayKST()` — KST 기준 날짜 계산
- `getCometTier(streak)` — 5단계 혜성 등급 시스템
  - `inactive (0)` → `ignition (1+)` → `acceleration (7+)` → `stellarwind (14+)` → `supernova (30+)` → `galactic (100+)`
- `calculateStreakUpdate(userData)` — 핵심 갱신 로직
  - 오늘 이미 학습 → 변경 없음
  - 어제 학습함 → currentStreak + 1
  - 하루 빠짐 + Freeze 보유 → 자동 사용 + currentStreak + 1
  - 그 외 → 1로 초기화

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
| `src/components/Space/SpaceHome.jsx` | streak import, state, handleComplete 통합, 모달/토스트 렌더 |
| `src/components/Space/SpaceNavbar.jsx` | CometBadge 추가 |
| `src/components/Space/SpaceRanking.jsx` | compact CometBadge 추가 |
| `src/components/Space/SpaceCollection.jsx` | 배지 5종 + StreakCalendar 추가 |
| `src/components/Space/SpaceStore.jsx` | 크라이오 코어 구매 기능 추가 |

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
