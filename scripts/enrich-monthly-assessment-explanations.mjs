import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Elementary monthly assessments: image-aware, child-friendly content repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 400;

const profiles = {
  table: {
    concept: '표와 그래프 읽기',
    observe: '그림의 제목과 가로줄·세로줄을 먼저 읽고, 문제에서 찾으라는 칸을 손가락으로 짚어 보세요.',
    connect: '표와 그래프의 숫자는 항목마다 뜻이 달라요. 같은 항목끼리 비교해야 해요.',
    reason: '큰 수와 작은 수를 정한 뒤, 더하는지 빼는지 문제의 말을 보고 고르세요.',
    caution: '다른 줄이나 다른 항목의 숫자를 가져오지 않도록 해요.'
  },
  angle: {
    concept: '각과 직선',
    observe: '그림에서 선이 만나는 곳, 각도 표시, 직각 표시를 먼저 찾아보세요.',
    connect: '한 직선 위의 각을 모두 더하면 $180^\\circ$이고, 직각은 $90^\\circ$예요.',
    reason: '이미 아는 각부터 구하고, 남은 각을 차례대로 찾아보세요.',
    caution: '그림의 안쪽 각과 바깥쪽 각을 바꾸어 보지 않도록 해요.'
  },
  fraction: {
    concept: '전체와 부분',
    observe: '그림이 모두 몇 칸으로 나뉘었는지, 그중 몇 칸이 색칠되었는지 보세요.',
    connect: '아래 수는 전체를 같은 크기로 나눈 조각 수이고, 위 수는 고른 조각 수예요.',
    reason: '전체 조각을 먼저 세고, 색칠한 조각이나 필요한 조각을 세어 보세요.',
    caution: '전체 조각 수와 고른 조각 수를 바꾸지 않도록 해요.'
  },
  shape: {
    concept: '도형의 모양과 성질',
    observe: '그림의 변, 꼭짓점, 면, 모서리, 길이 표시를 하나씩 찾아보세요.',
    connect: '도형 문제는 무엇을 세는지에 따라 보는 곳이 달라요. 둘레는 바깥 선, 넓이는 안쪽 칸, 부피는 쌓인 공간을 봐요.',
    reason: '문제에서 찾으라는 것을 동그라미로 표시한 뒤, 빠짐없이 세거나 계산해 보세요.',
    caution: '안쪽 선을 둘레에 넣거나, 겹친 선을 두 번 세지 않도록 해요.'
  },
  pattern: {
    concept: '규칙 찾기',
    observe: '그림이나 식을 앞에서부터 차례로 보고, 이웃한 두 줄이 어떻게 달라지는지 보세요.',
    connect: '규칙 문제는 앞의 변화가 다음에도 똑같이 이어져요.',
    reason: '한 번에 멀리 가지 말고, 바로 앞 단계에서 무엇을 더하거나 빼고 곱하거나 나누었는지 찾아보세요.',
    caution: '숫자의 모양만 보지 말고 계산 기호와 자리도 함께 보세요.'
  },
  place: {
    concept: '자릿값과 큰 수',
    observe: '수 모형이나 숫자에서 백의 자리, 십의 자리, 일의 자리를 차례로 보세요.',
    connect: '같은 숫자도 있는 자리에 따라 뜻하는 크기가 달라요.',
    reason: '각 자리가 나타내는 수를 따로 읽고, 그다음 더하거나 빼 보세요.',
    caution: '숫자를 한 덩어리로만 보지 말고 자리마다 나누어 보세요.'
  },
  arithmetic: {
    concept: '계산 순서',
    observe: '그림의 화살표, 빈칸, 계산 기호를 왼쪽에서 오른쪽으로 차례로 보세요.',
    connect: '여러 계산이 있으면 앞 계산의 답이 다음 계산에 쓰일 수 있어요.',
    reason: '중간 답을 적은 뒤, 그 답으로 다음 계산을 해 보세요.',
    caution: '중간 답을 건너뛰거나 계산 기호를 바꾸지 않도록 해요.'
  },
  text: {
    concept: '문제의 중요한 말',
    observe: '문제에서 주어진 수, 단위, 무엇을 구하라는 말을 동그라미로 표시해 보세요.',
    connect: '문제의 말은 어떤 계산을 해야 하는지 알려 줘요.',
    reason: '주어진 수가 무엇을 뜻하는지 먼저 쓰고, 필요한 계산을 차례로 해 보세요.',
    caution: '단위와 질문을 끝까지 읽어 보세요.'
  }
};

function classify(quiz) {
  const text = `${quiz.question || ''} ${(quiz.hint || '')}`;
  if (/표|그래프|조사|대응 관계|띠그래프/.test(text)) return 'table';
  if (/각도|직각|평각/.test(text)) return 'angle';
  if (/각기둥|각뿔|직육면체|도형|둘레|넓이|부피|모서리|꼭짓점|면의 수|전개도|이동한 도형/.test(text)) return 'shape';
  if (/분수|색칠|기약분수|대분수|분모|분자/.test(text)) return 'fraction';
  if (/규칙|뛰어 세|번째|대응 관계/.test(text)) return 'pattern';
  if (/수 모형|자릿값|백의 자리|십의 자리|일의 자리|억|만보다|큰 수/.test(text)) return 'place';
  if (/계산|더|빼|곱|나누|식|빈칸|□|㉠|㉡|㉢/.test(text)) return 'arithmetic';
  return 'text';
}

function latexText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().split(/(\$[^$]*\$)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(?<![\\\w])(-?(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))(?![\w])/g, (_, number) => `$${number}$`);
  }).join('');
}

function answerText(quiz) { return latexText(quiz.answer); }
function optionText(option) { return latexText(typeof option === 'string' ? option : option?.text); }

function imageCue(quiz, profile) {
  if (quiz.imageUrl) return `- **그림 먼저 보기:** ${profile.observe}`;
  return `- **문제 먼저 보기:** ${profile.observe}`;
}

function oldImageDetails(quiz) {
  // Legacy hints sometimes contain an unchecked reading of the picture.
  // Use a stable image-reading checklist instead of copying a possible mismatch.
  if (!quiz.imageUrl) return '';
  return '- **그림 확인:** 그림의 제목·표시·수와 보기의 수를 하나씩 짝지어 확인해요.';
}

function makeHint(quiz) {
  const profile = profiles[classify(quiz)];
  const start = quiz.imageUrl ? '그림을 먼저 보고, ' : '문장을 먼저 읽고, ';
  const hint = ['### 힌트', `- **[관찰 단계]**: ${start}${profile.observe}`, `- **[개념 연결]**: ${profile.connect}`, `- **[과정 추론]**: ${profile.reason}`, '- **[결론 유도]**: 이제 계산하거나 같은 뜻의 보기를 찾아보세요.'].join('\n');
  const answer = String(quiz.answer || '').trim();
  if (answer.length > 1 && hint.includes(answer)) throw new Error(`힌트에 정답이 직접 포함되었습니다: ${quiz.id}`);
  return hint;
}

function makeExplanation(quiz) {
  const profile = profiles[classify(quiz)];
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const choices = options.map((option, index) => `- 보기 $${index + 1}$: ${optionText(option)}`).join('\n');
  const visualDetails = oldImageDetails(quiz);
  const steps = [imageCue(quiz, profile), visualDetails, `- **풀이 순서:** ${profile.reason}`, `- **답 고르기:** 위 순서로 확인한 뒤 **${answerText(quiz)}**를 골라요.`].filter(Boolean).join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${profile.concept}:** ${profile.connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', quiz.imageUrl ? '그림에 있는 표시와 수를 먼저 읽고, 문제의 말에 맞게 계산해요.' : '문장에 있는 수와 단위를 먼저 읽고, 문제의 말에 맞게 계산해요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${profile.caution}`].join('\n');
}

function validate(quiz, hint, explanation) {
  const hintLabels = ['[관찰 단계]', '[개념 연결]', '[과정 추론]', '[결론 유도]'];
  const explanationLabels = ['## 문제 풀이', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', '### 어떻게 접근해야 할까요? (풀이 전략)', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)'];
  if (!hintLabels.every(label => hint.includes(label))) throw new Error(`힌트 단계가 누락되었습니다: ${quiz.id}`);
  if (!explanationLabels.every(label => explanation.includes(label))) throw new Error(`해설 섹션이 누락되었습니다: ${quiz.id}`);
  if (hint.length < 150 || explanation.length < 430 || explanation.length > 8000) throw new Error(`콘텐츠 길이가 기준을 벗어났습니다: ${quiz.id}`);
  if (!explanation.includes(answerText(quiz))) throw new Error(`해설에 정답이 없습니다: ${quiz.id}`);
}

async function loadQuizzes() {
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'reg_1774390167801_').where('unitId', '<', 'reg_1774390167801_\uf8ff').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.unitId.localeCompare(b.unitId) || (a.order ?? 0) - (b.order ?? 0));
}

async function update(entries) {
  for (let offset = 0; offset < entries.length; offset += 400) {
    const batch = db.batch();
    for (const entry of entries.slice(offset, offset + 400)) batch.update(db.collection('quizzes').doc(entry.id), { hint: entry.hint, explanation: entry.explanation, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();
    console.log(`Updated ${Math.min(offset + 400, entries.length)}/${entries.length} quizzes.`);
  }
}

try {
  const quizzes = await loadQuizzes();
  if (quizzes.length !== EXPECTED_QUIZ_COUNT) throw new Error(`대상 퀴즈 수가 예상과 다릅니다. 예상: ${EXPECTED_QUIZ_COUNT}, 실제: ${quizzes.length}`);
  const entries = quizzes.map(quiz => { const hint = makeHint(quiz); const explanation = makeExplanation(quiz); validate(quiz, hint, explanation); return { id: quiz.id, hint, explanation }; });
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, imageQuizCount: quizzes.filter(quiz => quiz.imageUrl).length, sample: entries.filter(entry => entry.id.endsWith('q10_1774390738621') || entry.id.endsWith('q10_1774392439365') || entry.id.endsWith('q10_1785284663424')) }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
