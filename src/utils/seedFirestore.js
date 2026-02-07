import { db } from '../firebase.js';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { regions } from '../data/regions.js';
import { chapter1Quizzes } from '../data/chapter1Quizzes.js';
import { chapter2Quizzes } from '../data/chapter2Quizzes.js';
import { chapter3Quizzes } from '../data/chapter3Quizzes.js';
import { chapter4Quizzes } from '../data/chapter4Quizzes.js';
import { chapter5Quizzes } from '../data/chapter5Quizzes.js';
import { decimalChapter2Quizzes } from '../data/decimalChapter2Quizzes.js';

import { ratioChapter1Quizzes } from '../data/ratioChapter1Quizzes.js';
import { ratioChapter2Quizzes } from '../data/ratioChapter2Quizzes.js';
import { ratioChapter3Quizzes } from '../data/ratioChapter3Quizzes.js';
import { ratioChapter4Quizzes } from '../data/ratioChapter4Quizzes.js';
import { divisionQuizzes } from '../data/divisionQuizzes.js';

// Mapping chapters to their quiz data files
const quizDataMapping = {
  'chap1': chapter1Quizzes,
  'chap2': chapter2Quizzes,
  'chap3': chapter3Quizzes,
  'chap4': chapter4Quizzes,
  'chap5': chapter5Quizzes,
  'chap6': decimalChapter2Quizzes,
  'ratio_chap1': ratioChapter1Quizzes,
  'ratio_chap2': ratioChapter2Quizzes,
  'ratio_chap3': ratioChapter3Quizzes,
  'ratio_chap4': ratioChapter4Quizzes,
  'div_chap1': divisionQuizzes,
};

export const seedFirestore = async () => {
  console.log("Starting Seeding Process...");
  const batch = writeBatch(db);
  let operationCount = 0;
  const BATCH_LIMIT = 450; // Firestore batch limit is 500

  const commitBatch = async () => {
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed batch of ${operationCount} operations.`);
      operationCount = 0;
      // Re-instantiate batch after commit? No, writeBatch returns a new one? 
      // Actually writeBatch() creates a new batch instance. We need to create a new one.
    }
  };
  
  // Helper to safely add to batch and commit if full
  // Note: Since we can't easily reassign 'batch' inside this closure without returning it, 
  // we will execute in chunks or just use loop logic.
  // Exception: writeBatch() creates a NEW batch. We should manage valid batches.
  // Simplified strategy: We will just run separate setDoc calls for simplicity in this script, 
  // OR we manage chunks. Given the data size (~2 chapters * 10 units * 15 questions = 300 docs), 
  // one batch might fit, or we split.
  // Let's use individual setDoc for reliability in this script unless thousands of items.
  // Actually, let's use batching for performance but handle the limit.
  
  // We will process recursively or iteratively and fire batches.
  
  const allOperations = []; // Array of { ref, data }

  // 1. Regions
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const regionId = region.id;
    
    // Region Doc
    allOperations.push({
      ref: doc(db, 'regions', regionId),
      data: {
        id: regionId,
        title: region.title,
        description: region.description || '',
        icon: region.icon || '',
        color: region.color || '#000000',
        pdf: region.pdf || '',
        image: region.image || '',
        order: i
      }
    });

    // 2. Chapters
    if (region.chapters) {
      for (let j = 0; j < region.chapters.length; j++) {
        const chapter = region.chapters[j];
        // Unique ID for chapter: regionId_chapterId
        const chapterDocId = `${regionId}_${chapter.id}`;
        
        allOperations.push({
          ref: doc(db, 'chapters', chapterDocId),
          data: {
            id: chapter.id,
            regionId: regionId,
            title: chapter.title,
            order: j
          }
        });

        // 3. Units
        if (chapter.units) {
          const quizDataSource = quizDataMapping[chapter.id];
          
          for (let k = 0; k < chapter.units.length; k++) {
            const unit = chapter.units[k];
            // Unique ID for unit: chapterDocId_unitId
            const unitDocId = `${chapterDocId}_${unit.id}`;
            
            allOperations.push({
              ref: doc(db, 'units', unitDocId),
              data: {
                id: unit.id,
                chapterId: chapterDocId,
                title: unit.title,
                order: k
              }
            });

            // 4. Quizzes
            if (quizDataSource && quizDataSource[unit.id]) {
              const unitData = quizDataSource[unit.id];
              const questions = unitData.questions || [];
              
              for (let q = 0; q < questions.length; q++) {
                const question = questions[q];
                // Unique ID for quiz
                // The current IDs are like '1-1-1', which might be unique enough, 
                // but let's prefix to be sure or just use the ID if it's unique.
                // Let's use the provided ID as the doc ID.
                const quizDocId = question.id;
                
                // Convert options to [{text, isCorrect}]
                const newOptions = (question.options || []).map(opt => ({
                  text: opt,
                  isCorrect: opt === question.answer
                }));

                allOperations.push({
                  ref: doc(db, 'quizzes', quizDocId),
                  data: {
                    id: question.id,
                    unitId: unitDocId,
                    question: question.question,
                    options: newOptions,
                    answer: question.answer, // Keep legacy just in case
                    hint: question.hint || question.explanation || '',
                    imageUrl: question.imageUrl || '',
                    type: question.type || (question.imageUrl ? 'image' : 'single'),
                    layout: question.imageUrl ? 'image-top' : 'text', // Keep layout default if not specified

                    points: 1,
                    order: q
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  // Execute Batches
  console.log(`Total operations to perform: ${allOperations.length}`);
  
  for (let i = 0; i < allOperations.length; i += BATCH_LIMIT) {
    const chunk = allOperations.slice(i, i + BATCH_LIMIT);
    const newBatch = writeBatch(db);
    
    chunk.forEach(op => {
      newBatch.set(op.ref, op.data);
    });
    
    await newBatch.commit();
    console.log(`Committed batch ${i / BATCH_LIMIT + 1}`);
  }
  
  console.log("Seeding Complete!");
  alert("Data Migration Complete! Check Firestore Console.");
};
