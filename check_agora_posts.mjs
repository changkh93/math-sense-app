import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function run() {
  const agoraSnap = await db.collection('agora').get();
  console.log("Total total agora questions:", agoraSnap.size);
  let totalAnswers = 0;
  for (const doc of agoraSnap.docs) {
    const ansSnap = await db.collection('agora').doc(doc.id).collection('answers').get();
    totalAnswers += ansSnap.size;
  }
  console.log("Total agora answers across all questions:", totalAnswers);
  process.exit(0);
}
run();
