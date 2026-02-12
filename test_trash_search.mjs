
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkTrash() {
  console.log("Searching for '분해하는' or '분해' in questions...");
  const qSnap = await getDocs(collection(db, 'questions'));
  let foundQ = 0;
  qSnap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data);
    if (str.includes("분해")) {
      console.log(`[QUESTION] Found in questions/${doc.id}:`, data.quizContext?.quizTitle || data.content);
      foundQ++;
    }
  });

  console.log(`\nFound ${foundQ} matches in questions.`);

  console.log("\nSearching in user history...");
  const usersSnap = await getDocs(collection(db, 'users'));
  let foundH = 0;
  for (const userDoc of usersSnap.docs) {
    const historySnap = await getDocs(collection(db, 'users', userDoc.id, 'history'));
    historySnap.forEach(hd => {
      const hData = hd.data();
      const str = JSON.stringify(hData);
      if (str.includes("분해")) {
        console.log(`[HISTORY] Found in users/${userDoc.id}/history/${hd.id}:`, hData.unitTitle);
        foundH++;
      }
    });
  }
  console.log(`\nFound ${foundH} matches in history.`);
}

checkTrash().catch(console.error);
