import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

async function verify() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const uid = "qQlPUj1vLge8KyGK7UmHmg6pMpE3";
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.data();

  console.log(`User Verification:`);
  console.log(`- Nickname: ${userData.displayName || userData.userName || userData.nickname}`);
  console.log(`- Crystals: ${userData.crystals}`);
  console.log(`- Total Quizzes: ${userData.totalQuizzes}`);
  console.log(`- Growth: Daily=${userData.dailyGrowth}, Weekly=${userData.weeklyGrowth}`);

  const hSnap = await getDocs(collection(db, 'users', uid, 'history'));
  console.log(`- Remaining History Records: ${hSnap.size}`);
}

verify().catch(console.error);
