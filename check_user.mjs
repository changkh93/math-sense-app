import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, getDoc, doc, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnostic() {
  const q = query(collection(db, 'users'), where('displayName', '==', '윤태민'));
  const snap = await getDocs(q);
  
  for (const d of snap.docs) {
    console.log(`- User ID: ${d.id}, Name: ${d.data().displayName}`);
    console.log(`- lastStreakDate: ${d.data().lastStreakDate}`);
    console.log(`- currentStreak: ${d.data().currentStreak}`);
    console.log(`- streakFreezeCount: ${d.data().streakFreezeCount}`);
    
    // Fetch some recent history
    const hQ = query(
      collection(db, 'users', d.id, 'history'),
      orderBy('timestamp', 'desc')
    );
    const hSnap = await getDocs(hQ);
    console.log("Recent History:");
    hSnap.docs.slice(0, 10).forEach(h => {
        const histData = h.data();
        let dateObjStr = "N/A";
        if (histData.timestamp) {
            dateObjStr = histData.timestamp.toDate().toISOString();
        }
        console.log(`  - ${dateObjStr}: ${histData.type || 'quiz'}, score: ${histData.score}, crystals: ${histData.crystalsEarned}`);
    });
    
    // Fetch transactions
    const tQ = query(
      collection(db, 'users', d.id, 'crystal_transactions'),
      orderBy('timestamp', 'desc')
    );
    const tSnap = await getDocs(tQ);
    console.log("Recent Transactions:");
    tSnap.docs.slice(0, 10).forEach(t => {
        const tData = t.data();
        let dateObjStr = "N/A";
        if (tData.timestamp) {
            dateObjStr = tData.timestamp.toDate().toISOString();
        }
        console.log(`  - ${dateObjStr}: ${tData.type}, amount: ${tData.amount}, metadata:`, tData.metadata);
    });
  }
}

diagnostic().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
