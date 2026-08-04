import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Ratiocast: short, child-friendly hint and explanation repair.
// It changes only hint, explanation, and updatedAt. Add --apply to write.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const EXPECTED_QUIZ_COUNT = 520;

const chapterOne = {
  unit1: ['크기 비교', '무엇과 무엇을 비교하는지 찾아보세요.', '두 물건의 크기를 알아보려면 같은 곳에 놓고 살펴볼 수 있어요.', '두 물건의 시작점이나 끝점을 맞추어 보세요.', '눈으로만 어림하지 말고 나란히 보세요.'],
  unit2: ['비교하는 양과 기준 양', '무엇을 알고 싶은지와 무엇을 기준으로 삼는지 찾아보세요.', '비교할 때는 알고 싶은 양과 기준이 되는 양을 나누어 생각해요.', '문장에서 먼저 나온 양과 기준이 되는 양을 표시해 보세요.', '두 양의 자리를 바꾸지 않도록 해요.'],
  unit3: ['비 읽기', '콜론 앞과 뒤에 어떤 물건의 수가 있는지 보세요.', '비는 앞의 양과 뒤의 양을 차례대로 나타낸 것이에요.', '문장에서도 앞에 말한 것과 뒤에 말한 것을 같은 순서로 읽어 보세요.', '콜론 앞뒤의 순서를 바꾸지 않도록 해요.'],
  unit4: ['부분과 전체의 비', '부분이 몇 개인지와 모두 몇 개인지 찾아보세요.', '전체는 모든 부분을 더한 수예요. 부분과 전체도 비로 나타낼 수 있어요.', '먼저 모든 것을 더해 전체 수를 구해 보세요.', '다른 부분의 수를 전체 수로 잘못 쓰지 않도록 해요.'],
  unit5: ['비를 바르게 쓰기', '비교하는 두 양이 무엇인지와 순서를 보세요.', '비는 비교하는 양을 정한 순서대로 써야 해요.', '문장에 나온 순서와 콜론 앞뒤 순서가 같은지 확인해 보세요.', '두 양의 순서를 바꾸지 않도록 해요.'],
  unit6: ['비를 분수처럼 보기', '무엇에 대한 무엇인지 문장 순서를 보세요.', '비는 앞의 양을 위쪽, 뒤의 양을 아래쪽에 놓은 분수처럼 볼 수 있어요.', '문장에 나온 앞의 양과 뒤의 양을 차례로 적어 보세요.', '위와 아래를 거꾸로 쓰지 않도록 해요.'],
  unit7: ['비의 크기 비교', '두 비에서 같은 수가 있는지 찾아보세요.', '같은 기준으로 비교하면 앞의 양이 더 큰 쪽을 쉽게 찾을 수 있어요.', '필요하면 분수처럼 생각하거나 같은 크기로 바꾸어 보세요.', '숫자 하나만 보고 바로 고르지 않도록 해요.'],
  unit8: ['서로 어울리는 짝', '앞의 두 낱말이 어떤 관계인지 생각해 보세요.', '앞의 짝과 같은 관계를 뒤에서도 찾으면 돼요.', '쓰임이나 함께 쓰는 물건을 떠올려 보세요.', '낱말 하나만 비슷한 보기를 고르지 않도록 해요.']
};

const chapterTwo = {
  unit1: ['비례식', '콜론이 있는 식 양쪽을 모두 보세요.', '두 비의 크기가 같다고 쓴 식을 찾을 수 있어요.', '왼쪽 비와 오른쪽 비가 같은 크기인지 확인해 보세요.', '비 하나만 있는 식과 헷갈리지 않도록 해요.'],
  unit2: ['비례식의 곱셈', '비례식에서 바깥쪽 수와 안쪽 수를 보세요.', '비가 같으면 바깥쪽끼리 곱한 값과 안쪽끼리 곱한 값이 같아요.', '두 곱셈식을 만들어 같은지 확인해 보세요.', '한쪽만 곱하고 멈추지 않도록 해요.'],
  unit3: ['아직 모르는 수', '문제에서 값을 모르는 글자를 찾아보세요.', '글자는 아직 알지 못한 수를 대신할 수 있어요.', '글자 자리에 어떤 수가 들어가야 하는지 생각해 보세요.', '이미 아는 수와 글자를 같은 뜻으로 보지 않도록 해요.'],
  unit4: ['몇 배인지 찾기', '처음 수와 되고 싶은 수를 찾아보세요.', '처음 수에 어떤 수를 곱하면 되는지 찾을 수 있어요.', '되고 싶은 수를 처음 수로 나누어 생각해 보세요.', '더하기로 바꾸어 생각하지 않도록 해요.'],
  unit5: ['크기는 달라도 같은 모양', '두 도형의 모양과 크기를 함께 보세요.', '크기는 달라도 모양과 각의 모습이 같은 도형이 있어요.', '한 도형을 똑같이 크게 하거나 작게 한 모습인지 보세요.', '크기만 같다고 같은 모양이라고 생각하지 않도록 해요.'],
  unit6: ['백 개를 기준으로 보기', '기준이 몇 개인지 보세요.', '어떤 비율은 백 개를 기준으로 나타내면 쉽게 읽을 수 있어요.', '전체를 백으로 생각했을 때 몇 개인지 떠올려 보세요.', '열 개 기준과 헷갈리지 않도록 해요.']
};

const chapterThree = {
  unit1: ['여러 수의 비', '몇 개의 수를 차례로 비교하는지 보세요.', '셋 이상을 한 줄로 이어 비교하는 방법이 있어요.', '콜론 사이의 수를 왼쪽부터 차례로 읽어 보세요.', '수 하나를 빼먹지 않도록 해요.'],
  unit2: ['비대로 나누기', '전체와 나누는 비를 찾아보세요.', '비의 수만큼 몫을 나누어 전체를 나눌 수 있어요.', '비의 모든 수를 더해 몇 몫인지 먼저 구해 보세요.', '비의 수를 그냥 더하지 않도록 해요.'],
  unit3: ['얼마나 늘었는지', '처음 크기와 늘어난 크기를 찾아보세요.', '늘어난 양은 처음 크기와 비교하면 얼마나 달라졌는지 알 수 있어요.', '먼저 늘어난 양을 찾고 처음 크기와 비교해 보세요.', '늘어난 뒤의 전체와 늘어난 양을 헷갈리지 않도록 해요.'],
  unit4: ['값을 줄이기', '처음 값과 줄어든 값을 찾아보세요.', '값을 덜어 내면 처음보다 작아져요.', '처음 값에서 얼마를 빼는지 생각해 보세요.', '더하는 상황과 바꾸지 않도록 해요.'],
  unit5: ['재는 기준', '무엇을 재는지와 어떤 표시가 붙었는지 보세요.', '길이, 무게, 시간처럼 잴 때는 모두가 같은 기준을 써야 해요.', '숫자 뒤에 붙은 표시가 무엇인지 확인해 보세요.', '숫자만 보고 판단하지 않도록 해요.'],
  unit6: ['지도와 바깥 크기', '지도에서 잰 길이와 바깥에서 잰 길이를 구분해 보세요.', '지도는 바깥에서 재는 크기보다 작게 그려도 같은 모양을 나타낼 수 있어요.', '지도에서 한 칸이 바깥에서는 얼마인지 생각해 보세요.', '지도 길이를 바깥의 길이로 바로 보지 않도록 해요.'],
  unit7: ['시간의 짧은 표시', '시간을 나타내는 말과 짧은 표시를 함께 보세요.', '시간, 분, 초는 서로 다른 짧은 표시를 써요.', '어떤 시간 단위인지 먼저 확인해 보세요.', '분과 초의 표시를 바꾸지 않도록 해요.']
};

const chapterFour = {
  unit1: ['한 개의 값', '모두 얼마인지와 몇 개인지 찾아보세요.', '여러 개의 값에서 한 개의 값을 찾으려면 똑같이 나누어 볼 수 있어요.', '전체 값을 개수로 나누어 한 개의 값을 생각해 보세요.', '전체 값과 한 개의 값을 바꾸지 않도록 해요.'],
  unit2: ['한 시간에 가는 길', '간 시간과 간 거리를 찾아보세요.', '같은 속도로 갈 때 한 시간에 가는 길이를 찾을 수 있어요.', '전체 거리를 시간으로 나누어 한 시간의 길을 생각해 보세요.', '시간과 거리를 바꾸어 나누지 않도록 해요.'],
  unit3: ['백 개로 바꾸기', '소수나 분수의 크기를 보세요.', '어떤 수를 백 개 기준으로 바꾸면 퍼센트로 나타낼 수 있어요.', '소수점을 두 칸 움직이는 모습을 떠올려 보세요.', '퍼센트 기호를 빼먹지 않도록 해요.'],
  unit4: ['섞은 전체', '섞는 두 양이 각각 얼마인지 보세요.', '두 가지를 섞으면 전체는 두 양을 더한 값이에요.', '각각의 양을 먼저 더해 보세요.', '한쪽 양만 답으로 고르지 않도록 해요.'],
  unit5: ['비대로 돈 나누기', '전체 비와 한 사람이 가진 돈을 찾아보세요.', '비의 한 몫이 얼마인지 알면 다른 몫도 찾을 수 있어요.', '알고 있는 돈이 비에서 몇 몫인지 먼저 보세요.', '비의 순서를 바꾸지 않도록 해요.']
};

function profileFor(quiz) {
  const match = String(quiz.unitId || '').match(/^ratios_ratio_chap(\d+)_(unit\d+)$/);
  if (!match) throw new Error(`지원하지 않는 라티오카스 단원: ${quiz.unitId}`);
  const [, chapter, unit] = match;
  const profile = (chapter === '1' ? chapterOne : chapter === '2' ? chapterTwo : chapter === '3' ? chapterThree : chapterFour)[unit];
  if (!profile) throw new Error(`지원하지 않는 라티오카스 단원: ${quiz.unitId}`);
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

function proportionSteps(quiz) {
  const source = String(quiz.question || '');
  const match = source.match(/(\d+)\s*:\s*(\d+)\s*=\s*(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  const [, aText, bText, cText, dText] = match;
  const [a, b, c, d] = [aText, bText, cText, dText].map(Number);
  const outside = a * d;
  const inside = b * c;
  const same = outside === inside ? '같아요' : '달라요';
  return [`- **양끝과 가운데 곱하기:** $${a} : ${b}=${c} : ${d}$에서 양끝은 $${a} \\times ${d}=${outside}$이에요.`, `- **가운데 곱하기:** 가운데는 $${b} \\times ${c}=${inside}$이에요. 두 값이 ${same}.`].join('\n');
}

function makeHint(quiz) {
  const [, observe, connect, reason] = profileFor(quiz);
  const hint = ['### 힌트', `- **[관찰 단계]**: ${observe}`, `- **[개념 연결]**: ${connect}`, `- **[과정 추론]**: ${reason}`, '- **[결론 유도]**: 이제 계산하거나 같은 뜻의 보기를 찾아보세요.'].join('\n');
  const answer = String(quiz.answer || '').trim();
  if (answer.length > 1 && hint.includes(answer)) throw new Error(`힌트에 정답이 직접 포함되었습니다: ${quiz.id}`);
  return hint;
}

function makeExplanation(quiz) {
  const [concept, observe, connect, reason, caution] = profileFor(quiz);
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const choices = options.map((option, index) => `- 보기 $${index + 1}$: ${optionText(option)}`).join('\n');
  const steps = proportionSteps(quiz) || [`- **문제 보기:** ${observe}`, `- **생각하기:** ${reason}`].join('\n');
  return ['## 문제 풀이', `**문제 내용:** ${latexText(quiz.question)}`, '', '**보기:**', choices, '', '### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)', `- **${concept}:** ${connect}`, '', '### 어떻게 접근해야 할까요? (풀이 전략)', '문장에서 비교하는 두 양과 그 순서를 먼저 확인해요.', '', '### 차근차근 풀어봅시다! (단계별 상세 풀이)', steps, `- **답 고르기:** 계산하거나 뜻을 확인한 뒤 **${answerText(quiz)}**를 골라요.`, '', '### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)', `- **주의할 점:** ${caution}`].join('\n');
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
  const snapshot = await db.collection('quizzes').where('unitId', '>=', 'ratios_').where('unitId', '<', 'ratios_\uf8ff').get();
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
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', quizCount: entries.length, sample: entries.filter(entry => entry.id === 'r1-4-1' || entry.id === 'r2-1-1' || entry.id === 'r4-5-1') }, null, 2));
  if (APPLY) await update(entries);
} finally {
  await admin.app().delete();
}
