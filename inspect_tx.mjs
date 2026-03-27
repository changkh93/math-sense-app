import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";

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

const uid = "MoRe5TNbmpNq2gs0bH191LbQOif1"; // Standard test user

async function inspect() {
  console.log(`\n--- Inspecting Transactions for User: ${uid} ---`);
  const txRef = collection(db, "users", uid, "crystal_transactions");
  const q = query(txRef, orderBy("timestamp", "desc"), limit(10));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`Type: ${data.type}`);
    console.log(`Desc: ${data.description}`);
    console.log(`Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : 'no-ts'}`);
    console.log(`Metadata: ${JSON.stringify(data.metadata || {}, null, 2)}`);
  });
}

inspect();
