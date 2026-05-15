import admin from 'firebase-admin';
import { readFileSync } from 'fs';
if (!process.argv.includes('--dangerously-apply-manual-compensation')) {
  throw new Error('Disabled one-off production compensation script. Use audited repair scripts instead.');
}
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const UID = 'QcTWXBe0lDct3Wz5sElZpq82s083'; // 윤태민

async function run() {
  await db.collection('users').doc(UID).set({
    helpCount: 15,
    questionCount: 5,
    crystals: 5200 // Compensation for the lost un-ledgered history crystals and stress
  }, { merge: true });
  console.log("Updated Yoon Taemin's HelpCount and Crystals");
  process.exit(0);
}
run();
