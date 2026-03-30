
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  projectId: "math-sense-1f6a8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const unitId = "reg_1774390167801_chap_1774390176943_unit_1774390232739";

async function listQuizzes() {
  console.log(`\n--- Listing Quizzes for Unit: ${unitId} ---`);
  try {
    const q = query(
      collection(db, 'quizzes'), 
      where('unitId', '==', unitId),
      orderBy('order', 'asc')
    );
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} quizzes.`);
    
    const quizzes = snap.docs.map(doc => ({
      id: doc.id,
      order: doc.data().order,
      question: doc.data().question?.substring(0, 50) + "...",
      hint: doc.data().hint ? "EXISTS" : "MISSING"
    }));
    
    console.table(quizzes);
  } catch (err) {
    console.error("Error fetching quizzes:", err.message);
  }
}

listQuizzes();
