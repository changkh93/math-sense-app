# 스텔라 아고라 Social Economy Phase Plan

이 문서는 스텔라 아고라의 social 기능을 `광석 소비`, `정체성 표현`, `공개적 인정` 중심으로 재설계하는 실행 계획서입니다.

핵심 전제는 다음과 같습니다.

- 질문자는 공개 보드에서 반드시 익명이어야 합니다.
- 답변자는 자신을 드러내고 인정받을 수 있어야 합니다.
- 광석은 `실력`을 사는 데 쓰면 안 되고, `질문을 여는 비용`, `프로필 표현`, `공개 전시`, `크루 운영`에만 써야 합니다.
- `helpCount`, `SEI`, `채택 수`, `선생님 인증`은 구매 불가입니다.

## 1. 목표

현재 아고라는 질문/답변/업보트/랭킹은 있으나, 광석 소비가 social recognition으로 이어지지 않습니다.

새 구조의 목표는 다음과 같습니다.

- 학생이 광석을 써서 `관계`를 만들게 한다.
- 답변자는 자신의 프로필과 기여를 `공개적으로 축적`한다.
- 질문자는 안전하게 도움을 받되, 답변자는 `명예와 존재감`을 얻는다.
- 3D 커스터마이징 대신 2D 어디서나 보이는 social surface를 만든다.

## 2. 운영 원칙

### 2.1 질문자 익명

- 공개 질문 목록에서는 질문자 이름, 프로필, 소속, 프레임을 노출하지 않는다.
- 질문 상세에서도 질문자는 `익명 탐험가`, `익명 질문자`, `비밀 탐사자` 같은 시스템 라벨만 보인다.
- 질문 작성자 정보는 질문자 본인, 관리자, 선생님만 확인 가능하다.
- 질문자가 자기 질문 목록에서만 자신의 기록을 식별할 수 있다.

### 2.2 답변자 공개

- 답변자는 공개 프로필 카드로 노출한다.
- 답변 카드에는 `표시 이름`, `대표 칭호`, `프로필 프레임`, `대표 배지`, `한 줄 시그니처`, `도움 횟수`를 노출할 수 있다.
- 답변자는 실명 공개가 아니라 `공개 프로필 이름` 기준으로 노출해도 된다.

### 2.3 광석 소비의 경계

광석으로 구매 가능한 것:

- 질문 현상금
- 공개 프로필 꾸미기
- 후보 등록, 전시 연장, 강조 슬롯
- 크루 생성/운영 기능

광석으로 구매 불가능한 것:

- 도움 횟수
- 채택 수
- SEI 점수
- 선생님 인증
- 랭킹 순위

## 3. Phase 1: 현상금 질문 + 프로필 명함

Phase 1의 목적은 질문과 답변 사이에 광석 흐름을 만들고, 답변자가 자신을 드러낼 이유를 제공하는 것입니다.

### 3.1 현상금 질문

#### 사용자 가치

- 질문자는 익명으로 좋은 답변을 빠르게 받는다.
- 답변자는 실력으로 광석을 획득하고 공개적으로 인정받는다.
- 아고라에는 `보상이 걸린 좋은 질문`이 쌓인다.

#### UX 규칙

- 질문 작성 시 `현상금 없음`, `10`, `30`, `50`, `100` 광석 중 선택
- 질문 카드는 익명으로 표시되며, `현상금 50 광석`만 공개
- 답변이 채택되면 현상금이 답변자에게 지급
- 선생님 인증이 붙으면 시스템 보너스 추가 지급 가능
- 미채택 질문은 자동 처리 규칙 필요

#### 자동 처리 규칙

- 72시간 내 답변이 1개 이상 있고 질문자가 아무 행동을 하지 않으면:
  - 질문자에게 24시간 알림 유예
  - 유예 후 자동으로 `업보트 상위 답변` 또는 `선생님 인증 답변`에 지급
- 답변이 0개면 72시간 후 전액 환불
- 질문자가 스스로 해결했을 경우:
  - 답변 0개면 전액 환불
  - 답변 1개 이상이면 `환불 50% + 질문 종료` 또는 `감사 토큰 전환` 중 선택

#### 권장 가격

| 항목 | 가격 |
| --- | --- |
| 가벼운 질문 | 10 |
| 일반 질문 | 30 |
| 급한 질문 | 50 |
| 어려운 질문 | 100 |

#### 남용 방지

- 동일 사용자 간 반복 채택 패턴 감지
- 생성 7일 미만 계정은 `현상금 상한 30`
- 하루 현상금 총액 상한 설정
- 자기 부계정 회수 패턴은 관리자 대시보드에서 플래그

### 3.2 공개 프로필 명함

#### 목적

답변자에게 `저 사람 또 봤다`, `설명을 잘하는 친구다`, `이번 주 유명한 사람이다`를 만들어야 합니다.

#### 프로필 카드 기본 구성

- 공개 표시 이름
- 대표 칭호 1개
- 프로필 프레임
- 대표 배지 1개
- 한 줄 시그니처
- 누적 도움 수
- 이번 주 채택 수

#### 구매 가능한 요소

| 항목 | 가격 | 비고 |
| --- | --- | --- |
| 기본 프레임 세트 | 50 | 컬러 프레임 |
| 고급 프레임 세트 | 150 | 발광/특수 모양 |
| 대표 칭호 슬롯 | 80 | 기본 1개 외 추가 노출 |
| 배지 핀 2번째 슬롯 | 80 | |
| 배지 핀 3번째 슬롯 | 150 | |
| 한 줄 시그니처 기능 해금 | 30 | |
| 프로필 강조 색상 | 40 | |
| 베스트 답변 고정 슬롯 | 100 | 프로필 상단 |

#### 구매 불가 요소

- 칭호 그 자체
- 배지 획득 조건
- 도움 수
- 선생님 인증

즉, `자격은 실력으로 얻고, 표현은 광석으로 확장`합니다.

### 3.3 Phase 1 데이터 모델

#### `questions`

```ts
{
  userId: string,
  isPublic: true,
  isAnonymous: true,
  anonymousLabel: string, // "익명 탐험가" 등
  bountyAmount: number,
  bountyStatus: "none" | "locked" | "awarded" | "refunded" | "split",
  bountyAwardedToAnswerId: string | null,
  bountyAutoResolveAt: Timestamp | null,
  status: "open" | "answered" | "resolved",
  createdAt: Timestamp
}
```

#### `answers`

```ts
{
  questionId: string,
  userId: string,
  content: string,
  isAccepted: boolean,
  isTeacherVerified: boolean,
  authorProfileSnapshot: {
    displayName: string,
    publicTitle: string,
    profileFrame: string,
    signature: string,
    pinnedBadgeIds: string[]
  }
}
```

#### `users`

```ts
{
  publicProfileEnabled: boolean,
  publicDisplayName: string,
  publicTitle: string,
  profileFrame: string,
  signature: string,
  pinnedBadgeIds: string[],
  profileTheme: string,
  pinnedAnswerId: string | null
}
```

#### `crystal_transactions`

추가 타입:

- `agora_bounty_lock`
- `agora_bounty_award`
- `agora_bounty_refund`
- `agora_profile_purchase`

### 3.4 Phase 1 구현 순서

1. 질문자 익명 노출 적용
2. 질문 생성 시 `isAnonymous`, `bountyAmount` 저장
3. 채택 시 현상금 이동 로직 추가
4. 프로필 편집 화면에 공개 프로필 필드 추가
5. 답변 카드/상세에 프로필 명함 노출
6. 프로필 꾸미기용 상점 섹션 추가

### 3.5 코드 접점

- 질문/답변 생성 및 채택: [useQA.js](/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/hooks/useQA.js)
- 아고라 리스트: [Agora.jsx](/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/pages/Community/Agora.jsx)
- 질문 상세: [QuestionDetail.jsx](/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/pages/Community/QuestionDetail.jsx)
- 프로필 편집: [ProfileEditView.jsx](/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/ProfileEditView.jsx)

## 4. Phase 2: 주간 명예의 전당

Phase 2의 목적은 상시 누적 랭킹과 별도로 `이번 주에 누가 빛났는가`를 보여주는 것입니다.

### 4.1 필요한 이유

- 누적 랭킹은 기존 강자에게 유리합니다.
- 학생은 `지금 이번 주에 내가 보인다`는 감각이 필요합니다.
- 질문을 잘하는 학생, 친절한 학생, 성장한 학생도 따로 인정받아야 합니다.

### 4.2 전당 카테고리

- 이번 주 명답변상
- 이번 주 가장 친절한 설명상
- 이번 주 질문을 가장 잘한 학생
- 이번 주 성장상
- 선생님 추천 답변상

### 4.3 광석 소비 포인트

전당 그 자체는 실력 기반이어야 합니다. 대신 아래를 구매할 수 있습니다.

| 항목 | 가격 | 비고 |
| --- | --- | --- |
| 후보 등록권 | 20 | 자신의 답변 1개 제출 |
| 강조 슬롯 | 30 | 후보 카드 테두리/하이라이트 |
| 전시 연장권 | 50 | 1주 추가 노출, 수상자만 가능 |
| 회고 카드 꾸미기 | 40 | 수상 후 프로필/전당 카드 꾸미기 |

### 4.4 선정 규칙

- 명답변상:
  - 채택 수
  - 업보트 수
  - 선생님 인증 여부
- 질문상:
  - 업보트
  - 답변 수
  - 해결 여부
- 성장상:
  - 전주 대비 채택 수 증가
  - 전주 대비 도움 수 증가

### 4.5 데이터 모델

#### `weekly_hall_of_fame`

```ts
{
  weekKey: "2026-W18",
  category: "best_answer" | "best_question" | "kind_helper" | "growth_star" | "teacher_pick",
  winnerUserId: string | null,
  winnerAnswerId: string | null,
  winnerQuestionId: string | null,
  title: string,
  summary: string,
  profileSnapshot: object,
  candidateIds: string[],
  createdAt: Timestamp
}
```

### 4.6 노출 위치

- 아고라 메인 상단 배너
- 랭킹 탭 내부 `이번 주 명예의 전당`
- 답변자 프로필 카드

### 4.7 구현 순서

1. 주간 집계 배치 또는 관리자 수동 선정 도구
2. 전당 뷰 카드 제작
3. 후보 등록권/강조 슬롯 상품 추가
4. 프로필 카드에서 전당 이력 표시

## 5. Phase 3: 스터디 크루

Phase 3의 목적은 개인 경쟁만이 아니라 `소속감 기반 social`을 만드는 것입니다.

### 5.1 기본 개념

학생은 크루를 만들거나 가입할 수 있습니다.

- 크루명
- 크루 모토
- 크루 엠블럼
- 공개 소개
- 크루 리더/부리더

질문자는 여전히 익명이지만, 원하면 `크루 소속만 표시`할 수 있습니다.
즉 `개인 익명 + 집단 소속감` 조합이 가능합니다.

### 5.2 광석 소비 구조

| 항목 | 가격 |
| --- | --- |
| 크루 생성권 | 300 |
| 크루 엠블럼 업로드/선택 확장 | 100 |
| 크루 소개 카드 꾸미기 | 80 |
| 크루 최대 인원 확장 | 150 |
| 크루 전용 질문 게시판 해금 | 120 |
| 크루 주간 이벤트 개설 | 100 |

### 5.3 크루 기능

- 크루별 전용 질문 피드
- 크루 공동 현상금 풀
- 크루별 주간 도움 수 랭킹
- 크루 대표 답변 전시
- 크루 챌린지:
  - 주간 답변 10개
  - 선생님 인증 3개
  - 채택 5개

### 5.4 사회적 효과

- 얼굴/실명 노출이 부담스러운 학생도 크루 소속으로 존재감을 느낄 수 있음
- 상위권 학생 혼자 독식하는 대신 팀 기반 참여가 가능
- 질문자가 익명이어도 `우리 크루에서 물어본 질문` 같은 집단 감각이 생김

### 5.5 데이터 모델

#### `crews`

```ts
{
  name: string,
  slug: string,
  motto: string,
  emblemId: string,
  ownerUserId: string,
  officerUserIds: string[],
  memberCount: number,
  capacity: number,
  publicDescription: string,
  createdAt: Timestamp
}
```

#### `crew_members`

```ts
{
  crewId: string,
  userId: string,
  role: "owner" | "officer" | "member",
  joinedAt: Timestamp
}
```

#### `crew_weekly_stats`

```ts
{
  crewId: string,
  weekKey: string,
  answerCount: number,
  acceptedCount: number,
  teacherVerifiedCount: number,
  crystalsSpent: number
}
```

### 5.6 구현 순서

1. 크루 생성/가입/관리 기초
2. 프로필에 크루 소속 노출
3. 크루 피드와 크루 랭킹
4. 크루 전용 질문/이벤트/공동 현상금

## 6. Phase 전체 우선순위

### 6.1 실제 개발 순서

1. Phase 1
2. Phase 2
3. Phase 3

이 순서가 맞는 이유:

- Phase 1이 가장 직접적인 광석 소비와 social recognition을 만듭니다.
- Phase 2는 Phase 1의 답변/채택/프로필 데이터를 활용해 전시를 만듭니다.
- Phase 3는 프로필과 전당 기반 social graph 위에 집단 소속을 얹는 구조입니다.

### 6.2 각 Phase 완료 기준

#### Phase 1 완료 기준

- 질문 목록/상세에서 질문자가 익명으로 노출됨
- 현상금 질문 생성 가능
- 채택 시 광석 이동 로직 완료
- 답변자 프로필 명함 노출
- 프로필 소비 상품 구매 가능

#### Phase 2 완료 기준

- 주간 명예의 전당 집계 또는 선정 가능
- 전당 카드가 메인 surface에 노출됨
- 전당 후보 등록/강조 소비가 가능

#### Phase 3 완료 기준

- 크루 생성/가입/역할 관리 가능
- 크루가 아고라 surface에 노출됨
- 크루 기반 주간 활동과 소비가 가능

## 7. 리스크와 방어책

### 7.1 익명 악용

- 질문자는 익명이지만 신고/관리 로그는 모두 유지
- 반복 악성 질문은 관리자만 식별 가능

### 7.2 부계정 현상금 회수

- 신규 계정 제한
- 동일 기기/패턴 감시
- 비정상 상호채택 경고

### 7.3 프로필 빈부격차

- 프로필 꾸미기 자체는 차등을 만들 수 있으므로, 무료 기본 테마도 충분히 제공
- 보기 좋은 장식은 유료여도, 핵심 정보 접근성은 무료 유지

### 7.4 크루 독점

- 크루 규모 상한
- 주간 시즌제
- 신규 크루도 상위 노출 기회 제공

## 8. 추천 구현 묶음

가장 현실적인 3단계 묶음은 다음과 같습니다.

### Sprint A

- 질문자 익명화
- 현상금 질문
- 답변자 프로필 명함

### Sprint B

- 프로필 소비 상품
- 주간 명예의 전당
- 전당 후보 등록권

### Sprint C

- 크루 생성/가입
- 크루 프로필
- 크루 전용 피드와 주간 랭킹

## 9. 최종 판단

이 계획의 핵심은 `질문자는 숨고, 답변자는 빛난다`입니다.

기존 상점의 우주선 꾸미기보다 아래 항목이 훨씬 강한 소비 동기를 만듭니다.

- 좋은 답변을 얻기 위해 거는 현상금
- 공개 프로필을 더 잘 보이게 만드는 명함 확장
- 이번 주 명예의 전당에 내 답변을 올리는 후보권
- 내가 속한 크루를 키우는 집단 소비

이 구조라면 광석은 단순 장식 재화가 아니라 `관계`, `명예`, `소속감`을 여는 재화가 됩니다.
