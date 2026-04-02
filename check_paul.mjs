import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function run() {
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => {
    if (doc.data().email === 'paul@dulcine.net') {
      console.log(doc.data());
    }
  });
  process.exit(0);
}
run();
