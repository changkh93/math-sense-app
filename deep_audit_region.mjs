import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function deepAudit() {
  const regionId = 'reg_1773407437227';
  console.log(`Deep auditing region: ${regionId}`);
  
  const chaptersSnapshot = await db.collection('regions').doc(regionId).collection('chapters').get();
  if (chaptersSnapshot.empty) {
    console.log('No chapters found.');
  } else {
    chaptersSnapshot.forEach(doc => {
      console.log(`Chapter ID: ${doc.id}, Title: ${doc.data().title}`);
    });
  }
}

deepAudit().catch(console.error);
