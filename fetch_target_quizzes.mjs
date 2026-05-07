
import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const unitIds = [
  "reg_1774390167801_chap_1774390176943_unit_1774390232739", // 3학년 3월
  "reg_1774390167801_chap_1774390176943_unit_1777506227602", // 3학년 4월
  "reg_1774390167801_chap_1774390191809_unit_1774390258642", // 4학년 3월
  "reg_1774390167801_chap_1774390191809_unit_1777506257212", // 4학년 4월
  "reg_1774390167801_chap_1774390199371_unit_1774390267517", // 5학년 3월
  "reg_1774390167801_chap_1774390199371_unit_1777506265057", // 5학년 4월
  "reg_1774390167801_chap_1774390206639_unit_1774390276970", // 6학년 3월
  "reg_1774390167801_chap_1774390206639_unit_1777506272514", // 6학년 4월
  "reg_1774698354292_chap_1774698491426_unit_1777511572943", // 중1 4월
  "reg_1774698354292_chap_1774698491426_unit_1777511586294", // 중2 4월
  "reg_1774698354292_chap_1774698491426_unit_1777511596494"  // 중3 4월
];

async function fetchQuizzes() {
  const allQuizzes = {};
  
  for (const unitId of unitIds) {
    console.log(`Fetching quizzes for ${unitId}...`);
    const snap = await db.collection('quizzes')
      .where('unitId', '==', unitId)
      .get();
    
    allQuizzes[unitId] = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
    
    console.log(`Found ${snap.size} quizzes.`);
  }
  
  writeFileSync('target_quizzes.json', JSON.stringify(allQuizzes, null, 2));
  console.log('Saved to target_quizzes.json');
}

fetchQuizzes().catch(console.error);
