import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function listTopLevelChapters() {
  console.log('Listing top-level chapters...');
  const snapshot = await db.collection('chapters').get();
  if (snapshot.empty) {
    console.log('No top-level chapters found.');
  } else {
    snapshot.forEach(doc => {
      console.log(`ID: ${doc.id}, Title: ${doc.data().title}`);
    });
  }
}

listTopLevelChapters().catch(console.error);
