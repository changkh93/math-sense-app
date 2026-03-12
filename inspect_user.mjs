
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";

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

const uid = "MoRe5TNbmpNq2gs0bH191LbQOif1";

async function inspect() {
  console.log(`--- Inspecting User: ${uid} ---`);
  
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    console.log("User not found");
    return;
  }
  const userData = userSnap.data();
  console.log("User Data:", JSON.stringify(userData, null, 2));
  console.log("\nCluster Access:", JSON.stringify(userData.clusterAccess || {}, null, 2));
}

inspect();
