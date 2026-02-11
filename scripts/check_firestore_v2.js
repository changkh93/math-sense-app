import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log('--- Starting Firestore Audit ---');
  const unitsSnap = await getDocs(collection(db, 'units'));
  console.log('Found', unitsSnap.size, 'units in Firestore');
  
  for (const unitDoc of unitsSnap.docs) {
    const unitData = unitDoc.data();
    const quizSnap = await getDocs(query(collection(db, 'quizzes'), where('unitId', '==', unitDoc.id)));
    if (quizSnap.size > 0 && quizSnap.size !== 20) {
      console.log(`Unit [${unitDoc.id}] "${unitData.title}" has ${quizSnap.size} questions`);
    } else if (quizSnap.size === 0) {
      console.log(`Unit [${unitDoc.id}] "${unitData.title}" has 0 questions (HANG RISK)`);
    }
  }
  console.log('--- Audit Complete ---');
}

check().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
