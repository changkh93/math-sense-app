import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const regionId = 'reg_1776154036888';

async function validateGeneral() {
  const chapters = await db.collection('chapters').where('regionId', '==', regionId).get();
  console.log(`Total Chapters: ${chapters.size}`);
  chapters.forEach(doc => {
    console.log(` - ${doc.data().title} (${doc.id})`);
  });

  const units = await db.collection('units').where('chapterId', '>=', 'chap_').get();
  // Filtering for our specific chapters
  const ourChapters = chapters.docs.map(d => d.id);
  const ourUnits = units.docs.filter(u => ourChapters.includes(u.data().chapterId));
  
  console.log(`Total Units in Neverland Chapters: ${ourUnits.length}`);

  let totalQuizzes = 0;
  for (const unit of ourUnits) {
    const qSnapshot = await db.collection('quizzes').where('unitId', '==', unit.id).get();
    totalQuizzes += qSnapshot.size;
  }
  
  console.log(`Total Quizzes in Neverland Chapters: ${totalQuizzes}`);
}

validateGeneral().catch(console.error);
