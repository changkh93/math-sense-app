# Learning Summary v3 최종 리뷰 및 보완

검토일: 2026-09-02. 범위: 현재 미커밋 v3 구현과 해당 저장·표시 경로.
운영 배포, 학생 데이터 수정, 운영 마이그레이션/감사는 실행하지 않았다.

## 확인 및 수정한 항목

| 우선순위 | 문제 | 보완 |
| --- | --- | --- |
| P1 | summary의 Mission Lab 완료 행이 UI 정규화에서 다시 제거됨 | 생성한 행에 단원 완료 marker를 유지하고 summary-only 회귀 테스트 추가 |
| P1 | migration의 전체 문서 set이 동시 history trigger의 최신 통계를 덮어쓸 수 있음 | 기존 문서는 units/schemaVersion만 lastUpdateTime 조건부 update. 충돌은 덮어쓰지 않고 중단. 새 문서는 create |
| P1 | beacon의 점 표기 키를 set에 전달해 중첩 completionHistorySynced가 저장되지 않음 | 실제 중첩 map으로 저장. 반복 호출 시 history 1회 쓰기 검증 |
| P2 | 깨끗한 progress sequence가 아직 저장하지 않은 completion history까지 생략 | 완료 marker가 없으면 beacon을 허용. 정상 완료는 기존 트랜잭션에서 marker 기록 |
| P2 | 저장 도중 hidden/pause 요청 누락 및 이전 화면의 늦은 저장 응답 | 요청 병합/후속 flush, effect 정리 후 UI 반영 차단, 저장 당시 sequence만 acknowledge |
| P2 | 로컬 캐시를 200ms 재생 콜백마다 전체 직렬화 | 5초 간격으로 제한. 별도의 DB 호출 없음 |
| P2 | freshness 검증에서 history 개수만 확인 | 기존 latest timestamp 검사 복원. 24시간 TTL 및 60초 서버 fast path 유지 |
| P2 | history만 있는 사용자의 migration 누락, 감사 실패도 exit 0 | 누락 사용자 초기화, 실제 저장 요약 감사, mismatch exit 2, 범위 인자 검증 |

추가 보완: 비콘 입력 필드 허용 목록, 클라이언트의 marker 조작 무시, 기존 완료의 false 회귀 방지,
일일 history의 기존 보상 필드 보존, storage 읽기 예외/잘못된 TTL 처리,
scratch builder의 기존 통계 입력 제거, schema 상수 중복 제거.

Firestore 점 표기 업데이트는 `update()`의 필드 경로 표현이다. `set(..., {merge:true})`에는
중첩 객체를 전달하도록 수정했다. [Firebase 공식 문서](https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects).

## 비용과 구현 범위

- 신규 리스너, Cloud Function, 컬렉션, 라이브러리를 추가하지 않았다.
- 정상 v3 history trigger에서 summary 사전 read와 progress read를 제거했다.
  해당 단원 history 쿼리와 transaction 내부 summary read는 유지한다.
  따라서 재시도가 없는 정상 이벤트에서 문서 read 2회를 줄인다. 이관/초기 rebuild 비용은 별도다.
- 기존 완료는 v3 이관으로 보존하고, 신규 완료는 같은 작업에서 기록하는 history/marker로 반영한다.
  이 전제 때문에 backend → migration → audit → frontend 배포 순서를 지켜야 한다.
- 재생 중 정기 서버 flush는 30초, 로컬 캐시는 5초다. pause/hidden/수동 저장은 별도 경계 이벤트다.
  잦은 경계 이벤트까지 포함한 전체 쓰기를 무조건 분당 2회라고 보장하지 않는다.
- 이관은 작은 범위의 순차 조건부 쓰기를 사용한다. 동시 처리용 별도 시스템 대신
  `--after <마지막 CHECKPOINT UID> --limit <건수>`로 재개한다. 충돌한 사용자는 `--uid`로 재검토한다.
- 실청구액 절감률은 측정하지 않았다. 위 수치는 코드상 호출 경로 비교다.

## 검증

- learning-summary, weekly-growth-loop, video-progress, quiz-session, google-auth 테스트 통과.
- video-progress에 실제 production effect/HTTP handler를 실행하는 in-memory I/O 테스트 추가:
  중첩 저장, 저장 중 후속 요청, clean 상태 무쓰기, stale effect, 비콘 재시도/중복 제거,
  완료 history 1회, 이전 보상 보존, 잘못된 사용자 접근 차단 확인.
- 신규 domain/migration/test 파일과 관련 utils의 ESLint, backend 구문 검사, diff --check 통과.
- 기존 대형 파일의 전역/미사용 변수 등 lint 문제는 범위 밖으로 유지했다.
- 프로덕션 빌드 통과. 기존 대형 chunk와 오디오 에셋 라이선스 경고는 남아 있다.

## 운영 전 남은 확인

1. backend를 먼저 배포하고 표본 사용자에 dry-run → apply → audit 실행.
2. 전체 migration 적용 후 실제 저장 데이터 audit의 mismatch 0 확인.
   이미 잘못된 이전 v3가 운영에 적용되었다면 OR 이관만으로 잘못된 true/통계까지 복구되지는 않는다.
   그 경우 별도의 원본 이력 대조가 필요하다.
3. 제보 사례와 Mission Lab 완료 계정에서 표시 확인 후 frontend 배포.
4. 실제 브라우저의 pause/hidden/탭 닫기 및 모바일 종료 확인.
   in-memory 테스트는 Firestore Emulator/E2E나 실제 모바일 lifecycle 검증을 대체하지 않는다.
