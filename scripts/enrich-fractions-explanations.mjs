import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Fractonis: short, child-friendly hint and explanation repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 660;

const chapterOne = {
  unit1: ['나누기와 분수', '나누어지는 수와 나누는 수를 차례로 보세요.', '나누기 식은 분수로 쓸 수 있어요. 앞의 수는 위에, 뒤의 수는 아래에 써요.', '나누기 기호의 앞뒤 수가 분수에서 어디로 가는지 살펴보세요.', '위와 아래의 자리를 바꾸지 않도록 해요.'],
  unit2: ['전체와 부분', '전체가 무엇인지, 그중에서 고른 것이 무엇인지 찾아보세요.', '분수에서는 전체를 나타내는 수가 아래에, 고른 부분을 나타내는 수가 위에 있어요.', '먼저 전체를 찾고, 그다음 고른 부분을 찾아보세요.', '부분을 아래에 쓰지 않도록 해요.'],
  unit3: ['분수의 위와 아래', '전체를 몇 조각으로 나눴는지와 고른 조각 수를 보세요.', '분수의 아래 수는 같은 크기로 나눈 조각 수이고, 위 수는 고른 조각 수예요.', '그림이 있으면 전체 조각을 먼저 세고 색칠한 조각을 세어 보세요.', '전체 조각 수와 고른 조각 수를 바꾸지 않도록 해요.'],
  unit4: ['나눈 몫과 분수', '나누기 식과 분수 모양을 함께 보세요.', '하나를 같은 크기로 나누면 작은 조각으로 생각할 수 있어요.', '몇 조각을 갖는지 그림이나 식으로 세어 보세요.', '조각의 크기와 조각 수를 헷갈리지 않도록 해요.'],
  unit5: ['생활 속 분수', '피자나 케이크가 몇 조각으로 나뉘었는지 보세요.', '전체를 같은 크기로 나눈 조각 중 몇 조각인지로 분수를 말할 수 있어요.', '전체 조각 수와 남은 조각 수를 차례로 세어 보세요.', '영어 표현이 있어도 전체와 부분을 먼저 생각하세요.'],
  unit6: ['수직선의 분수', '시작점과 끝점 사이가 몇 칸으로 나뉘었는지 보세요.', '수직선에서 같은 크기의 칸 하나는 같은 크기의 분수 한 조각이에요.', '시작점에서 몇 칸 왔는지 세어 보세요.', '칸 사이의 눈금을 빠뜨리지 않도록 해요.']
};

const chapterTwo = {
  unit1: ['같은 크기의 분수', '두 분수가 같은 크기인지, 조각을 더 잘게 나눈 것인지 보세요.', '조각을 더 잘게 나누어도 고른 부분이 같으면 크기는 같을 수 있어요.', '위 수와 아래 수에 같은 수를 곱했는지 살펴보세요.', '한쪽에만 곱하지 않도록 해요.'],
  unit2: ['분수를 더 잘게 나누기', '아래 수를 무엇으로 곱했는지 먼저 보세요.', '같은 크기의 분수를 만들 때는 위 수와 아래 수에 같은 수를 곱해요.', '아래 수에 곱한 수를 위 수에도 똑같이 곱해 보세요.', '위 수와 아래 수에 다른 수를 곱하지 않도록 해요.'],
  unit3: ['분수의 같은 크기', '위 수와 아래 수에 붙은 기호나 수를 찾아보세요.', '분수의 크기를 그대로 두려면 위와 아래에 같은 것을 곱해요.', '위쪽과 아래쪽을 짝지어 비교해 보세요.', '빈칸을 한쪽에만 넣지 않도록 해요.'],
  unit4: ['분수의 크기 비교', '두 분수의 위 수와 아래 수를 함께 보세요.', '두 분수의 크기를 비교할 때는 서로 같은 기준으로 바꾸어 볼 수 있어요.', '한 분수의 위 수와 아래 수에 같은 수를 곱해 보세요.', '위 수만 비교하고 바로 고르지 않도록 해요.'],
  unit5: ['같이 나누어지는 수', '두 수를 나누어 보며 똑같이 나누어지는 수를 찾아보세요.', '두 수를 모두 남김없이 나눌 수 있는 수가 있어요.', '작은 수부터 차례로 나누어 보세요.', '한 수만 나누어지는 수는 고르지 않도록 해요.'],
  unit8: ['작은 분수 찾기', '위 수가 같은지, 아래 수가 어떻게 다른지 보세요.', '위 수가 같을 때 아래 수가 더 크면 한 조각은 더 작아져요.', '피자를 더 많은 조각으로 나눈 모습을 떠올려 보세요.', '위 수만 보고 고르지 않도록 해요.'],
  unit9: ['큰 분수 찾기', '분수가 $1$에 얼마나 가까운지 보세요.', '위 수가 아래 수에 가까우면 분수는 $1$에 가까워져요.', '아래 수에서 위 수를 빼면 남은 조각 수를 알 수 있어요.', '분모와 분자를 바꾸어 보지 않도록 해요.'],
  unit10: ['아래 수 맞추기', '두 분수의 아래 수가 무엇인지 보세요.', '분수를 더하거나 빼려면 아래 수를 같게 만들 수 있어요.', '아래 수에 곱한 수를 위 수에도 똑같이 곱해 보세요.', '한 분수만 바꾸고 멈추지 않도록 해요.'],
  unit11: ['분수 비교하기', '두 분수의 위 수와 아래 수를 모두 보세요.', '아래 수가 다르면 같은 크기의 조각으로 바꾸어 비교할 수 있어요.', '두 분수를 같은 아래 수로 바꾸어 보거나 그림을 그려 보세요.', '한 숫자만 보고 바로 고르지 않도록 해요.'],
  special: ['분수 비교하기', '두 분수의 위 수와 아래 수를 모두 보세요.', '아래 수가 다르면 같은 크기의 조각으로 바꾸어 비교할 수 있어요.', '두 분수를 같은 아래 수로 바꾸어 보거나 그림을 그려 보세요.', '한 숫자만 보고 바로 고르지 않도록 해요.']
};

const chapterThree = {
  unit1: ['아래 수가 같은 분수의 더하기와 빼기', '두 분수의 아래 수가 같은지 먼저 보세요.', '아래 수가 같으면 위 수끼리 더하거나 빼고 아래 수는 그대로 써요.', '위 수만 계산한 뒤 아래 수를 그대로 적어 보세요.', '아래 수끼리 더하거나 빼지 않도록 해요.'],
  unit2: ['자연수와 분수', '자연수를 아래 수가 있는 분수로 바꾸어 보세요.', '자연수는 아래 수와 똑같은 수를 위에 놓아 분수로 나타낼 수 있어요.', '아래 수를 정한 뒤 위 수를 생각해 보세요.', '자연수를 그냥 위 수에 더하지 않도록 해요.'],
  unit3: ['대분수', '자연수 부분과 분수 부분을 나누어 보세요.', '대분수는 자연수와 진짜 분수가 함께 있는 수예요.', '자연수 부분과 분수 부분을 따로 읽어 보세요.', '자연수 부분을 빼먹지 않도록 해요.'],
  unit4: ['가분수', '위 수가 아래 수보다 큰지 또는 같은지 보세요.', '위 수가 아래 수보다 크거나 같으면 한 덩어리보다 큰 분수예요.', '전체가 몇 개가 되는지 나누어 보세요.', '위와 아래의 자리를 바꾸지 않도록 해요.'],
  unit5: ['가분수를 대분수로 바꾸기', '위 수를 아래 수로 나누어 보세요.', '몇 덩어리가 만들어지는지와 남는 조각을 찾으면 돼요.', '몫은 자연수 부분에, 남는 수는 위 수에 써 보세요.', '남는 수가 아래 수보다 크지 않은지 확인해요.'],
  unit6: ['대분수 다듬기', '분수 부분의 위 수가 아래 수보다 큰지 보세요.', '분수 부분이 한 덩어리보다 크면 자연수 부분으로 옮길 수 있어요.', '분수 부분을 나누어 자연수 부분에 더해 보세요.', '남은 분수는 한 덩어리보다 작게 써요.'],
  unit7: ['아래 수가 다른 분수의 더하기', '두 분수의 아래 수가 같은지 먼저 보세요.', '아래 수가 다르면 같은 아래 수로 바꾼 뒤 더해요.', '두 분수 모두 같은 아래 수로 바꾸고 위 수를 더해 보세요.', '아래 수가 다를 때 바로 위 수만 더하지 않도록 해요.'],
  unit8: ['아래 수가 다른 분수의 빼기', '두 분수의 아래 수가 같은지 먼저 보세요.', '아래 수가 다르면 같은 아래 수로 바꾼 뒤 빼요.', '두 분수 모두 같은 아래 수로 바꾸고 위 수를 빼 보세요.', '아래 수가 다를 때 바로 위 수만 빼지 않도록 해요.'],
  special: ['가분수를 대분수로 바꾸기', '위 수를 아래 수로 나누어 보세요.', '몇 덩어리가 만들어지는지와 남는 조각을 찾으면 돼요.', '몫은 자연수 부분에, 남는 수는 위 수에 써 보세요.', '남는 수가 아래 수보다 크지 않은지 확인해요.']
};

const chapterFour = {
  unit1: ['자연수와 분수의 곱하기', '자연수와 분수 중 무엇을 몇 번 더하는지 보세요.', '자연수와 분수를 곱하면 같은 분수를 여러 번 더한 것으로 볼 수 있어요.', '자연수만큼 분수의 위 수를 더해 보세요.', '아래 수를 함부로 바꾸지 않도록 해요.'],
  unit2: ['전체의 한 부분', '전체 수와 그중에서 고른 부분을 찾아보세요.', '전체를 같은 수로 나눈 뒤 그중 몇 부분을 고르면 돼요.', '먼저 전체를 아래 수만큼 나누고 위 수만큼 골라 보세요.', '전체와 고른 부분을 바꾸지 않도록 해요.'],
  unit3: ['분수끼리 곱하기', '두 분수의 위 수와 아래 수를 각각 보세요.', '분수끼리 곱할 때는 위 수끼리, 아래 수끼리 곱할 수 있어요.', '위쪽끼리 곱한 수와 아래쪽끼리 곱한 수를 적어 보세요.', '위 수와 아래 수를 서로 바꾸어 곱하지 않도록 해요.'],
  unit4: ['나누기를 곱하기로 쓰기', '나누기 기호 뒤에 있는 수를 보세요.', '나누기는 뒤의 수를 뒤집은 분수와 곱하는 모습으로 바꿀 수 있어요.', '뒤의 수를 아래에 놓은 분수로 생각해 보세요.', '앞의 수와 뒤의 수를 바꾸지 않도록 해요.'],
  unit5: ['분수 나누기', '나누기 기호 뒤에 있는 분수의 위와 아래를 보세요.', '분수로 나눌 때는 뒤의 분수를 뒤집어 곱하기로 바꿀 수 있어요.', '뒤의 분수만 뒤집고 곱하기로 바꾸어 보세요.', '앞의 분수까지 뒤집지 않도록 해요.'],
  unit6: ['분수 안의 분수', '큰 분수의 위나 아래에 또 분수가 있는지 보세요.', '분수 안에 또 분수가 있으면 안쪽 분수를 먼저 살펴볼 수 있어요.', '큰 분수와 작은 분수를 나누어 보며 읽어 보세요.', '위와 아래에 있는 작은 분수를 헷갈리지 않도록 해요.'],
  unit7: ['분수의 분수', '전체의 얼마만큼인지 차례대로 보세요.', '어떤 것의 한 부분을 다시 나누어 고르면 분수끼리 곱하는 모습이 돼요.', '첫 번째 부분을 고른 뒤 그 안에서 다시 고르는 모습을 그려 보세요.', '더하기로 바꾸지 않도록 해요.'],
  unit8: ['문자가 있는 분수', '글자와 수가 분수의 위와 아래 어디에 있는지 보세요.', '글자가 있어도 분수는 위 수를 아래 수로 나눈 뜻이에요.', '글자를 하나의 수처럼 생각하고 나누기 식으로 바꾸어 보세요.', '글자와 수의 자리를 바꾸지 않도록 해요.']
};

function profileFor(quiz) {
  const unitId = String(quiz.unitId || '');
  const match = unitId.match(/^fractions_chap(\d+)_(.+)$/);
  if (!match) throw new Error(`지원하지 않는 프락토니스 단원: ${unitId}`);
  const [, chapter, unit] = match;
  const collection = chapter === '1' ? chapterOne : chapter === '2' ? chapterTwo : chapter === '3' ? chapterThree : chapterFour;
  const key = /^unit\d+$/.test(unit) ? unit : 'special';
  const profile = collection[key];
  if (!profile) throw new Error(`지원하지 않는 프락토니스 단원: ${unitId}`);
  return profile;
}

function latexText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().split(/(\$[^$]*\$)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(?<![\\\w])(-?\d{1,3}(?:,\d{3})*|-?\d+(?:\.\d+)?)(?![\w])/g, (_, number) => `$${number}$`);
  }).join('');
}

function answerText(quiz) { return latexText(quiz.answer); }
function optionText(option) { return latexText(typeof option === 'string' ? option : option?.text); }
function gcd(left, right) { let a = Math.abs(left); let b = Math.abs(right); while (b) [a, b] = [b, a % b]; return a || 1; }
function lcm(left, right) { return Math.abs(left * right) / gcd(left, right); }

function fractionCalculationSteps(quiz) {
  const source = String(quiz.question || '');
  const pair = source.match(/\\frac\{(-?\d+)\}\{(\d+)\}\s*([+-])\s*\\frac\{(-?\d+)\}\{(\d+)\}/);
  if (pair) {
    const [, aText, bText, sign, cText, dText] = pair;
    const [a, b, c, d] = [aText, bText, cText, dText].map(Number);
    const common = lcm(b, d);
    const top = a * (common / b) + (sign === '+' ? 1 : -1) * c * (common / d);
    const divisor = gcd(top, common);
    const reducedTop = top / divisor;
    const reducedBottom = common / divisor;
    const first = `\\frac{${a * (common / b)}}{${common}}`;
    const second = `\\frac{${c * (common / d)}}{${common}}`;
    return [`- **아래 수 맞추기:** 두 분수를 아래 수 $${common}$으로 바꾸면 $${first}$와 $${second}$가 돼요.`, `- **위 수 계산:** $${first} ${sign} ${second}=\\frac{${top}}{${common}}=\\frac{${reducedTop}}{${reducedBottom}}$예요.`].join('\n');
  }

  const product = source.match(/\\frac\{(-?\d+)\}\{(\d+)\}\s*\\times\s*\\frac\{(-?\d+)\}\{(\d+)\}/);
  if (product) {
    const [, aText, bText, cText, dText] = product;
    const [a, b, c, d] = [aText, bText, cText, dText].map(Number);
    const top = a * c;
    const bottom = b * d;
    const divisor = gcd(top, bottom);
    return [`- **위끼리, 아래끼리 곱하기:** $\\frac{${a}}{${b}} \\times \\frac{${c}}{${d}}=\\frac{${a} \\times ${c}}{${b} \\times ${d}}$예요.`, `- **계산:** $\\frac{${top}}{${bottom}}=\\frac{${top / divisor}}{${bottom / divisor}}$예요.`].join('\n');
  }

  return null;
}

function makeHint(quiz) {
  const [, observe, connect, reason] = profileFor(quiz);
  const hint = ['### 힌트', `- **[관찰 단계]**: ${observe}`, `- **[개념 연결]**: ${connect}`, `- **[과정 추론]**: ${reason}`, '- **[결론 유도]**: 이제 계산하거나 같은 뜻의 보기를 찾아보세요.'].join('\n');
  if (hint.includes(String(quiz.answer || '').trim())) throw new Error(`힌트에 정답이 직접 포함되었습니다: ${quiz.id}`);
  return hint;
}

function makeExplanation(quiz) {
  const [concept, observe, connect, reason, caution] = profileFor(quiz);
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const choices = options.map((option, index) => `- 보기 $${index + 1}$: ${optionText(option)}`).join('\n');
  const steps = fractionCalculationSteps(quiz) || [`- **문제 보기:** ${observe}`, `- **생각하기:** ${reason}`].join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${concept}:** ${connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', '문제에서 전체, 고른 부분, 위 수와 아래 수를 차례로 확인해요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, `- **답 고르기:** 계산하거나 뜻을 확인한 뒤 **${answerText(quiz)}**를 골라요.`, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${caution}`].join('\n');
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
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'fractions_').where('unitId', '<', 'fractions_\uf8ff').get();
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
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, sample: entries.filter(entry => entry.id.includes('chap1_unit3_q10') || entry.id.includes('chap3_unit7_q10') || entry.id === '4-7-1') }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
