
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function applyBatchUpdates(batchFilePath) {
  console.log(`Applying updates from: ${batchFilePath}`);
  const updates = JSON.parse(readFileSync(batchFilePath, 'utf8'));
  
  const batch = db.batch();
  let count = 0;

  for (const update of updates) {
    const docRef = db.collection('quizzes').doc(update.id);
    batch.update(docRef, {
      hint: update.hint,
      explanation: update.explanation,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    count++;
  }

  await batch.commit();
  console.log(`Successfully updated ${count} quizzes.`);
}

const fileToProcess = process.argv[2] || 'scratch/batch_1_updates.json';
applyBatchUpdates(fileToProcess).catch(console.error);
