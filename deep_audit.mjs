import { db } from './src/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

async function deepInspect() {
  console.log("--- Document 6-4-19 Inspection ---");
  const docRef = doc(db, 'quizzes', '6-4-19');
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    console.log("ID: 6-4-19");
    console.log("Data:", JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Document 6-4-19 NOT found by ID.");
  }

  console.log("\n--- Searching for any document with internal field id: '6-4-19' ---");
  const q = query(collection(db, 'quizzes'), where('id', '==', '6-4-19'));
  const qSnap = await getDocs(q);
  qSnap.forEach(d => {
    console.log("Path:", d.ref.path);
    console.log("Data:", JSON.stringify(d.data(), null, 2));
  });

  console.log("\n--- Searching for documents in Decimal Chapter 6 units ---");
  // Assuming unit IDs like chap6_unitX or dec_chap6_unitX based on regions.js
  // Let's check unitId starting with 'chap6'
  const q2 = query(collection(db, 'quizzes'), where('unitId', '>=', 'chap6'), where('unitId', '<=', 'chap6\uf8ff'));
  const qSnap2 = await getDocs(q2);
  console.log(`Found ${qSnap2.size} docs in chap6`);
  qSnap2.forEach(d => {
    if (d.id === '6-4-19' || d.data().id === '6-4-19') {
        console.log("Found 6-4-19 in chap6 scan:", d.id, d.data().unitId);
    }
  });

  process.exit(0);
}

deepInspect();
