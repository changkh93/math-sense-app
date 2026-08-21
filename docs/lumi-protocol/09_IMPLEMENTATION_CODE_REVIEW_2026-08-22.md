# LUMI Protocol Vertical Slice 구현 코드 리뷰

검토일: 2026-08-22  
대상: `lumi-vertical-slice-v1`, Mission Lab, Pyodide worker, 평가기, 진행 저장

## 1. 결론

카탈로그·순수 reducer·점진적 도구 공개라는 방향은 유지할 가치가 있다. 다만 최초 구현은 신규 10개 미션으로 들어가는 실제 라우팅이 연결되지 않았고, raw worker event와 평가기의 event type이 달라 말하기 목표가 실패하며, 일부 transfer variant가 구조상 통과할 수 없었다. 또한 매 RUN마다 Firestore 정리 query를 수행하고 raw event마다 React render를 발생시켜 사용자 수와 긴 반복문에 비례해 비용이 커지는 구조였다.

이번 리뷰에서 위 P0 문제를 직접 수정했다.

## 2. 반영한 수정

### 진입·진행

- feature flag가 켜졌을 때 Vertical Slice 버튼이 legacy 유닛 대신 실제 10개 미션 화면을 연다.
- 전용 course progress 문서 `learning_progress/lumi_protocol_vertical_slice`를 한 번 읽고 기존 Mission Lab 저장 구조를 재사용한다.
- 미션 탭은 VS-07부터 공개하며, 다음 미션을 순차 해제한다.
- VS-01 초기 화면에서는 HUD, 센서, 미션 탭, inspector를 숨긴다.

### 실행·평가

- 평가 전에 raw worker event를 v2 event로 정규화한다.
- `commandNotCalled`는 AST에 코드가 존재하는지가 아니라 실제 실행 event가 발생했는지를 검사한다.
- goal이 없는 잘못된 미션은 자동 성공하지 않는다.
- transfer가 없는 미션의 최대 별은 2성으로 수정했다. 3성은 실제 transfer 통과에만 부여한다.
- hidden variant는 공개 목표와 concept evidence가 통과한 뒤에만 실행해 불필요한 Pyodide 재실행을 줄였다.
- VS-06 이동 offset과 VS-09 array goal merge를 수정했다.
- worker의 world/sensor event에 실제 학생 코드 `sourceLine`을 붙였다.
- energy가 0인 초기 상태를 100으로 바꾸던 falsy-default 오류를 수정했다.

### 재생·UI

- 최대 1,600개의 raw event를 하나씩 재생하지 않고 소스 코드 실행 단계로 묶는다.
- 이전/다음, seek, play/pause, replay, 0.5×/1×/2× 속도를 같은 event tape에서 처리한다.
- 회전 방향 설명과 실제 좌표계 표현을 일치시켰다.
- 서버에서 늦게 도착한 draft가 다른 미션 편집기를 덮어쓰는 race를 막았다.

### 비용 효율성

- 방문만 한 미션의 starter code를 Firestore에 자동 저장하지 않는다. 실제 편집 후 2.5초 동안 멈췄을 때만 sync한다.
- 같은 draft의 중복 sync를 건너뛰고 저장 코드 크기를 20,000자로 제한한다.
- 미션별 run history를 고정된 20개 ring slot으로 저장한다. 이에 따라 매 RUN 뒤 최대 30개 문서를 읽고 삭제하던 retention query가 사라지고, run 원문도 무한 증가하지 않는다.
- mission summary와 run slot 저장을 병렬 처리한다.
- Vertical Slice 화면과 Pyodide runtime은 실제 진입 전까지 lazy-load한다.

참고: ring slot 도입 전에 이미 생성된 자동 ID run 문서가 운영 데이터에 존재한다면 별도 1회성 관리자 정리 또는 Firestore TTL 정책이 필요하다.

## 3. 아직 완료로 표시하면 안 되는 항목

1. `understandingPassed`는 아직 항상 `true`다. 현재 2성은 concept/call evidence 통과를 뜻하며, 별도의 이해 확인을 뜻하지 않는다. 짧은 예측·설명 선택 문제를 붙인 뒤 독립 필드로 판정해야 한다.
2. `sourceColumn`, 오류 editor marker, raw 오류 상세 펼치기는 아직 없다.
3. 실제 Python `input()`을 월드 입력 패널로 공급하는 기능은 P1이다.
4. `tuple`, unpacking, `split()`/`join()`의 본 학습 미션은 전체 코스의 Data Core 단계에 남아 있다. Vertical Slice는 `lumi.position` tuple API 토대만 제공한다.
5. 단위 테스트는 worker와 reducer 계약을 검증하지만, 실제 브라우저 Pyodide CDN 로드·Firestore security rule·한글 IME·iPad/Android 레이아웃을 검증하지 않는다.

## 4. 배포 전 수동 확인

- 테스트 계정 브라우저에서 `localStorage.setItem('lumiProtocolV2', 'true')` 후 허브 재진입
- VS-01부터 VS-10까지 새로 시작, 중간 이탈 후 복귀, 다른 기기 복귀
- VS-05 raw `lumi.say()`와 VS-06/09/10 transfer의 실제 Pyodide 실행
- 긴 반복문 실행 중 STOP, 재생 pause/replay/seek, reduced-motion
- 오프라인/권한 거부 시 코드 실행 결과가 저장 실패 때문에 막히지 않는지 확인
- Firestore에서 각 미션 `runs` 문서 수가 신규 데이터 기준 20개를 넘지 않는지 확인

## 5. 자동 검증

- Phase 1, 2, 4, 5, 6 계약 테스트 통과
- legacy `test:python-mission` 통과
- 변경 파일 ESLint 통과
- Vite production build 통과

