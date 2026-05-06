
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
  "reg_1774390167801_chap_1774390176943_unit_1774390232739",
  "reg_1774390167801_chap_1774390191809_unit_1774390258642",
  "reg_1774390167801_chap_1774390199371_unit_1774390267517",
  "reg_1774390167801_chap_1774390206639_unit_1774390276970"
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
