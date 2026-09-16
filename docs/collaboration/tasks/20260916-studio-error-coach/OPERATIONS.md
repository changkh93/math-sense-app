# 코드 스튜디오 오류 도우미 운영 준비

이 문서는 구현된 기능의 연결 절차다. 2026-09-16 새 프로젝트와 Secret 4번으로 합성 데이터 Luna 호출(HTTP 200) 및 동일 요청 캐시를 확인했다. 학생용 활성화, 배포 및 운영 설정 쓰기는 아직 수행하지 않았다. 상세 이력은 STATE.md를 참조한다.

## 새 msense 프로젝트와 키

1. OpenAI Platform에서 새 프로젝트 `msense`를 만들고 해당 프로젝트를 선택한다. 화면에 표시되는 조직 이름과 프로젝트는 별개이므로 실제 프로젝트 ID(`proj_…`)를 확인한다.
2. 그 프로젝트의 API keys에서 새 서버용 키를 만든다. Responses API 쓰기 권한과 `gpt-5.6-luna` 모델 접근이 필요하다. 실제 계정 접근 가능 여부는 합성 코드로 연결 시험할 때 확인한다. 다른 모델로 대체하지 않는다.
3. 키는 채팅·코드·Git·프런트엔드 환경 변수에 넣지 않는다. 관리자가 아래 명령의 비공개 입력 프롬프트에 직접 입력하여 Firebase Secret의 새 버전으로 등록한다. 키를 명령줄 인자에 붙이지 않는다.

```sh
firebase functions:secrets:set OPENAI_API_KEY --project math-sense-1f6a8
```

4. 새로운 키를 사용하게 하려면 해당 Secret을 참조하는 함수를 재배포해야 한다. 이 변경에서 새로 연결하는 함수는 `studioErrorCoach` 하나다. 기존 Secret의 다른 사용처가 있다면 교체 전에 영향을 확인한다. 이전 키를 임의로 삭제하지 않는다.

프로젝트 ID는 비밀 키가 아니다. 서버는 `OpenAI-Project` 헤더에 이를 지정한다. 잘못된 프로젝트/키 조합이면 자동으로 다른 키·모델로 우회하지 않는다.

## 학생용 활성화 전 확인

대상에 13세 미만 학생이 포함된다. 주석/문자열을 제거해도 식별자에 이름이 남을 수 있으므로 완전 익명화로 간주하지 않는다. **학생 개인정보를 처리할 가능성이 있는 운영 연결은 해당 OpenAI 프로젝트의 승인된 Zero Data Retention 적용을 확인한 뒤 활성화한다.** `store:false` 설정이나 새 프로젝트 생성만으로 ZDR이 적용되는 것은 아니다. 실제 승인 상태, 적절한 학생/보호자 안내·동의 및 교사의 확인 경로를 운영자가 확인한다.

근거: [OpenAI 미성년자 지침](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), [데이터 관리](https://developers.openai.com/api/docs/guides/your-data). 이는 모델이 자동으로 ZDR을 제공한다는 첨부 글의 설명을 그대로 채택하지 않은 것이다.

관리자 권한의 Firebase 콘솔/서버에서만 `studioCoachControl/config` 문서를 설정한다. 클라이언트 규칙은 이 경로와 사용량 경로를 허용하지 않는다. 문서가 없으면 AI 호출은 꺼져 있다.

```json
{
  "enabled": false,
  "childDataReady": false,
  "projectId": "proj_REPLACE_WITH_NEW_MSENSE_PROJECT_ID",
  "perUserDay": 10,
  "perDay": 300,
  "perMonth": 3000
}
```

새 키 등록·합성 데이터 연결 검증·아동 데이터 준비 확인을 마친 후에만 `childDataReady`와 `enabled`를 true로 변경한다. 급히 중단하려면 `enabled:false`로 바꾼다. 매 요청마다 확인하므로 다음 요청부터 차단되지만 이미 시작된 요청은 취소하지 않는다. 새 키의 합성 데이터 연결 검증은 완료했으며 아동 데이터 준비 확인은 남아 있다.

## 비용 통제와 보관

- 기본 원인/수정 방법은 즉시 표시하고 확인 방법·문법 예시는 펼쳐보기로 제공한다. 브라우저에서 처리하며 서버/API 호출은 없다.
- AI: 학생이 전송 내용을 검토하고 요청했을 때 한 번 호출. 답변 안의 질문/확인 방법을 나눠 보는 것은 추가 호출 없음.
- 인증된 Python 활성 수강생/관리자만 이용. 모델은 `gpt-5.6-luna` 고정. 입력 코드 최대13줄/3200자, 오류500자, 출력700토큰, API 대기20초. 자동 재시도·다른 모델·도구 호출 없음.
- 기본 예약 한도: 사용자 하루10회, 서비스 하루300회/월3000회. UTC 기준. 조정 가능한 상한은 각각30/3000/30000회. 한도는 요청 전 Firestore 트랜잭션으로 확보한다. 오류/시간 초과도 예약 횟수를 차감한다. 30초 간격 제한, 같은 사용자의 같은 요청은 같은 날 중복 방지. 이 통제는 이 함수의 호출에 한정된다.
- OpenAI 대시보드 예산 알림과 별개로 서버가 호출을 차단한다. Firestore 읽기/쓰기와 Functions 실행 비용은 별도이며, 무제한 무료라고 안내하지 않는다.
- `studioCoachUsage`에는 날짜별 횟수, 시간, HMAC 요청 지문만 저장한다. 학생 코드/오류 본문/AI 답변을 Firestore나 앱 로그에 저장하지 않는다. 응답은 최대15분/100개 서버 메모리 및 15분/50개 클라이언트 메모리에만 캐시된다. 페이지 갱신·서버 재시작 후 답변 재생은 보장하지 않는다. 중복 예약은 유지된다.
- `studioCoachUsage.expiresAt`를 Firestore TTL 필드로 활성화하면 만료된 지문이 정리된다(사용자3일, 일별40일, 월별100일). TTL은 이 코드만으로 활성화되지 않는다. 아직 운영 TTL은 설정하지 않았다.
- 개인정보 미리보기를 우회하는 요청도 서버에서 다시 최소화한다. 이는 완전한 개인정보 탐지 보장이 아니다. 프롬프트/코드/원시 API 오류를 모니터링 로그에 추가하지 않는다.

## 검증과 배포 범위

```sh
node --test functions/studioErrorCoach.test.cjs
node scripts/qa-studio-error-coach.mjs
npm run build
```

실제 WASM 파일/노트북 오류와 합성 전송을 검증한다. 유료 모델의 설명 정확도·어린이 이해도는 별도다. 새 키로 문법/이름/자료형/파일 경로/노트북 이전 셀 오류 등 합성 사례를 시험하고 교사가 검토한 후 학생용으로 켠다. 노트북의 이전 셀 함수 오류는 실행기가 파일명을 공유하기 때문에 출처가 모호하면 API에 잘못된 셀을 보내지 않고 기본 힌트/교사 확인을 안내한다.

배포 요청을 받은 뒤 관련 파일만 커밋해 깨끗한 릴리스 체크아웃을 만든다. 이 작업 디렉터리에는 무관한 변경이 있다. 해당 릴리스에서 새 함수 `functions:studioErrorCoach`와 Hosting만 배포하고, 다른 함수·학생 과제·평가·규칙은 배포하지 않는다. TTL 설정은 별도로 운영자에게 보고한다.

공식 API 근거: [Luna 모델](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [구조화 출력](https://developers.openai.com/api/docs/guides/structured-outputs), [프로젝트 헤더/키](https://developers.openai.com/api/reference/overview).
