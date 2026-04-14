import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const unitId = "reg_1774390167801_chap_1774390176943_unit_1774390232739";

async function inspectQuizSchema() {
  const snap = await db.collection('quizzes')
    .where('unitId', '==', unitId)
    .limit(1)
    .get();
  
  if (snap.empty) {
    console.log('No quizzes found.');
    return;
  }
  
  console.log('Quiz Schema:', JSON.stringify(snap.docs[0].data(), null, 2));
}

inspectQuizSchema().catch(console.error);
