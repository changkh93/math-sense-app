
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const unitId = "unit_middle_math_eq_18";

const quizUpdates = [
  {
    qNum: 1,
    hint: "방정식을 푼다는 것은 미지수 $x$의 값을 찾아내는 것입니다. $x$만 홀로 남겨보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: 일차방정식을 푸는 과정의 끝에는 항상 어떤 모양의 식이 적혀 있나요?\n2. **[개념 연결]**: 방정식을 푼다는 것은 미지수 $x$가 어떤 숫자인지 찾아내는 과정입니다.\n3. **[과정 추론]**: 좌변에는 $x$ 하나만 남기고, 우변에는 숫자만 남도록 정리했을 때 해를 구했다고 합니다.\n4. **[결론 유도]**: $x = (상수)$ 꼴이 일차방정식 풀이의 최종 목표입니다."
  },
  {
    qNum: 2,
    hint: "이항할 때는 항의 부호를 반드시 반대로 바꿔야 합니다.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: 좌변의 $-5$와 우변의 $x$를 옮겨야 합니다.\n2. **[개념 연결]**: 항이 등호를 넘어갈 때 부호가 바뀝니다. ($-$는 $+$, $+$는 $-$)\n3. **[과정 추론]**: $-5$는 $+5$로, $x$는 $-x$로 바뀌어 이동합니다.\n4. **[결론 유도]**: 따라서 식은 $3x - x = 7 + 5$ 가 됩니다."
  },
  {
    qNum: 3,
    hint: "$x$ 앞에 곱해진 숫자가 무엇인지 확인해 보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: $x$의 계수가 2인 상태입니다.\n2. **[개념 연결]**: $x$만 남기려면 곱해진 숫자를 나눠서 없애야 합니다.\n3. **[과정 추론]**: 2를 없애기 위해 양변을 똑같이 2로 나눕니다.\n4. **[결론 유도]**: 나누어야 하는 숫자는 2입니다."
  },
  {
    qNum: 4,
    hint: "항을 옮길 때 가장 중요한 부호 변화를 생각하세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: 이항할 때 어떤 변화가 일어나는지 묻고 있습니다.\n2. **[개념 연결]**: 이항은 등호 너머로 이사가는 것과 같으며, 이때 통행료로 '부호 반전'이 필요합니다.\n3. **[과정 추론]**: $+5$가 넘어가면 $-5$가 되고, $-3$이 넘어가면 $+3$이 됩니다.\n4. **[결론 유도]**: 따라서 $+5$가 이항하면 $-5$가 된다는 설명이 옳습니다."
  },
  {
    qNum: 5,
    hint: "계수가 분모로 내려가는 것을 떠올려 보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: $5x = 10$에서 $x$를 구하는 식을 세워야 합니다.\n2. **[개념 연결]**: 양변을 5로 나누면 $x = \\frac{10}{5}$ 가 됩니다.\n3. **[과정 추론]**: $x$ 앞에 곱해진 숫자가 분모로, 우변의 상수가 분자로 갑니다.\n4. **[결론 유도]**: 올바른 위치는 $x = \\frac{10}{5}$ 입니다."
  },
  {
    qNum: 6,
    hint: "상수항 $-8$을 우변으로 보내보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: $-8$을 우변으로 이항하여 $ax = b$ 꼴로 만들어야 합니다.\n2. **[개념 연결]**: 좌변의 상수항을 우변으로 옮기면 부호가 바뀝니다.\n3. **[과정 추론]**: $-8$이 우변으로 가면 $+8$이 됩니다.\n4. **[결론 유도]**: 따라서 식은 $4x = 8$ 이 됩니다."
  },
  {
    qNum: 7,
    hint: "구한 값을 원래 식의 $x$ 자리에 대입해 보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: $x=3$이 해인지 확인하는 방법입니다.\n2. **[개념 연결]**: 해를 원래 식의 미지수에 대입했을 때 등식이 성립해야 합니다.\n3. **[과정 추론]**: $2x = 6$의 $x$ 자리에 3을 넣으면 $2 \\times 3 = 6$이 됩니다.\n4. **[결론 유도]**: 이 식을 통해 3이 정답임을 확인할 수 있습니다."
  },
  {
    qNum: 8,
    hint: "괄호 풀기 -> 이항하기 -> 나누기 순서를 생각하세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: 일차방정식을 푸는 논리적인 순서를 묻고 있습니다.\n2. **[개념 연결]**: 식을 먼저 단순화(괄호 제거)하고, 끼리끼리 모으고(이항), 마지막에 답을 구합니다.\n3. **[과정 추론]**: 분배법칙(괄호) $\rightarrow$ 끼리끼리(이항) $\rightarrow$ 나누기($x$ 구하기) 순서입니다.\n4. **[결론 유도]**: 이 순서대로 나열된 보기를 고르면 됩니다."
  },
  {
    qNum: 9,
    hint: "수학에서 어떤 수로 나누는 것이 불가능한지 떠올려 보세요.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: $a$로 나눌 때의 조건을 묻고 있습니다.\n2. **[개념 연결]**: 수학에서 0으로 나누는 것은 정의되지 않습니다.\n3. **[과정 추론]**: $ax = b$에서 $a$가 0이라면 양변을 $a$로 나눌 수 없습니다.\n4. **[결론 유도]**: 따라서 $a$는 0이 되어서는 안 됩니다."
  },
  {
    qNum: 10,
    hint: "양변에 같은 처리를 해도 등호가 유지되는 성질입니다.",
    explanation: "### **[추상적 사고 단계]**\n1. **[관찰 단계]**: 양변에서 똑같이 3을 빼는 행동의 근거를 묻습니다.\n2. **[개념 연결]**: 등식의 양변에 같은 수를 더하거나 빼도 등식은 여전히 참입니다.\n3. **[과정 추론]**: 이것을 '등식의 성질'이라고 부릅니다.\n4. **[결론 유도]**: 정답은 등식의 성질입니다."
  }
];

async function updateUnit18() {
  console.log(`Starting update for Unit: ${unitId}`);
  try {
    const snap = await db.collection('quizzes')
      .where('unitId', '==', unitId)
      .get();
    
    console.log(`Found ${snap.size} quizzes to update.`);
    
    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(doc => {
      const data = doc.data();
      // Use the 'id' field if available, or try to parse from the document ID
      const docId = doc.id;
      // Quiz IDs look like: unit_middle_math_eq_18_q1_1773802444862
      const match = docId.match(/_q(\d+)_/);
      if (match) {
        const qNum = parseInt(match[1]);
        const update = quizUpdates.find(u => u.qNum === qNum);
        if (update) {
          batch.update(doc.ref, {
            hint: update.hint,
            explanation: update.explanation,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Queued update for ${docId} (Q${qNum})`);
          count++;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully updated ${count} quizzes.`);
    } else {
      console.log("No matching quizzes found to update.");
    }
  } catch (err) {
    console.error("Error updating unit 18:", err);
  }
}

updateUnit18();
