
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const unitId = "reg_1774390167801_chap_1774390199371_unit_1774390267517";

async function listQuizzes() {
  console.log(`\n--- Listing Quizzes for Unit: ${unitId} ---`);
  try {
    const snap = await db.collection('quizzes')
      .where('unitId', '==', unitId)
      .get();
    
    console.log(`Found ${snap.size} quizzes.`);
    
    const quizzes = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
    
    quizzes.forEach((q, idx) => {
      console.log(`${idx + 1}. [Order: ${q.order || 'N/A'}] [ID: ${q.id}] ${q.question?.substring(0, 50).replace(/\n/g, ' ')}...`);
    });
  } catch (err) {
    console.error("Error fetching quizzes:", err.message);
  }
}

listQuizzes();
