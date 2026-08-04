import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Dividia: child-friendly hint and explanation repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 300;

const profiles = {
  unit1: ['똑같이 나누기', '전체가 몇 개인지와 몇 명에게 나누는지 찾아보세요.', '나누기는 가진 것을 똑같이 나누어 갖는 일이에요.', '한 사람에게 하나씩 나누어 주는 모습을 떠올려 보세요.', '모두에게 같은 수가 가야 해요.'],
  unit2: ['나누기 식', '전체 수와 나누는 수, 그리고 나누기 기호를 찾아보세요.', '똑같이 나누는 일은 나누기 기호가 있는 식으로 나타낼 수 있어요.', '이야기에 나온 전체 수와 사람 수를 식에 넣어 보세요.', '더하기나 곱하기 기호와 헷갈리지 않도록 해요.'],
  unit3: ['나눈 결과로 식 만들기', '전체 수, 사람 수, 한 사람이 가진 수를 찾아보세요.', '전체를 똑같이 나누면 전체 수와 사람 수, 한 사람의 수를 식으로 이어 쓸 수 있어요.', '나눈 뒤에 한 사람이 가진 수를 먼저 확인해 보세요.', '전체 수와 한 사람의 수를 바꾸어 쓰지 않도록 해요.'],
  unit4: ['몇 묶음인지 찾기', '한 묶음에 몇 개씩 있는지와 전체 수를 찾아보세요.', '같은 수씩 묶으면 전체에서 몇 묶음이 나오는지 알 수 있어요.', '한 묶음씩 동그라미를 그리며 세어 보세요.', '묶음 안의 수와 묶음의 수를 바꾸지 않도록 해요.'],
  unit5: ['같은 수씩 쌓기', '한 층에 몇 개 있는지와 모두 몇 개인지 찾아보세요.', '같은 수씩 쌓았을 때 층이 몇 개인지 찾는 것도 나누기예요.', '한 층씩 그려 보며 몇 층인지 세어 보세요.', '층을 하나씩 빠뜨리지 않도록 해요.'],
  unit6: ['한 묶음으로 생각하기', '한 마리나 한 개에 몇 개씩 있는지와 전체 수를 찾아보세요.', '전체를 한 묶음에 드는 수로 나누면 묶음이 몇 개인지 알 수 있어요.', '한 묶음씩 만들어 보며 전체가 다 쓰였는지 확인하세요.', '한 묶음에 드는 수를 전체 수로 잘못 쓰지 않도록 해요.'],
  unit7: ['곱하기와 나누기', '문제에 나온 곱하기 식과 나누기 식을 함께 보세요.', '곱하기와 나누기는 서로 이어져 있어요. 곱하기 답을 알면 나누기 답도 찾을 수 있어요.', '곱하기 식을 먼저 떠올리고, 빈자리에 들어갈 수를 찾아보세요.', '곱하기와 나누기 기호를 바꾸어 보지 않도록 해요.'],
  unit8: ['똑같이 나누기와 묶기', '몇 등분인지, 또는 몇 개씩 묶는지 찾아보세요.', '똑같이 나누는 방법과 같은 수씩 묶는 방법은 모두 나누기와 이어져 있어요.', '사람 수를 찾는지, 묶음 수를 찾는지 먼저 확인하세요.', '무엇을 찾는 문제인지 먼저 읽어 보세요.'],
  unit9: ['돈 나누기', '모두 얼마인지와 몇 명에게 줄지 찾아보세요.', '돈도 똑같이 나누어 줄 수 있어요. 큰 돈은 천 단위처럼 묶어서 생각하면 쉬워요.', '한 사람에게 같은 돈을 나누어 주는 모습을 떠올려 보세요.', '돈의 단위를 빼먹지 않도록 해요.'],
  unit10: ['세로셈 나눗셈', '나누는 수, 나누어지는 수, 답이 쓰이는 자리를 살펴보세요.', '세로셈에서는 수마다 정해진 자리가 있어요.', '그림의 안쪽, 바깥쪽, 위쪽을 천천히 비교해 보세요.', '수의 이름과 자리를 함께 외우면 쉬워요.'],
  unit11: ['두 자리 수 나누기', '어느 자리부터 나눌지와 답의 자리를 살펴보세요.', '큰 수를 나눌 때에도 앞자리부터 차례대로 나누면 돼요.', '앞자리부터 한 자리씩 나누고 답의 자리를 맞춰 쓰세요.', '답의 숫자를 한 자리 옆에 잘못 쓰지 않도록 해요.'],
  unit12: ['남는 수', '똑같이 나눈 뒤 남는 것이 있는지 찾아보세요.', '모두 똑같이 나누지 못하면 조금 남을 수 있어요.', '같은 수씩 묶은 뒤, 묶이지 못한 것을 세어 보세요.', '남은 수는 나누는 수보다 작아야 해요.'],
  unit13: ['답 확인하기', '나눈 답, 나누는 수, 남은 수를 찾아보세요.', '나눗셈 답은 곱하기를 써서 다시 확인할 수 있어요.', '답과 나누는 수를 곱하고, 남은 수가 있으면 더해 보세요.', '남은 수를 빼먹지 않도록 해요.'],
  unit14: ['세로셈 순서', '세로셈에 나온 화살표와 빈칸 앞뒤를 보세요.', '세로셈 나눗셈은 정해진 순서로 한 가지씩 해요.', '빈칸 앞뒤에서 어떤 일을 하는지 천천히 이어 보세요.', '다음 단계로 너무 빨리 넘어가지 않도록 해요.'],
  unit15: ['큰 수 나누기', '큰 수의 앞자리부터 차례대로 나누어 보세요.', '큰 수도 작은 수 나누기처럼 앞자리부터 한 자리씩 나누면 돼요.', '각 자리에서 나온 답을 같은 자리에 맞춰 써 보세요.', '중간에 나온 수를 빼먹지 않도록 해요.']
};

function profileFor(quiz) {
  const unit = String(quiz.unitId || '').replace(/^division_div_chap1_/, '');
  const profile = profiles[unit];
  if (!profile) throw new Error(`지원하지 않는 디비디아 단원: ${quiz.unitId}`);
  return profile;
}

function latexText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().replace(/(\d+)R(\d+)/g, (_, quotient, remainder) => `$${quotient}\\text{R}${remainder}$`).split(/(\$[^$]*\$)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/(?<![\\\w])(-?\d{1,3}(?:,\d{3})*|-?\d+(?:\.\d+)?)(?![\w])/g, (_, number) => `$${number}$`);
  }).join('');
}

function answerText(quiz) { return latexText(quiz.answer); }
function optionText(option) { return latexText(typeof option === 'string' ? option : option?.text); }

function divisionSteps(quiz) {
  const source = String(quiz.question || '').replace(/,/g, '');
  const match = source.match(/(\d+)\s*\\div\s*(\d+)/);
  if (!match) return null;
  const total = Number(match[1]);
  const group = Number(match[2]);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(group) || group === 0) return null;
  const quotient = Math.floor(total / group);
  const remainder = total % group;
  const expression = `$${total} \\div ${group}$`;
  if (remainder === 0) return [`- **똑같이 나누기:** ${expression}은 $${total}$개를 $${group}$명에게 똑같이 나누는 뜻이에요.`, `- **계산:** $${group} \\times ${quotient}=${total}$이므로 한 명은 $${quotient}$개씩 가져요.`].join('\n');
  return [`- **묶음 만들기:** ${expression}에서 $${group}$씩 묶으면 $${quotient}$묶음을 만들 수 있어요.`, `- **남는 수 보기:** $${group} \\times ${quotient}=${group * quotient}$이고 $${remainder}$개가 남아요. 그래서 $${total} \\div ${group}=${quotient}\\text{R}${remainder}$예요.`].join('\n');
}

function makeHint(quiz) {
  const [, observe, connect, reason] = profileFor(quiz);
  const hint = ['### 힌트', `- **[관찰 단계]**: ${observe}`, `- **[개념 연결]**: ${connect}`, `- **[과정 추론]**: ${reason}`, '- **[결론 유도]**: 이제 알맞은 수나 같은 뜻의 보기를 찾아보세요.'].join('\n');
  if (hint.includes(String(quiz.answer || '').trim())) throw new Error(`힌트에 정답이 직접 포함되었습니다: ${quiz.id}`);
  return hint;
}

function makeExplanation(quiz) {
  const [concept, observe, connect, reason, caution] = profileFor(quiz);
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const choices = options.map((option, index) => `- 보기 $${index + 1}$: ${optionText(option)}`).join('\n');
  const steps = divisionSteps(quiz) || [`- **문제 보기:** ${observe}`, '- **그림으로 나누기:** 한 사람이나 한 묶음에 하나씩 번갈아 놓아 보세요. 모두 나눈 뒤 남은 것이 있는지도 살펴봐요.', `- **생각하기:** ${reason}`].join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${concept}:** ${connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', '문제에서 무엇을 나누는지 보고, 그림처럼 나누거나 식으로 계산해요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, `- **답 고르기:** 계산하거나 뜻을 확인한 뒤 **${answerText(quiz)}**를 골라요.`, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${caution}`].join('\n');
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
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'division_').where('unitId', '<', 'division_\uf8ff').get();
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
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, sample: entries.filter(entry => entry.id === 'div-1-1' || entry.id === 'div-12-1') }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
