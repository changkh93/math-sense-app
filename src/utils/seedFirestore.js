import { db } from '../firebase.js';
import { doc, setDoc, writeBatch, query, where, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { regions } from '../data/regions.js';
import { chapter1Quizzes } from '../data/chapter1Quizzes.js';
import { chapter2Quizzes } from '../data/chapter2Quizzes.js';
import { chapter3Quizzes } from '../data/chapter3Quizzes.js';
import { chapter4Quizzes } from '../data/chapter4Quizzes.js';
import { chapter5Quizzes } from '../data/chapter5Quizzes.js';
import { chapter6Quizzes } from '../data/chapter6Quizzes.js';

import { ratioChapter1Quizzes } from '../data/ratioChapter1Quizzes.js';
import { ratioChapter2Quizzes } from '../data/ratioChapter2Quizzes.js';
import { ratioChapter3Quizzes } from '../data/ratioChapter3Quizzes.js';
import { ratioChapter4Quizzes } from '../data/ratioChapter4Quizzes.js';
import * as divisionData from '../data/divisionQuizzes.js';
import * as multiplicationData from '../data/multiplicationQuizzes.js';
import * as additionData from '../data/additionQuizzes.js';

// Mapping chapters to their quiz data files
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

export const seedFirestore = async (targetRegionId = null, fullPurge = false) => {
  if (targetRegionId) {
    console.log(`[SEED] Starting Seeding Process for Region: ${targetRegionId}...`);
  } else {
    console.log("[SEED] Starting Seeding Process for ALL Regions...");
  }

  if (fullPurge) {
    console.log("[SEED] FULL PURGE MODE ENABLED. Wiping 'quizzes' collection...");
    const qSnapshot = await getDocs(collection(db, 'quizzes'));
    const totalQuizzes = qSnapshot.size;
    
    // Process in batches of 500
    let deletedCount = 0;
    const batchSize = 500;
    const docs = qSnapshot.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + batchSize);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletedCount += chunk.length;
      console.log(`[SEED] Purged ${deletedCount}/${totalQuizzes} quizzes...`);
    }
    console.log("[SEED] Full purge complete.");
  }
  
  let totalDocsCreated = 0;
  let totalDocsDeleted = 0;

  // 1. Regions
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const regionId = region.id;
    
    if (targetRegionId && regionId !== targetRegionId) continue;
    
    console.log(`[SEED] Processing Region: ${regionId} (${region.title})`);
    
    // Region Doc
    await setDoc(doc(db, 'regions', regionId), {
      id: regionId,
      title: region.title,
      description: region.description || '',
      icon: region.icon || '',
      color: region.color || '#000000',
      pdf: region.pdf || '',
      image: region.image || '',
      order: i
    }, { merge: true });
    totalDocsCreated++;

    // 2. Chapters
    if (region.chapters) {
      for (let j = 0; j < region.chapters.length; j++) {
        const chapter = region.chapters[j];
        const chapterDocId = `${regionId}_${chapter.id}`;
        
        await setDoc(doc(db, 'chapters', chapterDocId), {
          id: chapter.id,
          regionId: regionId,
          title: chapter.title,
          order: j
        }, { merge: true });
        totalDocsCreated++;

        // 3. Units
        if (chapter.units) {
          const quizDataSource = quizDataMapping[chapter.id];
          
          for (let k = 0; k < chapter.units.length; k++) {
            const unit = chapter.units[k];
            const unitDocId = `${chapterDocId}_${unit.id}`;
            
            await setDoc(doc(db, 'units', unitDocId), {
              id: unit.id,
              chapterId: chapterDocId,
              title: unit.title,
              order: k
            }, { merge: true });
            totalDocsCreated++;

            // 4. Quizzes - GHOST DOCUMENT PURGE logic
            if (quizDataSource && quizDataSource[unit.id]) {
              // A. Delete existing quizzes for this unit (Purge Ghost Documents)
              console.log(`[SEED] Purging existing quizzes for unit: ${unitDocId}`);
              const qQuery = query(collection(db, 'quizzes'), where('unitId', '==', unitDocId));
              const existingDocs = await getDocs(qQuery);
              
              if (!existingDocs.empty) {
                const deleteBatch = writeBatch(db);
                existingDocs.forEach((d) => {
                  deleteBatch.delete(d.ref);
                  totalDocsDeleted++;
                });
                await deleteBatch.commit();
                console.log(`[SEED] Deleted ${existingDocs.size} existing quiz documents.`);
              }

              // B. Insert new quizzes
              const unitData = quizDataSource[unit.id];
              const questions = unitData.questions || [];
              
              if (questions.length > 0) {
                const insertBatch = writeBatch(db);
                for (let q = 0; q < questions.length; q++) {
                  const question = questions[q];
                  const quizDocId = question.id;
                  
                  const newOptions = (question.options || []).map(opt => ({
                    text: opt,
                    isCorrect: opt === question.answer
                  }));

                  insertBatch.set(doc(db, 'quizzes', quizDocId), {
                    id: question.id,
                    unitId: unitDocId,
                    question: question.question,
                    options: newOptions,
                    answer: question.answer,
                    hint: question.hint || question.explanation || '',
                    imageUrl: question.imageUrl || '',
                    type: question.type || (question.imageUrl ? 'image' : 'single'),
                    layout: question.imageUrl ? 'image-top' : 'text',
                    points: 1,
                    order: q
                  });
                  totalDocsCreated++;
                }
                await insertBatch.commit();
                console.log(`[SEED] Inserted ${questions.length} new quiz documents for ${unitDocId}.`);
              }
            }
          }
        }
      }
    }
  }
  
  console.log(`[SEED] Seeding Complete! Created/Updated: ${totalDocsCreated}, Deleted: ${totalDocsDeleted}`);
  alert(`Data Migration Complete!\nCreated/Updated: ${totalDocsCreated}\nDeleted (Purged): ${totalDocsDeleted}\nCheck Firestore Console.`);
};

