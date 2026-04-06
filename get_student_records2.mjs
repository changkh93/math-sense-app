import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function getRecords() {
  const userId = 'nspjzUAjefSoDeaN1TuaNywSFyS2';
  
  console.log('--- learning_progress ---');
  const lpSnap = await db.collection('users').doc(userId).collection('learning_progress').get();
  lpSnap.docs.forEach(doc => {
      const data = doc.data();
      const id = doc.id.toLowerCase();
      if (id.includes('1774390167801')) {
          console.log(`LP Doc: ${doc.id}`);
          console.log(JSON.stringify(data, null, 2));
      }
  });
}

getRecords().catch(console.error);
