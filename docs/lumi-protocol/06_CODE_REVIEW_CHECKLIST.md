# LUMI Protocol 코드 리뷰 체크리스트

## 1. 사용법

구현 완료 후 리뷰 요청에는 다음을 포함한다.

- 변경 목적과 관련 요구사항 ID
- 변경 파일 목록
- 데이터/런타임 계약 변경 여부
- 실행한 테스트와 결과
- 수동 QA 환경
- 알려진 미완료·위험

리뷰는 UI 모양만 보지 않고 교육 순서, runtime 결정성, progress 호환, 평가 의미를 함께 확인한다.

## 2. 차단 이슈 기준

다음은 발견 시 승인할 수 없는 P0/P1 문제다.

- 초반 학생 코드에 설명 없는 import가 다시 노출됨
- hidden setup 때문에 오류/Trace 줄 번호가 어긋남
- Python 실행 중 renderer 상태를 직접 변경해 replay가 비결정적임
- 별점이 힌트 사용으로 감소함
- 기존 완료/별/초안이 사라지거나 미완료로 되돌아감
- 정답 문자열만 비교해 대체 풀이를 거절함
- `world.target_distance`를 직선 거리라고 잘못 설명함
- 학생 입력이나 코드가 의도 없이 공개/장기 저장됨
- arbitrary import/network/DOM/Firebase 접근 가능
- feature flag off에서도 기존 화면이 회귀함
- 모바일에서 RUN/Reset 또는 editor가 사용 불가능함

## 3. 제품·학습 리뷰

### 진입과 인지 부하

- [ ] VS-01은 World + Code + RUN 중심인가?
- [ ] 첫 화면에서 API, raw JSON, 전체 미션 탭이 숨겨져 있는가?
- [ ] 미션마다 새로운 핵심 사고 개념이 하나로 설명되는가?
- [ ] 새 API가 사용 전에 월드에서 의미를 보였는가?
- [ ] 첫 6개가 하나의 Movement Core 승리로 끝나는가?

### 서사와 연출

- [ ] 일반 서사는 5~15초 안에 끝나거나 skip 가능한가?
- [ ] 서사를 읽지 않아도 목표가 이해되는가?
- [ ] 월드 연출이 현재 코드 줄과 직접 연결되는가?
- [ ] 루미·목표·경로가 첫 시선에 식별되는가?
- [ ] 실패 장면이 다음 수정 행동을 알려주는가?

### 학습 전이

- [ ] 공개 성공과 transfer 성공을 구분하는가?
- [ ] 고정 숫자 우회가 3성을 받지 않는가?
- [ ] alternative solution이 불필요하게 차단되지 않는가?
- [ ] Predict/Understanding이 단순 정답 암기가 아닌가?

## 4. Runtime 리뷰

- [ ] 학생 코드와 reported sourceLine/sourceColumn이 일치하는가?
- [ ] pre-bound globals 또는 올바른 lineMap을 사용하는가?
- [ ] 같은 입력의 event tape가 의미적으로 결정적인가?
- [ ] `seq`가 유일하고 단조 증가하는가?
- [ ] wall-clock/random renderer 값이 평가 이벤트에 섞이지 않는가?
- [ ] runtime error 직전까지 events를 보존하는가?
- [ ] max command/event/output/time 제한이 유지되는가?
- [ ] STOP 후 worker가 다시 준비 상태가 되는가?
- [ ] 금지 builtin/import가 우회되지 않는가?

## 5. Playback·World 리뷰

- [ ] 실행과 playback이 분리되어 있는가?
- [ ] playhead를 뒤로 이동하면 world가 정확히 복원되는가?
- [ ] skip/replay/reset이 final state를 훼손하지 않는가?
- [ ] 의미 Step이 line + memory + world 변화를 묶는가?
- [ ] 0.5×/1×/2×에서 event 순서가 동일한가?
- [ ] reduced motion에서도 결과와 상태 변화가 보이는가?
- [ ] animation completion callback 실패가 진행 저장을 막지 않는가?

## 6. API 리뷰

- [ ] Beginner API 밖의 복잡한 접근이 초급 패널에 노출되지 않는가?
- [ ] `steps_to_target`의 의미와 계산이 일치하는가?
- [ ] `target_distance` legacy 코드가 깨지지 않는가?
- [ ] `lumi.position`이 Python tuple로 동작하는가?
- [ ] API마다 하나의 일관된 뜻이 있는가?
- [ ] 새 API에는 unit/contract test와 도입 미션이 있는가?

## 7. `input()` 리뷰

- [ ] 학생 UI는 월드 관제 입력으로 표현되는가?
- [ ] 실제 Python `input()`은 문자열을 반환하는가?
- [ ] `int()` 없이 숫자 명령에 쓰면 적절한 TypeError 학습이 가능한가?
- [ ] 실행 도중 비동기 prompt에 의존하지 않고 입력 queue가 결정적인가?
- [ ] hidden variant가 다른 input 값으로 전이를 검증하는가?
- [ ] 개인정보를 입력하도록 유도하지 않는가?

## 8. 평가·Assistance 리뷰

- [ ] 1·2·3성의 근거가 서로 다른 필드로 저장되는가?
- [ ] 힌트 사용이 stars를 직접 변경하지 않는가?
- [ ] Assistance Level과 Rescue 사용이 별도 저장되는가?
- [ ] 더 적은 도움으로 재성공하면 best assistance가 개선되는가?
- [ ] 교사용 데이터와 학생 보상 표현이 분리되는가?
- [ ] hidden/transfer 실패 메시지가 공개 정답을 누설하지 않는가?

## 9. 데이터·호환 리뷰

- [ ] 새 schema가 additive인가?
- [ ] v1 progress normalize가 안전한가?
- [ ] 기존 mission ID 의미를 조용히 바꾸지 않았는가?
- [ ] major learning goal 변경 시 새 ID 또는 migration이 있는가?
- [ ] legacy unit direct entry가 유지되는가?
- [ ] feature flag rollback이 가능한가?
- [ ] draft 저장 실패가 학생 코드를 조용히 잃게 하지 않는가?
- [ ] run 보존 정책이 과도한 원문 코드를 무한 저장하지 않는가?

## 10. UI·접근성 리뷰

- [ ] color만으로 상태를 구분하지 않는가?
- [ ] focus order와 aria-label이 유효한가?
- [ ] keyboard로 Run, Reset, Hint, Step을 사용할 수 있는가?
- [ ] 한글 IME 입력이 안정적인가?
- [ ] 1100px 이하, 720px 이하 레이아웃이 기능을 잃지 않는가?
- [ ] iPad/Android에서 scroll trap이나 editor 높이 붕괴가 없는가?
- [ ] text scaling에서 목표와 버튼이 잘리지 않는가?

## 11. 테스트 증거

- [ ] `npm run test:python-mission`
- [ ] 신규 catalog/schema tests
- [ ] evaluator/mastery/assistance tests
- [ ] event reducer determinism tests
- [ ] progress v1→v2 compatibility tests
- [ ] `npm run lint` 관련 파일 통과
- [ ] `npm run build`
- [ ] 10개 미션 수동 smoke test
- [ ] feature flag on/off smoke test
- [ ] slow load/worker recycle smoke test

## 12. 리뷰 결과 형식

리뷰 결과는 다음 우선순위를 사용한다.

- `P0`: 데이터 손실, 보안, 런타임 붕괴, 학습 순서 파괴, 기존 사용자 회귀
- `P1`: 평가 오판, replay 불일치, 주요 접근성/모바일 실패, 핵심 UX 누락
- `P2`: 제한된 조건의 오해 가능성, 유지보수 위험, 부차적 UX 문제
- `P3`: 선택적 개선, 명명·정리·후속 polish

각 지적에는 파일과 가능한 한 좁은 줄 범위, 재현 조건, 학생/시스템 영향, 권장 수정 방향을 포함한다.

