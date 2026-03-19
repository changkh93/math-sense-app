import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function checkDuplicates() {
  const chaptersSnap = await db.collection('chapters').where('title', '==', '확률과 통계').get();
  console.log(`Found ${chaptersSnap.size} chapters with title '확률과 통계'`);
  chaptersSnap.docs.forEach(doc => {
    console.log(`- ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
  });
}

checkDuplicates().catch(console.error);
