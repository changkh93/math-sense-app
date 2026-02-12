import { db } from './src/firebase.js';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
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

const curriculumTitles = new Map();
regions.forEach(region => {
  region.chapters?.forEach(chapter => {
    const chapterDocId = `${region.id}_${chapter.id}`;
    curriculumTitles.set(chapterDocId, chapter.title);
    chapter.units?.forEach(unit => {
      const unitDocId = `${chapterDocId}_${unit.id}`;
      curriculumTitles.set(unitDocId, unit.title);
    });
  });
});

async function runStandaloneScrub() {
  console.log("--- STANDALONE HISTORY & COMMUNITY SCRUBBER ---");
  let fixedCount = 0;

  // 1. Scrub Questions
  console.log("[1/2] Scrubbing community questions...");
  const questionsSnap = await getDocs(collection(db, 'questions'));
  for (const qDoc of questionsSnap.docs) {
    const data = qDoc.data();
    const savedTitle = data.quizContext?.quizTitle;
    const unitId = data.quizContext?.unitId;
    const correctTitle = curriculumTitles.get(unitId);

    if (savedTitle && (savedTitle.includes('분해하는') || savedTitle.includes('No stroke found') || (correctTitle && savedTitle !== correctTitle))) {
      console.log(`Fixing Question ${qDoc.id}: ${savedTitle} -> ${correctTitle || 'Unknown'}`);
      await setDoc(doc(db, 'questions', qDoc.id), {
        quizContext: { ...data.quizContext, quizTitle: correctTitle || savedTitle }
      }, { merge: true });
      fixedCount++;
    }
  }

  // 2. Scrub User History
  console.log("[2/2] Scrubbing user history records...");
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnap.docs) {
    const historySnap = await getDocs(collection(db, 'users', userDoc.id, 'history'));
    for (const hDoc of historySnap.docs) {
      const hData = hDoc.data();
      const savedTitle = hData.unitTitle;
      const unitId = hData.unitId;
      const correctTitle = curriculumTitles.get(unitId);

      if (savedTitle && (savedTitle.includes('분해하는') || savedTitle.includes('No stroke found') || (correctTitle && savedTitle !== correctTitle))) {
        console.log(`Fixing History for user ${userDoc.id}: ${savedTitle} -> ${correctTitle || 'Unknown'}`);
        await setDoc(doc(db, 'users', userDoc.id, 'history', hDoc.id), {
          unitTitle: correctTitle || savedTitle
        }, { merge: true });
        fixedCount++;
      }
    }
  }

  console.log(`Scrubbing complete. Fixed ${fixedCount} records.`);
  process.exit(0);
}

runStandaloneScrub();
