import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function fix() {
  const q = await db.collectionGroup('learning_progress').get();
  q.docs.forEach(doc => {
      const data = doc.data();
      if (!data.unitTitle) {
          if (doc.id.toLowerCase().includes('1774390267517')) {
              console.log("Found!", doc.ref.path);
              doc.ref.update({ unitTitle: '3월 평가', unitId: doc.id });
          }
      }
  });
}
fix().then(() => console.log('Done')).catch(console.error);
