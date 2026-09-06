# MetaSense 실행 환경

2026-09-06 적용.

## 적용한 설정

- 사용자 설정 `/Users/selah/.codex/config.toml`: 기본 모델 `gpt-5.6-sol`, 추론 `high`.
- 최상위 `service_tier = "priority"` 제거: Fast 강제 선택을 해제했다. 작업/UI/관리 설정의 명시적 속도 선택은 별도로 우선할 수 있다.
- 나머지 플러그인, MCP, 신뢰 설정, 권한, 알림은 그대로 유지했다.
- 자동 압축 임계값과 컨텍스트 크기는 강제로 지정하지 않고 모델 기본값을 유지했다. 내부 추론 상태를 다루는 별도 API 하네스는 설치하지 않았다.
- 변경 전 백업: `/Users/selah/.codex/config.toml.before-metasense-20260906-214618-095386.bak`.

이 변경은 사용자 기본 설정이므로 새 작업 전반에 적용된다. 기존 작업의 선택 모델이나 현재 실행 중인 턴이 바뀌었다는 의미는 아니다. 데스크톱에서 새 작업을 열어 Sol / High 및 Fast 해제 상태를 확인한다. 이전 선택이 남으면 해당 작업의 모델 선택에서 바꾼다.

## 전환 프리셋

현행 프로필 형식으로 사용자 설정 디렉터리에 저장:

| 파일 | 모델 | 추론 |
|---|---|---|
| `metasense-sol.config.toml` | gpt-5.6-sol | high |
| `metasense-astra.config.toml` | gpt-6-astra | high |
| `metasense-astra-deep.config.toml` | gpt-6-astra | xhigh |

프로필은 CLI 실행용이며 데스크톱 모델 메뉴에 새 항목을 추가하지 않는다. 자동 모델 전환도 하지 않는다.

## CLI 버전 차이 해결

PATH의 `/Users/selah/.npm-global/bin/codex`는 0.42.0이고 데스크톱 내장 실행기는 0.153.4다. 기존 npm 설치는 변경하지 않았다. 메타센스용 실행기는 내장 버전을 직접 사용한다:

```sh
bash scripts/codex-metasense.sh sol
bash scripts/codex-metasense.sh astra
bash scripts/codex-metasense.sh deep
```

같은 CLI 대화는 `bash scripts/codex-metasense.sh sol resume`로 선택해서 이어간다. 다른 작업을 실수로 잇지 않도록 무조건 최신 작업을 고르지 않는다. 일반 데스크톱 사용에는 터미널 실행이 필요 없다.

## 컨텍스트 운영

- 같은 목표의 후속 작업은 해당 대화를 이어가고, 독립된 목표는 분리한다.
- 관련 코드와 문서를 검색해서 읽는다. 저장소 전체나 과거 대화 전체를 매번 전달하지 않는다.
- 여러 단계 작업은 WORKFLOW.md의 STATE.md에 결정, 실제 변경, 검증 결과, 남은 일을 기록한다.
- 압축이나 인수인계 뒤에는 기록과 실제 파일 상태를 대조한다. 파일 기록은 내부 추론 상태 보존과 다르다.
- 작은 작업에 하위 에이전트나 전 모델 교차 리뷰를 붙이지 않는다. 외부 앱 협업은 사용자 전달 방식으로 유지한다.

## 검증 범위

TOML 파싱, 세 필드만의 변경 비교, 세 프로필 값 및 실행 스크립트 문법을 검증했다. 내장 0.153.4 app-server의 읽기 전용 `config/read`로 이 프로젝트에서 해석한 값도 확인했다: `model=gpt-5.6-sol`, `model_reasoning_effort=high`, `service_tier=null`, `model_auto_compact_token_limit=null`. 모델 추론 요청을 실행하거나 현재 대화의 실제 서비스 티어를 측정한 것은 아니다.

공식 근거: https://learn.chatgpt.com/docs/config-file/config-advanced 및 https://learn.chatgpt.com/docs/config-file/config-reference
