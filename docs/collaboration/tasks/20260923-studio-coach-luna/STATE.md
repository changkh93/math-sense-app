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
