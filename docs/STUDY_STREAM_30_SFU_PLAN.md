# Study Stream 30명 SFU 전환 계획

> 작성 기준일: 2026-09-11  
> 목표: Google Meet를 주 경로로 쓰는 현재 크루 모임을 MetaSense 앱 내부의 최대 30명 Study Stream으로 전환하되, 초기와 운영 비용을 최소화한다.

## 1. 결론

권장안은 **기존 MetaSense 화면·Firebase 권한·크루 데이터는 유지하고, 영상 전송만 Cloudflare Realtime SFU로 교체**하는 것이다.

- 방 정원은 서버에서 30명으로 강제한다.
- 호스트를 고정하고 화면에는 최대 9개 영상만 구독한다. 나머지 멤버는 목록·집중 상태·발언 상태로 보여준다.
- 학생 마이크는 기본 OFF, 녹화는 1차 범위에서 제외한다.
- 3명 이하의 기존 PeerJS 방은 롤백 경로로 일시 유지할 수 있지만, 4~30명 방은 반드시 SFU를 사용한다.
- Google Meet는 파일럿 기간의 `예비 입장` 링크로만 유지하고, 안정화 후 기본 화면에서 숨긴다.

Google Meet REST API는 회의 공간을 만들고 입장 지점을 제공하지만, MetaSense 안에 Meet 영상 화면을 일반적인 임베드로 넣는 API는 제공하지 않는다. Meet Add-ons는 반대로 MetaSense 콘텐츠를 Meet 안에 넣는 구조다. 따라서 `MetaSense 안에서 화상 모임` 요구는 독립 WebRTC/SFU가 맞다.

## 2. 현재 코드 진단

이미 있는 자산:

- `StudyStreamRoomView.jsx`: 카메라/마이크, 집중 상태, 채팅, 타이머, 미니창, 재연결 UI
- Firebase callable: 방 생성·입장·퇴장·강퇴·호스트 이관
- Firestore: `studyRooms/{roomId}`와 `participants`
- 크루/학년별 오픈 스터디 풀, 관리자 제어, 일일 미션

반드시 고쳐야 할 불일치:

1. 기존 문서는 3명 P2P인데 실제 `createStudyRoom`과 오픈 스터디 풀은 `maxParticipants: 100`이다.
2. UI는 원격 타일 2개만 보여주지만, 네트워크 코드는 모든 참여자와 PeerJS 연결을 만든다. 30명이면 각 기기가 최대 29개의 업로드를 감당해야 한다.
3. 각 참여자가 15초마다 Firestore에 heartbeat를 쓴다. 30명이면 1시간에 약 7,200 writes이다.
4. 1분마다 최대 100개 방을 읽는 sweeper가 있어 오픈 방이 늘면 Firestore 읽기가 커진다.
5. PeerJS 기본값은 공용 신호 서버와 Google STUN만 사용하므로, 학교·학원과 같은 제한 네트워크에서는 영상 연결이 실패할 수 있다.

## 3. 목표 아키텍처

```text
React / StudyStreamRoomView
  ├─ Firebase Auth + App Check
  ├─ Firestore: 방·멤버십·영구 설정만
  ├─ Realtime Database: 온라인·heartbeat·onDisconnect·임시 발언 상태
  └─ MediaTransport
       ├─ PeerJsTransport: 최대 3명, 롤백/소규모 모드
       └─ CloudflareSfuTransport: 4~30명

Firebase Functions
  ├─ 크루 멤버십·방 상태·호스트 권한 검사
  ├─ Cloudflare App Secret 보관
  ├─ SFU session/track 생성·구독·종료 API proxy
  └─ 사용량·오류율·롤백 kill switch

Cloudflare Realtime SFU
  └─ 각 클라이언트는 SFU와 PeerConnection 1개만 유지
```

Cloudflare App Secret은 브라우저나 Firestore에 놓지 않는다. 세션·트랙 ID도 같은 방 회원만 읽게 하고, 모든 publish/subscribe/close 요청을 서버에서 다시 인가한다.

## 4. 30명 UX와 미디어 정책

### 화면 구성

- 데스크톱: 호스트 1 + 활성/선택 참여자 8명의 3x3 그리드
- 모바일: 호스트 1 + 참여자 3명, 페이지/활성 발언자 전환
- 나머지 참여자: 이름, 집중/자리비움, 카메라/마이크 상태, 손들기를 목록에 표시
- 다른 페이지로 이동하면 보이지 않는 영상 track은 즉시 unsubscribe한다. CSS로만 숨기면 전송비가 줄지 않는다.

### 영상 정책

- 호스트: 360p~540p, 15fps, 중간/높은 우선순위
- 학생 썸네일: 180p~270p, 10~12fps
- simulcast 3단계를 게시하고 SFU가 네트워크에 맞는 layer를 선택하게 한다.
- 학생 마이크는 기본 OFF. 호스트가 전체 마이크 잠금/해제, 개별 mute, 강퇴, 방 잠금을 제어한다.
- 기본 모드는 녹화·자동 자막·배경 필터를 제외한다. 추후 수요와 예산을 확인한 후 별도 단계로 추가한다.

## 5. 비용 비교

비교 기준은 **30명 x 90분 x 월 8회 = 21,600 participant-minutes**이다. 환율·세금·프로모션은 제외한다.

| 대안 | 예상 월 비용 | 장점 | 한계 |
|---|---:|---|---|
| Google Meet 외부 링크 | 60분 이하 무료, 유료 호스트 1석은 Business Starter 표준가 $7/월부터 | 가장 안정적, 개발 거의 없음 | MetaSense 내재화가 아님, 무료 3명 이상은 60분 제한 |
| **Cloudflare Realtime SFU** | **최적화 시 $0 가능성이 높음** | 1,000GB/월 무료, 초과 $0.05/GB, 업로드는 과금 제외 | 저수준 API이므로 구현·품질 검증이 더 필요 |
| Cloudflare RealtimeKit | $43.20/월 | 완성도 높은 회의 SDK로 개발이 빠름 | 영상 참여자당 $0.002/분, 무료 티어 없음 |
| LiveKit Cloud | 실사용은 $50/월 Ship + 초과 대역폭 가능 | 성숙한 SDK·운영·분석 | Build는 5,000분/50GB에 그쳐 본 사용량에 작음; Ship은 250GB 후 $0.12/GB |
| Jitsi/LiveKit 자체 호스팅 | 서버·한국 이그레스·운영 인건비에 따라 변동 | 제어권과 벤더 독립성 | 간헐적인 30명 모임에는 고정비·장애 대응으로 인해 보통 더 비쌈 |

### Cloudflare SFU 사용량 가정

권장 화면은 각 사용자가 호스트 1개, 학생 썸네일 8개, 활성 오디오를 받는다. 이를 약 2.0~2.5Mbps/사용자로 잡으면 30명·90분 1회가 약 40~55GB, 월 8회가 약 320~440GB다. 따라서 현재 1,000GB 무료 구간 안에 들 가능성이 높다.

이 수치는 설계용 추정치이다. 실제 WebRTC bitrate·코덱·재전송·네트워크 오버헤드는 파일럿에서 계측한다. 모든 29개 영상을 항상 구독하면 무료 구간을 빨리 소진하므로 허용하지 않는다.

## 6. 실행 단계

### Phase 0 — 안전 상한과 계측 (0.5~1일)

- 현재 PeerJS 방은 서버 정원을 3명으로 임시 고정한다.
- 100명으로 생성되는 기존 크루/오픈스터디 방을 찾아 신규 입장만 안전하게 제한한다.
- 연결 성공률, 입장 소요, ICE candidate 유형, 재연결, 클라이언트 수신 bitrate를 익명 집계한다.
- Meet `예비 입장` 경로를 유지한다.

### Phase 1 — 미디어 계층 분리·Firebase 비용 절감 (2~3일)

- `StudyStreamRoomView` 밖으로 `MediaTransport` 계약을 분리한다.
- Firestore 15초 heartbeat를 Realtime Database presence + `onDisconnect()`로 옮긴다.
- Firestore는 입장/퇴장, 역할, 세션 요약만 저장한다.
- 1분 전체 스윕을 온라인 방 인덱스/이벤트 기반 정리로 바꾼다.

### Phase 2 — Cloudflare SFU 10명 세로 슬라이스 (4~7일)

- 개발/운영 Cloudflare Realtime App을 분리한다.
- Firebase Functions에 시크릿 보관과 session/track proxy를 추가한다.
- 호스트 1 + 최대 8개 원격 영상 구독, 페이지 이동 시 구독 교체를 구현한다.
- 카메라/마이크 재연결, 호스트 권한, 강퇴, 방 잠금, 중복 탭을 검증한다.

### Phase 3 — 30명 파일럿 (2~4일)

- 5 → 10 → 20 → 30명으로 단계적 부하 검증을 한다.
- Chrome/Edge/Safari, Android/iPad, 가정 Wi-Fi/모바일/제한된 학원 네트워크를 포함한다.
- 90분 세션에서 호스트 이관, 탭 백그라운드, 잠자기/복귀, 일시 오프라인을 검증한다.
- 실제 이그레스·페이지당 구독 수·CPU/메모리·연결 실패율을 대시보드에 남긴다.

### Phase 4 — 제한 배포 (1~2주 관찰)

- 실제 크루 1~2개에만 feature flag로 연다.
- SFU 실패 시 자동으로 PeerJS 30명을 시도하지 않고, Meet 예비 입장을 제시한다.
- 700GB/850GB/950GB 월 사용량 경고와 최대 구독 수·화질을 즉시 낮추는 Remote Config kill switch를 둔다.
- 2주 간 성공 기준을 만족하면 기본 입장을 SFU로 전환한다.

## 7. 수락 기준

- 서버가 동시 참여 30명을 정확히 강제하고 31번째 입장을 차단한다.
- 30명이 접속해도 각 클라이언트의 원격 영상 구독은 데스크톱 8개, 모바일 3개를 넘지 않는다.
- 보이지 않는 영상은 실제 네트워크 구독에서 해제된다.
- 호스트만 전체 mute/방 잠금/강퇴를 수행할 수 있고, 서버 검사를 우회할 수 없다.
- 90분간 실행 후 세션·트랙·카메라가 정리되고 다음 방 입장을 막지 않는다.
- 파일럿에서 입장 성공률 98% 이상, p95 초기 미디어 연결 8초 이하를 목표로 한다.
- 인가되지 않은 회원은 방 메타데이터, 참여자, session/track ID를 읽거나 제어할 수 없다.
- 녹화는 없고, 필수 운영 로그는 짧은 보존 기간과 최소 필드만 사용한다.

## 8. 시행 순서 결정

1. **바로 해야 할 것:** 현재 PeerJS 방의 실제 정원을 3명으로 잠그고 heartbeat 비용을 줄인다.
2. **첫 선택:** Cloudflare Realtime SFU로 10명 세로 슬라이스를 만든다.
3. **조건부 대안:** SFU 개발이 예상보다 늦거나 10명 파일럿 품질이 부족하면 RealtimeKit으로 전환한다. 월 8회 기준 $43.20은 자체 SFU 장애 대응보다 싸다고 판단될 때 수용한다.
4. **하지 않을 것:** PeerJS mesh의 정원만 30명으로 늘리기, 공개 Jitsi 서버를 생산 서비스로 의존하기, 초기부터 녹화/화면 공유를 포함하기.

## 9. 검증한 가격·기술 출처

- [Cloudflare Realtime SFU 개요](https://developers.cloudflare.com/realtime/sfu/)
- [Cloudflare Realtime SFU 가격: 1,000GB/월 무료, 초과 $0.05/GB](https://developers.cloudflare.com/realtime/sfu/pricing/)
- [Cloudflare Realtime SFU simulcast](https://developers.cloudflare.com/realtime/sfu/simulcast/)
- [Cloudflare Realtime 세션·트랙 구조](https://developers.cloudflare.com/realtime/sfu/sessions-tracks/)
- [Cloudflare RealtimeKit 가격](https://developers.cloudflare.com/realtime/realtimekit/pricing/)
- [LiveKit Cloud 가격](https://livekit.com/pricing)
- [Firebase 가격과 Firestore 무료 할당량](https://firebase.google.com/pricing)
- [Firebase Realtime Database 비용](https://firebase.google.com/docs/database/usage/billing)
- [PeerJS 기본 공용 신호 서버](https://peerjs.com/server/cloud)
- [PeerJS 기본 ICE/STUN 설정](https://peerjs.com/client/api/peer)
- [Google Meet API 개요](https://developers.google.com/workspace/meet/api/guides/overview)
- [Google Meet Add-ons 구조](https://developers.google.com/workspace/meet/add-ons/guides/quickstart)
- [Google Meet 무료 회의 정원·시간 제한](https://support.google.com/meet/answer/7317473)
- [Google Workspace 가격](https://workspace.google.com/pricing?hl=ko)
