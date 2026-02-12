import { db } from './src/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function finalAudit() {
  console.log("--- FINAL RELIABILITY AUDIT ---");
  const qSnap = await getDocs(collection(db, 'questions'));
  qSnap.forEach(d => {
    const title = d.data().quizContext?.quizTitle || "";
    if (title.includes("비")) {
      console.log(`Found Question: ${d.id} | Title: ${title}`);
    }
  });

  const uSnap = await getDocs(collection(db, 'users'));
  for (const u of uSnap.docs) {
    const hSnap = await getDocs(collection(db, 'users', u.id, 'history'));
    hSnap.forEach(hd => {
      const title = hd.data().unitTitle || "";
      if (title.includes("비")) {
        console.log(`Found History user ${u.id}: ${hd.id} | Title: ${title}`);
      }
    });
  }
  process.exit(0);
}
finalAudit();
