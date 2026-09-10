# 다크매터 패드 퀴즈 반복 잠금 — 원인 분석

- ID: 20260910-dark-matter-tablet-focus
- Phase: DONE (local fixes verified; not deployed; original pre-warning stall unconfirmed)
- Updated: 2026-09-10 KST
- Coordinator: Codex, current selected model
- Original goal: 학생이 패드에서 다크매터 퀴즈 중 ‘퀴즈가 잠시 멈췄어요’ 경고를 반복해서 보고 종료되는 원인을 분석한다. 원문 연락처/전체 UID는 대화에만 두고 이 문서에는 복제하지 않는다.
- Acceptance: 경고 원인 조사 및 운영 기록 확인. 후속 승인에 따라 확인된 오탐·중복 집계·복귀 무응답을 수정하고 세션/화면 회귀 검사. 최초 입력 정지의 미확정 여부와 배포 범위를 별도 보고.
- Baseline: b99fe65fc861c655202885339a14ded07351a1d2
- Workspace: 기존 프로젝트 checkout에서 단독 수정. 별도 worktree 없음. 조사 단계 이후 아래 개선 구현을 수행했다.
- Existing dirty state: collaboration/INDEX.md, marketing/DECISIONS.md, marketing/daily/2026-09-10/JOURNAL.md 수정; 다른 작업 기록 5개, 마케팅 산출물, output/pdf, videos 미추적. 모두 보존.
- Ownership: Codex 단독 조사. 코드 추적·개인 학습 기록 확인이 밀접하게 연결된 범위여서 외부 전달 없음. Packet: 없음.

## 결론

경고 및 3회 종료의 직접 경로는 퀴즈의 화면 이탈 감지 정책이다. 네트워크 오류 경고가 아니다. 다만 후속 제보에서 ‘학생이 가만히 있었고 경고 전부터 선택지가 안 눌렸다’고 확인되었다. 따라서 최초 입력 무반응의 원인이 밝혀졌다는 의미로 위 결론을 확대하면 안 된다. 화면이 보이는 상태의 지속된 window blur도 이탈로 계산하지만, 실제 입력 정지와 blur의 인과관계는 런타임 로그가 없어 확정하지 못했다. 노후 기기나 불안정한 인터넷만으로 전체 증상을 설명할 근거는 없다.

## 근거

1. 첨부 화면은 ‘창 포커스 이탈이 지속되어 문제 화면을 잠갔습니다.’와 2/3을 표시한다. `SpaceQuizView.jsx`의 `window_blur` 경로와 일치한다.
2. `src/utils/quizFocusGuard.js`: blur 발생 후 1,800ms 타이머. 확인 시 document.hasFocus()가 false이면 확정한다. 화면이 hidden인지 확인하는 조건은 없다. 이벤트 없이 단순히 시간이 흐르거나 네트워크가 끊기는 것만으로 횟수를 올리는 경로는 없다.
3. `SpaceQuizView.jsx:910` 부근: 4초 중복 억제 후 횟수 증가, 최대 3회에서 terminateCompromisedFieldTest 호출. `isFocusLocked` 상태 또는 ‘복귀 완료’를 기준으로 같은 이탈을 중복 방지하는 조건이 없다. 서로 다른 blur/visibility/fullscreen 이벤트가 4초 이상 떨어져 들어오면 잠금 중에도 추가로 계산할 수 있다.
4. visibility_hidden과 fullscreen_exit는 별도 감지 경로이다. 전체화면 진입/복귀에는 2.5초 유예가 있다. fullscreen 미지원이면 감지가 곧바로 활성화되며 지원 여부는 표준 requestFullscreen 함수의 존재로 판단한다. 실제 학생 기기의 지원 여부는 미확인이다.
5. `SpaceHome.jsx:4220` 부근: 일반 다크매터(dark_matter_zone)와 정제소(dark_matter_refinery)는 같은 SpaceQuizView를 사용한다. 집중 보호 적용 조건에는 일반 다크매터를 제외하는 분기가 없다.
6. 설계 문서 `docs/DARK_MATTER_REFINERY_PLAN.md`는 일반 다크매터를 힌트/해설을 이용한 학습 공간으로 규정한다. 이 영역에도 3회 종료 정책이 일괄 적용되는 점은 개선 후보이다. 정책은 이번 조사에서 변경하지 않았다.

## 학생 운영 기록 — 읽기 전용

대화에서 지정한 학생의 learning_progress/dark_matter_zone 및 dark_matter_refinery만 조회했다. 학생 답안 내용이나 전체 학습 이력은 수집하지 않았다.

- dark_matter_zone 존재.
- 마지막 quizSessionGuardAudit: 2026-09-09 17:33:10.401 KST, event=field_test_focus_violation, eventType=fullscreen_exit, violationCount=2.
- 같은 map에 trigger=fullscreen_exit도 남아 있다. setDoc(..., {merge:true})가 map 하위 필드를 병합하므로 서로 다른 이벤트의 필드가 잔존할 수 있다. 이 trigger만으로 당시 종료까지 입증해서는 안 된다.
- updatedAt=2026-09-09 17:34:36.115 KST.
- quizCompleted=true, bestScore=100, quizBestScore=100, quizAttemptCount=13, attemptCount=13.
- 현재 quizSession 필드는 없다. 따라서 ‘현재 저장된 답안 0개’라는 의미로 해석하지 않는다. 완료 기록과 최고점은 남아 있으나, 제보한 특정 중단 회차가 정상 완료/복구되었는지 또는 일부 답안이 유실되었는지는 이 문서만으로 알 수 없다.
- dark_matter_refinery 문서 없음.
- audit는 이벤트 이력 목록이 아니라 마지막 map 하나이며 sessionId, 브라우저, OS, document.hidden/hasFocus 상태, blur 지속 시간 등이 없다. screenshot의 window_blur와 현재 audit의 fullscreen_exit는 서로 다른 이벤트일 수 있다. 정확한 발생 시간·기기가 없으므로 동일 회차로 단정하지 않는다.

## 검증

- npm run test:quiz-session 통과: session guard, round restore, persistence(mock transport/real SDK masks), sustained blur guard.
- 실제 SpaceQuizView 소스에서 reportFocusViolation과 protection useEffect를 추출해 Node VM과 가짜 document/window/timer로 실행했다. 앱의 소스를 수정하거나 테스트 복제 로직으로 대체하지 않았다.
  - document.hidden=false에서 sustained blur 1.8초 → 잠금/count=1 확인.
  - resume 호출 없이 4초 이상 간격의 추가 blur 2회 → count=3 및 종료 함수 호출 확인.
  - blur 없이 시간 경과만으로는 증가하지 않음. 이 effect에는 online/offline listener 없음.
- 운영 공개 번들 HTTP 200 JavaScript 확인: /assets/SpaceQuizView-DI84iWVu.js에 같은 경고/window_blur/field_test_integrity_terminated 및 hasFocus 기반 조건 존재. /assets/quizFocusGuard-DUn9Ouch.js 기본 delayMs=1800 확인.
- 브라우저 API 근거: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — blur/focus는 페이지가 실제 숨겨졌다는 증거가 아니다.
- 실물 패드 재현, Safari/WebKit 런타임 재현, 네트워크 장애에서 실제 저장 성공 여부는 검증하지 않았다. 코드 수정이 없어 build/배포는 하지 않았다. 운영 데이터 변경 없음.

## 개선 제안 및 다음 단계

1. 화면이 보이는 상태의 blur를 곧바로 종료 누적에 사용하지 않도록 신호 신뢰도를 구분한다. 민감한 평가/배틀의 정책과 일반 다크매터 학습 정책은 따로 검토한다.
2. 잠금 동안은 같은 이탈을 추가로 세지 않고, 명시적인 정상 복귀가 완료된 후 다음 이탈을 계산한다. 4초 시간 간격만으로 중복을 판단하지 않는다.
3. 브라우저의 fullscreen 지원/실제 진입 실패를 구분하고, 패드 복귀 동작이 감지 이벤트를 유발하는지 실기기로 검증한다.
4. 짧은 제한된 이벤트 이력에 sessionId, visibility, hasFocus, fullscreen 상태, blur 실제 지속 시간과 클라이언트 버전을 기록해 재발 시 확정할 수 있게 한다. 현재의 병합 map 잔존 필드 문제도 함께 정리한다.
5. 네트워크 불안정은 종료 시 저장 지연/실패를 악화할 수 있지만 이 잠금의 직접 트리거와는 별개이다. 종료 코드는 저장 실패 시 재시도하도록 되어 있으며 성공이 보장된다고 설명하지 않는다.

학생에게 요청한 추가 정보: 패드 종류, 브라우저, 발생 날짜/대략 시간. 이 정보가 오면 같은 작업에서 기기별 원인을 좁힌다. 경고 경로 분석은 전달했으나 최초 입력 정지 원인은 미확정이며 아래 후속 제보를 반영해 조사 범위를 확장했다. 구현·배포 작업은 수행하지 않았다.

## 후속 제보: 경고보다 먼저 선택지 무반응

- 사용자가 학생은 가만히 있었으며 특정 선택지(예: 2번)를 누르려 해도 반응이 없었다고 전달했다. 질문에 ‘경고가 뜨기 전부터 안 눌렸음’이라고 명시적으로 확인했다. ‘2번만 안 눌렸다’거나 다른 버튼/스크롤이 정상 동작했다는 뜻으로 확대 해석하지 않는다.
- 선택지 button은 showFeedback !== null 또는 isRebooting이면 disabled이다. 번호별로 입력을 차단하는 분기는 없다. 이미 채점된 상태에서는 재선택을 막으며 이해 상태 선택을 기다린다. 해당 학생이 이 상태였다는 증거는 없다.
- handleSelect는 서버 저장을 기다리기 전에 showFeedback 및 pendingResult 등 로컬 상태를 설정한다. 저장 호출은 마지막의 void persistPendingGradedAnswer이다. 따라서 첫 답안 터치가 아무 반응도 없는 현상을 네트워크 지연만으로 설명하기 어렵다. 이후 이해 상태 버튼은 isSavingAnswerCheckpoint/isSavingReaction 동안 비활성화되므로 저장 지연 영향은 별도로 있다.
- focus 잠금 CSS는 pointer-events:none으로 문제 영역 입력을 차단하고 잠금 overlay는 opacity 0부터 나타난다. 판정과 안내의 화면 표시 사이에 짧은 간격은 가능하나 학생이 본 무반응 지속 시간과 화면 상태를 몰라 이번 사건의 원인으로 단정하지 않는다.
- 추가 결함 확인: resumeFieldTestFocus는 document.hasFocus()가 false이면 아무 안내 변경/복구 시도 없이 즉시 return한다. 실제 함수 소스를 VM에서 실행해 잠금과 CSS가 유지되고 requestFullscreen도 호출되지 않음을 확인했다. hasFocus=true인 대조 조건에서는 전체화면 진입 및 잠금 해제가 실행된다. 이는 경고 후 복귀 실패 후보이며 경고 전 최초 무반응의 설명은 아니다.
- 입출력·효과 코드 점검: 입자와 부유 마커는 pointer-events:none, 계산 메모의 터치 캡처는 canvas 범위에 설치되어 있다. SoundManager.play는 동기 재생 예외를 잡고 반환한다. 소스 점검만으로 실기기의 입력 누락, 렌더링 지연, 예외, overlay 가림을 특정할 수 없다.
- 다음 단계: 기기/OS/브라우저와 발생 시간·문항을 확보해 동일 환경에서 터치 이벤트, 버튼 disabled 상태, hit-test 대상, JS 오류, 포커스/visibility/fullscreen 이벤트 순서를 함께 확인한다. 현재 기존 운영 audit에는 이 정보가 없으므로 최초 정지 원인 확정이 막혀 있다. 브라우저/앱 입력 오류 또는 렌더링 문제는 조사 가설이며 학생의 실제 이탈을 전제로 삼지 않는다.

## 개선 구현 진행

- 사용자 승인: 현재까지 파악된 문제 개선 작업을 진행하라는 후속 요청.
- 범위: SpaceQuizView 및 전용 focus helper/회귀 검사. 배틀은 별도 서버 판정이므로 이번 변경에서 제외. 공유 sustained blur helper는 동작 변경 없음.
- Codex가 같은 디렉터리에서 단독 수정한다. 이 수정은 조사한 잠금·세션 저장 경계에 연결되어 있어 로컬에서 구현/검증한다. 외부 전달 없음.
- visible blur는 진단만 기록, 잠금 중 중복 위반 억제, hasFocus=false에서도 복귀 시도, 전체화면 요청 4초 제한 및 재시도/저장 후 나가기 추가. 일반 다크매터는 전체화면 선택사항.
- 최근 입력/화면 상태 24개와 제한된 환경 정보 기록, 진단 서버 쓰기는 최대 15초당 1회. 답안 내용/DOM 문구/URL/오류 원문 제외. audit map 전체 필드 교체로 잔존 필드 방지.
- 최종 검증은 아래 기록 참조.


## 최종 구현 및 검증 — 2026-09-10

### 변경 파일

- `src/components/Space/SpaceQuizView.jsx`: visible blur는 진단만 기록한다. 실제 화면 숨김/캡처·인쇄는 보호하고, 일반 평가의 전체화면 이탈 판정은 유지한다. 한 번 잠기면 정상 복귀 전까지 추가 위반을 집계하지 않는다. 전체화면 지원 여부 및 fullscreenEnabled를 확인하고 hasFocus=false인 상태의 명시적 복귀 입력도 처리한다. 전체화면 요청은 4초 후 실패 안내와 재시도를 제공한다. 비동기 복귀의 중복 클릭/늦은 완료/언마운트 완료를 차단한다.
- 같은 컴포넌트: 잠금 중 ‘진행 저장 후 나가기’ 추가. 저장 실패 시 퀴즈 화면을 유지한다. 잠금 아래 문제 영역은 inert로 키보드/포인터 조작을 막는다. 잠금 overlay의 진입/종료 애니메이션을 제거해 투명한 레이어가 입력을 가로막는 시간을 없앴다.
- `src/components/Space/DarkMatterView.jsx`: 학습 다크매터 시작 시 자동 전체화면 요청 제거. 정제소/배틀 시작 코드는 변경하지 않았다.
- `src/utils/fieldTestFocus.js`: 전체화면 지원 검사/4초 요청 제한, 최근 24개 입력·포커스 진단 버퍼 및 15초당 최대 1회 서버 쓰기 허용.
- `scripts/test-field-test-focus.mjs`, `package.json`: 실제 컴포넌트 콜백을 읽어 가짜 브라우저 이벤트·시계·저장 경계로 실행하는 회귀 검사를 test:quiz-session에 편입.
- `scripts/qa-field-test-focus.mjs`: 실제 React 퀴즈 컴포넌트를 합성 학생과 메모리 Firestore로 묶는 재현용 UI. 산출물은 /private/tmp/metasense-field-test-focus-qa이며 public/dist에 포함하지 않는다. CSP connect-src none으로 외부 연결을 차단한다. 실행은 `node scripts/qa-field-test-focus.mjs`, 재빌드만 하려면 `--build-only`를 붙인다. 127.0.0.1:5187에서 사용한다.

### 통과한 검사

- `npm run test:quiz-session`: 기존 세션 소유권·16답안 복원·저장 마스크·공유 blur guard 검사와 신규 focus 검사 전부 통과.
- 신규 검사: 다크매터 진입 시 전체화면 불호출, 화면이 보이는 지속 blur, 4초 이상 간격의 잠금 중 중복 이벤트, hasFocus=false 복귀, 서로 다른 3회 이탈 시 종료/저장, 일반 평가의 전체화면 이탈, API 미지원/disabled/reject/무응답, 복귀 연속 클릭, 저장 실패 시 잔류, 언마운트 후 늦은 완료, 내부 캡처 예외, audit map 교체, 진단 버퍼/빈도 제한.
- 변경한 JS/JSX 3개 파일 targeted ESLint 통과. `git diff --check` 통과.
- 최종 `npm run build` 통과(overlay 최종 수정본, 9.66초). 기존 대형 chunk 경고 및 audio manifest의 기존 안내는 남아 있다.
- 실제 컴포넌트 Chromium UI, 820×1180 및 768×1024:
  - hasFocus=false를 강제하고 visible blur를 발생시켜도 선택지 클릭·채점·다음 문항 이동 정상.
  - 숨김 이벤트 0/4.5/9초 반복에도 잠금 카운트 1/3 유지.
  - 계속 풀기 복귀 후 기존 답안 유지 및 다음 문항 이동.
  - 저장 Promise 지연 중 채점 결과 즉시 표시, 이해 상태 버튼은 대기, 저장 재개 후 활성화.
  - 일반 평가의 fullscreen 거절 시 재시도/나가기 안내 표시. 저장 실패 시 잔류하고 저장 성공 시에만 종료.
  - 진단 데이터에 option_pointerdown → option_click → window_blur → window_blur_visible 및 graded/saving/hidden/hasFocus 상태가 저장되는 것을 합성 저장 로그에서 확인. 진단 필드에는 답안 텍스트 없음.
  - 추가 관찰: overlay 종료 애니메이션이 남아 있는 시점에 복귀 직후 첫 이해 상태 클릭이 반영되지 않았고, 나중의 두 번째 클릭은 반영됐다. overlay를 일반 조건부 div로 바꾼 뒤, 복귀 클릭에 바로 이어 한 번의 이해 상태 클릭으로 2번 문항까지 이동하는 것을 재검증했다. 이 관찰은 학생의 경고 전 최초 무반응과 동일 원인이라는 뜻이 아니다.

### 한계와 배포

- 브라우저 검증은 실제 컴포넌트 + 합성 저장소이며 운영 Firebase 저장/실물 패드/Safari·WebKit 검증은 아니다. 도구가 Input.dispatchTouchEvent를 지원하지 않아 실제 터치 주입은 검증하지 못했고, UI 클릭 및 hasFocus=false 환경을 사용했다.
- 경고 전 최초 무반응의 원인은 여전히 미확정이다. 이번 작업은 확인된 오탐·중복 종료·복귀 경로 문제와 재발 진단을 개선했다.
- 공유 quizFocusGuard와 배틀 서버 정책/함수/규칙/학생 답안·점수는 변경하지 않았다. 운영 배포·커밋은 수행하지 않았다.
- 다음 단계: 웹 배포 후 운영 반영 확인. 학생 기기/브라우저 정보 또는 재발 진단이 오면 같은 작업에서 최초 입력 정지를 추적한다. 외부 전달 요청 없음.

- QA 종료 정리: 임시 브라우저 탭 4개 닫음, viewport override 초기화, 로컬 QA 서버 PID 8327 종료.
