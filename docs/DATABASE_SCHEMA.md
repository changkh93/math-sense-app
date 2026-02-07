# 파이어베이스 데이터베이스(Firestore) 가이드

사용자 정보와 학습 이력을 저장하는 구조입니다.

## 1. Users 컬렉션
- 경로: `/users/{uid}`
- 필드:
  - `name`: 사용자 이름 (Google 표시 이름)
  - `email`: 사용자 이메일
  - `orbs`: 누적 감각 구슬 개수 (Number)
  - `totalQuizzes`: 총 응시한 퀴즈 수 (Number)
  - `totalScore`: 누적 점수 합계 (백분율 합계, Number)
  - `averageScore`: 평균 점수 (totalScore / totalQuizzes)
  - `lastActive`: 마지막 학습 시간 (ServerTimestamp)

## 2. History 서브 컬렉션 (학습 이력)
- 경로: `/users/{uid}/history/{autoId}`
- 용도: 개별 퀴즈 응시 기록 저장
- 필드:
  - `unitId`: 단원 ID (예: unit1)
  - `unitTitle`: 단원 제목
  - `score`: 해당 퀴즈 점수 (0~100)
  - `timestamp`: 저장 시간

## 3. 인덱스 설정
- **랭킹**: `orbs` 필드를 기준으로 내림차순 정렬하여 상위 유저를 추출합니다.
- **이력**: `timestamp` 필드를 기준으로 내림차순 정렬하여 최근 기록을 추출합니다.
