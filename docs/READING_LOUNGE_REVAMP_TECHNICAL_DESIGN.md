# 독서 라운지 개편 개발 설계

- 문서 상태: 구현 전 기술 설계안 v1
- 작성일: 2026-08-23
- 제품 범위: `docs/READING_LOUNGE_REVAMP_PLAN.md`
- 기존 설계: `docs/CLASSIC_READING_SOCIAL_RECOMMENDATION_DESIGN.md`

## 1. 기술 목표

다음 기능을 기존 Firestore·Callable·TanStack Query 구조 안에서 추가한다.

1. `readingBooks.status`에 `want_to_read`를 추가한다.
2. 추천 글의 독서 의도와 나의 책을 하나의 멱등 명령으로 연결한다.
3. 기존 `resonated` 공감과 독서 의도를 동시에 유지할 수 있게 반응 문서를 v2로 확장한다.
4. 기존 댓글 쿼리를 유지하면서 최상위 댓글별 대댓글을 지연 로드한다.
5. 독서 탭에서 Q&A 전용 사이드 패널과 랭킹 쿼리를 실행하지 않는다.

원본 `readingBooks`와 `readingLogs`의 비공개 원칙, 클라이언트 직접 쓰기 금지, 추천 글 공개 스냅샷 구조는 변경하지 않는다.

## 2. 현재 코드 기준 영향 범위

### 2.1 프런트엔드

| 영역 | 주요 파일 | 변경 |
|---|---|---|
| 독서 상태 도메인 | `src/utils/readingDomain.js` | enum·라벨·색상·검증 추가 |
| 책장 쿼리/명령 | `src/hooks/useReadingLibrary.js` | 정렬, 새 연결 명령 훅, 캐시 갱신 |
| 소셜 쿼리/명령 | `src/hooks/useReadingSocial.js` | 반응 v2, 대댓글 쿼리·명령 |
| 추천 카드 | `ReadingShareCard.jsx` | 두 책 행동 CTA와 상태 표현 |
| 추천 상세 | `ReadingShareDetailDrawer.jsx` | 책 연결, 공감 분리, 확인 모달 |
| 댓글 | `ReadingShareComments.jsx` | 답글 입력·스레드 펼치기 |
| 책장 | `ReadingLibraryView.jsx`, `ReadingBookshelfTab.jsx` | 상태 통계·필터·정렬 |
| 책 표현 | `ReadingBookSpine.jsx`, `ReadingBookCard.jsx` | 관심 상태 UI와 클릭 동작 |
| 책 상세/등록/진행 | 관련 모달·드로어 | 상태 전환·제약·날짜 표시 |
| 아고라 레이아웃 | `src/pages/Community/Agora.jsx` | 독서 전용 사이드 패널 조건 분기 |

### 2.2 백엔드

| 영역 | 주요 파일 | 변경 |
|---|---|---|
| 책 정책 | `functions/classicReadingPolicy.js` | 상태·전환·로그 소스 검증 |
| 책 명령 | `functions/classicReading.js` | 관심 상태 생성/전환 타임스탬프 |
| 소셜 정책 | `functions/classicReadingSocialPolicy.js` | 독서 의도·반응 v2·대댓글 검증 |
| 소셜 명령 | `functions/classicReadingSocial.js` | 책 연결 Callable, 대댓글 Callable |
| 함수 export | `functions/index.js` | 새 Callable export |
| 규칙 | `firestore.rules` | 대댓글 읽기 규칙 추가 |
| 인덱스 | `firestore.indexes.json` | 중복 책 조회 인덱스 검토/추가 |
| 테스트 | `functions/*.test.cjs`, `scripts/` | 상태·멱등·집계·규칙 회귀 테스트 |

## 3. 상태 모델

### 3.1 책 상태

```js
const BOOK_STATUSES = {
  WANT_TO_READ: "want_to_read",
  READING: "reading",
  COMPLETED: "completed",
  PAUSED: "paused",
};
```

표시 문구:

| 저장값 | 표시 | 의미 |
|---|---|---|
| `want_to_read` | 읽고 싶어요 | 아직 독서를 시작하지 않은 관심 책 |
| `reading` | 읽고 있어요 | 독서를 시작한 책 |
| `completed` | 완독했어요 | 사용자가 완독으로 기록한 책 |
| `paused` | 읽기 중단 | 시작했으나 현재 멈춘 책 |

### 3.2 허용 전환

| 현재 | 허용 대상 | 비고 |
|---|---|---|
| `want_to_read` | `reading`, `completed`, `paused` | `reading` 전환 시 최초 `startedAt` 기록 |
| `reading` | `completed`, `paused`, `want_to_read` | `want_to_read` 복귀는 확인 필요 |
| `completed` | `reading`, `paused`, `want_to_read` | 기존 다시 읽기 동작 유지 |
| `paused` | `reading`, `completed`, `want_to_read` | 기존 재개 동작 유지 |

서버는 모든 전환을 허용하되, UI에서 과거 독서 데이터가 있는 책을 `want_to_read`로 바꾸는 기능은 기본 노출하지 않는다. 관리·수정 경로에서만 확인 후 허용한다.

### 3.3 타임스탬프 규칙

`readingBooks`에 다음 필드를 추가한다.

```js
{
  wantedAt: Timestamp | null,
  startedAt: Timestamp | null,
  completedAt: Timestamp | null,
  pausedAt: Timestamp | null,
  statusUpdatedAt: Timestamp
}
```

- `want_to_read`로 새로 만들 때 `wantedAt`만 기록하고 `startedAt`은 `null`이다.
- `want_to_read → reading` 최초 전환 시 `startedAt`을 기록한다.
- 재독을 시작할 때 기존 `startedAt`을 보존하고 `statusUpdatedAt`을 갱신한다.
- `completed`와 `paused`는 현행 타임스탬프 규칙을 유지한다.
- 상태를 바꿀 때 다른 상태의 과거 타임스탬프를 삭제하지 않는다. 이력의 요약값으로 보존한다.

### 3.4 독서 기록과 성취

- `want_to_read` 생성만으로 `readingLogs`를 만들지 않는다.
- `want_to_read → reading/completed/paused`부터 상태 변경 로그를 만든다.
- `LOG_SOURCES`에 `READING_LOUNGE: "reading_lounge"`를 추가한다.
- 관심 책은 연속 독서일, 완독 배지, 독서 과제 후보에 포함하지 않는다.
- 라운지에서 바로 완독으로 추가한 책은 페이지·유효 독서일 조건을 만족하지 않으므로 기존 성취 크레딧을 받지 않는다.

### 3.5 관심 상태 소비자 차단 규칙

상태 enum만 늘리고 기존 소비자를 그대로 두면 관심 책이 실제 독서처럼 처리될 수 있다. 다음 검증은 UI뿐 아니라 서버에도 적용한다.

- `saveReadingProgress`는 `want_to_read` 책에 `BOOK_NOT_STARTED`를 반환한다.
- 고전 읽기 과제의 책 선택 목록에서 `want_to_read`를 제외한다.
- 조작된 클라이언트가 관심 책으로 과제를 제출하면 서버가 거부한다.
- `publishReadingShare`는 `want_to_read` 책의 추천 글 발행을 거부한다.
- 연속 독서일·완독 수·독서 배지·공개 독서 통계에서 `want_to_read`를 제외한다.
- 공개 프로필 책장 Callable은 `want_to_read` 책을 기본적으로 반환하지 않는다.
- 관심 상태에서 위 행동을 하려면 먼저 `reading` 또는 `completed`로 명시적으로 전환한다.

프런트 오류 코드와 문구를 추가한다.

```js
BOOK_NOT_STARTED: "먼저 '읽기 시작'으로 상태를 바꿔 주세요."
```

## 4. 데이터 모델

### 4.1 `readingBooks/{bookId}` 확장

```js
{
  userId: "uid",
  title: "80일간의 세계 일주",
  author: "쥘 베른",
  normalizedTitle: "80일간의세계일주",
  normalizedAuthor: "쥘베른",
  status: "want_to_read",
  wantedAt: Timestamp,
  startedAt: null,
  completedAt: null,
  pausedAt: null,
  discovery: {
    source: "reading_lounge",
    firstShareId: "shareId",
    recommenderId: "ownerUid",
    recommenderDisplayName: "인*린",
    linkedAt: Timestamp
  },
  progress: {
    latestReadPage: 0,
    furthestPage: 0,
    latestReadAt: null,
    latestLogId: null
  },
  schemaVersion: 2
}
```

`discovery`는 첫 발견 출처만 보존한다. 다른 추천에서 같은 책을 다시 연결해도 최초 추천자를 덮어쓰지 않는다. 추천 글이 거두어지거나 추천자가 탈퇴하면 표시 이름은 숨길 수 있지만 책 자체는 유지한다.

### 4.2 반응 문서 v2

기존 문서 위치를 재사용한다.

```js
// readingShares/{shareId}/reactions/{userId}
{
  kind: "reading_share",
  userId: "uid",
  resonated: true,
  readingIntent: "want_to_read", // null | want_to_read | read
  linkedBookId: "readingBookId",
  linkedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  schemaVersion: 2,

  // type은 v1 읽기 호환 기간에만 유지 가능
  type: "resonated"
}
```

부모 집계:

```js
reactionCounts: {
  wantToRead: 0,
  read: 0,
  resonated: 0
}
```

규칙:

- `resonated`와 `readingIntent`는 독립적이다.
- `readingIntent`는 `want_to_read`, `read`, `null` 중 하나다.
- `want_to_read → read` 전환은 관심 수를 1 감소하고 읽은 수를 1 증가한다.
- 같은 의도를 재요청하면 집계를 바꾸지 않는 멱등 응답을 반환한다.
- `linkedBookId`는 현재 연결된 본인 책을 가리킨다.

### 4.3 v1 반응 호환

서버는 기존 `type`을 다음처럼 해석한다.

```js
const currentResonated = reaction.resonated ?? reaction.type === "resonated";
const currentIntent = reaction.readingIntent ?? (
  reaction.type === "want_to_read" ? "want_to_read" : null
);
```

기존 `want_to_read` 반응은 이미 부모 관심 수에 포함되어 있다. 사용자가 새 CTA를 누르면:

1. 부모 관심 수는 다시 증가시키지 않는다.
2. 책을 생성하거나 기존 책과 연결한다.
3. `linkedBookId`, `linkedAt`, `schemaVersion: 2`를 기록한다.

과거 반응만으로 사용자 책장을 자동 변경하지 않는다. 명시적으로 새 CTA를 누른 시점에만 책을 연결한다.

### 4.4 대댓글

기존 최상위 댓글 문서에 집계 필드를 추가한다.

```js
// readingShares/{shareId}/comments/{commentId}
{
  // 기존 필드
  replyCount: 0
}
```

대댓글은 최상위 댓글의 하위 컬렉션에 둔다.

```js
// readingShares/{shareId}/comments/{commentId}/replies/{replyId}
{
  kind: "reading_share_reply",
  shareId: "shareId",
  rootCommentId: "commentId",
  userId: "uid",
  authorId: "uid",
  userSnapshot: {
    displayName: "별빛 탐험가",
    profileFrameId: "starter"
  },
  replyToUserId: "rootAuthorUid",
  replyToDisplayName: "김*아",
  content: "저는 여행을 결심한 장면이 가장 기억에 남았어요.",
  status: "visible", // visible | deleted | hidden
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

대댓글에 다시 답해도 같은 `replies` 컬렉션에 저장한다. `replyToUserId`만 실제 답글 대상을 가리키며 깊이는 늘리지 않는다.

## 5. Callable API

### 5.1 `linkReadingShareBook`

요청:

```js
{
  commandId: "link_share_...",
  shareId: "shareId",
  intent: "want_to_read" | "read",
  completedDateKst: "2026-08-23" | null
}
```

응답:

```js
{
  success: true,
  shareId: "shareId",
  bookId: "readingBookId",
  bookStatus: "want_to_read" | "reading" | "completed" | "paused",
  readingIntent: "want_to_read" | "read" | null,
  created: true,
  reusedExistingBook: false,
  unchanged: false,
  reactionCounts: {
    wantToRead: 4,
    read: 7,
    resonated: 2
  }
}
```

서버 절차:

1. 인증, App Check 관찰, `commandId`, `shareId`, `intent`, 날짜를 검증한다.
2. 활성 추천 글과 공개 책 스냅샷을 읽는다.
3. 자기 추천 글이면 책 연결 CTA를 거부한다.
4. 제목·저자를 서버의 `normalizeString`으로 정규화한다.
5. 본인의 활성 책 중 동일 정규화 제목·저자를 최대 3건 조회한다.
6. 연결 우선순위로 기존 책을 고르거나 결정적 라운지 책 ID를 준비한다.
7. 트랜잭션에서 명령, 추천 글, 반응 문서, 선택한 책을 다시 읽는다.
8. 책 생성 또는 안전한 상태 전환, 반응 v2 갱신, 부모 집계 갱신, 명령 기록을 원자적으로 처리한다.
9. 캐시에 필요한 결과를 반환한다.

기존 책 선택 우선순위:

1. 이미 해당 추천과 `linkedBookId`로 연결된 책
2. `completed`
3. `reading`
4. `paused`
5. `want_to_read`
6. 최근 변경된 책

`want_to_read` 요청은 기존 `completed`, `reading`, `paused` 상태를 낮추지 않는다.

- 기존 책이 `completed`면 `readingIntent: "read"`로 연결하고 읽은 수에 반영한다.
- 기존 책이 `reading` 또는 `paused`면 `linkedBookId`만 연결하고 `readingIntent: null`로 둔다. 관심 수나 읽은 수를 늘리지 않는다.
- 기존 v1 관심 반응이 있었는데 책이 이미 `reading` 또는 `paused`라면 관심 수를 1 감소해 낡은 의도를 정리한다.
- 응답 문구는 각각 “이미 완독한 책”, “이미 읽고 있는 책”, “잠시 멈춘 책”과 연결했음을 구분한다.

`read` 요청은 클라이언트 확인을 거친 요청으로 간주한다. 기존 책이 `completed`가 아니면 `completed`로 전환하고 상태 변경 로그를 생성한다.

### 5.2 결정적 신규 책 ID

동시에 여러 추천에서 같은 책을 담아도 중복 생성을 줄이기 위해 서버가 다음 키를 만든다.

```text
social__{uidHash12}__{sha256(normalizedTitle + "\n" + normalizedAuthor).slice(0, 24)}
```

기존 수동 등록 책은 임의 ID이므로 먼저 정규화 필드 쿼리로 재사용한다. 결정적 ID는 라운지에서 새로 만드는 책끼리의 경쟁 상태를 막는 보조 수단이다. 서로 다른 판본을 의도적으로 별도 등록하는 현재 정책은 유지한다.

필요 쿼리:

```text
readingBooks
where userId == uid
where normalizedTitle == normalizedTitle
where normalizedAuthor == normalizedAuthor
orderBy updatedAt desc
limit 3
```

필요하면 다음 복합 인덱스를 추가한다.

```text
readingBooks: userId ASC, normalizedTitle ASC, normalizedAuthor ASC, updatedAt DESC
```

### 5.3 `setReadingShareReaction` v2

신규 UI에서는 이 함수가 `resonated`만 토글한다.

요청:

```js
{ shareId: "shareId", resonated: true | false }
```

호환 기간에는 기존 `reactionType` 요청도 받되 서버 내부에서 v2로 정규화한다. `want_to_read` 신규 요청은 클라이언트 버전 전환이 끝난 뒤 거부하거나 `linkReadingShareBook` 사용을 안내한다.

### 5.4 `replyToReadingShareComment`

요청:

```js
{
  commandId: "reply_...",
  shareId: "shareId",
  rootCommentId: "commentId",
  replyToReplyId: "replyId" | null,
  content: "답글 내용"
}
```

검증·트랜잭션:

- 활성 추천 글과 `visible` 최상위 댓글만 답글 허용
- `replyToReplyId`가 있으면 같은 최상위 댓글 아래의 `visible` 대댓글인지 검증
- 기존 댓글과 동일한 1~240자 정제 함수 사용
- `readingSocialUsage.comment` 일일 한도 50회 공유
- 대댓글 생성
- 최상위 댓글 `replyCount + 1`
- 추천 글 `commentCount + 1`
- 대상자 알림 1건 생성
- 멱등 명령 기록

### 5.5 `deleteReadingShareReply`

- 본인 대댓글만 소프트 삭제한다.
- `content`, 사용자 식별 필드를 비우고 `deleted` 상태로 바꾼다.
- 최상위 댓글 `replyCount`와 추천 글 `commentCount`를 각각 1 감소한다.
- 관련 알림을 삭제한다.
- 이미 삭제된 요청은 집계를 다시 감소시키지 않는다.

## 6. 쿼리와 캐시

### 6.1 내 연결 상태

추천 상세은 기존 `useMyReadingReaction` 한 건 읽기로 다음 상태를 모두 얻는다.

- `resonated`
- `readingIntent`
- `linkedBookId`

카드 12개 각각에서 반응 문서를 읽는 N+1 패턴은 만들지 않는다. 카드에는 부모 집계와 CTA만 표시하고, 사용자가 CTA를 누르면 서버가 현재 상태를 판정한다. 상세 드로어를 열었을 때만 개인 상태를 읽는다.

CTA 성공 시 다음 캐시를 국소 갱신한다.

- `['myReadingReaction', shareId, uid]`
- `['readingShare', shareId]`
- 모든 `['readingShareFeed', ...]` 페이지의 해당 항목
- `['readingBooks', uid, ...]` 무효화
- 신규 또는 연결된 `['readingBook', bookId]` 무효화

### 6.2 대댓글 지연 로드

최상위 댓글 쿼리는 그대로 유지한다. 각 댓글은 `replyCount`만 표시한다.

```text
readingShares/{shareId}/comments/{commentId}/replies
where status in [visible, deleted]
orderBy createdAt asc
orderBy __name__ asc
limit 4
```

- 처음 펼칠 때 3건을 보이고 4번째 문서로 더 보기 여부를 판단한다.
- 이후 10건씩 커서 페이지네이션한다.
- 대댓글이 없는 댓글은 하위 컬렉션을 읽지 않는다.
- 한 화면에서 모든 댓글의 대댓글을 자동으로 불러오지 않는다.

TanStack Query 키:

```js
["readingShareReplies", shareId, commentId]
```

### 6.3 독서 사이드 패널

`filter === 'reading'`이면 `AgoraMotivationPanel`을 마운트하지 않는다. 따라서 `useQARanking()` 쿼리도 실행되지 않는다.

새 패널은 `useReadingBooks(uid)` 캐시를 재사용한다. 첫 라운지 방문에서는 본인 책 목록 읽기가 추가되지만 Q&A TOP 10 읽기가 제거되고, 이후 책장 이동 시 같은 캐시를 재사용한다. 비용이 예상보다 크면 패널을 접힌 상태로 시작하고 펼칠 때만 쿼리한다.

## 7. 프런트엔드 동작

### 7.1 추천 카드

- 본인 추천이 아닌 경우 `읽고 싶어요`, `저도 이 책 읽었어요`를 표시한다.
- 두 버튼은 `event.stopPropagation()`으로 상세 열기와 분리한다.
- `읽고 싶어요`는 즉시 명령을 실행한다.
- `저도 이 책 읽었어요`는 확인 모달 후 실행한다.
- 처리 중에는 같은 카드의 두 버튼을 비활성화한다.
- 성공 토스트에서 `나의 책장 보기`를 제공한다.
- 서버가 기존 책을 찾으면 “이미 책장에 있는 책과 연결했어요”라고 구분한다.

카드에서 개인 연결 상태를 미리 읽지 않으므로 초기 버튼은 행동형 문구를 유지한다. 같은 세션에서 성공한 카드는 캐시로 `책장에 담김` 또는 `읽은 책에 있음`으로 바꾼다.

### 7.2 추천 상세

- 책 행동과 생각 공감을 서로 다른 영역으로 나눈다.
- `읽고 싶어요`, `저도 읽었어요`는 책장 영역에 둔다.
- `생각이 이어졌어요`는 반응 영역에 둔다.
- v2 개인 상태를 읽어 현재 연결된 책의 상태와 `책장 보기`를 제공한다.
- 본인 추천에는 책 행동을 숨긴다.

### 7.3 책장

정렬 상수:

```js
const statusOrder = {
  reading: 1,
  want_to_read: 2,
  completed: 3,
  paused: 4,
};
```

관심 책의 동작:

- 책등/카드 클릭은 페이지 기록 모달이 아니라 상세 드로어를 연다.
- 상세의 강조 CTA는 `읽기 시작`이다.
- 페이지 기록, 독서 과제 연결, 추천 글 쓰기는 `reading` 전환 전 비활성화한다.
- `wantedAt`과 발견 출처를 표시한다.
- 통계 카드에 `읽고 싶은 책` 수를 추가하거나 반응형 화면에서 기존 4열을 5열로 확장한다.

### 7.4 대댓글 UI

- 최상위 댓글 하단: `답글`, `답글 N개 보기`
- 답글 입력 상단: `○○님에게 답글`
- 대댓글은 한 단계 들여쓰기하고 세로 연결선을 사용한다.
- 삭제된 최상위 댓글 아래의 대댓글은 계속 볼 수 있다.
- 삭제된 대댓글은 현재 댓글 삭제 문구와 같은 방식으로 표시한다.
- 모바일에서는 대댓글 들여쓰기를 12~16px로 제한한다.

## 8. Firestore 규칙

기존 클라이언트 직접 쓰기 금지를 유지한다.

```text
readingBooks/{bookId}
  read: owner || admin || linked parent
  write: false

readingShares/{shareId}/reactions/{uid}
  read: self || share owner || admin
  write: false

readingShares/{shareId}/comments/{commentId}/replies/{replyId}
  read: authenticated &&
        (share active || share owner || admin) &&
        reply status in [visible, deleted]
  write: false
```

규칙 테스트는 다음을 확인한다.

- 타 사용자는 개인 반응·연결 책을 읽을 수 없다.
- 인증 사용자는 활성 추천의 `visible/deleted` 대댓글만 읽는다.
- 숨김 대댓글과 비활성 추천의 대댓글은 일반 사용자에게 노출되지 않는다.
- 모든 클라이언트 직접 생성·수정·삭제는 거부된다.

## 9. 알림

### 9.1 대댓글 알림

알림 ID는 `shareId + rootCommentId + replyId + recipientId` 해시로 결정한다.

```js
{
  recipientId: "targetUid",
  actorId: "replyAuthorUid",
  shareId: "shareId",
  commentId: "rootCommentId",
  replyId: "replyId",
  type: "reading_share_reply",
  title: "내 생각에 새로운 답글이 도착했어요",
  message: "○○님이 《책 제목》 대화에 답글을 남겼습니다.",
  link: "/?view=agora&filter=reading&highlight=shareId&comment=rootCommentId",
  isRead: false,
  createdAt: Timestamp
}
```

- 자기 답글에는 알림을 만들지 않는다.
- 추천 글 작성자와 답글 대상자가 같으면 알림 한 건만 만든다.
- 대댓글 삭제 시 해당 알림을 삭제한다.

### 9.2 추천으로 시작된 독서 알림

1차에서는 쓰기 폭증을 막기 위해 만들지 않는다. Phase 1.1에서 `want_to_read → reading` 최초 전환만 추천자에게 알리거나 일일 요약으로 묶는다.

## 10. 마이그레이션과 호환

### 10.1 책 문서

기존 책은 `wantedAt`이 없어도 유효하다.

- 읽을 때 `schemaVersion`이 없거나 1이면 현행 필드를 그대로 사용한다.
- 상태를 변경할 때 필요한 v2 필드를 병합한다.
- 전체 책 백필은 필수가 아니다.

### 10.2 반응 문서

초기 배포는 서버의 v1/v2 이중 읽기를 먼저 배포한다.

1. 서버: `type`과 v2 필드 모두 해석
2. 프런트: 새 CTA와 `resonated` 독립 토글 배포
3. 사용자가 반응할 때 해당 문서만 v2로 지연 마이그레이션
4. 2~4주 후 v1 잔존 수를 점검
5. 필요할 때만 관리자 백필 수행

백필이 기존 관심 반응을 책장에 자동 추가해서는 안 된다.

### 10.3 댓글

기존 댓글의 `replyCount` 누락은 0으로 처리한다. 대댓글이 생기는 최초 트랜잭션에서 값을 설정하므로 기존 댓글 백필이 필요 없다.

## 11. 오류·경쟁 상태 처리

| 상황 | 서버 동작 | 사용자 문구 |
|---|---|---|
| 빠른 중복 클릭 | 같은 명령 결과 반환 | 이미 처리되었어요 |
| 다른 추천에서 같은 책 동시 저장 | 결정적 ID와 트랜잭션으로 한 책 재사용 | 책장에 담았어요 |
| 기존 완독 책에 `읽고 싶어요` | 상태 유지, `read`로 연결 | 이미 완독한 책과 연결했어요 |
| 추천 글이 처리 중 거두어짐 | 트랜잭션 실패 | 더 이상 공개되지 않은 추천이에요 |
| 대댓글 대상이 삭제됨 | 새 답글 거부 | 삭제된 댓글에는 답글을 남길 수 없어요 |
| 최상위 댓글이 답글 작성 중 숨김 | 트랜잭션 실패 | 지금은 이 대화에 참여할 수 없어요 |
| 부모 집계가 누락/음수 | 0 하한, 감사 스크립트 대상 기록 | 일반 오류 문구 |

## 12. 테스트 계획

### 12.1 순수 정책 테스트

- `want_to_read`가 허용 상태로 검증된다.
- 모든 상태 전환과 unchanged 결과가 정확하다.
- 관심 상태 생성은 `startedAt`과 독서 로그를 만들지 않는다.
- v1 `type` 반응이 v2 상태로 정확히 해석된다.
- `want_to_read → read` 집계 델타가 `-1/+1`이다.
- 공감과 독서 의도는 서로의 집계를 변경하지 않는다.
- 대댓글 내용·문서 ID·대상 검증 경계값이 일치한다.

### 12.2 Callable 통합 테스트

- 같은 명령 재시도가 책·반응·집계를 중복 생성하지 않는다.
- 동일 제목·저자의 기존 책을 재사용한다.
- 기존 읽는 책을 관심 상태로 낮추지 않는다.
- 자기 추천 글에서는 책 연결이 거부된다.
- 관심 책을 읽기 시작하면 상태 로그가 한 번만 생긴다.
- 기존 v1 관심 반응의 부모 수를 중복 증가시키지 않는다.
- 대댓글 작성·삭제 시 두 집계가 정확히 증감한다.
- 대상자 알림이 한 건만 생성되고 삭제 시 정리된다.

### 12.3 규칙 테스트

- 원본 책은 본인·관리자·연결 부모 외에는 읽을 수 없다.
- 타인의 반응 v2 문서를 읽을 수 없다.
- 활성 추천의 보이는 대댓글만 읽을 수 있다.
- 모든 관련 컬렉션의 직접 쓰기가 거부된다.

### 12.4 UI 테스트

- 카드 CTA가 상세 드로어를 동시에 열지 않는다.
- `읽고 싶어요` 성공 후 책장 필터와 통계에 즉시 반영된다.
- 완독 버튼은 확인 전 서버 요청을 보내지 않는다.
- 관심 책에서 페이지 기록 대신 `읽기 시작`이 열린다.
- 대댓글 펼치기 전 하위 쿼리가 발생하지 않는다.
- 대댓글에 답해도 들여쓰기가 한 단계 이상 늘지 않는다.
- 독서 탭에서 Q&A 랭킹 쿼리가 발생하지 않는다.

### 12.5 비용 회귀 테스트

- 피드 최초 12개 카드에서 개인 반응 추가 읽기는 0회다.
- 상세 한 건을 열면 개인 반응 읽기는 최대 1회다.
- 답글을 펼치지 않으면 대댓글 읽기는 0회다.
- 답글 최초 펼치기는 최대 4개 문서만 읽는다.
- 같은 CTA 재시도는 추가 책을 만들지 않는다.

## 13. 배포 순서

1. 정책 순수 함수와 테스트
2. 필요한 Firestore 인덱스 배포 및 `Ready` 확인
3. Firestore 대댓글 읽기 규칙 배포
4. v1/v2 호환 Callable 배포
5. 책장 `want_to_read` 읽기 UI 배포
6. 추천 CTA와 대댓글을 기능 플래그 10%로 배포
7. 중복 책·집계·실패율 확인 후 50% → 100%
8. 독서 전용 사이드 패널 활성화
9. 2~4주 후 v1 반응 잔존과 Phase 1.1 여부 검토

기능 플래그 예시:

```js
readingLoungeBookshelfLinkEnabled
readingLoungeRepliesEnabled
readingLoungeSidebarEnabled
```

## 14. 롤백

- 프런트 플래그를 꺼 CTA와 대댓글 입력을 숨긴다.
- `want_to_read` 책은 개인 책장 데이터이므로 삭제하지 않고 계속 읽을 수 있게 한다.
- Callable은 구버전 클라이언트를 위해 호환 기간 동안 유지한다.
- 대댓글은 숨기더라도 삭제하지 않는다.
- 집계 오류는 반응·대댓글 하위 문서로 재계산하는 감사 스크립트로 복구한다.
- 원본 독서 기록과 기존 추천 글은 새 필드가 없어도 계속 동작해야 한다.

## 15. 구현 완료 기준

다음 조건을 모두 만족하면 1차 개편 완료로 본다.

1. 추천에서 관심 책을 한 번만 눌러 책장에 저장할 수 있다.
2. 같은 사용자의 재시도·동시 클릭이 중복 책을 만들지 않는다.
3. `저도 읽었어요`는 확인 후 기존 책 연결 또는 완독 책 생성으로 끝난다.
4. 책장에서 관심 책이 다른 상태와 분리되어 보이고 `읽기 시작`할 수 있다.
5. `생각이 이어졌어요`와 책장 독서 의도를 동시에 유지할 수 있다.
6. 댓글에 1단계 답글을 작성·조회·삭제하고 대상 알림을 받을 수 있다.
7. 독서 탭에서 Q&A 랭킹을 읽거나 표시하지 않는다.
8. 모든 쓰기는 Callable만 사용하고 규칙·멱등·비용 회귀 테스트를 통과한다.
