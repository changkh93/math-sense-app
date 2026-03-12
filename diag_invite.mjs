
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
  const targetCode = 'V8Z8M2LV';
  console.log(`Searching for inviteCode: [${targetCode}]`);
  
  const q = query(collection(db, 'clusters'), where('inviteCode', '==', targetCode));
  const snap = await getDocs(q);
  
  console.log(`Query "inviteCode == ${targetCode}" returned ${snap.size} docs.`);
  snap.forEach(d => {
    console.log(`- Found Doc ID: ${d.id}, Data:`, JSON.stringify(d.data()));
  });

  console.log("\nListing ALL clusters with inviteCode field:");
  const allSnap = await getDocs(collection(db, 'clusters'));
  allSnap.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id}, Name: ${data.name}, inviteCode: [${data.inviteCode}], isPrivate: ${data.isPrivate}`);
  });
}

diagnostic();
