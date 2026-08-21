# 고전 읽기 추천·공유 문화 구현 계획 및 개발 설계

- 문서 상태: 구현 전 제품·기술 설계안 v1
- 작성일: 2026-08-21
- 대상: `western-classic` 나의 책장, 독서 과제 기록, 공개 프로필, 스텔라 아고라
- 관련 기준 문서: `docs/WESTERN_CLASSIC_READING_ARCHIVE_AND_BOOKSHELF_DESIGN.md`

## 1. 목적

메타센스의 독서를 “과제를 제출하는 활동”에서 끝내지 않고 다음 순환으로 확장한다.

> 스스로 읽기 → 나의 말로 기록하기 → 책을 추천하기 → 서로의 생각에 질문하기 → 다음 독서로 연결하기

제품의 핵심 목표는 다음과 같다.

1. 학생이 독서를 공개 성과보다 자발적 학습 습관으로 받아들이게 한다.
2. 자신의 독서 기록 중 원하는 내용만 공개용 추천 글로 만들게 한다.
3. 타인의 책장과 추천을 통해 다음에 읽을 책을 발견하게 한다.
4. 단순 좋아요 경쟁보다 감상·질문·대화가 남는 문화를 만든다.
5. 학생 데이터의 공개 범위를 명확히 분리하고 읽기·쓰기 비용을 예측 가능하게 제한한다.

## 2. 현행 구조 평가

### 2.1 재사용할 수 있는 기반

| 기반 | 현재 역할 | 확장 방향 |
|---|---|---|
| `readingBooks` | 내 책의 제목·저자·상태·진행도 | 공개 추천의 원본 책 참조 |
| `readingLogs` | 페이지, 한 줄 메모, 상태 이력 | 공개 글 작성 시 사용자가 선택하는 참고 자료 |
| `assignments.reading` | 책·페이지·제출 내용 스냅샷 | 공개 글 초안의 선택적 참고 자료 |
| 공개 프로필 책장 | 타인이 최근 책과 전체 책장 열람 | 공개 추천 글로 이동하는 진입점 |
| `assignmentShares` | 과제 공개, 반응, 댓글, 알림 | UI·알림·Callable 패턴만 재사용 |
| 스텔라 아고라 | 질문·답변과 학습 기록 공개 | `독서 라운지` 탭의 자연스런 위치 |

### 2.2 현재 구조를 그대로 확장하지 않는 이유

`assignmentShares` 문서에 독서 추천을 함께 담지 않는다.

- 과제 공개는 교사 피드백과 학습 성과 공개가 중심이다.
- 독서 추천은 책을 발견하고 서로의 생각을 나누는 것이 중심이다.
- 기존 공개 기록의 광석 보상·위로 요청·7일 제한을 독서 추천에 옮기면 평가와 인기 경쟁이 독서 문화를 압도할 수 있다.
- 독서 원본은 비공개로 남기고, 공개용 스냅샷을 별도 컬렉션에 저장해야 한다.

## 3. 핵심 제품 원칙

### 3.1 개인 기록과 공개 글의 분리

- `readingLogs.summary`와 `assignments.content`는 계속 비공개를 기본으로 한다.
- 공개 글은 사용자가 `추천 글 만들기`를 누른 뒤 별도 폼에서 작성한다.
- 한 줄 메모나 과제 내용을 초안으로 가져오는 것은 허용하되, 자동 발행하지 않는다.
- 공개 전에 정확한 공개 범위와 최종 문장을 다시 보여준다.
- 공개 후 원본 메모나 과제를 수정해도 공개 글은 자동으로 변하지 않는다.

### 3.2 공개 범위

- MVP의 공개 범위는 “메타센스에 로그인한 회원”으로 한정한다.
- 외부 웹 공개 링크, 검색엔진 노출, SNS 공유는 MVP에 포함하지 않는다.
- 표시 이름은 실명 필드보다 `publicDisplayName`을 우선하는 안전한 공개 신원 함수로 생성한다.
- 소속, 학년, 교사 피드백, 제출 시간, 전체 독서 이력은 공개 글에 담지 않는다.

### 3.3 대화가 남는 반응

MVP의 반응은 두 가지로 제한한다.

| 저장값 | 표시 | 의미 |
|---|---|---|
| `want_to_read` | 읽어보고 싶어요 | 다음 독서 후보로 연결 |
| `resonated` | 생각이 이어졌어요 | 추천글과 감상에 공감 |

- 반응 수로 순위를 만들지 않는다.
- 기본 피드는 최신순이며 인기순 정렬은 MVP에 두지 않는다.
- 반응에 광석 보상을 연결하지 않는다.
- 자기 글에는 반응할 수 없고, 한 사용자는 한 글에 하나의 반응만 유지한다.

### 3.4 자기 언어를 중심으로 한다

- 긴 책 문장 인용 기능은 MVP에 두지 않는다.
- 한 줄 평, 추천 이유, 함께 나눌 질문은 학생이 직접 작성한다.
- AI 요약·AI 평가·AI 댓글은 MVP에 사용하지 않는다.
- 이는 자기 생각을 언어화하는 학습 가치를 지키고 추가 API 비용도 막는다.

## 4. 기능 범위

### 4.1 MVP에 포함

1. 나의 책장 책 상세에 `이 책 추천하기` 버튼
2. 과제 제출 완료 후 `오늘의 독서를 공유할까요?` 선택 CTA
3. 공개용 추천 글 작성·미리보기·발행·수정·거두기
4. 스텔라 아고라의 `독서 라운지` 탭
5. 최신순 추천 피드와 커서 기반 `더 보기`
6. `읽어보고 싶어요`, `생각이 이어졌어요` 반응
7. 질문과 감상을 남기는 댓글
8. 스포일러 표시와 내용 접기
9. 내 추천 글 관리, 신고, 운영자 숨김·복구
10. 공개 프로필 책장에서 해당 추천 글로 이동

### 4.2 MVP에서 제외

- 별점과 평균 별점
- 인기순 랭킹, 리더보드, 추천 수 경쟁
- 자동 추천 알고리즘
- 외부 도서 API, ISBN, 표지 이미지, 출판사 메타데이터
- 외부 SNS 공유와 비로그인 공개
- 독서 클럽·함께 읽기 일정·실시간 채팅
- 반응·댓글에 따른 광석 보상
- 책 본문 인용문 저장
- 자동 공개와 자동 요약

### 4.3 후속 확장

#### Phase 2 — 읽고 싶은 책과 독서 주제

- `읽어보고 싶어요`를 내 관심 도서 목록에 모아보기
- 관심 도서를 나의 책장에 등록할 때 제목·저자 자동 입력
- 주간 질문: “이번 주에 읽은 장면에서 가장 낯선 생각은?”처럼 자기 언어를 유도하는 주제
- 월별 “메타센스 독서 지도”: 장르·주제별 탐색, 순위는 제공하지 않음

#### Phase 3 — 함께 읽기

- 소규모 독서 원탁과 기간 제한 읽기 주제
- 학생이 직접 만든 질문을 중심으로 한 비동기 대화
- 진행도 경쟁이 아닌 읽은 날·생각 남긴 날 중심의 참여 표시

## 5. 사용자 경험 설계

### 5.1 나의 책장에서 추천하기

1. 사용자가 책 상세 드로어를 연다.
2. `이 책 추천하기`를 누른다.
3. 시스템이 최근 한 줄 메모 3건과 과제 내용 3건을 참고 칩으로만 보여준다.
4. 사용자가 참고 문장을 하나 고르거나 새로 작성한다.
5. 공개 폼을 작성한다.
6. 미리보기에서 표시 이름·책·문장·스포일러 표시를 확인한다.
7. `메타센스 독서 라운지에 공개`를 누른다.

공개 폼:

| 필드 | 필수 | 기준 |
|---|---:|---|
| 한 줄 평 | 예 | 10~160자, 자기 언어 |
| 왜 추천하나요? | 아니오 | 0~600자 |
| 함께 나누고 싶은 질문 | 아니오 | 0~200자 |
| 스포일러 포함 | 예 | `false` 기본, 포함 시 본문 접힘 |
| 독서 상태 표시 | 예 | 현재 상태 스냅샷 |
| 페이지 공개 | 선택 | 기본 비공개 |

### 5.2 과제 제출 후 연결

- 제출 완료 토스트에서 바로 공개하지 않는다.
- `오늘의 독서를 공유할까요?` CTA가 추천 폼을 연다.
- 제출 내용은 사용자가 `초안으로 사용`을 누른 경우에만 폼으로 복사한다.
- 복사된 문장은 발행 전에 수정 가능하며 원본 과제와 연결된다는 사실을 공개 문서에 노출하지 않는다.

### 5.3 독서 라운지

아고라 탭 구조:

1. `최근 추천`
2. `내가 추천한 책`
3. 후속 Phase 2에 `읽고 싶은 책`

추천 카드:

- CSS 책등 비주얼(표지 이미지 요청 없음)
- 책 제목·저자
- 공개 표시 이름과 프로필 이동
- 한 줄 평
- 추천 이유의 앞부분
- 읽는 중/완독/잠시 멈춤 상태
- 선택적 페이지
- 스포일러 표시
- 두 반응 수와 댓글 수

상세 패널:

- 추천 이유 전체
- 함께 나누고 싶은 질문
- 반응과 댓글
- 작성자의 공개 프로필·책장 이동
- 신고, 작성자의 경우 수정·거두기

댓글 입력의 빠른 질문:

- `가장 기억에 남은 생각은 무엇인가요?`
- `이 책이 어려웠던 점은 무엇인가요?`
- `나도 이 책을 읽으면 좋을까요?`
- `이 생각을 좀 더 듣고 싶어요.`

## 6. 데이터 모델

### 6.1 `readingShares/{shareId}`

한 사용자가 한 책에 대해 하나의 활성 추천 글을 유지한다. 문서 ID는 `{ownerId}__{bookId}`를 기본으로 하되 서버가 길이·문자 유효성을 검증한다.

```js
{
  ownerId: "uid",
  ownerSnapshot: {
    displayName: "별빛 탐험가",
    profileFrameId: "starter",
    featuredBadgeId: null
  },
  sourceBookId: "readingBookId",
  bookSnapshot: {
    title: "어린 왕자",
    author: "앙투안 드 생텍쥬페리",
    status: "completed", // reading | completed | paused
    page: null            // 사용자가 공개를 선택한 경우만 숫자
  },
  review: {
    oneLine: "관계는 기다림과 책임으로 만들어진다는 생각을 남긴 책.",
    reason: "빠르게 읽히지만 나중에 다시 생각할 장면이 많아요.",
    question: "여러분이 생각하는 책임 있는 관계란 무엇인가요?",
    hasSpoiler: false
  },
  reactionCounts: {
    wantToRead: 0,
    resonated: 0
  },
  commentCount: 0,
  reportCount: 0,
  status: "active", // active | withdrawn | under_review | hidden
  publishedAt: Timestamp,
  updatedAt: Timestamp,
  schemaVersion: 1
}
```

설계 규칙:

- 공개 카드에 필요한 값을 스냅샷으로 담아 책·사용자 문서 추가 읽기를 막는다.
- 공개 글 수정 시 `publishedAt`은 유지하고 `updatedAt`만 변경한다. 수정으로 최신 피드 상단을 반복 점유하지 못하게 한다.
- 거두기는 삭제가 아닌 `withdrawn`이며 기존 대화는 일반 피드에서 숨긴다.
- 책 제목이나 저자를 수정해도 공개 글은 자동 변경하지 않는다. `추천 글 수정`에서 최신 책 정보 반영을 선택한다.

### 6.2 `readingShares/{shareId}/reactions/{userId}`

```js
{
  userId: "uid",
  type: "want_to_read", // want_to_read | resonated
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

- 사용자 ID 배열을 부모 문서에 누적하지 않는다.
- 반응 전환·취소는 반응 문서와 부모 집계를 하나의 트랜잭션으로 처리한다.
- 이 구조는 `assignmentShares`의 반응자 배열이 커져지는 문제를 반복하지 않는다.

### 6.3 `readingShares/{shareId}/comments/{commentId}`

```js
{
  userId: "uid",
  userSnapshot: {
    displayName: "별빛 탐험가"
  },
  content: "이 책에서 가장 어려웠던 부분은 어디였나요?",
  status: "visible", // visible | hidden | deleted
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

- 댓글은 1~240자, 수정은 MVP에서 제외하고 본인 삭제만 허용한다.
- 삭제는 전시용 문구를 남기는 `deleted` 상태로 처리한다.
- 댓글 내용은 부모 문서에 배열로 복제하지 않는다.

### 6.4 `readingShareReports/{shareId}__{reporterId}`

```js
{
  shareId: "shareId",
  ownerId: "reportedOwnerUid",
  reporterId: "reporterUid",
  reason: "spoiler", // spoiler | harassment | personal_info | inappropriate | other
  detail: "",
  status: "open", // open | resolved | dismissed
  createdAt: Timestamp,
  resolvedAt: null,
  resolvedBy: null
}
```

- 같은 사용자가 같은 글을 중복 신고할 수 없다.
- 신고 원문과 신고자 목록은 일반 클라이언트에 공개하지 않는다.
- 임계치 자동 숨김은 상호 신고 악용 가능성이 있어 MVP 초기에는 사용하지 않는다. 운영자가 `under_review` 또는 `hidden`으로 변경한다.

### 6.5 기존 문서 확장

`readingBooks/{bookId}`에 다음 서버 관리 필드를 선택적으로 추가한다.

```js
publicShare: {
  shareId: "uid__bookId",
  status: "active",
  publishedAt: Timestamp
}
```

- 공개 프로필 책장에서 추가 쿼리 없이 `추천글 보기`를 표시하는 조회용 투영값이다.
- 발행·거두기 트랜잭션에서만 갱신한다.
- 공개 책장 Callable은 `publicShare.status == active`인 경우에만 `publicShareId`를 응답한다.

`readingCommands`는 새 컬렉션을 만들지 않고 다음 명령 유형을 추가해 재사용한다.

```text
publish_reading_share
update_reading_share
withdraw_reading_share
react_reading_share
comment_reading_share
delete_reading_share_comment
report_reading_share
```

## 7. API 및 트랜잭션 설계

### 7.1 Callable Functions

| 함수 | 주요 역할 | 트랜잭션 대상 |
|---|---|---|
| `getReadingShareDraftSources` | 본인의 최근 메모·과제 최대 3건씩 조회 | 읽기 전용, 최대 6건 |
| `publishReadingShare` | 책 소유권·문장·공개 신원 검증, 스냅샷 생성 | 공개 글 + 책 `publicShare` + 명령 |
| `updateReadingShare` | 소유자의 공개 문장·스포일러·페이지 공개 수정 | 공개 글 + 명령 |
| `withdrawReadingShare` | 공개 거두기 | 공개 글 + 책 `publicShare` + 명령 |
| `reactReadingShare` | 반응 추가·전환·취소와 집계 | 반응 문서 + 공개 글 집계 |
| `commentReadingShare` | 댓글 생성·집계·알림 | 댓글 + 공개 글 + 알림 |
| `deleteReadingShareComment` | 본인 댓글 소프트 삭제와 집계 감소 | 댓글 + 공개 글 |
| `reportReadingShare` | 중복 방지 신고 생성 | 신고 + 신고 수 증가 |
| `moderateReadingShare` | 운영자 숨김·복구·신고 종결 | 공개 글 + 신고 처리 |

모든 쓰기는 Callable로만 수행하고 서버가 다음을 검증한다.

- Firebase Auth와 App Check
- 본인 소유권·공개 프로필 상태
- 문자열 길이, 허용 enum, 페이지 범위
- 스크립트성 입력·위험 링크·과도한 연속 문자 제거
- 자기 글 반응 금지와 중복 반응 멱등 처리
- 일일 새 추천 발행 3건, 댓글 50건을 서버 상한으로 적용

### 7.2 공개 읽기 경로

- 피드·상세·댓글은 정제된 `readingShares` 계열만 Firestore에서 직접 읽는다.
- 원본 `readingBooks`, `readingLogs`, `assignments`는 기존 비공개 규칙을 유지한다.
- 공개 피드를 Callable로 매번 중계하지 않아 함수 호출 비용과 콜드 스타트를 줄인다.
- 차단한 사용자의 글은 현재 소셜 차단 목록을 5분 캐시한 후 클라이언트에서 숨긴다. 차단은 페이지 접근 권한이 아닌 개인 UI 선호로 취급한다.

### 7.3 알림

- 새 댓글은 글 작성자에게 알림 1건을 생성한다.
- 자기 댓글과 삭제된 댓글은 알림하지 않는다.
- 반응마다 알림을 보내지 않는다. 알림 폭증과 쓰기 비용을 막고 카드의 집계로 확인한다.
- Phase 2에 필요하면 일일 요약 알림 하나로 합친다.

## 8. Firestore 보안 설계

```text
readingShares/{shareId}
  read: authenticated && status == active
  write: false

readingShares/{shareId}/reactions/{userId}
  read: authenticated && userId == auth.uid
  write: false

readingShares/{shareId}/comments/{commentId}
  read: authenticated && status in [visible, deleted]
  write: false

readingShareReports/{reportId}
  read/write: false
```

중요 규칙:

1. 모든 쓰기는 Admin SDK를 사용하므로 Callable이 규칙과 동일한 검증을 반드시 수행한다.
2. 피드 쿼리는 반드시 `status == active`를 포함해 규칙과 쿼리가 일치하게 한다.
3. 반응자 전체 목록은 공개하지 않고 본인의 반응 여부만 문서 ID 직접 읽기로 판단한다.
4. 프로필이 비공개로 바뀐 사용자의 활성 추천 글은 배치 감사 함수나 프로필 설정 Callable에서 `withdrawn`으로 전환한다.
5. 계정 삭제 시 추천글·반응·댓글·신고를 커서 기반으로 정리한다. Firestore는 부모 문서 삭제로 하위 컬렉션을 자동 삭제하지 않는다.

## 9. 쿼리·인덱스·비용 설계

### 9.1 피드

```text
readingShares
where status == active
orderBy publishedAt desc
orderBy __name__ desc
limit 13
```

- 화면에는 12건을 보이고 13번째 문서로 `hasMore`를 판단한다.
- `(publishedAt, documentId)` 커서로 더 보기한다.
- 자동 30초 재조회나 실시간 리스너를 사용하지 않는다.
- TanStack Query `staleTime` 2분, 창 포커스 자동 재조회 비활성화, 사용자 새로고침을 제공한다.

필요 복합 인덱스:

```text
readingShares: status ASC, publishedAt DESC, __name__ DESC
readingShares: ownerId ASC, status ASC, publishedAt DESC, __name__ DESC
```

### 9.2 댓글

- 카드 초기 로드에서 댓글을 읽지 않는다.
- 사용자가 상세를 열었을 때 최초 10건만 읽는다.
- 이후 20건씩 `(createdAt, documentId)` 커서로 더 보기한다.
- 댓글 수는 부모 공개 글의 `commentCount`를 표시해 카드마다 하위 컬렉션을 읽지 않는다.

필요 인덱스:

```text
comments: status ASC, createdAt ASC, __name__ ASC
```

### 9.3 반응과 알림

- 반응 할 때만 해당 사용자의 반응 문서 1건과 공개 글 1건을 읽고 쓴다.
- 반응 수는 부모 문서에 증분 갱신한다.
- 유니크 반응 문서 ID로 중복 쓰기를 막는다.
- 반응은 알림과 광석 원장을 만들지 않는다.

### 9.4 함수 실행

- 기존 `costOptimizedDataFunctions`를 사용한다.
- `memory: 256MB`, `timeoutSeconds: 60`, `maxInstances: 3`, `minInstances` 없음을 유지한다.
- 발행 시 외부 API·AI·Storage 작업을 하지 않는다.
- 공개 글 하나는 정상 발행 시 대략 사용자 1건 + 책 1건 + 공개 글 1건 + 명령 1건을 읽고, 공개 글·책·명령 3건을 쓰는 상한으로 설계한다.

### 9.5 가격·비용을 위한 제외 결정

- 표지 이미지 업로드·변환·CDN 전송을 하지 않는다.
- 외부 도서 검색 API를 호출하지 않는다.
- 정확한 전체 피드 건수를 기본 화면에서 집계하지 않는다.
- 댓글·반응자 목록을 미리 로드하지 않는다.
- 작성자 프로필은 카드 스냅샷으로 표시하고 프로필 문서를 카드마다 읽지 않는다.
- 인기 알고리즘·개인화 배치·AI 모델 호출은 후속 지표를 본 뒤 검토한다.

## 10. 코드 구조

### 10.1 신규 파일

```text
functions/
  classicReadingSocial.js
  classicReadingSocialPolicy.js
  classicReadingSocial.test.cjs

src/
  hooks/
    useReadingSocial.js
  components/Community/ReadingLounge/
    ReadingLoungeView.jsx
    ReadingLounge.css
    ReadingShareCard.jsx
    ReadingShareComposer.jsx
    ReadingShareDetailDrawer.jsx
    ReadingShareComments.jsx
    ReadingShareReportModal.jsx
```

### 10.2 수정 파일

| 파일 | 변경 |
|---|---|
| `functions/index.js` | 소셜 함수 등록, 알림, 계정 삭제 정리 |
| `functions/classicReading.js` | 공개 책장 응답에 `publicShareId` 선택 포함 |
| `src/components/Space/ReadingLibrary/ReadingBookDetailDrawer.jsx` | 추천 작성·수정·거두기 진입점 |
| `src/components/Space/AssignmentHub.jsx` | 고전 독서 제출 완료 후 선택 CTA |
| `src/pages/Community/Agora.jsx` | `독서 라운지` 탭과 URL 필터 |
| `src/pages/Community/PublicProfile.jsx` | 책장의 공개 추천 연결 |
| `firestore.rules` | 정제된 공개 컬렉션 읽기, 직접 쓰기 차단 |
| `firestore.indexes.json` | 최신순·내 글·댓글 커서 인덱스 |

### 10.3 훅 인터페이스

```js
useReadingShareFeed({ cursor, ownerId })
useReadingShare(shareId)
useReadingShareComments(shareId, { enabled })
useMyReadingReaction(shareId)
useReadingShareDraftSources(bookId)
usePublishReadingShare()
useUpdateReadingShare()
useWithdrawReadingShare()
useReactReadingShare()
useCommentReadingShare()
useDeleteReadingShareComment()
useReportReadingShare()
```

## 11. 안전·운영 설계

### 11.1 입력 안전

- Markdown과 HTML을 받지 않고 일반 텍스트로 저장·표시한다.
- URL은 작성 필드에 포함하지 않는다.
- 제어 문자, 과도한 공백, 빈 줄을 서버에서 정규화한다.
- 클라이언트 문자 수와 서버 문자 수가 같은지 테스트한다.
- 스포일러 선택 여부를 발행 미리보기에서 다시 보여준다.

### 11.2 자율성과 동의

- 과제 제출이나 완독 처리는 추천글 발행을 요구하지 않는다.
- 공개하지 않아도 광석·성취·피드백에 불이익이 없다.
- 추천 글을 거두면 피드·프로필에서 즉시 숨긴다.
- 공개 설정을 끄면 활성 추천글을 일괄 거두는 방향으로 처리한다.

### 11.3 운영자 도구

운영자 화면에 다음을 제공한다.

- 신고 미처리순·최신순 목록
- 추천글·신고 사유·작성자 최소 프로필 확인
- `숨김`, `복구`, `작성자에게 수정 요청`, `신고 기각`
- 조치자·조치 시각·사유 감사 기록

## 12. 구현 단계

### 0단계 — 정책·문구 확정

- 공개 범위, 공개용 표시 이름, 스포일러, 신고 사유 확정
- 독서는 공개 여부와 무관하게 학습 활동으로 인정됨을 안내

### 1단계 — 도메인·보안 기반

- `classicReadingSocialPolicy.js` 순수 함수와 단위 테스트
- Firestore 인덱스·규칙
- Callable 발행·수정·거두기·반응·댓글·신고
- 계정 삭제·프로필 비공개 전환 정리

### 2단계 — 나의 책장에서 발행

- 책 상세의 추천 진입점
- 최근 메모·과제 참고 칩
- 작성·미리보기·발행·수정·거두기
- 과제 제출 완료 후 선택 CTA

### 3단계 — 독서 라운지

- 최신순 피드·상세 드로어·스포일러
- 반응·댓글·알림
- 내 추천 글 관리
- 프로필·책장 연결

### 4단계 — 안전·운영

- 신고·숨김·복구·수정 요청
- 댓글·발행 일일 제한
- 관리자 목록과 감사 로그

### 5단계 — 관찰 후 확장

- 4주간 사용량·비용·신고·댓글 품질 관찰
- Phase 2 관심 도서·주간 질문 도입 여부 판단
- 인기 정렬·광석 보상은 기본적으로 도입하지 않음

## 13. 테스트 계획

### 13.1 단위 테스트

- 한 줄 평·추천 이유·질문 길이가 경계값에서 일치한다.
- 공백·제어 문자·enum·페이지가 서버에서 정규화된다.
- 스포일러 기본값은 `false`다.
- 공개 표시 이름이 안전한 우선순위로 선택된다.
- 반응 전환·취소 시 두 집계가 음수가 되지 않는다.
- 같은 명령 재시도가 중복 글·댓글·알림을 만들지 않는다.

### 13.2 규칙·Callable 통합 테스트

- 타인은 원본 `readingBooks`, `readingLogs`, `assignments`를 읽지 못한다.
- 인증 회원은 `active` 추천 글만 쿼리할 수 있다.
- 클라이언트는 추천 글·집계·신고를 직접 쓰지 못한다.
- 타인 책이나 비공개 프로필로 추천글을 발행할 수 없다.
- 거두기·숨김 후 일반 피드와 직접 조회에서 노출되지 않는다.
- 대량 반응에서도 부모 문서가 사용자 ID 배열로 커지지 않는다.

### 13.3 UI 통합 테스트

- 책 상세에서 추천 폼을 열고 초안·미리보기·발행한다.
- 스포일러 글은 명시적 클릭 전에 본문을 보이지 않는다.
- 타인 글의 반응을 추가·전환·취소할 수 있다.
- 상세를 열기 전에 댓글 쿼리가 발생하지 않는다.
- 댓글 작성·삭제, 신고, 공개 글 수정·거두기가 즉시 반영된다.
- 공개 프로필 책장에서 추천글로 이동할 수 있다.
- 모바일에서 작성 폼·스포일러·댓글 키보드가 화면을 가리지 않는다.

### 13.4 비용·부하 테스트

- 피드 첫 진입이 최대 13건의 공개 문서만 읽는다.
- 피드 12건을 보는 동안 댓글 쿼리는 0회다.
- 댓글 상세 첫 진입은 최대 11건만 읽는다.
- 브라우저 탭을 열어둔 상태에서 30초마다 재조회하지 않는다.
- 동일 반응·발행 재시도가 추가 쓰기를 만들지 않는다.
- 100명이 동시에 새로고침해도 함수 인스턴스가 피드 읽기 때문에 증가하지 않는다.

## 14. 배포·롤백 계획

배포 순서:

1. Firestore 인덱스 배포·`Ready` 확인
2. Firestore 보안 규칙 배포
3. Callable Functions·계정 삭제 정리 배포
4. 관리자 신고 도구 배포
5. 나의 책장 작성 UI 배포
6. 독서 라운지 피드 기능 플래그 10% → 50% → 100%
7. 공개 프로필 연결 활성화

롤백:

- 프런트 기능 플래그를 끄어 작성·피드 진입점을 숨긴다.
- 기존 공개 글은 삭제하지 않고 읽기만 잠시 차단한다.
- 원본 책·독서 기록·과제는 새 컬렉션과 분리되어 영향을 받지 않는다.
- 집계가 틀리면 반응·댓글 하위 문서로 재계산하는 관리자 스크립트를 준비한다.

## 15. 성공 지표와 확장 판단

인기도보다 독서 순환을 지표로 삼는다.

| 지표 | 의미 | 초기 판단 기준 |
|---|---|---|
| 독서 기록 → 추천 발행률 | 기록이 공유로 연결됨 | 상승 추세인지 관찰 |
| 추천 카드 → 상세 열기율 | 한 줄 평이 관심을 만듦 | 카드 열람 이벤트를 샘플링 |
| `읽어보고 싶어요` 비율 | 다음 독서로 연결됨 | Phase 2 관심 도서 근거 |
| 추천 글당 질문형 댓글 비율 | 대화의 품질 | 단순 응원 문구와 분리 관찰 |
| 신고·숨김율 | 안전성 | 급증 시 작성 상한·문구 조정 |
| 피드 진입당 Firestore 읽기 | 비용 효율 | 초기 상한 13건 유지 |

전체 영향을 보기 위한 제품 지표는 다음이다.

- 30일 독서 기록 유지율
- 다른 사용자의 추천 후 새 책 등록 비율
- 완독 후 한 줄 평 작성률
- 주간 독서 대화 참여자 수

이 지표를 반응 수·랭킹보다 우선해야 “읽고, 기록하고, 공유하고, 생각을 나누는 문화”가 제품 의도대로 형성되는지 판단할 수 있다.

## 16. 인수 조건

1. 비공개 독서 메모·과제·피드백이 명시적 선택 없이 공개되지 않는다.
2. 본인 소유 책에 대해서만 추천글을 발행할 수 있다.
3. 한 사용자·한 책에 하나의 활성 추천글만 존재한다.
4. 공개글은 회원 최신순 피드·내 추천·공개 프로필에서 동일하게 연결된다.
5. 스포일러 포함 글은 사용자가 펼치기 전에 내용을 노출하지 않는다.
6. 반응은 중복·자기 반응을 허용하지 않고 집계와 하위 문서가 일치한다.
7. 댓글은 상세를 열기 전에 로드되지 않으며 커서로 페이징한다.
8. 신고·운영자 숨김·복구와 감사 기록이 작동한다.
9. 피드 첫 진입은 최대 13건의 공개 글만 읽고 댓글을 읽지 않는다.
10. 공개 활동을 하지 않아도 독서 기록·과제·성취에 불이익이 없다.

## 17. 구현 전 주요 결정값

| 항목 | v1 결정 |
|---|---|
| 공개 범위 | 로그인한 메타센스 회원 |
| 원본 기록 | 항상 비공개, 선택한 문장만 초안으로 복사 |
| 추천 글 | 사용자·책당 활성 1건 |
| 한 줄 평 | 10~160자 필수 |
| 스포일러 | 작성자 표시, 독자 펼치기 |
| 페이지 | 기본 비공개, 선택적 공개 |
| 반응 | 두 종류, 글당 1개, 전환·취소 가능 |
| 광석 보상 | MVP에서 없음 |
| 피드 정렬 | 최신순만 제공 |
| 피드 페이지 | 12건 + 1건 선행 조회 |
| 댓글 | 상세 열기 후 10건, 이후 20건씩 |
| 표지·ISBN·AI | MVP에서 없음 |
| 배포 | 인덱스 → 규칙 → 함수 → 관리자 도구 → UI → 점진 활성화 |
