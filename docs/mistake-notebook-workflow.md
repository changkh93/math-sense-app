# 오답노트 행성 플래시카드 작업 절차

이 문서는 학생이 오답노트 행성에 올린 이미지(`mistakeUploads`)를 Codex가 매일 확인하고, 운영툴에서 바로 사용할 수 있는 플래시카드(`mistakeCards`)로 발행하는 절차다. 실시간 자동 생성이 아니라 사람이 검토 가능한 품질의 카드 초안을 직접 작성하는 것을 원칙으로 한다.

## 핵심 원칙

- 매일 대기중(`pending`) 오답 이미지를 확인한다.
- 학생이 올린 이미지를 앞면으로 유지하고, 뒷면에는 정답과 해설을 작성한다.
- 문제 원문, 그림, 학생 메모에서 확인되는 내용만 사용한다.
- 이미지가 흐리거나 일부가 잘려 정답을 확정할 수 없으면 카드를 발행하지 말고 운영자 확인이 필요하다고 남긴다.
- 해설은 학생이 다시 봤을 때 “왜 틀렸고, 다음에는 무엇을 떠올려야 하는지”가 바로 보이게 쓴다.
- 너무 긴 강의식 설명보다 핵심 개념, 풀이 순서, 주의점을 짧게 나눈다.
- 정답만 적지 않는다. 반드시 풀이 근거와 오답 방지 포인트를 함께 적는다.
- 선택형 문제는 선택지 번호와 값이 모두 확인되면 둘 다 적는다. 예: `① 36 cm²`.
- 학생을 평가하거나 비난하지 않는다. 오답노트 카드는 복습 도구이므로 중립적이고 선명하게 쓴다.
- 같은 이미지를 중복 발행하지 않는다. 이미 `card_created` 상태이거나 `cardId`가 있으면 기존 카드 수정을 우선 검토한다.

## 매일 수행할 일

1. Firestore에서 `mistakeUploads` 중 `status == "pending"`인 문서를 조회한다.
2. 각 문서의 `imageUrl`, `title`, `note`, `tags`, `userName`, `userId`를 확인한다.
3. 이미지를 내려받아 문제 전체가 보이는지 확인한다.
4. 문제를 직접 풀고 정답을 검산한다.
5. `mistakeCards` 문서를 만든다.
6. 원본 `mistakeUploads/{uploadId}` 문서를 `status: "card_created"`로 바꾸고 `cardId`를 기록한다.
7. 처리 결과를 사용자에게 요약한다.

## 조회 명령 예시

```bash
node --input-type=module -e 'import admin from "firebase-admin"; import { readFileSync } from "fs"; const key=JSON.parse(readFileSync("./service-account.json","utf8")); admin.initializeApp({credential:admin.credential.cert(key)}); const db=admin.firestore(); const snap=await db.collection("mistakeUploads").where("status","==","pending").get(); console.log(JSON.stringify({count:snap.size, rows:snap.docs.map(doc=>({id:doc.id,...doc.data(),createdAt:doc.data().createdAt?.toDate?.()?.toISOString?.()}))}, null, 2)); await db.terminate(); process.exit(0);'
```

샌드박스 네트워크에서 DNS 오류가 나면 같은 명령을 외부 네트워크 권한으로 다시 실행한다.

## 카드 작성 기준

`questionTitle`:

- 학생 제목이 충분하면 다듬어서 쓴다.
- 문제 핵심이 드러나게 작성한다.
- 예: `내심과 내접원의 반지름으로 삼각형 넓이 구하기`

`answer`:

- 최종 정답을 짧게 쓴다.
- 선택형이면 번호와 값을 함께 쓴다.
- 예: `① 36 cm²`

`explanation`:

권장 구조:

```markdown
### 핵심 개념

내접원이 있는 삼각형의 넓이는 `넓이 = 내접원 반지름 × 반둘레`입니다.

### 풀이

...

### 다음에 떠올릴 점

...
```

작성 규칙:

- 첫 줄에는 필요한 핵심 공식이나 성질을 둔다.
- 접선 길이, 닮음, 피타고라스, 각의 성질 등 사용한 개념을 명확히 말한다.
- 계산은 단계별로 보이게 한다.
- 마지막에는 학생이 다음에 떠올릴 체크포인트를 1개 적는다.

`concept`:

- 단원/개념명을 짧게 쓴다.
- 예: `삼각형의 내심과 내접원`

`tags`:

- 기존 학생 태그를 보존하되 필요한 태그를 추가한다.
- 예: `내심, 내접원, 접선 길이, 삼각형의 넓이`

`difficulty`:

- 기본은 `normal`.
- 계산이 매우 간단하면 `light`.
- 여러 개념이 섞였거나 이미지 해석이 어려우면 `hard`.

## 발행 명령 예시

카드 발행은 반드시 대상 `uploadId`와 풀이 내용을 확인한 뒤 실행한다.

```bash
node --input-type=module -e 'import admin from "firebase-admin"; import { readFileSync } from "fs"; const key=JSON.parse(readFileSync("./service-account.json","utf8")); admin.initializeApp({credential:admin.credential.cert(key)}); const db=admin.firestore(); const uploadId="UPLOAD_ID"; const uploadRef=db.collection("mistakeUploads").doc(uploadId); const uploadSnap=await uploadRef.get(); if(!uploadSnap.exists) throw new Error("upload not found"); const upload=uploadSnap.data(); const now=admin.firestore.FieldValue.serverTimestamp(); const cardRef=db.collection("mistakeCards").doc(); await db.runTransaction(async tx=>{tx.set(cardRef,{userId:upload.userId,userName:upload.userName||"",sourceUploadId:uploadId,imageUrl:upload.imageUrl,imagePath:upload.imagePath||"",questionTitle:"카드 제목",answer:"정답",explanation:"해설",concept:"개념",tags:["태그"],difficulty:"normal",status:"active",createdBy:"codex-manual-review",createdAt:now,updatedAt:now}); tx.update(uploadRef,{status:"card_created",cardId:cardRef.id,reviewedBy:"codex-manual-review",reviewedAt:now,updatedAt:now});}); console.log(JSON.stringify({cardId:cardRef.id},null,2)); await db.terminate(); process.exit(0);'
```

## 품질 점검

발행 전 아래를 확인한다.

- 이미지 원문과 해설이 같은 문제를 가리키는가?
- 정답 단위가 맞는가?
- 선택지 번호가 맞는가?
- 해설 계산에 산술 오류가 없는가?
- 학생이 다음 복습 때 사용할 수 있을 만큼 짧고 선명한가?
- `mistakeUploads.status`와 `cardId`가 함께 갱신되는가?

## 이번 작업 방식 이해

Codex는 이 문서를 매일 반복 작업 지시서로 사용한다. 사용자가 “오답노트 행성 운영툴에 올라온 것을 처리해줘”라고 요청하면 이 문서 절차에 따라 대기열을 조회하고, 이미지를 확인하고, 플래시카드를 발행한다.
