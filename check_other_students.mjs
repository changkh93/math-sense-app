import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkUsers() {
  const targetNames = ["이채희", "Logan Lee", "박지유", "성하린", "2으늉"];
  const usersSnap = await db.collection('users').get();
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.name && targetNames.some(target => data.name.includes(target) || data.name.toLowerCase().includes(target.toLowerCase()))) {
      console.log(`\n=== Checking: ${data.name} (${data.email}) ===`);
      console.log(`Current Total Quizzes: ${data.totalQuizzes || 0}`);
      console.log(`Current Crystals: ${data.crystals || 0}`);
      
      const histSnap = await db.collection('users').doc(doc.id).collection('history').get();
      let actualQuizzes = 0;
      histSnap.forEach(() => actualQuizzes++);
      
      console.log(`History Subcollection Quizzes: ${actualQuizzes}`);
      
      if ((data.totalQuizzes || 0) === 0 && actualQuizzes > 0) {
         console.log("⚠️ WARNING: This user also has reset stats (totalQuizzes=0 but has history)!");
      } else {
         console.log("✅ OK: Stats seem fine.");
      }
    }
  }
}

checkUsers().then(() => process.exit(0));
