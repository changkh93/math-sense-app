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
      if (doc.id.includes('Reg_1774390167801')) {
          console.log(`LP Doc: ${doc.id}`);
          console.log(JSON.stringify(data, null, 2));
      }
  });

  console.log('\n--- history ---');
  // Check the date of April 3rd
  const start = new Date('2026-04-03T00:00:00+09:00');
  const end = new Date('2026-04-03T23:59:59+09:00');
  
  const historySnap = await db.collection('users').doc(userId).collection('history')
    .where('timestamp', '>=', start)
    .where('timestamp', '<=', end)
    .get();

  historySnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.unitId && data.unitId.includes('1774390167801')) {
          console.log(`History Doc: ${doc.id}`);
          console.log(JSON.stringify(data, null, 2));
      }
  });
}

getRecords().catch(console.error);
