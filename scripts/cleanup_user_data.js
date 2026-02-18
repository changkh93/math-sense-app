import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

async function finishCleanup() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const uid = "qQlPUj1vLge8KyGK7UmHmg6pMpE3";
  console.log(`Finishing cleanup for ${uid}...`);

  const historyRef = collection(db, 'users', uid, 'history');
  const hSnap = await getDocs(query(historyRef, orderBy('timestamp', 'desc')));
  const history = hSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Current items: ${history.length}`);

  const toDelete = [];
  const uniqueHistory = [];
  
  const sorted = [...history].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

  for (const entry of sorted) {
    let isDup = false;
    for (const unique of uniqueHistory) {
      const timeDiff = Math.abs((entry.timestamp?.seconds || 0) - (unique.timestamp?.seconds || 0));
      if (entry.unitId === unique.unitId && timeDiff < 60) { // Wider window to catch more
        isDup = true;
        break;
      }
    }
    if (isDup) toDelete.push(entry.id);
    else uniqueHistory.push(entry);
  }

  console.log(`Found ${toDelete.length} duplicates remaining.`);

  for (const tid of toDelete) {
    console.log(`Deleting: ${tid}`);
    await deleteDoc(doc(db, 'users', uid, 'history', tid));
  }

  console.log(`Left with ${uniqueHistory.length} unique records.`);
  
  // Final count sync
  await updateDoc(doc(db, 'users', uid), {
    totalQuizzes: uniqueHistory.length
  });

  console.log("SUCCESS.");
}

finishCleanup().catch(console.error);
