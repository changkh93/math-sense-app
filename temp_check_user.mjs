import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('users').limit(3).get();
  snap.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
run();
