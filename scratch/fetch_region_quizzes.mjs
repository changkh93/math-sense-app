
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function getAllQuizzes() {
  const regionId = 'reg_1773407437227';
  
  // 1. Get Chapters
  const chaptersSnap = await getDocs(query(collection(db, 'chapters'), where('regionId', '==', regionId)));
  const chapterIds = chaptersSnap.docs.map(doc => doc.id);
  console.log(`Chapters found: ${chapterIds.length}`);

  if (chapterIds.length === 0) return;

  // 2. Get Units
  const units = [];
  for (const cid of chapterIds) {
    const snap = await getDocs(query(collection(db, 'units'), where('chapterId', '==', cid)));
    snap.docs.forEach(doc => units.push({ id: doc.id, name: doc.data().name }));
  }
  console.log(`Units found: ${units.length}`);

  // 3. Get Quizzes
  const quizzes = [];
  for (const unit of units) {
    const snap = await getDocs(query(collection(db, 'quizzes'), where('unitId', '==', unit.id)));
    snap.docs.forEach(doc => quizzes.push({ id: doc.id, ...doc.data() }));
  }
  console.log(`Quizzes found: ${quizzes.length}`);

  // Print first 5 quizzes as sample
  console.log("Sample Quizzes:", JSON.stringify(quizzes.slice(0, 5), null, 2));

  // Save to file for processing
  const fs = await import('fs');
  fs.writeFileSync('quizzes_data.json', JSON.stringify(quizzes, null, 2));
}

getAllQuizzes().catch(console.error);
