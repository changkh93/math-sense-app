import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
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
  console.log("Found Active Quiz Sessions:", JSON.stringify(sessions.slice(-5), null, 2));
  process.exit(0);
}
main().catch(console.error);
