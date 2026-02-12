import { db } from './src/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function scanInconsistencies() {
  console.log("--- Scanning for Unit/ID Inconsistencies ---");
  const snap = await getDocs(collection(db, 'quizzes'));
  let count = 0;
  
  snap.forEach(d => {
    const data = d.data();
    const docId = d.id;
    const unitId = data.unitId || "";
    
    // Check if ID starts with 6 but unit says fractions
    if (docId.startsWith('6-') && unitId.includes('fraction')) {
      console.log(`[INCONSISTENT] DocID: ${docId}, unitId: ${unitId}`);
      console.log(`Content: ${data.question.substring(0, 50)}...`);
      count++;
    }
    
    // Check if ID starts with 4 but unit says decimals
    if (docId.startsWith('4-') && unitId.includes('decimal')) {
      console.log(`[INCONSISTENT] DocID: ${docId}, unitId: ${unitId}`);
      console.log(`Content: ${data.question.substring(0, 50)}...`);
      count++;
    }

    // Search for specifically '6-4-19' content
    if (docId === '6-4-19') {
        console.log(`[FOUND 6-4-19] unitId: ${unitId}, Content: ${data.question}`);
    }
  });

  console.log(`\nScan complete. Total inconsistencies found: ${count}`);
  process.exit(0);
}

scanInconsistencies();
