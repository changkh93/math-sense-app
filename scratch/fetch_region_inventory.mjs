
import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fetchRegionQuizzes() {
  const regionId = 'reg_1773407437227';
  console.log(`Fetching quizzes for region: ${regionId}`);

  const chaptersSnap = await db.collection('chapters').where('regionId', '==', regionId).get();
  const chapterIds = chaptersSnap.docs.map(doc => doc.id);
  console.log(`Chapters found: ${chapterIds.length}`);

  const allQuizzes = [];
  const unitStats = [];

  for (const chapterId of chapterIds) {
    const unitsSnap = await db.collection('units').where('chapterId', '==', chapterId).get();
    for (const unitDoc of unitsSnap.docs) {
      const qSnap = await db.collection('quizzes').where('unitId', '==', unitDoc.id).get();
      unitStats.push({
        unitId: unitDoc.id,
        unitName: unitDoc.data().name,
        quizCount: qSnap.size
      });
      qSnap.forEach(d => {
        allQuizzes.push({
          id: d.id,
          unitId: unitDoc.id,
          unitName: unitDoc.data().name,
          ...d.data()
        });
      });
    }
  }

  console.log(`Total Units: ${unitStats.length}`);
  console.log(`Total Quizzes: ${allQuizzes.length}`);

  writeFileSync('region_quizzes_inventory.json', JSON.stringify({
    regionId,
    totalQuizzes: allQuizzes.length,
    unitStats,
    quizzes: allQuizzes
  }, null, 2));
}

fetchRegionQuizzes().catch(console.error);
