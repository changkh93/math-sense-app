
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const unitId = "reg_1774390167801_chap_1774390176943_unit_1774390232739";

async function verifyUpdates() {
  console.log(`\n--- Verifying Updates for Unit: ${unitId} ---`);
  try {
    const snap = await db.collection('quizzes')
      .where('unitId', '==', unitId)
      .get();
    
    const quizzes = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => (a.order || 0) - (b.order || 0));

    console.log(`Found ${quizzes.length} quizzes.`);
    
    // Check first and last
    const first = quizzes[0];
    const last = quizzes[24];

    console.log(`\n[Quiz 1] ID: ${first.id}`);
    console.log(`Question: ${first.question?.substring(0, 50)}...`);
    console.log(`Hint preview: ${first.hint?.substring(0, 100)}...`);

    console.log(`\n[Quiz 25] ID: ${last.id}`);
    console.log(`Question: ${last.question?.substring(0, 50)}...`);
    console.log(`Hint preview: ${last.hint?.substring(0, 100)}...`);

  } catch (err) {
    console.error("Error verifying updates:", err.message);
  }
}

verifyUpdates();
