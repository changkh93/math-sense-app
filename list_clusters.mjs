
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, orderBy, query } from "firebase/firestore";

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

async function listClusters() {
  const q = query(collection(db, 'clusters'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  console.log("--- Clusters ---");
  snap.forEach(d => {
    console.log(`ID: ${d.id}, Name: ${d.data().name}, isPrivate: ${d.data().isPrivate}`);
  });
}

listClusters();
