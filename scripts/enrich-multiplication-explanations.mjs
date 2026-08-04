import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Multipluvia: child-friendly hint and explanation repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 460;

function profileFor(quiz) {
  const unit = String(quiz.unitId || '').replace(/^multiplication_/, '');
  const [, chapter, lesson] = unit.match(/^mul_chap(\d+)_(unit\d+)$/) || [];

  if (chapter === '1') {
    const profiles = {
      unit1: ['곱하기 기호와 뜻', '문제에 나온 말과 기호를 천천히 보세요.', '같은 것이 여러 번 이어질 때 쓰는 기호가 있어요. 더하기, 빼기, 나누기 기호와 모양을 비교해 보세요.', '말과 기호 중에서 같은 뜻을 가진 것을 찾아보세요.', '기호만 보지 말고, 그 기호가 무엇을 하라는 뜻인지 생각하세요.'],
      unit2: ['무엇을 몇 번 더하는지', '두 수 중에서 몇 번을 말하는 수와 더해지는 수를 찾아보세요.', '$a \\times b$는 $b$를 $a$번 더하는 뜻으로 읽을 수 있어요.', '앞의 수만큼 뒤의 수를 써서 더해 보세요.', '앞의 수와 뒤의 수가 하는 일을 바꾸지 않도록 조심하세요.'],
      unit3: ['같은 묶음', '한 묶음에 몇 개 있는지와 묶음이 몇 개인지 찾아보세요.', '똑같은 묶음이 여러 개 있으면, 한 묶음의 수를 묶음 수만큼 더하면 돼요.', '한 묶음씩 그림을 그리거나 손가락으로 세어 보세요.', '물건을 하나씩 세기 전에 묶음부터 찾아보세요.'],
      unit4: ['몇 배', '처음 수와 몇 배인지 나타내는 수를 찾아보세요.', '몇 배는 처음 수가 같은 크기로 여러 번 있는 모습이에요.', '처음 수를 몇 번 더해야 하는지 생각해 보세요.', '몇 배를 볼 때는 처음 수를 꼭 함께 보세요.'],
      unit5: ['같은 층', '한 층에 있는 수와 층의 수를 찾아보세요.', '똑같은 층이 쌓여 있으면, 한 층의 수를 층 수만큼 더하면 돼요.', '아래층부터 한 층씩 빠짐없이 세어 보세요.', '맨 위나 맨 아래층을 빼먹지 않도록 해요.'],
      unit6: ['같은 길이', '한 조각의 길이와 조각 수를 찾아보세요.', '같은 길이를 이어 붙이면, 한 조각의 길이가 여러 번 더해져요.', '조각을 하나씩 이어 보며 전체 길이를 생각하세요.', '점의 수와 조각의 수를 헷갈리지 않도록 해요.'],
      unit7: ['같은 수 더하기', '더해지는 수가 모두 같은지, 몇 번 있는지 찾아보세요.', '같은 수를 여러 번 더하는 식은 더 짧게 나타낼 수 있어요.', '같은 수를 동그라미로 묶고, 몇 개인지 세어 보세요.', '서로 다른 수가 섞여 있으면 같은 방법을 바로 쓰지 않아요.']
    };
    if (profiles[lesson]) return profiles[lesson];
  }

  if (chapter === '2') return ['곱셈구구', '식에서 몇 번과 더해지는 수를 찾아보세요.', '$a \\times b$는 $b$를 $a$번 더하는 뜻이에요.', '앞의 수만큼 뒤의 수를 써서 더한 뒤 답을 확인해 보세요.', '앞의 수는 몇 번인지, 뒤의 수는 무엇을 더하는지 꼭 확인하세요.'];

  if (chapter === '3') {
    const profiles = {
      unit1: ['곱하기의 쉬운 약속', '식에서 특별한 수가 있는지 찾아보세요.', '같은 묶음이 몇 개 있는지 생각하면 곱하기의 약속을 알 수 있어요.', '작은 그림을 떠올려 답이 맞는지 확인해 보세요.', '외운 답만 고르지 말고 묶음의 수를 생각하세요.'],
      unit2: ['순서를 바꾼 곱하기', '두 식에서 수의 자리가 어떻게 달라졌는지 보세요.', '같은 묶음을 가로로 세거나 세로로 세어도 전체 수는 같을 수 있어요.', '그림이나 더하기로 두 식을 확인해 보세요.', '수의 자리와 계산하는 순서는 다른 생각이에요.'],
      unit3: ['마이너스가 있는 곱하기', '각 수 앞에 마이너스 기호가 있는지 먼저 보세요.', '마이너스 기호는 답의 부호를 알려 줘요. 숫자 부분은 먼저 보던 곱하기처럼 계산해요.', '부호를 먼저 정하고 숫자끼리 곱해 보세요.', '마이너스 기호를 빼기 기호로 잘못 보지 않도록 해요.'],
      unit4: ['더하기와 곱하기', '식에 더하기와 곱하기가 함께 있는지 보세요.', '더하기와 곱하기가 함께 있으면, 먼저 해야 하는 계산이 있어요.', '먼저 계산할 곳을 동그라미로 표시하고 차례대로 풀어 보세요.', '왼쪽부터 무조건 계산하지 않도록 해요.'],
      unit5: ['둥근 기호가 있는 식', '둥근 기호 안과 밖을 나누어 보세요.', '둥근 기호 안은 한 덩어리예요. 안의 계산을 먼저 해요.', '기호 안을 먼저 계산하고, 나온 수로 다음 계산을 해 보세요.', '기호 안과 밖을 한꺼번에 계산하지 않도록 해요.'],
      unit6: ['자릿값이 달라지는 곱하기', '수의 끝자리와 자리가 어떻게 달라지는지 보세요.', '어떤 수를 곱하면 수의 자리가 한 칸씩 커질 수 있어요.', '기본 곱을 먼저 하고, 자리가 어떻게 달라졌는지 살펴보세요.', '끝자리만 보지 말고 앞의 숫자도 꼭 계산하세요.'],
      unit7: ['세로셈', '위 수와 아래 수의 자리를 맞춰 보세요.', '세로셈은 아래 수의 한 자리씩 위 수와 곱해요.', '한 자리씩 곱하고, 줄을 맞춰 더해 보세요.', '줄을 잘못 맞추면 답이 달라질 수 있어요.'],
      unit8: ['큰 수 곱하기', '큰 수를 십의 자리와 일의 자리로 나누어 보세요.', '큰 수도 작은 수끼리 나누어 곱한 다음 모두 더할 수 있어요.', '나눈 부분을 빠짐없이 곱하고 더해 보세요.', '나눈 부분 중 하나라도 빼먹지 않도록 해요.']
    };
    if (profiles[lesson]) return profiles[lesson];
  }
  throw new Error(`지원하지 않는 멀티플루비아 단원: ${quiz.unitId}`);
}

function latexText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().split(/(\$[^$]*\$)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(?<![\\\w])(-?\d{1,3}(?:,\d{3})*|-?\d+(?:\.\d+)?)(?![\w])/g, (_, number) => `$${number}$`);
  }).join('');
}

function answerText(quiz) { return latexText(quiz.answer); }
function optionText(option) { return latexText(typeof option === 'string' ? option : option?.text); }

function productSteps(quiz) {
  const source = String(quiz.question || '').replace(/,/g, '');
  const match = source.match(/(-?\d+)\s*(?:\\times|×)\s*\(?\s*(-?\d+)/);
  if (!match) return null;
  const count = Number(match[1]);
  const addend = Number(match[2]);
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(addend)) return null;
  const value = count * addend;
  const expression = `$${count} \\times ${addend}$`;

  if (count === 0) return [`- **몇 번인지 보기:** ${expression}은 $${addend}$을 한 번도 더하지 않는 식이에요.`, `- **계산:** 그래서 값은 $${value}$이에요.`].join('\n');
  if (count < 0 || addend < 0) {
    const sign = (count < 0) === (addend < 0) ? '플러스' : '마이너스';
    return [`- **부호 보기:** ${expression}에서 마이너스 기호를 먼저 봐요. 답의 부호는 ${sign}예요.`, `- **숫자 계산:** $|${count}| \\times |${addend}|=${Math.abs(value)}$이므로 답은 $${value}$이에요.`].join('\n');
  }
  if (count <= 10) {
    const repeated = Array.from({ length: count }, () => String(addend)).join('+');
    return [`- **몇 번 더하는지 보기:** ${expression}은 $${addend}$을 $${count}$번 더하는 뜻이에요.`, `- **계산:** $${repeated}=${value}$이에요.`].join('\n');
  }
  return [`- **식 읽기:** ${expression}에서 앞의 수는 몇 번인지, 뒤의 수는 더해지는 수인지 봐요.`, `- **계산:** $${count} \\times ${addend}=${value}$이에요.`].join('\n');
}

function makeHint(quiz) {
  const [, observe, connect, reason] = profileFor(quiz);
  const hint = ['### 힌트', `- **[관찰 단계]**: ${observe}`, `- **[개념 연결]**: ${connect}`, `- **[과정 추론]**: ${reason}`, '- **[결론 유도]**: 이제 답을 계산하거나, 같은 뜻의 보기를 찾아보세요.'].join('\n');
  if (hint.includes(String(quiz.answer || '').trim())) throw new Error(`힌트에 정답이 직접 포함되었습니다: ${quiz.id}`);
  return hint;
}

function makeExplanation(quiz) {
  const [concept, observe, connect, reason, caution] = profileFor(quiz);
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const choices = options.map((option, index) => `- 보기 $${index + 1}$: ${optionText(option)}`).join('\n');
  const steps = productSteps(quiz) || ['- **문제 보기:** ' + observe, `- **생각하기:** ${reason}`].join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${concept}:** ${connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', '문제에서 무엇을 묻는지 보고, 알맞은 뜻이나 계산을 찾아요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, `- **답 고르기:** 계산하거나 뜻을 확인한 뒤 **${answerText(quiz)}**를 골라요.`, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${caution}`].join('\n');
}

function validate(quiz, hint, explanation) {
  const hintLabels = ['[관찰 단계]', '[개념 연결]', '[과정 추론]', '[결론 유도]'];
  const explanationLabels = ['## 문제 풀이', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', '### 어떻게 접근해야 할까요? (풀이 전략)', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)'];
  if (!hintLabels.every(label => hint.includes(label))) throw new Error(`힌트 단계가 누락되었습니다: ${quiz.id}`);
  if (!explanationLabels.every(label => explanation.includes(label))) throw new Error(`해설 섹션이 누락되었습니다: ${quiz.id}`);
  if (hint.length < 160 || explanation.length < 450 || explanation.length > 8000) throw new Error(`콘텐츠 길이가 기준을 벗어났습니다: ${quiz.id}`);
  if (!explanation.includes(answerText(quiz))) throw new Error(`해설에 정답이 없습니다: ${quiz.id}`);
}

async function loadQuizzes() {
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'multiplication_').where('unitId', '<', 'multiplication_\uf8ff').get();
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
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, sample: entries.filter(entry => entry.id === 'mul-2-1-3' || entry.id === 'mul-3-8-10') }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
