import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function check() {
  const q = await db.collectionGroup('learning_progress').get();
  q.docs.forEach(doc => {
      if (doc.id.toLowerCase().includes('1774390267517')) {
          const data = doc.data();
          console.log(`User: ${doc.ref.parent.parent.id} | unitTitle:`, data.unitTitle, "| has quizSession:", !!data.quizSession);
      }
  });
}
check().catch(console.error);
