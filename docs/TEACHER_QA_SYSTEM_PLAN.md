# 선생님-학생 Q&A 및 학습 커뮤니티 시스템 개발 계획

이 문서는 `TEACHER_REQUESTION_IDEA.md`에 제시된 아이디어를 바탕으로, 우리 프로젝트(`math-sense-app`)에 적용하기 위한 구체적인 개발 계획과 기술적 설계를 다룹니다.

## 1. 개요 및 목표

*   **핵심 가치:** 단순 문제 풀이 도구를 넘어, 학생과 선생님(또는 동료 학생) 간의 **실시간 소통**과 **피드백 루프**를 형성합니다.
*   **목표:**
    1.  학생들이 모르는 문제를 즉시 질문하고 해소를 받을 수 있는 **안전한 창구** 마련.
    2.  질문 데이터를 축적하여 **학습 커뮤니티**로 발전.
    3.  게이미피케이션 요소를 도입하여 자발적인 참여 유도.

---

## 2. 시스템 아키텍처 및 데이터베이스 설계

현재 사용 중인 **Firebase Firestore**를 기반으로 설계합니다. 실시간성을 위해 `onSnapshot` 리스너를 적극 활용합니다.

### 2.1 데이터베이스 스키마 (Firestore)

#### **`questions` (컬렉션)**
질문의 메타데이터와 내용을 저장합니다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | Document ID (자동 생성) |
| `userId` | string | 질문자 UID |
| `quizId` | string | (옵션) 연동된 퀴즈 ID. 일반 질문일 경우 null |
| `quizContext` | map | `{ chapterId: string, unitId: string, wrongAnswer: any }` (퀴즈 문맥 정보) |
| `type` | string | `'quiz'` | `'concept'` | `'general'` |
| `category` | string | (일반 질문용) `'수학'`, `'진로'`, `'자유'` 등 |
| `content` | string | 질문 내용 (텍스트) |
| `mediaUrl` | string | (옵션) 첨부 이미지/드로잉 URL |
| `status` | string | `'open'` (대기) | `'answered'` (답변완료) | `'resolved'` (해결됨) |
| `isPublic` | boolean | 공개 여부 (기본 true, 1:1 질문 시 false) |
| `tags` | array | `['해설요청', '오류신고']` 등 |
| `upvotes` | number | '나도 궁금해요' 카운트 |
| `createdAt` | timestamp | 생성 시간 |
| `updatedAt` | timestamp | 수정 시간 |

#### **`answers` (컬렉션 - `questions`의 하위 컬렉션 또는 최상위)**
*쿼리 효율성을 위해 최상위 컬렉션으로 두고, `questionId`로 참조하는 방식을 권장합니다.*

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | Document ID |
| `questionId` | string | 원본 질문 ID |
| `userId` | string | 답변자 UID |
| `isTeacher` | boolean | 선생님 여부 (뱃지 표시용) |
| `content` | string | 답변 내용 |
| `isAccepted` | boolean | 질문자 채택 여부 |
| `isVerified` | boolean | 선생님 인증 여부 (정확한 답변 마크) |
| `createdAt` | timestamp | 생성 시간 |

#### **`notifications` (컬렉션)**
실시간 알림을 위한 컬렉션입니다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| `recipientId` | string | 알림 받을 사용자 UID |
| `type` | string | `'answer_registered'`, `'answer_accepted'`, `'teacher_verified'` |
| `referenceId` | string | 관련 질문/답변 ID |
| `isRead` | boolean | 읽음 여부 |
| `createdAt` | timestamp | 생성 시간 |

---

## 3. UI/UX 구체화 및 기능 명세

### 3.1 학생용 UI (Student View)

#### A. 퀴즈 풀이 화면 연동 (In-Quiz Q&A)
*   **플로팅 버튼:** 문제 풀이 화면 우측 하단 또는 오답 노트 영역에 **[🙋 선생님, 힌트 주세요!]** 버튼 배치.
*   **컨텍스트 자동 첨부:** 버튼 클릭 시 모달이 뜨며, 현재 문제 번호와 학생이 선택한 오답이 자동으로 질문 양식에 포함됨.
*   **질문 유형 칩:** "개념이 이해 안 돼요", "문제가 이상해요", "해설을 봐도 몰라요" 등 빠른 선택지 제공.
*   **드로잉/스샷:** (심화 기능) 현재 문제 화면을 캡처하여 그 위에 펜으로 표시할 수 있는 기능 제공 (Fabric.js 등 활용).

#### B. 마이페이지 > 질문 보관함
*   **나의 질문:** 내가 한 질문의 상태(대기중/답변완료)를 리스트로 확인.
*   **알림 배지:** 새 답변이 달리면 빨간 점 표시.

#### C. 공개 커뮤니티 (The Agora) & 심리적 안전장치
*   **익명성 보장 (Random Character Names):** 질문 등록 시 **"닉네임 숨기기"** 옵션을 기본값으로 제공합니다.
    *   대신 시스템이 생성한 귀여운 랜덤 캐릭터 이름(예: *"호기심 많은 라쿤"*, *"용감한 거북이"*, *"미래의 뉴턴"*)으로 표시됩니다.
    *   **목표:** "내가 모른다는 사실"을 친구들에게 들키지 않도록 하여 질문의 심리적 장벽을 완전히 제거합니다.
*   **나도 궁금해요:** 다른 친구들의 공개 질문을 볼 수 있는 피드.
*   **미해결 질문 필터:** 내가 답변할 수 있는(아직 해결 안 된) 질문 모아보기.
*   **인기 질문:** `upvotes` 순 정렬.

#### D. 질문 취소 및 스스로 해결 (Self-Resolution Tracking) **[Refined]**
*   **기능:** 학생이 질문 후 답변이 달리기 전에 스스로 답을 찾으면 **[질문 취소]**를 할 수 있습니다.
*   **사유 수집:** 취소 시 *"앗! 다시 풀어보니 알겠어요"* 또는 *"해설을 다시 읽고 이해했어요"* 등의 사유를 선택하게 합니다.
*   **데이터 활용:** '스스로 해결' 횟수는 학생의 **메타인지 성장 지표**로 활용되어, 추후 리포트나 칭호 부여("스스로 깨우친 자")에 반영됩니다.

### 3.2 선생님/관리자용 대시보드 (Teacher Dashboard)

*   **실시간 인박스 (Inbox):** WebSocket(Firestore onSnapshot)으로 새 질문이 오면 즉시 리스트 상단에 꽂힘.
*   **스마트 필터:**
    *   `미답변` (우선순위 높음)
    *   `오래된 질문` (Red Alert)
    *   `퀴즈 오류 신고` (긴급)
    *   **오답 선지별 그룹화:** 같은 문제에서 동일한 오답(예: 3번 선지)을 선택한 질문들을 그룹화하여 보여줍니다. (한 번의 답변으로 여러 학생 동시 케어 가능)
*   **답변 인터페이스:**
    *   좌측: 학생이 보고 있는 문제 화면 & 학생의 오답.
    *   우측: 답변 작성란 (자주 쓰는 답변 매크로 기능 포함).


### 3.3 AI 프리-앤서 (AI Pre-Answer System) **[NEW]**

2026년형 운영 모델의 핵심으로, 선생님의 업무 부하를 80% 이상 줄여주는 'AI 비서'를 도입합니다. **Google Gemini API**를 활용하여 저비용 고효율로 구현합니다.

#### A. AI 초안 작성 (Teacher Assistant)
*   **작동 방식:** 학생 질문 등록 시, 백그라운드에서 AI가 퀴즈 데이터와 교과 과정을 분석하여 답변 초안을 생성하고 `draftAnswer` 필드에 저장합니다.
*   **선생님 UX:** 대시보드에서 질문 클릭 시, 빈 입력창 대신 AI가 작성한 초안이 미리 채워져 있습니다. 선생님은 내용을 쓱 훑어보고 **[승인/게시]** 버튼만 누르거나, 필요시 살짝 수정(Human-in-the-loop)하여 답변을 완료합니다.
*   **기대 효과:** 답변 작성 시간 단축 (평균 3분 -> 10초), 일관된 답변 톤앤매너 유지.

#### B. 유사 질문 추천 (Duplicate Prevention)
*   **작동 방식:** 학생이 질문 제목이나 내용을 입력하는 순간, 실시간으로 기존의 **해결된 질문** 중 유사도가 높은 질문을 검색(Vector Search or Keyword Matching)하여 보여줍니다.
*   **UX 메시지:** *"잠깐! 친구들이 이미 물어본 비슷한 질문이 있어요."*
*   **기대 효과:** 중복 질문 방지, 학생의 즉각적인 문제 해결(기다릴 필요 없음).

#### C. 비용 효율화 전략 (Cost Efficiency) **[IMPORTANT]**
*   **Gemini 1.5 Flash 활용:** 복잡한 추론이 필요한 영역이 아니므로, 빠르고 저렴한 **Flash 모델**을 사용합니다. (현재 기준 무료 티어 제공 또는 매우 저렴한 토큰 비용).
*   **캐싱(Caching):** 같은 문제에 대한 질문이 들어오면 AI를 재호출하지 않고, 기존에 생성된 모범 답안을 먼저 제시합니다.
*   **On-Demand 호출:** 모든 질문에 자동 생성하기보다, 학생이 'AI 힌트 보기'를 요청하거나 선생님이 'AI 초안 생성' 버튼을 누를 때만 호출하도록 설정하여 비용을 통제합니다.

---

## 4. 단계별 개발 계획 (Milestones)

### Phase 1: MVP (핵심 기능) - 1.5주 예상
*   **목표:** 1:1 질문 시스템 구축 (비공개 위주)
*   [Backend] Firestore `questions`, `answers` 컬렉션 생성 및 보안 규칙 설정.
*   [Client] 퀴즈 화면 내 '질문하기' 버튼 및 모달 UI 구현.
*   [Client] 텍스트 기반 질문 등록 및 DB 저장 로직.
*   [Admin] 간단한 관리자 페이지(질문 리스트 및 답글 달기) 구현.

### Phase 2: 소셜 러닝 & 커뮤니티 - 2주 예상
*   **목표:** 공개 질문 전환 및 또래 학습 유도
*   [Client] 질문 공개/비공개 토글 기능.
*   [Client] '수학 커뮤니티' 게시판 페이지 신설 (퀴즈 외 일반 질문 포함).
*   [Backend] '나도 궁금해요' (좋아요) 기능 및 카운트 로직.
*   [Feature] 학생 간 답변 달기 기능 및 '답변 채택' 기능.

### Phase 3: AI & Automation (The 2026 Model) - 1.5주 예상
*   **목표:** 운영 효율화 (AI 비서 도입)
*   [AI] Gemini API 연동 및 프롬프트 엔지니어링 (수학 문제 풀이 특화).
*   [Backend] 질문 텍스트 Vector Embedding 생성 및 저장 (또는 유사도 검색 알고리즘 구현).
*   [Client] 질문 작성 시 유사 질문 실시간 추천 UI.
*   [Admin] 선생님 답변 입력창에 AI 초안 자동 로드 기능.

### Phase 4: 실시간성 & 미디어 강화 - 1.5주 예상
*   **목표:** UX 경험 향상
*   [Client] 질문 시 **화면 그리기(Canvas)** 기능 추가.
*   [Client] 실시간 알림 센터 (Notification Center) 구현.

### Phase 5: 게이미피케이션 (동기 부여) - 1주 예상
*   **목표:** 활동 보상 시스템
*   [System] 포인트/코인 연동 (질문 시 소모, 채택 시 획득 등 경제 시스템).
*   [UI] 프로필에 '지식 탐험가', '베스트 답변러' 뱃지 표시.
*   [Rank] 주간/월간 답변 랭킹 리더보드.

---

## 5. 기술적 고려사항 및 권장 라이브러리

*   **State Management:** `TanStack Query`의 `useMutation` (질문 등록) 및 `useQuery` (리스트 조회) 활용. 실시간성은 `useFirestoreQuery` 커스텀 훅이나 `onSnapshot`을 `useEffect` 내에서 사용.
*   **Rich Text Editor:** 답변 작성 시 수식 입력이 필요할 수 있으므로, 경량 마크다운 에디터나 단순 텍스트 + LaTeX 지원(`react-katex`) 조합 권장.
*   **Drawing:** `react-sketch-canvas` 라이브러리를 사용하면 손쉽게 구현 가능.
*   **AI Integration:**
    *   **Google Gemini API:** 저렴한 비용으로 높은 수준의 한국어 수학 추론 가능. (`generateContent`)
    *   **Vector Search:** Firebase Extensions의 'Search with Algolia' 또는 'Vector Search with Firestore' 활용 고려. 초기에는 단순 키워드 매칭으로 시작해도 무방.
*   **Security:** Firestore Security Rules를 통해 `auth.uid == resource.data.userId` (본인 글 수정/삭제) 및 `isPublic == true` (공개 글 읽기) 권한을 철저히 관리해야 함.

## 6. 결론

이 시스템은 단순한 기능 추가가 아니라, 앱의 **Engagement(참여도)**를 획기적으로 높일 수 있는 핵심 피처입니다. 
우선 **Phase 1 (질문하기 버튼 및 DB 적재)**부터 빠르게 시작하여 데이터 쌓이는 것을 모니터링하는 것을 추천합니다.
