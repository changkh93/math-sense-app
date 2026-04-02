import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function run() {
  const agoraSnap = await db.collection('agora').get();
  let foundSomething = false;
  
  for (const doc of agoraSnap.docs) {
    const data = doc.data();
    if (data.authorName && data.authorName.includes('윤태민')) {
      console.log(`[QUESTION] ID=${doc.id} Author=${data.authorName} UID=${data.authorId}`);
      foundSomething = true;
    }
    
    // answers
    const ansSnap = await db.collection('agora').doc(doc.id).collection('answers').get();
    ansSnap.forEach(ans => {
      const aData = ans.data();
      if (aData.authorName && aData.authorName.includes('윤태민')) {
         console.log(`[ANSWER] in Question=${doc.id} Author=${aData.authorName} UID=${aData.authorId} accepted=${aData.isAccepted}`);
         foundSomething = true;
      }
    });
  }
  
  if (!foundSomething) console.log("No posts by 윤태민 found in Agora.");
  process.exit(0);
}
run();
