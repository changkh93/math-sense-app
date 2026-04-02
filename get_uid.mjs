import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

(async () => {
  const snap = await db.collection('users').where('email', '==', 'fishgot11@gmail.com').get();
  snap.forEach(doc => console.log("UID:", doc.id));
  process.exit(0);
})();
