import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./.firebase_config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listChapters() {
  const regionId = 'reg_1773407437227';
  const chaptersRef = collection(db, 'regions', regionId, 'chapters');
  const q = query(chaptersRef);
  const querySnapshot = await getDocs(q);
  
  console.log(`Chapters in region ${regionId}:`);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, Title: ${data.title}`);
  });
}

listChapters().catch(console.error);
