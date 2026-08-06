# Smart Workbook 초안 제작 흐름

Smart Workbook은 외부 AI API를 앱에서 직접 호출하지 않는다. 운영자가 이미지를 등록하고, Codex 또는 ChatGPT 웹에서 페이지별 공용 프롬프트를 실행한 뒤 초안만 반영한다.

## 운영 순서

1. Mission Editor의 인터랙티브 워크북 탭에서 이미지를 등록한다.
2. `변경사항 저장`을 눌러 `units/{unitId}.workbookDraftPages`에 페이지를 저장한다.
3. 대상 페이지에서 `작업 프롬프트` → `프롬프트 복사`를 누른다.
4. 다음 중 한 경로로 초안을 만든다.
   - Codex: 프롬프트를 그대로 실행한다. Codex는 결과 JSON을 검증하고 `workbookDraftPages`의 대상 페이지만 갱신한다.
   - ChatGPT 웹: 반환된 JSON 코드블록을 복사하고 운영툴의 `AI 결과 JSON 붙여넣기`에서 검증·적용한다.
5. Codex가 자동 반영했다면 `Codex 반영 새로고침`으로 최신 초안을 불러온다.
6. 운영자가 좌표, 정답, 입력 형식, 선택지와 마스크 연결을 검토·수정한다.
7. `변경사항 저장`은 초안만 저장한다.
8. 검토가 끝난 뒤 `워크북 최종 퍼블리시`를 눌러 `workbookPages`에 공개한다.

## 데이터 분리

- `workbookDraftPages`: 이미지 등록, AI 결과, 운영자 편집이 반영되는 작업본
- `workbookPages`: 학생 화면이 읽는 마지막 공개본
- `workbookPublication`: 마지막 퍼블리시 시각, 페이지 수, 스키마 버전

초안 저장은 `contentFlags.hasWorkbook`을 켜지 않는다. 공개본이 존재하거나 최종 퍼블리시가 성공한 경우에만 학생용 워크북이 노출된다.

## Codex 안전 반영

공용 프롬프트가 지정하는 JSON 파일을 만든 뒤 다음 명령으로 먼저 dry-run 한다.

```bash
node scripts/apply-workbook-draft-analysis.mjs --unit-id="UNIT_ID" --page-id="PAGE_ID" --input="/private/tmp/workbook-draft.json"
```

출력의 문서·페이지·요소 수와 낮은 신뢰도 항목을 확인한 뒤 `--apply`를 추가한다.

```bash
node scripts/apply-workbook-draft-analysis.mjs --unit-id="UNIT_ID" --page-id="PAGE_ID" --input="/private/tmp/workbook-draft.json" --apply
```

스크립트는 지정된 `workbookDraftPages` 페이지만 교체하며 `workbookPages`는 수정하지 않는다.

## 퍼블리시 검증

퍼블리시 전에 다음을 차단한다.

- 이미지나 페이지 ID가 없는 페이지
- 인터랙티브 요소 또는 채점 가능한 요소가 없는 페이지
- 정답이 비어 있는 입력 요소
- 정답이 선택지에 포함되지 않은 객관식 요소
- 같은 워크북 안의 중복 요소 ID
- 현재 페이지에 존재하지 않는 요소를 가리키는 마스크
- 이미지 영역을 벗어나거나 크기가 잘못된 좌표
