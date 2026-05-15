
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './service-account.json';

try {
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error("❌ 'service-account.json' 파일을 찾을 수 없습니다.");
  process.exit(1);
}

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

async function repairUserCrystals(userName) {
  console.log(`🔍 유저 '${userName}' 검색 중...`);
  const userSnap = await db.collection('users').where('name', '==', userName).get();
  
  if (userSnap.empty) {
    console.log("❌ 유저를 찾을 수 없습니다.");
    return;
  }

  const userDoc = userSnap.docs[0];
  const uid = userDoc.id;
  const userData = userDoc.data();
  console.log(`✅ 유저 발견: ${uid} (현재 DB 잔고: ${userData.crystals})`);

  console.log("📥 모든 광석 트랜잭션 수집 중...");
  const txsSnap = await db.collection('users').doc(uid).collection('crystal_transactions').get();
  
  let totalIncome = 0;
  let totalExpense = 0;
  let calculatedBalance = 0;

  txsSnap.forEach(doc => {
    const data = doc.data();
    const amount = data.amount || 0;
    calculatedBalance += amount;
    if (amount > 0) totalIncome += amount;
    else totalExpense += amount;
  });

  console.log(`📊 합산 결과:`);
  console.log(` - 총 획득: +${totalIncome}`);
  console.log(` - 총 소진: ${totalExpense}`);
  console.log(` - 계산된 잔고: ${calculatedBalance}`);

  if (userData.crystals !== calculatedBalance) {
    console.log(`⚠️ DB 잔고(${userData.crystals})와 불일치합니다. 수정을 시작합니다.`);
    if (!APPLY) {
      console.log("Dry run only. Re-run with --apply after manual audit to write this change.");
      return;
    }
    await db.collection('users').doc(uid).update({
      crystals: calculatedBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ 수정 완료!");
  } else {
    console.log("💎 DB 잔고가 이미 계산된 값과 일치합니다. (그럼 왜 0으로 보셨을까요? 브라우저 캐시 문제일 수 있습니다.)");
  }
}

const targetName = '왕새우king_shrimp';
repairUserCrystals(targetName).catch(console.error);
