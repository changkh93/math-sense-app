import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

// 1. Initialize Firebase Admin
let credential;
if (existsSync('./service-account.json')) {
  const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  credential = admin.credential.cert(serviceAccount);
} else if (existsSync('./serviceAccountKey.json')) {
  const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
  credential = admin.credential.cert(serviceAccount);
} else {
  console.error('❌ service-account.json not found.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();
const QUIZ_FILE = './scratch/nobel_quizzes_all.json';
const REGION_ID = 'reg_1776240768916'; // 성인 독자를 위한 노벨 문학상 수상작

async function migrate() {
  if (!existsSync(QUIZ_FILE)) {
    console.error(`❌ Quiz file ${QUIZ_FILE} not found.`);
    return;
  }

  const allData = JSON.parse(readFileSync(QUIZ_FILE, 'utf8'));
  const entries = Object.entries(allData);

  console.log(`🚀 Starting migration of ${entries.length} authors to Firestore...`);

  for (const [key, data] of entries) {
    const { author, year, work, chapterId, quizzes } = data;
    
    // Create a stable unitId
    // Format: regId_chapId_unit_year_author (normalized)
    const normalizedAuthor = author.replace(/\s+/g, '').replace(/[^\w\uAC00-\uD7AF]/g, '');
    const unitId = `${REGION_ID}_${chapterId}_unit_${year}_${normalizedAuthor}`;

    console.log(`📦 Migrating: ${author} (${year}) -> ${unitId}`);

    // 1. Create/Update Unit
    const unitRef = db.collection('units').doc(unitId);
    await unitRef.set({
      id: unitId,
      docId: unitId,
      regionId: REGION_ID,
      chapterId: chapterId,
      title: `${author} - 『${work}』`,
      author: author,
      year: year,
      order: year, // Use year as order for chronological sort within chapter
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Add Quizzes in Batches
    const batch = db.batch();
    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      const quizId = `${unitId}_q${i + 1}`;
      
      const quizData = {
        id: quizId,
        docId: quizId,
        unitId: unitId,
        category: q.category || 'A',
        question: q.question,
        options: q.options.map(opt => ({
          text: opt,
          isCorrect: opt === q.answer
        })),
        answer: q.answer,
        hint: q.explanation || "", // Using explanation as hint for adult readers
        explanation: q.explanation || "",
        score: 1,
        order: (i + 1) * 10,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(db.collection('quizzes').doc(quizId), quizData);
    }
    
    await batch.commit();
    console.log(`   ✅ ${quizzes.length} quizzes migrated.`);
  }

  console.log("\n🎉 Migration Complete!");
}

migrate().catch(console.error);
