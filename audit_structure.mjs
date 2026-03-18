import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function listRegions() {
  const regionsSnapshot = await db.collection('regions').get();
  console.log('Available Regions:');
  for (const doc of regionsSnapshot.docs) {
    console.log(`ID: ${doc.id}, Title: ${doc.data().title}`);
    
    // Check subcollections
    const chaptersSnapshot = await doc.ref.collection('chapters').get();
    if (!chaptersSnapshot.empty) {
      console.log(`  Chapters in ${doc.id}:`);
      chaptersSnapshot.forEach(c => {
        console.log(`    - ID: ${c.id}, Title: ${c.data().title}`);
      });
    }
  }
}

listRegions().catch(console.error);
