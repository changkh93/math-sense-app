# Frontier motion and exploration

- Goal: 사용자 요청에 따라 잠수/호버 동작을 걷기에서 분리하고 바다·하늘 탐험 경험을 확장한다.
- Coordinator/owner: Codex, 단독 로컬 구현. 외부 패킷 없음.
- Phase: DONE (local implementation), updated 2026-09-06.
- Baseline: c4a36864eb85a6152326650738603880de9064eb, main, 기존 공유 체크아웃.
- Dirty baseline: 기존 프론티어 탐험·종료 수정의 미커밋 파일이 있었다. 이를 보존하며 같은 기능을 확장했다. database.rules.json, functions, App 및 presence의 기존 변경을 되돌리지 않았다.
- Scope: GalaxyWorld3D, exploration 모듈, 동작 테스트, package scripts, 구현 문서.
- Acceptance: 수영/비행의 별도 포즈, 주변 해양 생물과 기포, 고도별 발견 장소, 종료 회귀 유지.
- Verification: motion/exploration/pointer-lock/navigation/terrain/builder tests passed. 브라우저 수중 자세·기포, 하늘 명소 및 발견 기록 증가 확인. 빌드 통과, 기존 lint seed 경고만 존재.
- Details: docs/astra-frontier-exploration-implementation.md.
- Limits: 운영 배포 없음. 원격 동작은 공통 함수 적용 및 코드 검증이며 다중 사용자 실기기·장시간 GPU 측정은 하지 않았다.
- Next: 현재 개발 화면에서 사용 가능. 사용자에게 필요한 외부 결과나 수동 릴레이 없음.
