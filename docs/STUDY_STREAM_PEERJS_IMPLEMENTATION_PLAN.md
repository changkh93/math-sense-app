# Study Stream PeerJS Implementation Plan

## 1. Goal

Meta Sense의 기존 `Study Crew -> Google Meet 링크 이동` 구조를 제거하고, 앱 내부에서 바로 참여하는 `Study Stream` 집중방으로 전환한다.

이번 단계의 목표는 아래와 같다.

- 최대 3명까지 입장 가능한 소규모 카메라 집중방 제공
- 크루 승인 후 외부 링크 없이 앱 안에서 집중방 생성/입장 가능
- 창설자 포함 최대 3명 제한을 서버에서 강제
- WebRTC P2P는 `PeerJS`로 단순화
- Firestore는 방 상태, 참여자, Peer ID, 집중 상태를 동기화하는 용도로 사용

이번 문서의 범위는 MVP 기준이다. 대규모 StudyStream 서비스가 아니라, 3인 고정 집중방을 안정적으로 운영하는 첫 버전을 정의한다.

## 2. Product Decision

### 2.1 What changes

기존:

- 크루 생성
- 관리자 승인
- Google Meet URL 등록
- 외부 미팅 링크로 이동

변경 후:

- 크루 생성
- 관리자 승인
- 크루 내부에서 `Study Stream Room` 생성
- 앱 내부에서 카메라 집중방 입장

### 2.2 Why PeerJS

이번 버전은 방당 최대 3명이다.

- 3명까지는 브라우저 간 직접 연결(P2P) 비용과 난이도가 감당 가능하다.
- SFU(LiveKit 등) 없이 시작할 수 있어 인프라 부담이 낮다.
- PeerJS는 WebRTC의 signaling/connection 복잡도를 줄여준다.

단, 이 선택은 명확한 한계가 있다.

- 4명 이상 확장 시 품질 저하 가능성이 높다.
- 추후 10명 이상을 목표로 하면 SFU 구조로 재설계가 필요하다.

이번 구현은 `3인 집중방 최적화`가 목적이다.

## 3. User Experience

### 3.1 Crew main view

스터디 크루 메인에 아래 순서로 노출한다.

1. `Study Stream` 요약 카드
2. 현재 열려 있는 집중방
3. 내가 가입한 크루
4. 기존 크루 목록

### 3.2 Host flow

크루 리더는:

- 승인된 크루에서만 집중방 생성 가능
- 세션 시간 선택 가능: 30분 / 50분 / 90분
- 집중방 생성 즉시 호스트로 참여
- 카메라 권한 허용 후 자신의 영상 노출

### 3.3 Member flow

크루 멤버는:

- 현재 열린 방이 있으면 입장 가능
- 방이 `3/3`이면 입장 불가
- 참여 후 자신의 카메라와 상태를 동기화

### 3.4 Room experience

방 화면의 기본 원칙:

- 마이크 기본 OFF
- 카메라 중심
- 타일은 최대 3개
- 집중 타이머 제공
- 자리비움 / 집중 중 상태 제공
- 응원 기능은 차후 이벤트 기반으로 확장

## 4. Scope

### 4.1 Included in MVP

- PeerJS 기반 3인 카메라 방
- 방 생성 / 입장 / 나가기
- Firestore room/participant sync
- 카메라 ON/OFF
- 마이크 ON/OFF
- 방 정원 3명 서버 강제
- 관리자 승인 흐름에서 Meet URL 제거
- 기존 크루 UI에서 `Study Stream` 섹션 추가

### 4.2 Excluded from MVP

- 녹화
- 화면 공유
- 채팅
- 대규모 타일 그리드
- 자동 재접속 고도화
- TURN 서버 자체 운영
- 모바일 최적화 세부 조정
- 학부모 관전 모드

## 5. Technical Architecture

### 5.1 Overall

```text
React client
  -> Firebase Auth
  -> Firestore (room state / participants)
  -> PeerJS signaling server
  -> WebRTC P2P media streams

Firebase Functions
  -> createStudyRoom
  -> joinStudyRoomSession
  -> leaveStudyRoomSession
```

### 5.2 Responsibilities

React client:

- 카메라/마이크 권한 요청
- Peer 객체 생성
- 상대 peerId를 구독하고 call 연결
- remote stream 렌더링
- 참여자 상태 업데이트

Firestore:

- 현재 열린 방 상태 보관
- 참여자 목록 보관
- 각 참여자의 peerId, mic/camera/focus 상태 동기화

Firebase Functions:

- 방 생성 권한 검사
- 최대 인원 3명 제한 검사
- 참여/퇴장 트랜잭션 처리
- 크루 승인 여부 검사

## 6. Firestore Data Model

### 6.1 `studyRooms/{roomId}`

```js
{
  crewId: string,
  crewName: string,
  crewColor: string,
  title: string,
  hostUid: string,
  hostName: string,
  status: "waiting" | "live" | "ended",
  mode: "focus",
  maxParticipants: 3,
  durationMinutes: number,
  participantIds: string[],
  participantCount: number,
  peerServerMode: "peerjs-public",
  createdAt: Timestamp,
  startedAt: Timestamp | null,
  endedAt: Timestamp | null,
  lastActivityAt: Timestamp
}
```

### 6.2 `studyRooms/{roomId}/participants/{uid}`

```js
{
  uid: string,
  displayName: string,
  role: "host" | "member",
  peerId: string,
  cameraOn: boolean,
  micOn: boolean,
  focusStatus: "focused" | "away" | "break",
  joinedAt: Timestamp,
  lastSeenAt: Timestamp,
  deviceLabel: string
}
```

### 6.3 Crew document relation

`crews/{crewId}`에는 직접 대용량 room state를 넣지 않는다.

필요 최소한만 유지한다.

```js
{
  activeStudyRoomId: string,
  activeStudyRoomStatus: "waiting" | "live" | "ended" | "",
  studyRoomCapacity: 3
}
```

사용 이유:

- 크루 뷰에서 현재 방 존재 여부를 빠르게 표시
- 참가자 컬렉션 전체를 매번 계산하지 않기 위함

## 7. Security Rules

### 7.1 Rooms

- 일반 클라이언트는 `studyRooms` 문서를 읽을 수 있다.
- 방 생성/수정/삭제는 기본적으로 callable function을 통해서만 수행한다.
- 직접 room 문서 수정은 막는다.

### 7.2 Participants

- 참가자는 자신의 participant 문서만 갱신 가능
- 갱신 가능 필드:
  - `peerId`
  - `cameraOn`
  - `micOn`
  - `focusStatus`
  - `lastSeenAt`
- 본인이 방의 참여자일 때만 허용

## 8. Functions Design

### 8.1 `createStudyRoom`

입력:

```js
{
  crewId: string,
  durationMinutes: 30 | 50 | 90
}
```

검사:

- 로그인 여부
- 해당 유저가 크루 리더인지
- 크루 상태가 `approved`인지
- 이미 종료되지 않은 active room이 없는지

동작:

- room 문서 생성
- host participant 문서 생성
- crew 문서에 `activeStudyRoomId` 기록

### 8.2 `joinStudyRoomSession`

입력:

```js
{
  roomId: string
}
```

검사:

- 로그인 여부
- 같은 크루 멤버인지
- room 상태가 `waiting` 또는 `live`인지
- 현재 인원이 3명 미만인지
- 이미 참여 중인지

동작:

- participantIds에 uid 추가
- participantCount 증가
- participant 문서 생성

### 8.3 `leaveStudyRoomSession`

입력:

```js
{
  roomId: string
}
```

검사:

- 로그인 여부
- 실제 참여 중인지

동작:

- participant 문서 삭제
- participantIds에서 제거
- 호스트가 나갔고 멤버가 남아 있으면 새 host 재지정
- 마지막 참가자가 나가면 room 종료
- crew 문서 activeStudyRoom 정보 정리

## 9. PeerJS Client Design

### 9.1 Peer creation

- 방 진입 후 `getUserMedia()` 호출
- `new Peer()` 생성
- `peer.on("open")`에서 `peerId`를 participant 문서에 저장

### 9.2 Outbound call strategy

중복 연결을 막기 위해 호출 규칙을 고정한다.

- 현재 유저 UID가 상대 UID보다 사전순으로 앞설 때만 `peer.call()` 수행
- 나머지는 incoming call만 answer

이 규칙으로 각 peer pair 당 call을 1개만 만든다.

### 9.3 Incoming call

- `peer.on("call", call => call.answer(localStream))`
- 상대 stream 도착 시 타일에 반영

### 9.4 Cleanup

- leave 버튼
- 컴포넌트 unmount
- 브라우저 unload

위 세 경우에:

- media track stop
- call close
- peer destroy
- 서버 측 leave callable 호출

## 10. UI Plan

### 10.1 Crew summary card

- 현재 활성 방 상태
- 참여 인원 `1/3`, `2/3`, `3/3`
- 세션 시간
- 생성자 이름
- `집중방 열기` / `입장하기` / `가득 참`

### 10.2 Room layout

상단:

- 방 제목
- 크루명
- 세션 타이머
- 현재 인원

중앙:

- 3인 타일 레이아웃
- 내 타일 강조
- focus status badge

하단:

- 카메라 토글
- 마이크 토글
- 상태 변경
- 나가기

## 11. Known Risks

### 11.1 NAT / firewall

PeerJS public signaling만으로도 많은 환경에서 동작하지만, 일부 학교/기관 네트워크에서는 연결 실패 가능성이 있다.

대응:

- MVP는 STUN 기반으로 시작
- 실사용 실패율이 높으면 TURN 포함 구조로 전환

### 11.2 Browser/device performance

3명까진 감당 가능하지만 저사양 기기에서는 카메라 3개 재생 시 성능 저하 가능

대응:

- 기본 360p
- 마이크 OFF
- 비디오 타일 수 고정

### 11.3 Disconnect/rejoin consistency

브라우저 새로고침, 탭 종료, 네트워크 끊김 시 participant 정리가 꼬일 수 있다.

대응:

- `lastSeenAt` 저장
- 서버 측 stale participant 정리 함수는 차후 추가

## 12. Rollout Plan

### Phase 1

- 문서 작성
- Meet 개념 제거
- room schema 및 functions 추가
- UI에 Study Stream 카드 추가

### Phase 2

- PeerJS 연결 구현
- local/remote stream 렌더링
- 2명, 3명 실기 테스트

### Phase 3

- 재접속 안정화
- stale participant cleanup
- 모바일 레이아웃 개선

## 13. Immediate Tasks

1. `meetUrl` 승인 흐름 제거
2. `Study Stream` room schema 추가
3. `create/join/leave` callable 추가
4. `StudyCrewView`에 방 카드 추가
5. `StudyStreamRoomView` 컴포넌트 추가
6. PeerJS dependency 연결
7. Firestore rules 업데이트
8. build 및 lint 검증

## 14. Success Criteria

아래 조건이 만족되면 이번 단계는 성공이다.

- 승인된 크루 리더가 앱 안에서 방을 열 수 있다.
- 같은 크루 학생이 앱 안에서 그 방에 입장할 수 있다.
- 최대 3명까지만 입장된다.
- 3명의 카메라가 서로 보인다.
- 방을 나가면 participant 상태가 정리된다.
- 기존 Google Meet URL 의존이 제거된다.
