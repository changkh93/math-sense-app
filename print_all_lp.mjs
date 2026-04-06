import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function getRecords() {
  const userId = 'nspjzUAjefSoDeaN1TuaNywSFyS2';
  
  const lpSnap = await db.collection('users').doc(userId).collection('learning_progress').get();
  lpSnap.docs.forEach(doc => {
      console.log(doc.id);
  });
}

getRecords().catch(console.error);
