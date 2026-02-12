import { db } from './src/firebase.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { regions } from './src/data/regions.js';
import { chapter1Quizzes } from './src/data/chapter1Quizzes.js';
import { chapter2Quizzes } from './src/data/chapter2Quizzes.js';
import { chapter3Quizzes } from './src/data/chapter3Quizzes.js';
import { chapter4Quizzes } from './src/data/chapter4Quizzes.js';
import { chapter5Quizzes } from './src/data/chapter5Quizzes.js';
import { chapter6Quizzes } from './src/data/chapter6Quizzes.js';
import { ratioChapter1Quizzes } from './src/data/ratioChapter1Quizzes.js';
import { ratioChapter2Quizzes } from './src/data/ratioChapter2Quizzes.js';
import { ratioChapter3Quizzes } from './src/data/ratioChapter3Quizzes.js';
import { ratioChapter4Quizzes } from './src/data/ratioChapter4Quizzes.js';
import * as divisionData from './src/data/divisionQuizzes.js';
import * as multiplicationData from './src/data/multiplicationQuizzes.js';
import * as additionData from './src/data/additionQuizzes.js';

const quizDataMapping = {
  'chap1': chapter1Quizzes,
  'chap2': chapter2Quizzes,
  'chap3': chapter3Quizzes,
  'chap4': chapter4Quizzes,
  'chap5': chapter5Quizzes,
  'chap6': chapter6Quizzes,
  'ratio_chap1': ratioChapter1Quizzes,
  'ratio_chap2': ratioChapter2Quizzes,
  'ratio_chap3': ratioChapter3Quizzes,
  'ratio_chap4': ratioChapter4Quizzes,
  'div_chap1': divisionData.divisionChapterdiv_1Quizzes,
  'mul_chap1': multiplicationData.multiplicationChaptermul_1Quizzes,
  'mul_chap2': multiplicationData.multiplicationChaptermul_2Quizzes,
  'mul_chap3': multiplicationData.multiplicationChaptermul_3Quizzes,
  'add_chap1': additionData.additionChapteradd_1Quizzes,
  'add_chap2': additionData.additionChapteradd_2Quizzes,
  'add_chap3': additionData.additionChapteradd_3Quizzes,
};

async function executeMigration() {
  console.log("--- MIGRATION: TOTAL PURGE & RESEED ---");
  
  // 1. PURGE QUIZZES
  console.log("[1/3] Purging quizzes...");
  const qSnap = await getDocs(collection(db, 'quizzes'));
  let deletedCount = 0;
  const docs = qSnap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
    await batch.commit();
    deletedCount += Math.min(500, docs.length - i);
    console.log(`Purged ${deletedCount}/${docs.length}`);
  }

  // 2. RESEED
  console.log("[2/3] Reseeding from local data...");
  let createdCount = 0;
  for (const region of regions) {
    for (const chapter of (region.chapters || [])) {
      const chapterDocId = `${region.id}_${chapter.id}`;
      const quizDataSource = quizDataMapping[chapter.id];
      
      for (const unit of (chapter.units || [])) {
        const unitDocId = `${chapterDocId}_${unit.id}`;
        if (quizDataSource && quizDataSource[unit.id]) {
          const questions = quizDataSource[unit.id].questions || [];
          const batch = writeBatch(db);
          questions.forEach((q, idx) => {
            const options = (q.options || []).map(opt => ({
              text: opt,
              isCorrect: opt === q.answer
            }));
            batch.set(doc(db, 'quizzes', q.id), {
              id: q.id,
              unitId: unitDocId,
              question: q.question,
              options: options,
              answer: q.answer,
              hint: q.hint || q.explanation || '',
              imageUrl: q.imageUrl || '',
              type: q.type || (q.imageUrl ? 'image' : 'single'),
              layout: q.imageUrl ? 'image-top' : 'text',
              points: 1,
              order: idx
            });
            createdCount++;
          });
          await batch.commit();
          console.log(`Seeded unit: ${unitDocId} (${questions.length} questions)`);
        }
      }
    }
  }

  console.log(`[3/3] Migration Complete. Deleted: ${deletedCount}, Created: ${createdCount}`);
  process.exit(0);
}

executeMigration();
