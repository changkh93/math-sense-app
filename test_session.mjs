import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const q = collectionGroup(db, 'learning_progress');
  const snap = await getDocs(q);
  const sessions = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.quizSession) {
      sessions.push({ path: doc.ref.path, quizSession: data.quizSession });
    }
  });
  console.log("Found sessions:", JSON.stringify(sessions.slice(-3), null, 2));
  process.exit(0);
}
main().catch(console.error);
