
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, where, query } from "firebase/firestore";

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

async function listRegions() {
  const clusters = ['cluster_elementary', 'python', 'middle-math', 'western-classic'];
  for (const cid of clusters) {
    const q = query(collection(db, 'regions'), where('clusterId', '==', cid));
    const snap = await getDocs(q);
    console.log(`--- Cluster: ${cid} ---`);
    snap.forEach(d => {
      console.log(`  Region Name: ${d.data().name} (${d.id})`);
    });
  }
}

listRegions();
