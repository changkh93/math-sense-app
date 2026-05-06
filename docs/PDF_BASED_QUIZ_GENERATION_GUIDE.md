# PDF 기반 평가 퀴즈 생성 가이드

이 문서는 PDF 평가지를 기반으로 앱의 `4월 평가` 같은 단원에 퀴즈를 생성하는 절차를 정리합니다. 목표는 문제 원문을 변형하지 않고, 필요한 도표와 그림을 문항 이미지로 보존하면서 Firestore와 Firebase Storage에 퀴즈를 안전하게 구축하는 것입니다.

## 1. 작업 원칙

PDF 기반 평가 퀴즈는 일반 교재 재구성 퀴즈와 다르게 다음 원칙을 우선합니다.

- 문제 원문은 PDF의 표현을 최대한 그대로 사용합니다.
- 도형, 표, 그림, 전개도, 수직선, 카드 등 문제 풀이에 필요한 시각 정보는 문항별 이미지로 캡처합니다.
- 주관식 문제도 앱에서는 모두 5지선다로 변환합니다.
- 기존 선택지가 없는 문제는 정답을 포함한 오답 선택지를 새로 만듭니다.
- 정답은 PDF의 정답/풀이 페이지를 기준으로 합니다.
- 모든 문항은 `options` 5개, 정답 선택지 1개를 만족해야 합니다.
- 작업 후 Firestore 문서 수, 선택지 수, 정답 수, 이미지 URL 접근 상태를 반드시 검증합니다.

## 2. 사전 준비

### 2.1 필요한 도구

로컬에서 아래 도구를 사용합니다.

```bash
pdfinfo
pdftotext
pdftoppm
ffmpeg
python3
```

`pdfinfo`, `pdftotext`, `pdftoppm`은 Poppler에 포함되어 있습니다.

```bash
brew install poppler
```

이미지 접촉 시트 생성에는 Python `Pillow`를 사용합니다. 설치 여부는 다음처럼 확인합니다.

```bash
python3 - <<'PY'
import PIL
print(PIL.__version__)
PY
```

### 2.2 Firebase 준비

프로젝트 루트에 `service-account.json`이 있어야 합니다. 이 파일은 Firebase Admin SDK 인증에 사용됩니다.

업로드 대상은 보통 다음 두 곳입니다.

- Firestore: `quizzes` 컬렉션, `units` 컬렉션
- Firebase Storage: `quiz_images/` 경로

Storage bucket 이름은 현재 스크립트에서 다음 값을 사용합니다.

```js
const BUCKET_NAME = 'math-sense-1f6a8.firebasestorage.app';
```

## 3. 대상 단원 확인

사용자가 제공하는 값은 보통 PDF 파일 경로와 대상 Unit ID입니다.

예시:

```text
PDF: /Users/selah/Documents/.../초6_4월평가_정답.pdf
Unit ID: reg_1774390167801_chap_1774390206639_unit_1777506272514
```

먼저 대상 단원이 실제로 존재하는지, 기존 퀴즈가 몇 개인지 확인합니다.

```bash
node -e "import admin from 'firebase-admin'; import fs from 'node:fs';
const key=JSON.parse(fs.readFileSync('service-account.json','utf8'));
admin.initializeApp({credential:admin.credential.cert(key)});
const db=admin.firestore();
const unit='UNIT_ID_HERE';
const u=await db.collection('units').doc(unit).get();
const q=await db.collection('quizzes').where('unitId','==',unit).get();
console.log(JSON.stringify({exists:u.exists, unit:u.exists?u.data():null, quizCount:q.size}, null, 2));"
```

확인할 것:

- `exists: true`인지
- `title`이 요청된 평가 단원인지
- 기존 `quizCount`가 0인지, 또는 교체가 필요한지

기존 퀴즈가 있으면 `--replace` 실행 시 해당 단원의 퀴즈와 연결된 Storage 이미지를 삭제하고 새로 생성합니다.

## 4. PDF 구조 파악

PDF의 페이지 수와 암호화 여부를 확인합니다.

```bash
pdfinfo "/path/to/evaluation.pdf"
```

확인할 것:

- `Pages`
- `Encrypted: no`
- `Page size`

텍스트 추출로 문제 번호와 정답 목록을 확인합니다.

```bash
pdftotext -layout "/path/to/evaluation.pdf" -
```

PDF에 따라 문제 본문은 이미지처럼 추출되지 않을 수 있습니다. 그래도 정답표는 추출되는 경우가 많으므로, 정답 목록과 점수 배점을 확인하는 데 사용합니다.

일반적인 월간평가 PDF 구조:

- 앞 4페이지: 문제
- 뒤 3페이지: 문제 풀이 및 정답
- 마지막 1페이지: 빈 페이지일 수 있음

## 5. PDF를 이미지로 렌더링

문항 이미지를 만들기 위해 PDF를 고해상도 PNG로 변환합니다. 보통 200dpi면 앱에서 충분히 선명합니다.

```bash
mkdir -p /private/tmp/cho6_april_pages_hi /private/tmp/cho6_april_crops_hi

pdftoppm -png -r 200 -f 1 -l 8 \
  "/path/to/evaluation.pdf" \
  /private/tmp/cho6_april_pages_hi/page
```

생성 파일 예시:

```text
/private/tmp/cho6_april_pages_hi/page-1.png
/private/tmp/cho6_april_pages_hi/page-2.png
...
```

페이지 이미지 크기를 확인합니다.

```bash
sips -g pixelWidth -g pixelHeight /private/tmp/cho6_april_pages_hi/page-1.png
```

200dpi A4 PDF는 보통 `1653 x 2339` 정도로 렌더링됩니다.

## 6. 문항별 이미지 크롭

### 6.1 페이지를 눈으로 확인

각 페이지를 열어 문제 배치를 확인합니다. Codex 환경에서는 `view_image`로 확인했고, 일반 작업자는 Finder, Preview, 또는 이미지 뷰어를 사용하면 됩니다.

문제 배치는 학년별로 조금씩 다르므로 자동 추출에 의존하지 말고, 각 문항의 지문과 도표가 모두 포함되도록 직접 좌표를 잡습니다.

### 6.2 ffmpeg로 크롭

`ffmpeg`의 `crop=w:h:x:y` 필터를 사용합니다.

```bash
ffmpeg -y -loglevel error \
  -i /private/tmp/cho6_april_pages_hi/page-1.png \
  -vf "crop=735:360:45:350" \
  /private/tmp/cho6_april_crops_hi/q01.png
```

좌표 의미:

```text
crop=가로:세로:x좌표:y좌표
```

여러 문항은 Node 스크립트로 일괄 생성하는 것이 편합니다.

```bash
node -e 'import {execFileSync} from "node:child_process";
import {mkdirSync} from "node:fs";
const out="/private/tmp/cho6_april_crops_hi";
mkdirSync(out,{recursive:true});
const specs=[
  [1,1,45,350,735,360],
  [2,1,45,680,735,700],
  [3,1,45,1325,735,520]
];
for (const [no,page,x,y,w,h] of specs) {
  const input=`/private/tmp/cho6_april_pages_hi/page-${page}.png`;
  const dest=`${out}/q${String(no).padStart(2,"0")}.png`;
  execFileSync("ffmpeg",["-y","-loglevel","error","-i",input,"-vf",`crop=${w}:${h}:${x}:${y}`,dest]);
}
console.log("cropped", specs.length);'
```

실제 작업에서는 `specs`에 25개 문항을 모두 넣습니다.

### 6.3 크롭 품질 기준

각 문항 이미지는 다음 조건을 만족해야 합니다.

- 문제 번호와 배점이 보입니다.
- 지문이 잘리지 않습니다.
- 표, 그림, 도형, 수직선, 카드, 전개도 등 풀이에 필요한 정보가 모두 들어갑니다.
- 다음 문항의 문제 번호, 배점, 지문 첫 줄이 들어오지 않습니다.
- 하단 학습번호나 출제단원 텍스트는 가능하면 제외합니다.
- 그림 문제는 여백을 넉넉히 두어 도형 일부가 잘리지 않게 합니다.

### 6.4 부정확한 크롭의 대표 원인과 방지법

아래와 같은 이미지는 잘못된 크롭입니다.

```text
01번 문항 아래에 02번 문제 번호와 배점이 함께 들어온 경우
```

원인은 보통 다음 중 하나입니다.

- 문항 하단 경계를 `다음 문항 시작 y좌표`보다 아래로 잡았습니다.
- 도형이나 지문이 잘릴까 봐 높이 `h`를 넉넉하게 늘렸지만, 다음 문항 침범 여부를 확인하지 않았습니다.
- 접촉 시트 썸네일만 보고 검수해서 다음 문항 번호가 작게 섞인 것을 놓쳤습니다.
- 한 페이지 안에서 모든 문항을 비슷한 높이로 자르려고 해서 짧은 문항의 아래 여백이 과도해졌습니다.

크롭 좌표는 다음 순서로 잡습니다.

1. 해당 문항의 시작 y좌표를 잡습니다.
2. 같은 열에서 다음 문항의 문제 번호가 시작되는 y좌표를 찾습니다.
3. 현재 문항의 하단은 `다음 문항 시작 y좌표 - 20~40px`보다 내려가지 않게 합니다.
4. 도형이 아래쪽에 있어 더 큰 높이가 필요하면, 다음 문항을 침범하지 않는 선에서만 늘립니다.
5. 문항 사이 간격이 좁아 도형과 다음 문항이 모두 가까운 경우에는 다음 문항 번호가 들어오지 않는 것을 우선합니다.

예시:

```js
// 나쁜 예: 1번 하단이 2번 시작 위치를 침범함
[1, 1, 45, 350, 735, 360] // bottom = 350 + 360 = 710

// 좋은 예: 2번 시작 y좌표가 약 650이라면 그 위에서 자름
[1, 1, 45, 350, 735, 270] // bottom = 620
```

중요한 기준:

- "문항이 잘리지 않는 것"과 "다음 문항이 섞이지 않는 것"을 동시에 만족해야 합니다.
- 두 조건이 충돌하면 먼저 PDF 원본 페이지를 다시 보고 좌표를 세분화합니다.
- 크롭 이미지 안에 다음 문항 번호가 보이면, 그 이미지는 실패로 처리하고 다시 자릅니다.

## 7. 접촉 시트로 전체 이미지 검수

25개 크롭 이미지를 한 장으로 모아 빠르게 검수합니다.

```bash
python3 - <<'PY'
from PIL import Image, ImageDraw
from pathlib import Path

src=Path('/private/tmp/cho6_april_crops_hi')
thumb_w, thumb_h = 320, 260
cols, rows = 5, 5
canvas=Image.new('RGB',(cols*thumb_w, rows*thumb_h),'white')
draw=ImageDraw.Draw(canvas)

for i in range(1,26):
    img=Image.open(src/f'q{i:02d}.png').convert('RGB')
    img.thumbnail((thumb_w-12, thumb_h-32), Image.LANCZOS)
    x=((i-1)%cols)*thumb_w
    y=((i-1)//cols)*thumb_h
    canvas.paste(img,(x+6,y+28))
    draw.text((x+8,y+6),f'q{i:02d}',fill=(220,0,0))

canvas.save(src/'contact.png')
print(src/'contact.png')
PY
```

`contact.png`를 열어 25문항이 모두 들어갔는지 확인합니다. 단, 접촉 시트는 빠른 1차 검수용입니다. 썸네일에서는 다음 문항 번호가 작게 섞인 문제를 놓칠 수 있으므로 접촉 시트만으로 검수를 끝내면 안 됩니다.

검수 중 잘림이 있으면 해당 문항만 다시 크롭합니다.

### 7.1 원본 크기 검수 필수 항목

접촉 시트 확인 후 아래 문항은 반드시 원본 크기로 열어 확인합니다.

- 각 페이지의 첫 문항
- 각 페이지의 마지막 문항
- 한 문항 아래 바로 다음 문항이 붙어 있는 경우
- 도형, 표, 전개도, 그림이 큰 문항
- 접촉 시트에서 아래쪽 여백이 과하게 보이는 문항

원본 크기 검수 명령 예시:

```bash
open /private/tmp/cho6_april_crops_hi/q01.png
open /private/tmp/cho6_april_crops_hi/q08.png
open /private/tmp/cho6_april_crops_hi/q25.png
```

검수할 때는 다음을 체크합니다.

- 해당 문항 번호와 배점만 보이는가?
- 다음 문항 번호가 보이지 않는가?
- 지문 첫 줄과 마지막 줄이 잘리지 않았는가?
- 그림, 표, 전개도가 온전히 들어갔는가?
- 하단에 출제단원/학습번호가 들어오지 않았는가?

### 7.2 크롭 경계 자동 점검용 체크리스트

크롭 좌표 목록을 만들 때 `bottom = y + h`를 계산해 다음 문항의 시작 y좌표와 비교합니다.

```text
q01: y=350, h=270, bottom=620
q02 starts around y=650
=> bottom < nextStart - 20 이므로 통과
```

같은 열에서 다음 문항 시작점보다 `bottom`이 크거나 비슷하면 실패입니다.

```text
q01: y=350, h=360, bottom=710
q02 starts around y=650
=> bottom이 q02 시작점보다 커서 실패
```

이 계산을 하면 "다음 문제 번호가 섞여 들어오는" 실수를 실행 전에 잡을 수 있습니다.

### 7.3 권장 검수 순서

크롭 후 검수는 다음 순서로 진행합니다.

1. `contact.png`로 25개 문항이 모두 생성됐는지 확인합니다.
2. 각 페이지 첫 문항과 마지막 문항을 원본 크기로 확인합니다.
3. 짧은 문항은 아래쪽에 다음 문항이 섞이지 않았는지 확인합니다.
4. 긴 문항은 마지막 줄과 도형 하단이 잘리지 않았는지 확인합니다.
5. 문제가 있으면 해당 `qNN.png`만 다시 크롭하고 접촉 시트를 다시 생성합니다.

## 8. 퀴즈 데이터 작성

### 8.1 스크립트 위치

일회성 생성 스크립트는 `scratch/` 폴더에 둡니다.

예시:

```text
scratch/build_cho6_april_eval_quizzes.mjs
```

스크립트는 다음 역할을 모두 수행합니다.

- 대상 Unit ID 지정
- 문항별 정답, 선택지, 힌트, 설명 정의
- 크롭 이미지 25개를 Storage에 업로드
- Firestore `quizzes` 문서 25개 생성
- 부모 `units/{unitId}.lastUpdated` 갱신
- 기본 검증 수행

### 8.2 필수 상수

```js
const UNIT_ID = 'reg_...';
const IMAGE_DIR = '/private/tmp/cho6_april_crops_hi';
const BUCKET_NAME = 'math-sense-1f6a8.firebasestorage.app';
```

### 8.3 문항 데이터 형식

```js
const quizzes = [
  {
    no: 1,
    score: 2,
    question: '㉠, ㉡, ㉢에 알맞은 수를 차례대로 구하시오.',
    answer: '$6, 6, 3$',
    options: [
      '$6, 6, 3$',
      '$6, 3, 3$',
      '$3, 6, 3$',
      '$6, 6, 6$',
      '$3, 3, 6$'
    ],
    hint: '$\\frac{3}{4}$를 분모가 $8$인 분수로 바꾼 뒤 $2$로 나누세요.',
    explanation: '$\\frac{3}{4}=\\frac{6}{8}$입니다. 따라서 ㉠은 $6$, ㉡도 $6$이고, $6\\div2=3$이므로 ㉢은 $3$입니다.'
  }
];
```

규칙:

- `answer`는 `options` 중 하나와 정확히 일치해야 합니다.
- `options`는 반드시 5개입니다.
- `options` 안에서 정답은 하나만 있어야 합니다.
- 수식은 `$...$`로 감쌉니다.
- 분수는 `\\frac{a}{b}`를 사용합니다.
- 대분수는 `$2\\frac{3}{8}$`처럼 씁니다.
- 여러 정답은 PDF 표기를 따라 `'$1, 2, 3$'`처럼 하나의 선택지 문자열로 둡니다.

### 8.4 Firestore 문서 필드

생성되는 퀴즈 문서는 다음 필드를 사용합니다.

```js
{
  id,
  docId: id,
  unitId: UNIT_ID,
  order: 998 + quiz.no,
  score: quiz.score,
  question: quiz.question,
  answer: quiz.answer,
  options: [
    { text: '$6, 6, 3$', isCorrect: true },
    { text: '$6, 3, 3$', isCorrect: false }
  ],
  imageUrl,
  hint: quiz.hint,
  explanation: quiz.explanation,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}
```

문서 ID는 다음 규칙을 권장합니다.

```js
`${UNIT_ID}_q${String(quiz.no).padStart(2, '0')}`
```

예시:

```text
reg_..._unit_1777506272514_q01
```

`order`는 기존 작업에서 `998 + quiz.no`를 사용했습니다. 그러면 1번 문항의 order는 `999`, 25번 문항은 `1023`이 됩니다.

## 9. Storage 업로드 방식

각 문항 이미지는 다음 경로에 업로드합니다.

```text
quiz_images/{UNIT_ID}_q01.png
quiz_images/{UNIT_ID}_q02.png
...
```

Firebase Storage 다운로드 URL을 앱에서 바로 사용할 수 있도록 `firebaseStorageDownloadTokens` 메타데이터를 설정합니다.

```js
const token = randomUUID();
await bucket.upload(localPath, {
  destination,
  metadata: {
    contentType: 'image/png',
    cacheControl: 'public,max-age=31536000',
    metadata: { firebaseStorageDownloadTokens: token },
  },
});

const imageUrl =
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
```

## 10. 기존 퀴즈 교체

같은 단원에 기존 퀴즈가 있으면 새로 만들기 전에 삭제해야 합니다.

삭제 범위:

- `quizzes` 컬렉션에서 `unitId == UNIT_ID`인 문서
- 해당 문서의 `imageUrl`이 가리키는 Storage 파일

스크립트 실행 시 `--replace` 옵션으로 처리합니다.

```bash
node scratch/build_cho6_april_eval_quizzes.mjs --build --replace --verify
```

기존 데이터가 0개인 경우에도 `--replace`를 붙여도 문제 없습니다.

## 11. 생성 실행

스크립트 문법을 먼저 확인합니다.

```bash
node scratch/build_cho6_april_eval_quizzes.mjs
```

아무 출력 없이 종료되면 최소한 문법 오류는 없는 상태입니다.

실제 생성은 다음처럼 실행합니다.

```bash
node scratch/build_cho6_april_eval_quizzes.mjs --build --replace --verify
```

성공 출력 예시:

```text
Built 25 quizzes for reg_..._unit_1777506272514.
Found 25 quizzes. Invalid records: 0
```

## 12. 기본 검증

생성 스크립트의 `--verify`는 최소한 아래 조건을 확인해야 합니다.

- 해당 단원의 퀴즈 수가 25개인지
- `imageUrl`이 있는지
- `options`가 배열이고 길이가 5인지
- `isCorrect: true`인 선택지가 정확히 1개인지

예시:

```js
const bad = docs.filter((quiz) =>
  !quiz.imageUrl ||
  !Array.isArray(quiz.options) ||
  quiz.options.length !== 5 ||
  quiz.options.filter((option) => option.isCorrect).length !== 1
);
```

## 13. 저장 데이터 샘플 검증

생성 후 Firestore에서 샘플 문항을 다시 읽습니다.

```bash
node -e "import admin from 'firebase-admin'; import fs from 'node:fs'; import https from 'node:https';
const key=JSON.parse(fs.readFileSync('service-account.json','utf8'));
admin.initializeApp({credential:admin.credential.cert(key)});
const db=admin.firestore();
const unit='UNIT_ID_HERE';
const snap=await db.collection('quizzes').where('unitId','==',unit).get();
const docs=snap.docs.sort((a,b)=>(a.data().order??0)-(b.data().order??0));
console.log('count', docs.length);
for (const idx of [0, 19, 24]) {
  const d=docs[idx];
  const x=d.data();
  console.log(JSON.stringify({
    id:d.id,
    order:x.order,
    question:x.question,
    answer:x.answer,
    options:x.options.map(o=>({text:o.text,isCorrect:o.isCorrect})),
    hasImage:!!x.imageUrl
  }, null, 2));
}
const url=docs[0].data().imageUrl;
const status=await new Promise((resolve,reject)=>
  https.get(url,res=>{res.resume(); resolve(res.statusCode)}).on('error',reject)
);
console.log('firstImageStatus', status);"
```

주의:

`where('unitId', '==', unit).orderBy('order')`는 Firestore 복합 인덱스가 없으면 실패할 수 있습니다. 이 경우 위 예시처럼 단원으로만 조회한 뒤 로컬에서 `order` 정렬합니다.

## 14. 이미지 URL 전체 검증

마지막으로 25개 이미지 URL이 모두 접근 가능한지 확인합니다.

```bash
node -e "import admin from 'firebase-admin'; import fs from 'node:fs'; import https from 'node:https';
const key=JSON.parse(fs.readFileSync('service-account.json','utf8'));
admin.initializeApp({credential:admin.credential.cert(key)});
const db=admin.firestore();
const unit='UNIT_ID_HERE';
const snap=await db.collection('quizzes').where('unitId','==',unit).get();
const docs=snap.docs.sort((a,b)=>(a.data().order??0)-(b.data().order??0));
const getStatus=url=>new Promise(resolve=>
  https.get(url,res=>{res.resume(); resolve(res.statusCode)})
    .on('error',err=>resolve('ERR:'+err.code))
);
const statuses=[];
for (const d of docs) statuses.push([d.id, await getStatus(d.data().imageUrl)]);
const bad=statuses.filter(([,s])=>s!==200);
console.log(JSON.stringify({checked:statuses.length, bad}, null, 2));"
```

성공 출력:

```json
{
  "checked": 25,
  "bad": []
}
```

## 15. 최종 완료 기준

작업 완료로 판단하려면 아래가 모두 충족되어야 합니다.

- 대상 Unit ID가 맞습니다.
- Firestore에 퀴즈가 25개 생성되었습니다.
- 모든 문항에 이미지 URL이 있습니다.
- 각 문항 이미지에 다음 문항 번호, 배점, 지문 첫 줄이 섞여 있지 않습니다.
- 각 문항 이미지에서 지문, 표, 도형, 그림, 전개도 등 풀이에 필요한 요소가 잘리지 않았습니다.
- 모든 문항의 선택지는 5개입니다.
- 모든 문항의 정답 선택지는 정확히 1개입니다.
- 정답은 PDF 정답표와 일치합니다.
- 25개 이미지 URL이 모두 HTTP 200으로 접근됩니다.
- `units/{UNIT_ID}.lastUpdated`가 갱신되었습니다.

## 16. 자주 발생하는 실수

### 문제 이미지가 잘리는 경우

도형 문제, 전개도 문제, 표 문제는 이미지 아래쪽이나 오른쪽이 잘리기 쉽습니다. 접촉 시트만으로 애매하면 해당 `qNN.png`를 원본 크기로 열어 확인합니다.

### 다음 문항이 함께 들어오는 경우

짧은 문항에서 자주 발생합니다. 예를 들어 1번 문항 크롭 안에 2번 문제 번호와 배점이 들어오면 실패입니다. 원인은 `h`를 과하게 크게 잡았거나 다음 문항의 시작 y좌표를 확인하지 않은 것입니다.

해결:

- 같은 열의 다음 문항 시작 y좌표를 먼저 찾습니다.
- 현재 문항의 `bottom = y + h`가 다음 문항 시작점보다 최소 `20~40px` 위에 오도록 조정합니다.
- 접촉 시트 확인 후 해당 문항을 원본 크기로 열어 다음 문항 번호가 보이지 않는지 확인합니다.

### 정답 선택지가 여러 개인 경우

`options`에 같은 문자열이 중복되면 정답이 2개로 처리될 수 있습니다. 생성 전 `options` 중복을 눈으로 확인합니다.

### 정답 문자열과 선택지 문자열이 다른 경우

예를 들어 정답이 `$6\\frac{5}{12}$`인데 선택지가 `$6 \\frac{5}{12}$`처럼 공백이 다르면 앱 처리에서 불일치가 날 수 있습니다. `answer`와 정답 `option.text`는 완전히 같은 문자열이어야 합니다.

### 복합 인덱스 오류

Firestore에서 `where + orderBy` 조합은 인덱스가 필요할 수 있습니다. 검증 용도로만 쓰는 경우에는 단순 `where`로 가져온 뒤 로컬 정렬하면 됩니다.

### PDF 텍스트 추출만 믿는 경우

`pdftotext`는 문항 본문과 도형을 제대로 추출하지 못하는 경우가 많습니다. 문제 원문과 그림은 반드시 렌더링한 페이지 이미지를 보고 확인합니다.

### 이미지가 필요한 문제를 텍스트만으로 만드는 경우

도형, 전개도, 카드, 표, 수직선, 그림이 포함된 문제는 텍스트만으로 의미가 달라질 수 있습니다. PDF 기반 평가 퀴즈는 모든 문항에 이미지를 붙이는 방식으로 통일하는 것이 안전합니다.

## 17. 권장 작업 로그 형식

완료 보고에는 아래 항목을 포함합니다.

```text
완료했습니다.

{UNIT_ID} 단원에 {학년} 4월 평가 퀴즈 25개를 생성했습니다.
PDF 문항을 각각 이미지로 캡처해 Storage에 업로드했고, 모든 문항은 5지선다로 구성했습니다.

검증 결과:
- Firestore 생성 퀴즈: 25개
- 잘못된 레코드: 0개
- 각 문항 선택지: 5개
- 정답 선택지: 문항별 1개
- 문항 이미지 URL: 25개 모두 정상 접근 확인
```
