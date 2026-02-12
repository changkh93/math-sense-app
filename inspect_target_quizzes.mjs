
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "math-sense-1f6a8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectQuiz(quizId) {
  console.log(`\n--- Inspecting Quiz: ${quizId} ---`);
  try {
    const docRef = doc(db, "quizzes", quizId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Found in Firestore:");
      console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log("NOT found in Firestore.");
    }
  } catch (err) {
    console.error("Error fetching doc:", err.message);
  }
}

// User reports issue with "a : b" question, which is r1-2-3 in ratioChapter1Quizzes.js
// Also check others in that unit
const targets = ['r1-2-3', 'r1-2-6', 'r1-2-1', 'r1-2-2', 'r1-2-4', 'r1-2-5'];

for (const t of targets) {
  await inspectQuiz(t);
}
