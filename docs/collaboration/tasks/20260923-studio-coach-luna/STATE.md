# 코드 오류 도우미 GPT-6 Luna 전환 — 2026-09-23

- 사용자 요청: `gpt-5.6-luna` → `gpt-6-luna`; 이후 커밋·푸시·실운영 배포 요청.
- OpenAI Docs로 모델 ID, Responses API, 구조화 출력 및 `reasoning.effort: none` 지원 확인: https://developers.openai.com/api/docs/models/gpt-6-luna
- `functions/studioErrorCoachPolicy.mjs`의 고정 모델 변경. 운영 검증 스크립트도 같은 상수를 참조하도록 변경. 과거 배포/검증 기록은 그대로 보존.
- 호출 시점(사용자 요청), 프롬프트, 구조화/마스킹된 입력, 답변 스키마, `store:false`, 출력 700토큰, 20초 제한, 인증/수강 권한, 사용량 제한, 재시도·대체 모델 없음은 유지.
- 검증: `npm run test:studio-coach-learning` 65개 통과. 실제 요청 모델과 캐시 응답 모델을 `gpt-6-luna`로 검증. 운영 검증 스크립트 구문 및 변경 파일 공백 검사 통과.
- 합성 Turtle 생성자 오류 1건으로 로컬 환경의 API 키를 이용해 실제 Responses 호출: HTTP 403, `model_not_found`. 모델 응답 품질과 해당 키의 접근 가능 여부는 검증되지 않음.
- 실제 호출은 운영 Firestore/Firebase 인증/Secret을 사용하지 않았음. 가짜 저장소는 메모리에만 존재하며, 합성 프로젝트 헤더는 제거해 로컬 키의 기본 프로젝트를 사용. 학생 데이터 전송·운영 쓰기 없음.
- 운영 Secret 버전 4와 운영 OpenAI 프로젝트로 합성 Turtle 생성자 오류 1건 재시험: HTTP 200, 응답 모델 `gpt-6-luna`, 한국어 네 필드 답변, 동일 요청 캐시 확인. 학생 데이터/운영 DB 변경 없음. `preflight.json` 참조.
- 로컬 환경 키의 실패는 운영 키의 실패를 의미하지 않았음. 모델 대체 없이 운영용 키로 접근을 확인함.

## 릴리스 결과

- 코드 스튜디오·오류 도우미 관련 파일만 `49b1ff48`로 커밋하고 `origin/main`에 푸시. 별도 Git 아카이브에서 빌드해 다른 미완성 작업을 배포에서 제외.
- `npm run test:studio-coach-learning` 65개, `npm run test:python-game-studio` 34개, Python 터틀/동기화 테스트 14개, 전체 빌드 통과.
- Firebase `studioErrorCoach(asia-northeast3)` 함수와 Hosting `math-sense-1f6a8` 배포 성공.
- 배포된 함수를 임시 합성 수강생으로 호출해 GPT-6 Luna 한국어 네 필드 답변·중복 차단·인증 경계 확인. 임시 계정과 문서는 테스트 후 삭제됨.
- `https://msense.me/python-game-studio`에서 거북이 그림의 별도 창/도형 DOM, `print()`의 출력·오류 영역 전용 표시, 그래픽 창 종료, 편집 코드 복원을 확인.
- 운영 코드 스튜디오 JS 번들의 SHA-256이 배포본과 일치: `127df47527af1e8325b1c1186cb881a2f257e728fac47312f9a239ede7d7fdc7`.
- 배포 빌드 중 기존 정적 페이지 생성기의 esbuild 진단이 출력됐지만 빌드/배포 명령은 성공했고 코드 스튜디오 운영 경로는 별도로 확인됨. 이 진단은 이번 코드 스튜디오 변경과 무관한 AlgorithmConstellation import 경로에서 발생했으며, 해당 정적 경로의 포괄 검증까지 뜻하지 않음.
