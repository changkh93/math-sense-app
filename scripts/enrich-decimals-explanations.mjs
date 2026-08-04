import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Decimella: short, child-friendly hint and explanation repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 380;

const chapterFive = {
  unit1: ['수를 나타내는 말', '문제에서 개수나 크기를 말하는 부분을 찾아보세요.', '개수나 크기를 나타낼 때 쓰는 말이 있어요.', '글자, 기호, 계산식과 무엇이 다른지 생각해 보세요.', '문제에서 묻는 뜻을 먼저 읽어 보세요.'],
  unit2: ['십분의 몇', '전체를 몇 조각으로 나눴는지 보세요.', '전체를 같은 크기로 열 조각으로 나눈 한 조각은 아주 작은 한 부분이에요.', '전체 조각 수와 고른 조각 수를 차례로 세어 보세요.', '전체 조각 수와 고른 조각 수를 바꾸지 않도록 해요.'],
  unit3: ['백분의 몇', '전체를 몇 조각으로 나눴는지 보세요.', '전체를 같은 크기로 백 조각으로 나눈 한 조각은 더 작은 한 부분이에요.', '전체 조각 수와 고른 조각 수를 차례로 세어 보세요.', '십분의 몇과 백분의 몇을 헷갈리지 않도록 해요.'],
  unit4: ['수직선의 소수', '시작점과 끝점 사이가 몇 칸인지 보세요.', '수직선에서 같은 크기의 칸 하나는 같은 크기의 작은 수를 뜻해요.', '시작점에서 몇 칸 왔는지 세어 보세요.', '눈금을 하나씩 빠뜨리지 않도록 해요.'],
  unit5: ['십진분수', '분수의 아래 수가 어떤 수인지 보세요.', '아래 수가 열, 백, 천처럼 열씩 커지는 분수를 특별히 나타낼 수 있어요.', '아래 수의 $0$ 개수를 세어 보세요.', '아래 수가 다른 분수와 헷갈리지 않도록 해요.'],
  unit6: ['소수 끝의 $0$', '소수점 뒤에 $0$이 있는지 보세요.', '소수점 뒤 맨 끝의 $0$은 빼도 수의 크기가 같을 수 있어요.', '끝에 있는 $0$만 지워 보고 수를 읽어 보세요.', '가운데에 있는 $0$을 지우지 않도록 해요.'],
  unit7: ['반올림', '어느 자리까지 나타낼지와 바로 다음 숫자를 보세요.', '바로 다음 숫자를 보고 올릴지 그대로 둘지 정할 수 있어요.', '구하려는 자리의 바로 오른쪽 숫자를 확인해 보세요.', '보고 있는 자리보다 왼쪽 숫자를 보지 않도록 해요.'],
  unit8: ['소수의 자리', '숫자 사이에 있는 점의 바로 뒤와 그다음 숫자를 차례로 보세요.', '그 점을 기준으로 숫자 자리에 따라 뜻하는 크기가 달라요.', '그 점에서 얼마나 떨어져 있는지 세어 보세요.', '기준이 되는 점을 빼고 숫자만 보지 않도록 해요.']
};

const chapterSix = {
  unit1: ['소수 더하기', '더할 수의 소수점을 찾아보세요.', '소수끼리 더할 때는 소수점을 같은 줄에 맞추어 써요.', '소수점을 맞춘 뒤 같은 자리끼리 더해 보세요.', '오른쪽 끝만 맞추지 않도록 해요.'],
  unit2: ['소수 세로셈', '두 수의 소수점이 어디에 있는지 보세요.', '세로셈에서는 소수점을 같은 줄에 맞춰야 같은 자리끼리 계산할 수 있어요.', '소수점을 먼저 맞추고 위아래 숫자를 더해 보세요.', '자리를 한 칸씩 밀어 쓰지 않도록 해요.'],
  unit3: ['소수 빼기', '두 수의 소수점을 찾아보세요.', '소수끼리 뺄 때도 소수점을 같은 줄에 맞춰요.', '같은 자리끼리 빼고 소수점 위치를 그대로 써 보세요.', '소수점을 옮기지 않도록 해요.'],
  unit4: ['열로 나누기', '나누는 수가 열인지 보세요.', '열로 나누면 소수점이 한 칸 왼쪽으로 움직여요.', '소수점을 한 칸 왼쪽으로 옮겨 보세요.', '오른쪽으로 옮기지 않도록 해요.'],
  unit5: ['소수와 기준 조각', '기준이 되는 작은 조각이 무엇인지 보세요.', '기준 조각이 아주 작으면 같은 수를 더 많이 셀 수 있어요.', '소수가 몇 개의 기준 조각인지 생각해 보세요.', '기준 조각의 크기를 빼먹지 않도록 해요.'],
  unit6: ['소수의 반복 더하기', '같은 소수가 몇 번 더해지는지 보세요.', '같은 소수를 여러 번 더하면 곱하기로 짧게 나타낼 수 있어요.', '몇 번 더해지는지와 더해지는 수를 찾아보세요.', '더해지는 횟수와 수를 바꾸지 않도록 해요.'],
  unit7: ['소수 곱하기', '곱하는 수의 소수점을 찾아보세요.', '소수를 곱한 뒤에는 소수점 아래 자리 수를 살펴야 해요.', '숫자끼리 곱한 뒤 소수점 아래 자리 수를 세어 보세요.', '소수점을 빼먹지 않도록 해요.'],
  unit8: ['소수를 자연수로 나누기', '전체 소수와 몇으로 나누는지 보세요.', '소수도 똑같이 나누어 줄 수 있어요.', '그림처럼 같은 크기로 나누어 보고 소수점을 확인하세요.', '소수점을 없애지 않도록 해요.'],
  unit9: ['자연수를 나누어 소수로 쓰기', '나누어지는 수와 나누는 수를 보세요.', '자연수를 나누면 소수로 나타낼 수 있어요.', '똑같이 나눈 한 부분의 크기를 생각해 보세요.', '분수와 소수를 다른 수로 생각하지 않도록 해요.'],
  unit10: ['소수 나누기', '두 수의 소수점을 찾아보세요.', '나누는 수가 자연수가 되도록 두 수의 소수점을 함께 움직일 수 있어요.', '두 소수점을 같은 칸 수만큼 옮긴 뒤 나누어 보세요.', '한쪽 소수점만 옮기지 않도록 해요.'],
  unit11: ['소수를 분수로', '소수점 뒤에 몇 자리 숫자가 있는지 보세요.', '소수점 뒤 자리 수에 맞는 아래 수를 써서 분수로 바꿀 수 있어요.', '소수점 뒤 자리 수를 세고, 더 줄일 수 있는지 확인해 보세요.', '분수를 가장 간단한 모양으로 만들 수 있는지 보세요.']
};

function profileFor(quiz) {
  const match = String(quiz.unitId || '').match(/^decimals_chap(\d+)_(unit\d+)$/);
  if (!match) throw new Error(`지원하지 않는 데시멜라 단원: ${quiz.unitId}`);
  const [, chapter, unit] = match;
  const profile = (chapter === '5' ? chapterFive : chapterSix)[unit];
  if (!profile) throw new Error(`지원하지 않는 데시멜라 단원: ${quiz.unitId}`);
  return profile;
}

function latexText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().split(/(\$[^$]*\$)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(?<![\\\w])(-?(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?))(?![\w])/g, (_, number) => `$${number}$`);
  }).join('');
}

function answerText(quiz) { return latexText(quiz.answer); }
function optionText(option) { return latexText(typeof option === 'string' ? option : option?.text); }
function formatDecimal(value) {
  const rounded = Math.round((value + Number.EPSILON) * 10000000000) / 10000000000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}

function decimalCalculationSteps(quiz) {
  const source = String(quiz.question || '');
  const repeated = source.match(/(?<![\d.])(-?\d+(?:\.\d+)?)(?:\s*\+\s*\1(?![\d.])){1,}/);
  if (repeated) {
    const addend = Number(repeated[1]);
    const count = (repeated[0].match(/\+/g) || []).length + 1;
    const value = formatDecimal(addend * count);
    const sum = Array.from({ length: count }, () => repeated[1]).join('+');
    return [`- **같은 수 세기:** $${repeated[1]}$이 $${count}$번 더해져 있어요.`, `- **곱하기로 쓰기:** $${sum}=${count} \\times ${repeated[1]}=${value}$예요.`].join('\n');
  }
  const match = source.match(/(-?\d+(?:\.\d+)?)\s*(\\times|\\div|[+-])\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const [, leftText, operator, rightText] = match;
  const left = Number(leftText);
  const right = Number(rightText);
  if (!Number.isFinite(left) || !Number.isFinite(right) || (operator === '\\div' && right === 0)) return null;
  const symbol = operator === '\\times' ? '\\times' : operator === '\\div' ? '\\div' : operator;
  const value = operator === '\\times' ? left * right : operator === '\\div' ? left / right : operator === '+' ? left + right : left - right;
  const result = formatDecimal(value);
  if (operator === '\\times' && Number.isInteger(left) && left >= 1 && left <= 10) {
    const repeated = Array.from({ length: left }, () => rightText).join('+');
    return [`- **몇 번 더하는지 보기:** $${leftText} \\times ${rightText}$은 $${rightText}$을 $${leftText}$번 더하는 뜻이에요.`, `- **계산:** $${repeated}=${result}$예요.`].join('\n');
  }
  if (operator === '+' || operator === '-') return [`- **소수점 맞추기:** $${leftText}$와 $${rightText}$의 소수점을 같은 줄에 맞춰요.`, `- **계산:** $${leftText} ${symbol} ${rightText}=${result}$예요.`].join('\n');
  return [`- **식 보기:** $${leftText} ${symbol} ${rightText}$에서 소수점 위치를 확인해요.`, `- **계산:** $${leftText} ${symbol} ${rightText}=${result}$예요.`].join('\n');
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
  const steps = decimalCalculationSteps(quiz) || [`- **문제 보기:** ${observe}`, `- **생각하기:** ${reason}`].join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${concept}:** ${connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', '문제의 소수점, 자리, 계산 기호를 차례로 확인해요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, `- **답 고르기:** 계산하거나 뜻을 확인한 뒤 **${answerText(quiz)}**를 골라요.`, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${caution}`].join('\n');
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
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'decimals_').where('unitId', '<', 'decimals_\uf8ff').get();
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
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, sample: entries.filter(entry => entry.id === '5-4-1' || entry.id === '6-3-1' || entry.id === '6-6-1') }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
