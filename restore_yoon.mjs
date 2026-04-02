import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const UID = 'QcTWXBe0lDct3Wz5sElZpq82s083';

async function run() {
  console.log("=== STARTING RESTORATION INVESTIGATION ===");

  // 1. Calculate History Stats
  const histSnap = await db.collection('users').doc(UID).collection('history').get();
  let totalQuizzes = 0, totalScore = 0, perfectCount = 0;
  histSnap.forEach(d => {
    const data = d.data();
    totalQuizzes++;
    totalScore += (data.score || 0);
    if (data.score === 100) perfectCount++;
  });
  const avgScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
  console.log("History -> Quizzes:", totalQuizzes, "Score:", totalScore, "Avg:", avgScore, "Perfect:", perfectCount);

  // 2. Count HelpCount in Agora
  const agoraSnap = await db.collection('agora').get();
  let myQuestions = 0;
  let myAnswers = 0;
  let myAcceptedAnswers = 0;
  let myHelpCount = 0;

  for (const doc of agoraSnap.docs) {
    const data = doc.data();
    if (data.authorId === UID) myQuestions++;
    
    // Check answers subcollection
    const answersSnap = await db.collection('agora').doc(doc.id).collection('answers').get();
    answersSnap.forEach(ansDoc => {
      const ansData = ansDoc.data();
      if (ansData.authorId === UID) {
        myAnswers++;
        if (ansData.isAccepted) {
          myAcceptedAnswers++;
          myHelpCount++; // Often helpCount corresponds to accepted answers
        }
        if (ansData.isTeacherVerified) {
             myHelpCount++;
        }
      }
    });

    if (data.resolvedBy === UID) myHelpCount++;
  }
  console.log(`Agora -> Questions: ${myQuestions}, Answers: ${myAnswers}, Accepted: ${myAcceptedAnswers}, helpCount roughly: ${myHelpCount}`);

  // 3. Find missing crystals. Before it was 3000+, now 2005.
  // Wait, did we miss `crystal_ledger` vs `crystal_transactions`?
  // Let's check `repair_crystals.mjs` to see how crystals were previously audited.
  process.exit(0);
}
run();
