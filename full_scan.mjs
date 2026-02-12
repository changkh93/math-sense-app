
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = { projectId: "math-sense-1f6a8" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function scanForContamination() {
  console.log("Starting Full Scrutiny Scan...");
  const quizzesSnap = await getDocs(collection(db, "quizzes"));
  console.log(`Scanning ${quizzesSnap.size} quizzes...`);

  const results = [];
  quizzesSnap.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    
    // Check for "에이", "비", "분해하는" etc.
    const optionsStr = JSON.stringify(data.options || []);
    const questionStr = data.question || "";
    
    if (
      optionsStr.includes("에이") || 
      optionsStr.includes("비") || 
      questionStr.includes("에이") || 
      questionStr.includes("비") ||
      questionStr.includes("분해하는")
    ) {
      // Filter out legitimate "비" (Ratio) mentions if possible, 
      // but "에이" and "비" alone in options are highly suspicious.
      const reflectsTrash = optionsStr.includes("에이") || questionStr.includes("분해하는");
      
      if (reflectsTrash) {
         results.push({ id, unitId: data.unitId, question: data.question });
      }
    }
  });

  console.log(`\nFound ${results.length} contaminated documents:`);
  console.log(JSON.stringify(results, null, 2));
}

scanForContamination();
