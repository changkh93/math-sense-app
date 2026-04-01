import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-config-test.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(query(collection(db, "users"), limit(5)));
  console.log(snap.docs.map(d => ({id: d.id, ...d.data()})));
  process.exit(0);
}
run();
